import PersonalDate from "../models/PersonalDate.js";
import {
  getDaysUntil,
  formatCountdown,
  formatDate,
  isValidDate
} from "../utils/countdown.js";

export async function addPersonalDate(chatId, name, month, day, type = "custom", emoji = "📅") {
  if (!isValidDate(month, day)) {
    throw new Error("Invalid date");
  }

  const existing = await PersonalDate.findOne({ chatId, name: { $regex: new RegExp(`^${name}$`, "i") } });
  if (existing) {
    throw new Error("Date with this name already exists");
  }

  const personalDate = await PersonalDate.create({
    chatId,
    name,
    month,
    day,
    type,
    emoji
  });

  return personalDate;
}

export async function getPersonalDates(chatId) {
  return await PersonalDate.find({ chatId }).sort({ month: 1, day: 1 });
}

export async function deletePersonalDate(chatId, index) {
  const dates = await PersonalDate.find({ chatId }).sort({ month: 1, day: 1 });

  if (index < 1 || index > dates.length) {
    throw new Error("Invalid index");
  }

  const toDelete = dates[index - 1];
  await PersonalDate.findByIdAndDelete(toDelete._id);

  return toDelete;
}

export async function getPersonalDatesWithCountdown(chatId, referenceDate = new Date()) {
  const dates = await PersonalDate.find({ chatId });

  return dates.map((d) => {
    const daysUntil = getDaysUntil(d.month, d.day, referenceDate);
    return {
      ...d.toObject(),
      daysUntil,
      countdown: formatCountdown(daysUntil),
      dateStr: formatDate(d.month, d.day)
    };
  }).sort((a, b) => a.daysUntil - b.daysUntil);
}

export async function getDateByMonthDay(chatId, month, day) {
  return await PersonalDate.findOne({ chatId, month, day });
}

export async function deleteAllPersonalDates(chatId) {
  return await PersonalDate.deleteMany({ chatId });
}

export async function countPersonalDates(chatId) {
  return await PersonalDate.countDocuments({ chatId });
}
