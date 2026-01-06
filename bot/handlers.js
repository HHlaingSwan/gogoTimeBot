import bot from "./bot.js";
import Holiday from "../models/Holiday.js";
import PersonalDate from "../models/PersonalDate.js";
import Setting from "../models/Setting.js";
import {
  getDaysUntil,
  formatCountdown,
  getMonthName,
  getShortMonthName,
  getWeekdayName,
  isValidDate,
  getMoonPhase,
  formatAge,
  formatYearsTogether,
  parseDateInput,
} from "../utils/countdown.js";
import {
  getUpcomingHolidays,
  getHolidaysByMonth,
  getHolidaysForDate,
  getHolidayCount,
  syncCurrentYear,
  checkApiHealth,
} from "../services/holiday.js";

const WEEKDAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export function sendReplyKeyboard(chatId) {
  const keyboard = [
    [{ text: "📅 Today" }, { text: "🎉 Holidays" }],
    [{ text: "🔄 Sync Holidays" }, { text: "❓ Help" }],
    [{ text: "➕ Add Date" }, { text: "🗑️ Delete Date" }],
  ];
  bot.sendMessage(chatId, "Choose an option:", {
    reply_markup: { keyboard, resize_keyboard: true },
  });
}

export function sendHelpGuide(chatId) {
  bot.sendMessage(
    chatId,
    `📖 *Help*

*Main:*
• \\\`/today\\\
- Today, holidays, your dates with age
• \\\`/holidays\\\
- All holidays this year
• \\\`/syncholidays\\\
- Fetch latest holidays from API

*Dates:*
• \\\`/adddate 12-25 Name\\\
- Add date
• \\\`/adddate 12-25 1990 Name\\\
- Add with birth year for age
• \\\`/deletedate 1\\\
- Delete by number

*Note:* Numbers in /today are for /deletedate`,
    { parse_mode: "Markdown" }
  );
}

export function sendAddDateGuide(chatId) {
  bot.sendMessage(
    chatId,
    `➕ *Add Personal Date*

*Simple:*
\
/adddate 12-25 Christmas\

*With birth year (for age):*
\
/adddate 12-25 1990 My Birthday\

*With anniversary year:*
\
/adddate 08-20 2020 Anniversary`,
    { parse_mode: "Markdown" }
  );
}



function formatHolidayCard(holiday, referenceDate) {
    const weekday = getWeekdayName(holiday.month, holiday.day);
    const daysUntil = getDaysUntil(holiday.month, holiday.day, referenceDate);
    const countdown = formatCountdown(daysUntil);
    const dateStr = `${String(holiday.day).padStart(2, '0')}/${String(holiday.month).padStart(2, '0')} (${weekday})`;
  
    return `*${holiday.name}*\n  📅 ${dateStr}   ⏳ ${countdown}`;
}

export async function handleHolidays(chatId) {
    const now = new Date();
    const currentYear = now.getFullYear();

    const holidays = await getUpcomingHolidays(now);
    const totalHolidays = await getHolidayCount(currentYear);

    let response = `🎉 *Myanmar Holidays* (${currentYear}) | ${totalHolidays} remaining\n\n`;

    if (holidays.length > 0) {
        const holidaysByMonth = holidays.reduce((acc, holiday) => {
            const monthName = getMonthName(holiday.month);
            if (!acc[monthName]) {
                acc[monthName] = [];
            }
            acc[monthName].push(holiday);
            return acc;
        }, {});

        for (const monthName in holidaysByMonth) {
            response += `*${monthName}*\n`;
            response += holidaysByMonth[monthName]
                .map((h) => `  • ${formatHolidayCard(h, now)}`)
                .join('\n\n');
            response += '\n\n';
        }
    } else {
        response += "No more holidays this year.";
    }

    bot.sendMessage(chatId, response, { parse_mode: "Markdown" });
}

