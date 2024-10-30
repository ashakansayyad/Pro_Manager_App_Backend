const express = require("express");
const authMiddleware = require("../middleware/authMiddleware");
const router = express.Router();
const Task = require("../model/taskModel");
const moment = require("moment");
const User = require("../model/userModel");

//create task
router.post("/", authMiddleware, async (req, res) => {
  try {
    const { title, priority, assignTo, assignedEmail, checklist, dueDate } =
      req.body;
    const userId = req.user;
    let parsedChecklist = [];
    if (typeof checklist === "string") {
      try {
        parsedChecklist = JSON.parse(checklist);
      } catch (error) {
        return res.status(400).json({ message: "Invalid checklist format." });
      }
    } else {
      parsedChecklist = checklist;
    }
    const newTask = new Task({
      title,
      priority,
      assignTo, // user ID
      assignedEmail, // store email if necessary
      checklist: parsedChecklist,
      dueDate,
      creator: userId,
    });
    await newTask.save();
    return res.status(201).json({ message: "Task created successfully!" });
  } catch (err) {
    console.log("Error: ", err);
    return res.status(400).json({ message: "Task creation failed." });
  }
});

// get analytics data for each logged user
router.get("/analytics", authMiddleware, async (req, res) => {
  try {
    const userId = req.user;

    const userTasks = await Task.find({
      $or: [{ creator: userId }, { assignTo: userId }],
    });

    const statusCounts = {};
    const priorityCounts = {};
    let dueDateCount = 0;

    userTasks.forEach((task) => {
      // Count by status
      statusCounts[task.status] = (statusCounts[task.status] || 0) + 1;

      // Count by priority
      priorityCounts[task.priority] = (priorityCounts[task.priority] || 0) + 1;

      // Check for due dates
      if (task.dueDate) {
        dueDateCount += 1;
      }
    });
    res.json({
      statusCounts,
      priorityCounts,
      dueDateCount,
    });
  } catch (error) {
    console.error("Error fetching analytics:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// get all tasks for the authorized user
router.get("/", authMiddleware, async (req, res) => {
  try {
    const userId = req.user; // Get the ID of the logged-in user
    const allTasks = await Task.find({
      $or: [{ creator: userId }, { assignTo: userId }],
    });

    if (!allTasks || allTasks.length === 0) {
      return res.status(404).json({ message: "No tasks found!" });
    }

    return res.status(200).json(allTasks);
  } catch (error) {
    console.error("Error fetching tasks:", error);
    return res.status(500).json({ message: "Server error" });
  }
});

//get specefic task only  authorized  user
router.get("/:id", authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user;
    const task = await Task.findById(id);

    if (!task) {
      return res.status(404).json({ message: "Task not found!" });
    }
    if (
      task.creator.toString() !== userId &&
      task.assignTo.toString() !== userId
    ) {
      return res
        .status(401)
        .json({ message: "You are not authorized to view this task" });
    }
    return res.status(200).json(task);
  } catch (error) {
    return res.status(500).json({ message: "Server error", error });
  }
});

//delete task (require authentication);
router.delete("/:id", authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user;
    const task = await Task.findById(id);

    if (!task) {
      return res.status(404).json({ message: "Task not found!" });
    }
    // Check if the user is either the creator or the assigned user
    if (
      task.creator.toString() !== userId &&
      task.assignTo.toString() !== userId
    ) {
      return res
        .status(401)
        .json({ message: "You are not authorized to delete this task" });
    }
    await Task.findByIdAndDelete(id);
    return res.status(200).json({ message: "Task deleted successfully!" });
  } catch (err) {
    return res.status(500).json({ message: "Server error", err });
  }
});

//move task to another status
router.put("/move/:id", authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    const userId = req.user;

    if (!["TO-DO", "BACKLOG", "PROGRESS", "DONE"].includes(status)) {
      return res.status(400).json({ message: "Invalid status value" });
    }

    const task = await Task.findById(id);

    if (!task) {
      return res.status(404).json({ message: "Task not found" });
    }
    if (
      task.creator.toString() !== userId &&
      task.assignTo.toString() !== userId
    ) {
      return res
        .status(401)
        .json({ message: "You are not authorized to move this task" });
    }
    task.status = status;
    await task.save();
    return res.status(200).json({ message: "Task moved successfully", task });
  } catch (err) {
    return res.status(500).json({ message: "Server error", err });
  }
});

