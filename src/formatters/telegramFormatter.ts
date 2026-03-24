import { Bounty } from '../types/bounty';

export function formatBountyMessage(bounty: Bounty): string {
  const emoji = getEmojiByCategory(bounty.category);
  const deadlineFormatted = formatDate(bounty.deadline);
  const daysRemaining = getDaysRemaining(bounty.deadline);
  const deadlineLabel = daysRemaining === 0 ? 'Today' : `${daysRemaining} day${daysRemaining !== 1 ? 's' : ''} left`;
  const safeTitle = escapeMarkdownV2Text(bounty.title);
  const safeReward = escapeMarkdownV2Text(`$${bounty.reward.toLocaleString()} ${bounty.currency}`);
  const safeDeadline = escapeMarkdownV2Text(deadlineFormatted);
  const safeDeadlineLabel = escapeMarkdownV2Text(deadlineLabel);
  const safeTags = escapeMarkdownV2Text(bounty.tags.join(', '));
  const safeSource = escapeMarkdownV2Text(bounty.source);
  const safeLink = escapeMarkdownV2Url(bounty.link);

  return `
${emoji} *${safeTitle}*

💰 Reward: *${safeReward}*
⏰ Deadline: *${safeDeadline}* \\(${safeDeadlineLabel}\\)
🏷️ Tags: ${safeTags}
📍 Source: *${safeSource}*

🔗 [View Details](${safeLink})
`.trim();
}

export function formatBountyMessagePlainText(bounty: Bounty): string {
  const emoji = getEmojiByCategory(bounty.category);
  const deadlineFormatted = formatDate(bounty.deadline);
  const daysRemaining = getDaysRemaining(bounty.deadline);
  const deadlineLabel = daysRemaining === 0 ? 'Today' : `${daysRemaining} day${daysRemaining !== 1 ? 's' : ''} left`;

  return [
    `${emoji} ${bounty.title}`,
    `💰 Reward: $${bounty.reward.toLocaleString()} ${bounty.currency}`,
    `⏰ Deadline: ${deadlineFormatted} (${deadlineLabel})`,
    `🏷️ Tags: ${bounty.tags.join(', ')}`,
    `📍 Source: ${bounty.source}`,
    `🔗 ${bounty.link}`,
  ].join('\n');
}

export function formatMultipleBounties(bounties: Bounty[]): string {
  if (bounties.length === 0) {
    return 'No new bounties found matching criteria.';
  }

  const header = `🎯 *${bounties.length} New Bounty/Bounty Opportunities*`;
  const messages = bounties.map((bounty, index) => {
    return `\n${index + 1}. *${escapeMarkdownV2Text(bounty.title)}*\n💰 ${escapeMarkdownV2Text(`$${bounty.reward.toLocaleString()} ${bounty.currency}`)} | ⏰ ${escapeMarkdownV2Text(formatDate(bounty.deadline))}`;
  }).join('\n');

  return `${header}${messages}`;
}

function getEmojiByCategory(category?: string): string {
  const emojis: Record<string, string> = {
    dev: '💻',
    design: '🎨',
    content: '✍️',
    other: '🎯',
  };
  return category ? emojis[category] || '🎯' : '🎯';
}

function formatDate(date: Date): string {
  const options: Intl.DateTimeFormatOptions = {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'UTC',
  };
  return date.toLocaleDateString('en-US', options);
}

function getDaysRemaining(deadline: Date): number {
  const now = new Date();
  const diff = deadline.getTime() - now.getTime();
  return Math.floor(diff / (1000 * 60 * 60 * 24));
}

function escapeMarkdownV2Text(text: string): string {
  return text.replace(/([_*\[\]()~`>#+\-=|{}.!\\])/g, '\\$1');
}

function escapeMarkdownV2Url(url: string): string {
  return url.replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)');
}
