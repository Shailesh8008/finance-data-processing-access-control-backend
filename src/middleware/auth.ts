import jwt from "jsonwebtoken";
import { MyJwtPayload } from "../types/auth";
import { Request, Response, NextFunction } from "express";

export const auth = (req: Request, res: Response, next: NextFunction) => {
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

  next();
};

export const adminAuth = (req: Request, res: Response, next: NextFunction) => {
  const { role } = req.user!;
  if (role === "admin") return next();
  return res
    .status(401)
    .json({ message: "Unauthorized (Please login as admin)" });
};
