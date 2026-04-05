import userModel from "../model/user";
import bcrypt from "bcrypt";

export default async function defaultAdmin() {
  try {
    if (
      !process.env.ADMIN_EMAIL ||
      !process.env.ADMIN_PASS ||
      !process.env.ADMIN_NAME
    ) {
      console.warn(
        "Admin environment variables are missing. Skipping default admin creation.",
      );
      return;
    }
    const isAdminExists = await userModel.findOne({
      email: process.env.ADMIN_EMAIL,
      role: "admin",
    });
    if (isAdminExists) return;
    const adminName = process.env.ADMIN_NAME.split(" ");
    const hashedPass = await bcrypt.hash(process.env.ADMIN_PASS, 10);
    const rec = new userModel({
      username: adminName[0] ? adminName[0] : "admin",
      email: process.env.ADMIN_EMAIL,
      password: hashedPass,
      role: "admin",
    });
    await rec.save();
    console.log("Default admin created successfully.");
  } catch (error) {
    console.log(`error createing admin: ${error}`);
  }
}
