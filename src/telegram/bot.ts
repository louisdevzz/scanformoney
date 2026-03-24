import { Bounty } from '../types/bounty';
import { formatBountyMessage, formatBountyMessagePlainText } from '../formatters/telegramFormatter';

export class TelegramBot {
  private token: string;
  private channelId: string;

  constructor(token: string, channelId: string) {
    this.token = token;
    this.channelId = channelId;
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
    
    for (const bounty of bounties) {
      try {
        await this.sendBountyMessageWithFallback(bounty);
        sentIds.push(bounty.id);
        await this.sleep(1000);
      } catch (error) {
        console.error(`Failed to send bounty ${bounty.id}:`, error);
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
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Telegram API error: ${error}`);
    }
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
