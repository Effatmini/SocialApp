import { Request } from "express";
import { IUser, UserRole } from "../models/user.model";

export interface JwtPayload {
  id: string;
  role: UserRole;
}

export interface AuthenticatedRequest extends Request {
  user?: IUser;
  auth?: JwtPayload;
  files?: { [fieldname: string]: Express.Multer.File[] } | Express.Multer.File[];
}
