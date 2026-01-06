import bot from "./bot.js";
import Holiday from "../models/Holiday.js";
import PersonalDate from "../models/PersonalDate.js";
import {
  getDaysUntil,
  formatCountdown,
  getMonthName,
  getShortMonthName,
  getWeekdayName,
  isValidDate,
  getMoonPhase,
  formatAge,
  formatYearsTogether
} from "../utils/countdown.js";
import {
  getUpcomingHolidays,
  getHolidaysByMonth,
  getHolidaysForDate,
  getHolidayCount
} from "../services/holiday.js";

const WEEKDAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function sendReplyKeyboard(chatId) {
  const keyboard = [
    [{ text: "📅 Today" }, { text: "🎉 Holidays" }],
    [{ text: "➕ Add Date" }, { text: "🗑️ Delete Date" }],
  ];
  bot.sendMessage(chatId, "Choose an option:", {
    reply_markup: { keyboard, resize_keyboard: true },
  });
}

function sendHelpGuide(chatId) {
    bot.sendMessage(
      chatId,
      `📖 *Help*

*Main:*
• \`/today\` - Today, holidays, your dates with age
• \`/holidays\` - All holidays this year
• \`/syncholidays\` - Force sync holidays

*Dates:*
• \`/adddate 12-25 Name\` - Add date
• \`/adddate 12-25 1990 Name\` - Add with birth year for age
• \`/deletedate 1\` - Delete by number

*Note:* Numbers in /today are for /deletedate`,
      { parse_mode: "Markdown" }
    );
}

function sendAddDateGuide(chatId) {
  bot.sendMessage(
    chatId,
    `➕ *Add Personal Date*

*Simple:*
\`/adddate 12-25 Christmas\`

*With birth year (for age):*
\`/adddate 12-25 1990 My Birthday\`

*With anniversary year:*
\`/adddate 08-20 2020 Anniversary\``,
    { parse_mode: "Markdown" }
  );
}

