export interface Bounty {
  id: string;
  title: string;
  reward: number;
  currency: string;
  deadline: Date;
  link: string;
  tags: string[];
  source: string;
  createdAt?: Date;
  updatedAt?: Date;
  notifiedAt?: Date;
  description?: string;
  category?: 'dev' | 'design' | 'content' | 'other';
  target?: 'global' | 'regional';
}

export interface FilterConfig {
  minReward: number;
  minDaysRemaining: number;
  categories: string[];
  targets: string[];
  keywords?: string[];
}

export interface ScraperConfig {
  enabled: boolean;
  interval?: number;
}

export interface BotConfig {
  token: string;
  channelId: string;
  telegramMessageDelayMs: number;
  scanIntervalMinutes: number;
  superteamAgentApiKey?: string;
  maxNotificationsPerScan: number;
  maxItemAgeHours: number;
  maxBountyAgeHours: number;
  maxHackathonAgeHours: number;
  sendSummaryWhenNoDetails: boolean;
}

export interface ScanResult {
  new: Bounty[];
  updated: Bounty[];
  total: number;
}
