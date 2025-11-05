/**
 * Simple test script to inspect Anthropic API response structure
 * 
 * Usage:
 *   Add ANTHROPIC_API_KEY=your_key_here to .env file
 *   npx tsx test-anthropic-response.ts
 */

import 'dotenv/config';
import { streamText, convertToModelMessages } from 'ai';
import { createAnthropic } from '@ai-sdk/anthropic';

// Use Anthropic provider directly (not via gateway)
const anthropic = createAnthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

async function testAnthropicResponse() {
  if (!process.env.ANTHROPIC_API_KEY) {
    console.error('Error: ANTHROPIC_API_KEY environment variable is not set');
    console.log('Please add ANTHROPIC_API_KEY=your_key_here to your .env file');
    process.exit(1);
  }

  const webSearchTool = anthropic.tools.webSearch_20250305();

  const result = streamText({
    model: anthropic('claude-sonnet-4-5-20250929'),
    messages: convertToModelMessages([
      {
        role: 'user',
        parts: [{ type: 'text', text: 'What is the latest news about AI?' }],
      },
    ]),
    tools: {
      web_search: webSearchTool,
    },
  });

  console.log('\n=== COLLECTING DATA ===\n');
  
  // Wait for stream to complete and collect all data
  const [text, sources, reasoning, toolCalls] = await Promise.all([
    result.text,
    result.sources,
    result.reasoning,
    result.toolCalls,
  ]);

  console.log('\n=== TEXT ===\n');
  console.log(text);

  console.log('\n=== SOURCES (Full Structure) ===\n');
  console.log(JSON.stringify(sources, null, 2));

  console.log('\n=== REASONING ===\n');
  console.log(JSON.stringify(reasoning, null, 2));

  console.log('\n=== TOOL CALLS ===\n');
  console.log(JSON.stringify(toolCalls, null, 2));

  console.log('\n=== FULL STREAM CHUNKS ===\n');
  for await (const chunk of result.fullStream) {
    console.log(JSON.stringify(chunk, null, 2));
  }
}

testAnthropicResponse().catch(console.error);

