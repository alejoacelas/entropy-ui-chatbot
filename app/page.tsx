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

const models = [
  {
    name: 'Claude 4.5 Sonnet',
    value: 'anthropic/claude-4.5-sonnet',
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
              // Process parts to track citations and text with inline footnotes
              // Citations appear BEFORE the text they reference in the stream
              // We need to insert footnote markers right after the text that follows each citation
              const groupedParts: Array<{ 
                type: string; 
                content: any; 
                indices: number[];
                textSegments?: Array<{ text: string; citations: Array<{ url: string; title?: string; footnoteNumber: number }> }>;
                citations?: Array<{ url: string; title?: string; footnoteNumber: number }>;
              }> = [];
              
              let currentTextGroup: { 
                type: 'text'; 
                textSegments: Array<{ text: string; citations: Array<{ url: string; title?: string; footnoteNumber: number }> }>;
                indices: number[];
                allCitations: Array<{ url: string; title?: string; footnoteNumber: number }>;
              } | null = null;
              
              let pendingCitations: Array<{ url: string; title?: string }> = [];
              let footnoteCounter = 0;

              message.parts.forEach((part, i) => {
                if (part.type === 'source-url') {
                  // Citation appears - add to pending citations
                  // These will be inserted right after the next text delta
                  const citation = {
                    url: part.url || '',
                    title: part.title || part.url || '',
                  };
                  pendingCitations.push(citation);
                } else if (part.type === 'text') {
                  // Start text group if needed
                  if (!currentTextGroup) {
                    currentTextGroup = { 
                      type: 'text', 
                      textSegments: [],
                      indices: [],
                      allCitations: [],
                    };
                  }
                  
                  // If we have pending citations, start a new text segment
                  // Otherwise, continue the current segment
                  if (pendingCitations.length > 0) {
                    // Assign footnote numbers to pending citations
                    const citationsWithNumbers = pendingCitations.map((citation) => {
                      footnoteCounter++;
                      return {
                        ...citation,
                        footnoteNumber: footnoteCounter,
                      };
                    });
                    
                    // Add citations to the group's citation list
                    currentTextGroup.allCitations.push(...citationsWithNumbers);
                    
                    // Start a new text segment with these citations
                    currentTextGroup.textSegments.push({
                      text: part.text,
                      citations: citationsWithNumbers,
                    });
                    
                    pendingCitations = []; // Clear pending
                  } else {
                    // Continue current segment (no citations)
                    if (currentTextGroup.textSegments.length === 0) {
                      // Start first segment
                      currentTextGroup.textSegments.push({
                        text: part.text,
                        citations: [],
                      });
                    } else {
                      // Append to last segment
                      const lastSegment = currentTextGroup.textSegments[currentTextGroup.textSegments.length - 1];
                      lastSegment.text += part.text;
                    }
                  }
                  
                  currentTextGroup.indices.push(i);
                } else {
                  // Non-text, non-source part encountered
                  // Finalize current text group if it exists
                  if (currentTextGroup) {
                    groupedParts.push({
                      type: 'text',
                      content: currentTextGroup.textSegments,
                      indices: currentTextGroup.indices,
                      citations: currentTextGroup.allCitations,
                    });
                    currentTextGroup = null;
                  }
                  // Add non-text part
                  groupedParts.push({ type: part.type, content: part, indices: [i] });
                }
              });

              // Don't forget to push the last text group if it exists
              if (currentTextGroup) {
                groupedParts.push({
                  type: 'text',
                  content: currentTextGroup.textSegments,
                  indices: currentTextGroup.indices,
                  citations: currentTextGroup.allCitations,
                });
              }

              const isLastMessage = message.id === messages.at(-1)?.id;
              const allText = message.parts.filter(p => p.type === 'text').map(p => p.text).join('');

              return (
                <div key={message.id}>
                  {groupedParts.map((group, groupIdx) => {
                    switch (group.type) {
                      case 'text':
                        // Render text with inline footnotes
                        // Citations are inserted right after the text delta that followed them
                        const renderTextWithFootnotes = () => {
                          const textSegments = group.content as Array<{ text: string; citations: Array<{ url: string; title?: string; footnoteNumber: number }> }>;
                          const allCitations = group.citations || [];
                          
                          if (!textSegments || textSegments.length === 0) {
                            return <Response></Response>;
                          }

                          // Build text with inline footnote markers
                          // Each segment has its text followed by its citations' footnote markers
                          return (
                            <div className="space-y-3">
                              <Response>
                                {textSegments.map((segment, segIdx) => (
                                  <span key={`segment-${segIdx}`}>
                                    {segment.text}
                                    {segment.citations.map((citation, citIdx) => (
                                      <sup
                                        key={`footnote-${segIdx}-${citIdx}`}
                                        className="text-blue-500 hover:text-blue-700 cursor-pointer ml-0.5 font-medium"
                                        title={citation.title}
                                      >
                                        {citation.footnoteNumber}
                                      </sup>
                                    ))}
                                  </span>
                                ))}
                              </Response>
                              {allCitations.length > 0 && (
                                <div className="text-xs text-gray-600 mt-2 pt-2 border-t border-gray-200 space-y-1">
                                  <div className="font-semibold mb-1 text-gray-700">Sources:</div>
                                  {allCitations.map((citation, idx) => (
                                    <div key={`source-${idx}`} className="flex gap-2">
                                      <span className="font-semibold text-gray-700 flex-shrink-0">
                                        {citation.footnoteNumber}.
                                      </span>
                                      <a
                                        href={citation.url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-blue-500 hover:text-blue-700 hover:underline break-words"
                                      >
                                        {citation.title || citation.url}
                                      </a>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          );
                        };

                        return (
                          <Fragment key={`${message.id}-group-${groupIdx}`}>
                            <Message from={message.role}>
                              <MessageContent>
                                {renderTextWithFootnotes()}
                              </MessageContent>
                            </Message>
                            {message.role === 'assistant' && isLastMessage && groupIdx === groupedParts.length - 1 && (
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
                      case 'reasoning':
                        const part = group.content;
                        const isLastPart = groupIdx === groupedParts.length - 1;
                        return (
                          <Reasoning
                            key={`${message.id}-group-${groupIdx}`}
                            className="w-full"
                            isStreaming={status === 'streaming' && isLastPart && isLastMessage}
                          >
                            <ReasoningTrigger />
                            <ReasoningContent>{part.text}</ReasoningContent>
                          </Reasoning>
                        );
                      default:
                        return null;
                    }
                  })}
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