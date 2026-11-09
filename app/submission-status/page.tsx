import Link from "next/link";
import SubmissionStatus from "@/components/SubmissionStatus";
import styles from "@/app/page.module.css";

export const metadata = { title: "Submission status · AI Design Study", robots: { index: false, follow: false } };

export default function SubmissionStatusPage() {
  return (
    <main id="main-content" className={styles.page}>
      <h1>Submission status</h1>
      <SubmissionStatus />
      <Link href="/how-to-upload">Back to How to Upload</Link>
    </main>
  );
}
