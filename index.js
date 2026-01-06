import express from "express";
import cors from "cors";
import { registerCommands } from "./bot/command.js";
import telegramRouter from "./routes/telegram.route.js";
import connectDB from "./config/db.js";
import { PORT } from "./config/env.js";
import { syncCurrentAndNextYear } from "./services/holiday.js";

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
    const isJanuary = now.getMonth() === 0;
    const isFirstDay = now.getDate() === 1;

    if (isJanuary && isFirstDay) {
      console.log("January 1st - syncing current and next year holidays");
      await syncCurrentAndNextYear();
    } else {
      console.log(
        "Not January 1st - holidays will sync manually via /syncholidays"
      );
    }
  } catch (error) {
    console.error("Startup error:", error.message);
  }

  console.log(`Server running on port ${PORT}`);
});
