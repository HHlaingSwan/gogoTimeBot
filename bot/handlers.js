import bot from "./bot.js";
import {
  getAllHolidays,
  syncCurrentYear,
  getHolidayCount,
} from "../services/holiday.js";
import {
  parseExpense,
  addExpense,
  getTodayExpenses,
  getMonthExpenses,
} from "../services/expense.js";

const lastSyncTime = new Map();
const SYNC_COOLDOWN_MONTHLY = true;

export function sendReplyKeyboard(chatId) {
  const keyboard = [
    [{ text: "Today" }, { text: "This Month" }],
    [{ text: "Holidays" }, { text: "Settings" }],
  ];
  bot.sendMessage(chatId, "Choose an option:", {
    reply_markup: { keyboard, resize_keyboard: true },
  });
}

export function handleStart(chatId) {
  sendReplyKeyboard(chatId);
  bot.sendMessage(
    chatId,
    `Welcome!

Track your daily expenses easily.

Just type:

မနက်စာ 1000
lunch 3000
coffee 2000
ညနေစာ 5000
ကားခ 800

Commands:

/today - Today's expenses
/thismonth - Monthly overview
/holidays - Myanmar holidays
/settings - Bot settings`,
    { parse_mode: "Markdown" }
  );
}

export function handleHelp(chatId) {
  sendReplyKeyboard(chatId);
  bot.sendMessage(
    chatId,
    `Welcome!

Track your daily expenses easily.

Just type:

မနက်စာ 1000
lunch 3000
coffee 2000
ညနေစာ 5000
ကားခ 800


Commands:

/today - Today's expenses
/thismonth - Monthly overview
/holidays - Myanmar holidays
/settings - Bot settings`,
    { parse_mode: "Markdown" }
  );
}

export function handleTodayExpenses(chatId) {
  sendReplyKeyboard(chatId);

  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;

  getTodayExpenses(chatId).then(({ expenses, total }) => {
    const dateStr = now.toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
    });

    let response = `📅 Today - ${dateStr}\n`;

    if (expenses.length === 0) {
      response += `\nNo expenses yet\n\nEnter: breakfast 1000`;
    } else {
      response += `\n`;
      const maxLen = Math.max(...expenses.map(e => e.category.length));
      expenses.forEach((e) => {
        response += `${e.category.padEnd(maxLen + 1)} ${e.amount.toLocaleString()}\n`;
      });
      response += `\n───────────────────\n`;
      response += `💰 Total: ${total.toLocaleString()}`;
    }

    bot.sendMessage(chatId, response, { parse_mode: "Markdown" });
  });
}

export function handleThisMonth(chatId) {
  sendReplyKeyboard(chatId);

  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;

  getMonthExpenses(chatId, year, month).then(({ total, byDay }) => {
    const monthName = now.toLocaleString("default", { month: "long" });

    let response = `📅 ${monthName} ${year}\n`;

    if (total === 0) {
      response += `\nNo expenses yet\n\nEnter: breakfast 1000`;
    } else {
      response += `\n`;
      const sortedDays = Object.entries(byDay).sort((a, b) => b[0] - a[0]);
      sortedDays.forEach(([day, dayTotal]) => {
        response += `${monthName.slice(0, 3)} ${day.padStart(2, " ")}  ${dayTotal
          .toLocaleString()
          .padStart(8)}\n`;
      });
      response += `\n───────────────────\n`;
      response += `💰 Total: ${total.toLocaleString()}`;
    }

    bot.sendMessage(chatId, response, { parse_mode: "Markdown" });
  });
}

export async function handleRecent(chatId) {
  sendReplyKeyboard(chatId);

  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  const Expense = (await import("../models/Expense.js")).default;
  const expenses = await Expense.find({
    chatId,
    date: { $gte: startOfMonth },
  })
    .sort({ date: -1 })
    .limit(10);

  if (expenses.length === 0) {
    bot.sendMessage(chatId, "No expenses this month.");
    return;
  }

  let response = `Recent Expenses\n\n`;

  const inlineKeyboard = [];

  for (let i = 0; i < expenses.length; i++) {
    const e = expenses[i];
    const dateStr = e.date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    });
    response += `${i + 1}. ${dateStr} - ${
      e.category
    }: ${e.amount.toLocaleString()}\n`;
    inlineKeyboard.push([
      { text: `${i + 1}. Delete`, callback_data: `delete_${e._id}` },
    ]);
  }

  response += `\nTotal: ${expenses
    .reduce((sum, e) => sum + e.amount, 0)
    .toLocaleString()}`;

  bot.sendMessage(chatId, response, {
    parse_mode: "Markdown",
    reply_markup: { inline_keyboard: inlineKeyboard },
  });
}

