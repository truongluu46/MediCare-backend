import express from "express";
import { loginAdmin, addDoctor, allDoctors, getDoctorById, editDoctor, deleteDoctor} from "../controllers/adminController.js";
import upload from "../middleware/multer.js";
import authAdmin from "../middleware/authAdmin.js";

const router = express.Router();

router.post("/login", loginAdmin);
router.post("/add-doctor",authAdmin ,upload.single("image"), addDoctor);
router.get("/all-doctors", authAdmin, allDoctors);
router.get("/get-doctor", authAdmin, getDoctorById);
router.post("/update-doctor", authAdmin, upload.single("image"), editDoctor);
router.delete("/delete-doctor", authAdmin, deleteDoctor);

export default router;