"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { TrashIcon, XIcon } from "@phosphor-icons/react";
import type { FactKey, FactValue, HouseholdProfile, LanguageCode } from "@/lib/types";

interface HouseholdDialogProps {
  open: boolean;
  profile: HouseholdProfile;
  onOpenChange: (open: boolean) => void;
  onRemoveFact: (key: FactKey) => void;
  onLanguageChange: (language: LanguageCode) => void;
  onClear: () => void;
}

export const factLabels: Partial<Record<FactKey, string>> = {
  lifeEvent: "Current mission",
  state: "State",
  residenceType: "Area",
  incomeBand: "Income band",
  annualIncomeBand: "Annual income",
  childOrder: "Child order",
  deliveryStatus: "Pregnancy stage",
  hasBankAccount: "Bank readiness",
  studyLevel: "Study level",
  studentStatus: "Student status",
  hasAcademicRecords: "Academic records",
  workType: "Work type",
  hasPan: "PAN readiness",
  employerType: "Employer type",
  previousCoverage: "Previous coverage",
  jobStatus: "Work status",
  hasUan: "UAN readiness",
  businessStage: "Business stage",
  businessType: "Business type",
  annualTurnoverBand: "Turnover band",
  grievanceType: "Problem type",
  previousAttempt: "Previous attempt",
};

export function formatFact(value: FactValue): string {
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (Array.isArray(value)) return value.join(", ");
  return String(value).replaceAll("-", " ");
}

export function HouseholdDialog({
  open,
  profile,
  onOpenChange,
  onRemoveFact,
  onLanguageChange,
  onClear,
}: HouseholdDialogProps) {
  const facts = Object.entries(profile.facts) as Array<[FactKey, FactValue]>;

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="dialog-overlay" />
        <Dialog.Content className="dialog-content">
          <div className="rail-title">
            <Dialog.Title className="dialog-title">What RightNow knows</Dialog.Title>
            <Dialog.Close className="icon-button" aria-label="Close household details">
              <XIcon aria-hidden="true" size={18} />
            </Dialog.Close>
          </div>
          <Dialog.Description className="dialog-description">
            Only synthetic choices are saved in this browser. Remove any item or clear the household at any time.
          </Dialog.Description>

          <label className="language-field">
            <span>Conversation language</span>
            <select
              value={profile.preferredLanguage}
              onChange={(event) => onLanguageChange(event.target.value as LanguageCode)}
            >
              <option value="en">English</option>
              <option value="hi">हिन्दी</option>
              <option value="ta">தமிழ்</option>
            </select>
          </label>

          <div className="fact-editor">
            {facts.length === 0 ? (
              <div className="empty-state">No household facts yet. Start with a life change.</div>
            ) : (
              facts.map(([key, value]) => (
                <div className="fact-edit-row" key={key}>
                  <span>
                    <small>{factLabels[key] ?? key}</small>
                    <strong>{formatFact(value)}</strong>
                  </span>
                  <button className="icon-button" type="button" onClick={() => onRemoveFact(key)} aria-label={`Remove ${factLabels[key] ?? key}`}>
                    <XIcon aria-hidden="true" size={16} />
                  </button>
                </div>
              ))
            )}
          </div>

          <div className="dialog-actions">
            <Dialog.Close className="secondary-button">Done</Dialog.Close>
            <button className="danger-button" type="button" onClick={onClear}>
              <TrashIcon aria-hidden="true" size={18} />
              Clear household
            </button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

