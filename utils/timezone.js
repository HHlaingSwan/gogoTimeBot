export const TIMEZONES = [
  { label: "🇲🇾 Malaysia", value: "Asia/Kuala_Lumpur" },
  { label: "🇸🇬 Singapore", value: "Asia/Singapore" },
  { label: "🇹🇭 Thailand", value: "Asia/Bangkok" },
  { label: "🇮🇳 India", value: "Asia/Kolkata" },
  { label: "🇨🇳 China", value: "Asia/Shanghai" },
  { label: "🇯🇵 Japan", value: "Asia/Tokyo" },
  { label: "🇰🇷 Korea", value: "Asia/Seoul" },
  { label: "🇭🇰 Hong Kong", value: "Asia/Hong_Kong" },
  { label: "🇦🇺 Australia", value: "Australia/Sydney" },
  { label: "🇳🇿 New Zealand", value: "Pacific/Auckland" },
  { label: "🇬🇧 UK", value: "Europe/London" },
  { label: "🇪🇺 Europe", value: "Europe/Paris" },
  { label: "🇺🇸 New York", value: "America/New_York" },
  { label: "🇺🇸 LA", value: "America/Los_Angeles" },
  { label: "🇦🇪 Dubai", value: "Asia/Dubai" },
  { label: "🌏 UTC", value: "UTC" }
];

export function formatTimezoneLabel(tz) {
  const found = TIMEZONES.find(t => t.value === tz);
  return found ? found.label : tz;
}

export function isValidTimezone(tz) {
  return TIMEZONES.some(t => t.value === tz);
}

export function getTimezonesList() {
  return TIMEZONES.map(t => t.label).join("\n");
}
