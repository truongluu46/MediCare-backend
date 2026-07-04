import express from "express";
import { registerUser, loginUser, logoutUser, authMe, refreshToken, getProfile, updateProfile, bookAppointment } from "../controllers/userController.js";
import { authUser } from "../middleware/authUser.js";
import  upload  from "../middleware/multer.js";

const router = express.Router();

router.post("/register", registerUser);
router.post("/login", loginUser);
router.post("/logout", logoutUser);
router.post("/refresh", refreshToken);

router.get("/authme",authUser, authMe);
router.get("/get-profile", authUser, getProfile);
router.post("/update-profile",upload.single("image"), authUser, updateProfile);

router.post("/book-appointment", authUser, bookAppointment);

export default router;
