import jwt from "jsonwebtoken";
import User from "../models/User.js";

export const authUser = async (req, res, next) => {
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
            const user = await User.findById(decoded.id).select("-password");

            if (!user) {
                return res.status(404).json({ message: "User not found" });
            }

            // trả user trong req 
            req.user = user;
            next();
        })

    } catch (error) {
        console.error("Error in authUser middleware:", error);
        return res.status(500).json({ message: "Internal Server Error" });
    }
}