export async function handleToday(chatId) {
  const now = new Date();
  const currentMonth = now.getMonth() + 1;
  const currentDay = now.getDate();
  const currentYear = now.getFullYear();
  const weekday = WEEKDAY_NAMES[now.getDay()];

  const todayHolidays = await getHolidaysForDate(
    currentMonth,
    currentDay,
    currentYear
  );
  const todayPersonalDates = await PersonalDate.find({
    chatId,
    month: currentMonth,
    day: currentDay,
  });
  const monthHolidays = await getHolidaysByMonth(currentMonth, currentYear);
  const allPersonalDates = await PersonalDate.find({ chatId }).sort({
    month: 1,
    day: 1,
  });

  const moonPhase = getMoonPhase(now);

  let response = `📅 *Today* - ${weekday}, ${getMonthName(
    currentMonth
  )} ${currentDay}, ${currentYear}\n\n`;

  response += `*🌙 Moon:* ${moonPhase.emoji} ${moonPhase.name}\n\n`;

  if (todayHolidays.length > 0 || todayPersonalDates.length > 0) {
    response += `*🎉 Today's Events*\n`;
    todayHolidays.forEach((h) => {
      response += `  • 🇲🇲 ${h.name}\n`;
    });
    todayPersonalDates.forEach((d) => {
      let ageStr = "";
      if (d.type === "birthday" && d.birthYear) {
        ageStr = ` (🎂 Age ${currentYear - d.birthYear})`;
      } else if (d.birthYear && d.type === "anniversary") {
        ageStr = ` (💕 ${formatYearsTogether(d.birthYear, currentYear)})`;
      }
      response += `  • ${d.emoji} ${d.name}${ageStr}\n`;
    });
    response += "\n";
  }

  const upcomingMonthHolidays = monthHolidays.filter(h => h.day >= currentDay);

  if (upcomingMonthHolidays.length > 0) {
    response += `*📆 This Month's Holidays*\n`;
    response += upcomingMonthHolidays
      .map((h) => `  • ${formatHolidayCard(h, now)}`)
      .join('\n\n');
    response += '\n\n';
  }

  if (allPersonalDates.length > 0) {
    response += `*📌 Your Dates*\n`;
    response += allPersonalDates
      .map((d, i) => {
        const daysUntil = getDaysUntil(d.month, d.day, now);
        const countdown = formatCountdown(daysUntil);
        let ageInfo = "";
        if (d.type === "birthday" && d.birthYear) {
          ageInfo = ` (Age ${currentYear - d.birthYear})`;
        } else if (d.birthYear) {
          ageInfo = ` (${formatYearsTogether(d.birthYear, currentYear)})`;
        }
        return `  ${i + 1}. *${d.name}*${ageInfo}\n     📅 ${d.month}/${d.day}   ⏳ ${countdown}`;
      })
      .join('\n\n');
  }

  if (
    todayHolidays.length === 0 &&
    todayPersonalDates.length === 0 &&
    upcomingMonthHolidays.length === 0 &&
    allPersonalDates.length === 0
  ) {
    response += "No events. Use /adddate to add a date!";
  }

  bot.sendMessage(chatId, response, { parse_mode: "Markdown" });
}

