import express from "express";
import cors from "cors";
import { registerCommands } from "./bot/command.js";
import telegramRouter from "./routes/telegram.route.js";
import connectDB from "./config/db.js";
import { PORT } from "./config/env.js";
import { syncCurrentYear } from "./services/holiday.js";

const app = express();

app.use(cors());
app.use(express.json());

app.use("/api/telegram", telegramRouter);

registerCommands();

app.get("/", (req, res) => {
  res.send("Bot server running 🚀");
});

app.listen(PORT, async () => {
  try {
    await connectDB();

    const now = new Date();
    if (now.getMonth() === 0 && now.getDate() === 1) {
      console.log("January 1st - syncing holidays...");
      await syncCurrentYear();
    } else {
      console.log("Sync holidays manually via Settings → Sync Holidays");
    }
  } catch (error) {
    console.error("Startup error:", error.message);
  }

  console.log(`Server running on port ${PORT}`);
});
