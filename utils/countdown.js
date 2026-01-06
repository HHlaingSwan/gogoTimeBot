const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

const SHORT_MONTH_NAMES = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"
];

export function getMonthName(month) {
  return MONTH_NAMES[month - 1] || "";
}

export function getShortMonthName(month) {
  return SHORT_MONTH_NAMES[month - 1] || "";
}

export function getDaysInMonth(month, year = new Date().getFullYear()) {
  return new Date(year, month, 0).getDate();
}

export function isValidDate(month, day) {
  if (month < 1 || month > 12) return false;
  const maxDays = getDaysInMonth(month);
  return day >= 1 && day <= maxDays;
}

export function getDaysUntil(month, day, referenceDate = new Date()) {
  const currentYear = referenceDate.getFullYear();
  const currentMonth = referenceDate.getMonth() + 1;
  const currentDay = referenceDate.getDate();

  let targetDate = new Date(currentYear, month - 1, day);
  let diffMs = targetDate.getTime() - referenceDate.getTime();
  let diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays < 0) {
    targetDate = new Date(currentYear + 1, month - 1, day);
    diffMs = targetDate.getTime() - referenceDate.getTime();
    diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
  }

  return diffDays;
}

export function formatCountdown(days) {
  if (days === 0) return "🎉 Today!";
  if (days === 1) return "Tomorrow";
  if (days < 7) return `${days} days`;
  if (days < 30) {
    const weeks = Math.floor(days / 7);
    return weeks === 1 ? "1 week" : `${weeks} weeks`;
  }
  if (days < 365) {
    const months = Math.floor(days / 30);
    return months === 1 ? "1 month" : `${months} months`;
  }
  const years = Math.floor(days / 365);
  const remainingMonths = Math.floor((days % 365) / 30);
  if (remainingMonths === 0) return years === 1 ? "1 year" : `${years} years`;
  return `${years}y ${remainingMonths}m`;
}

export function formatDate(month, day, format = "short") {
  if (format === "short") {
    return `${getShortMonthName(month)} ${day}`;
  }
  return `${getMonthName(month)} ${day}`;
}

export function getWeekdayName(month, day, year = new Date().getFullYear()) {
  const date = new Date(year, month - 1, day);
  const weekdays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  return weekdays[date.getDay()];
}

export function parseMonthInput(input) {
  const lower = input.toLowerCase().trim();
  const monthMap = {
    "january": 1, "jan": 1,
    "february": 2, "feb": 2,
    "march": 3, "mar": 3,
    "april": 4, "apr": 4,
    "may": 5,
    "june": 6, "jun": 6,
    "july": 7, "jul": 7,
    "august": 8, "aug": 8,
    "september": 9, "sep": 9, "sept": 9,
    "october": 10, "oct": 10,
    "november": 11, "nov": 11,
    "december": 12, "dec": 12
  };

  const numericMatch = lower.match(/^(\d{1,2})$/);
  if (numericMatch) {
    const num = parseInt(numericMatch[1]);
    if (num >= 1 && num <= 12) return num;
  }

  return monthMap[lower] || null;
}

export function parseDateInput(input) {
  const lower = input.toLowerCase().trim();

  const patterns = [
    /^(\d{1,2})[-/](\d{1,2})$/,
    /^(\d{1,2})\s+(\d{1,2})$/,
    /^(\d{4})[-/](\d{1,2})[-/](\d{1,2})$/,
    /^(\d{1,2})[-/](\d{1,2})[-\s/](\d{4})$/
  ];

  for (const pattern of patterns) {
    const match = lower.match(pattern);
    if (match) {
        if (pattern.source.includes('s')) { // MM-DD YYYY
            const month = parseInt(match[1]);
            const day = parseInt(match[2]);
            const year = parseInt(match[3]);
            if (isValidDate(month, day)) return { month, day, year };
        } else if (match.length === 3) { // MM-DD
            const month = parseInt(match[1]);
            const day = parseInt(match[2]);
            if (isValidDate(month, day)) return { month, day };
        } else if (match.length === 4) { // YYYY-MM-DD
            const year = parseInt(match[1]);
            const month = parseInt(match[2]);
            const day = parseInt(match[3]);
            if (isValidDate(month, day)) return { month, day, year };
      }
    }
  }

  const monthOnly = parseMonthInput(lower);
  if (monthOnly) {
    return { month: monthOnly, day: null };
  }

  return null;
}

const MOON_PHASES = [
  { name: "New Moon", emoji: "🌑" },
  { name: "Waxing Crescent", emoji: "🌒" },
  { name: "First Quarter", emoji: "🌓" },
  { name: "Waxing Gibbous", emoji: "🌔" },
  { name: "Full Moon", emoji: "🌕" },
  { name: "Waning Gibbous", emoji: "🌖" },
  { name: "Last Quarter", emoji: "🌗" },
  { name: "Waning Crescent", emoji: "🌘" }
];

export function getMoonPhase(date = new Date()) {
  const year = date.getFullYear();
  const month = date.getMonth() + 1;
  const day = date.getDate();

  const knownNewMoon = new Date(2000, 0, 6, 18, 14, 0);
  const lunationLength = 29.53058867;
  
  const current = new Date(year, month - 1, day);
  const diffDays = (current - knownNewMoon) / (1000 * 60 * 60 * 24);
  const lunations = diffDays / lunationLength;
  const phaseIndex = Math.floor(lunations % 8);
  
  return MOON_PHASES[phaseIndex];
}

export function getMoonPhaseForDate(month, day, year = new Date().getFullYear()) {
  const date = new Date(year, month - 1, day);
  return getMoonPhase(date);
}

export function getUpcomingFullMoons(year = new Date().getFullYear(), count = 5) {
  const fullMoons = [];
  const date = new Date(year, 0, 1);
  const endDate = new Date(year + 1, 0, 1);
  
  while (date < endDate && fullMoons.length < count) {
    const phase = getMoonPhase(date);
    if (phase.name === "Full Moon") {
      fullMoons.push({
        month: date.getMonth() + 1,
        day: date.getDate(),
        weekday: getWeekdayName(date.getMonth() + 1, date.getDate(), year),
        phase
      });
    }
    date.setDate(date.getDate() + 1);
  }
  
  return fullMoons;
}

export function formatAge(birthYear, referenceYear = new Date().getFullYear()) {
  if (!birthYear) return null;
  const age = referenceYear - birthYear;
  if (age < 0) return null;
  if (age === 0) return "Just born";
  if (age === 1) return "1 year old";
  return `${age} years old`;
}

export function formatYearsTogether(startYear, referenceYear = new Date().getFullYear()) {
  if (!startYear) return null;
  const years = referenceYear - startYear;
  if (years < 0) return null;
  if (years === 0) return "Just started";
  if (years === 1) return "1 year together";
  return `${years} years together`;
}
