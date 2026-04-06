export interface MyJwtPayload {
  id?: string;
  email?: string;
  role: "user" | "admin" | "guest";
}

