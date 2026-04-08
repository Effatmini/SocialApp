import { Router } from "express";
import { register,  } from "../controllers/auth.controller";
import { authMiddleware } from "../middleware/auth.middleware";

const router = Router();

router.post("/register", register);
router.post("/login", );
router.get("/profile", authMiddleware, (req: any, res) => {
  res.json({
    message: "Protected route",
    user: req.user
  });
});
export default router;