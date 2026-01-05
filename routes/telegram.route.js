import express from "express";
import bot from "../bot/bot.js";

const telegramRouter = express.Router();

telegramRouter.post("/", async (req, res) => {
  try {
    await bot.processUpdate(req.body);
    res.sendStatus(200);
  } catch (error) {
    console.error("Telegram webhook error:", error);
    res.sendStatus(500);
  }
});

export default telegramRouter;
