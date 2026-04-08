import dotenv from "dotenv";
dotenv.config();
import connectDB from "./config/db";
// import { User } from "./models/user";
// import { Admin } from "./models/admin";
import express from "express";
import userRoutes from "./routes/userRoutes";

const app = express();

app.use(express.json());

connectDB();

app.use("/api/users", userRoutes);

app.get("/", (req, res) => {
  res.send("Server is running 🚀");
});

const PORT = 3000;

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});