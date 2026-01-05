export const WEEKDAYS = {
  "sunday": 0, "sun": 0,
  "monday": 1, "mon": 1,
  "tuesday": 2, "tue": 2, "tues": 2,
  "wednesday": 3, "wed": 3,
  "thursday": 4, "thu": 4, "thur": 4, "thurs": 4,
  "friday": 5, "fri": 5,
  "saturday": 6, "sat": 6
};

export const WEEKDAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

export function getDayName(dayNumber) {
  return WEEKDAY_NAMES[dayNumber] || "";
}

export function parseTime(timeStr) {
  const normalized = timeStr.toLowerCase().trim();
  const match = normalized.match(/^(\d{1,2})(?::(\d{2}))?\s*(am|pm)?$/);
  
  if (!match) return null;
  
  let hour = parseInt(match[1]);
  const minute = match[2] ? parseInt(match[2]) : 0;
  const period = match[3];
  
  if (hour < 1 || hour > 12 || minute < 0 || minute > 59) return null;
  
  if (period === "pm" && hour !== 12) hour += 12;
  if (period === "am" && hour === 12) hour = 0;
  
  if (hour < 0 || hour > 23) return null;
  
  return { hour, minute };
}

export function extractTimeFromMessage(message) {
  const patterns = [
    /(\d{1,2}:\d{2}\s*(?:am|pm)?)/i,
    /(\d{1,2}\s*(?:am|pm))/i
  ];
  
  for (const pattern of patterns) {
    const match = message.match(pattern);
    if (match) return match[1];
  }
  return null;
}

export function extractTaskFromMessage(message, timeStr) {
  if (!timeStr) return null;
  const timeRegex = new RegExp(timeStr.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
  return message.replace(timeRegex, "").replace(/^[:\s]+|[:\s]+$/g, "").trim();
}

export function extractWeekday(message) {
  const lower = message.toLowerCase();
  
  for (const [name, day] of Object.entries(WEEKDAYS)) {
    const regex = new RegExp(`\\b${name}\\b`);
    if (regex.test(lower)) {
      return { day, name };
    }
  }
  return null;
}

export function extractTaskFromMessageWithDay(message, timeStr, dayStr) {
  let cleaned = message;
  if (timeStr) {
    const timeRegex = new RegExp(timeStr.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
    cleaned = cleaned.replace(timeRegex, "");
  }
  if (dayStr) {
    const dayRegex = new RegExp(`\\b${dayStr}\\b`, 'i');
    cleaned = cleaned.replace(dayRegex, "");
  }
  return cleaned.replace(/^[:\s]+|[:\s]+$/g, "").trim();
}

export function formatNextReminder(task, now) {
  const taskTime = new Date(now);
  taskTime.setHours(task.hour, task.minute, 0, 0);
  
  if (taskTime <= now) {
    taskTime.setDate(taskTime.getDate() + 1);
  }
  
  if (task.type === "specific" && task.weekDay !== undefined) {
    while (taskTime.getDay() !== task.weekDay) {
      taskTime.setDate(taskTime.getDate() + 1);
    }
  }
  
  const diffMs = taskTime - now;
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);
  
  let timeStr = "";
  if (diffDays > 0) timeStr += `${diffDays}d `;
  if (diffHours > 0) timeStr += `${diffHours}h `;
  if (diffMins > 0) timeStr += `${diffMins}m`;
  
  const formattedTime = taskTime.toLocaleTimeString("en-US", { 
    hour: "numeric", minute: "2-digit", hour12: true 
  });
  
  return { timeUntil: timeStr.trim() || "0m", nextTime: formattedTime, nextDate: taskTime };
}
