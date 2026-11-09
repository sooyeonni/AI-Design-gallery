import styles from "./Header.module.css";

interface HeaderProps {
  projectCount: number;
  categoryCount: number;
}

export default function Header({ projectCount, categoryCount }: HeaderProps) {
  return (
    <header className={styles.header}>
      <h1 className={styles.title}>AI Design Study</h1>
      <div className={styles.details}>
        <p className={styles.description}>
          Explore things we&rsquo;re making with AI. Share something you made with AI
          through the simple instruction.
        </p>
        <p className={styles.meta}>
          {projectCount} project{projectCount === 1 ? "" : "s"} · {categoryCount}{" "}
          categor{categoryCount === 1 ? "y" : "ies"}
        </p>
      </div>
    </header>
  );
}
