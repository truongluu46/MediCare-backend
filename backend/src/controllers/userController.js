import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import validator from "validator";
import userModel from "../models/User.js";
import crypto from "crypto";
import Session from "../models/Session.js";
import { cloudinary } from "../libs/cloudinary.js";
import doctorModel from "../models/Doctor.js";
import appointmentModel from "../models/Appointment.js";
import mongoose from "mongoose";

const ACCESS_TOKEN_TTL = "30m";
const REFRESH_TOKEN_TTL = 7 * 24 * 60 * 60 * 1000;

export const registerUser = async (req, res) => {
  try {
    const { name, email, password } = req.body;
    // checking for all data to register user
    if (!name || !email || !password) {
      return res
        .status(400)
        .json({ success: false, message: "Missing Details" });
    }

    // validating email format
    if (!validator.isEmail(email)) {
      return res
        .status(400)
        .json({ success: false, message: "Please enter a valid email" });
    }

    // checking if user already exists
    const existingUser = await userModel.findOne({ email });
    if (existingUser) {
      return res
        .status(409)
        .json({ success: false, message: "User already exists" });
    }

    // validating strong password
    if (password.length < 8) {
      return res
        .status(400)
        .json({ success: false, message: "Please enter a strong password" });
    }

    // hashing user password
    const salt = await bcrypt.genSalt(10); // the more no. round the more time it will take
    const hashedPassword = await bcrypt.hash(password, salt);

    const userData = {
      name,
      email,
      password: hashedPassword,
    };

    const newUser = new userModel(userData);
    const user = await newUser.save();
    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, {
      expiresIn: ACCESS_TOKEN_TTL,
    });

    res.status(201).json({
      success: true,
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
      },
    });
  } catch (error) {
    console.error("Error while signing up user:", error);
    res.status(500).json({ success: false, message: "Internal Server Error" });
  }
};

export const loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Kiểm tra dữ liệu đầu vào
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: "Email and password are required",
      });
    }

    // Chuẩn hóa email
    const normalizedEmail = email.trim().toLowerCase();

    // Tìm user
    const user = await userModel.findOne({ email: normalizedEmail });

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password",
      });
    }

    // So sánh mật khẩu
    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password",
      });
    }

    // Tạo JWT
    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, {
      expiresIn: ACCESS_TOKEN_TTL,
    });

    // tạo refresh token
    const refreshToken = crypto.randomBytes(64).toString("hex");

    //lưu refresh token vào database
    await Session.create({
      ownerId: user._id,
      ownerType: "User",
      refreshToken,
      expiresAt: new Date(Date.now() + REFRESH_TOKEN_TTL), // 7 ngày
    });
    // Trả refreshtoken về trong cookie
    res.cookie("refreshToken", refreshToken, {
      httpOnly: true,
      secure: true,
      sameSite: "none",
      maxAge: REFRESH_TOKEN_TTL,
    });

    // Trả kết quả
    return res.status(200).json({
      success: true,
      message: "Login successfully",
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        imageUrl: user.imageUrl,
      },
    });
  } catch (error) {
    console.error("Login Error:", error);

    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
    });
  }
};

export const logoutUser = async (req, res) => {
  try {
    // lấy refresh token từ cookie
    const refreshToken = req.cookies.refreshToken;

    if (refreshToken) {
      // xóa refresh token trong db
      await Session.deleteOne({ refreshToken });

      // xóa refresh token trong cookie
      res.clearCookie("refreshToken");
    }

    return res.status(204);
  } catch (error) {
    console.error("Logout Error:", error);
    return res.status(500).json({ message: "Internal Server Error" });
  }
};

export const authMe = async (req, res) => {
  return res.status(200).json({
    success: true,
    user: req.user,
    message: "Authenticated successfully",
  });
};

// Tạo access token mới dựa trên refresh token
export const refreshToken = async (req, res) => {
  try {
    // lấy refresh token từ cookie
    const token = req.cookies?.refreshToken;
    if (!token) {
      return res
        .status(401)
        .json({ message: "Access Denied: No refresh token provided" });
    }

    // so sánh với refresh token trong db
    const session = await Session.findOne({ refreshToken: token });

    if (!session) {
      return res
        .status(403)
        .json({ message: "Access Denied: Invalid refresh token" });
    }
    // kiểm tra thời gian hết hạn của refresh token
    if (session.expiresAt < new Date()) {
      return res
        .status(403)
        .json({ message: "Access Denied: Refresh token expired" });
    }

    // tạo access token mới
    const newAccessToken = jwt.sign(
      { id: session.userId },
      process.env.JWT_SECRET,
      { expiresIn: ACCESS_TOKEN_TTL },
    );
    // trả access token mới về cho client
    return res.status(200).json({ accessToken: newAccessToken });
  } catch (error) {
    console.error("Refresh Token Error:", error);
    return res.status(500).json({ message: "Internal Server Error" });
  }
};

