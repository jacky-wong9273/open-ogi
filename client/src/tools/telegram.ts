import TelegramBot from "node-telegram-bot-api";
import type { AuditLogger } from "../runtime/audit-logger.js";

export interface TelegramConfig {
  botToken: string;
  allowedChatIds: string[];
  webhookUrl?: string;
}

export interface TelegramMessage {
  chatId: string | number;
  text: string;
  parseMode?: "Markdown" | "HTML";
  replyToMessageId?: number;
}

export class TelegramMessenger {
  private bot: TelegramBot;
  private allowedChats: Set<string>;
  private auditLogger?: AuditLogger;
  private messageHandlers: Array<(msg: TelegramBot.Message) => void> = [];

  constructor(config: TelegramConfig, auditLogger?: AuditLogger) {
    this.allowedChats = new Set(config.allowedChatIds);
    this.auditLogger = auditLogger;

    this.bot = new TelegramBot(config.botToken, {
      polling: !config.webhookUrl,
    });

    if (config.webhookUrl) {
      this.bot.setWebHook(config.webhookUrl);
    }

    this.bot.on("message", (msg) => {
      for (const handler of this.messageHandlers) {
        handler(msg);
      }
    });
  }

  async sendMessage(msg: TelegramMessage): Promise<TelegramBot.Message> {
    const chatIdStr = String(msg.chatId);
    if (!this.allowedChats.has(chatIdStr)) {
      throw new Error(`Chat ID ${chatIdStr} is not in the allowlist`);
    }

    const result = await this.bot.sendMessage(msg.chatId, msg.text, {
      parse_mode: msg.parseMode ?? "Markdown",
      reply_to_message_id: msg.replyToMessageId,
    });

    this.auditLogger?.log(
      "message_sent",
      `Sent message to chat ${chatIdStr}: ${msg.text.slice(0, 100)}`,
    );

    return result;
  }

  async sendDocument(
    chatId: string | number,
    document: string,
    caption?: string,
  ): Promise<TelegramBot.Message> {
    const chatIdStr = String(chatId);
    if (!this.allowedChats.has(chatIdStr)) {
      throw new Error(`Chat ID ${chatIdStr} is not in the allowlist`);
    }

    const result = await this.bot.sendDocument(chatId, document, {
      caption,
    });

    this.auditLogger?.log("message_sent", `Sent document to chat ${chatIdStr}`);

    return result;
  }

  onMessage(handler: (msg: TelegramBot.Message) => void): void {
    this.messageHandlers.push(handler);
  }

  async stop(): Promise<void> {
    await this.bot.stopPolling();
    this.messageHandlers = [];
  }
}
