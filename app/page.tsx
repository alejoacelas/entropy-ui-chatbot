'use client';

import {
  Conversation,
  ConversationContent,
  ConversationScrollButton,
} from '@/components/ai-elements/conversation';
import { Message, MessageContent } from '@/components/ai-elements/message';
import {
  PromptInput,
  PromptInputActionAddAttachments,
  PromptInputActionMenu,
  PromptInputActionMenuContent,
  PromptInputActionMenuTrigger,
  PromptInputAttachment,
  PromptInputAttachments,
  PromptInputBody,
  PromptInputButton,
  type PromptInputMessage,
  PromptInputModelSelect,
  PromptInputModelSelectContent,
  PromptInputModelSelectItem,
  PromptInputModelSelectTrigger,
  PromptInputModelSelectValue,
  PromptInputSubmit,
  PromptInputTextarea,
  PromptInputFooter,
  PromptInputTools,
} from '@/components/ai-elements/prompt-input';
import { Action, Actions } from '@/components/ai-elements/actions';
import { Fragment, useState, useEffect } from 'react';
import { useChat } from '@ai-sdk/react';
import { Response } from '@/components/ai-elements/response';
import { CopyIcon, GlobeIcon, RefreshCcwIcon } from 'lucide-react';
import {
  Source,
  Sources,
  SourcesContent,
  SourcesTrigger,
} from '@/components/ai-elements/sources';
import {
  Reasoning,
  ReasoningContent,
  ReasoningTrigger,
} from '@/components/ai-elements/reasoning';
import { Loader } from '@/components/ai-elements/loader';
import { Questionnaire, type QuestionnaireAnswers } from '@/components/questionnaire';
import {
  InlineCitation,
  InlineCitationCard,
  InlineCitationCardTrigger,
  InlineCitationCardBody,
  InlineCitationCarousel,
  InlineCitationCarouselContent,
  InlineCitationCarouselItem,
  InlineCitationCarouselHeader,
  InlineCitationCarouselIndex,
  InlineCitationSource,
  InlineCitationQuote,
} from '@/components/ai-elements/inline-citation';

const models = [
  {
    name: 'Claude 4.5 Sonnet',
    value: 'claude-sonnet-4-5-20250929',
  },
];

const QUESTIONNAIRE_STORAGE_KEY = 'questionnaire_completed';
const QUESTIONNAIRE_ANSWERS_KEY = 'questionnaire_answers';

