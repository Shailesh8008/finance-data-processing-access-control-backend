import { Request, Response } from "express";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { MyJwtPayload } from "../types/auth";
import userModel from "../model/user";

const getUser = (req: Request, res: Response) => {
  res.json({ user: req.user as MyJwtPayload });
};

const register = async (req: Request, res: Response) => {
  try {
    const { username, email, password } = req.body;
    if (!username || !email || !password) {
      return res.status(400).json({
        message: "Bad Request (username, email or password is/are missing)",
      });
    }
    const isEmailExists = await userModel.findOne({ email });
    if (isEmailExists) {
      return res
        .status(409)
        .json({ message: "Conflict (email already exists)" });
    }
    const hashedPassword = await bcrypt.hash(password, 10);
    const record = new userModel({
      username,
      password: hashedPassword,
      email,
      role: "user",
    });
    await record.save();
    return res.status(201).json({ message: "User registered successfully" });
  } catch (error) {
    console.log(error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

const login = async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res
        .status(400)
        .json({ message: "Bad Request (Email or password missing!)" });
    }
    const emailExists = await userModel.findOne({ email });

    if (!emailExists) {
      return res.status(404).json({ message: "Email not found!" });
    }
    const isPass = await bcrypt.compare(password, emailExists.password!);
    if (!isPass) {
      return res.status(401).json({ message: "Invalid password!" });
    }
    if (!process.env.JWT_SECRET_KEY) {
      return res
        .status(500)
        .json({ message: "Internal Server error (JWT secret is missing)" });
    }
    const user = {
      id: emailExists._id.toString(),
      email: emailExists.email,
      role: emailExists.role,
    };
    const token = jwt.sign(user, process.env.JWT_SECRET_KEY, {
      expiresIn: "7d",
    });
    res.cookie("token", token, {
      httpOnly: true,
      secure: process.env.ENV === "production",
      sameSite: process.env.ENV === "production" ? "none" : "lax",
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    emailExists.status = "active";
    emailExists.lastSeen = new Date();
    await emailExists.save();
    return res.json({
      message:
        emailExists.role === "admin" ? "Welcome Admin!" : "Login Successfully!",
      user,
    });
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "Internal server error" });
  }
};

const logout = async (req: Request, res: Response) => {
  try {
    const { id } = req.user as MyJwtPayload;
    res.clearCookie("token", {
      httpOnly: true,
      secure: process.env.ENV === "production",
      sameSite: process.env.ENV === "production" ? "none" : "lax",
    });
    await userModel.findByIdAndUpdate(id, { $set: { status: "inactive" } });
    return res.json({ message: "Logged out successfully!" });
  } catch (error) {
    return res.status(500).json({ message: "Internal server error" });
  }
};

const userController = { getUser, register, login, logout };
export default userController;
