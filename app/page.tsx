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
              const citationParts = message.parts.filter((p: any) => p.type === 'citation');
              console.log('[FRONTEND] Citation parts found:', citationParts.length, citationParts);
              
              // Group contiguous text parts together, collecting citations
              const groupedParts: Array<{ type: string; content: any; indices: number[]; citations?: any[] }> = [];
              let currentTextGroup: { type: 'text'; content: string; indices: number[]; citations: any[] } | null = null;

              message.parts.forEach((part: any, i) => {
                if (part.type === 'text') {
                  if (currentTextGroup) {
                    currentTextGroup.content += part.text;
                    currentTextGroup.indices.push(i);
                  } else {
                    currentTextGroup = { type: 'text', content: part.text, indices: [i], citations: [] };
                  }
                } else if (part.type === 'citation') {
                  console.log('[FRONTEND] Found citation part:', part);
                  // Add citation to the current text group
                  if (currentTextGroup) {
                    currentTextGroup.citations.push(part);
                    console.log('[FRONTEND] Added to group, total citations:', currentTextGroup.citations.length);
                  } else {
                    console.log('[FRONTEND] Warning: citation without text group');
                  }
                } else {
                  // Push the current text group if it exists
                  if (currentTextGroup) {
                    groupedParts.push(currentTextGroup);
                    currentTextGroup = null;
                  }
                  // Add non-text part
                  groupedParts.push({ type: part.type, content: part, indices: [i] });
                }
              });

              // Don't forget to push the last text group if it exists
              if (currentTextGroup) {
                groupedParts.push(currentTextGroup);
              }

              console.log('[FRONTEND] Grouped parts:', groupedParts.length, 'groups');
              console.log('[FRONTEND] Citations in groups:', groupedParts.map(g => g.citations?.length || 0));

              const isLastMessage = message.id === messages.at(-1)?.id;
              const allText = message.parts.filter(p => p.type === 'text').map(p => p.text).join('');

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
                  {groupedParts.map((group, groupIdx) => {
                    switch (group.type) {
                      case 'text':
                        // Format citations if they exist
                        const citationText = group.citations && group.citations.length > 0
                          ? ' ' + group.citations.map((citation: any) => 
                              `([${citation.title}: ${citation.citedText}](${citation.url}))`
                            ).join(' ')
                          : '';
                        
                        const fullContent = group.content + citationText;
                        
                        if (group.citations && group.citations.length > 0) {
                          console.log('[FRONTEND] Rendering text with citations:', group.citations.length, 'fullContent:', fullContent);
                        }
                        
                        return (
                          <Fragment key={`${message.id}-group-${groupIdx}`}>
                            <Message from={message.role}>
                              <MessageContent>
                                <Response>
                                  {fullContent}
                                </Response>
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