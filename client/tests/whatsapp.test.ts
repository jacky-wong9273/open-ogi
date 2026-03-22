import { describe, it, expect } from "vitest";
import { WhatsAppMessenger } from "../src/tools/whatsapp.js";

describe("WhatsAppMessenger", () => {
  function createMessenger(
    allowedNumbers = ["+1234567890"],
  ): WhatsAppMessenger {
    return new WhatsAppMessenger({
      accessToken: "test-token",
      phoneNumberId: "phone-123",
      allowedNumbers,
      webhookVerifyToken: "verify",
    });
  }

  describe("sendTextMessage", () => {
    it("rejects messages to disallowed numbers", async () => {
      const messenger = createMessenger(["+1111111111"]);
      await expect(
        messenger.sendTextMessage({ to: "+9999999999", text: "Hello" }),
      ).rejects.toThrow("not in the allowlist");
    });
  });

  describe("verifyWebhook", () => {
    it("returns challenge for valid verify request", () => {
      const messenger = createMessenger();
      const result = messenger.verifyWebhook(
        "subscribe",
        "verify",
        "challenge-123",
      );
      expect(result).toBe("challenge-123");
    });

    it("returns null for invalid token", () => {
      const messenger = createMessenger();
      const result = messenger.verifyWebhook("subscribe", "wrong", "challenge");
      expect(result).toBeNull();
    });

    it("returns null for wrong mode", () => {
      const messenger = createMessenger();
      const result = messenger.verifyWebhook(
        "unsubscribe",
        "verify",
        "challenge",
      );
      expect(result).toBeNull();
    });
  });
});
