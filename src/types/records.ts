import { Document } from "mongoose";

export interface Records {
  id: string;
  amount: number;
  type: string;
  date: string;
  category: string;
  description: string;
}

interface record {
  userId: string;
  amount: number;
  type: string;
  category: string;
  date: Date;
  description: string;
  createdBy?: string;
}

export type RecordType = record & Document;
