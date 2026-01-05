import Task from "../models/Task.js";
import bot from "../bot/bot.js";

const checkedTasks = new Set();

export function startScheduler() {
  setInterval(async () => {
    const now = new Date();
    const currentHour = now.getHours();
    const currentMinute = now.getMinutes();
    
    try {
      const tasks = await Task.find({ active: true, hour: currentHour, minute: currentMinute });
      
      for (const task of tasks) {
        const taskKey = `${task._id}-${now.toISOString().slice(0, 11)}`;
        
        if (checkedTasks.has(taskKey)) continue;
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
