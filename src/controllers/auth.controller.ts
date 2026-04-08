import { Request, Response } from "express";
import bcrypt from "bcryptjs";
import UserModel from "../models/user";
import { generateToken } from "../utils/jwt";

// ✅ REGISTER
export const register = async (req: Request, res: Response) => {
  try {
    console.log("BODY:", req.body);

    const { name, email, password, phone, age } = req.body;

    // check if user exists
    const existingUser = await UserModel.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: "Email already exists" });
    }

    // hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // create user
    const user = new UserModel({
      name,
      email,
      password: hashedPassword,
      phone,
      age
    });

    await user.save();

    const token = generateToken(user._id);

    res.json({
      message: "User registered successfully",
      token,
      user
    });

  } catch (error) {
    res.status(500).json({ message: "Server error", error });
  }
};

// ✅ LOGIN
export const login = async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    // find user
    const user = await UserModel.findOne({ email });
    if (!user) {
      return res.status(400).json({ message: "Invalid credentials" });
    }

    // compare password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: "Invalid credentials" });
    }

    // generate token
    const token = generateToken(user._id);

    res.json({
      message: "Login successful",
      token,
    
    });

  } catch (error) {
    res.status(500).json({ message: "Server error", error });
  }
};