import express from "express";
const apiRouter = express().router;
import userController from "../controller/user";
import { auth, adminAuth } from "../middleware/auth";
import adminController from "../controller/admin";

apiRouter.get("/health", (req, res) => res.json({ ok: "true" }));
apiRouter.get("/current-user", auth, userController.getUser);
apiRouter.get("/users", auth, adminAuth, adminController.getAllUsers);
apiRouter.get("/admins", auth, adminAuth, adminController.getAllAdmins);
apiRouter.get("/records", auth, adminAuth, adminController.getAllRecords);
apiRouter.get("/record/:recordId", auth, userController.getOneRecord);
apiRouter.get("/my-records", auth, userController.myRecords);
apiRouter.get("/my-summary", auth, userController.mySummary);
apiRouter.get("/summary/:userId", auth, adminAuth, adminController.summary);

apiRouter.post("/register", userController.register);
apiRouter.post("/login", userController.login);
apiRouter.post("/logout", auth, userController.logout);
apiRouter.post("/create-record", auth, adminAuth, adminController.createRecord);
apiRouter.post(
  "/update-record/:id",
  auth,
  adminAuth,
  adminController.updateRecord,
);

apiRouter.delete(
  "/delete-record/:id",
  auth,
  adminAuth,
  adminController.deleteRecord,
);

export default apiRouter;
