import jwt from "jsonwebtoken";
import { MyJwtPayload } from "../types/auth";
import { Request, Response, NextFunction } from "express";
import userModel from "../model/user";

export const auth = async (req: Request, res: Response, next: NextFunction) => {
  const token = req.cookies?.token;
  if (!token) {
    return res.status(404).json({
      role: "guest",
      message: "No token provided (Please login)",
    });
  }

  try {
    const verify = jwt.verify(token, process.env.JWT_SECRET_KEY!);
    req.user = verify as MyJwtPayload;
  } catch (error) {
    return res
      .status(403)
      .json({ message: "Token is invalid or expired (Please re-login)" });
  }

  try {
    if (req.user) {
      await userModel.findByIdAndUpdate(req.user.id, {
        status: "active",
        lastSeen: new Date(),
      });
    }
  } catch (err) {
    console.error(err);
  }
  next();
};

export const adminAuth = (req: Request, res: Response, next: NextFunction) => {
  if (req.user) {
    const { role } = req.user;
    if (role === "admin") return next();
  }
  return res
    .status(401)
    .json({ message: "Unauthorized (Please login as admin)" });
};