function sendDeleteDateGuide(chatId) {
  bot.sendMessage(
    chatId,
    `🗑️ *Delete Date*

Use the number from \`/today\` command.

Example: \`/deletedate 1\``,
    { parse_mode: "Markdown" }
  );
}

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

  bot.onText(/\/today/, async (msg) => {
    const chatId = msg.chat.id;
    const now = new Date();
    const currentMonth = now.getMonth() + 1;
    const currentDay = now.getDate();
    const currentYear = now.getFullYear();
    const weekday = WEEKDAY_NAMES[now.getDay()];

    const todayHolidays = await getHolidaysForDate(currentMonth, currentDay, currentYear);
    const todayPersonalDates = await PersonalDate.find({ chatId, month: currentMonth, day: currentDay });
    const monthHolidays = await getHolidaysByMonth(currentMonth, currentYear);
    const allPersonalDates = await PersonalDate.find({ chatId }).sort({ month: 1, day: 1 });

    const moonPhase = getMoonPhase(now);

    const personalDatesWithCountdown = allPersonalDates.map((d) => {
      const daysUntil = getDaysUntil(d.month, d.day, now);
      let ageInfo = "";
      if (d.type === "birthday" && d.birthYear) {
        ageInfo = ` (Age ${currentYear - d.birthYear})`;
      } else if (d.birthYear) {
        ageInfo = ` (${formatYearsTogether(d.birthYear, currentYear)})`;
      }
      return {
        ...d.toObject(),
        daysUntil,
        countdown: formatCountdown(daysUntil),
        monthDay: `${d.month}-${d.day}`,
        ageInfo
      };
    }).sort((a, b) => a.daysUntil - b.daysUntil);

    const monthHolidaysWithCountdown = monthHolidays
      .filter((h) => {
        if (currentMonth > now.getMonth() + 1) return true;
        return h.day >= currentDay;
      })
      .map((h) => {
        const daysUntil = getDaysUntil(h.month, h.day, now);
        return {
          ...h.toObject(),
          daysUntil,
          countdown: formatCountdown(daysUntil)
        };
      });

    let response = `📅 *Today* - ${weekday}, ${getMonthName(currentMonth)} ${currentDay}, ${currentYear}

🌙 Moon: ${moonPhase.emoji} ${moonPhase.name}

`;

    if (todayHolidays.length > 0 || todayPersonalDates.length > 0) {
      response += `*🎉 Today:*\n`;
      todayHolidays.forEach((h) => {
        response += `  🇲🇲 ${h.name}\n`;
      });
      todayPersonalDates.forEach((d) => {
        let ageStr = "";
        if (d.type === "birthday" && d.birthYear) {
          ageStr = ` (🎂 Age ${currentYear - d.birthYear})`;
        } else if (d.birthYear && d.type === "anniversary") {
          ageStr = ` (💕 ${formatYearsTogether(d.birthYear, currentYear)})`;
        }
        response += `  ${d.emoji} ${d.name}${ageStr}\n`;
      });
      response += "\n";
    }

    if (monthHolidaysWithCountdown.length > 0) {
      response += `*📆 This Month Holidays:*\n`;
      response += monthHolidaysWithCountdown.map((h) => {
        const weekday = getWeekdayName(h.month, h.day);
        return `  ${h.day.toString().padStart(2, " ")} ${getShortMonthName(h.month)} (${weekday}) ${h.name.padEnd(18)} ${h.countdown}`;
      }).join("\n");
      response += "\n\n";
    } else {
      response += "\n";
    }

    if (personalDatesWithCountdown.length > 0) {
      response += `*📌 Your Dates:*\n`;
      response += personalDatesWithCountdown.map((d, i) => {
        const num = (i + 1).toString().padStart(2, " ");
        return `  ${num} ${d.emoji} ${d.name} (${d.monthDay})${d.ageInfo} - ${d.countdown}`;
      }).join("\n");
    }

    if (todayHolidays.length === 0 && todayPersonalDates.length === 0 && 
        monthHolidaysWithCountdown.length === 0 && personalDatesWithCountdown.length === 0) {
      response += "No events. Use /adddate to add a date!";
    }

    bot.sendMessage(chatId, response, { parse_mode: "Markdown" });
  });

  bot.onText(/\/holidays$/, async (msg) => {
    const chatId = msg.chat.id;
    const now = new Date();
    const currentYear = now.getFullYear();

    const holidays = await getUpcomingHolidays(now);
    const totalHolidays = await getHolidayCount(currentYear);

    let response = `🎉 *Myanmar Holidays*

📅 ${currentYear} | ${totalHolidays} remaining

`;

    if (holidays.length > 0) {
      response += holidays.map((h) => {
        const weekday = getWeekdayName(h.month, h.day);
        const daysUntil = getDaysUntil(h.month, h.day, now);
        const countdown = formatCountdown(daysUntil);
        return `${h.day.toString().padStart(2, " ")} ${getShortMonthName(h.month)} (${weekday}) ${h.name.padEnd(18)} ${countdown}`;
      }).join("\n");
    } else {
      response += "No more holidays this year.";
    }

    bot.sendMessage(chatId, response, { parse_mode: "Markdown" });
  });

  bot.onText(/\/adddate$/, (msg) => {
    sendAddDateGuide(msg.chat.id);
  });

  bot.onText(/\/adddate (.+)/, async (msg, match) => {
    const chatId = msg.chat.id;
    const input = match[1].trim();

    const dateMatch = input.match(/^(\d{1,2})[-/](\d{1,2})\s+(\d{4})?\s*(.+)$/);
    if (!dateMatch) {
      bot.sendMessage(
        chatId,
        `❌ *Invalid format*

Use: \`/adddate <MM-DD> [YYYY] <name>\`

*Examples:*
• \`/adddate 12-25 Christmas\`
• \`/adddate 03-15 1990 My Birthday\`
• \`/adddate 08-20 2020 Anniversary\``,
        { parse_mode: "Markdown" }
      );
      return;
    }

    const month = parseInt(dateMatch[1]);
    const day = parseInt(dateMatch[2]);
    const birthYear = dateMatch[3] ? parseInt(dateMatch[3]) : null;
    const name = (dateMatch[3] ? dateMatch[4] : dateMatch[3]).trim();

    if (!isValidDate(month, day)) {
      bot.sendMessage(chatId, "Invalid date. Please check month and day.");
      return;
    }

    if (name.length < 2) {
      bot.sendMessage(chatId, "Name must be at least 2 characters.");
      return;
    }

    if (birthYear && (birthYear < 1900 || birthYear > 2100)) {
      bot.sendMessage(chatId, "Invalid year. Use 1900-2100.");
      return;
    }

    try {
      const existing = await PersonalDate.findOne({
        chatId,
        name: { $regex: new RegExp(`^${name}$`, "i") }
      });

      if (existing) {
        bot.sendMessage(chatId, `❌ "${name}" already exists.`);
        return;
      }

      const emojis = name.match(/[\p{Emoji_Presentation}\p{Extended_Pictographic}]/gu) || [];
      const emoji = emojis.length > 0 ? emojis.join("") : "📅";
      const cleanName = name.replace(/[\p{Emoji_Presentation}\p{Extended_Pictographic}]/gu, "").trim();

      let type = "custom";
      if (name.toLowerCase().includes("birthday") || name.toLowerCase().includes("birth")) {
        type = "birthday";
      } else if (name.toLowerCase().includes("anniversary") || name.toLowerCase().includes("anniversary")) {
        type = "anniversary";
      }

      await PersonalDate.create({
        chatId,
        name: cleanName,
        month,
        day,
        birthYear,
        type,
        emoji
      });

      const monthDay = `${getShortMonthName(month)} ${day}`;
      const daysUntil = getDaysUntil(month, day, new Date());
      const countdown = formatCountdown(daysUntil);

      let infoStr = "";
      if (type === "birthday" && birthYear) {
        const age = new Date().getFullYear() - birthYear;
        infoStr = `\n🎂 Age: ${age} years old`;
      } else if (type === "anniversary" && birthYear) {
        const years = new Date().getFullYear() - birthYear;
        infoStr = `\n💕 ${years} years together`;
      }

      bot.sendMessage(
        chatId,
        `✅ *Added!*

${emoji} ${cleanName}
📆 ${monthDay}
⏳ ${countdown}${infoStr}`,
        { parse_mode: "Markdown" }
      );
    } catch (error) {
      console.error("Error adding date:", error);
      bot.sendMessage(chatId, "Error saving date. Please try again.");
    }
  });

  bot.onText(/\/deletedate$/, (msg) => {
    sendDeleteDateGuide(msg.chat.id);
  });

  bot.onText(/\/deletedate (.+)/, async (msg, match) => {
    const chatId = msg.chat.id;
    const num = parseInt(match[1].trim());

    if (isNaN(num) || num < 1) {
      bot.sendMessage(chatId, "Invalid number. Check /today for your dates.");
      return;
    }

    const dates = await PersonalDate.find({ chatId }).sort({ month: 1, day: 1 });

    if (num > dates.length) {
      bot.sendMessage(chatId, `Invalid number. You have ${dates.length} dates.`);
      return;
    }

    const toDelete = dates[num - 1];
    await PersonalDate.findByIdAndDelete(toDelete._id);

    bot.sendMessage(chatId, `✅ Deleted: ${toDelete.emoji} ${toDelete.name}`);
  });

  bot.onText(/🎉 Holidays/, async (msg) => {
    const chatId = msg.chat.id;
    const now = new Date();
    const holidays = await getUpcomingHolidays(now);
    const totalHolidays = await getHolidayCount(now.getFullYear());

    let response = `🎉 *Myanmar Holidays*

📅 ${now.getFullYear()} | ${totalHolidays} remaining

`;

    if (holidays.length > 0) {
      response += holidays.map((h) => {
        const weekday = getWeekdayName(h.month, h.day);
        const daysUntil = getDaysUntil(h.month, h.day, now);
        const countdown = formatCountdown(daysUntil);
        return `${h.day.toString().padStart(2, " ")} ${getShortMonthName(h.month)} (${weekday}) ${h.name.padEnd(18)} ${countdown}`;
      }).join("\n");
    } else {
      response += "No more holidays this year.";
    }

    bot.sendMessage(chatId, response, { parse_mode: "Markdown" });
  });

  bot.onText(/📅 Today/, async (msg) => {
    const chatId = msg.chat.id;
    const now = new Date();
    const currentMonth = now.getMonth() + 1;
    const currentDay = now.getDate();
    const currentYear = now.getFullYear();
    const weekday = WEEKDAY_NAMES[now.getDay()];

    const todayHolidays = await getHolidaysForDate(currentMonth, currentDay, currentYear);
    const todayPersonalDates = await PersonalDate.find({ chatId, month: currentMonth, day: currentDay });
    const monthHolidays = await getHolidaysByMonth(currentMonth, currentYear);
    const allPersonalDates = await PersonalDate.find({ chatId }).sort({ month: 1, day: 1 });

    const moonPhase = getMoonPhase(now);

    const personalDatesWithCountdown = allPersonalDates.map((d) => {
      const daysUntil = getDaysUntil(d.month, d.day, now);
      let ageInfo = "";
      if (d.type === "birthday" && d.birthYear) {
        ageInfo = ` (Age ${currentYear - d.birthYear})`;
      } else if (d.birthYear) {
        ageInfo = ` (${formatYearsTogether(d.birthYear, currentYear)})`;
      }
      return {
        ...d.toObject(),
        daysUntil,
        countdown: formatCountdown(daysUntil),
        monthDay: `${d.month}-${d.day}`,
        ageInfo
      };
    }).sort((a, b) => a.daysUntil - b.daysUntil);

    const monthHolidaysWithCountdown = monthHolidays
      .filter((h) => {
        if (currentMonth > now.getMonth() + 1) return true;
        return h.day >= currentDay;
      })
      .map((h) => {
        const daysUntil = getDaysUntil(h.month, h.day, now);
        return {
          ...h.toObject(),
          daysUntil,
          countdown: formatCountdown(daysUntil)
        };
      });

    let response = `📅 *Today* - ${weekday}, ${getMonthName(currentMonth)} ${currentDay}, ${currentYear}

🌙 Moon: ${moonPhase.emoji} ${moonPhase.name}

`;

    if (todayHolidays.length > 0 || todayPersonalDates.length > 0) {
      response += `*🎉 Today:*\n`;
      todayHolidays.forEach((h) => {
        response += `  🇲🇲 ${h.name}\n`;
      });
      todayPersonalDates.forEach((d) => {
        let ageStr = "";
        if (d.type === "birthday" && d.birthYear) {
          ageStr = ` (🎂 Age ${currentYear - d.birthYear})`;
        } else if (d.birthYear && d.type === "anniversary") {
          ageStr = ` (💕 ${formatYearsTogether(d.birthYear, currentYear)})`;
        }
        response += `  ${d.emoji} ${d.name}${ageStr}\n`;
      });
      response += "\n";
    }

    if (monthHolidaysWithCountdown.length > 0) {
      response += `*📆 This Month Holidays:*\n`;
      response += monthHolidaysWithCountdown.map((h) => {
        const weekday = getWeekdayName(h.month, h.day);
        return `  ${h.day.toString().padStart(2, " ")} ${getShortMonthName(h.month)} (${weekday}) ${h.name.padEnd(18)} ${h.countdown}`;
      }).join("\n");
      response += "\n\n";
    } else {
      response += "\n";
    }

    if (personalDatesWithCountdown.length > 0) {
      response += `*📌 Your Dates:*\n`;
      response += personalDatesWithCountdown.map((d, i) => {
        const num = (i + 1).toString().padStart(2, " ");
        return `  ${num} ${d.emoji} ${d.name} (${d.monthDay})${d.ageInfo} - ${d.countdown}`;
      }).join("\n");
    }

    if (todayHolidays.length === 0 && todayPersonalDates.length === 0 && 
        monthHolidaysWithCountdown.length === 0 && personalDatesWithCountdown.length === 0) {
      response += "No events. Use /adddate to add a date!";
    }

    bot.sendMessage(chatId, response, { parse_mode: "Markdown" });
  });

  bot.onText(/➕ Add Date/, (msg) => {
    sendAddDateGuide(msg.chat.id);
  });

  bot.onText(/🗑️ Delete Date/, (msg) => {
    sendDeleteDateGuide(msg.chat.id);
  });

  bot.onText(/\/syncholidays/, async (msg) => {
    const chatId = msg.chat.id;
    const loadingMsg = await bot.sendMessage(chatId, "🔄 Syncing holidays...");
    
    try {
      const { 
        syncCurrentYear, 
        checkApiHealth 
      } = await import("../services/holiday.js");
      
      const { CALENDARIFIC_API_KEY } = await import("../config/env.js");
      
      let apiStatus = "";
      
      if (CALENDARIFIC_API_KEY) {
        const healthy = await checkApiHealth();
        apiStatus = healthy 
          ? "✅ Calendarific API: OK" 
          : "❌ Calendarific API: Failed";
      } else {
        apiStatus = "⚠️ No API key configured";
      }
      
      await syncCurrentYear();
      
      const now = new Date();
      const { getHolidayCount, getUpcomingHolidays } = await import("../services/holiday.js");
      
      const total = await getHolidayCount(now.getFullYear());
      const upcoming = await getUpcomingHolidays(now);
      
      bot.editMessageText(
        `✅ *Holidays Synced!*

${apiStatus}

📅 ${now.getFullYear()} | ${total} holidays | ${upcoming.length} remaining

Auto-sync on 1st of each month. On Jan 1st, also syncs next year.`,
        {
          chat_id: chatId,
          message_id: loadingMsg.message_id,
          parse_mode: "Markdown"
        }
      );
    } catch (error) {
      console.error("Sync error:", error);
      bot.editMessageText(`❌ Sync failed: ${error.message}`, {
        chat_id: chatId,
        message_id: loadingMsg.message_id
      });
    }
  });

  bot.onText(/\/myanmar/, async (msg) => {
    const chatId = msg.chat.id;
    
    try {
      const { checkApiHealth } = await import("../services/holiday.js");
      const { CALENDARIFIC_API_KEY } = await import("../config/env.js");
      
      let status = "";
      
      if (CALENDARIFIC_API_KEY) {
        const healthy = await checkApiHealth();
        status = healthy 
          ? "✅ Calendarific API working" 
          : "❌ Calendarific API failed";
      } else {
        status = "⚠️ No API key configured";
      }
      
      bot.sendMessage(
        chatId,
        `🇲🇲 *Myanmar Holidays*

${status}

Holiday data provided by Calendarific API.

Use \`/syncholidays\` to refresh holidays.`,
        { parse_mode: "Markdown" }
      );
    } catch (error) {
      console.error("Error:", error);
      bot.sendMessage(chatId, "Error checking API status.");
    }
  });
};
