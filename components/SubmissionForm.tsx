"use client";

import Script from "next/script";
import { useEffect, useRef, useState } from "react";
import { CATEGORIES } from "@/lib/types";
import { MAX_ZIP_BYTES, SUBMISSION_STATES } from "@/lib/submissions";
import type { SubmissionState } from "@/lib/submissions";
import styles from "./SubmissionForm.module.css";

interface Receipt { id: string; token: string }
interface Status { title: string; status: SubmissionState; feedback: string; url: string | null }
interface Turnstile {
  render: (element: HTMLElement, options: Record<string, unknown>) => string;
  remove: (id: string) => void;
  reset: (id: string) => void;
}
declare global {
  interface Window { turnstile?: Turnstile }
}

const LABELS: Record<SubmissionState, string> = {
  queued: "Waiting for review", reviewing: "Reviewing", needs_review: "Needs review",
  rejected: "Changes needed", failed: "Processing failed", published: "Published",
};

export default function SubmissionForm({ enabled, siteKey }: { enabled: boolean; siteKey: string }) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [challenge, setChallenge] = useState("");
  const [scriptReady, setScriptReady] = useState(false);
  const [receipt, setReceipt] = useState<Receipt | null>(null);
  const [status, setStatus] = useState<Status | null>(null);
  const challengeElement = useRef<HTMLDivElement>(null);
  const widget = useRef<string | null>(null);

  useEffect(() => {
    if (!enabled || !scriptReady || !challengeElement.current || !window.turnstile) return;
    const id = window.turnstile.render(challengeElement.current, {
      sitekey: siteKey, action: "submit-project", theme: "auto", size: "compact",
      callback: (token: string) => setChallenge(token),
      "expired-callback": () => setChallenge(""),
      "error-callback": () => { setChallenge(""); setError("Anti-bot check could not load. Please reload and try again."); },
    });
    widget.current = id;
    return () => { window.turnstile?.remove(id); widget.current = null; };
  }, [enabled, siteKey, scriptReady]);

  useEffect(() => {
    if (!receipt) return;
    const controller = new AbortController();
    let timer: ReturnType<typeof setTimeout>;
    async function refresh() {
      try {
        const response = await fetch(`/api/submissions/${receipt!.id}`, {
          headers: { Authorization: `Bearer ${receipt!.token}` },
          cache: "no-store", signal: controller.signal,
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || "Could not load submission status.");
        if (!SUBMISSION_STATES.includes(data.status)) throw new Error("Unexpected submission status.");
        setStatus(data);
        setError("");
        if (data.status === "queued" || data.status === "reviewing") {
          timer = setTimeout(refresh, 10000);
        }
      } catch (error) {
        if (controller.signal.aborted) return;
        setError(error instanceof Error ? error.message : "Could not load submission status.");
      }
    }
    void refresh();
    return () => { controller.abort(); clearTimeout(timer); };
  }, [receipt]);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    const form = new FormData(event.currentTarget);
    const file = form.get("archive");
    if (!(file instanceof File) || !file.size || file.size > MAX_ZIP_BYTES) {
      setError("Choose a non-empty ZIP, up to 3 MiB.");
      return;
    }
    if (!challenge) { setError("Complete the anti-bot check first."); return; }
    form.set("challenge", challenge);
    setPending(true);
    try {
      const response = await fetch("/api/submissions", { method: "POST", body: form });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Upload failed.");
      if (typeof data.id !== "string" || typeof data.token !== "string") throw new Error("Invalid submission receipt.");
      setReceipt({ id: data.id, token: data.token });
    } catch (error) {
      setError(error instanceof Error ? error.message : "Upload failed. Try again later.");
    } finally {
      setPending(false);
      setChallenge("");
      if (widget.current) window.turnstile?.reset(widget.current);
    }
  }

  return (
    <section className={styles.panel} aria-labelledby="submission-heading">
      <h3 id="submission-heading">Submit your project</h3>
      {!enabled && <p role="status">Uploads are not open yet. The organizer needs to connect storage and anti-bot protection.</p>}
      {receipt ? (
        <div className={styles.receipt} aria-live="polite">
          <strong>{status ? LABELS[status.status] : "ZIP received"}</strong>
          <p>{status?.feedback || "Loading your submission status…"}</p>
          {status?.url && <a href={status.url} target="_blank" rel="noopener noreferrer">Open your project ↗</a>}
          <p>Save this receipt to check your status later. It is private; do not share it.</p>
          <a href={`/submission-status#${receipt.id}.${receipt.token}`}>Your private status link</a>
        </div>
      ) : (
        <form onSubmit={submit}>
          <fieldset disabled={!enabled || pending}>
            <label>Project title<input name="title" required maxLength={100} autoComplete="off" /></label>
            <label>Author name<input name="author" required maxLength={80} autoComplete="name" /></label>
            <label>Category<select name="category" required>{CATEGORIES.map((category) => <option key={category}>{category}</option>)}</select></label>
            <label>AI tools<input name="tools" required maxLength={609} placeholder="Claude Code, Figma Make" /><span>Separate tool names with commas.</span></label>
            <label>Project ZIP<input name="archive" type="file" accept=".zip,application/zip" required /><span>Up to 3 MiB compressed, 20 MiB expanded. Never include secrets.</span></label>
            <label className={styles.consent}><input type="checkbox" name="consent" value="yes" required />I own or have permission to publish this project. It contains no secrets, and I agree to automated review and public deployment of the accepted static site.</label>
            {enabled && <div ref={challengeElement} />}
            <button type="submit" disabled={!challenge || pending}>{pending ? "Uploading…" : "Upload project"}</button>
          </fieldset>
        </form>
      )}
      {error && <p role="alert">{error}</p>}
      {enabled && (
        <Script src="https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit" strategy="afterInteractive"
          onReady={() => setScriptReady(true)} onError={() => setError("Anti-bot protection could not load. Reload to try again.")} />
      )}
    </section>
  );
}
