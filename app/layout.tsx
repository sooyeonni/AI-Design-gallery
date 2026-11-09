import type { Metadata } from "next";
import ThemeProvider from "@/components/ThemeProvider";
import UploadDialogProvider from "@/components/UploadDialog";
import { submissionStorageConfigured } from "@/lib/submission-store";
import "./globals.css";

export const metadata: Metadata = {
  title: "AI Design Study",
  description: "An evolving collection of things we're making with AI.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  const uploadsEnabled = submissionStorageConfigured() && !!process.env.TURNSTILE_SECRET_KEY &&
    !!process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY && !!process.env.SUBMISSION_IP_SALT && !!process.env.SUBMISSION_SITE_URL;
  return (
    <html lang="en">
      <body>
        <ThemeProvider>
        <UploadDialogProvider enabled={uploadsEnabled} siteKey={process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY || ""}>
        <a href="#main-content" className="skip-link">Skip to content</a>
        {children}
        </UploadDialogProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
