import { streamText } from 'ai';
import { anthropic, AnthropicProviderOptions } from '@ai-sdk/anthropic';

// Allow streaming responses up to 120 seconds
export const maxDuration = 120;

export async function POST(req: Request) {
  const { prompt }: { prompt: string } = await req.json();

  // Create web search and web fetch tools for inline citations
  const webSearchTool = anthropic.tools.webSearch_20250305();
  const webFetchTool = anthropic.tools.webFetch_20250910();

  const result = streamText({
    model: 'anthropic/claude-4.5-sonnet',
    prompt,
    maxOutputTokens: 16000,
    tools: {
      web_search: webSearchTool,
      web_fetch: webFetchTool,
    },
    providerOptions: {
      anthropic: {
        thinking: { type: 'enabled', budgetTokens: 16000 },
      } satisfies AnthropicProviderOptions,
    },
  });

  // send sources back to the client for inline citations
  return result.toUIMessageStreamResponse({
    sendSources: true,
  });
}
