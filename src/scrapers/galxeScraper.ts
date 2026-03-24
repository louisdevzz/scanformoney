import { BaseScraper } from './baseScraper';
import { Bounty } from '../types/bounty';
import {
  inferCategory,
  inferTarget,
  parseRewardUsd,
  stableId,
  uniqueTags,
} from './normalization';

interface GalxeResponse {
  data?: {
    campaigns?: {
      list?: Array<{
        id: string;
        name: string;
        type: string;
        rewardName: string;
        rewardType: string;
        endTime: number | null;
        startTime: number | null;
        createdAt: number | null;
        releasedAt: number | null;
        tags: string[];
        space?: {
          name?: string;
        };
        tokenReward?: {
          tokenSymbol?: string;
          userTokenAmount?: string;
          tokenDecimal?: string;
        };
      }>;
    };
  };
}

export class GalxeScraper extends BaseScraper {
  constructor() {
    super('galxe');
  }

  async scrape(): Promise<Bounty[]> {
    try {
      const query = {
        query: 'query { campaigns(input:{first:60,listType:Newest,statuses:[Active]}) { list { id name type rewardName rewardType endTime startTime createdAt releasedAt tags space { name } tokenReward { tokenSymbol userTokenAmount tokenDecimal } } } }',
      };

      const response = await fetch('https://graphigo.prd.galaxy.eco/query', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify(query),
      });

      if (!response.ok) {
        return [];
      }

      const payload = (await response.json()) as GalxeResponse;
      const campaigns = payload.data?.campaigns?.list ?? [];
      const now = new Date();

      return campaigns.map((campaign) => {
        const title = campaign.name?.trim() || 'Untitled Galxe quest';
        const rewardText = `${campaign.rewardName ?? ''} ${campaign.tokenReward?.userTokenAmount ?? ''} ${campaign.tokenReward?.tokenSymbol ?? ''}`;
        const reward = parseRewardUsd(rewardText);
        const deadline = campaign.endTime ? new Date(campaign.endTime * 1000) : new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
        const sourceCreatedAt = toDateFromUnix(campaign.releasedAt) ?? toDateFromUnix(campaign.startTime) ?? toDateFromUnix(campaign.createdAt) ?? now;
        const detailsText = `${title} ${campaign.type} ${campaign.rewardType} ${(campaign.tags ?? []).join(' ')}`;
        const inferredCategory = inferCategory(detailsText);
        const inferredTarget = inferTarget(detailsText);
        const tags = uniqueTags([
          'galxe',
          campaign.type,
          campaign.rewardType,
          ...(campaign.tags ?? []),
          inferredCategory,
          inferredTarget,
        ]);

        return this.normalizeBounty({
          id: campaign.id ? `galxe-${campaign.id}` : stableId('galxe', title),
          title,
          reward,
          currency: campaign.tokenReward?.tokenSymbol || 'USD',
          deadline,
          link: `https://app.galxe.com/quest/${campaign.id}`,
          tags,
          description: campaign.rewardName || `Galxe ${campaign.type} campaign`,
          category: inferredCategory,
          target: inferredTarget,
          createdAt: sourceCreatedAt,
          updatedAt: sourceCreatedAt,
        });
      });
    } catch {
      return [];
    }
  }
}

function toDateFromUnix(value: number | null | undefined): Date | null {
  if (!value || Number.isNaN(value)) {
    return null;
  }

  const milliseconds = value > 2_000_000_000 ? value * 1000 : value * 1000;
  const parsedDate = new Date(milliseconds);
  return Number.isNaN(parsedDate.getTime()) ? null : parsedDate;
}
