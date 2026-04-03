import { MyJwtPayload } from "./auth";

declare global {
  namespace Express {
    interface Request {
      user?: MyJwtPayload;
    }
  }
}
export {};
