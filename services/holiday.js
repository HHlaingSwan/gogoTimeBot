import axios from "axios";
import Holiday from "../models/Holiday.js";
import { CALENDARIFIC_API_KEY } from "../config/env.js";

const CALENDARIFIC_BASE_URL = "https://calendarific.com/api/v2";

async function fetchMyanmarHolidays(year) {
  if (!CALENDARIFIC_API_KEY) {
    return { success: false, error: "API key not configured", holidays: [] };
  }
  console.log("CALENDARIFIC_API_KEY", CALENDARIFIC_API_KEY);

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
    console.error("Calendarific error:", error);
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

export async function getAllHolidays(year) {
  console.log(`Fetching holidays for year ${year} from DB...`);
  const holidays = await Holiday.find({
    year: year,
    country: "MM",
  }).sort({ month: 1, day: 1 });
  console.log(`Found ${holidays.length} holidays in DB`);
  return holidays;
}

export async function getHolidayCount(year = new Date().getFullYear()) {
  return await Holiday.countDocuments({ year, country: "MM" });
}
