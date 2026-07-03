import express from "express";
import authDoctor from "../middleware/authDoctor.js";

const router = express.Router();

router.post("/login", loginDoctor);