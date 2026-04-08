import dotenv from "dotenv";
dotenv.config();
import connectDB from "./config/db";
// import { User } from "./models/user";
// import { Admin } from "./models/admin";
import express from "express";
import userRoutes from "./routes/userRoutes";
// const user1 = new User(
//   1,
//   "Mustafa",
//   "mustafa@gmail.com",
//   "123456",
//   "01000000000",
//   25
// );

// user1.displayInfo();

// console.log("------------");

// const admin1 = new Admin(
//   2,
//   "Ahmed",
//   "admin@gmail.com",
//   "admin123",
//   "01111111111",
//   30
// );

// admin1.displayInfo();
// admin1.manageUsers();
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