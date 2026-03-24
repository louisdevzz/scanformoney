import { createHash } from 'node:crypto';

export function stableId(prefix: string, raw: string): string {
  return `${prefix}-${createHash('sha256').update(raw).digest('hex').slice(0, 20)}`;
}

export function parseRewardUsd(text: string): number {
  const normalized = text.replace(/,/g, '').toLowerCase();
  const moneyMatch = normalized.match(/\$\s*(\d+(?:\.\d+)?)\s*([km])?/);
  if (moneyMatch) {
    return applyMagnitude(Number(moneyMatch[1]), moneyMatch[2]);
  }

  const tokenMatch = normalized.match(/(\d+(?:\.\d+)?)\s*([km])?\s*(usd|usdc|usdt|usdg)/);
  if (tokenMatch) {
    return applyMagnitude(Number(tokenMatch[1]), tokenMatch[2]);
  }

  const plainAmountMatch = normalized.match(/(?:prize|reward|pool|bounty)[^\d]*(\d+(?:\.\d+)?)\s*([km])?/);
  if (plainAmountMatch) {
    return applyMagnitude(Number(plainAmountMatch[1]), plainAmountMatch[2]);
  }

  return 0;
}

export function parseDeadlineFromRelative(text: string, baseDate: Date = new Date()): Date | null {
  const normalized = text.toLowerCase();
  const match = normalized.match(/due\s+in\s+(\d+)\s*(h|d|w|mo)/);
  if (!match) {
    return null;
  }

  const amount = Number(match[1]);
  const unit = match[2];
  const result = new Date(baseDate);

  if (unit === 'h') {
    result.setHours(result.getHours() + amount);
  } else if (unit === 'd') {
    result.setDate(result.getDate() + amount);
  } else if (unit === 'w') {
    result.setDate(result.getDate() + amount * 7);
  } else if (unit === 'mo') {
    result.setMonth(result.getMonth() + amount);
  }

  return result;
}

export function parseNaturalDeadline(text: string): Date | null {
  const monthPattern = /(?:deadline|due)[:\s-]*([a-z]{3,9}\s+\d{1,2}(?:,\s*\d{4})?)/i;
  const match = text.match(monthPattern);
  if (!match) {
    return null;
  }

  const parsed = new Date(match[1]);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

export function inferCategory(text: string): 'dev' | 'design' | 'content' | 'other' {
  const normalized = text.toLowerCase();

  if (/(developer|dev|backend|frontend|fullstack|rust|solidity|api|smart contract|engineer|build)/.test(normalized)) {
    return 'dev';
  }

  if (/(design|ui|ux|figma|illustration|brand|creative)/.test(normalized)) {
    return 'design';
  }

  if (/(content|thread|article|write|video|social|marketing|tweet)/.test(normalized)) {
    return 'content';
  }

  return 'other';
}

export function inferTarget(text: string): 'global' | 'regional' {
  const normalized = text.toLowerCase();
  if (/(global|worldwide|remote|international|open to all)/.test(normalized)) {
    return 'global';
  }

  if (/(only|regional|country|local|poland|india|brazil|ukraine|nigeria|singapore|korea|usa|uk\b)/.test(normalized)) {
    return 'regional';
  }

  return 'global';
}

export function uniqueTags(tags: string[]): string[] {
  return Array.from(new Set(tags.map((tag) => tag.trim().toLowerCase()).filter(Boolean)));
}

function applyMagnitude(value: number, magnitude?: string): number {
  if (magnitude === 'k') {
    return value * 1_000;
  }
  if (magnitude === 'm') {
    return value * 1_000_000;
  }
  return value;
}
