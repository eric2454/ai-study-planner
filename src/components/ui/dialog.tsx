"use client";
import * as D from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import { useI18n } from "../providers";
export function Modal({
  open,
  onClose,
  title,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}) {
  const { t } = useI18n();
  return (
    <D.Root open={open} onOpenChange={(v) => !v && onClose()}>
      <D.Portal>
        <D.Overlay className="modal-overlay" />
        <D.Content className="modal">
          <div className="modal-heading">
            <D.Title>{title}</D.Title>
            <D.Close aria-label={t("close")} className="icon-button">
              <X size={19} />
            </D.Close>
          </div>
          <D.Description className="sr-only">{title}</D.Description>
          {children}
        </D.Content>
      </D.Portal>
    </D.Root>
  );
}
