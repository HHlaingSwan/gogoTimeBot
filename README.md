# Myanmar Expense Tracker Bot

A simple Telegram bot for tracking daily expenses with Myanmar holidays.

## Features

- **Daily Expenses** - Quick expense tracking with Burmese/English
- **Monthly Budget** - Set budget and track spending
- **Budget Warnings** - Alerts at 80% and over budget
- **Myanmar Holidays** - Sync from Calendarific API
- **Simple Commands** - Natural language parsing

## Commands

| Input | Description |
|-------|-------------|
| `breakfast 1000` | Add expense |
| `lunch 3000` | Add expense |
| `ညနေစာ 5000` | Add expense (Burmese) |
| `/today` | Today's expenses |
| `/thismonth` | Monthly overview with budget |
| `/holidays` | Myanmar holidays |
| `/budget 300000` | Set monthly budget |
| `/settings` | Bot settings (includes recent expenses) |

## Setup

### Prerequisites

- Node.js 18+
- MongoDB (local or Atlas)
- Telegram Bot Token from [@BotFather](https://t.me/BotFather)
- Calendarific API Key (optional, free at https://calendarific.com)

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
│   ├── command.js          # All commands
│   └── handlers.js         # Command handlers
├── config/
│   ├── db.js               # MongoDB connection
│   └── env.js              # Environment variables
├── models/
│   ├── Budget.js           # Monthly budget
│   ├── Expense.js          # Expense transactions
│   └── Holiday.js          # Myanmar holidays
├── services/
│   ├── expense.js          # Expense CRUD + budget logic
│   └── holiday.js          # Calendarific API
└── routes/
    └── telegram.route.js   # Webhook route
```

## Auto Categories

| Keyword | Category |
|---------|----------|
| breakfast, မနက်စာ | Breakfast |
| lunch, နေ့လည်စာ | Lunch |
| dinner, ညနေစာ | Dinner |
| coffee, ကော်ဖီ | Coffee |
| snack, မုနပျံ | Snack |
| transport, ကားခ | Transport |
| grocery, ဈေး | Grocery |

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
