import { BaseScraper } from './baseScraper';
import { Bounty } from '../types/bounty';
import {
  inferCategory,
  inferTarget,
  parseNaturalDeadline,
  parseRewardUsd,
  stableId,
  uniqueTags,
} from './normalization';

export class DevpostScraper extends BaseScraper {
  constructor() {
    super('devpost');
  }

  async scrape(): Promise<Bounty[]> {
    try {
      const response = await fetch('https://devpost.com/hackathons', {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)',
          Accept: 'text/html,application/xhtml+xml',
        },
      });

      const html = await response.text();
      if (!response.ok || /javascript is disabled|verify that you're not a robot|captcha/i.test(html)) {
        return [];
      }

      const linkPattern = /https:\/\/devpost\.com\/software\/[a-zA-Z0-9-]+/g;
      const links = Array.from(new Set(html.match(linkPattern) ?? [])).slice(0, 60);

      return links.map((link) => {
        const snippet = getSnippet(html, link);
        const title = inferTitle(snippet);
        const reward = parseRewardUsd(snippet);
        const parsedDeadline = parseNaturalDeadline(snippet);
        const fallbackDeadline = new Date(Date.now() + 20 * 24 * 60 * 60 * 1000);
        const detailsText = `${title} ${snippet}`;

        return this.normalizeBounty({
          id: stableId('devpost', link),
          title,
          reward,
          currency: 'USD',
          deadline: parsedDeadline ?? fallbackDeadline,
          link,
          tags: uniqueTags(['devpost', 'hackathon', inferCategory(detailsText), inferTarget(detailsText)]),
          description: snippet,
          category: inferCategory(detailsText),
          target: inferTarget(detailsText),
        });
      });
    } catch {
      return [];
    }
  }
}

function getSnippet(content: string, link: string): string {
  const index = content.indexOf(link);
  if (index < 0) {
    return '';
  }

  const start = Math.max(0, index - 280);
  const end = Math.min(content.length, index + 280);
  return content.slice(start, end).replace(/\s+/g, ' ').trim();
}

function inferTitle(snippet: string): string {
  const match = snippet.match(/>([^<>]{6,120})</);
  if (match) {
    return match[1].trim();
  }
  return snippet.slice(0, 80) || 'Devpost Opportunity';
}
