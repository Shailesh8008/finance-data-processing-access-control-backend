import mongoose from "mongoose";
const { Schema, model } = mongoose;

const user = new Schema({
  username: { type: String, require: true },
  role: { type: String, enum: ["user", "admin"], default: "user" },
  email: { type: String, require: true },
  password: { type: String, require: true },
});

export default model("users", user);
