import express from "express";
import dotenv from "dotenv";
import {connectDB} from "./libs/db.js";
import userRoute from "./routes/userRoute.js";
import adminRoute from "./routes/adminRoute.js";
import cookieParser from "cookie-parser";
import { authUser } from "./middleware/authUser.js";
import doctorRoute from "./routes/doctorRoute.js";
import cors from "cors";
import connectCloudinary from "./libs/cloudinary.js";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

//middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());




// ===============================
// CORS CONFIGURATION
// ===============================

const allowedOrigins = [

    // Local development
    "http://localhost:5173",
    "http://localhost:5174",
    "http://localhost:5175",

    // User frontend
    "https://medi-care-ochre.vercel.app",

    // Admin frontend
    "https://medi-care-admin-tau.vercel.app"
];


const corsOptions = {

    origin: (origin, callback) => {


        // Cho phép request không có origin
        // Ví dụ: Postman, server request
        if (!origin) {
            return callback(null, true);
        }


        if (allowedOrigins.includes(origin)) {

            return callback(null, true);

        }


        return callback(
            new Error("Not allowed by CORS")
        );
    },


    credentials: true,


    methods: [
        "GET",
        "POST",
        "PUT",
        "PATCH",
        "DELETE",
        "OPTIONS"
    ],


    allowedHeaders: [

        // JSON request
        "Content-Type",

        // JWT chuẩn (nếu dùng)
        "Authorization",

        // Admin token
        "atoken",
        
        // User token
        "token"
    ]
};

app.use(cors(corsOptions));


app.options(/.*/, cors(corsOptions));

//public routes
app.use('/api/user', userRoute);


//private routes
//app.use(authUser); 
app.use('/api/admin', adminRoute);
app.use('/api/doctor', doctorRoute);

connectDB().then(() => {
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
}); // Connect to MongoDB

connectCloudinary();