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

export class DoraHacksScraper extends BaseScraper {
  constructor() {
    super('dorahacks');
  }

  async scrape(): Promise<Bounty[]> {
    try {
      const response = await fetch('https://dorahacks.io/hackathon', {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)',
          Accept: 'text/html,application/xhtml+xml',
        },
      });

      const html = await response.text();
      if (!response.ok || /captcha|human verification/i.test(html)) {
        return [];
      }

      const linkPattern = /https:\/\/dorahacks\.io\/hackathon\/[a-zA-Z0-9-]+/g;
      const links = Array.from(new Set(html.match(linkPattern) ?? [])).slice(0, 80);

      return links.map((link) => {
        const snippet = extractSnippetAroundLink(html, link);
        const title = extractTitleFromSnippet(snippet, link);
        const reward = parseRewardUsd(snippet);
        const parsedDeadline = parseNaturalDeadline(snippet);
        const fallbackDeadline = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
        const detailsText = `${title} ${snippet}`;

        return this.normalizeBounty({
          id: stableId('dorahacks', link),
          title,
          reward,
          currency: 'USD',
          deadline: parsedDeadline ?? fallbackDeadline,
          link,
          tags: uniqueTags(['dorahacks', 'hackathon', inferCategory(detailsText), inferTarget(detailsText)]),
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

function extractSnippetAroundLink(content: string, link: string): string {
  const index = content.indexOf(link);
  if (index < 0) {
    return '';
  }

  const start = Math.max(0, index - 320);
  const end = Math.min(content.length, index + 320);
  return content.slice(start, end).replace(/\s+/g, ' ').trim();
}

function extractTitleFromSnippet(snippet: string, link: string): string {
  const sanitized = snippet.replace(link, '').trim();
  const match = sanitized.match(/([A-Z0-9][^\[]+?)\s+(?:🏆|PRIZE POOL|Virtual|Online)/i);
  if (match) {
    return match[1].trim();
  }

  return sanitized.slice(0, 120) || 'DoraHacks Opportunity';
}
