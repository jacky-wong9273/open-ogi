import type { AuditLogger } from "../runtime/audit-logger.js";

export interface WhatsAppConfig {
  accessToken: string;
  phoneNumberId: string;
  allowedNumbers: string[];
  webhookVerifyToken?: string;
}

export interface WhatsAppTextMessage {
  to: string;
  text: string;
}

export interface WhatsAppTemplateMessage {
  to: string;
  templateName: string;
  languageCode?: string;
  components?: Array<Record<string, unknown>>;
}

interface WhatsAppAPIResponse {
  messaging_product: string;
  contacts?: Array<{ input: string; wa_id: string }>;
  messages?: Array<{ id: string }>;
}

const WHATSAPP_API_BASE = "https://graph.facebook.com/v18.0";

export class WhatsAppMessenger {
  private config: WhatsAppConfig;
  private allowedNumbers: Set<string>;
  private auditLogger?: AuditLogger;

  constructor(config: WhatsAppConfig, auditLogger?: AuditLogger) {
    this.config = config;
    this.allowedNumbers = new Set(config.allowedNumbers);
    this.auditLogger = auditLogger;
  }

  async sendTextMessage(
    msg: WhatsAppTextMessage,
  ): Promise<WhatsAppAPIResponse> {
    this.validateRecipient(msg.to);

    const body = {
      messaging_product: "whatsapp",
      to: msg.to,
      type: "text",
      text: { body: msg.text },
    };

    const result = await this.callAPI("messages", body);

    this.auditLogger?.log(
      "message_sent",
      `Sent text to ${msg.to}: ${msg.text.slice(0, 100)}`,
    );

    return result;
  }

  async sendTemplateMessage(
    msg: WhatsAppTemplateMessage,
  ): Promise<WhatsAppAPIResponse> {
    this.validateRecipient(msg.to);

    const body = {
      messaging_product: "whatsapp",
      to: msg.to,
      type: "template",
      template: {
        name: msg.templateName,
        language: { code: msg.languageCode ?? "en" },
        components: msg.components ?? [],
      },
    };

    const result = await this.callAPI("messages", body);

    this.auditLogger?.log(
      "message_sent",
      `Sent template "${msg.templateName}" to ${msg.to}`,
    );

    return result;
  }

  async markAsRead(messageId: string): Promise<void> {
    await this.callAPI("messages", {
      messaging_product: "whatsapp",
      status: "read",
      message_id: messageId,
    });
  }

  verifyWebhook(mode: string, token: string, challenge: string): string | null {
    if (mode === "subscribe" && token === this.config.webhookVerifyToken) {
      return challenge;
    }
    return null;
  }

  private validateRecipient(to: string): void {
    if (!this.allowedNumbers.has(to)) {
      throw new Error(`Phone number ${to} is not in the allowlist`);
    }
  }

  private async callAPI(
    endpoint: string,
    body: unknown,
  ): Promise<WhatsAppAPIResponse> {
    const url = `${WHATSAPP_API_BASE}/${this.config.phoneNumberId}/${endpoint}`;
    const response = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.config.accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`WhatsApp API error (${response.status}): ${error}`);
    }

    return response.json() as Promise<WhatsAppAPIResponse>;
  }
}
