import { Bounty, FilterConfig } from '../types/bounty';

export const DEFAULT_FILTER_CONFIG: FilterConfig = {
  minReward: 100,
  minDaysRemaining: 3,
  categories: ['dev'],
  targets: ['global'],
  keywords: ['Solana', 'AI', 'hackathon', 'bounty'],
};

export function filterBounties(
  bounties: Bounty[],
  config: FilterConfig = DEFAULT_FILTER_CONFIG
): Bounty[] {
  const now = new Date();

  return bounties.filter((bounty) => {
    // Check minimum reward
    if (bounty.reward < config.minReward) {
      return false;
    }

    // Check deadline (at least minDaysRemaining days from now)
    const daysRemaining = (bounty.deadline.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
    if (daysRemaining < config.minDaysRemaining) {
      return false;
    }

    // Check category
    if (config.categories.length > 0) {
      if (!bounty.category || !config.categories.includes(bounty.category)) {
        return false;
      }
    }

    // Check target
    if (config.targets.length > 0) {
      if (!bounty.target || !config.targets.includes(bounty.target)) {
        return false;
      }
    }

    // Check keywords (if any keyword matches in title or description)
    if (config.keywords && config.keywords.length > 0) {
      const text = `${bounty.title} ${bounty.description || ''}`.toLowerCase();
      const hasKeyword = config.keywords.some(keyword =>
        text.toLowerCase().includes(keyword.toLowerCase())
      );
      if (!hasKeyword) {
        return false;
      }
    }

    return true;
  });
}
