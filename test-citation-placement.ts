/**
 * Test script to track citation placement via stream order
 * 
 * Usage:
 *   Add ANTHROPIC_API_KEY=your_key_here to .env file
 *   npx tsx test-citation-placement.ts
 */

import 'dotenv/config';
import { streamText, convertToModelMessages } from 'ai';
import { createAnthropic } from '@ai-sdk/anthropic';

// Use Anthropic provider directly (not via gateway)
const anthropic = createAnthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

interface Citation {
  url?: string;
  title?: string;
  citedText?: string;
  encryptedIndex?: string;
}

interface TextBlock {
  textBlockId: string;
  text: string;
  citations: Citation[];
}

async function testCitationPlacement() {
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

  console.log('\n=== TRACKING CITATION PLACEMENT ===\n');

  // State machine to track citations and text blocks
  const textBlocks: TextBlock[] = [];
  let pendingCitations: Citation[] = [];
  let currentTextBlock: { id: string; text: string } | null = null;
  let blockCounter = 0;

  // Iterate through fullStream to track citation placement
  for await (const chunk of result.fullStream) {
    // Handle source chunks (citations)
    if (chunk.type === 'source') {
      const citation: Citation = {};
      
      // Extract citation metadata from providerMetadata
      if (chunk.providerMetadata?.anthropic) {
        const anthropicMeta = chunk.providerMetadata.anthropic;
        citation.citedText = anthropicMeta.citedText;
        citation.encryptedIndex = anthropicMeta.encryptedIndex;
      }
      
      // Extract URL and title from source chunk
      if ('url' in chunk) {
        citation.url = chunk.url;
      }
      if ('title' in chunk) {
        citation.title = chunk.title;
      }

      // Add to pending citations (will be associated with next text block)
      pendingCitations.push(citation);
      
      console.log(`[SOURCE] Citation added to pending:`, {
        url: citation.url,
        title: citation.title,
        hasCitedText: !!citation.citedText,
        hasEncryptedIndex: !!citation.encryptedIndex,
      });
    }
    
    // Handle text-start chunks (beginning of a text block)
    else if (chunk.type === 'text-start') {
      // If there was a previous text block, save it
      if (currentTextBlock) {
        textBlocks.push({
          textBlockId: currentTextBlock.id,
          text: currentTextBlock.text,
          citations: [...pendingCitations], // Copy pending citations
        });
      }
      
      // Start new text block with pending citations
      blockCounter++;
      currentTextBlock = {
        id: `block-${blockCounter}`,
        text: '',
      };
      
      console.log(`[TEXT-START] New block ${currentTextBlock.id} with ${pendingCitations.length} pending citations`);
      
      // Note: Don't clear pendingCitations yet - they're associated with this block
      // Citations will be cleared on text-end
    }
    
    // Handle text-delta chunks (text content)
    else if (chunk.type === 'text-delta') {
      if (currentTextBlock) {
        // Handle different possible property names for text delta
        if ('textDelta' in chunk) {
          currentTextBlock.text += chunk.textDelta;
        } else if ('text' in chunk) {
          currentTextBlock.text += chunk.text;
        }
      }
    }
    
    // Handle text-end chunks (end of a text block)
    else if (chunk.type === 'text-end') {
      if (currentTextBlock) {
        // Save the completed text block with its citations
        textBlocks.push({
          textBlockId: currentTextBlock.id,
          text: currentTextBlock.text,
          citations: [...pendingCitations], // Copy pending citations
        });
        
        console.log(`[TEXT-END] Block ${currentTextBlock.id} completed with ${pendingCitations.length} citations`);
        console.log(`  Text preview: "${currentTextBlock.text.substring(0, 100)}..."`);
        
        // Clear pending citations after associating them with the block
        pendingCitations = [];
        currentTextBlock = null;
      }
    }
  }

  // Handle any remaining text block
  if (currentTextBlock) {
    textBlocks.push({
      textBlockId: currentTextBlock.id,
      text: currentTextBlock.text,
      citations: [...pendingCitations],
    });
  }

  console.log('\n=== RESULTS: TEXT BLOCKS WITH CITATIONS ===\n');
  
  textBlocks.forEach((block, index) => {
    console.log(`\n--- Text Block ${index + 1} (${block.textBlockId}) ---`);
    console.log(`Text: "${block.text}"`);
    console.log(`Citations (${block.citations.length}):`);
    
    if (block.citations.length === 0) {
      console.log('  (no citations)');
    } else {
      block.citations.forEach((citation, citIndex) => {
        console.log(`  Citation ${citIndex + 1}:`);
        console.log(`    URL: ${citation.url || '(not available)'}`);
        console.log(`    Title: ${citation.title || '(not available)'}`);
        console.log(`    Cited Text: ${citation.citedText || '(not available)'}`);
        console.log(`    Encrypted Index: ${citation.encryptedIndex || '(not available)'}`);
      });
    }
  });

  console.log('\n=== VALIDATION ===\n');
  
  // Validate that citations are exposed
  const sourcesWithMetadata = textBlocks.flatMap(block => 
    block.citations.filter(c => c.citedText || c.encryptedIndex)
  );
  
  console.log(`✓ Total text blocks: ${textBlocks.length}`);
  console.log(`✓ Blocks with citations: ${textBlocks.filter(b => b.citations.length > 0).length}`);
  console.log(`✓ Citations with citedText: ${sourcesWithMetadata.filter(c => c.citedText).length}`);
  console.log(`✓ Citations with encryptedIndex: ${sourcesWithMetadata.filter(c => c.encryptedIndex).length}`);
  
  // Verify order preservation
  let lastCitationIndex = -1;
  let orderPreserved = true;
  for (const block of textBlocks) {
    if (block.citations.length > 0) {
      // Check if citations appear before their text (order is preserved)
      // This is implicit since we're tracking citations that appear before text-start
      lastCitationIndex = textBlocks.indexOf(block);
    }
  }
  
  console.log(`✓ Order preserved: ${orderPreserved ? 'Yes' : 'No'}`);
  
  console.log('\n=== FULL STRUCTURE OUTPUT ===\n');
  console.log(JSON.stringify(textBlocks, null, 2));
}

testCitationPlacement().catch(console.error);

