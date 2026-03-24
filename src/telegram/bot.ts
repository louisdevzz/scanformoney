import { Bounty } from '../types/bounty';
import { formatBountyMessage, formatBountyMessagePlainText } from '../formatters/telegramFormatter';

export class TelegramBot {
  private token: string;
  private channelId: string;
  private messageDelayMs: number;

  constructor(token: string, channelId: string, messageDelayMs: number = 30_000) {
    this.token = token;
    this.channelId = channelId;
    this.messageDelayMs = messageDelayMs;
  }

  async sendMessage(bounty: Bounty): Promise<boolean> {
    try {
      await this.sendBountyMessageWithFallback(bounty);
      return true;
    } catch (error) {
      console.error('Failed to send message:', error);
      return false;
    }
  }

  async sendMultipleMessages(bounties: Bounty[]): Promise<string[]> {
    const sentIds: string[] = [];

    for (const [index, bounty] of bounties.entries()) {
      try {
        await this.sendBountyMessageWithFallback(bounty);
        sentIds.push(bounty.id);
      } catch (error) {
        console.error(`Failed to send bounty ${bounty.id}:`, error);
      } finally {
        if (index < bounties.length - 1) {
          await this.sleep(this.messageDelayMs);
        }
      }
    }

    return sentIds;
  }

  async sendSummary(newCount: number, updatedCount: number): Promise<void> {
    const message = `
📊 *Scan Summary*
✅ New: ${newCount}
🔄 Updated: ${updatedCount}
📅 ${new Date().toLocaleDateString()}
`.trim();

    await this.sendToTelegram(message);
  }

  private async sendBountyMessageWithFallback(bounty: Bounty): Promise<void> {
    const markdownMessage = formatBountyMessage(bounty);

    try {
      await this.sendToTelegram(markdownMessage, 'MarkdownV2');
      return;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      if (!/can't parse entities/i.test(errorMessage)) {
        throw error;
      }
    }

    const plainMessage = formatBountyMessagePlainText(bounty);
    await this.sendToTelegram(plainMessage);
  }

  private async sendToTelegram(message: string, parseMode?: 'MarkdownV2'): Promise<void> {
    const url = `https://api.telegram.org/bot${this.token}/sendMessage`;
    const payload: {
      chat_id: string;
      text: string;
      parse_mode?: 'MarkdownV2';
      disable_web_page_preview: boolean;
    } = {
      chat_id: this.channelId,
      text: message,
      disable_web_page_preview: false,
    };

    if (parseMode) {
      payload.parse_mode = parseMode;
    }
    
    const maxAttempts = 5;

    for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        return;
      }

      const responseText = await response.text();
      let retryAfterSeconds = 0;

      try {
        const parsed = JSON.parse(responseText) as { parameters?: { retry_after?: number } };
        retryAfterSeconds = parsed.parameters?.retry_after ?? 0;
      } catch {
        retryAfterSeconds = 0;
      }

      const shouldRetry = response.status === 429 && retryAfterSeconds > 0 && attempt < maxAttempts;
      if (!shouldRetry) {
        throw new Error(`Telegram API error: ${responseText}`);
      }

      await this.sleep(retryAfterSeconds * 1000);
    }

    throw new Error('Telegram API error: exceeded retry attempts');
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
