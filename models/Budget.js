import mongoose from "mongoose";

const budgetSchema = new mongoose.Schema(
  {
    chatId: { type: String, required: true, unique: true },
    monthlyLimit: { type: Number, default: 0 },
  },
  { timestamps: true }
);

export default mongoose.model("Budget", budgetSchema);
