import { detectSensitiveInput } from "./input-safety";

type GeneratedPlan = Readonly<{
  title: string;
  summary: string;
  steps: readonly Readonly<{ title: string; description: string }>[];
}>;

const unsafePatterns: readonly RegExp[] = [
  /https?:\/\/|\bwww\./iu,
  /\b(?:eligible|ineligible|approved|submitted|filed|completed|guaranteed)\b/iu,
  /(?:₹|\bINR\b|\bRs\.?)(?:\s*)[0-9]/iu,
  /\b(?:the deadline is|due (?:by|on)|must apply (?:by|before)|expires? on)\b/iu,
  /\b(?:take|use|stop taking)\b.{0,50}\b[0-9]+(?:\.[0-9]+)?\s*(?:mg|mcg|g|ml)\b/iu,
  /\b(?:you should sue|file a lawsuit|legally entitled|the law requires)\b/iu,
  /\b(?:buy|sell|invest in)\b.{0,50}\b(?:stock|shares?|crypto|fund|securit(?:y|ies)|investment)\b/iu,
  /\b(?:your diagnosis is|you have been diagnosed with|this means you have)\b/iu,
];

export function hasUnsafeGeneratedPlan(plan: GeneratedPlan): boolean {
  const text = [
    plan.title,
    plan.summary,
    ...plan.steps.flatMap((step) => [step.title, step.description]),
  ].join("\n");

  return Boolean(detectSensitiveInput(text)) || unsafePatterns.some((pattern) => pattern.test(text));
}
