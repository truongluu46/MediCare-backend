import express from "express";
import {authDoctor} from "../middleware/authDoctor.js";
import { loginDoctor, getDoctorProfile, updateDoctorProfile } from "../controllers/doctorController.js";

const router = express.Router();

router.post("/login", loginDoctor);
router.get("/profile", authDoctor, getDoctorProfile);
router.patch("/update-profile", authDoctor, updateDoctorProfile);

export default router;