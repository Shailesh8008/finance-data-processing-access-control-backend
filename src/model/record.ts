import mongoose from "mongoose";
const { Schema, model } = mongoose;

const record = new Schema({
  amount: { type: Number, default: 0 },
  type: { type: String, default: "others" },
  category: { type: String, default: "others" },
  date: { type: Date, default: Date.now },
  description: { type: String, default: "No description provided" },
});

export default model("records", record);
