import { Check, ImagePlus, Palette, Sparkles } from "lucide-react";

const steps = [
  { id: 1, label: "Choose Style", icon: Palette },
  { id: 2, label: "Upload Photo", icon: ImagePlus },
  { id: 3, label: "Your Design", icon: Sparkles },
];

function StudioStepper({ currentStep, resultReady }) {
  return (
    <ol className="studio-stepper" aria-label="Design progress">
      {steps.map((step) => {
        const completed = step.id < currentStep || (step.id === 3 && resultReady);
        const active = step.id === currentStep && !completed;
        const Icon = step.icon;

        return (
          <li
            key={step.id}
            className={`${completed ? "completed" : ""} ${active ? "active" : ""}`}
            aria-current={active ? "step" : undefined}
          >
            <span className="studio-step-icon" aria-hidden="true">
              {completed ? <Check size={17} strokeWidth={3} /> : <Icon size={17} />}
            </span>
            <span className="studio-step-copy">
              <small>Step {step.id}</small>
              <strong>{step.label}</strong>
            </span>
          </li>
        );
      })}
    </ol>
  );
}

export default StudioStepper;
