"use client";

import { useEffect, useState } from "react";
import styles from "@/app/how-to-upload/how-to-upload.module.css";

interface Step {
  id: string;
  title: string;
}

export default function UploadContents({ steps }: { steps: Step[] }) {
  const [active, setActive] = useState(steps[0]?.id);

  useEffect(() => {
    const sections = steps.map((step) => {
      const section = document.getElementById(step.id);
      if (!section) {
        throw new Error(`Upload step "${step.id}" was not found.`);
      }
      return section;
    });
    const update = () => {
      let current = sections[0]?.id;
      for (const section of sections) {
        if (section.getBoundingClientRect().top <= 80) {
          current = section.id;
        }
      }
      if (window.scrollY > 0 && window.scrollY + window.innerHeight >= document.documentElement.scrollHeight - 2) {
        current = sections.at(-1)?.id ?? current;
      }
      setActive(current);
    };
    update();
    window.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
    return () => {
      window.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
    };
  }, [steps]);

  return (
    <nav aria-label="On this page">
      <h2 className={styles.sidebarHeading}>On this page</h2>
      <ol className={styles.contents}>
        {steps.map((step, index) => (
          <li key={step.id}>
            <a href={`#${step.id}`} aria-current={active === step.id ? "step" : undefined}>
              <span className={styles.contentsNumber}>{String(index + 1).padStart(2, "0")}</span>
              {step.title}
            </a>
          </li>
        ))}
      </ol>
    </nav>
  );
}
