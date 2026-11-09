"use client";

import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import SubmissionForm from "./SubmissionForm";
import navStyles from "./NavTabs.module.css";
import styles from "./UploadDialog.module.css";

const UploadContext = createContext<(() => void) | null>(null);

export default function UploadDialogProvider({
  children, enabled, siteKey,
}: { children: ReactNode; enabled: boolean; siteKey: string }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const previousOverflow = useRef<string | null>(null);
  const [mounted, setMounted] = useState(false);

  function restoreScroll() {
    if (previousOverflow.current !== null) {
      document.body.style.overflow = previousOverflow.current;
      previousOverflow.current = null;
    }
  }

  useEffect(() => restoreScroll, []);

  function close() {
    dialog.current?.close();
    restoreScroll();
  }

  function open() {
    if (!dialog.current || dialog.current.open) return;
    setMounted(true);
    previousOverflow.current = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    dialog.current.showModal();
  }

  return (
    <UploadContext.Provider value={open}>
      {children}
      <dialog ref={dialog} className={styles.dialog} aria-labelledby="upload-dialog-heading" onClose={restoreScroll}
        onKeyDown={(event) => {
          if (event.key === "Escape") {
            event.preventDefault();
            close();
          }
        }}>
        <div className={styles.header}>
          <h2 id="upload-dialog-heading">Upload project</h2>
          <button type="button" className={styles.close} aria-label="Close upload dialog" onClick={close} autoFocus>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
              <path d="m6 6 12 12M6 18 18 6" />
            </svg>
          </button>
        </div>
        {mounted && <SubmissionForm enabled={enabled} siteKey={siteKey} />}
      </dialog>
    </UploadContext.Provider>
  );
}

export function UploadProjectButton() {
  const open = useContext(UploadContext);
  if (!open) throw new Error("UploadProjectButton must be rendered inside UploadDialogProvider.");
  return <button type="button" className={navStyles.upload} onClick={open} aria-haspopup="dialog">Upload project</button>;
}
