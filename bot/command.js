import bot from "./bot.js";
import Task from "../models/Task.js";
import { parseTime, extractTimeFromMessage, extractTaskFromMessage } from "../utils/timeParser.js";

function createReminderCommand(type) {
  return async (msg, match) => {
    const chatId = msg.chat.id;
    const input = match[1];
    
    if (!input) {
      bot.sendMessage(chatId, `Usage: /${type} <time> <task>\nExample: /${type} 9am Finish project`);
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
    
    const taskText = extractTaskFromMessage(input, timeStr);
    
    if (!taskText) {
      bot.sendMessage(chatId, `Please specify a task`);
      return;
    }
    
    const task = new Task({
      chatId,
      text: taskText,
      time: timeStr,
      hour: parsed.hour,
      minute: parsed.minute,
      type
    });
    
    await task.save();
    
    const typeLabel = type === "once" ? "One-time" : type.charAt(0).toUpperCase() + type.slice(1);
    bot.sendMessage(chatId, `✅ ${typeLabel} reminder set:\n📅 Time: ${timeStr}\n📝 Task: ${taskText}`);
  };
}

export const registerCommands = () => {
  bot.onText(/\/start/, (msg) => {
    bot.sendMessage(
      msg.chat.id,
      `Welcome ⏰
I can help you schedule reminders.

Commands:
• /remind <time> <task> - One-time reminder
• /daily <time> <task> - Daily reminder
• /weekly <time> <task> - Weekly reminder
• /tasks - List your active reminders
• /delete <id> - Delete a reminder
• /help`
    );
  });

  bot.onText(/\/help/, (msg) => {
    bot.sendMessage(
      msg.chat.id,
      `Commands:
/remind <time> <task> - Set one-time reminder
  Example: /remind 9am Finish project

/daily <time> <task> - Set daily reminder
  Example: /daily 7am Morning exercise

/weekly <time> <task> - Set weekly reminder
  Example: /weekly 9pm Weekly review

/tasks - View all your reminders
/delete <id> - Delete a reminder by ID`
    );
  });

  bot.onText(/\/remind (.+)/, createReminderCommand("once"));
  bot.onText(/\/daily (.+)/, createReminderCommand("daily"));
  bot.onText(/\/weekly (.+)/, createReminderCommand("weekly"));

  bot.onText(/\/tasks/, async (msg) => {
    const chatId = msg.chat.id;
    const tasks = await Task.find({ chatId, active: true }).sort({ hour: 1, minute: 1 });
    
    if (tasks.length === 0) {
      bot.sendMessage(chatId, "No active reminders. Use /remind, /daily, or /weekly to add one.");
      return;
    }
    
    const list = tasks.map((t, i) => {
      const time = `${t.hour.toString().padStart(2, '0')}:${t.minute.toString().padStart(2, '0')}`;
      return `${i + 1}. [${t.type}] ${time} - ${t.text}`;
    }).join("\n");
    
    bot.sendMessage(chatId, `Your reminders:\n\n${list}`);
  });

  bot.onText(/\/delete (.+)/, async (msg, match) => {
    const chatId = msg.chat.id;
    const id = match[1].trim();
    
    const task = await Task.findOne({ _id: id, chatId });
    
    if (!task) {
      bot.sendMessage(chatId, "Reminder not found. Use /tasks to see your reminders.");
      return;
    }
    
    await Task.findByIdAndUpdate(id, { active: false });
    bot.sendMessage(chatId, `✅ Deleted: ${task.text}`);
  });

  bot.onText(/\/note (.+)/, async (msg, match) => {
    const chatId = msg.chat.id;
    const note = match[1];
    bot.sendMessage(chatId, `📝 Note saved:\n${note}`);
  });
};
