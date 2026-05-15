"use client";

interface StepperProps {
  steps: string[];
  currentStep: number;
}

export function Stepper({ steps, currentStep }: StepperProps) {
  return (
    <div className="flex flex-wrap gap-2">
      {steps.map((step, index) => {
        const isCompleted = index < currentStep;
        const isCurrent = index === currentStep;
        
        return (
          <div
            key={index}
            className={`flex items-center px-4 py-2 rounded-full min-h-[44px] text-sm md:text-base font-medium transition-all ${
              isCurrent
                ? 'bg-[#C88A2B] text-black/90 shadow-lg shadow-black/40'
                : isCompleted
                ? 'bg-neutral-700 text-stone-200 border border-white/10'
                : 'bg-neutral-800 text-stone-400 border border-white/10'
            }`}
          >
            {isCompleted && <span className="mr-1">✓</span>}
            {step}
          </div>
        );
      })}
    </div>
  );
}
