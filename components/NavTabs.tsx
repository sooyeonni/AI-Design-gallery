import Link from "next/link";
import { ThemeToggle } from "./ThemeProvider";
import styles from "./NavTabs.module.css";

const TABS = [
  { href: "/", label: "Gallery" },
  { href: "/how-to-upload", label: "How to Upload" },
];

export default function NavTabs({ active }: { active: "/" | "/how-to-upload" }) {
  return (
    <nav className={styles.nav} aria-label="Primary">
      <ul className={styles.list}>
        {TABS.map((tab) => {
          const isActive = tab.href === active;
          return (
            <li key={tab.href}>
              <Link
                href={tab.href}
                className={styles.link}
                data-active={isActive}
                aria-current={isActive ? "page" : undefined}
              >
                {tab.label}
              </Link>
            </li>
          );
        })}
      </ul>
      <div className={styles.actions}>
      <a
        className={styles.github}
        href="https://github.com/sooyeonni/AI-Design-gallery"
        target="_blank"
        rel="noopener noreferrer"
        aria-label="AI Design Study on GitHub (opens in a new tab)"
      >
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path
            fill="currentColor"
            d="M12 .9a11.1 11.1 0 0 0-3.51 21.63c.56.1.76-.24.76-.54v-2.1c-3.1.67-3.76-1.32-3.76-1.32-.5-1.28-1.24-1.62-1.24-1.62-1.01-.7.08-.69.08-.69 1.12.08 1.7 1.15 1.7 1.15.99 1.7 2.6 1.21 3.23.93.1-.72.39-1.21.7-1.49-2.47-.28-5.06-1.24-5.06-5.5 0-1.22.44-2.21 1.15-2.99-.12-.28-.5-1.42.11-2.95 0 0 .94-.3 3.06 1.14a10.7 10.7 0 0 1 5.57 0c2.13-1.44 3.06-1.14 3.06-1.14.61 1.53.23 2.67.11 2.95.72.78 1.15 1.77 1.15 2.99 0 4.27-2.6 5.21-5.08 5.49.4.35.75 1.02.75 2.06v3.08c0 .3.2.65.77.54A11.1 11.1 0 0 0 12 .9Z"
          />
        </svg>
        <span>GitHub</span>
      </a>
      <ThemeToggle />
      </div>
    </nav>
  );
}
