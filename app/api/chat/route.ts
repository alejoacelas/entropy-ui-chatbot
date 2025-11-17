import { streamText, UIMessage, convertToModelMessages } from 'ai';
import { anthropic, AnthropicProviderOptions } from '@ai-sdk/anthropic';
import { readFile } from 'fs/promises';
import { join } from 'path';

// Allow streaming responses up to 120 seconds for longer reasoning and outputs
export const maxDuration = 300;

// Cache the system prompt
let systemPrompt: string | null = null;

async function getSystemPrompt(): Promise<string> {
  if (!systemPrompt) {
    const promptPath = join(process.cwd(), 'prompts', 'system.txt');
    systemPrompt = await readFile(promptPath, 'utf-8');
  }
  return systemPrompt;
}

export async function POST(req: Request) {
  const {
    messages,
    model,
    webSearch,
    contextMessages,
  }: { 
    messages: UIMessage[]; 
    model: string; 
    webSearch: boolean;
    contextMessages?: Array<{ question: string; answer: string }>;
  } = await req.json();

  const systemPrompt = await getSystemPrompt();

  // Wrap user messages with <user_message> tags
  const wrapUserMessage = (text: string): string => {
    return `<user_message>${text}</user_message>`;
  };

  // Wrap context messages with <user_context> tags
  const wrapContextMessage = (content: string): string => {
    return `<user_context>${content}</user_context>`;
  };

  // Build messages array: system prompt, then context messages, then user messages
  const messagesWithSystem: Array<Omit<UIMessage, 'id'>> = [
    {
      role: 'user',
      parts: [{ type: 'text', text: systemPrompt }],
    },
    // Add context messages if provided
    ...(contextMessages && contextMessages.length > 0
      ? [{
          role: 'user' as const,
          parts: [{
            type: 'text' as const,
            text: wrapContextMessage(
              contextMessages.map((ctx, i) => `${ctx.question}\n${ctx.answer}`).join('\n---\n'),
            )
          }],
        }]
      : []
    ),
    ...messages.map(({ id, ...message }) => {
      // Wrap text parts in user messages with tags
      if (message.role === 'user') {
        return {
          ...message,
          parts: message.parts.map((part) => {
            if (part.type === 'text') {
              return { ...part, text: wrapUserMessage(part.text) };
            }
            return part;
          }),
        };
      }
      return message;
    }),
  ];

  // Create web search and web fetch tools for Anthropic models
  const webSearchTool = anthropic.tools.webSearch_20250305();

  const result = streamText({
    model: anthropic(model),
    messages: convertToModelMessages(messagesWithSystem),
    maxOutputTokens: 16000,
    tools: webSearch ? {
      web_search: webSearchTool,
    } : undefined,
    providerOptions: {
      anthropic: {
        thinking: { type: 'enabled', budgetTokens: 16000 },
      } satisfies AnthropicProviderOptions,
    },
  });

  // send sources and reasoning back to the client
  return result.toUIMessageStreamResponse({
    sendSources: true,
    sendReasoning: true,
  });
}