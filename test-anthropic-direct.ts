/**
 * Direct Anthropic API streaming test script
 * 
 * Usage:
 *   Add ANTHROPIC_API_KEY=your_key_here to .env file
 *   npx tsx test-anthropic-direct.ts
 */

import 'dotenv/config';
import Anthropic from '@anthropic-ai/sdk';

async function testAnthropicDirect() {
  if (!process.env.ANTHROPIC_API_KEY) {
    console.error('Error: ANTHROPIC_API_KEY environment variable is not set');
    console.log('Please add ANTHROPIC_API_KEY=your_key_here to your .env file');
    process.exit(1);
  }

  const anthropic = new Anthropic({
    apiKey: process.env.ANTHROPIC_API_KEY,
  });

  console.log('\n=== STREAMING DIRECT ANTHROPIC API ===\n');

  const stream = await anthropic.messages.stream({
    model: 'claude-sonnet-4-5-20250929',
    max_tokens: 1024,
    messages: [
      {
        role: 'user',
        content: 'What is the latest news about AI?',
      },
    ],
    tools: [
      {
        type: 'web_search_20250305',
        name: 'web_search',
      },
    ],
  });

  console.log('\n=== RAW STREAM EVENTS ===\n');

  let fullText = '';
  const allEvents: any[] = [];

  for await (const event of stream) {
    allEvents.push(event);
    
    // Log each event type and its structure
    console.log(`\n--- Event Type: ${event.type} ---`);
    console.log(JSON.stringify(event, null, 2));

    // Collect text if it's a content block delta
    if (event.type === 'content_block_delta') {
      if (event.delta.type === 'text') {
        fullText += event.delta.text;
      }
    }
  }

  console.log('\n=== ACCUMULATED TEXT ===\n');
  console.log(fullText);

  console.log('\n=== SUMMARY OF ALL EVENTS ===\n');
  const eventTypes = allEvents.map(e => e.type);
  const eventTypeCounts: Record<string, number> = {};
  eventTypes.forEach(type => {
    eventTypeCounts[type] = (eventTypeCounts[type] || 0) + 1;
  });
  console.log('Event type counts:', JSON.stringify(eventTypeCounts, null, 2));

  console.log('\n=== SEARCHING FOR CITATION DATA ===\n');
  
  // Look for citation-related fields in any event
  const citationEvents = allEvents.filter(e => {
    const str = JSON.stringify(e);
    return str.includes('citation') || 
           str.includes('cited_text') || 
           str.includes('web_search_result_location') ||
           str.includes('document_index') ||
           str.includes('start_char_index') ||
           str.includes('end_char_index');
  });

  if (citationEvents.length > 0) {
    console.log(`Found ${citationEvents.length} events with citation-related data:\n`);
    citationEvents.forEach((event, i) => {
      console.log(`Citation Event ${i + 1}:`);
      console.log(JSON.stringify(event, null, 2));
      console.log('\n');
    });
  } else {
    console.log('No citation-related events found in the stream.');
  }
}

testAnthropicDirect().catch(console.error);

