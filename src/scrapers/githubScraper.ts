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

interface GitHubIssueSearchResponse {
  items?: Array<{
    id: number;
    title: string;
    body: string | null;
    html_url: string;
    updated_at: string;
    created_at: string;
    labels: Array<{ name: string }>;
  }>;
}

export class GitHubScraper extends BaseScraper {
  private readonly token?: string;

  constructor(token?: string) {
    super('github');
    this.token = token;
  }

  async scrape(): Promise<Bounty[]> {
    try {
      const query = encodeURIComponent('(hackathon OR bounty) in:title,body is:issue state:open');
      const response = await fetch(`https://api.github.com/search/issues?q=${query}&sort=updated&order=desc&per_page=60`, {
        headers: {
          Accept: 'application/vnd.github+json',
          'User-Agent': 'scanformoney-bot',
          ...(this.token ? { Authorization: `Bearer ${this.token}` } : {}),
        },
      });

      if (!response.ok) {
        return [];
      }

      const payload = (await response.json()) as GitHubIssueSearchResponse;
      const issues = payload.items ?? [];

      return issues.map((issue) => {
        const text = `${issue.title}\n${issue.body ?? ''}`;
        const reward = parseRewardUsd(text);
        const parsedDeadline = parseNaturalDeadline(text);
        const updatedAt = new Date(issue.updated_at);
        const fallbackDeadline = new Date(updatedAt.getTime() + 21 * 24 * 60 * 60 * 1000);
        const detailsText = `${text} ${(issue.labels ?? []).map((label) => label.name).join(' ')}`;
        const tags = uniqueTags([
          'github',
          ...(issue.labels ?? []).map((label) => label.name),
          inferCategory(detailsText),
          inferTarget(detailsText),
        ]);

        return this.normalizeBounty({
          id: issue.id ? `github-${issue.id}` : stableId('github', issue.html_url),
          title: issue.title,
          reward,
          currency: 'USD',
          deadline: parsedDeadline ?? fallbackDeadline,
          link: issue.html_url,
          tags,
          description: issue.body ?? undefined,
          category: inferCategory(detailsText),
          target: inferTarget(detailsText),
          createdAt: new Date(issue.created_at),
          updatedAt,
        });
      });
    } catch {
      return [];
    }
  }
}
