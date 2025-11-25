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
import { CopyIcon, GlobeIcon, RefreshCcwIcon, ClipboardListIcon, ThumbsUpIcon, ThumbsDownIcon } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
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
import { Questionnaire, type QuestionnaireAnswers, type QuestionnaireAnswer } from '@/components/questionnaire';
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

const teamSizeOptions = ['1 - Just me', '2-5', '6-15', '15+'];

const organizationTypeOptions = [
  'Individual/sole proprietor',
  'Fiscally sponsored project',
  'SparkWell participant',
  'Nonprofit (US)',
  'Nonprofit (UK)',
  'Nonprofit (other)',
  'US 501(c)(3) charity',
  'For-profit entity',
  'Not yet registered/incorporated',
];

const QUESTION_TEXTS = {
  question1: {
    main: 'Where is your organization registered?',
    subtitle: 'Optional: Do you have staff, funding, or operations elsewhere?',
  },
  question2: {
    main: 'How many people work at your organization?',
  },
  question3: {
    main: 'Which of these apply to you?',
    subtitle: '(check all that apply)',
  },
};

const ChatBotDemo = () => {
  const [showQuestionnaire, setShowQuestionnaire] = useState<boolean | null>(null);
  const [questionnaireAnswers, setQuestionnaireAnswers] = useState<QuestionnaireAnswers | null>(null);
  const [input, setInput] = useState('');
  const [model, setModel] = useState<string>(models[0].value);
  const [webSearch, setWebSearch] = useState(true);
  const [logConversations, setLogConversations] = useState(true);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editAnswers, setEditAnswers] = useState<{
    location?: string;
    teamSize?: string;
    organizationType?: string[];
  }>({});
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

  const handleOpenEditModal = () => {
    // Parse existing answers from questionnaireAnswers
    const parsedAnswers: {
      location?: string;
      teamSize?: string;
      organizationType?: string[];
    } = {};

    if (questionnaireAnswers?.answers) {
      questionnaireAnswers.answers.forEach((answer) => {
        if (answer.question.includes(QUESTION_TEXTS.question1.main)) {
          parsedAnswers.location = answer.answer;
        } else if (answer.question.includes(QUESTION_TEXTS.question2.main)) {
          parsedAnswers.teamSize = answer.answer;
        } else if (answer.question.includes(QUESTION_TEXTS.question3.main)) {
          parsedAnswers.organizationType = answer.answer.split(', ').filter(Boolean);
        }
      });
    }

    setEditAnswers(parsedAnswers);
    setShowEditModal(true);
  };

  const handleSaveAnswers = () => {
    // Convert editAnswers to QuestionnaireAnswers format
    const newAnswers: QuestionnaireAnswer[] = [];

    if (editAnswers.location) {
      const questionText = `${QUESTION_TEXTS.question1.main} ${QUESTION_TEXTS.question1.subtitle}`;
      newAnswers.push({ question: questionText, answer: editAnswers.location });
    }

    if (editAnswers.teamSize) {
      newAnswers.push({ question: QUESTION_TEXTS.question2.main, answer: editAnswers.teamSize });
    }

    if (editAnswers.organizationType && editAnswers.organizationType.length > 0) {
      const questionText = `${QUESTION_TEXTS.question3.main} ${QUESTION_TEXTS.question3.subtitle}`;
      newAnswers.push({ question: questionText, answer: editAnswers.organizationType.join(', ') });
    }

    // Save to localStorage and state
    const answersObj = { answers: newAnswers };
    localStorage.setItem(QUESTIONNAIRE_ANSWERS_KEY, JSON.stringify(answersObj));
    localStorage.setItem(QUESTIONNAIRE_STORAGE_KEY, 'true');
    setQuestionnaireAnswers(answersObj);
    setShowEditModal(false);
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
                        // Collect citations and build markdown text
                        const citations: any[] = [];
                        let markdownText = '';

                        block.parts.forEach((part: any) => {
                          if (part.type === 'text') {
                            markdownText += part.text;
                          } else if (part.type === 'citation') {
                            citationCounter++;
                            citations.push({ ...part, number: citationCounter });
                            // Add inline citation as markdown link
                            markdownText += `[<sup>${citationCounter}</sup>](${part.url})`;
                          }
                        });

                        return (
                          <Fragment key={`${message.id}-block-${blockIdx}`}>
                            <Message from={message.role}>
                              <MessageContent>
                                <Response>{markdownText}</Response>

                                {/* Render citations list at the end */}
                                {citations.length > 0 && (
                                  <div className="mt-4 space-y-2 border-t pt-4">
                                    {citations.map((citation) => (
                                      <InlineCitation key={`citation-${citation.number}`} className="gap-2">
                                        <InlineCitationCard>
                                          <InlineCitationCardTrigger
                                            sources={[citation.number.toString()]}
                                            className="px-1 py-0"
                                            style={{ background: "oklch(92.9% 0.013 255.508)" }}
                                          >
                                            {citation.number}
                                          </InlineCitationCardTrigger>
                                          <InlineCitationCardBody>
                                            <InlineCitationCarousel>
                                              <InlineCitationCarouselHeader>
                                                <InlineCitationCarouselIndex />
                                              </InlineCitationCarouselHeader>
                                              <InlineCitationCarouselContent>
                                                <InlineCitationCarouselItem>
                                                  <InlineCitationSource
                                                    title={citation.title}
                                                    url={citation.url}
                                                    description={citation.description}
                                                  />
                                                  {citation.citedText && (
                                                    <InlineCitationQuote>
                                                      {citation.citedText}
                                                    </InlineCitationQuote>
                                                  )}
                                                </InlineCitationCarouselItem>
                                              </InlineCitationCarouselContent>
                                            </InlineCitationCarousel>
                                          </InlineCitationCardBody>
                                        </InlineCitationCard>
                                      </InlineCitation>
                                    ))}
                                  </div>
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
              <PromptInputButton
                variant="ghost"
                onClick={handleOpenEditModal}
              >
                <ClipboardListIcon size={16} />
                <span>Context</span>
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
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground">Log conversations</span>
                    <Switch
                      checked={logConversations}
                      onCheckedChange={setLogConversations}
                    />
                  </div>
                </TooltipTrigger>
                <TooltipContent side="top">
                  <p>Logged conversations will be manually reviewed to improve Aerin</p>
                </TooltipContent>
              </Tooltip>
            </PromptInputTools>
            <PromptInputSubmit disabled={!input && !status} status={status} />
          </PromptInputFooter>
        </PromptInput>
      </div>

      {/* Edit Questionnaire Modal */}
      <Dialog open={showEditModal} onOpenChange={setShowEditModal}>
        <DialogContent className="max-w-4xl max-h-[85vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>Edit Organization Context</DialogTitle>
          </DialogHeader>

          <div className="space-y-8 py-4 overflow-y-auto flex-1 px-2">
            {/* Question 1: Location */}
            <div className="space-y-4 px-1">
              <div className="text-base font-semibold leading-relaxed">{QUESTION_TEXTS.question1.main}</div>
              <p className="text-sm text-muted-foreground leading-relaxed">{QUESTION_TEXTS.question1.subtitle}</p>
              <Input
                placeholder="e.g., California. Staff in US and UK"
                value={editAnswers.location || ''}
                onChange={(e) => {
                  setEditAnswers({
                    ...editAnswers,
                    location: e.target.value,
                  });
                }}
                className="h-12 text-base"
              />
            </div>

            {/* Question 2: Team Size */}
            <div className="space-y-4 px-1">
              <div className="text-base font-semibold leading-relaxed">{QUESTION_TEXTS.question2.main}</div>
              <RadioGroup
                value={editAnswers.teamSize || ''}
                onValueChange={(value) => setEditAnswers({ ...editAnswers, teamSize: value })}
                className="space-y-3"
              >
                {teamSizeOptions.map((option) => (
                  <label
                    key={option}
                    className={cn(
                      'flex items-center gap-3 rounded-lg border p-4 cursor-pointer transition-colors',
                      'hover:bg-accent',
                      editAnswers.teamSize === option && 'border-primary bg-accent'
                    )}
                  >
                    <RadioGroupItem value={option} id={`edit-${option}`} />
                    <span className="text-base font-medium cursor-pointer flex-1">{option}</span>
                  </label>
                ))}
              </RadioGroup>
            </div>

            {/* Question 3: Organization Type */}
            <div className="space-y-4 px-1">
              <div className="text-base font-semibold leading-relaxed">{QUESTION_TEXTS.question3.main}</div>
              <p className="text-sm text-muted-foreground leading-relaxed">{QUESTION_TEXTS.question3.subtitle}</p>
              <div className="space-y-3">
                {organizationTypeOptions.map((option) => (
                  <label
                    key={option}
                    className={cn(
                      'flex items-center gap-3 rounded-lg border p-4 cursor-pointer transition-colors',
                      'hover:bg-accent',
                      editAnswers.organizationType?.includes(option) && 'border-primary bg-accent'
                    )}
                  >
                    <Checkbox
                      checked={editAnswers.organizationType?.includes(option) || false}
                      onCheckedChange={(checked) => {
                        const current = editAnswers.organizationType || [];
                        if (checked) {
                          setEditAnswers({
                            ...editAnswers,
                            organizationType: [...current, option],
                          });
                        } else {
                          setEditAnswers({
                            ...editAnswers,
                            organizationType: current.filter((t) => t !== option),
                          });
                        }
                      }}
                      id={`edit-${option}`}
                    />
                    <span className="text-base font-medium cursor-pointer flex-1">{option}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>

          <DialogFooter className="pt-4 border-t">
            <Button variant="ghost" onClick={() => setShowEditModal(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveAnswers}>
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ChatBotDemo;