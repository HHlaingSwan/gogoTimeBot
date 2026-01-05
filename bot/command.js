import bot from "./bot.js";
import Task from "../models/Task.js";
import {
  parseTime,
  extractTimeFromMessage,
  extractTaskFromMessage,
  extractWeekday,
  extractTaskFromMessageWithDay,
  WEEKDAY_NAMES,
  getDayName,
  formatNextReminder
} from "../utils/timeParser.js";

function createReminderCommand(type) {
  return async (msg, match) => {
    const chatId = msg.chat.id;
    const input = match[1];

    if (!input) {
      bot.sendMessage(
        chatId,
        `Usage: /${type} <time> <task>\nExample: /${type} 9am Finish project`
      );
      return;
    }

    const timeStr = extractTimeFromMessage(input);

    if (!timeStr) {
      bot.sendMessage(chatId, `Please specify a time (e.g., 9am, 9:00, 14:30)`);
      return;
    }

    const parsed = parseTime(timeStr);

    if (!parsed) {
      bot.sendMessage(chatId, `Invalid time format. Use: 9am, 9:00am, 14:30`);
      return;
    }

    const weekdayInfo = extractWeekday(input);
    const taskText = extractTaskFromMessageWithDay(input, timeStr, weekdayInfo?.name);

    if (!taskText) {
      bot.sendMessage(chatId, `Please specify a task`);
      return;
    }

    const taskData = {
      chatId,
      text: taskText,
      time: timeStr,
      hour: parsed.hour,
      minute: parsed.minute,
      type
    };

    if (type === "specific" && weekdayInfo) {
      taskData.type = "specific";
      taskData.weekDay = weekdayInfo.day;
    }

    if (type === "weekly") {
      if (weekdayInfo) {
        taskData.weekDay = weekdayInfo.day;
      } else {
        taskData.weekDay = new Date().getDay();
      }
    }

    const task = new Task(taskData);
    await task.save();

    let typeLabel = type.charAt(0).toUpperCase() + type.slice(1);
    if (type === "specific" && weekdayInfo) {
      typeLabel = `${getDayName(weekdayInfo.day)} reminder`;
    } else if (type === "once") {
      typeLabel = "One-time";
    } else if (type === "weekly") {
      const weekDay = weekdayInfo ? weekdayInfo.day : new Date().getDay();
      typeLabel = `${getDayName(weekDay)} reminder`;
    }

    let dayStr = "";
    if (type === "specific" && weekdayInfo) {
      dayStr = `\n📆 Day: ${getDayName(weekdayInfo.day)}`;
    } else if (type === "weekdays") {
      dayStr = `\n📆 Days: Mon-Fri`;
    } else if (type === "weekly") {
      const weekDay = weekdayInfo ? weekdayInfo.day : new Date().getDay();
      dayStr = `\n📆 Day: ${getDayName(weekDay)}`;
    }

    bot.sendMessage(
      chatId,
      `✅ ${typeLabel} reminder set:\n\n📅 Time: ${timeStr}${dayStr}\n📝 Task: ${taskText}`
    );
  };
}

