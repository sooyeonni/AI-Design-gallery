"use client";

import { useEffect, useState } from "react";
import styles from "./SubmissionForm.module.css";

export default function SubmissionStatus() {
  const [message, setMessage] = useState("Open your private status link to load the submission status.");
  const [url, setUrl] = useState<string | null>(null);
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    let timer: ReturnType<typeof setTimeout>;
    const receipt = location.hash.slice(1).match(/^([0-9a-f-]{36})\.([0-9a-f]{64})$/);
    if (!receipt) {
      return;
    }
    async function refresh() {
      try {
        const response = await fetch(`/api/submissions/${receipt![1]}`, {
          headers: { Authorization: `Bearer ${receipt![2]}` }, signal: controller.signal, cache: "no-store",
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || "Could not load submission status.");
        setMessage(`${data.status.replaceAll("_", " ")}: ${data.feedback}`);
        setUrl(data.url);
        if (data.status === "queued" || data.status === "reviewing") timer = setTimeout(refresh, 10000);
      } catch (error) {
        if (!controller.signal.aborted) setMessage(error instanceof Error ? error.message : "Status unavailable.");
      }
    }
    void refresh();
    return () => { controller.abort(); clearTimeout(timer); };
  }, [retry]);
  return (
    <div className={styles.panel}>
      <p role="status">{message}</p>
      {url && <p><a href={url} target="_blank" rel="noopener noreferrer">Open your project ↗</a></p>}
      <button type="button" onClick={() => setRetry((value) => value + 1)}>Refresh status</button>
    </div>
  );
}
