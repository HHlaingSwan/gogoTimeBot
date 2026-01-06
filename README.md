# Myanmar Holiday & Date Tracker Bot

A Telegram bot for tracking Myanmar holidays and personal dates with countdowns, moon phases, and age display.

## Features

- **Myanmar Holidays** - Syncs from Calendarific API with Burmese names
- **Personal Dates** - Birthdays, anniversaries with age display
- **Moon Phases** - Shows current moon phase
- **Countdowns** - Days until next event
- **Auto Sync** - Updates holidays on the 1st of each month
- **Fallback Holidays** - Hardcoded Buddhist holidays if API fails

## Commands

| Command | Description |
|---------|-------------|
| `/today` | Today + moon phase + holidays + your dates with age |
| `/holidays` | All Myanmar holidays remaining this year |
| `/adddate 12-25 Name` | Add personal date |
| `/adddate 12-25 1990 Name` | Add with birth year (shows age) |
| `/deletedate 1` | Delete by number from `/today` |
| `/syncholidays` | Force sync holidays from API |
| `/myanmar` | Check API status |
| `/help` | Show help |

## Setup

### Prerequisites

- Node.js 18+
- MongoDB (local or Atlas)
- Telegram Bot Token from [@BotFather](https://t.me/BotFather)
- Calendarific API Key (free at https://calendarific.com)

### Environment Variables (.env)

```env
TELEGRAM_BOT_TOKEN=your_bot_token
MONGODB_URI=mongodb://localhost:27017/telegram_bot
WEBHOOK_URL=https://your-domain.com/api/telegram
CALENDARIFIC_API_KEY=your_calendarific_api_key
PORT=3000
```

### Installation

```bash
npm install
npm run dev
```

## Project Structure

```
├── index.js                 # Express server
├── bot/
│   ├── bot.js              # Telegram bot setup
│   └── command.js          # All commands
├── config/
│   ├── db.js               # MongoDB connection
│   └── env.js              # Environment variables
├── models/
│   ├── Holiday.js          # Myanmar holidays
│   └── PersonalDate.js     # User personal dates
├── services/
│   ├── holiday.js          # Calendarific API + fallback
│   └── dateService.js      # Personal date CRUD
├── utils/
│   └── countdown.js        # Moon phases, age, countdowns
└── routes/
    └── telegram.route.js   # Webhook route
```

## Fallback Holidays

If Calendarific API fails, the bot uses hardcoded Myanmar holidays:
- New Year's Day
- Karen New Year Day
- Union Day
- Thingyan / Burmese New Year
- Full Moon days (Taboung, Kason, Waso, Thadingyut, Tazaungmone)
- Christmas

## Deployment

### Render
1. Connect GitHub repository
2. Set environment variables
3. Deploy as Web Service

### Railway
1. Connect GitHub repository
2. Set environment variables
3. Deploy

### VPS
```bash
npm install -g pm2
pm2 start index.js --name telegram-bot
```

## Tech Stack

- Node.js, Express, node-telegram-bot-api, Mongoose, MongoDB, Axios

## License

MIT
