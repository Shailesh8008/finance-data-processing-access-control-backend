import { Request, Response } from "express";
import { MyJwtPayload } from "../types/auth";
const getUser = (req: Request, res: Response) => {
  res.json({ user: req.user as MyJwtPayload });
};

const userController = { getUser };
export default userController;