export async function handleDeleteExpense(chatId, expenseId, messageId) {
  const Expense = (await import("../models/Expense.js")).default;

  try {
    const deleted = await Expense.findByIdAndDelete(expenseId);
      if (deleted) {
      bot.editMessageText(
        `Deleted: ${deleted.category} - ${deleted.amount.toLocaleString()}`,
        {
          chat_id: chatId,
          message_id: messageId,
        }
      );
    } else {
      bot.editMessageText("Not found or already deleted.", {
        chat_id: chatId,
        message_id: messageId,
      });
    }
  } catch (error) {
    bot.editMessageText("Error deleting. Try again.", {
      chat_id: chatId,
      message_id: messageId,
    });
  }
}

export async function handleExpense(chatId, input) {
  const result = parseExpense(input);

  if (!result.success) {
    bot.sendMessage(
      chatId,
      `Invalid format

Example: breakfast 1000
Or: lunch 3000`,
      { parse_mode: "Markdown" }
    );
    return;
  }

  const { amount, description, category } = result.data;
  await addExpense(chatId, amount, description, category);

  const now = new Date();

  getTodayExpenses(chatId).then(({ total }) => {
    let response = `Added

${category}: ${amount.toLocaleString()}

Today total: ${total.toLocaleString()}`;

    bot.sendMessage(chatId, response, { parse_mode: "Markdown" });
  });
}

export function handleHolidays(chatId) {
  sendReplyKeyboard(chatId);
  const now = new Date();
  const year = now.getFullYear();

  getAllHolidays(year).then((holidays) => {
    if (holidays.length === 0) {
      bot.sendMessage(chatId, "No holidays. Go to Settings → Sync Holidays.");
      return;
    }

    const grouped = holidays.reduce((acc, h) => {
      const month = h.month;
      if (!acc[month]) acc[month] = [];
      acc[month].push(h);
      return acc;
    }, {});

    const monthNames = [
      "January",
      "February",
      "March",
      "April",
      "May",
      "June",
      "July",
      "August",
      "September",
      "October",
      "November",
      "December",
    ];

    let response = `Myanmar Holidays - ${year}\n\n`;

    for (const [month, list] of Object.entries(grouped)) {
      response += `${monthNames[month - 1]}\n`;
      list.forEach((h) => {
        response += `${String(h.day).padStart(2, " ")} ${h.name}\n`;
      });
      response += "\n";
    }

    response += `Total: ${holidays.length} holidays`;

    bot.sendMessage(chatId, response, { parse_mode: "Markdown" });
  });
}

export function handleSettings(chatId, messageId) {
  const inlineKeyboard = [
    [{ text: "Sync Holidays", callback_data: "sync_holidays" }],
    [{ text: "Recent Expenses", callback_data: "recent_expenses" }],
  ];

  const text = `Settings

• Sync Holidays - Update Myanmar holidays from API
• Recent Expenses - View and delete recent expenses`;

  if (messageId) {
    bot.editMessageText(text, {
      chat_id: chatId,
      message_id: messageId,
      parse_mode: "Markdown",
      reply_markup: { inline_keyboard: inlineKeyboard },
    });
  } else {
    bot.sendMessage(chatId, text, {
      parse_mode: "Markdown",
      reply_markup: { inline_keyboard: inlineKeyboard },
    });
  }
}

export function handleSyncHolidays(chatId, messageId, callbackQueryId) {
  const now = new Date();
  const syncKey = `${chatId}-${now.getFullYear()}-${now.getMonth()}`;
  const lastSync = lastSyncTime.get(syncKey);

  if (lastSync) {
    bot.answerCallbackQuery(callbackQueryId);
    bot.sendMessage(chatId, "Already synced this month. Try again next month.");
    return;
  }

  lastSyncTime.set(syncKey, now.getTime());
  bot.answerCallbackQuery(callbackQueryId);

  bot.sendMessage(chatId, "Syncing...").then((msg) => {
    handleSyncHolidaysCallback(chatId, msg.message_id);
  });
}

async function handleSyncHolidaysCallback(chatId, messageId) {
  try {
    console.log("Starting holiday sync...");
    const result = await syncCurrentYear();
    console.log("Sync result:", result);

    const total = await getHolidayCount(new Date().getFullYear());
    console.log("Holiday count:", total);

    if (result.success) {
      const added = result.holidays?.length || 0;
      const title = added > 0 ? "Synced" : "Up to Date";

      bot.editMessageText(`${title}\n\n${total} holidays`, {
        chat_id: chatId,
        message_id: messageId,
        parse_mode: "Markdown",
        reply_markup: {
          inline_keyboard: [[{ text: "Back", callback_data: "settings" }]],
        },
      });
    } else {
      bot.editMessageText(`Failed\n\n${result.error}`, {
        chat_id: chatId,
        message_id: messageId,
        parse_mode: "Markdown",
        reply_markup: {
          inline_keyboard: [
            [{ text: "Try Again", callback_data: "sync_holidays" }],
          ],
        },
      });
    }
  } catch (error) {
    console.error("Sync error:", error);
    bot.editMessageText(`Failed: ${error.message}`, {
      chat_id: chatId,
      message_id: messageId,
    });
  }
}
