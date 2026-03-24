import { BaseScraper } from './baseScraper';
import { Bounty } from '../types/bounty';
import {
  inferCategory,
  inferTarget,
  parseRewardUsd,
  stableId,
  uniqueTags,
} from './normalization';

interface SuperteamListing {
  id: string;
  title: string;
  rewardAmount: number;
  token: string;
  deadline: string;
  slug: string;
  type: string;
  status: string;
  sponsor?: {
    name?: string;
  };
}

export class SuperteamScraper extends BaseScraper {
  private readonly agentApiKey?: string;

  constructor(agentApiKey?: string) {
    super('superteam');
    this.agentApiKey = agentApiKey;
  }

  async scrape(): Promise<Bounty[]> {
    if (!this.agentApiKey) {
      return [];
    }

    try {
      const response = await fetch('https://superteam.fun/api/agents/listings/live?take=100', {
        headers: {
          Authorization: `Bearer ${this.agentApiKey}`,
          Accept: 'application/json',
        },
      });

      if (!response.ok) {
        return [];
      }

      const listings = (await response.json()) as SuperteamListing[];
      const now = new Date();

      return listings
        .filter((item) => item.status === 'OPEN')
        .map((item) => {
          const title = item.title?.trim() || 'Untitled Superteam listing';
          const rewardText = `${item.rewardAmount} ${item.token}`;
          const reward = item.rewardAmount > 0 ? item.rewardAmount : parseRewardUsd(rewardText);
          const deadline = new Date(item.deadline);
          const detailsText = `${title} ${item.type} ${item.sponsor?.name ?? ''}`;
          const tags = uniqueTags([
            'superteam',
            item.type,
            item.token,
            item.sponsor?.name ?? '',
            inferCategory(detailsText),
            inferTarget(detailsText),
          ]);

          return this.normalizeBounty({
            id: item.id ? `superteam-${item.id}` : stableId('superteam', `${title}-${item.slug}`),
            title,
            reward,
            currency: item.token || 'USD',
            deadline: Number.isNaN(deadline.getTime()) ? now : deadline,
            link: `https://superteam.fun/earn/listing/${item.slug}`,
            tags,
            description: `${item.type} listing from ${item.sponsor?.name ?? 'Superteam'}`,
            category: inferCategory(detailsText),
            target: inferTarget(detailsText),
          });
        });
    } catch {
      return [];
    }
  }
}
