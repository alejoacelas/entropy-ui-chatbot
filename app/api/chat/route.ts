import { streamText, UIMessage, convertToModelMessages } from 'ai';
import { anthropic, AnthropicProviderOptions } from '@ai-sdk/anthropic';
import { readFile } from 'fs/promises';
import { join } from 'path';

// Allow streaming responses up to 120 seconds for longer reasoning and outputs
export const maxDuration = 120;

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
  }: { 
    messages: UIMessage[]; 
    model: string; 
    webSearch: boolean;
  } = await req.json();

  const system = await getSystemPrompt();

  // Create web search and web fetch tools for Anthropic models
  const webSearchTool = anthropic.tools.webSearch_20250305();
  const webFetchTool = anthropic.tools.webFetch_20250910();

  const result = streamText({
    model: model,
    messages: convertToModelMessages(messages),
    system,
    maxOutputTokens: 16000,
    tools: webSearch ? {
      web_search: webSearchTool,
      web_fetch: webFetchTool,
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