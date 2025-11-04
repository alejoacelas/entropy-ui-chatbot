'use client';

import { useState } from 'react';
import { useChat } from '@ai-sdk/react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  InlineCitation,
  InlineCitationText,
  InlineCitationCard,
  InlineCitationCardTrigger,
  InlineCitationCardBody,
  InlineCitationCarousel,
  InlineCitationCarouselContent,
  InlineCitationCarouselItem,
  InlineCitationCarouselHeader,
  InlineCitationCarouselIndex,
  InlineCitationCarouselPrev,
  InlineCitationCarouselNext,
  InlineCitationSource,
  InlineCitationQuote,
} from '@/components/ai-elements/inline-citation';
import { Loader } from '@/components/ai-elements/loader';

// Helper to parse inline citations from text
function parseInlineCitations(text: string, sources: any[]) {
  // Look for citation patterns like [1], [2], etc.
  const citationRegex = /\[(\d+)\]/g;
  const parts: Array<{ type: 'text' | 'citation'; content: string; sourceIndices?: number[] }> = [];
  let lastIndex = 0;
  let match;

  while ((match = citationRegex.exec(text)) !== null) {
    // Add text before citation
    if (match.index > lastIndex) {
      parts.push({
        type: 'text',
        content: text.slice(lastIndex, match.index),
      });
    }

    // Add citation
    const citationNum = parseInt(match[1]);
    parts.push({
      type: 'citation',
      content: match[0],
      sourceIndices: [citationNum - 1], // Convert to 0-based index
    });

    lastIndex = match.index + match[0].length;
  }

  // Add remaining text
  if (lastIndex < text.length) {
    parts.push({
      type: 'text',
      content: text.slice(lastIndex),
    });
  }

  return parts;
}

export default function InlineCitationDemo() {
  const [prompt, setPrompt] = useState('');
  const { messages, sendMessage, status } = useChat({
    api: '/api/inline-citation-demo',
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!prompt.trim()) return;

    sendMessage(
      { text: prompt },
      {
        body: { prompt },
      }
    );
    setPrompt('');
  };

  return (
    <div className="container mx-auto max-w-4xl p-6">
      <Card>
        <CardHeader>
          <CardTitle>Inline Citation Demo</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Input Form */}
          <form onSubmit={handleSubmit} className="flex gap-2">
            <Input
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="Ask a question that requires web search..."
              className="flex-1"
            />
            <Button type="submit" disabled={status === 'streaming' || !prompt.trim()}>
              {status === 'streaming' ? 'Thinking...' : 'Ask'}
            </Button>
          </form>

          {/* Messages */}
          <div className="space-y-4">
            {messages.map((message) => {
              if (message.role === 'user') {
                return (
                  <div key={message.id} className="rounded-lg bg-muted p-4">
                    <p className="font-semibold text-sm">You:</p>
                    <p>{message.text}</p>
                  </div>
                );
              }

              // Assistant message - extract sources
              const sources = message.parts
                .filter((part) => part.type === 'source-url')
                .map((part) => ({
                  url: part.url,
                  title: part.title || new URL(part.url).hostname,
                  description: part.description || '',
                }));

              // Get text content
              const textParts = message.parts.filter((part) => part.type === 'text');
              const fullText = textParts.map((part) => part.text).join('');

              // Parse citations from text
              const citationParts = parseInlineCitations(fullText, sources);

              return (
                <div key={message.id} className="rounded-lg border p-4">
                  <p className="mb-2 font-semibold text-sm">Assistant:</p>
                  <div className="prose prose-sm max-w-none">
                    {citationParts.map((part, idx) => {
                      if (part.type === 'text') {
                        return <span key={idx}>{part.content}</span>;
                      }

                      // Render inline citation
                      const citationSources = part.sourceIndices
                        ?.map((i) => sources[i])
                        .filter(Boolean) || [];

                      if (citationSources.length === 0) {
                        return <span key={idx}>{part.content}</span>;
                      }

                      return (
                        <InlineCitation key={idx}>
                          <InlineCitationText>{part.content}</InlineCitationText>
                          <InlineCitationCard>
                            <InlineCitationCardTrigger
                              sources={citationSources.map((s) => s.url)}
                            />
                            <InlineCitationCardBody>
                              <InlineCitationCarousel>
                                <InlineCitationCarouselHeader>
                                  <InlineCitationCarouselPrev />
                                  <InlineCitationCarouselIndex />
                                  <InlineCitationCarouselNext />
                                </InlineCitationCarouselHeader>
                                <InlineCitationCarouselContent>
                                  {citationSources.map((source, sourceIdx) => (
                                    <InlineCitationCarouselItem key={sourceIdx}>
                                      <InlineCitationSource
                                        title={source.title}
                                        url={source.url}
                                        description={source.description}
                                      >
                                        {source.description && (
                                          <InlineCitationQuote>
                                            {source.description}
                                          </InlineCitationQuote>
                                        )}
                                      </InlineCitationSource>
                                    </InlineCitationCarouselItem>
                                  ))}
                                </InlineCitationCarouselContent>
                              </InlineCitationCarousel>
                            </InlineCitationCardBody>
                          </InlineCitationCard>
                        </InlineCitation>
                      );
                    })}
                  </div>

                  {/* Show sources list at bottom */}
                  {sources.length > 0 && (
                    <div className="mt-4 border-t pt-4">
                      <p className="mb-2 font-semibold text-sm">Sources:</p>
                      <ul className="list-inside list-decimal space-y-1 text-muted-foreground text-sm">
                        {sources.map((source, idx) => (
                          <li key={idx}>
                            <a
                              href={source.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="hover:underline"
                            >
                              {source.title}
                            </a>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              );
            })}

            {status === 'streaming' && <Loader />}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
