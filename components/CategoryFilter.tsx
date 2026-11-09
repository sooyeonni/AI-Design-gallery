"use client";

import styles from "./CategoryFilter.module.css";

interface CategoryFilterProps {
  categories: string[];
  active: string;
  counts: Record<string, number>;
  onChange: (category: string) => void;
}

export default function CategoryFilter({
  categories,
  active,
  counts,
  onChange,
}: CategoryFilterProps) {
  return (
    <div
      className={styles.wrap}
      role="group"
      aria-label="Filter projects by category"
    >
      {categories.map((category) => {
        const isActive = category === active;
        return (
          <button
            key={category}
            type="button"
            className={styles.chip}
            data-active={isActive}
            aria-pressed={isActive}
            onClick={() => onChange(category)}
          >
            <span>{category}</span>
            <span className={styles.count}>{counts[category]}</span>
          </button>
        );
      })}
    </div>
  );
}