export async function handleAddDate(chatId, match) {
    const input = match[1].trim();
    
    let dateStr, name, parsedDate;

    // Regex to find a date pattern at the beginning of the string
    const dateRegex = /^((\d{1,2}[-\/]\d{1,2}(\s+\d{4})?)|(\d{4}[-\/]\d{1,2}[-\/]\d{1,2}))(\s+)/;
    const dateMatch = input.match(dateRegex);

    if (dateMatch) {
        dateStr = dateMatch[1].trim();
        name = input.substring(dateMatch[0].length).trim();
        parsedDate = parseDateInput(dateStr);
    } else {
        // Fallback for cases where regex might fail, e.g., no space after date
        const parts = input.split(' ');
        dateStr = parts[0];
        name = parts.slice(1).join(' ');
        parsedDate = parseDateInput(dateStr);
    }

    if (!parsedDate || !parsedDate.month || !parsedDate.day) {
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

    const { month, day, year: birthYear } = parsedDate;

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
        name: { $regex: new RegExp(`^${name}$`, "i") },
      });

      if (existing) {
        bot.sendMessage(chatId, `❌ "${name}" already exists.`);
        return;
      }

      const emojis = name.match(/\p{Emoji_Presentation}/gu) || [];
      const emoji = emojis.length > 0 ? emojis.join("") : "📅";
      const cleanName = name.replace(/\p{Emoji_Presentation}/gu, "").trim();

      let type = "custom";
      if (
        name.toLowerCase().includes("birthday") ||
        name.toLowerCase().includes("birth")
      ) {
        type = "birthday";
      } else if (
        name.toLowerCase().includes("anniversary") ||
        name.toLowerCase().includes("anniversary")
      ) {
        type = "anniversary";
      }

      await PersonalDate.create({
        chatId,
        name: cleanName,
        month,
        day,
        birthYear,
        type,
        emoji,
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
}



export async function handleSyncHolidays(chatId, messageId) {
    const lastSyncSetting = await Setting.findOne({ key: "lastSyncTimestamp" });
    const thirtyDays = 30 * 24 * 60 * 60 * 1000;

    if (lastSyncSetting && (new Date() - new Date(lastSyncSetting.value)) < thirtyDays) {
        const remainingTime = thirtyDays - (new Date() - new Date(lastSyncSetting.value));
        const remainingDays = Math.ceil(remainingTime / (1000 * 60 * 60 * 24));
        bot.sendMessage(chatId, `You can sync holidays again in ${remainingDays} days.`);
        return;
    }

    const loadingMsg = messageId 
      ? { chat: { id: chatId }, message_id: messageId }
      : await bot.sendMessage(chatId, "🔄 Syncing holidays...");
  
    try {
      const { CALENDARIFIC_API_KEY } = await import("../config/env.js");
  
      let apiStatus = "";
      let apiHealth = null;
  
      if (CALENDARIFIC_API_KEY) {
        apiHealth = await checkApiHealth();
        if (apiHealth.healthy) {
          apiStatus = "✅ Calendarific API OK";
        } else {
          apiStatus = `❌ ${apiHealth.message}`;
        }
      } else {
        apiStatus = "⚠️ No API key";
      }
  
      const syncResult = await syncCurrentYear();
  
      if (syncResult.success) {
        await Setting.findOneAndUpdate(
            { key: "lastSyncTimestamp" },
            { value: new Date() },
            { upsert: true }
        );
      }

      const now = new Date();
      const total = await getHolidayCount(now.getFullYear());
      const upcoming = await getUpcomingHolidays(now);
  
      const inlineKeyboard = [
        [{ text: "🎉 View Holidays", callback_data: "view_holidays" }],
        [{ text: "🔄 Refresh", callback_data: "sync_holidays" }],
      ];
  
      if (syncResult.success) {
        const addedCount = syncResult.holidays.length;
        const emoji = addedCount > 0 ? "✅" : "ℹ️";
        const title = addedCount > 0 ? "Holidays Synced!" : "Already Up to Date";
        const addedText = addedCount > 0 ? `➕ ${addedCount} new` : "";
  
        bot.editMessageText(
          `${emoji} *${title}*

${apiStatus} | ${total} holidays | ${upcoming.length} upcoming
${addedText}`,
          {
            chat_id: chatId,
            message_id: loadingMsg.message_id,
            parse_mode: "Markdown",
            reply_markup: { inline_keyboard: inlineKeyboard },
          }
        );
      } else {
        const errorKeyboard = [
          [{ text: "🔄 Try Again", callback_data: "sync_holidays" }],
        ];
        if (!CALENDARIFIC_API_KEY) {
          errorKeyboard.unshift([{ text: "📖 Setup Guide", callback_data: "api_guide" }]);
        }
  
        bot.editMessageText(
          `❌ *Sync Failed*

${syncResult.error || apiStatus}`,
          {
            chat_id: chatId,
            message_id: loadingMsg.message_id,
            parse_mode: "Markdown",
            reply_markup: { inline_keyboard: errorKeyboard },
          }
        );
      }
    } catch (error) {
      console.error("Sync error:", error);
      bot.editMessageText(
        `❌ *Sync Failed*

An unexpected error occurred. Please try again.`,
        {
          chat_id: chatId,
          message_id: loadingMsg.message_id,
          parse_mode: "Markdown",
          reply_markup: {
            inline_keyboard: [[{ text: "🔄 Try Again", callback_data: "sync_holidays" }]],
          },
        }
      );
    }
}