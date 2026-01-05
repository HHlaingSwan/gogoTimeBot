import mongoose from "mongoose";

const holidaySchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    description: { type: String },
    date: { type: String, required: true },
    month: { type: Number, required: true, index: true },
    day: { type: Number, required: true },
    year: { type: Number, required: true, index: true },
    type: { type: String },
    country: { type: String, default: "MM" },
    canonicalUri: { type: String },
  },
  { timestamps: true }
);

holidaySchema.index({ country: 1, year: 1, month: 1, day: 1 });

export default mongoose.model("Holiday", holidaySchema);
