import 'dotenv/config';
import { getBotConfig } from './config/botConfig';
import { TelegramBot } from './telegram/bot';
import { DataStore } from './store/dataStore';
import { filterBounties } from './filters/bountyFilter';
import { SuperteamScraper } from './scrapers/superteamScraper';
import { GalxeScraper } from './scrapers/galxeScraper';
import { DoraHacksScraper } from './scrapers/dorahacksScraper';
import { DevpostScraper } from './scrapers/devpostScraper';
import { BaseScraper } from './scrapers/baseScraper';
import { Bounty } from './types/bounty';

class BountyScanner {
  private bot: TelegramBot;
  private store: DataStore;
  private scrapers: BaseScraper[];
  private scanInterval: number;
  private maxNotificationsPerScan: number;
  private maxItemAgeHours: number;
  private maxBountyAgeHours: number;
  private maxHackathonAgeHours: number;
  private sendSummaryWhenNoDetails: boolean;
  private isFirstScan: boolean;

  constructor() {
    const config = getBotConfig();
    this.bot = new TelegramBot(config.token, config.channelId);
    this.store = new DataStore();
    this.scrapers = [
      new SuperteamScraper(config.superteamAgentApiKey),
      new GalxeScraper(),
      new DoraHacksScraper(),
      new DevpostScraper(),
    ];
    this.scanInterval = config.scanIntervalMinutes * 60 * 1000;
    this.maxNotificationsPerScan = config.maxNotificationsPerScan;
    this.maxItemAgeHours = config.maxItemAgeHours;
    this.maxBountyAgeHours = config.maxBountyAgeHours;
    this.maxHackathonAgeHours = config.maxHackathonAgeHours;
    this.sendSummaryWhenNoDetails = config.sendSummaryWhenNoDetails;
    this.isFirstScan = true;
  }

  async run(): Promise<void> {
    console.log('🚀 Bounty Scanner started');
    console.log(`⏰ Scanning every ${this.scanInterval / (60 * 1000)} minutes`);
    console.log('');

    await this.scan();

    setInterval(() => this.scan(), this.scanInterval);
  }

  private async scan(): Promise<void> {
    try {
      const timestamp = new Date().toISOString();
      console.log(`[${timestamp}] Starting scan...`);

      const allNewBounties = [];

      for (const scraper of this.scrapers) {
        try {
          console.log(`  Scraping ${scraper.getSource()}...`);
          const scraped = await scraper.scrape();
          allNewBounties.push(...scraped);
          console.log(`    Found ${scraped.length} bounties`);
        } catch (error) {
          console.error(`    Error scraping ${scraper.getSource()}:`, error);
        }
      }

      const { new: newBounties, updated: updatedBounties } = this.store.update(allNewBounties);
      
      console.log(`  New: ${newBounties.length}, Updated: ${updatedBounties.length}`);

      let bountiesToSend: Bounty[] = [];

      if (this.isFirstScan) {
        const firstScanItems = allNewBounties.filter((item: Bounty) => item.source !== 'github');
        bountiesToSend = this.takeNewestItems(firstScanItems, firstScanItems.length);
        console.log(`  First scan mode: sending all current opportunities (${bountiesToSend.length})`);
      } else {
        const baseMaxAge = Math.max(this.maxItemAgeHours, this.maxBountyAgeHours, this.maxHackathonAgeHours);
        const pendingBounties = this.store.getPendingNotifications(baseMaxAge);
        const githubPending = pendingBounties.filter((item) => item.source === 'github');
        if (githubPending.length > 0) {
          const deletedGithubPending = this.store.deleteMany(githubPending.map((item) => item.id));
          console.log(`  Removed GitHub pending items: ${deletedGithubPending}`);
        }

        const nonGithubPending = pendingBounties.filter((item) => item.source !== 'github');
        const { freshItems, staleItems } = this.splitByRecencyRules(nonGithubPending);
        if (staleItems.length > 0) {
          const deleted = this.store.deleteMany(staleItems.map((item) => item.id));
          console.log(`  Removed stale pending items: ${deleted}`);
        }

        const filteredBounties = filterBounties(freshItems);
        bountiesToSend = this.takeNewestItems(filteredBounties, this.maxNotificationsPerScan);

        console.log(`  After filtering: ${filteredBounties.length} candidates`);
        console.log(`  Pending unsent: ${nonGithubPending.length}, Fresh by age-rules: ${freshItems.length}, Sending this scan: ${bountiesToSend.length}`);
      }

      if (bountiesToSend.length > 0) {
        const sentIds = await this.bot.sendMultipleMessages(bountiesToSend);
        this.store.markAsNotified(sentIds);
        console.log(`  Sent ${sentIds.length} messages to Telegram`);
      } else if (this.sendSummaryWhenNoDetails) {
        await this.bot.sendSummary(newBounties.length, updatedBounties.length);
      }

      this.isFirstScan = false;

      console.log(`[${timestamp}] Scan completed\n`);
    } catch (error) {
      console.error('Scan error:', error);
    }
  }

  private takeNewestItems(bounties: Bounty[], limit: number): Bounty[] {
    return [...bounties]
      .sort((left, right) => {
        const leftTime = left.updatedAt?.getTime() ?? left.createdAt?.getTime() ?? 0;
        const rightTime = right.updatedAt?.getTime() ?? right.createdAt?.getTime() ?? 0;
        return rightTime - leftTime;
      })
      .slice(0, limit);
  }

  private splitByRecencyRules(bounties: Bounty[]): { freshItems: Bounty[]; staleItems: Bounty[] } {
    const now = Date.now();
    const freshItems: Bounty[] = [];
    const staleItems: Bounty[] = [];

    for (const bounty of bounties) {
      const opportunityType = this.detectOpportunityType(bounty);
      const maxAgeHours = opportunityType === 'hackathon' ? this.maxHackathonAgeHours : this.maxBountyAgeHours;
      const referenceTime = this.getReferenceTime(bounty);
      const ageHours = (now - referenceTime.getTime()) / (1000 * 60 * 60);

      if (ageHours <= maxAgeHours) {
        freshItems.push(bounty);
      } else {
        staleItems.push(bounty);
      }
    }

    return { freshItems, staleItems };
  }

  private detectOpportunityType(bounty: Bounty): 'bounty' | 'hackathon' {
    const combinedText = `${bounty.title} ${bounty.description ?? ''} ${bounty.tags.join(' ')} ${bounty.link}`.toLowerCase();
    if (/hackathon|hackerhouse|build[- ]?a[- ]?bear|global challenge/.test(combinedText)) {
      return 'hackathon';
    }
    return 'bounty';
  }

  private getReferenceTime(bounty: Bounty): Date {
    if (bounty.createdAt) {
      return bounty.createdAt;
    }

    if (bounty.updatedAt) {
      return bounty.updatedAt;
    }

    return new Date();
  }
}

async function main() {
  try {
    const scanner = new BountyScanner();
    await scanner.run();
  } catch (error) {
    console.error('Fatal error:', error);
    process.exit(1);
  }
}

main();
