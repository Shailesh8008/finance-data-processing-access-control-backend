import { Document } from "mongoose";

interface user {
  username: string;
  role: string;
  email: string;
  password: string;
  status: string;
  lastSeen: Date;
}

export type UserType = user & Document