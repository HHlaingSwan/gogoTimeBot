import express from "express";
import cors from "cors";
import { registerCommands } from "./bot/command.js";
import telegramRouter from "./routes/telegram.route.js";
import connectDB from "./config/db.js";
import { PORT, WEBHOOK_URL } from "./config/env.js";
import { syncAllYears, startMonthlySync } from "./services/holiday.js";
import bot from "./bot/bot.js";

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
    await syncAllYears();

    startMonthlySync(3, 0);
  } catch (error) {
    console.error("MongoDB error:", error.message);
    process.exit(1);
  }

  if (WEBHOOK_URL) {
    try {
      await bot.setWebhook(WEBHOOK_URL);
      console.log(`Webhook set to ${WEBHOOK_URL}`);
    } catch (error) {
      console.error("Webhook setup failed:", error.message);
    }
  } else {
    console.log("Using polling mode");
  }

  console.log(`Server running on port ${PORT}`);
});
