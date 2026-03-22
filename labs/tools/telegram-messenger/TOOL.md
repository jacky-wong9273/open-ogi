---
name: Telegram Messenger
id: telegram-messenger
version: "1.0.0"
description: Send and receive messages via Telegram Bot API for team and stakeholder communication
type: messaging
config:
  bot_token_env: TELEGRAM_BOT_TOKEN
  default_parse_mode: Markdown
---

# Telegram Messenger Tool

Enables agents to communicate with human users and other systems via Telegram.

## Capabilities

- **Send message** to a chat (user, group, or channel)
- **Send formatted message** with Markdown or HTML
- **Send file/image** attachments
- **Read incoming messages** from the bot's update queue
- **Reply to specific messages** with threading

## API Methods

### sendMessage

```json
{
  "action": "sendMessage",
  "params": {
    "chat_id": "string | number",
    "text": "string",
    "parse_mode": "Markdown | HTML",
    "reply_to_message_id": "number (optional)"
  }
}
```

### getUpdates

```json
{
  "action": "getUpdates",
  "params": {
    "offset": "number (optional)",
    "limit": "number (optional, max 100)",
    "timeout": "number (optional, long-poll seconds)"
  }
}
```

### sendDocument

```json
{
  "action": "sendDocument",
  "params": {
    "chat_id": "string | number",
    "document": "string (file path or URL)",
    "caption": "string (optional)"
  }
}
```

## Security Rules

- Never send credentials, API keys, or secrets through Telegram.
- Validate `chat_id` against an allowlist before sending.
- Rate limit: max 30 messages per second per chat.
- Log all messages sent for audit purposes.

## Configuration

| Variable                 | Description                          | Required |
| ------------------------ | ------------------------------------ | -------- |
| `TELEGRAM_BOT_TOKEN`     | Bot token from @BotFather            | Yes      |
| `TELEGRAM_ALLOWED_CHATS` | Comma-separated chat IDs             | Yes      |
| `TELEGRAM_WEBHOOK_URL`   | Webhook URL (alternative to polling) | No       |
