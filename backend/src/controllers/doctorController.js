import express from "express";
import jwt from "jsonwebtoken";
import doctorModel from "../models/Doctor.js";
import bcrypt from "bcrypt";
import appointmentModel from "../models/Appointment.js";
import validator from "validator";
import crypto from "crypto";
import Session from "../models/Session.js";

const ACCESS_TOKEN_TTL = "30m";
const REFRESH_TOKEN_TTL = 7 * 24 * 60 * 60 * 1000;

export const loginDoctor = async (req, res) => {
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
    const doctor = await doctorModel.findOne({ email: normalizedEmail });

    if (!doctor) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password",
      });
    }

    // So sánh mật khẩu
    const isMatch = await bcrypt.compare(password, doctor.password);

    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password",
      });
    }

    // Tạo JWT
    const token = jwt.sign({ id: doctor._id }, process.env.JWT_SECRET, {
      expiresIn: ACCESS_TOKEN_TTL,
    });

    // tạo refresh token
    const refreshToken = crypto.randomBytes(64).toString("hex");

    //lưu refresh token vào database
    await Session.create({
      ownerId: doctor._id,
      ownerType: "Doctor",
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
      token
      
    });
  } catch (error) {
    console.error("Login Error:", error);

    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
    });
  }
};

export const getDoctorProfile = async (req, res) => {
    try {

        const { docId } = req.body
        console.log(docId)
        if (!docId) {
            return res.status(400).json({ success: false, message: "Missing doctor ID" })
        }
        const profileData = await doctorModel.findById(docId).select('-password')

        res.json({ success: true, profileData })

    } catch (error) {
        console.log(error)
        res.status(500).json({ success: false, message: error.message })
    }
}

export const updateDoctorProfile = async (req, res) => {
    try {

        const { docId, fees, address, available } = req.body

        await doctorModel.findByIdAndUpdate(docId, { fees, address, available })

        res.json({ success: true, message: 'Profile Updated' })

    } catch (error) {
        console.log(error)
        res.status(500).json({ success: false, message: error.message })
    }
}

export const changeAvailablity = async (req, res) => {
    try {

        const { docId } = req.body

        const docData = await doctorModel.findById(docId)
        await doctorModel.findByIdAndUpdate(docId, { available: !docData.available })
        res.json({ success: true, message: 'Availablity Changed' })

    } catch (error) {
        console.log(error)
        res.status(500).json({ success: false, message: error.message })
    }
}

export const doctorList = async (req, res) => {
    try {

        const doctors = await doctorModel.find({}).select(['-password', '-email'])
        res.json({ success: true, doctors })

    } catch (error) {
        console.log(error)
        res.status(500).json({ success: false, message: error.message })
    }

}

export const doctorDashboard = async (req, res) => {
    try {

        const { docId } = req.body

        const appointments = await appointmentModel.find({ docId })

        let earnings = 0

        appointments.map((item) => {
            if (item.isCompleted || item.payment) {
                earnings += item.amount
            }
        })

        let patients = []

        appointments.map((item) => {
            if (!patients.includes(item.userId)) {
                patients.push(item.userId)
            }
        })



        const dashData = {
            earnings,
            appointments: appointments.length,
            patients: patients.length,
            latestAppointments: appointments.reverse()
        }

        res.json({ success: true, dashData })

    } catch (error) {
        console.log(error)
        res.status(500).json({ success: false, message: error.message })
    }
}

export const appointmentsDoctor = async (req, res) => {
    try {

        const { docId } = req.body
        const appointments = await appointmentModel.find({ docId })

        res.json({ success: true, appointments })

    } catch (error) {
        console.log(error)
        res.status(500).json({ success: false, message: error.message })
    }
}

export const appointmentComplete = async (req, res) => {
    try {
        const { docId, appointmentId } = req.body;

        const appointment = await appointmentModel.findById(appointmentId);

        if (!appointment) {
            return res.status(404).json({
                success: false,
                message: "Appointment not found",
            });
        }

        if (appointment.docId !== docId) {
            return res.status(403).json({
                success: false,
                message: "Unauthorized action",
            });
        }

        if (appointment.cancelled) {
            return res.status(400).json({
                success: false,
                message: "Appointment has been cancelled",
            });
        }

        if (appointment.isCompleted) {
            return res.status(400).json({
                success: false,
                message: "Appointment already completed",
            });
        }

        appointment.isCompleted = true;
        await appointment.save();

        res.json({
            success: true,
            message: "Appointment completed successfully",
        });
    } catch (error) {
        console.log(error);
        res.status(500).json({
            success: false,
            message: error.message,
        });
    }
};

export const appointmentCancel = async (req, res) => {
    try {
        const { docId, appointmentId } = req.body;

        //  Kiểm tra lịch khám
        const appointment = await appointmentModel.findById(appointmentId);

        if (!appointment) {
            return res.status(404).json({
                success: false,
                message: "Appointment not found"
            });
        }

        //  Kiểm tra bác sĩ có quyền hủy không
        if (appointment.docId !== docId) {
            return res.status(403).json({
                success: false,
                message: "Unauthorized action"
            });
        }

        //  Đã hủy rồi
        if (appointment.cancelled) {
            return res.status(400).json({
                success: false,
                message: "Appointment already cancelled"
            });
        }

        // Đã hoàn thành thì không được hủy
        if (appointment.isCompleted) {
            return res.status(400).json({
                success: false,
                message: "Completed appointment cannot be cancelled"
            });
        }

        // Đánh dấu hủy
        appointment.cancelled = true;
        await appointment.save();

        // Giải phóng slot của bác sĩ
        const doctor = await doctorModel.findById(docId);

        if (doctor) {
            const slots_booked = doctor.slots_booked;

            if (slots_booked[appointment.slotDate]) {
                slots_booked[appointment.slotDate] =
                    slots_booked[appointment.slotDate].filter(
                        slot => slot !== appointment.slotTime
                    );

                // Nếu ngày đó không còn slot nào thì xóa luôn key
                if (slots_booked[appointment.slotDate].length === 0) {
                    delete slots_booked[appointment.slotDate];
                }

                doctor.markModified("slots_booked");
                await doctor.save();
            }
        }

        return res.json({
            success: true,
            message: "Appointment cancelled successfully"
        });

    } catch (error) {
        console.log(error);

        return res.status(500).json({
            success: false,
            message: error.message
        });
    }
};