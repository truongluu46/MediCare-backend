import express from "express";
import { loginAdmin, addDoctor} from "../controllers/adminController.js";
import upload from "../middleware/multer.js";
import authAdmin from "../middleware/authAdmin.js";

const router = express.Router();

router.post("/login", loginAdmin);
router.post("/add-doctor",authAdmin ,upload.single("image"), addDoctor);

export default router;