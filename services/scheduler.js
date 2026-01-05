import Task from "../models/Task.js";
import User from "../models/User.js";
import Holiday from "../models/Holiday.js";
import bot from "../bot/bot.js";

const checkedTasks = new Set();
const checkedHolidays = new Set();

function getUserLocalTime(timezone) {
  try {
    return new Date(new Date().toLocaleString("en-US", { timeZone: timezone }));
  } catch (e) {
    return new Date();
  }
}

function isQuietHours(hour, minute) {
  if (hour < 0 || hour > 23) return false;
  if (hour === 0) {
    return minute >= 5;
  }
  if (hour >= 1 && hour <= 6) {
    return true;
  }
  if (hour === 6) {
    return minute < 30;
  }
  return false;
}

async function sendHolidayNotifications() {
  const now = new Date();
  const month = now.getMonth() + 1;
  const day = now.getDate();

  const todayHolidays = await Holiday.find({ month, day });
  if (todayHolidays.length === 0) return;

  const holidayKey = `${month}-${day}`;
  if (checkedHolidays.has(holidayKey)) return;

  const users = await User.find({});
  for (const user of users) {
    const localNow = getUserLocalTime(user.timezone || "Asia/Yangon");
    const localHour = localNow.getHours();
    const localMinute = localNow.getMinutes();

    if (localHour === 0 && localMinute === 0) {
      const holidayList = todayHolidays.map((h) => `🎉 ${h.name}`).join("\n");
      const message = `🌅 Good Morning!\n\n${holidayList}\n\nHave a wonderful day! 💫`;
      await bot.sendMessage(user.chatId, message);
      console.log(`Sent holiday notification to ${user.chatId}`);
    }
  }

  checkedHolidays.add(holidayKey);
  setTimeout(() => checkedHolidays.delete(holidayKey), 3600000);
}

export function startScheduler() {
  setInterval(async () => {
    const serverNow = new Date();

    await sendHolidayNotifications();

    try {
      const tasks = await Task.find({ active: true });
      
      for (const task of tasks) {
        const user = await User.findOne({ chatId: task.chatId });
        const timezone = user?.timezone || "Asia/Yangon";
        
        const localNow = getUserLocalTime(timezone);
        const localHour = localNow.getHours();
        const localMinute = localNow.getMinutes();
        const localDay = localNow.getDay();
        
        const taskKey = `${task._id}-${localNow.toISOString().slice(0, 11)}`;
        
        if (checkedTasks.has(taskKey)) continue;
        
        let shouldSend = true;
        
        if (isQuietHours(localHour, localMinute)) {
          shouldSend = false;
        } else if (task.type === "weekdays") {
          if (localDay === 0 || localDay === 6) shouldSend = false;
        } else if (task.type === "specific" && task.weekDay !== undefined) {
          if (localDay !== task.weekDay) shouldSend = false;
        } else if (task.type === "weekly" && task.weekDay !== undefined) {
          if (localDay !== task.weekDay) shouldSend = false;
        }
        
        if (!shouldSend) continue;
        
        if (task.hour !== localHour || task.minute !== localMinute) continue;
        
        checkedTasks.add(taskKey);
        setTimeout(() => checkedTasks.delete(taskKey), 60000);
        
        try {
          await bot.sendMessage(task.chatId, `⏰ Reminder: ${task.text}`);
          
          if (task.type === "once") {
            await Task.findByIdAndUpdate(task._id, { active: false });
          }
        } catch (error) {
          console.error("Error sending reminder:", error.message);
        }
      }
    } catch (error) {
      console.error("Scheduler error:", error.message);
    }
  }, 10000);
}