export const registerCommands = () => {
  bot.onText(/\/start/, (msg) => {
    bot.sendMessage(
      msg.chat.id,
      `Welcome ⏰
I can help you schedule reminders.

📌 One-time:
/remind 9am Finish project

📅 Daily & Weekly:
/daily 7am Morning exercise
/weekly fri 9pm Weekly review

🏢 Weekdays only:
/weekdays 9am Team standup

📆 Specific day:
/every friday 3pm Team meeting

📋 Management:
/today - Today's reminders
/tasks - All reminders
/next - Time until next reminder
/del <number> - Delete a reminder
/help`
    );
  });

  bot.onText(/\/help/, (msg) => {
    bot.sendMessage(
      msg.chat.id,
      `📌 One-time:
/remind 9am Finish project

📅 Daily & Weekly:
/daily 7am Morning exercise
/weekly fri 9pm Weekly review

🏢 Weekdays only (Mon-Fri):
/weekdays 9am Team standup

📆 Specific day:
/every friday 3pm Team meeting
/every mon 9am Weekly planning

📋 Management:
/today - Today's reminders
/tasks - All active reminders
/next - Time until next reminder
/del <number> - Delete by number (e.g., /del 1)`
    );
  });

  bot.onText(/\/remind (.+)/, createReminderCommand("once"));
  bot.onText(/\/daily (.+)/, createReminderCommand("daily"));
  bot.onText(/\/weekly (.+)/, createReminderCommand("weekly"));
  bot.onText(/\/weekdays (.+)/, createReminderCommand("weekdays"));
  bot.onText(/\/every (.+)/, createReminderCommand("specific"));

  bot.onText(/\/today/, async (msg) => {
    const chatId = msg.chat.id;
    const now = new Date();
    const currentDay = now.getDay();
    const currentHour = now.getHours();
    const currentMinute = now.getMinutes();

    const activeTasks = await Task.find({ chatId, active: true });

    const todayTasks = activeTasks.filter(t => {
      if (t.type === "daily") return true;
      if (t.type === "weekdays") return currentDay !== 0 && currentDay !== 6;
      if (t.type === "specific" && t.weekDay !== undefined) return t.weekDay === currentDay;
      if (t.type === "once" || t.type === "weekly") return true;
      return false;
    });

    const upcomingToday = todayTasks
      .filter(t => {
        if (t.hour > currentHour) return true;
        if (t.hour === currentHour && t.minute >= currentMinute) return true;
        return false;
      })
      .sort((a, b) => a.hour - b.hour || a.minute - b.minute);

    const passedToday = todayTasks
      .filter(t => {
        if (t.hour < currentHour) return true;
        if (t.hour === currentHour && t.minute < currentMinute) return true;
        return false;
      })
      .sort((a, b) => b.hour - a.hour || b.minute - a.minute);

    let response = `📅 Today's Reminders (${now.toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric" })})\n\n`;

    if (upcomingToday.length > 0) {
      response += `⏰ Upcoming:\n`;
      response += upcomingToday.map(t => {
        const time = `${t.hour.toString().padStart(2, "0")}:${t.minute.toString().padStart(2, "0")}`;
        return `  ${time} - ${t.text}`;
      }).join("\n");
      response += "\n\n";
    }

    if (passedToday.length > 0) {
      response += `✅ Passed today:\n`;
      response += passedToday.map(t => {
        const time = `${t.hour.toString().padStart(2, "0")}:${t.minute.toString().padStart(2, "0")}`;
        return `  ${time} - ${t.text}`;
      }).join("\n");
    }

    if (upcomingToday.length === 0 && passedToday.length === 0) {
      response += "No reminders for today.";
    }

    bot.sendMessage(chatId, response);
  });

  bot.onText(/\/next/, async (msg) => {
    const chatId = msg.chat.id;
    const now = new Date();
    const currentDay = now.getDay();
    const currentHour = now.getHours();
    const currentMinute = now.getMinutes();

    const activeTasks = await Task.find({ chatId, active: true });

    let nextTask = null;
    let minDiff = Infinity;

    for (const task of activeTasks) {
      if (task.type === "weekdays" && (currentDay === 0 || currentDay === 6)) continue;

      const { timeUntil } = formatNextReminder(task, now);

      const diffParts = timeUntil.split(/[dh]/);
      const hours = parseInt(diffParts[0]) || 0;
      const mins = parseInt(diffParts[1]) || 0;
      const totalMins = hours * 60 + mins;

      if (totalMins < minDiff) {
        minDiff = totalMins;
        nextTask = task;
      }
    }

    if (nextTask) {
      const { timeUntil, nextTime } = formatNextReminder(nextTask, now);
      let dayInfo = "";
      if (nextTask.type === "specific" || nextTask.type === "weekly") {
        dayInfo = ` on ${getDayName(nextTask.weekDay)}`;
      }
      bot.sendMessage(
        chatId,
        `⏭️ Next reminder in ${timeUntil}\n\n📝 ${nextTask.text}\n🕐 ${nextTime}${dayInfo}`
      );
    } else {
      bot.sendMessage(chatId, "No upcoming reminders.");
    }
  });

  bot.onText(/\/tasks/, async (msg) => {
    const chatId = msg.chat.id;

    const activeTasks = await Task.find({ chatId, active: true })
      .sort({ createdAt: -1 });

    let response = "📋 Your Reminders\n\n";

    if (activeTasks.length > 0) {
      response += `🟢 Active:\n`;
      response += activeTasks.map((t, i) => {
        const time = `${t.hour.toString().padStart(2, "0")}:${t.minute.toString().padStart(2, "0")}`;
        let typeLabel = t.type;
        if (t.type === "specific") typeLabel = getDayName(t.weekDay).slice(0, 3);
        if (t.type === "weekdays") typeLabel = "Mon-Fri";
        if (t.type === "once") typeLabel = "Once";
        if (t.type === "weekly") typeLabel = getDayName(t.weekDay).slice(0, 3);
        return `${i + 1}. ${time} [${typeLabel}] - ${t.text}`;
      }).join("\n");
      response += `\n\n💡 To delete: /del <number>\n`;
    } else {
      response += "🟢 Active: None\n\n";
      response += "No reminders set. Use /remind, /daily, or /weekly to add one.";
    }

    bot.sendMessage(chatId, response);
  });

  bot.onText(/\/del (.+)/, async (msg, match) => {
    const chatId = msg.chat.id;
    const number = parseInt(match[1].trim());

    if (isNaN(number) || number < 1) {
      bot.sendMessage(chatId, "Please use: /del <number>\nExample: /del 1");
      return;
    }

    const activeTasks = await Task.find({ chatId, active: true })
      .sort({ createdAt: -1 });

    if (number > activeTasks.length) {
      bot.sendMessage(chatId, `Invalid number. You have ${activeTasks.length} active reminders.`);
      return;
    }

    const taskToDelete = activeTasks[number - 1];
    await Task.findByIdAndUpdate(taskToDelete._id, { active: false });
    bot.sendMessage(chatId, `✅ Deleted: ${taskToDelete.text}`);
  });

  bot.onText(/\/note (.+)/, async (msg, match) => {
    const chatId = msg.chat.id;
    const note = match[1];
    bot.sendMessage(chatId, `📝 Note saved:\n${note}`);
  });
};
