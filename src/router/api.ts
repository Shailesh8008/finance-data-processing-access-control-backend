import express from "express";
const apiRouter = express().router;
import userController from "../controller/user";
import { auth, adminAuth } from "../middleware/auth";
import adminController from "../controller/admin";

apiRouter.get("/health", (req, res) => res.json({ ok: "true" }));
apiRouter.get("/current-user", auth, userController.getUser);
apiRouter.get("/users", auth, adminAuth, adminController.getAllUsers);
apiRouter.get("/admins", auth, adminAuth, adminController.getAllAdmins);
apiRouter.get("/records", auth, userController.getAllRecords);
apiRouter.get("/record/:id", auth, userController.getOneRecord);

apiRouter.post("/register", userController.register);
apiRouter.post("/login", userController.login);
apiRouter.post("/logout", auth, userController.logout);
apiRouter.post("/create-record", auth, adminAuth, adminController.createRecord);
apiRouter.post("/update-record/:id", auth, adminAuth, adminController.updateRecord);

apiRouter.delete("/delete-record/:id", auth, adminAuth, adminController.deleteRecord);

export default apiRouter;
