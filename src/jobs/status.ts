import userModel from "../model/user";
import cron from "node-cron";

cron.schedule("*/5 * * * *", async () => {
  console.log("Checking inactive users...");

  const timeoutMinutes = 15;
  const cutoff = new Date(Date.now() - timeoutMinutes * 60 * 1000);

  try {
    const result = await userModel.updateMany(
      {
        lastSeen: { $lt: cutoff },
        status: "active",
      },
      {
        $set: { status: "inactive" },
      },
    );

    console.log(`${result.modifiedCount} users marked inactive`);
  } catch (err) {
    console.error(err);
  }
});
