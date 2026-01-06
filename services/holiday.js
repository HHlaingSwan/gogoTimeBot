import axios from "axios";
import Holiday from "../models/Holiday.js";
import { CALENDARIFIC_API_KEY } from "../config/env.js";
import {
  getDaysUntil,
  formatCountdown,
  formatDate,
} from "../utils/countdown.js";

const CALENDARIFIC_BASE_URL = "https://calendarific.com/api/v2"; //v2 not v7

async function fetchMyanmarHolidays(year) {
  if (!CALENDARIFIC_API_KEY) {
    console.log("⚠️ No API key - using fallback holidays");
    return fetchFallbackHolidays(year);
  }

  try {
    const response = await axios.get(`${CALENDARIFIC_BASE_URL}/holidays`, {
      params: {
        api_key: CALENDARIFIC_API_KEY,
        country: "MM",
        year: year,
      },
      timeout: 30000,
    });

    const holidays = response.data.response?.holidays || [];
    console.log(
      `Fetched ${holidays.length} holidays from Calendarific for ${year}`
    );

    if (holidays.length === 0) {
      return fetchFallbackHolidays(year);
    }

    const savedHolidays = [];

    for (const h of holidays) {
      const dateParts = h.date.iso.split("-");
      const holidayData = {
        name: h.name,
        localName: h.description || "",
        date: h.date.iso,
        month: parseInt(dateParts[1]),
        day: parseInt(dateParts[2]),
        year: parseInt(dateParts[0]),
        type: h.type?.[0] || "national",
        country: "MM",
        primary: h.primary?.length > 0,
        canonicalUrl: h.url || "",
        fallback: false,
      };

      const existing = await Holiday.findOne({
        name: h.name,
        year: parseInt(dateParts[0]),
        month: parseInt(dateParts[1]),
        day: parseInt(dateParts[2]),
        country: "MM",
      });

      if (!existing) {
        const saved = await Holiday.create(holidayData);
        savedHolidays.push(saved);
        console.log(`Saved: ${h.name}`);
      }
    }

    return savedHolidays;
  } catch (error) {
    console.error("Calendarific error:", error.message);
    console.log("Using fallback holidays...");
    return fetchFallbackHolidays(year);
  }
}

async function fetchFallbackHolidays(year) {
  const holidays = BUDDHIST_HOLIDAYS[year] || [];

  if (holidays.length === 0) {
    console.log(`No fallback for ${year}`);
    return [];
  }

  console.log(`Loading ${holidays.length} fallback holidays for ${year}`);

  const savedHolidays = [];

  for (const h of holidays) {
    const holidayData = {
      name: h.name,
      localName: h.localName || "",
      date: `${year}-${h.month.toString().padStart(2, "0")}-${h.day
        .toString()
        .padStart(2, "0")}`,
      month: h.month,
      day: h.day,
      year: year,
      type: "public",
      country: "MM",
      primary: true,
      canonicalUrl: "",
      fallback: true,
    };

    const existing = await Holiday.findOne({
      name: h.name,
      year: year,
      month: h.month,
      day: h.day,
      country: "MM",
    });

    if (!existing) {
      const saved = await Holiday.create(holidayData);
      savedHolidays.push(saved);
    }
  }

  return savedHolidays;
}

export async function syncYear(year) {
  await Holiday.deleteMany({ year, country: "MM" });
  console.log(`Deleted holidays for ${year}`);

  const saved = await fetchMyanmarHolidays(year);
  console.log(`Synced ${year}: ${saved.length} holidays added`);

  return saved;
}

export async function syncCurrentYear() {
  const currentYear = new Date().getFullYear();
  console.log(`Syncing ${currentYear}...`);
  await syncYear(currentYear);
}

export async function syncCurrentAndNextYear() {
  const currentYear = new Date().getFullYear();
  const nextYear = currentYear + 1;

  console.log(`Syncing ${currentYear} and ${nextYear}...`);

  await syncYear(currentYear);
  await syncYear(nextYear);

  console.log("Sync completed");
}

export async function syncAllYears() {
  const now = new Date();
  const isJanuary = now.getMonth() === 0;
  const isFirstDay = now.getDate() === 1;

  if (isJanuary && isFirstDay) {
    await syncCurrentAndNextYear();
  } else {
    await syncCurrentYear();
  }
}

export function startMonthlySync(hour = 3, minute = 0) {
  function getNextSyncTime() {
    const now = new Date();
    const next = new Date(
      now.getFullYear(),
      now.getMonth() + 1,
      1,
      hour,
      minute,
      0,
      0
    );
    return next;
  }

  function scheduleSync() {
    const nextSync = getNextSyncTime();
    const delay = Math.min(nextSync.getTime() - Date.now(), 2147483647);

    const isJanuary = nextSync.getMonth() === 0;
    console.log(`Next sync: ${nextSync.toLocaleDateString()}`);
    console.log(
      isJanuary
        ? "Will sync current + next year"
        : "Will sync current year only"
    );

    setTimeout(async () => {
      try {
        console.log("Running monthly sync...");
        await syncAllYears();
      } catch (error) {
        console.error("Sync error:", error.message);
      }
      scheduleSync();
    }, delay);
  }

  scheduleSync();
  console.log("Monthly sync started");
}

export async function getUpcomingHolidays(referenceDate = new Date()) {
  const currentYear = referenceDate.getFullYear();
  const currentMonth = referenceDate.getMonth() + 1;
  const currentDay = referenceDate.getDate();

  const holidays = await Holiday.find({
    year: currentYear,
    country: "MM",
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
    country: "MM",
  });
}

export async function getHolidaysByMonth(
  month,
  year = new Date().getFullYear()
) {
  return await Holiday.find({
    year: year,
    month: month,
    country: "MM",
  }).sort({ day: 1 });
}

export async function getHolidaysForDate(
  month,
  day,
  year = new Date().getFullYear()
) {
  return await Holiday.find({
    year: year,
    month: month,
    day: day,
    country: "MM",
  });
}

export async function getAllHolidays(year = new Date().getFullYear()) {
  return await Holiday.find({ year, country: "MM" }).sort({ month: 1, day: 1 });
}

export async function getHolidaysWithCountdown(referenceDate = new Date()) {
  const holidays = await getUpcomingHolidays(referenceDate);

  return holidays.map((h) => {
    const daysUntil = getDaysUntil(h.month, h.day, referenceDate);
    return {
      ...h.toObject(),
      daysUntil,
      countdown: formatCountdown(daysUntil),
      dateStr: formatDate(h.month, h.day),
    };
  });
}

export async function getHolidayCount(year = new Date().getFullYear()) {
  return await Holiday.countDocuments({ year, country: "MM" });
}

export async function searchHolidays(query) {
  const regex = new RegExp(query, "i");
  const year = new Date().getFullYear();

  return await Holiday.find({
    year,
    country: "MM",
    $or: [{ name: regex }, { localName: regex }],
  }).sort({ month: 1, day: 1 });
}
