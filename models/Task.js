import mongoose from "mongoose";

const taskSchema = new mongoose.Schema(
  {
    chatId: { type: Number, required: true, index: true },
    text: { type: String, required: true },
    time: { type: String, required: true },
    hour: { type: Number, required: true, index: true },
    minute: { type: Number, required: true, index: true },
    type: {
      type: String,
      enum: ["once", "daily", "weekly", "weekdays", "specific"],
      default: "once",
    },
    weekDay: { type: Number, min: 0, max: 6 },
    active: { type: Boolean, default: true },
  },
  { timestamps: true }
);

taskSchema.index({ chatId: 1, active: 1 });
taskSchema.index({ chatId: 1, weekDay: 1, hour: 1, minute: 1 });

export default mongoose.model("Task", taskSchema);
