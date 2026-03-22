import OpenAI from "openai";
import type {
  ChatCompletionMessageParam,
  ChatCompletion,
} from "openai/resources/chat/completions";

export interface LLMConfig {
  provider: string;
  model: string;
  apiKey: string;
  baseUrl: string;
  temperature?: number;
  maxTokens?: number;
}

export interface LLMResponse {
  content: string;
  inputTokens: number;
  outputTokens: number;
  model: string;
  provider: string;
  finishReason: string;
}

/**
 * Uniform LLM provider using OpenAI-compatible API.
 * Works with DeepSeek, OpenAI, Anthropic (via proxy), and any
 * OpenAI-compatible endpoint.
 */
export class LLMProvider {
  private client: OpenAI;
  private config: LLMConfig;

  constructor(config: LLMConfig) {
    this.config = config;
    this.client = new OpenAI({
      apiKey: config.apiKey,
      baseURL: config.baseUrl,
    });
  }

  async chat(
    messages: ChatCompletionMessageParam[],
    options?: {
      temperature?: number;
      maxTokens?: number;
      systemPrompt?: string;
    },
  ): Promise<LLMResponse> {
    const allMessages: ChatCompletionMessageParam[] = [];

    if (options?.systemPrompt) {
      allMessages.push({ role: "system", content: options.systemPrompt });
    }
    allMessages.push(...messages);

    const response: ChatCompletion = await this.client.chat.completions.create({
      model: this.config.model,
      messages: allMessages,
      temperature: options?.temperature ?? this.config.temperature ?? 0.7,
      max_tokens: options?.maxTokens ?? this.config.maxTokens ?? 4096,
    });

    const choice = response.choices[0];
    return {
      content: choice?.message?.content ?? "",
      inputTokens: response.usage?.prompt_tokens ?? 0,
      outputTokens: response.usage?.completion_tokens ?? 0,
      model: this.config.model,
      provider: this.config.provider,
      finishReason: choice?.finish_reason ?? "unknown",
    };
  }

  /** Stream responses for real-time output */
  async *chatStream(
    messages: ChatCompletionMessageParam[],
    options?: {
      temperature?: number;
      maxTokens?: number;
      systemPrompt?: string;
    },
  ): AsyncGenerator<string> {
    const allMessages: ChatCompletionMessageParam[] = [];

    if (options?.systemPrompt) {
      allMessages.push({ role: "system", content: options.systemPrompt });
    }
    allMessages.push(...messages);

    const stream = await this.client.chat.completions.create({
      model: this.config.model,
      messages: allMessages,
      temperature: options?.temperature ?? this.config.temperature ?? 0.7,
      max_tokens: options?.maxTokens ?? this.config.maxTokens ?? 4096,
      stream: true,
    });

    for await (const chunk of stream) {
      const content = chunk.choices[0]?.delta?.content;
      if (content) yield content;
    }
  }

  getConfig(): LLMConfig {
    return { ...this.config };
  }
}
