import { Bounty } from '../types/bounty';

export abstract class BaseScraper {
  protected source: string;

  constructor(source: string) {
    this.source = source;
  }

  abstract scrape(): Promise<Bounty[]>;

  getSource(): string {
    return this.source;
  }

  protected normalizeBounty(bounty: Partial<Bounty>): Bounty {
    return {
      id: bounty.id || `${this.source}-${Date.now()}-${Math.random()}`,
      title: bounty.title || 'Untitled',
      reward: bounty.reward || 0,
      currency: bounty.currency || 'USD',
      deadline: bounty.deadline || new Date(),
      link: bounty.link || '',
      tags: bounty.tags || [],
      source: this.source,
      createdAt: bounty.createdAt || new Date(),
      updatedAt: new Date(),
      description: bounty.description,
      category: bounty.category,
      target: bounty.target,
    };
  }
}
