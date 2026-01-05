# ⏰ GoGoTime Bot

A Telegram scheduler bot that helps you set reminders with one-time, daily, weekly, weekdays-only, or specific day schedules.

## Features

- **One-time reminders** - `/remind 9am Finish project`
- **Daily reminders** - `/daily 7am Morning exercise`
- **Weekly reminders** - `/weekly 9pm Weekly review`
- **Weekdays only (Mon-Fri)** - `/weekdays 9am Team standup`
- **Specific day** - `/every friday 3pm Team meeting`
- **View today's reminders** - `/today`
- **Next reminder countdown** - `/next`
- **List all tasks** - `/tasks`
- **Delete reminders** - `/del <number>`

## Setup

### Prerequisites

- Node.js 18+
- MongoDB (local or Atlas)
- Telegram Bot Token from [@BotFather](https://t.me/BotFather)

### Installation

```bash
# Clone the repository
git clone <your-repo-url>
cd telegram_bot

# Install dependencies
npm install

# Create .env file
cp .env.example .env
```

### Environment Variables (.env)

```env
TELEGRAM_BOT_TOKEN=your_bot_token_here
MONGODB_URI=mongodb://localhost:27017/telegram_bot
WEBHOOK_URL=https://your-domain.com/api/telegram
PORT=3000
```

### Running Locally (Polling Mode)

```bash
npm run dev
```

For local testing, update `bot/bot.js` to use polling:
```js
const bot = new TelegramBot(TELEGRAM_BOT_TOKEN, {
  polling: true  // for local dev
});
```

### Deploying to Render

1. Push code to GitHub
2. Create a **Web Service** on Render
3. Connect your GitHub repo
4. Add environment variables in Render dashboard:
   - `TELEGRAM_BOT_TOKEN`: Your bot token
   - `MONGODB_URI`: MongoDB connection string
   - `WEBHOOK_URL`: `https://your-app.onrender.com/api/telegram`
   - `PORT`: `10000`
5. Deploy

### Setting Up Webhook

For production, set the webhook once:

```bash
curl -F "url=https://your-app.onrender.com/api/telegram" \
  https://api.telegram.org/bot<YOUR_BOT_TOKEN>/setWebhook
```

## Usage

```
/remind 9am Finish project       # One-time reminder
/daily 7am Morning exercise      # Daily reminder (every day)
/weekly fri 9pm Weekly review    # Weekly reminder on Friday
/weekdays 9am Daily standup      # Mon-Fri only
/every friday 3pm Team meeting   # Specific day
/today                           # Today's schedule
/next                            # Time until next reminder
/tasks                           # List all reminders
/del <number>                    # Delete by number (e.g., /del 1)
```

**Daily vs Weekly:**
- `/daily 9am` → Sends **every day** at 9am
- `/weekly fri 9am` → Sends **every Friday** at 9am
- `/weekly 9am` → Sends on the same day each week (if no day specified)

## Tech Stack

- **Node.js** - Runtime
- **Express** - HTTP server
- **node-telegram-bot-api** - Telegram Bot SDK
- **Mongoose** - MongoDB ODM
- **MongoDB** - Database

## License

MIT
