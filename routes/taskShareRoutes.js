const express = require("express");
const authMiddleware = require("../middleware/authMiddleware");
const router = express.Router();
const Task  = require("../model/taskModel");
const dotenv = require("dotenv");
dotenv.config();

//generate the link for task sharing
router.put('/share/:id',authMiddleware,async(req,res)=>{
    try{
        const {id} = req.params;
        const userId = req.user;
        const task = await Task.findById(id);

        if(!task){
            return res.status(404).json({message:"task not found"});
        }
        if (task.creator.toString() !== userId && task.assignTo.toString() !== userId) {
            return res.status(401).json({ message: "You are not authorized to share this task" });
        }          
        await task.save();
        const sharedLink = `${process.env.FRONTEND_URL}/taskshare/shared/${task._id}`;
        return res.status(200).json(sharedLink);
    } catch (error) {
        console.error("Error : ", error);
        return res.status(500).json({ message: "Server error" });
      }
})

//  route to view a shared task
router.get('/shared/:id',async(req,res)=>{
    try{
        const {id}=req.params;
        const task = await Task.findById(id).select("-assignTo -assignedEmail -creator");
        
        if(!task){
            return res.status(404).json({ message: "Task not available for sharing" });
        }
        return res.status(200).json(task);
    } catch (error) {
        console.error("Error:", error);
        return res.status(500).json({ message: "Server error" });
      }
})

module.exports = router;