export const getProfile = async (req, res) => {
  try {
    const userId = req.user._id;
    const userData = await userModel.findById(userId).select("-password");

    res.json({ success: true, userData });
  } catch (error) {
    console.log(error);
    res.json({ success: false, message: error.message });
  }
};

export const updateProfile = async (req, res) => {
  console.log("Content-Type:", req.headers["content-type"]);
  console.log("Body:", req.body);
  console.log("File:", req.file);

  try {
    const userId = req.user._id;
    const { name, phone, address, dob, gender } = req.body;
    const imageFile = req.file;

    if (!name || !phone || !dob || !gender) {
      return res.status(400).json({ success: false, message: "Data Missing" });
    }

    await userModel.findByIdAndUpdate(userId, {
      name,
      phone,
      address: JSON.parse(address),
      dob,
      gender,
    });

    if (imageFile) {
      // upload image to cloudinary
      const imageUpload = await cloudinary.uploader.upload(imageFile.path, {
        resource_type: "image",
      });
      const imageURL = imageUpload.secure_url;
      const imageId = imageUpload.public_id;

      await userModel.findByIdAndUpdate(userId, {
        image: imageURL,
        imageId: imageId,
      });
    }

    res.json({ success: true, message: "Profile Updated" });
  } catch (error) {
    console.log(error);
    res
      .status(500)
      .json({ success: false, message: "Failed to update profile" });
  }
};

export const bookAppointment = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const userId = req.user._id;
    const { docId, slotDate, slotTime } = req.body;

    // khóa atomic cái slot lại 
    // Điều kiện: Bác sĩ phải có và đang available, và slotTime chưa nằm trong mảng của slotDate
    const updatedDoctor = await doctorModel.findOneAndUpdate(
      { 
        _id: docId, 
        available: true,
        [`slots_booked.${slotDate}`]: { $ne: slotTime } 
      },
      { 
        $push: { [`slots_booked.${slotDate}`]: slotTime } 
      },
      { new: true, select: "-password", session }
    ).lean();

    if (!updatedDoctor) {
      // Nếu update thất bại, kiểm tra nguyên nhân để trả về lỗi chính xác
      const docCheck = await doctorModel.findById(docId).session(session);
      await session.abortTransaction();
      session.endSession();

      if (!docCheck) return res.status(404).json({ success: false, message: "Doctor not found" });
      if (!docCheck.available) return res.status(400).json({ success: false, message: "Doctor Not Available" });
      return res.status(400).json({ success: false, message: "Slot Not Available (Double Booking Prevented)" });
    }

    const userData = await userModel.findById(userId).select("-password").session(session).lean();

    if (!userData) {
      // Nhờ có Transaction, ta không cần lệnh pull (rollback thủ công) nữa, chỉ cần abort
      await session.abortTransaction();
      session.endSession();
      return res.status(404).json({ success: false, message: "User not found" });
    }

    delete updatedDoctor.slots_booked;

    const appointmentData = {
      userId,
      docId,
      userData,
      docData: updatedDoctor,
      amount: updatedDoctor.fees,
      slotTime,
      slotDate,
      date: Date.now(),
    };

    const newAppointment = new appointmentModel(appointmentData);
    await newAppointment.save({ session });

    await session.commitTransaction();
    session.endSession();

    res.json({ success: true, message: "Appointment Booked" });
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    
    console.log(error);
    res.status(500).json({ success: false, message: error.message });
  }
};

export const listAppointment = async (req, res) => {
  try {
    const userId = req.user._id;
    console.log(userId);
    if (!userId) {
      return res
        .status(400)
        .json({ success: false, message: "Missing user ID" });
    }
    const appointments = await appointmentModel.find({ userId });

    res.json({ success: true, appointments });
  } catch (error) {
    console.log(error);
    res.json({ success: false, message: error.message });
  }
};

export const cancelAppointment = async (req, res) => {
  try {
    const userId = req.user._id;
    const { appointmentId } = req.body;
    const appointmentData = await appointmentModel.findById(appointmentId)

    // verify appointment user 
    if (appointmentData.userId.toString() !== userId.toString()) {
      return res.status(403).json({ success: false, message: 'Unauthorized action' })
    }

    await appointmentModel.findByIdAndUpdate(appointmentId, { cancelled: true })

    // releasing doctor slot using atomic $pull operator
    const { docId, slotDate, slotTime } = appointmentData

    await doctorModel.findByIdAndUpdate(docId, { 
      $pull: { [`slots_booked.${slotDate}`]: slotTime } 
    })

    res.json({ success: true, message: 'Appointment Cancelled' })

  } catch (error) {
    console.log(error)
    res.json({ success: false, message: error.message })
  }
}