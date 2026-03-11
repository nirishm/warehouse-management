'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight, Check } from 'lucide-react';

export interface StepConfig {
  label: string;
  content: React.ReactNode;
  /** Optional validation — return true to allow advancing */
  validate?: () => boolean;
}

interface TransactionStepperProps {
  steps: StepConfig[];
  onSubmit: () => void;
  submitting?: boolean;
  submitLabel?: string;
}

export function TransactionStepper({
  steps,
  onSubmit,
  submitting = false,
  submitLabel = 'Submit',
}: TransactionStepperProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const isLast = currentStep === steps.length - 1;
  const isFirst = currentStep === 0;

  function handleNext() {
    const step = steps[currentStep];
    if (step.validate && !step.validate()) return;
    if (isLast) {
      onSubmit();
    } else {
      setCurrentStep((s) => s + 1);
    }
  }

  function handleBack() {
    if (!isFirst) setCurrentStep((s) => s - 1);
  }

  return (
    <div className="flex flex-col min-h-[calc(100vh-theme(spacing.14)-theme(spacing.20))]">
      {/* Progress dots */}
      <div className="flex items-center justify-center gap-2 py-3 px-4">
        {steps.map((step, i) => (
          <button
            key={i}
            type="button"
            onClick={() => {
              // Only allow going back to previous steps
              if (i < currentStep) setCurrentStep(i);
            }}
            className="flex items-center gap-1.5"
          >
            <div
              className={`w-2 h-2 rounded-full transition-colors ${
                i === currentStep
                  ? 'bg-[var(--accent-color)] scale-125'
                  : i < currentStep
                  ? 'bg-[var(--green)]'
                  : 'bg-border'
              }`}
            />
            <span
              className={`text-[10px] font-mono uppercase tracking-wider ${
                i === currentStep
                  ? 'text-[var(--accent-color)]'
                  : i < currentStep
                  ? 'text-[var(--text-muted)]'
                  : 'text-[var(--text-dim)]'
              }`}
            >
              {step.label}
            </span>
          </button>
        ))}
      </div>

      {/* Step content */}
      <div className="flex-1 overflow-y-auto px-4 pb-4">
        {steps[currentStep].content}
      </div>

      {/* Sticky bottom buttons */}
      <div className="sticky bottom-16 bg-white border-t border-border p-3 flex items-center gap-2 safe-area-bottom">
        {!isFirst && (
          <Button
            type="button"
            variant="outline"
            onClick={handleBack}
            className="flex-1"
          >
            <ChevronLeft size={16} className="mr-1" />
            Back
          </Button>
        )}
        <Button
          type="button"
          variant="orange"
          onClick={handleNext}
          disabled={submitting}
          className="flex-1"
        >
          {isLast ? (
            <>
              {submitting ? 'Submitting...' : submitLabel}
              {!submitting && <Check size={16} className="ml-1" />}
            </>
          ) : (
            <>
              Next
              <ChevronRight size={16} className="ml-1" />
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
