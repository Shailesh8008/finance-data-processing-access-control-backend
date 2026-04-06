import mongoose from "mongoose";
const { Schema, model } = mongoose;

const summary = new Schema({
  userId: { type: String, require: true },
  totalIncome: { type: Number, default: 0 },
  totalExpense: { type: Number, default: 0 },
  netBalance: { type: Number, default: 0 },
  categoryWise: { type: [{}], default: [{}] },
  RecentActivity: { type: [{}], default: [{}] },
  monthlyTrends: { type: [{}], default: [{}] },
  weeklyTrends: { type: [{}], default: [{}] },
  yearlyTrends: { type: [{}], require: [{}] },
});

export default model("summary", summary);
