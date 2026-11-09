"use client";

import { useEffect, useId, useRef, useState } from "react";
import styles from "./CopyCodeBlock.module.css";

interface CopyCodeBlockProps {
  /** Small label shown above the code, e.g. "AI AGENT PROMPT" */
  label: string;
  /** The copyable text content */
  code: string;
}

/**
 * A reusable, accessible block for displaying copyable instructions or
 * prompts. Uses the browser Clipboard API directly (no external library).
 */
export default function CopyCodeBlock({ label, code }: CopyCodeBlockProps) {
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  const resetTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const labelId = useId();
  const statusId = useId();

  useEffect(() => () => {
    if (resetTimer.current) clearTimeout(resetTimer.current);
  }, []);

  async function handleCopy() {
    if (resetTimer.current) clearTimeout(resetTimer.current);
    setCopied(false);
    setError("");
    if (!navigator.clipboard?.writeText) {
      setError("Clipboard unavailable. Select the text below and copy it manually.");
      return;
    }
    setPending(true);
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      resetTimer.current = setTimeout(() => setCopied(false), 2000);
    } catch {
      setError("Copy was blocked. Select the text below and copy it manually.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className={styles.block} role="group" aria-labelledby={labelId}>
      <div className={styles.header}>
        <span id={labelId} className={styles.label}>
          {label}
        </span>
        <button
          type="button"
          className={styles.copyButton}
          onClick={handleCopy}
          disabled={pending}
          aria-label={`Copy ${label.toLowerCase()}`}
          aria-describedby={statusId}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
            <rect x="8" y="8" width="12" height="12" rx="2" />
            <path d="M16 8V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h3" />
          </svg>
          <span>{pending ? "Copying..." : copied ? "Copied!" : "Copy"}</span>
        </button>
      </div>
      <p id={statusId} className={styles.status} role="status" aria-live="polite">
        {error || (copied ? "Copied to clipboard." : "")}
      </p>
      <pre className={styles.pre} tabIndex={0} aria-labelledby={labelId}>
        <code>{code}</code>
      </pre>
    </div>
  );
}
