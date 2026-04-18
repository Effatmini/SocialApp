import fs from "fs";
import path from "path";
import multer from "multer";
import { Request } from "express";

const uploadsDir = path.join(__dirname, "..", "..", "uploads", "users");

fs.mkdirSync(uploadsDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (_req: Request, _file: Express.Multer.File, cb) => {
    cb(null, uploadsDir);
  },
  filename: (_req: Request, file: Express.Multer.File, cb) => {
    const timestamp = Date.now();
    const safeName = file.originalname.replace(/\s+/g, "-");
    cb(null, `${timestamp}-${safeName}`);
  }
});

const fileFilter: multer.Options["fileFilter"] = (
  _req: Request,
  file: Express.Multer.File,
  cb
) => {
  if (file.mimetype.startsWith("image/")) {
    cb(null, true);
    return;
  }

  cb(new Error("Only image files are allowed"));
};

export const uploadUserImages = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024
  }
}).fields([
  { name: "profileImage", maxCount: 1 },
  { name: "profile", maxCount: 1 },
  { name: "avatar", maxCount: 1 },
  { name: "coverImage", maxCount: 1 },
  { name: "cover", maxCount: 1 },
  { name: "coverPhoto", maxCount: 1 }
]);
