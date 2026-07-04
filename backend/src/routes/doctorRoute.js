import express from "express";
import {authDoctor} from "../middleware/authDoctor.js";
import { loginDoctor, getDoctorProfile, updateDoctorProfile, changeAvailablity, doctorList, doctorDashboard, appointmentsDoctor, appointmentComplete, appointmentCancel } from "../controllers/doctorController.js";

const router = express.Router();

router.post("/login", loginDoctor);
router.get("/profile", authDoctor, getDoctorProfile);
router.patch("/update-profile", authDoctor, updateDoctorProfile);
router.post("/change-availability", authDoctor, changeAvailablity);
router.get("/list", doctorList);
router.get("/dashboard", authDoctor, doctorDashboard);
router.get("/appointments", authDoctor, appointmentsDoctor);
router.post("/complete-appointment", authDoctor, appointmentComplete);
router.post("/cancel-appointment", authDoctor, appointmentCancel)
export default router;