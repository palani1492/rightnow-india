"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { CheckCircleIcon, FileTextIcon, XIcon } from "@phosphor-icons/react";
import type { PreparedAction } from "@/lib/types";

interface ReviewDialogProps {
  open: boolean;
  actions: readonly PreparedAction[];
  selectedIds: readonly string[];
  submitting: boolean;
  error: string | null;
  onOpenChange: (open: boolean) => void;
  onToggle: (id: string) => void;
  onSubmit: () => void;
}

export function ReviewDialog({
  open,
  actions,
  selectedIds,
  submitting,
  error,
  onOpenChange,
  onToggle,
  onSubmit,
}: ReviewDialogProps) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="dialog-overlay" />
        <Dialog.Content className="dialog-content">
          <div className="rail-title">
            <Dialog.Title className="dialog-title">Review your plan</Dialog.Title>
            <Dialog.Close className="icon-button" aria-label="Close review">
              <XIcon aria-hidden="true" size={18} />
            </Dialog.Close>
          </div>
          <Dialog.Description className="dialog-description">
            Select the steps to simulate. Nothing is submitted to any government service or portal.
          </Dialog.Description>

          <div className="review-list">
            {actions.map((action) => {
              const checked = selectedIds.includes(action.id);
              return (
                <div className="review-item" key={action.id}>
                  <input
                    type="checkbox"
                    aria-label={`Include ${action.title}`}
                    checked={checked}
                    onChange={() => onToggle(action.id)}
                  />
                  <span>
                    <strong>{action.title}</strong>
                    <p>{action.summary}</p>
                    <p className="review-reason">{action.eligibility.reason}</p>
                    {action.requiredDocuments.length > 0 ? (
                      <ul className="review-checklist" aria-label={`Preparation checklist for ${action.title}`}>
                        {action.requiredDocuments.map((item) => <li key={item}>{item}</li>)}
                      </ul>
                    ) : null}
                    {action.reviewItems.length > 0 ? (
                      <dl className="review-facts">
                        {action.reviewItems.map((item) => (
                          <div key={item.factKey}><dt>{item.label}</dt><dd>{item.value}</dd></div>
                        ))}
                      </dl>
                    ) : null}
                    {action.sources.length > 0 ? (
                      <div className="review-sources" aria-label={`Official sources for ${action.title}`}>
                        {action.sources.map((source) => (
                          <a key={source.url} href={source.url} target="_blank" rel="noreferrer">
                            Verify on {source.label}
                          </a>
                        ))}
                      </div>
                    ) : null}
                  </span>
                </div>
              );
            })}
          </div>

          <div className="notice-box">
            <FileTextIcon aria-hidden="true" size={18} /> This is a simulation. RightNow never makes a call, files a report, uploads a document or submits an application.
          </div>
          <p className="field-help">
            If you continue, the selected mock plan and reference stay in this browser until you clear the household.
          </p>
          {error ? <div className="error-callout" role="alert">{error}</div> : null}

          <div className="dialog-actions">
            <Dialog.Close className="secondary-button">Go back</Dialog.Close>
            <button
              className="primary-button"
              type="button"
              disabled={submitting || selectedIds.length === 0}
              onClick={onSubmit}
            >
              <CheckCircleIcon aria-hidden="true" size={19} weight="fill" />
              {submitting ? "Creating your simulation" : `Simulate ${selectedIds.length} next ${selectedIds.length === 1 ? "step" : "steps"}`}
            </button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
