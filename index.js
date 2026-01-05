import express from "express";
import cors from "cors";
import { registerCommands } from "./bot/command.js";
import telegramRouter from "./routes/telegram.route.js";
import connectDB from "./config/db.js";
import { PORT, TELEGRAM_BOT_TOKEN, WEBHOOK_URL } from "./config/env.js";
import { startScheduler } from "./services/scheduler.js";
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
    console.log("MongoDB connected");
  } catch (error) {
    console.error("MongoDB error:", error.message);
    process.exit(1);
  }

  if (WEBHOOK_URL) {
    await bot.setWebhook(WEBHOOK_URL);
    console.log(`Webhook set to ${WEBHOOK_URL}`);
  } else {
    console.log("No WEBHOOK_URL set - webhook not configured");
  }

  startScheduler();
  console.log(`Server running on port ${PORT}`);
});
