import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    imageUrl: {
      type: String,
      default:
        "data:image/png;base64,",
    },
    imageId: { type: String, default: "default" },
    phone: { type: String, default: "000000000" },
    address: { type: Object, default: { line1: "", line2: "" } },
    gender: { type: String, default: "Not Selected" },
    dob: { type: String, default: "Not Selected" },
    password: { type: String, required: true },
  },
  {
    timestamps: true,
  },
);

const User = mongoose.models.user || mongoose.model("User", userSchema);
export default User;