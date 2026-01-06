import mongoose from "mongoose";

const personalDateSchema = new mongoose.Schema(
  {
    chatId: { type: Number, required: true, index: true },
    name: { type: String, required: true },
    month: { type: Number, required: true, min: 1, max: 12 },
    day: { type: Number, required: true, min: 1, max: 31 },
    birthYear: { type: Number, min: 1900, max: 2100 },
    type: {
      type: String,
      enum: ["birthday", "anniversary", "custom", "milestone"],
      default: "custom",
    },
    emoji: { type: String, default: "📅" },
  },
  { timestamps: true }
);

personalDateSchema.index({ chatId: 1, month: 1, day: 1 });

export default mongoose.model("PersonalDate", personalDateSchema);
