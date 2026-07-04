import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";
import validator from "validator";
import userModel from "../models/User.js";
import crypto from "crypto";
import Session from "../models/Session.js";
import {cloudinary} from "../libs/cloudinary.js";
import doctorModel from "../models/Doctor.js";
import appointmentModel from "../models/Appointment.js";


export const loginAdmin = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (
      email === process.env.ADMIN_EMAIL &&
      password === process.env.ADMIN_PASSWORD
    ) {
      const token = jwt.sign(email + password, process.env.JWT_SECRET);
      res.json({ success: true, token });
    } else {
      res.json({ success: false, message: "Invalid credentials" });
    }
  } catch (error) {
    console.log(error);
    res.json({ success: false, message: error.message });
  }
};

export const addDoctor = async (req, res) => {
  try {
    const {
      name,
      email,
      password,
      speciality,
      degree,
      experience,
      about,
      fees,
      address,
    } = req.body;
    const imageFile = req.file;

    // checking for all data to add doctor
    if (
      !name ||
      !email ||
      !password ||
      !speciality ||
      !degree ||
      !experience ||
      !about ||
      !fees ||
      !address
    ) {
      return res.json({ success: false, message: "Missing Details" });
    }

    // validating email format
    if (!validator.isEmail(email)) {
      return res.json({
        success: false,
        message: "Please enter a valid email",
      });
    }

    // validating strong password
    if (password.length < 8) {
      return res.json({
        success: false,
        message: "Please enter a strong password",
      });
    }

    // hashing user password
    const salt = await bcrypt.genSalt(10); // the more no. round the more time it will take
    const hashedPassword = await bcrypt.hash(password, salt);

    // upload image to cloudinary
    const imageUpload = await cloudinary.uploader.upload(imageFile.path, {
      resource_type: "image",
    });
    const imageUrl = imageUpload.secure_url;

    const doctorData = {
      name,
      email,
      image: imageUrl,
      password: hashedPassword,
      speciality,
      degree,
      experience,
      about,
      fees,
      address: JSON.parse(address),
      date: Date.now(),
    };

    const newDoctor = new doctorModel(doctorData);
    await newDoctor.save();
    res.json({ success: true, message: "Doctor Added" });
  } catch (error) {
    console.log(error);
    res.json({ success: false, message: error.message });
  }
};

export const allDoctors = async (req, res) => {
  try {
    const doctors = await doctorModel.find({}).select("-password");
    res.json({ success: true, doctors });
  } catch (error) {
    console.log(error);
    res.json({ success: false, message: error.message });
  }};

export const getDoctorById = async (req, res) => {
  try {
    const { doctorId } = req.body;

    if (!doctorId) {
      return res.json({ success: false, message: "Missing doctorId" });
    }

    const doctor = await doctorModel.findById(doctorId).select("-password");

    if (!doctor) {
      return res.json({ success: false, message: "Doctor not found" });
    }

    res.json({ success: true, doctor });
  } catch (error) {
    console.log(error);
    res.json({ success: false, message: error.message });
  }
};

export const editDoctor = async (req, res) => {
  try {
    const {
      doctorId,
      name,
      speciality,
      degree,
      experience,
      about,
      fees,
      address,
    } = req.body;
    const imageFile = req.file;

    if (!doctorId) {
      return res.json({ success: false, message: "Missing doctorId" });
    }

    const doctor = await doctorModel.findById(doctorId);
    if (!doctor) {
      return res.json({ success: false, message: "Doctor not found" });
    }

    const updateData = {};

    if (name) updateData.name = name;
    if (speciality) updateData.speciality = speciality;
    if (degree) updateData.degree = degree;
    if (experience) updateData.experience = experience;
    if (about) updateData.about = about;
    if (fees) updateData.fees = fees;
    if (address) updateData.address = JSON.parse(address);

    // Nếu có upload ảnh mới thì upload lên cloudinary và cập nhật
    if (imageFile) {
      const imageUpload = await cloudinary.uploader.upload(imageFile.path, {
        resource_type: "image",
      });
      updateData.image = imageUpload.secure_url;
    }

    await doctorModel.findByIdAndUpdate(doctorId, updateData);

    res.json({ success: true, message: "Doctor Updated" });
  } catch (error) {
    console.log(error);
    res.json({ success: false, message: error.message });
  }
};

export const deleteDoctor = async (req, res) => {
  try {
    const { doctorId } = req.body;

    const doctor = await doctorModel.findById(doctorId);

    if (!doctor) {
      return res.json({
        success: false,
        message: "Doctor not found",
      });
    }

    // Xóa tất cả lịch hẹn của bác sĩ (nếu muốn)
    await appointmentModel.deleteMany({ docId: doctorId });

    // Xóa bác sĩ
    await doctorModel.findByIdAndDelete(doctorId);

    res.json({
      success: true,
      message: "Doctor deleted successfully",
    });
  } catch (error) {
    console.log(error);
    res.json({
      success: false,
      message: error.message,
    });
  }
};

