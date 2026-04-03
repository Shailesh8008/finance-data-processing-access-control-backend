import express from "express";
import dotenv from "dotenv";
import cookieParser from "cookie-parser";
import cors from "cors";
import apiRouter from "./router/api";

dotenv.config();
const app = express();
app.use(cors({ origin: process.env.FRONTEND_URL, credentials: true }));
app.use(express.json());
app.use(cookieParser());
app.use("/", apiRouter);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`listening on ${PORT} `));
