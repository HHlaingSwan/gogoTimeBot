import axios from "axios";
import Holiday from "../models/Holiday.js";
import { CALENDARIFIC_API_KEY } from "../config/env.js";

const CALENDARIFIC_BASE_URL = "https://calendarific.com/api/v2";
// https://calendarific.com/api/v2/holidays
// ?api_key=YOUR_API_KEY
// &country=MM
// &year=2026

export async function fetchMyanmarHolidays(year) {
  if (!CALENDARIFIC_API_KEY) {
    console.log("Calendarific API key not configured");
    return [];
  }

  try {
    const response = await axios.get(`${CALENDARIFIC_BASE_URL}/holidays`, {
      params: {
        api_key: CALENDARIFIC_API_KEY,
        country: "MM",
        year: year,
      },
    });

    const holidays = response.data.response.holidays || [];

    const savedHolidays = [];
    for (const h of holidays) {
      const dateParts = h.date.iso.split("-");
      const holidayData = {
        name: h.name,
        description: h.description || "",
        date: h.date.iso,
        month: parseInt(dateParts[1]),
        day: parseInt(dateParts[2]),
        year: parseInt(dateParts[0]),
        type: h.type[0] || "national",
        country: "MM",
        canonicalUri: h.url || "",
      };

      const existing = await Holiday.findOne({
        name: h.name,
        year: parseInt(dateParts[0]),
        month: parseInt(dateParts[1]),
        day: parseInt(dateParts[2]),
      });

      if (!existing) {
        const saved = await Holiday.create(holidayData);
        savedHolidays.push(saved);
        console.log(`Saved holiday: ${h.name}`);
      }
    }

    return savedHolidays;
  } catch (error) {
    console.error("Error fetching holidays:", error.message);
    return [];
  }
}

export async function syncAllYears() {
  const currentYear = new Date().getFullYear();
  const previousYear = currentYear - 1;

  await Holiday.deleteMany({ year: { $lt: currentYear } });
  console.log(`Deleted holidays from ${previousYear}`);

  await fetchMyanmarHolidays(currentYear);

  console.log("Holiday sync completed");
}

export async function getUpcomingHolidays() {
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1;
  const currentDay = now.getDate();

  const holidays = await Holiday.find({
    year: currentYear,
    $or: [
      { month: currentMonth, day: { $gte: currentDay } },
      { month: { $gt: currentMonth } },
    ],
  }).sort({ month: 1, day: 1 });

  return holidays;
}

export async function getTodayHolidays(month, day) {
  const year = new Date().getFullYear();

  return await Holiday.find({
    year: year,
    month: month,
    day: day,
  });
}

export async function getHolidaysByMonth(month) {
  const year = new Date().getFullYear();

  return await Holiday.find({
    year: year,
    month: month,
  }).sort({ day: 1 });
}
