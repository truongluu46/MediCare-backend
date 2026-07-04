import jwt from "jsonwebtoken";
import Doctor from "../models/Doctor.js";

export const authDoctor = async (req, res, next) => {
    try {

        const authHeader = req.headers["authorization"];
        const token = authHeader && authHeader.split(" ")[1];

        if (!token) {
            return res.status(401).json({ message: "Access Denied: No access token provided" });
        }
        // Verify the token
        jwt.verify(token, process.env.JWT_SECRET, async (err, decoded) => {
            if (err) {
                return res.status(403).json({ message: "Access Denied: Invalid access token" });
            } 

            // find user
            const doctor = await Doctor.findById(decoded.id).select("-password");

            if (!doctor) {
                return res.status(404).json({ message: "Doctor not found" });
            }

            // trả doctor trong req 
            req.doctor = doctor;
            next();
        })

    } catch (error) {
        console.error("Error in authDoctor middleware:", error);
        return res.status(500).json({ message: "Internal Server Error" });
    }
}