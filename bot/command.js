import bot from "./bot.js";
import PersonalDate from "../models/PersonalDate.js";
import {
  sendReplyKeyboard,
  sendHelpGuide,
  sendAddDateGuide,
  handleHolidays,
  handleToday,
  handleAddDate,
  handleSyncHolidays,
} from "./handlers.js";

export const registerCommands = () => {
  bot.onText(/\/start/, (msg) => {
    sendReplyKeyboard(msg.chat.id);
    bot.sendMessage(
      msg.chat.id,
      `👋 *Welcome!*

Track holidays, birthdays & events with countdowns and age.

*Commands:*
• \`/today\` - Everything including age
• \`/holidays\` - All holidays this year
• \`/adddate 12-25 1990 Name\` - Add with age
• \`/deletedate 1\` - Delete date

Type \`/help\` for more.`,
      { parse_mode: "Markdown" }
    );
  });

  bot.onText(/\/help/, (msg) => {
    sendReplyKeyboard(msg.chat.id);
    sendHelpGuide(msg.chat.id);
  });

  bot.onText(/\/holidays$/, (msg) => {
    handleHolidays(msg.chat.id);
  });

  bot.onText(/\/adddate$/, (msg) => {
    sendAddDateGuide(msg.chat.id);
  });

  bot.onText(/\/adddate (.+)/, async (msg, match) => {
    await handleAddDate(msg.chat.id, match);
  });

  bot.onText(/\/deletedate/, async (msg) => {
    const chatId = msg.chat.id;
    const dates = await PersonalDate.find({ chatId }).sort({ month: 1, day: 1 });

    if (dates.length === 0) {
        bot.sendMessage(chatId, "You have no dates to delete.");
        return;
    }

    const keyboard = dates.map((date, index) => ([{
        text: `${index + 1}. ${date.emoji} ${date.name}`,
        callback_data: `delete_${date._id}`
    }]));

    bot.sendMessage(chatId, "Which date would you like to delete?", {
        reply_markup: {
            inline_keyboard: keyboard
        }
    });
  });

  bot.on("callback_query", async (callbackQuery) => {
    const chatId = callbackQuery.message.chat.id;
    const data = callbackQuery.data;

    if (data.startsWith("delete_")) {
        const dateId = data.split("_")[1];
        try {
            const deletedDate = await PersonalDate.findByIdAndDelete(dateId);
            if (deletedDate) {
                bot.editMessageText(`✅ Deleted: ${deletedDate.emoji} ${deletedDate.name}`, {
                    chat_id: chatId,
                    message_id: callbackQuery.message.message_id
                });
            } else {
                bot.editMessageText("Date not found or already deleted.", {
                    chat_id: chatId,
                    message_id: callbackQuery.message.message_id
                });
            }
        } catch (error) {
            console.error("Error deleting date:", error);
            bot.editMessageText("Error deleting date. Please try again.", {
                chat_id: chatId,
                message_id: callbackQuery.message.message_id
            });
        }
    }
  
    // Keep the other callback query handlers
    if (data === "sync_holidays") {
      await handleSyncHolidays(chatId, callbackQuery.message.message_id);
    } else if (data === "view_holidays") {
      await handleHolidays(chatId);
    }

    bot.answerCallbackQuery(callbackQuery.id);
  });

  bot.onText(/🎉 Holidays/, (msg) => {
    handleHolidays(msg.chat.id);
  });

  bot.onText(/\/today/, (msg) => {
    handleToday(msg.chat.id);
  });

  bot.onText(/📅 Today/, (msg) => {
    handleToday(msg.chat.id);
  });

  bot.onText(/➕ Add Date/, (msg) => {
    sendAddDateGuide(msg.chat.id);
  });

  bot.onText(/🗑️ Delete Date/, (msg) => {
    sendDeleteDateGuide(msg.chat.id);
  });

  bot.onText(/🔄 Sync Holidays/, async (msg) => {
    await handleSyncHolidays(msg.chat.id);
  });

  bot.onText(/❓ Help/, (msg) => {
    sendReplyKeyboard(msg.chat.id);
    sendHelpGuide(msg.chat.id);
  });

  bot.onText(/\/syncholidays/, async (msg) => {
    await handleSyncHolidays(msg.chat.id);
  });

  bot.on("callback_query", async (callbackQuery) => {
    const chatId = callbackQuery.message.chat.id;
    const data = callbackQuery.data;

    if (data === "sync_holidays") {
      await handleSyncHolidays(chatId, callbackQuery.message.message_id);
    } else if (data === "view_holidays") {
      await handleHolidays(chatId);
    }

    bot.answerCallbackQuery(callbackQuery.id);
  });
};
