'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Checkbox } from '@/components/ui/checkbox';
import { cn } from '@/lib/utils';

export interface QuestionnaireAnswer {
  question: string;
  answer: string;
}

export interface QuestionnaireAnswers {
  answers: QuestionnaireAnswer[];
}

interface QuestionnaireProps {
  onComplete: (answers: QuestionnaireAnswers) => void;
  onSkip: () => void;
}

type Screen = 'landing' | 'question1' | 'question2' | 'question3' | 'complete';

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

export function Questionnaire({ onComplete, onSkip }: QuestionnaireProps) {
  const [screen, setScreen] = useState<Screen>('landing');
  const [answers, setAnswers] = useState<{
    location?: string;
    teamSize?: string;
    organizationType?: string[];
  }>({});
  const [questionnaireAnswers, setQuestionnaireAnswers] = useState<QuestionnaireAnswer[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);

  const canContinue = useCallback(() => {
    if (screen === 'question1') {
      return true; // Location is optional
    } else if (screen === 'question2') {
      return Boolean(answers.teamSize);
    } else if (screen === 'question3') {
      return true; // Organization type is optional (can skip)
    }
    return false;
  }, [screen, answers]);

  const handleGetStarted = useCallback(() => {
    setScreen('question1');
  }, []);

  const handleSkip = useCallback(() => {
    onSkip();
  }, [onSkip]);

  const handleContinue = useCallback(() => {
    if (screen === 'question1') {
      // Save answer if provided
      if (answers.location) {
        const questionText = `${QUESTION_TEXTS.question1.main} ${QUESTION_TEXTS.question1.subtitle}`;
        setQuestionnaireAnswers((prev) => [
          ...prev.filter((a) => !a.question.includes(QUESTION_TEXTS.question1.main)),
          { question: questionText, answer: answers.location || '' },
        ]);
      }
      setScreen('question2');
    } else if (screen === 'question2') {
      // Save answer if provided
      if (answers.teamSize) {
        const questionText = QUESTION_TEXTS.question2.main;
        const teamSizeAnswer = answers.teamSize; // Store in const for type narrowing
        setQuestionnaireAnswers((prev) => [
          ...prev.filter((a) => !a.question.includes(questionText)),
          { question: questionText, answer: teamSizeAnswer },
        ]);
      }
      setScreen('question3');
    } else if (screen === 'question3') {
      // Calculate final answers
      let finalAnswers = [...questionnaireAnswers];
      if (answers.organizationType && answers.organizationType.length > 0) {
        const questionText = `${QUESTION_TEXTS.question3.main} ${QUESTION_TEXTS.question3.subtitle}`;
        finalAnswers = [
          ...finalAnswers.filter((a) => !a.question.includes(QUESTION_TEXTS.question3.main)),
          { question: questionText, answer: answers.organizationType.join(', ') },
        ];
      }
      // Update state and complete
      setQuestionnaireAnswers(finalAnswers);
      setScreen('complete');
      setTimeout(() => {
        onComplete({ answers: finalAnswers });
      }, 1500);
    }
  }, [screen, answers, questionnaireAnswers, onComplete]);

  // Auto-focus input when question appears
  useEffect(() => {
    if (screen === 'question1' && inputRef.current) {
      inputRef.current.focus();
    }
  }, [screen]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (screen === 'landing') {
        if (e.key === 'Enter') {
          handleGetStarted();
        } else if (e.key === 'Escape') {
          onSkip();
        }
      } else if (screen.startsWith('question')) {
        if (e.key === 'Escape') {
          handleSkip();
        } else if (e.key === 'Enter' && canContinue()) {
          handleContinue();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [screen, handleGetStarted, handleSkip, handleContinue, canContinue, onSkip]);

  const currentQuestion = screen === 'question1' ? 1 : screen === 'question2' ? 2 : screen === 'question3' ? 3 : 0;

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <Card className="w-full max-w-2xl">
        {/* Landing Screen */}
        {screen === 'landing' && (
          <div className="animate-in fade-in duration-300">
            <CardHeader className="text-center space-y-4 pb-8">
              <CardTitle className="text-3xl font-semibold">Tell the AI about your org</CardTitle>
              <CardDescription className="text-lg">
                Answer 3 quick questions to get more specific guidance
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-4 pb-8">
              <Button
                size="lg"
                className="h-12 text-base"
                onClick={handleGetStarted}
                onKeyDown={(e) => e.key === 'Enter' && handleGetStarted()}
              >
                Get Started <span className="text-xs opacity-70 ml-2">Enter ↵</span>
              </Button>
              <Button
                size="lg"
                variant="ghost"
                className="h-12 text-base"
                onClick={handleSkip}
                onKeyDown={(e) => e.key === 'Escape' && handleSkip()}
              >
                Skip for now <span className="text-xs opacity-70 ml-2">esc</span>
              </Button>
            </CardContent>
          </div>
        )}

        {/* Question Screens */}
        {(screen === 'question1' || screen === 'question2' || screen === 'question3') && (
          <div className="animate-in fade-in duration-300">
            <CardHeader className="space-y-2 pb-6">
              <div className="text-sm text-muted-foreground">
                {currentQuestion} of 3
              </div>
              {screen === 'question1' && (
                <>
                  <CardTitle className="text-2xl">{QUESTION_TEXTS.question1.main}</CardTitle>
                  <CardDescription className="text-base">
                    {QUESTION_TEXTS.question1.subtitle}
                  </CardDescription>
                </>
              )}
              {screen === 'question2' && (
                <CardTitle className="text-2xl">{QUESTION_TEXTS.question2.main}</CardTitle>
              )}
              {screen === 'question3' && (
                <>
                  <CardTitle className="text-2xl">{QUESTION_TEXTS.question3.main}</CardTitle>
                  <CardDescription className="text-base">{QUESTION_TEXTS.question3.subtitle}</CardDescription>
                </>
              )}
            </CardHeader>
            <CardContent className="space-y-6 pb-8">
              {/* Question 1: Location */}
              {screen === 'question1' && (
                <div className="space-y-4">
                  <Input
                    ref={inputRef}
                    placeholder="e.g., California. Staff in US and UK"
                    value={answers.location || ''}
                    onChange={(e) => {
                      setAnswers({
                        ...answers,
                        location: e.target.value,
                      });
                    }}
                    className="h-12 text-base"
                  />
                </div>
              )}

              {/* Question 2: Team Size */}
              {screen === 'question2' && (
                <RadioGroup
                  value={answers.teamSize || ''}
                  onValueChange={(value) => setAnswers({ ...answers, teamSize: value })}
                  className="space-y-3"
                >
                  {teamSizeOptions.map((option) => (
                    <label
                      key={option}
                      className={cn(
                        'flex items-center gap-3 rounded-lg border p-4 cursor-pointer transition-colors',
                        'hover:bg-accent',
                        answers.teamSize === option && 'border-primary bg-accent'
                      )}
                    >
                      <RadioGroupItem value={option} id={option} />
                      <span className="text-base font-medium cursor-pointer flex-1">{option}</span>
                    </label>
                  ))}
                </RadioGroup>
              )}

              {/* Question 3: Organization Type */}
              {screen === 'question3' && (
                <div className="space-y-3">
                  {organizationTypeOptions.map((option) => (
                    <label
                      key={option}
                      className={cn(
                        'flex items-center gap-3 rounded-lg border p-4 cursor-pointer transition-colors',
                        'hover:bg-accent',
                        answers.organizationType?.includes(option) && 'border-primary bg-accent'
                      )}
                    >
                      <Checkbox
                        checked={answers.organizationType?.includes(option) || false}
                        onCheckedChange={(checked) => {
                          const current = answers.organizationType || [];
                          if (checked) {
                            setAnswers({
                              ...answers,
                              organizationType: [...current, option],
                            });
                          } else {
                            setAnswers({
                              ...answers,
                              organizationType: current.filter((t) => t !== option),
                            });
                          }
                        }}
                        id={option}
                      />
                      <span className="text-base font-medium cursor-pointer flex-1">{option}</span>
                    </label>
                  ))}
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex gap-4 pt-4">
                <Button
                  size="lg"
                  className="h-12 text-base flex-1"
                  onClick={handleContinue}
                  disabled={!canContinue()}
                >
                  {screen === 'question3' ? 'Complete' : 'Continue'}
                  {canContinue() && <span className="text-xs opacity-70 ml-2">Enter ↵</span>}
                </Button>
                <Button
                  size="lg"
                  variant="ghost"
                  className="h-12 text-base"
                  onClick={handleSkip}
                >
                  Skip <span className="text-xs opacity-70 ml-2">esc</span>
                </Button>
              </div>
            </CardContent>
          </div>
        )}

        {/* Completion Screen */}
        {screen === 'complete' && (
          <div className="animate-in fade-in duration-300 text-center py-12">
            <CardHeader className="space-y-4">
              <CardTitle className="text-3xl font-semibold">All set!</CardTitle>
              <CardDescription className="text-lg">
                Redirecting to chatbot...
              </CardDescription>
            </CardHeader>
          </div>
        )}
      </Card>
    </div>
  );
}

