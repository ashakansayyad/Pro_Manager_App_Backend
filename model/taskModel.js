const mongoose = require("mongoose");
const User = require("./userModel");
const taskSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
    },
    priority: {
      type: String,
      enum: ["HIGH PRIORITY", "MODERATE PRIORITY", "LOW PRIORITY"],
      required: true,
    },
    assignTo: {
      type: mongoose.Schema.ObjectId, //reference to the user in user model
      ref: "User",
      required: false,
      default:null
    },
    assignedEmail: {
      type: String,
      required: false,
    },
    checklist: [
      {
        description: {
          //checklist item text
          type: String,
          required: true,
        },
        isCompleted: {
          //status
          type: Boolean,
          default: false,
        },
      },
    ],
    dueDate: {
      type: Date,
      required: false, //user can create task without due date
    },
    status: {
      type: String,
      enum: ["TO-DO", "BACKLOG", "PROGRESS", "DONE"],
      default: "TO-DO", //default status when task is created
    },
    creator: {
      type: mongoose.Schema.ObjectId,
      ref: "User",
      required: true,
    },
    isPublic: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

const Task = mongoose.model("Task", taskSchema);
module.exports = Task ;
