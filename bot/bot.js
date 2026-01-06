import TelegramBot from "node-telegram-bot-api";
import { TELEGRAM_BOT_TOKEN } from "../config/env.js";

const bot = new TelegramBot(TELEGRAM_BOT_TOKEN, {
  polling: true, //  polling ONLY if no webhook
});

export default bot;
