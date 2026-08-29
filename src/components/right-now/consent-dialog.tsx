"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { CheckCircleIcon, LockKeyIcon } from "@phosphor-icons/react";

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
          <Dialog.Title className="dialog-title">Choose how RightNow routes descriptions</Dialog.Title>
          <Dialog.Description id="ai-consent-description" className="dialog-description">
            Your description will be sent to OpenCode Go to route the request and build
            a simulated plan. This choice is saved in this browser for future descriptions and can be
            changed in “What RightNow knows.” RightNow requests no provider storage. Provider policies may still apply.
          </Dialog.Description>

          <div className="notice-box">
            Never enter names, addresses, medical details, identity numbers, account details, OTPs or
            personal documents. Pattern blocking reduces risk but cannot catch everything. You can use
            guided mode instead and change this setting at any time.
          </div>

          <div className="review-list">
            <button aria-label="Always use AI routing" className="review-item" type="button" onClick={() => onChoose(true)}>
              <CheckCircleIcon aria-hidden="true" size={24} weight="duotone" />
              <span>
                <strong>Always use AI routing</strong>
                <p>Send future safe descriptions to OpenCode Go automatically on this browser.</p>
              </span>
            </button>
            <button aria-label="Use guided mode" className="review-item" type="button" onClick={() => onChoose(false)}>
              <LockKeyIcon aria-hidden="true" size={24} weight="duotone" />
              <span>
                <strong>Use guided mode</strong>
                <p>Keep the description inside this app and use deterministic routing.</p>
              </span>
            </button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
