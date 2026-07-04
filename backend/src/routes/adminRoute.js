import express from "express";
import { loginAdmin, addDoctor, allDoctors, getDoctorById, editDoctor, deleteDoctor, appointmentsAdmin, appointmentCancel, adminDashboard} from "../controllers/adminController.js";
import upload from "../middleware/multer.js";
import { changeAvailablity } from "../controllers/doctorController.js";
import authAdmin from "../middleware/authAdmin.js";

const router = express.Router();

router.post("/login", loginAdmin);
router.post("/add-doctor",authAdmin ,upload.single("image"), addDoctor);
router.get("/all-doctors", authAdmin, allDoctors);
router.get("/get-doctor", authAdmin, getDoctorById);
router.post("/update-doctor", authAdmin, upload.single("image"), editDoctor);
router.delete("/delete-doctor", authAdmin, deleteDoctor);
router.get("/appointments", authAdmin, appointmentsAdmin);
router.post("/cancel-appointment", authAdmin, appointmentCancel);
router.post("/change-availability", authAdmin, changeAvailablity);
router.get("/dashboard", authAdmin, adminDashboard);

export default router;