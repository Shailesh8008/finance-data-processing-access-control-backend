import mongoose from "mongoose";

const connectDB = async () => {
  try {
    if (!process.env.DB) {
      throw new Error("DB environment variable not found");
    }
    await mongoose.connect(process.env.DB, { dbName: "financial-records" });
    console.log("DB connected successfully!");
  } catch (error) {
    console.log(error);
    console.log("Failed to connect to DB!");
    process.exit(1);
  }
};

export default connectDB;
