import { streamText, UIMessage, convertToModelMessages } from 'ai';
import { anthropic } from '@ai-sdk/anthropic';

export async function POST(req: Request) {
  const { messages, model }: { messages: UIMessage[]; model: string } = await req.json();

  const webSearchTool = anthropic.tools.webSearch_20250305();

  const result = streamText({
    model: model,
    messages: convertToModelMessages(messages),
    tools: {
      web_search: webSearchTool,
    },
  });

  return result.toUIMessageStreamResponse({
    sendSources: true,
    sendReasoning: true,
  });
}