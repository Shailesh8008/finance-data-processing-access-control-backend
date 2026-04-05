import express from "express";
import dotenv from "dotenv";
import cookieParser from "cookie-parser";
import cors from "cors";
import apiRouter from "./router/api";
import connectDB from "./config/db";
import defaultAdmin from "./config/defaultAdmin";
import cronStatus from "./jobs/status";

dotenv.config();
connectDB();
const app = express();
app.use(cors({ origin: process.env.FRONTEND_URL, credentials: true }));
app.use(express.json());
app.use(cookieParser());
app.use("/", apiRouter);
defaultAdmin();
cronStatus();

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`listening on ${PORT} `));