const ChatBotDemo = () => {
  const [showQuestionnaire, setShowQuestionnaire] = useState<boolean | null>(null);
  const [questionnaireAnswers, setQuestionnaireAnswers] = useState<QuestionnaireAnswers | null>(null);
  const [input, setInput] = useState('');
  const [model, setModel] = useState<string>(models[0].value);
  const [webSearch, setWebSearch] = useState(true);
  const { messages, sendMessage, status, regenerate } = useChat();

  // Check if questionnaire has been completed
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const completed = localStorage.getItem(QUESTIONNAIRE_STORAGE_KEY);
      const answers = localStorage.getItem(QUESTIONNAIRE_ANSWERS_KEY);
      setShowQuestionnaire(completed !== 'true');
      if (answers) {
        try {
          setQuestionnaireAnswers(JSON.parse(answers));
        } catch {
          // Ignore parse errors
        }
      }
    }
  }, []);

  const handleQuestionnaireComplete = (answers: QuestionnaireAnswers) => {
    localStorage.setItem(QUESTIONNAIRE_STORAGE_KEY, 'true');
    localStorage.setItem(QUESTIONNAIRE_ANSWERS_KEY, JSON.stringify(answers));
    setQuestionnaireAnswers(answers);
    setShowQuestionnaire(false);
  };

  const handleQuestionnaireSkip = () => {
    localStorage.setItem(QUESTIONNAIRE_STORAGE_KEY, 'true');
    setShowQuestionnaire(false);
  };

  const handleSubmit = (message: PromptInputMessage) => {
    const hasText = Boolean(message.text);
    const hasAttachments = Boolean(message.files?.length);

    if (!(hasText || hasAttachments)) {
      return;
    }

    // Only send context messages on the first message
    const isFirstMessage = messages.length === 0;

    sendMessage(
      { 
        text: message.text || 'Sent with attachments',
        files: message.files 
      },
      {
        body: {
          model: model,
          webSearch: webSearch,
          ...(isFirstMessage && questionnaireAnswers?.answers
            ? { contextMessages: questionnaireAnswers.answers }
            : {}),
        },
      },
    );
    setInput('');
  };

  // Show loading state while checking questionnaire status
  if (showQuestionnaire === null) {
    return null;
  }

  // Show questionnaire if not completed
  if (showQuestionnaire) {
    return <Questionnaire onComplete={handleQuestionnaireComplete} onSkip={handleQuestionnaireSkip} />;
  }

  return (
    <div className="max-w-4xl mx-auto p-6 relative size-full h-screen">
      <div className="flex flex-col h-full">
        <Conversation className="h-full">
          <ConversationContent>
            {messages.map((message) => {
              console.log('[FRONTEND] Rendering message with', message.parts.length, 'parts');
              console.log('[FRONTEND] Part types:', message.parts.map((p: any) => p.type));

              const isLastMessage = message.id === messages.at(-1)?.id;
              const allText = message.parts.filter(p => p.type === 'text').map(p => p.text).join('');

              // Group parts into message blocks (text/citation sequences vs reasoning)
              const messageBlocks: Array<{ type: 'content' | 'reasoning'; parts: any[] }> = [];
              let currentContentBlock: any[] = [];

              message.parts.forEach((part: any) => {
                if (part.type === 'text' || part.type === 'citation') {
                  currentContentBlock.push(part);
                } else if (part.type === 'reasoning') {
                  // If we have accumulated content, save it
                  if (currentContentBlock.length > 0) {
                    messageBlocks.push({ type: 'content', parts: currentContentBlock });
                    currentContentBlock = [];
                  }
                  // Add reasoning as its own block
                  messageBlocks.push({ type: 'reasoning', parts: [part] });
                } else if (part.type !== 'source-url') {
                  // For other non-source-url parts, add to current content block
                  currentContentBlock.push(part);
                }
              });

              // Don't forget remaining content
              if (currentContentBlock.length > 0) {
                messageBlocks.push({ type: 'content', parts: currentContentBlock });
              }

              return (
                <div key={message.id}>
                  {message.role === 'assistant' && message.parts.filter((part) => part.type === 'source-url').length > 0 && (
                    <Sources>
                      <SourcesTrigger
                        count={
                          message.parts.filter(
                            (part) => part.type === 'source-url',
                          ).length
                        }
                      />
                      {message.parts.filter((part) => part.type === 'source-url').map((part, i) => (
                        <SourcesContent key={`${message.id}-${i}`}>
                          <Source
                            key={`${message.id}-${i}`}
                            href={part.url}
                            title={part.url}
                          />
                        </SourcesContent>
                      ))}
                    </Sources>
                  )}
                  {(() => {
                    // Track citation counter across all blocks in this message
                    let citationCounter = 0;

                    return messageBlocks.map((block, blockIdx) => {
                      if (block.type === 'content') {
                        // Check if this block has any citations
                        const hasCitations = block.parts.some((p: any) => p.type === 'citation');

                        return (
                          <Fragment key={`${message.id}-block-${blockIdx}`}>
                            <Message from={message.role}>
                              <MessageContent>
                                {hasCitations ? (
                                  // Render inline with citations
                                  <div className="prose prose-sm max-w-none">
                                    {block.parts.map((part: any, partIdx: number) => {
                                      if (part.type === 'text') {
                                        return <Fragment key={`${message.id}-${blockIdx}-${partIdx}`}>{part.text}</Fragment>;
                                      } else if (part.type === 'citation') {
                                        citationCounter++;
                                        const currentCitationNumber = citationCounter.toString();
                                        console.log('[FRONTEND] Rendering inline citation:', part, 'number:', currentCitationNumber);
                                        return (
                                          <InlineCitation key={`${message.id}-${blockIdx}-${partIdx}`} className="gap-0">
                                            <InlineCitationCard>
                                              <InlineCitationCardTrigger
                                                sources={[currentCitationNumber]}
                                                className="px-1 py-0" style={{ background: "oklch(92.9% 0.013 255.508)" }} 
                                              >
                                                {currentCitationNumber}
                                              </InlineCitationCardTrigger>
                                              <InlineCitationCardBody>
                                                <InlineCitationCarousel>
                                                  <InlineCitationCarouselHeader>
                                                    <InlineCitationCarouselIndex />
                                                  </InlineCitationCarouselHeader>
                                                  <InlineCitationCarouselContent>
                                                    <InlineCitationCarouselItem>
                                                      <InlineCitationSource
                                                        title={part.title}
                                                        url={part.url}
                                                        description={part.description}
                                                      />
                                                      {part.citedText && (
                                                        <InlineCitationQuote>
                                                          {part.citedText}
                                                        </InlineCitationQuote>
                                                      )}
                                                    </InlineCitationCarouselItem>
                                                  </InlineCitationCarouselContent>
                                                </InlineCitationCarousel>
                                              </InlineCitationCardBody>
                                            </InlineCitationCard>
                                          </InlineCitation>
                                        );
                                      }
                                      return null;
                                    })}
                                  </div>
                                ) : (
                                  // Use Response for markdown processing when no citations
                                  <Response>
                                    {block.parts.map((p: any) => p.text).join('')}
                                  </Response>
                                )}
                              </MessageContent>
                            </Message>
                            {message.role === 'assistant' && isLastMessage && blockIdx === messageBlocks.length - 1 && (
                              <Actions className="mt-2">
                                <Action
                                  onClick={() => regenerate()}
                                  label="Retry"
                                >
                                  <RefreshCcwIcon className="size-3" />
                                </Action>
                                <Action
                                  onClick={() =>
                                    navigator.clipboard.writeText(allText)
                                  }
                                  label="Copy"
                                >
                                  <CopyIcon className="size-3" />
                                </Action>
                              </Actions>
                            )}
                          </Fragment>
                        );
                      } else if (block.type === 'reasoning') {
                        const part = block.parts[0];
                        const isLastBlock = blockIdx === messageBlocks.length - 1;
                        return (
                          <Reasoning
                            key={`${message.id}-block-${blockIdx}`}
                            className="w-full"
                            isStreaming={status === 'streaming' && isLastBlock && isLastMessage}
                          >
                            <ReasoningTrigger />
                            <ReasoningContent>{part.text}</ReasoningContent>
                          </Reasoning>
                        );
                      }
                      return null;
                    });
                  })()}
                </div>
              );
            })}
            {status === 'submitted' && <Loader />}
          </ConversationContent>
          <ConversationScrollButton />
        </Conversation>

        <PromptInput onSubmit={handleSubmit} className="mt-4" globalDrop multiple>
          <PromptInputBody>
            <PromptInputAttachments>
              {(attachment) => <PromptInputAttachment data={attachment} />}
            </PromptInputAttachments>
            <PromptInputTextarea
              onChange={(e) => setInput(e.target.value)}
              value={input}
            />
          </PromptInputBody>
          <PromptInputFooter>
            <PromptInputTools>
              <PromptInputActionMenu>
                <PromptInputActionMenuTrigger />
                <PromptInputActionMenuContent>
                  <PromptInputActionAddAttachments />
                </PromptInputActionMenuContent>
              </PromptInputActionMenu>
              <PromptInputButton
                variant={webSearch ? 'default' : 'ghost'}
                onClick={() => setWebSearch(!webSearch)}
              >
                <GlobeIcon size={16} />
                <span>Search</span>
              </PromptInputButton>
              <PromptInputModelSelect
                onValueChange={(value) => {
                  setModel(value);
                }}
                value={model}
              >
                <PromptInputModelSelectTrigger>
                  <PromptInputModelSelectValue />
                </PromptInputModelSelectTrigger>
                <PromptInputModelSelectContent>
                  {models.map((model) => (
                    <PromptInputModelSelectItem key={model.value} value={model.value}>
                      {model.name}
                    </PromptInputModelSelectItem>
                  ))}
                </PromptInputModelSelectContent>
              </PromptInputModelSelect>
            </PromptInputTools>
            <PromptInputSubmit disabled={!input && !status} status={status} />
          </PromptInputFooter>
        </PromptInput>
      </div>
    </div>
  );
};

export default ChatBotDemo;