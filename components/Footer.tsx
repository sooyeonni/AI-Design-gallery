import styles from "./Footer.module.css";

export default function Footer() {
  return (
    <footer className={styles.footer}>
      <p>Made by <a href="https://github.com/sooyeonni" target="_blank" rel="noopener noreferrer">Soo</a></p>
      <p>&copy; 2026 AI Design Study</p>
    </footer>
  );
}
