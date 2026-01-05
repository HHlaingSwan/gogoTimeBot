# ⏰ GoGoTime Bot

A simple Telegram scheduler bot with reminders, timezone support, and Myanmar holidays.

## Features

- **Smart Reminders** - `/remind 9am Task` (one-time, daily, weekly, weekdays)
- **Today's Schedule** - `/today` shows all reminders
- **Myanmar Holidays** - `/holidays` shows all remaining holidays
- **Timezone Support** - `/timezone Malaysia`
- **Quiet Hours** - No reminders between 12am-7am (automatic)

## Setup

### Prerequisites

- Node.js 18+
- MongoDB (local or Atlas)
- Telegram Bot Token from [@BotFather](https://t.me/BotFather)
- Calendarific API Key (optional, for holidays)

### Environment Variables (.env)

```env
TELEGRAM_BOT_TOKEN=your_bot_token_here
MONGODB_URI=mongodb://localhost:27017/telegram_bot
WEBHOOK_URL=https://your-domain.com/api/telegram
CALENDARIFIC_API_KEY=your_calendarific_api_key
PORT=3000
```

## Usage

### Setting Reminders

```
/remind 9am Meeting              → One-time reminder
/remind daily 7am Exercise       → Every day at 7am
/remind weekdays 9am Standup     → Mon-Fri at 9am
/remind friday 9am Weekly review → Every Friday at 9am
/remind mon 3pm Meeting          → Every Monday at 3pm
```

### Viewing Schedule

```
/today      → Today's reminders + all tasks
/holidays   → Myanmar holidays (remaining in year)
```

### Managing Reminders

```
/delete 1     → Delete first reminder
/delete 2     → Delete second reminder
/deleteall    → Delete ALL reminders (confirmation required)
```

### Settings

```
/timezone           → Show current timezone
/timezone Malaysia  → Set timezone
/help               → Show help
```

### Reply Keyboard

```
┌───────────┬───────────┐
│   ⏰ Remind│   📅 Today│
├───────────┼───────────┤
│   🎉 Holiday│   ⚙️ Settings│
└───────────┴───────────┘
```

## Timezones

Available: Malaysia, Singapore, Thailand, Japan, Korea, China, India, Hong Kong, Australia, UK, Europe, New York, LA, Dubai, UTC

## Tech Stack

- Node.js, Express, node-telegram-bot-api, Mongoose, MongoDB, Axios

## License

MIT