//get tasks by status ["TO-DO","BACKLOG","IN-PROGRESS","DONE"]
router.get("/status/:status", authMiddleware, async (req, res) => {
  try {
    const { status } = req.params;
    const userId = req.user;
    if (!["TO-DO", "BACKLOG", "PROGRESS", "DONE"].includes(status)) {
      return res.status(400).json({ message: "Invalid status" });
    }
    const tasksByStatus = await Task.find({
      status,
      $or: [{ creator: userId }, { assignTo: userId }],
    });

    if (!tasksByStatus || tasksByStatus.length === 0) {
      return res
        .status(404)
        .json({ message: `No task found for the status: ${status}` });
    }
    return res.status(200).json(tasksByStatus);
  } catch (err) {
    return res.status(500).json({ message: "Server error", err });
  }
});

// Filter tasks by due date
router.get("/filter/:dateFilter", authMiddleware, async (req, res) => {
  const { dateFilter } = req.params;

  let startDate, endDate;

  switch (dateFilter) {
    case "today":
      startDate = moment().startOf("day").toDate();
      endDate = moment().endOf("day").toDate();
      break;
    case "week":
      startDate = moment().startOf("isoWeek").toDate(); // Start the week from (Monday)
      endDate = moment().endOf("isoWeek").toDate(); // End the week (Sunday)
      break;
    case "month":
      startDate = moment().startOf("month").toDate();
      endDate = moment().endOf("month").toDate();
      break;
    default:
      return res.status(400).json({ message: "Invalid date filter" });
  }

  try {
    const filteredTasks = await Task.find({
      $or: [
        { dueDate: { $gte: startDate, $lte: endDate } },
        { dueDate: { $exists: false } }, //  tasks with no dueDate
        { dueDate: null },
      ],
    });
    return res.status(200).json(filteredTasks);
  } catch (err) {
    return res.status(500).json({ message: "Server error", err });
  }
});

//  assign all tasks to another user by email
router.put("/assignboard", authMiddleware, async (req, res) => {
  try {
    const { assignedEmail } = req.body;
    const currentUserId = req.user;

    // Find the user by email
    const assignedUser = await User.findOne({ email: assignedEmail });

    if (!assignedUser) {
      return res.status(404).json({ message: "Email is not found!" });
    }

    // Update all tasks of the current user to assign
    const updatedTasks = await Task.updateMany(
      { creator: currentUserId },
      { assignTo: assignedUser._id, assignedEmail: assignedEmail }
    );

    if (updatedTasks.modifiedCount === 0) {
      return res.status(400).json({ message: "No tasks found to assign!" });
    }
    return res.status(200).json({
      message: `All tasks have been assigned to ${assignedEmail} successfully!`,
    });
  } catch (error) {
    console.error("Error assigning tasks:", error);
    return res.status(500).json({ message: "Server error", error });
  }
});

//update task
router.put("/:id", authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user;
    const { title, priority, assignTo, assignedEmail, checklist, dueDate } =
      req.body;

    const task = await Task.findById(id);
    if (!task) {
      return res.status(404).json({ message: "Task not found!" });
    }
    // Check if the user is  creator or the assigned user
    if (
      task.creator.toString() !== userId &&
      task.assignTo.toString() !== userId
    ) {
      return res
        .status(401)
        .json({ message: "You are not authorized to update this task" });
    }
    const updatedTask = await Task.findByIdAndUpdate(
      id,
      { title, priority, assignTo, assignedEmail, checklist, dueDate },
      { new: true }
    );
    return res
      .status(200)
      .json({ message: "Task updated successfully!", updatedTask });
  } catch (err) {
    return res.status(500).json({ message: "Server error", err });
  }
});

module.exports = router;
