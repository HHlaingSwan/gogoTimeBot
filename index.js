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
    console.log("Server started");

    function scheduleYearlySync() {
      const now = new Date();
      const nextYear = new Date(now.getFullYear() + 1, 0, 1, 0, 0, 0);
      const delay = nextYear.getTime() - now.getTime();

      console.log(`Next holiday sync: ${nextYear.toDateString()}`);

      setTimeout(async () => {
        try {
          console.log("Auto-syncing holidays for new year...");
          await syncCurrentYear();
        } catch (error) {
          console.error("Yearly sync error:", error.message);
        }
        scheduleYearlySync();
      }, delay);
    }

    const currentYear = new Date().getFullYear();
    const startOfYear = new Date(currentYear, 0, 1);
    const endOfYear = new Date(currentYear, 0, 1, 23, 59, 59);

    if (now >= startOfYear && now <= endOfYear) {
      console.log("First day of year - syncing holidays...");
      await syncCurrentYear();
    }

    scheduleYearlySync();
  } catch (error) {
    console.error("Startup error:", error.message);
  }

  console.log(`Server running on port ${PORT}`);
});
