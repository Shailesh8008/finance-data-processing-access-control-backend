import mongoose from "mongoose";
const { Schema, model } = mongoose;

const user = new Schema({
  username: { type: String, required: true },
  role: { type: String, enum: ["user", "admin"], default: "user" },
  email: { type: String, required: true },
  password: { type: String, required: true },
  status: { type: String, enum: ["active", "inactive"], default: "inactive" },
  lastSeen: { type: Date, default: Date.now },
});

export default model("users", user);
