import bot from "./bot.js";
import Task from "../models/Task.js";
import User from "../models/User.js";
import Holiday from "../models/Holiday.js";
import {
  parseTime,
  extractTimeFromMessage,
  extractWeekday,
  WEEKDAY_NAMES,
  getDayName,
} from "../utils/timeParser.js";
import {
  TIMEZONES,
  formatTimezoneLabel,
  isValidTimezone,
  getTimezonesList,
} from "../utils/timezone.js";
import {
  getUpcomingHolidays,
  getTodayHolidays,
} from "../services/holiday.js";

function getUserLocalTime(timezone) {
  try {
    return new Date(new Date().toLocaleString("en-US", { timeZone: timezone }));
  } catch (e) {
    return new Date();
  }
}

function sendReplyKeyboard(chatId) {
  const keyboard = [
    [{ text: "⏰ Remind" }, { text: "📅 Today" }],
    [{ text: "🎉 Holiday" }, { text: "⚙️ Settings" }],
  ];
  bot.sendMessage(chatId, "Choose an option:", {
    reply_markup: { keyboard, resize_keyboard: true },
  });
}

function sendRemindGuide(chatId) {
  bot.sendMessage(
    chatId,
    `📝 *Set a Reminder*

Format: \`/remind <time> <task>\`

*Examples:*
• \`/remind 9am Meeting\`
• \`/remind daily 7am Exercise\`
• \`/remind weekdays 9am Standup\`
• \`/remind friday 9am Weekly review\`

*Alternative:*
• \`/remind mon 3pm Meeting\``,
    { parse_mode: "Markdown" }
  );
}

function sendDeleteGuide(chatId) {
  bot.sendMessage(
    chatId,
    `🗑️ *Delete Reminders*

*Commands:*
• \`/delete 1\` - Delete first reminder
• \`/delete 2\` - Delete second reminder
• \`/deleteall\` - Delete ALL reminders (confirm required)

*Use /today to see all reminders with numbers.*`,
    { parse_mode: "Markdown" }
  );
}

