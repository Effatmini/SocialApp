
import jwt from "jsonwebtoken";

const SECRET = process.env.JWT_SECRET as string;
console.log("JWT SECRET:", process.env.JWT_SECRET);
export const generateToken = (payload: object) => {
  return jwt.sign(payload, SECRET, { expiresIn: "1h" });
};

export const verifyToken = (token: string) => {
  return jwt.verify(token, SECRET);
};