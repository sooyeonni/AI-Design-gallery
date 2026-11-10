"use client";

import Script from "next/script";
import { put } from "@vercel/blob/client";
import { useEffect, useRef, useState } from "react";
import { CATEGORIES } from "@/lib/types";
import { ARCHIVE_LIMITS, MAX_ZIP_BYTES, SUBMISSION_STATES } from "@/lib/submissions";
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
  uploading: "Uploading ZIP",
  queued: "Waiting for review", reviewing: "Reviewing", needs_review: "Needs review",
  rejected: "Changes needed", failed: "Processing failed", published: "Published",
};

export default function SubmissionForm({ enabled, siteKey }: { enabled: boolean; siteKey: string }) {
  const [pending, setPending] = useState(false);
  const [uploadMessage, setUploadMessage] = useState("");
  const [uploaded, setUploaded] = useState<Receipt | null>(null);
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
        if (data.status === "uploading" || data.status === "queued" || data.status === "reviewing") {
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
    if (!uploaded) {
      if (!(file instanceof File) || !file.name.toLowerCase().endsWith(".zip") || !file.size || file.size > MAX_ZIP_BYTES) {
        setError("Choose a non-empty ZIP, up to 25 MiB.");
        return;
      }
      if (!challenge) { setError("Complete the anti-bot check first."); return; }
    }
    setPending(true);
    try {
      let uploadReceipt = uploaded;
      if (!uploadReceipt && file instanceof File) {
        setUploadMessage("Preparing upload…");
        const authorization = await fetch("/api/submissions", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title: form.get("title"), author: form.get("author"), category: form.get("category"),
            tools: String(form.get("tools") || "").split(",").map((tool) => tool.trim()),
            consent: form.get("consent"), challenge, filename: file.name, size: file.size,
          }),
        });
        const grant = await authorization.json();
        if (!authorization.ok) throw new Error(grant.error || "Upload could not be authorized.");
        if (typeof grant.id !== "string" || typeof grant.token !== "string" ||
            typeof grant.pathname !== "string" || typeof grant.clientToken !== "string") {
          throw new Error("Invalid upload authorization.");
        }
        await put(grant.pathname, file, {
          access: "private", token: grant.clientToken, contentType: "application/zip",
          onUploadProgress: ({ percentage }) => setUploadMessage(`Uploading… ${Math.round(percentage)}%`),
        });
        uploadReceipt = { id: grant.id, token: grant.token };
        setUploaded(uploadReceipt);
      }
      if (!uploadReceipt) throw new Error("Upload receipt is missing.");
      setUploadMessage("Checking ZIP…");
      const response = await fetch("/api/submissions", {
        method: "PUT", headers: { "Content-Type": "application/json" },
        body: JSON.stringify(uploadReceipt),
      });
      const data = await response.json();
      if (!response.ok) {
        if (response.status >= 400 && response.status < 500) setUploaded(null);
        throw new Error(data.error || "Upload failed.");
      }
      if (typeof data.id !== "string" || typeof data.token !== "string") throw new Error("Invalid submission receipt.");
      setReceipt({ id: data.id, token: data.token });
    } catch (error) {
      setError(error instanceof Error ? error.message : "Upload failed. Try again later.");
    } finally {
      setPending(false);
      setUploadMessage("");
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
            <label>Project title<input name="title" required maxLength={100} autoComplete="off" disabled={!!uploaded} /></label>
            <label>Author name<input name="author" required maxLength={80} autoComplete="name" disabled={!!uploaded} /></label>
            <label>Category<select name="category" required disabled={!!uploaded}>{CATEGORIES.map((category) => <option key={category}>{category}</option>)}</select></label>
            <label>AI tools<input name="tools" required maxLength={609} placeholder="Claude Code, Figma Make" disabled={!!uploaded} /><span>Separate tool names with commas.</span></label>
            <label>Project ZIP<input name="archive" type="file" accept=".zip,application/zip" required disabled={!!uploaded} /><span>Up to {ARCHIVE_LIMITS}. Never include secrets.</span></label>
            <label className={styles.consent}><input type="checkbox" name="consent" value="yes" required disabled={!!uploaded} />I own or have permission to publish this project. It contains no secrets, and I agree to automated review and public deployment of the accepted static site.</label>
            {enabled && <div ref={challengeElement} />}
            <button type="submit" disabled={(!challenge && !uploaded) || pending}>{pending ? uploadMessage || "Uploading…" : uploaded ? "Retry ZIP checks" : "Upload project"}</button>
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