function parseRemindInput(input) {
  const lower = input.toLowerCase().trim();

  let type = "once";
  let timeInput = input;

  if (lower.startsWith("daily ") || lower.startsWith("every day ")) {
    type = "daily";
    timeInput = input.replace(/^(daily|every day)\s*/i, "").trim();
  } else if (lower.startsWith("weekdays ")) {
    type = "weekdays";
    timeInput = input.replace(/^weekdays\s*/i, "").trim();
  } else {
    const weekdayInfo = extractWeekday(input);
    if (weekdayInfo) {
      type = "weekly";
      const timeStr = extractTimeFromMessage(input);
      if (timeStr) {
        timeInput = timeStr;
      }
    }
  }

  const timeStr = extractTimeFromMessage(timeInput);
  if (!timeStr) return null;

  const parsed = parseTime(timeStr);
  if (!parsed) return null;

  let cleaned = timeInput;
  if (timeStr) {
    const timeRegex = new RegExp(timeStr.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
    cleaned = cleaned.replace(timeRegex, "");
  }

  const weekdayInfo = extractWeekday(input);
  if (weekdayInfo) {
    const dayRegex = new RegExp(weekdayInfo.name, "i");
    cleaned = cleaned.replace(dayRegex, "");
  }

  const task = cleaned.replace(/^[:\s]+|[:\s]+$/g, "").trim();
  if (!task) return null;

  return {
    type,
    time: timeStr,
    hour: parsed.hour,
    minute: parsed.minute,
    text: task,
    weekDay: weekdayInfo?.day,
  };
}

export const registerCommands = () => {
  bot.onText(/\/start/, (msg) => {
    sendReplyKeyboard(msg.chat.id);
    bot.sendMessage(
      msg.chat.id,
      `👋 *Welcome to GoGoTime!*

I help you schedule reminders.

*Commands:*
• \`/remind 9am Task\` - Set reminder
• \`/today\` - View schedule
• \`/holidays\` - Myanmar holidays
• \`/delete 1\` - Delete reminder
• \`/timezone Malaysia\` - Set timezone

💤 Quiet hours: 12:05am-6:30am
🎉 Holiday notification: 12:00am`,
      { parse_mode: "Markdown" }
    );
  });

  bot.onText(/\/remind$/, (msg) => {
    sendRemindGuide(msg.chat.id);
  });

  bot.onText(/\/remind (.+)/, async (msg, match) => {
    const chatId = msg.chat.id;
    const input = match[1].trim();

    if (!input) {
      sendRemindGuide(chatId);
      return;
    }

    const parsed = parseRemindInput(input);

    if (!parsed) {
      bot.sendMessage(
        chatId,
        `❌ *Invalid format*

Use: \`/remind <time> <task>\`

*Examples:*
• \`/remind 9am Meeting\`
• \`/remind daily 7am Exercise\`
• \`/remind friday 9am Review\``,
        { parse_mode: "Markdown" }
      );
      return;
    }

    const taskData = {
      chatId,
      text: parsed.text,
      time: parsed.time,
      hour: parsed.hour,
      minute: parsed.minute,
      type: parsed.type,
    };

    if (parsed.type === "weekly" && parsed.weekDay !== undefined) {
      taskData.weekDay = parsed.weekDay;
    }

    await Task.create(taskData);

    let typeLabel = "";
    if (parsed.type === "once") typeLabel = "One-time";
    else if (parsed.type === "daily") typeLabel = "Daily";
    else if (parsed.type === "weekdays") typeLabel = "Weekdays (Mon-Fri)";
    else if (parsed.type === "weekly") typeLabel = `Weekly (${getDayName(parsed.weekDay)})`;

    bot.sendMessage(
      chatId,
      `✅ *${typeLabel} reminder set!*

📅 ${parsed.time}
📝 ${parsed.text}`,
      { parse_mode: "Markdown" }
    );
  });

  bot.onText(/\/today/, async (msg) => {
    const chatId = msg.chat.id;
    const user = await User.findOne({ chatId });
    const timezone = user?.timezone || "Asia/Yangon";

    const now = getUserLocalTime(timezone);
    const currentDay = now.getDay();
    const currentHour = now.getHours();
    const currentMinute = now.getMinutes();
    const currentMonth = now.getMonth() + 1;
    const currentDate = now.getDate();

    const allTasks = await Task.find({ chatId, active: true });

    const todayTasks = allTasks.filter((t) => {
      if (t.type === "daily") return true;
      if (t.type === "weekdays") return currentDay !== 0 && currentDay !== 6;
      if (t.type === "weekly" && t.weekDay !== undefined) return t.weekDay === currentDay;
      if (t.type === "once") {
        const taskDate = new Date();
        taskDate.setHours(t.hour, t.minute);
        return taskDate.getDate() === currentDate;
      }
      return false;
    });

    const upcomingToday = todayTasks
      .filter((t) => {
        if (t.hour > currentHour) return true;
        if (t.hour === currentHour && t.minute >= currentMinute) return true;
        return false;
      })
      .sort((a, b) => a.hour - b.hour || a.minute - b.minute);

    const passedToday = todayTasks
      .filter((t) => {
        if (t.hour < currentHour) return true;
        if (t.hour === currentHour && t.minute < currentMinute) return true;
        return false;
      })
      .sort((a, b) => b.hour - a.hour || b.minute - a.minute);

    const otherTasks = allTasks
      .filter((t) => !todayTasks.includes(t))
      .sort((a, b) => a.hour - b.hour || a.minute - b.minute);

    let response = `📅 *Today* - ${now.toLocaleDateString("en-US", {
      weekday: "long",
      month: "short",
      day: "numeric",
    })}\n`;
    response += `${formatTimezoneLabel(timezone)}\n\n`;

    if (upcomingToday.length > 0) {
      response += `⏰ *Upcoming:*\n`;
      response += upcomingToday.map((t, i) => {
        const time = `${t.hour.toString().padStart(2, "0")}:${t.minute.toString().padStart(2, "0")}`;
        return `  ${i + 1}. ${time} - ${t.text}`;
      }).join("\n");
      response += "\n\n";
    }

    if (passedToday.length > 0) {
      response += `✅ *Passed:*\n`;
      response += passedToday.map((t) => {
        const time = `${t.hour.toString().padStart(2, "0")}:${t.minute.toString().padStart(2, "0")}`;
        return `  ${time} - ${t.text}`;
      }).join("\n");
      response += "\n\n";
    }

    const todayHolidays = await getTodayHolidays(currentMonth, currentDate);
    if (todayHolidays.length > 0) {
      response += `🎉 *Today is a Holiday!*\n`;
      todayHolidays.forEach((h) => {
        response += `  🇲🇲 ${h.name}\n`;
      });
      response += "\n";
    }

    if (upcomingToday.length === 0 && passedToday.length === 0 && otherTasks.length === 0) {
      response += "📭 No reminders for today.";
    }

    if (otherTasks.length > 0) {
      response += `\n📋 *All Reminders:*\n`;
      response += otherTasks.map((t, i) => {
        const time = `${t.hour.toString().padStart(2, "0")}:${t.minute.toString().padStart(2, "0")}`;
        let type = "";
        if (t.type === "daily") type = "Daily";
        else if (t.type === "weekdays") type = "Mon-Fri";
        else if (t.type === "weekly") type = getDayName(t.weekDay).slice(0, 3);
        else if (t.type === "once") type = "Once";
        return `  ${i + 1}. ${time} [${type}] - ${t.text}`;
      }).join("\n");
    }

    bot.sendMessage(chatId, response, { parse_mode: "Markdown" });
  });

  bot.onText(/\/holidays/, async (msg) => {
    const chatId = msg.chat.id;
    const now = new Date();
    const currentMonth = now.getMonth() + 1;
    const currentDay = now.getDate();

    const allHolidays = await Holiday.find({
      year: now.getFullYear(),
      $or: [
        { month: currentMonth, day: { $gte: currentDay } },
        { month: { $gt: currentMonth } },
      ],
    }).sort({ month: 1, day: 1 });

    const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

    let response = `🎉 *Myanmar Holidays*\n`;
    response += `${now.getFullYear()} | ${allHolidays.length} remaining\n\n`;

    if (allHolidays.length > 0) {
      response += allHolidays.map((h) => {
        const dateStr = `${monthNames[h.month - 1]} ${h.day.toString().padStart(2, " ")}`;
        return `${dateStr}  ${h.name}`;
      }).join("\n");
    } else {
      response += "📭 No more holidays this year.";
    }

    bot.sendMessage(chatId, response, { parse_mode: "Markdown" });
  });

  bot.onText(/\/delete$/, (msg) => {
    sendDeleteGuide(msg.chat.id);
  });

  bot.onText(/\/delete (.+)/, async (msg, match) => {
    const chatId = msg.chat.id;
    const number = parseInt(match[1].trim());

    if (isNaN(number) || number < 1) {
      bot.sendMessage(
        chatId,
        `❌ *Invalid number*

Use: \`/delete <number>\`

Example: \`/delete 1\`

Use /today to see all reminders with numbers.`,
        { parse_mode: "Markdown" }
      );
      return;
    }

    const activeTasks = await Task.find({ chatId, active: true }).sort({ createdAt: -1 });

    if (number > activeTasks.length) {
      bot.sendMessage(chatId, `❌ Invalid number.\n\nYou have ${activeTasks.length} reminders.\n\nUse /today to see all reminders with numbers.`);
      return;
    }

    const taskToDelete = activeTasks[number - 1];
    await Task.findByIdAndUpdate(taskToDelete._id, { active: false });
    bot.sendMessage(chatId, `✅ Deleted: ${taskToDelete.text}`);
  });

  bot.onText(/\/deleteall$/, async (msg) => {
    const chatId = msg.chat.id;

    const count = await Task.countDocuments({ chatId, active: true });

    if (count === 0) {
      bot.sendMessage(chatId, "📭 You have no reminders to delete.");
      return;
    }

    const keyboard = [
      [{ text: "✅ Yes, delete all" }, { text: "❌ No, cancel" }],
    ];

    bot.sendMessage(
      chatId,
      `⚠️ *Delete all ${count} reminders?*

This cannot be undone.`,
      {
        parse_mode: "Markdown",
        reply_markup: { keyboard, resize_keyboard: true },
      }
    );
  });

  bot.onText(/✅ Yes, delete all/, async (msg) => {
    const chatId = msg.chat.id;
    const count = await Task.countDocuments({ chatId, active: true });
    await Task.updateMany({ chatId, active: true }, { active: false });
    bot.sendMessage(chatId, `✅ Deleted all ${count} reminders.`);
    sendReplyKeyboard(chatId);
  });

  bot.onText(/❌ No, cancel/, (msg) => {
    bot.sendMessage(msg.chat.id, "Cancelled.");
    sendReplyKeyboard(msg.chat.id);
  });

  bot.onText(/\/timezone$/, async (msg) => {
    const chatId = msg.chat.id;
    const user = await User.findOne({ chatId });
    const currentTz = user?.timezone || "Asia/Yangon";

    const keyboard = [
      [{ text: "✅ Yes, change" }, { text: "❌ No, keep it" }],
    ];

    bot.sendMessage(
      chatId,
      `🌐 *Your Timezone*

${formatTimezoneLabel(currentTz)}

Do you want to change it?`,
      {
        parse_mode: "Markdown",
        reply_markup: { keyboard, resize_keyboard: true },
      }
    );
  });

  bot.onText(/\/timezone (.+)/, async (msg, match) => {
    const chatId = msg.chat.id;
    const tz = match[1].trim();

    if (!isValidTimezone(tz)) {
      bot.sendMessage(
        chatId,
        `❌ *Timezone not found:* ${tz}\n\nType /settings to see all available timezones.`,
        { parse_mode: "Markdown" }
      );
      return;
    }

    await User.findOneAndUpdate(
      { chatId },
      { timezone: tz, updatedAt: new Date() },
      { upsert: true, new: true }
    );

    bot.sendMessage(
      chatId,
      `✅ Done! Timezone set to: ${formatTimezoneLabel(tz)}\n\n💤 Quiet hours: 12:05am-6:30am`
    );
  });

  bot.onText(/\/help/, (msg) => {
    sendReplyKeyboard(msg.chat.id);
    bot.sendMessage(
      msg.chat.id,
      `📖 *Help*

*Set Reminders:*
• \`/remind 9am Task\` - One-time
• \`/remind daily 7am Task\` - Every day
• \`/remind weekdays 9am Task\` - Mon-Fri
• \`/remind fri 9am Task\` - Every Friday

*View:*
• \`/today\` - Today's schedule
• \`/holidays\` - Myanmar holidays
• Get holiday notification at 12:00am if today is a holiday

*Manage:*
• \`/delete 1\` - Delete first reminder
• \`/deleteall\` - Delete all (confirm)

*Settings:*
• \`/timezone Malaysia\` - Set timezone

💤 Quiet hours: 12:05am-6:30am`,
      { parse_mode: "Markdown" }
    );
  });

  bot.onText(/\/settings/, (msg) => {
    sendReplyKeyboard(msg.chat.id);
    bot.sendMessage(
      msg.chat.id,
      `⚙️ *Settings*

*Commands:*
• \`/timezone\` - Show timezone
• \`/timezone Malaysia\` - Set timezone
• \`/help\` - Show help

💤 Quiet hours: 12:05am-6:30am`,
      { parse_mode: "Markdown" }
    );
  });

  bot.onText(/⏰ Remind/, (msg) => {
    sendRemindGuide(msg.chat.id);
  });

  bot.onText(/📅 Today/, (msg) => {
    const chatId = msg.chat.id;
    User.findOne({ chatId }).then((user) => {
      const timezone = user?.timezone || "Asia/Yangon";
      const now = getUserLocalTime(timezone);
      const currentHour = now.getHours();
      const currentMinute = now.getMinutes();

      Task.find({ chatId, active: true }).sort({ hour: 1, minute: 1 }).then((tasks) => {
        const upcoming = tasks.filter((t) => t.hour > currentHour || (t.hour === currentHour && t.minute >= currentMinute));
        const passed = tasks.filter((t) => t.hour < currentHour || (t.hour === currentHour && t.minute < currentMinute));

        let response = `📅 *Today* - ${now.toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric" })}\n`;
        response += `${formatTimezoneLabel(timezone)}\n\n`;

        if (upcoming.length > 0) {
          response += `⏰ *Upcoming:*\n`;
          response += upcoming.map((t, i) => {
            const time = `${t.hour.toString().padStart(2, "0")}:${t.minute.toString().padStart(2, "0")}`;
            return `  ${i + 1}. ${time} - ${t.text}`;
          }).join("\n");
          response += "\n\n";
        }

        if (passed.length > 0) {
          response += `✅ *Passed:*\n`;
          response += passed.map((t) => {
            const time = `${t.hour.toString().padStart(2, "0")}:${t.minute.toString().padStart(2, "0")}`;
            return `  ${time} - ${t.text}`;
          }).join("\n");
        }

      if (upcoming.length === 0 && passed.length === 0) {
        response += "📭 No reminders.";
      }

        bot.sendMessage(chatId, response, { parse_mode: "Markdown" });
      });
    });
  });

  bot.onText(/🎉 Holiday/, (msg) => {
    const chatId = msg.chat.id;
    Holiday.find({ year: new Date().getFullYear() }).sort({ month: 1, day: 1 }).then((holidays) => {
      const now = new Date();
      const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

      let response = `🎉 *Myanmar Holidays*\n`;
      response += `${now.getFullYear()} | ${holidays.length} total\n\n`;

      response += holidays.map((h) => `${monthNames[h.month - 1]} ${h.day.toString().padStart(2, " ")}  ${h.name}`).join("\n");

      bot.sendMessage(chatId, response, { parse_mode: "Markdown" });
    });
  });

  bot.onText(/⚙️ Settings/, (msg) => {
    const chatId = msg.chat.id;
    User.findOne({ chatId }).then((user) => {
      const currentTz = user?.timezone || "Asia/Yangon";

      const keyboard = [
        [{ text: "✅ Yes, change" }, { text: "❌ No, thanks" }],
      ];

      bot.sendMessage(
        chatId,
        `⚙️ *Settings*

🌐 *Your Timezone:* ${formatTimezoneLabel(currentTz)}

Do you want to change your timezone?`,
        {
          parse_mode: "Markdown",
          reply_markup: { keyboard, resize_keyboard: true },
        }
      );
    });
  });

  bot.onText(/✅ Yes, change/, (msg) => {
    const chatId = msg.chat.id;
    let response = `🌐 *Choose Timezone:*\n\n`;
    response += getTimezonesList();
    response += `\n\nType: \`/timezone <name>\``;

    bot.sendMessage(chatId, response, { parse_mode: "Markdown" });
  });

  bot.onText(/❌ No, thanks/, (msg) => {
    bot.sendMessage(msg.chat.id, "Okay, no changes made!");
    sendReplyKeyboard(msg.chat.id);
  });
};
