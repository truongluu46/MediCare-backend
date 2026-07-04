import express from "express";
import {authDoctor} from "../middleware/authDoctor.js";
import { loginDoctor, getDoctorProfile, updateDoctorProfile, changeAvailablity, doctorList } from "../controllers/doctorController.js";

const router = express.Router();

router.post("/login", loginDoctor);
router.get("/profile", authDoctor, getDoctorProfile);
router.patch("/update-profile", authDoctor, updateDoctorProfile);
router.post("/change-availability", authDoctor, changeAvailablity);
router.get("/list", doctorList)

export default router;