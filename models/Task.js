import mongoose from "mongoose";

const taskSchema = new mongoose.Schema({
  chatId: { type: Number, required: true, index: true },
  text: { type: String, required: true },
  time: { type: String, required: true },
  hour: { type: Number, required: true, index: true },
  minute: { type: Number, required: true, index: true },
  type: {
    type: String,
    enum: ["once", "daily", "weekly"],
    default: "once"
  },
  active: { type: Boolean, default: true },
  createdAt: { type: Date, default: Date.now }
});

taskSchema.index({ chatId: 1, active: 1 });

export default mongoose.model("Task", taskSchema);
