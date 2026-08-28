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
            <Dialog.Title className="dialog-title">One review for every prepared action</Dialog.Title>
            <Dialog.Close className="icon-button" aria-label="Close review">
              <XIcon aria-hidden="true" size={18} />
            </Dialog.Close>
          </div>
          <Dialog.Description className="dialog-description">
            Select what to authorize. This creates demo reference numbers only. Nothing is sent to a government service.
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
                    <p>{action.requiredDocuments.length} document checks. No uploads.</p>
                    <a href={action.sources[0]?.url} target="_blank" rel="noreferrer">
                      Verify on {action.sources[0]?.label ?? "official source"}
                    </a>
                  </span>
                </div>
              );
            })}
          </div>

          <div className="notice-box">
            <FileTextIcon aria-hidden="true" size={18} /> Required documents are guidance only. RightNow never uploads or stores them.
          </div>
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
              {submitting ? "Creating demo references" : `Authorize ${selectedIds.length} mock actions`}
            </button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
