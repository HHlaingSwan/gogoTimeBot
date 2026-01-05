import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    chatId: { type: Number, required: true, unique: true },
    timezone: { type: String, default: "Asia/Yangon" },
  },
  { timestamps: true }
);

export default mongoose.model("User", userSchema);
