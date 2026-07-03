import express from "express";
import dotenv from "dotenv";
import {connectDB} from "./libs/db.js";
import userRoute from "./routes/userRoute.js";
import adminRoute from "./routes/adminRoute.js";
import cookieParser from "cookie-parser";
import { authUser } from "./middleware/authUser.js";

import connectCloudinary from "./libs/cloudinary.js";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

//middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

//public routes
app.use('/api/auth', userRoute);


//private routes
//app.use(authUser); // Middleware to authenticate user for private routes
app.use('/api/admin', adminRoute);

connectDB().then(() => {
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
}); // Connect to MongoDB

connectCloudinary();