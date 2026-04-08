console.log("USER ROUTES LOADED");
import express from "express";
import User from "../models/user";
import { generateToken } from "../utils/jwt";


const router = express.Router();

const users: any[] = []; // temporary in-memory storage

// Register
router.post("/register", async (req, res) => {
  try {
    const { name, email, password } = req.body;

    const userExists = await User.findOne({ email });
    if (userExists) {
      return res.status(400).json({ message: "User already exists" });
    }

    const user = await User.create({
      name,
      email,
      password
    });

    res.status(201).json({
      message: "User registered successfully",
      user
    });
  } catch (error) {
    res.status(500).json({ message: "Server error", error });
  }
});

router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    // find user (plain password)
    const user = await User.findOne({ email, password });

    if (!user) {
      return res.status(400).json({ message: "Invalid credentials" });
    }

    // generate token
    const token = generateToken({ id: user._id });

    res.json({
      message: "Login successful",
      token,
      
    });

  } catch (error) {console.log(error);
    res.status(500).json({ message: "Server error", error });
  }
});
export default router;