import { Types } from "mongoose";

export interface MyJwtPayload {
  id?: string;
  email?: string;
  role: "user" | "admin" | "guest";
}

export interface userData {
  _id: Types.ObjectId;
  username: string;
  email: string;
  password: string;
  role: string;
}
