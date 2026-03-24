import { BotConfig } from '../types/bounty';

export function getBotConfig(): BotConfig {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const channelId = process.env.TELEGRAM_CHANNEL_ID;
  const rawInterval = parseInt(process.env.SCAN_INTERVAL_MINUTES || '30', 10);
  const scanIntervalMinutes = Math.min(30, Math.max(5, Number.isNaN(rawInterval) ? 30 : rawInterval));
  const superteamAgentApiKey = process.env.SUPERTEAM_AGENT_API_KEY;
  const rawMaxNotificationsPerScan = parseInt(process.env.MAX_NOTIFICATIONS_PER_SCAN || '1', 10);
  const maxNotificationsPerScan = Math.max(1, Number.isNaN(rawMaxNotificationsPerScan) ? 1 : rawMaxNotificationsPerScan);
  const rawMaxItemAgeHours = parseInt(process.env.MAX_ITEM_AGE_HOURS || '24', 10);
  const maxItemAgeHours = Math.max(1, Number.isNaN(rawMaxItemAgeHours) ? 24 : rawMaxItemAgeHours);
  const rawMaxBountyAgeHours = parseInt(process.env.MAX_BOUNTY_AGE_HOURS || '48', 10);
  const maxBountyAgeHours = Math.max(1, Number.isNaN(rawMaxBountyAgeHours) ? 48 : rawMaxBountyAgeHours);
  const rawMaxHackathonAgeHours = parseInt(process.env.MAX_HACKATHON_AGE_HOURS || '120', 10);
  const maxHackathonAgeHours = Math.max(1, Number.isNaN(rawMaxHackathonAgeHours) ? 120 : rawMaxHackathonAgeHours);
  const sendSummaryWhenNoDetails = process.env.SEND_SUMMARY_WHEN_NO_DETAILS === 'true';

  if (!token || !channelId) {
    throw new Error('TELEGRAM_BOT_TOKEN and TELEGRAM_CHANNEL_ID must be set in environment variables');
  }

  return {
    token,
    channelId,
    scanIntervalMinutes,
    superteamAgentApiKey,
    maxNotificationsPerScan,
    maxItemAgeHours,
    maxBountyAgeHours,
    maxHackathonAgeHours,
    sendSummaryWhenNoDetails,
  };
}
