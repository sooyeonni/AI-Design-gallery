"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import styles from "./NavTabs.module.css";

const ThemeContext = createContext<{ dark: boolean; toggle: () => void } | null>(null);

export default function ThemeProvider({ children }: { children: ReactNode }) {
  const [dark, setDark] = useState(false);

  useEffect(() => {
    document.documentElement.dataset.theme = dark ? "dark" : "light";
  }, [dark]);

  return (
    <ThemeContext.Provider value={{ dark, toggle: () => setDark((current) => !current) }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function ThemeToggle() {
  const theme = useContext(ThemeContext);
  if (!theme) {
    throw new Error("ThemeToggle must be rendered inside ThemeProvider.");
  }
  const { dark, toggle } = theme;
  const label = dark ? "Switch to light mode" : "Switch to dark mode";

  return (
    <button type="button" className={styles.themeToggle} onClick={toggle} aria-label={label} title={label} aria-pressed={dark}>
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
        {dark ? (
          <>
            <circle cx="12" cy="12" r="4" />
            <path d="M12 2v2M12 20v2M2 12h2M20 12h2M5 5l1.5 1.5M17.5 17.5 19 19M5 19l1.5-1.5M17.5 6.5 19 5" />
          </>
        ) : (
          <path d="M20.5 14A9 9 0 0 1 10 3.5 9 9 0 1 0 20.5 14Z" />
        )}
      </svg>
    </button>
  );
}
