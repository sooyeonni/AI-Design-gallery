import styles from "./page.module.css";
import GalleryClient from "@/components/GalleryClient";
import { getProjects, parseProjects } from "@/lib/projects";
import { connection } from "next/server";
import { publishedSubmissions } from "@/lib/submission-store";

export default async function Home() {
  const isPages = process.env.GITHUB_PAGES === "true";
  if (!isPages) await connection();
  const published = isPages ? [] : await publishedSubmissions();
  const projects = parseProjects([
    ...getProjects(),
    ...published.map((project) => ({
      title: project.title, author: project.author, category: project.category,
      tools: project.tools, slug: project.slug, url: project.deployment_url,
      createdAt: project.created_at.slice(0, 10),
    })),
  ]);

  return (
    <div className={styles.page}>
      <main id="main-content" tabIndex={-1} className={styles.main}>
        <GalleryClient projects={projects} />
      </main>
    </div>
  );
}
