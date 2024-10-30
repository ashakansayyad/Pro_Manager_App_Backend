const express = require("express");
const router = express.Router();
const authMiddleware = require("../middleware/authMiddleware");
const bcrypt = require("bcrypt");
const dotenv = require("dotenv");
const jwt = require("jsonwebtoken");
const User = require("../model/userModel");
dotenv.config();

// user registeration
router.post("/register", async (req, res) => {
  const { name, email, password } = req.body;
  try {
    const userExist = await User.findOne({ email });
    if (userExist) {
      return res.status(400).json({ message: "User already exist!" });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create new user and save
    const newUser = await User({ name, email, password: hashedPassword });
    await newUser.save();

    return res.status(201).json({ message: "User Register Successfully!" });
  } catch (err) {
    console.error("Registration Error:", err);
    return res.status(400).json({ message: "User registration failed!" });
  }
});

//get all users( without password )

router.get("/",authMiddleware, async (req, res) => {
  try {
    const allUsers = await User.find().select("-password -_v");
    if (!allUsers) {
      return res.status(404).json({ message: "User data not found" });
    }
    return res.status(200).json(allUsers);
  } catch (err) {
    return res.status(404).json({ message: "User data not found" });
  }
});

//get specefic user by id
router.get("/:id",authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const userById = await User.findById(id);
    if (!userById) {
      return res.status(404).json({ message: "User not found" });
    }
    return res.status(200).json(userById);
  } catch (err) {
    return res.status(404).json({ message: "User data not found" });
  }
});

// Update user data
router.patch("/:id", authMiddleware,async (req, res) => {
  const { id } = req.params;
  const { name, email, oldPassword, newPassword } = req.body;

  try {
    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    if (name && name === user.name) {
      return res.status(400).json({ message: "Name already exists.Please provide different name" });
    }

    if (email && email === user.email) {
      return res.status(400).json({ message: "Email already exists.Please provide different email" });
    }
    // Verify old password if a new password is provided
    if (newPassword && oldPassword) {
      const isOldPasswordMatch = await bcrypt.compare(
        oldPassword,
        user.password
      );
      if (!isOldPasswordMatch) {
        return res.status(400).json({ message: "Old password is incorrect" });
      }
      const isSameAsOldPassword = await bcrypt.compare(newPassword, user.password);
      if (isSameAsOldPassword) {
        return res.status(400).json({ message: "New password cannot be the same as the old password. Please provide a unique password." });
      }

      // Hash and set new password
      user.password = await bcrypt.hash(newPassword, 10);
    }

    if (name) {
      user.name = name;
    }
    if (email) {
      user.email = email;
    }
    await user.save();
    res.status(200).json({ message: "User information updated successfully!" });
  } catch (err) {
    console.error("Error updating user:", err);
    res.status(500).json({ message: "Update failed" });
  }
});

//user login
router.post("/login", async (req, res) => {
  const { email, password } = req.body;
  try {
    // check email is valid or not
    const isValid = await User.findOne({ email });
    if (!isValid) {
      return res.status(400).json({ message: "Wrong email or password" });
    }
    // compare the input password with hashedpassword stored  in the  database
    const isPasswordMatch = await bcrypt.compare(password, isValid.password);
    if (!isPasswordMatch) {
      return res.status(400).json({ message: "Wrong email or password" });
    }
    // generate JWT
    // creat the payload contain the users id
    const payload = { id: isValid._id };
    //sign the token using secret key
    const token = jwt.sign(payload, process.env.JWT_SECRET);
    return res.status(200).json({ token });
  } catch (err) {
    return res.status(400).json({ message: "Something went wrong!" });
  }
});

module.exports = router;
