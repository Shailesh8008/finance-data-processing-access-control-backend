import { Request, Response } from "express";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { MyJwtPayload } from "../types/auth";
import userModel from "../model/user";
import recordModel from "../model/record";
import summaryModel from "../model/summary";

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

const getOneRecord = async (req: Request, res: Response) => {
  const { recordId } = req.params;
  if (recordId.length !== 24)
    return res.status(400).json({
      message: `Invalid id (id should be of 24 characters, but found ${recordId.length})`,
    });
  try {
    const data = await recordModel.findById(recordId)?.lean();
    const record = {
      id: data?._id,
      userId: data?.userId,
      amount: data?.amount,
      type: data?.type,
      date: data?.date,
      category: data?.category,
      description: data?.description,
      createdBy: data?.createdBy,
    };
    if (!data)
      return res.status(404).json({
        message: `Not found (cannot find record with the id: ${recordId})`,
      });
    return res.json({ record });
  } catch (error) {
    console.log(error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

const myRecords = async (req: Request, res: Response) => {
  try {
    const { id } = req.user as MyJwtPayload;
    const records = await recordModel.aggregate([
      { $match: { userId: id } },
      { $sort: { _id: -1 } },
      {
        $project: {
          _id: 0,
          id: "$_id",
          amount: 1,
          type: 1,
          date: 1,
          category: 1,
          description: 1,
          createdBy: 1,
        },
      },
    ]);
    if (records.length === 0) {
      return res.status(404).json({
        message: `Not found (cannot find any record associated to userId: ${id})`,
      });
    }
    const pageNum = Math.max(1, Number(req.query.page) || 1);
    const pageSize = Math.max(1, Math.min(Number(req.query.limit) || 10, 100));
    records.push({ $skip: (pageNum - 1) * pageSize }, { $limit: pageSize });

    return res.json({ records });
  } catch (error) {
    console.log(error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

const mySummary = async (req: Request, res: Response) => {
  const { id } = req.user as MyJwtPayload;
  try {
    const tempSummary = await summaryModel.findOne({ userId: id }).lean();
    if (!tempSummary) {
      return res.status(404).json({
        message: `Not found (cannot find summary associated to userId: ${id})`,
      });
    }
    const summary = {
      totalIncome: tempSummary.totalIncome,
      totalExpense: tempSummary.totalExpense,
      netBalance: tempSummary.netBalance,
      categoryWise: tempSummary.categoryWise,
      RecentActivity: tempSummary.RecentActivity,
      monthlyTrends: tempSummary.monthlyTrends,
      weeklyTrends: tempSummary.weeklyTrends,
      yearlyTrends: tempSummary.yearlyTrends,
    };
    return res.json({ summary });
  } catch (error) {
    console.log(error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

const userController = {
  getUser,
  register,
  login,
  logout,
  getOneRecord,
  myRecords,
  mySummary,
};
export default userController;
