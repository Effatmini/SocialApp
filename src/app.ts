import dotenv from "dotenv";
import express from "express";
import fs from "fs";
import multer from "multer";
import path from "path";
import connectDB from "./config/db";
import authRoutes from "./routes/auth.routes";
import notificationRoutes from "./routes/notification.routes";
import postRoutes from "./routes/post.routes";

dotenv.config();

const app = express();
const publicDir = path.join(__dirname, "..", "public");
const uploadsDir = path.join(__dirname, "..", "uploads");

fs.mkdirSync(uploadsDir, { recursive: true });

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(publicDir));
app.use("/uploads", express.static(uploadsDir));

connectDB();

app.use("/api/auth", authRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/posts", postRoutes);

app.get("/", (_req, res) => {
  res.sendFile(path.join(publicDir, "auth-test.html"));
});

app.use((error: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  if (error instanceof multer.MulterError) {
    return res.status(400).json({
      message:
        "Invalid upload fields. Use profileImage/profile/avatar for the profile photo and coverImage/cover/coverPhoto for the cover photo."
    });
  }

  if (error instanceof Error) {
    return res.status(400).json({ message: error.message });
  }

  return res.status(500).json({ message: "Server error" });
});

const PORT = Number(process.env.PORT) || 3000;

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
