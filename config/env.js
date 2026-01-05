import dotenv from "dotenv";

dotenv.config();

export const { TELEGRAM_BOT_TOKEN, PORT, MONGODB_URI, WEBHOOK_URL } = process.env;
