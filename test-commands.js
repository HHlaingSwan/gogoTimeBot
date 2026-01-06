import Holiday from "./models/Holiday.js";
import PersonalDate from "./models/PersonalDate.js";
import {
  getDaysUntil,
  formatCountdown,
  getMonthName,
  getShortMonthName,
  getWeekdayName,
  getMoonPhase,
  formatYearsTogether
} from "./utils/countdown.js";
import {
  getUpcomingHolidays,
  getHolidaysByMonth,
  getHolidaysForDate,
  getHolidayCount
} from "./services/holiday.js";

const WEEKDAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function getMockTodayResponse() {
  const now = new Date();
  const currentMonth = now.getMonth() + 1;
  const currentDay = now.getDate();
  const currentYear = now.getFullYear();
  const weekday = WEEKDAY_NAMES[now.getDay()];
  const moonPhase = getMoonPhase(now);

  return `📅 *Today* - ${weekday}, ${getMonthName(currentMonth)} ${currentDay}, ${currentYear}

🌙 Moon: ${moonPhase.emoji} ${moonPhase.name}

No events. Use /adddate to add a date!`;
}

function getMockHolidaysResponse() {
  const now = new Date();
  const currentYear = now.getFullYear();

  return `🎉 *Myanmar Holidays*

📅 ${currentYear} | 0 remaining

No more holidays this year.`;
}

function getMockHelpResponse() {
  return `📖 *Help*

*Main:*
• \`/today\` - Today, holidays, your dates with age
• \`/holidays\` - All holidays this year
• \`/syncholidays\` - Fetch latest holidays from API

*Dates:*
• \`/adddate 12-25 Name\` - Add date
• \`/adddate 12-25 1990 Name\` - Add with birth year for age
• \`/deletedate 1\` - Delete by number

*Note:* Numbers in /today are for /deletedate`;
}

function getMockAddDateGuide() {
  return `➕ *Add Personal Date*

*Simple:*
\`/adddate 12-25 Christmas\`

*With birth year (for age):*
\`/adddate 12-25 1990 My Birthday\`

*With anniversary year:*
\`/adddate 08-20 2020 Anniversary\``;
}

function getMockSyncResponse() {
  return `✅ *Synced!*

✅ API OK | 15 holidays | 12 upcoming
➕ 3 new

[🎉 View Holidays] [🔄 Refresh]`;
}

function getMockSyncNoNewResponse() {
  return `ℹ️ *Up to Date*

✅ API OK | 15 holidays | 12 upcoming

[🎉 View Holidays] [🔄 Refresh]`;
}

function getMockSyncFailedResponse() {
  return `❌ *Failed*

⚠️ No API key

[📖 Setup Guide] [🔄 Try Again]`;
}

function getMockSyncErrorResponse() {
  return `❌ *Failed*

Request timed out. Please try again.

[🔄 Try Again]`;
}

function getMockStartResponse() {
  return `👋 *Welcome!*

Track holidays, birthdays & events with countdowns and age.

*Commands:*
• \`/today\` - Everything including age
• \`/holidays\` - All holidays this year
• \`/adddate 12-25 1990 Name\` - Add with age
• \`/deletedate 1\` - Delete date

Type \`/help\` for more.`;
}

console.log("=== /start ===");
console.log(getMockStartResponse());

console.log("\n=== /help ===");
console.log(getMockHelpResponse());

console.log("\n=== /today ===");
console.log(getMockTodayResponse());

console.log("\n=== /holidays ===");
console.log(getMockHolidaysResponse());

console.log("\n=== /adddate ===");
console.log(getMockAddDateGuide());

console.log("\n=== /syncholidays ===");
console.log(getMockSyncResponse());

console.log("\n=== 🎉 Holidays button ===");
console.log(getMockHolidaysResponse());

console.log("\n=== 📅 Today button ===");
console.log(getMockTodayResponse());

console.log("\n=== 🔄 Sync Holidays button ===");
console.log(getMockSyncResponse());

console.log("\n=== /syncholidays (success with new) ===");
console.log(getMockSyncResponse());

console.log("\n=== /syncholidays (no new holidays) ===");
console.log(getMockSyncNoNewResponse());

console.log("\n=== /syncholidays (no API key) ===");
console.log(getMockSyncFailedResponse());

console.log("\n=== /syncholidays (error) ===");
console.log(getMockSyncErrorResponse());

console.log("\n=== ❓ Help button ===");
console.log(getMockHelpResponse());

console.log("\n=== ➕ Add Date button ===");
console.log(getMockAddDateGuide());

console.log("\n=== 🗑️ Delete Date button ===");
console.log("🗑️ *Delete Date*\n\nUse the number from \\`/today\\` command.\n\nExample: \\`/deletedate 1\\`");

console.log("\n=== Reply Keyboard ===");
console.log("Choose an option:");
console.log("📅 Today  |  🎉 Holidays");
console.log("🔄 Sync Holidays  |  ❓ Help");
console.log("➕ Add Date  |  🗑️ Delete Date");

