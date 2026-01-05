import TelegramBot from "node-telegram-bot-api";
import { TELEGRAM_BOT_TOKEN } from "../config/env.js";

const bot = new TelegramBot(TELEGRAM_BOT_TOKEN, {
  polling: false, // we will use webhook
  webHook: true,
});

export default bot;
