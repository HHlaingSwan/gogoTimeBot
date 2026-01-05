import TelegramBot from "node-telegram-bot-api";
import { TELEGRAM_BOT_TOKEN, WEBHOOK_URL } from "../config/env.js";

const isWebhook = Boolean(WEBHOOK_URL);

const bot = new TelegramBot(TELEGRAM_BOT_TOKEN, {
  polling: !isWebhook, //  polling ONLY if no webhook
});

export default bot;
