import bot from "./bot.js";
import {
  getUpcomingHolidays,
  getAllHolidays,
  syncCurrentYear,
  checkApiHealth,
} from "../services/holiday.js";
import {
  parseExpense,
  addExpense,
  getTodayExpenses,
  getMonthExpenses,
  getBudget,
  setBudget,
  checkBudgetWarning,
  getBudgetReport,
} from "../services/expense.js";

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
breakfast 1000
lunch 3000
coffee 2000

Commands:
/today - Today's expenses
/thismonth - Monthly overview with budget
/holidays - Myanmar holidays
/settings - Bot settings`,
    { parse_mode: "Markdown" }
  );
}

export function handleHelp(chatId) {
  sendReplyKeyboard(chatId);
  bot.sendMessage(
    chatId,
    `Help

Add Expense:
breakfast 1000
lunch 3000
ညနေစာ 5000

Commands:
/today - Today's expenses
/thismonth - Monthly overview with budget
/holidays - Myanmar holidays
/settings - Bot settings (includes recent expenses)`,
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
      expenses.forEach((e) => {
        response += `${e.category.padEnd(12)} ${e.amount.toLocaleString()} MMK\n`;
      });
      response += `\n───────────────────\n`;
      response += `💰 Total: ${total.toLocaleString()} MMK`;
    }

    bot.sendMessage(chatId, response, { parse_mode: "Markdown" });
  });
}

export function handleThisMonth(chatId) {
  sendReplyKeyboard(chatId);

  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;

  getBudgetReport(chatId, year, month).then((report) => {
    const monthName = now.toLocaleString("default", { month: "long" });

    let response = `📅 ${monthName} ${year}\n`;

    if (report.total === 0) {
      response += `\nNo expenses yet\n\nEnter: breakfast 1000`;
    } else {
      response += `\n`;
      const sortedDays = Object.entries(report.byDay).sort((a, b) => b[0] - a[0]);
      sortedDays.slice(0, 10).forEach(([day, dayTotal]) => {
        response += `Jan ${day.padStart(2, " ")}  ${dayTotal.toLocaleString().padStart(8)} MMK\n`;
      });

      if (sortedDays.length > 10) {
        response += `   ...  ${sortedDays.length - 10} more days\n`;
      }
      response += `\n───────────────────\n`;
      response += `💰 Total: ${report.total.toLocaleString()} MMK`;

      if (report.budget > 0) {
        const bar = "█".repeat(Math.min(report.percentUsed, 50));
        const empty = "░".repeat(Math.max(0, 50 - report.percentUsed));
        response += `\n\n📊 Budget Progress\n`;
        response += `[${bar}${empty}] ${report.percentUsed}%\n`;
        response += `💵 Used: ${report.percentUsed}% | Remaining: ${report.remaining.toLocaleString()} MMK\n`;
        response += `📆 ${report.daysLeft} days left | Avg: ${report.averageDaily.toLocaleString()} MMK/day`;

        if (report.projectedTotal > report.budget) {
          const over = report.projectedTotal - report.budget;
          response += `\n⚠️ Projected: ${over.toLocaleString()} MMK over`;
        } else {
          const under = report.budget - report.projectedTotal;
          response += `\n✅ Projected: ${under.toLocaleString()} MMK under`;
        }
      }
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
  }).sort({ date: -1 }).limit(10);

  if (expenses.length === 0) {
    bot.sendMessage(chatId, "No expenses this month.");
    return;
  }

  let response = `Recent Expenses\n\n`;

  const inlineKeyboard = [];

  for (let i = 0; i < expenses.length; i++) {
    const e = expenses[i];
    const dateStr = e.date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
    response += `${i + 1}. ${dateStr} - ${e.category}: ${e.amount.toLocaleString()} MMK\n`;
    inlineKeyboard.push([{ text: `${i + 1}. Delete`, callback_data: `delete_${e._id}` }]);
  }

  response += `\nTotal: ${expenses.reduce((sum, e) => sum + e.amount, 0).toLocaleString()} MMK`;

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
      bot.editMessageText(`Deleted: ${deleted.category} - ${deleted.amount.toLocaleString()} MMK`, {
        chat_id: chatId,
        message_id: messageId,
      });
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
  const year = now.getFullYear();
  const month = now.getMonth() + 1;

  const monthlyTotal = await getMonthExpenses(chatId, year, month).then((r) => r.total);
  const budget = await getBudget(chatId);
  const warning = checkBudgetWarning(monthlyTotal, budget);

  let response = `Added

