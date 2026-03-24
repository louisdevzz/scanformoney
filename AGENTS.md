# ScanForMoney - AI Agent Instructions

## Project Overview
ScanForMoney is a Telegram bot that automatically scans multiple sources for bounty and hackathon opportunities, filters them based on criteria, and sends notifications.

## Agent Capabilities

### Primary Tasks
- **Scrape data** from multiple sources (Superteam, DoraHacks, Devpost, GitHub, Galxe)
- **Filter opportunities** based on configurable criteria ($1,000+ reward, >3 days remaining, dev category, global)
- **Format messages** for Telegram with MarkdownV2
- **Send notifications** to channels with 1-second delays between messages
- **Periodic scanning** every 5-15 minutes

### Data Structure
All bounties must follow the `Bounty` interface:
```typescript
{
  id: string;
  title: string;
  reward: number;
  currency: string;
  deadline: Date;
  link: string;
  tags: string[];
  source: string;
  description?: string;
  category?: 'dev' | 'design' | 'content' | 'other';
  target?: 'global' | 'regional';
}
```

### Workflow
1. **Initialize** - Load config, setup Telegram bot, initialize data store
2. **Scrape** - Run all enabled scrapers in parallel
3. **Compare** - Check against existing data in JSON store
4. **Filter** - Apply filtering rules (reward, deadline, category, target)
5. **Notify** - Send filtered results to Telegram
6. **Repeat** - Wait for next interval

## Development Guidelines

### Adding New Scrapers
1. Extend `BaseScraper` class
2. Implement `scrape()` method returning `Bounty[]`
3. Use `normalizeBounty()` helper for data consistency
4. Handle errors gracefully, return empty array on failure
5. Add scraper to `BountyScanner` constructor

### Filtering Rules
Default filters (can be customized):
- Minimum reward: $1,000 USD
- Deadline: > 3 days remaining
- Category: dev only
- Target: global only
- Keywords: Solana, AI, hackathon, bounty

### Message Formatting
- Use MarkdownV2 formatting (escaped special characters)
- Include emoji for visual appeal
- Show reward, deadline, days remaining, tags, source
- Provide clickable link

### Error Handling
- Never crash the main process on scraper errors
- Log errors with source identification
- Continue with other scrapers if one fails
- Retry on transient errors when appropriate

## Configuration

Environment variables in `.env`:
- `TELEGRAM_BOT_TOKEN` - Bot token from BotFather
- `TELEGRAM_CHANNEL_ID` - Channel/chat ID to post to
- `SCAN_INTERVAL_MINUTES` - Scan frequency (default: 10)

## Testing

### Manual Testing
```bash
pnpm dev
```
Runs the bot with tsx for immediate feedback.

### Build & Run
```bash
pnpm build
pnpm start
```
Compile TypeScript and run production version.

## Troubleshooting

### Common Issues
- **Telegram API errors** - Check bot token and permissions
- **No bounties found** - Verify scraper URLs/APIs, check filter criteria
- **High memory usage** - Data store may grow large, implement cleanup

### Debug Mode
Add `console.log()` statements in relevant areas:
- Scraper responses
- Filter results
- New/updated counts
- API errors

## Performance

- Parallel scraper execution
- Efficient JSON storage
- Rate limiting (1s delay between Telegram sends)
- Configurable scan intervals

## Security

- Never commit `.env` file
- Store secrets in environment variables
- Validate webhook/API responses
- Sanitize user inputs (if any)
