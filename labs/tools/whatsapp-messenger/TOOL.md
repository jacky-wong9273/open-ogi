---
name: WhatsApp Messenger
id: whatsapp-messenger
version: "1.0.0"
description: Send and receive messages via WhatsApp Cloud API for stakeholder communication
type: messaging
config:
  access_token_env: WHATSAPP_ACCESS_TOKEN
  phone_number_id_env: WHATSAPP_PHONE_NUMBER_ID
---

# WhatsApp Messenger Tool

Enables agents to communicate with stakeholders and external parties via
WhatsApp Business Cloud API.

## Capabilities

- **Send text message** to a phone number
- **Send template message** (pre-approved templates)
- **Send media** (images, documents)
- **Read incoming messages** via webhook
- **Mark messages as read**

## API Methods

### sendMessage

```json
{
  "action": "sendMessage",
  "params": {
    "to": "string (phone number with country code, e.g. +1234567890)",
    "type": "text | template | image | document",
    "text": { "body": "string" },
    "template": {
      "name": "string",
      "language": { "code": "en" },
      "components": []
    }
  }
}
```

### markAsRead

```json
{
  "action": "markAsRead",
  "params": {
    "message_id": "string"
  }
}
```

## Security Rules

- Only send to pre-approved phone numbers (allowlist).
- Use template messages for first contact (WhatsApp policy).
- Never send credentials or sensitive data.
- All messages are logged for compliance and audit.
- Rate limit: respect WhatsApp's tier-based sending limits.

## Configuration

| Variable                        | Description                           | Required |
| ------------------------------- | ------------------------------------- | -------- |
| `WHATSAPP_ACCESS_TOKEN`         | Meta Cloud API access token           | Yes      |
| `WHATSAPP_PHONE_NUMBER_ID`      | Phone number ID from Meta dashboard   | Yes      |
| `WHATSAPP_ALLOWED_NUMBERS`      | Comma-separated allowed phone numbers | Yes      |
| `WHATSAPP_WEBHOOK_VERIFY_TOKEN` | Webhook verification token            | No       |
