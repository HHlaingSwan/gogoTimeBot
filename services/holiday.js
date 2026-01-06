import axios from "axios";
import Holiday from "../models/Holiday.js";
import { CALENDARIFIC_API_KEY } from "../config/env.js";
import {
  getDaysUntil,
  formatCountdown,
  formatDate,
} from "../utils/countdown.js";

const CALENDARIFIC_BASE_URL = "https://calendarific.com/api/v2";

async function fetchMyanmarHolidays(year) {
  if (!CALENDARIFIC_API_KEY) {
    return { success: false, error: "API key not configured", holidays: [] };
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

    const holidays = response.response?.holidays || [];
    console.log(
      `Fetched ${holidays.length} holidays from Calendarific for ${year}`
    );

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

    return { success: true, error: null, holidays: savedHolidays };
  } catch (error) {
    let errorMessage = "Failed to fetch holidays";
    if (error.code === "ECONNABORTED") {
      errorMessage = "Request timed out. Please try again.";
    } else if (error.response) {
      if (error.response.status === 401) {
        errorMessage = "Invalid API key. Please check your configuration.";
      } else if (error.response.status === 429) {
        errorMessage = "Too many requests. Please try again later.";
      } else if (error.response.status >= 500) {
        errorMessage = "Calendarific server error. Please try again later.";
      }
    } else if (error.message.includes("Network Error")) {
      errorMessage = "Network error. Please check your internet connection.";
    }
    console.error("Calendarific error:", error.message);
    return { success: false, error: errorMessage, holidays: [] };
  }
}

export async function checkApiHealth() {
  if (!CALENDARIFIC_API_KEY) {
    return { healthy: false, message: "API key not configured" };
  }

  try {
    const response = await axios.get(`${CALENDARIFIC_BASE_URL}/holidays`, {
      params: {
        api_key: CALENDARIFIC_API_KEY,
        country: "MM",
        year: new Date().getFullYear(),
      },
      timeout: 10000,
    });
    return { healthy: true, message: "API is working" };
  } catch (error) {
    let message = "API check failed";
    if (error.response?.status === 401) {
      message = "Invalid API key";
    } else if (error.code === "ECONNABORTED") {
      message = "Request timed out";
    } else if (error.message.includes("Network Error")) {
      message = "Network error";
    }
    console.error("API health check failed:", error.message);
    return { healthy: false, message };
  }
}

export async function syncYear(year) {
  const existingCount = await Holiday.countDocuments({ year, country: "MM" });
  console.log(`${existingCount} holidays already exist for ${year}`);

  const result = await fetchMyanmarHolidays(year);
  console.log(`Synced ${year}: ${result.holidays.length} new holidays added`);

  return { ...result, existingCount };
}

export async function syncCurrentYear() {
  const currentYear = new Date().getFullYear();
  console.log(`Syncing ${currentYear}...`);
  return await syncYear(currentYear);
}

export async function syncCurrentAndNextYear() {
  const currentYear = new Date().getFullYear();
  const nextYear = currentYear + 1;

  console.log(`Syncing ${currentYear} and ${nextYear}...`);

  const currentResult = await syncYear(currentYear);
  const nextResult = await syncYear(nextYear);

  console.log("Sync completed");

  return {
    success: currentResult.success && nextResult.success,
    error: currentResult.error || nextResult.error,
    totalAdded: currentResult.holidays.length + nextResult.holidays.length,
  };
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
