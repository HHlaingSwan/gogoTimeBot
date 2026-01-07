import bot from "./bot.js";
import {
  handleStart,
  handleHelp,
  handleTodayExpenses,
  handleThisMonth,
  handleRecent,
  handleDeleteExpense,
  handleExpense,
  handleHolidays,
  handleSettings,
  handleSyncHolidays,
} from "./handlers.js";

export const registerCommands = () => {
  bot.onText(/\/start/, (msg) => {
    handleStart(msg.chat.id);
  });

  bot.onText(/\/help/, (msg) => {
    handleHelp(msg.chat.id);
  });

  bot.onText(/\/today/, (msg) => {
    handleTodayExpenses(msg.chat.id);
  });

  bot.onText(/\/thismonth/, (msg) => {
    handleThisMonth(msg.chat.id);
  });

  bot.onText(/\/holidays/, (msg) => {
    handleHolidays(msg.chat.id);
  });

  bot.onText(/\/settings/, (msg) => {
    handleSettings(msg.chat.id);
  });

  bot.onText(/Today/, (msg) => {
    handleTodayExpenses(msg.chat.id);
  });

  bot.onText(/This Month/, (msg) => {
    handleThisMonth(msg.chat.id);
  });

  bot.onText(/Holidays/, (msg) => {
    handleHolidays(msg.chat.id);
  });

  bot.onText(/Settings/, (msg) => {
    handleSettings(msg.chat.id);
  });

  bot.onText(/Help/, (msg) => {
    handleHelp(msg.chat.id);
  });

  bot.onText(/^(?![\/])(.+)\s+(\d+(?:,\d{3})*(?:\.\d+)?)$/, (msg, match) => {
    const description = match[1].trim();
    const amount = match[2].trim();
    handleExpense(msg.chat.id, `${amount} ${description}`);
  });

  bot.onText(/^(?![\/])(\d+(?:,\d{3})*(?:\.\d+)?)\s+(.+)$/, (msg, match) => {
    const amount = match[1].trim();
    const description = match[2].trim();
    handleExpense(msg.chat.id, `${amount} ${description}`);
  });

  bot.on("callback_query", async (callbackQuery) => {
    const chatId = callbackQuery.message.chat.id;
    const data = callbackQuery.data;

    if (data.startsWith("delete_")) {
      const expenseId = data.replace("delete_", "");
      await handleDeleteExpense(
        chatId,
        expenseId,
        callbackQuery.message.message_id
      );
    } else if (data === "sync_holidays") {
      await handleSyncHolidays(chatId, callbackQuery.message.message_id);
    } else if (data === "recent_expenses") {
      await handleRecent(chatId);
    } else if (data === "settings") {
      await handleSettings(chatId, callbackQuery.message.message_id);
    }

    bot.answerCallbackQuery(callbackQuery.id);
  });
};
