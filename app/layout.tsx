import type { Metadata } from "next";
import ThemeProvider from "@/components/ThemeProvider";
import "./globals.css";

export const metadata: Metadata = {
  title: "AI Design Study",
  description: "An evolving collection of things we're making with AI.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en">
      <body>
        <ThemeProvider>
        <a href="#main-content" className="skip-link">Skip to content</a>
        {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
