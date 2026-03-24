# ScanForMoney 🚀

Telegram bot that scans and shares high-value bounty and hackathon opportunities.

## Features
- Multi-source scraping with real endpoints (Superteam API, Galxe GraphQL)
- Best-effort fallback scraping for anti-bot protected sources (DoraHacks, Devpost)
- Smart filtering based on reward, deadline, and category
- Automated notifications to Telegram channels
- First run sends all currently available opportunities
- Periodic scanning (default 30 minutes)
- Beautifully formatted messages
- SQLite persistence for tracking new/updated bounties (`node:sqlite`)

## Requirements
- Node.js 22+
- pnpm
- Telegram Bot API token

## Installation

```bash
pnpm install
cp .env.example .env
# Edit .env with your configuration
pnpm dev
```

## Configuration

Create `.env` file with:
```env
TELEGRAM_BOT_TOKEN=your_bot_token
TELEGRAM_CHANNEL_ID=your_channel_id
TELEGRAM_SEND_DELAY_SECONDS=30
SCAN_INTERVAL_MINUTES=30
SUPERTEAM_AGENT_API_KEY=optional_superteam_agent_api_key
MAX_NOTIFICATIONS_PER_SCAN=1
MAX_ITEM_AGE_HOURS=24
MAX_BOUNTY_AGE_HOURS=48
MAX_HACKATHON_AGE_HOURS=120
SEND_SUMMARY_WHEN_NO_DETAILS=false
```

Notes:
- `SCAN_INTERVAL_MINUTES` is clamped to `5-30` minutes.
- `TELEGRAM_SEND_DELAY_SECONDS` controls delay between messages (default: `30`).
- On first startup, the bot sends all currently scraped opportunities to Telegram.
- From the next scans onward, it switches back to incremental updates.
- `SUPERTEAM_AGENT_API_KEY` enables real Superteam listings (`/api/agents/listings/live`).
- `MAX_NOTIFICATIONS_PER_SCAN` controls how many detailed items are sent per scan (default: `1`).
- `MAX_ITEM_AGE_HOURS` keeps only recent items for notification (default: `24`).
- `MAX_BOUNTY_AGE_HOURS` limits bounty age (default: `48` = 2 days).
- `MAX_HACKATHON_AGE_HOURS` limits hackathon age (default: `120` = 5 days).
- `SEND_SUMMARY_WHEN_NO_DETAILS=false` keeps the bot from sending summary-only messages.

To get your Telegram bot token:
1. Open Telegram and search for [@BotFather](https://t.me/BotFather)
2. Send `/newbot` and follow the instructions
3. Copy the token provided

To get your channel ID:
1. Add your bot to the channel as an administrator
2. Send a message to the channel
3. Visit `https://api.telegram.org/bot<YOUR_BOT_TOKEN>/getUpdates`
4. Find the `chat.id` in the response

## Development

```bash
pnpm dev
```

## Build

```bash
pnpm build
pnpm start
```

## Project Structure
```
src/
  index.ts          # Main entry point
  scrapers/         # Source-specific scrapers
  filters/          # Filtering logic
  formatters/       # Message formatting
  telegram/         # Telegram bot integration
  types/            # TypeScript types
  config/           # Configuration management
  store/            # Data persistence
```

## Customization

### Adding New Scrapers
1. Create a new file in `src/scrapers/` extending `BaseScraper`
2. Implement the `scrape()` method
3. Add the new scraper to the `BountyScanner` constructor in `src/index.ts`

### Data Store
- Bounty data is stored in `data/bounties.db` (SQLite).
- Notifications are sent only for `new` and `updated` rows.

## Deploy on Render

This project is configured to run as a **Background Worker** on Render using [render.yaml](render.yaml).

1. Push this repository to GitHub/GitLab.
2. In Render, create a new **Blueprint** service from your repository.
3. Set required secrets in Render:
  - `TELEGRAM_BOT_TOKEN`
  - `TELEGRAM_CHANNEL_ID`
  - `SUPERTEAM_AGENT_API_KEY` (optional)
4. Keep `SQLITE_DB_PATH=/tmp/bounties.db` for Free plan compatibility.
5. Deploy and check Worker logs for scan results.

Notes:
- The blueprint uses Node `22` and targets Render Free plan.
- Free plan uses ephemeral filesystem, so SQLite data can reset on restart/redeploy.
- If you need persistent history, upgrade plan with disk support or switch store to managed database.

### Adjusting Filters
Modify `src/filters/bountyFilter.ts` to change:
- Minimum reward amount
- Days remaining threshold
- Categories and targets
- Keywords

## License
ISC
