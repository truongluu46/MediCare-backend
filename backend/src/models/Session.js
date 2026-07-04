import mongoose from "mongoose";

const sessionSchema = new mongoose.Schema(
{
    ownerId: {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
        index: true,
    },

    ownerType: {
        type: String,
        enum: ["User", "Doctor", "Admin"],
        required: true,
    },

    refreshToken: {
        type: String,
        required: true,
        unique: true,
    },

    expiresAt: {
        type: Date,
        required: true,
    },
},
{ timestamps: true }
);

sessionSchema.index(
    { expiresAt: 1 },
    { expireAfterSeconds: 0 }
);

export default mongoose.model("Session", sessionSchema);