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
