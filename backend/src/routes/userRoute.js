import express from "express";
import { registerUser, loginUser, logoutUser, authMe, refreshToken } from "../controllers/userController.js";
import { authUser } from "../middleware/authUser.js";

const router = express.Router();

router.post("/register", registerUser);
router.post("/login", loginUser);
router.post("/logout", logoutUser);
router.post("/refresh", refreshToken);

router.get("/authme",authUser, authMe);

export default router;