${category}: ${amount.toLocaleString()} MMK

Today total: ${amount.toLocaleString()} MMK`;

  if (warning) {
    response += `\n\n⚠️ ${warning.message}`;
  }

  bot.sendMessage(chatId, response, { parse_mode: "Markdown" });
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
      "January", "February", "March", "April", "May", "June",
      "July", "August", "September", "October", "November", "December"
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
  getBudget(chatId).then((budgetLimit) => {
    const inlineKeyboard = [
      [{ text: "Sync Holidays", callback_data: "sync_holidays" }],
      [{ text: "Set Budget", callback_data: "set_budget" }],
      [{ text: "Recent Expenses", callback_data: "recent_expenses" }],
    ];

    const status = budgetLimit > 0
      ? `Budget: ${budgetLimit.toLocaleString()} MMK`
      : "No budget set";

    const text = `Settings\n\n${status}`;

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
  });
}

export function handleSyncHolidays(chatId, messageId) {
  bot.sendMessage(chatId, "Syncing...").then((msg) => {
    handleSyncHolidaysCallback(chatId, msg.message_id);
  });
}

async function handleSyncHolidaysCallback(chatId, messageId) {
  try {
    const { CALENDARIFIC_API_KEY } = await import("../config/env.js");
    let apiStatus = "";

    if (CALENDARIFIC_API_KEY) {
      const health = await checkApiHealth();
      apiStatus = health.healthy ? "API OK" : health.message;
    } else {
      apiStatus = "No API key";
    }

    const result = await syncCurrentYear();
    const total = await getHolidayCount(new Date().getFullYear());

    if (result.success) {
      const added = result.holidays?.length || 0;
      const title = added > 0 ? "Synced" : "Up to Date";

      bot.editMessageText(
        `${title}\n\n${apiStatus} | ${total} holidays`,
        {
          chat_id: chatId,
          message_id: messageId,
          parse_mode: "Markdown",
          reply_markup: {
            inline_keyboard: [[{ text: "Back", callback_data: "settings" }]],
          },
        }
      );
    } else {
      bot.editMessageText(
        `Failed\n\n${result.error || apiStatus}`,
        {
          chat_id: chatId,
          message_id: messageId,
          parse_mode: "Markdown",
          reply_markup: {
            inline_keyboard: [[{ text: "Try Again", callback_data: "sync_holidays" }]],
          },
        }
      );
    }
  } catch (error) {
    console.error("Sync error:", error);
    bot.editMessageText("Failed. Try again.", {
      chat_id: chatId,
      message_id: messageId,
    });
  }
}

export function handleSetBudget(chatId, messageId) {
  const text = `Set Budget

Enter monthly budget:
Example: budget 300000`;

  if (messageId) {
    bot.editMessageText(text, {
      chat_id: chatId,
      message_id: messageId,
      parse_mode: "Markdown",
      reply_markup: {
        inline_keyboard: [[{ text: "Back", callback_data: "settings" }]],
      },
    });
  } else {
    bot.sendMessage(chatId, text, { parse_mode: "Markdown" });
  }
}

export function handleBudgetCommand(chatId, input) {
  const trimmed = input.trim().toLowerCase();
  const match = trimmed.match(/(\d+(?:,\d{3})*)/);

  if (!match) {
    bot.sendMessage(
      chatId,
      `Invalid format

Example: budget 300000`,
      { parse_mode: "Markdown" }
    );
    return;
  }

  const limit = parseInt(match[1].replace(/,/g, ""));

  if (limit <= 0) {
    bot.sendMessage(chatId, "Please enter a valid amount.");
    return;
  }

  setBudget(chatId, limit).then(() => {
    bot.sendMessage(
      chatId,
      `Budget set!\n\nMonthly: ${limit.toLocaleString()} MMK`,
      { parse_mode: "Markdown" }
    );
  });
}
