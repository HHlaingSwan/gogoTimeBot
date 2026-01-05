import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    chatId: { type: Number, required: true, unique: true },
    timezone: { type: String, default: "UTC" },
  },
  { timestamps: true }
);

userSchema.pre("save", function (next) {
  this.updatedAt = new Date();
  next();
});

export default mongoose.model("User", userSchema);
