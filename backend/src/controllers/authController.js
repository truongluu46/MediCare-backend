import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import validator from "validator";
import userModel from "../models/User.js";
import crypto from "crypto";
import Session from "../models/Session.js";

