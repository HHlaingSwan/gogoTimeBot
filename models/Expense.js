import mongoose from "mongoose";

const expenseSchema = new mongoose.Schema(
  {
    amount: { type: Number, required: true },
    description: { type: String, required: true },
    category: { type: String, default: "Other" },
    date: { type: Date, required: true, index: true },
    chatId: { type: String, required: true, index: true },
  },
  { timestamps: true }
);

expenseSchema.index({ chatId: 1, date: -1 });

export default mongoose.model("Expense", expenseSchema);
