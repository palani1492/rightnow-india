"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { BrainIcon, LockKeyIcon } from "@phosphor-icons/react";

interface ConsentDialogProps {
  open: boolean;
  onChoose: (consent: boolean) => void;
}

export function ConsentDialog({ open, onChoose }: ConsentDialogProps) {
  return (
    <Dialog.Root open={open}>
      <Dialog.Portal>
        <Dialog.Overlay className="dialog-overlay" />
        <Dialog.Content className="dialog-content" aria-describedby="ai-consent-description">
          <Dialog.Title className="dialog-title">Choose how RightNow understands you</Dialog.Title>
          <Dialog.Description id="ai-consent-description" className="dialog-description">
            This public demo only needs a short description of what changed. Never enter identity numbers,
            account details, OTPs or personal documents.
          </Dialog.Description>

          <div className="notice-box">
            With AI interpretation, your minimum message is sent to GPT-5.6 Luna through OpenCode Go.
            OpenCode says inputs are not used for training, but abuse-monitoring data may be kept for up to
            30 days.
          </div>

          <div className="review-list">
            <button className="review-item" type="button" onClick={() => onChoose(true)}>
              <BrainIcon aria-hidden="true" size={24} weight="duotone" />
              <span>
                <strong>Use AI interpretation</strong>
                <p>Better multilingual understanding. Eligibility still comes only from deterministic rules.</p>
              </span>
            </button>
            <button className="review-item" type="button" onClick={() => onChoose(false)}>
              <LockKeyIcon aria-hidden="true" size={24} weight="duotone" />
              <span>
                <strong>Use private demo mode</strong>
                <p>Use the six guided missions without sending your message to an AI provider.</p>
              </span>
            </button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

