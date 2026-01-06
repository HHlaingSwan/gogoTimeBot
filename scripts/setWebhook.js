import TelegramBot from "node-telegram-bot-api";
import { TELEGRAM_BOT_TOKEN } from "../config/env.js";

const newWebhookUrl = process.argv[2];

if (!newWebhookUrl) {
  console.error("Please provide the new webhook URL as a command-line argument.");
  process.exit(1);
}

if (!TELEGRAM_BOT_TOKEN) {
  console.error("TELEGRAM_BOT_TOKEN not found in environment variables.");
  process.exit(1);
}

const bot = new TelegramBot(TELEGRAM_BOT_TOKEN);

async function setWebhook() {
  try {
    console.log("Disconnecting old webhook...");
    await bot.deleteWebhook();
    console.log("Old webhook disconnected.");

    console.log(`Setting new webhook to ${newWebhookUrl}...`);
    await bot.setWebhook(newWebhookUrl);
    console.log("New webhook set successfully.");
  } catch (error) {
    console.error("Error setting webhook:", error.message);
  }
}

setWebhook();
