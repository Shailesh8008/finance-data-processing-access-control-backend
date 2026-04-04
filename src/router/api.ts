import express from "express";
const apiRouter = express().router;
import userController from "../controller/user";
import { auth } from "../middleware/auth";

apiRouter.get("/health", (req, res) => res.json({ ok: "true" }));
apiRouter.get("/get-user", auth, userController.getUser);

apiRouter.post("/register", userController.register);
apiRouter.post("/login", userController.login);
apiRouter.post("/logout", auth, userController.logout);

export default apiRouter;
