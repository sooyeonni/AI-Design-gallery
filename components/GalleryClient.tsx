"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import type { Project } from "@/lib/types";
import { CATEGORIES } from "@/lib/types";
import { getContributors } from "@/lib/contributors";
import Header from "@/components/Header";
import SearchBar from "@/components/SearchBar";
import CategoryFilter from "@/components/CategoryFilter";
import ProjectCard from "@/components/ProjectCard";
import NavTabs from "@/components/NavTabs";
import Footer from "@/components/Footer";
import pageStyles from "@/app/page.module.css";
import styles from "./GalleryClient.module.css";

const FILTERS = ["All", ...CATEGORIES];

export default function GalleryClient({ projects }: { projects: Project[] }) {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<string>("All");
  const [view, setView] = useState<"gallery" | "list">("gallery");

  const categoryCount = useMemo(
    () => new Set(projects.map((project) => project.category)).size,
    [projects]
  );
  const contributors = useMemo(() => getContributors(projects), [projects]);

  const matchingQuery = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return projects.filter((project) => {
      const matchesQuery =
        normalizedQuery.length === 0 ||
        project.title.toLowerCase().includes(normalizedQuery) ||
        project.author.toLowerCase().includes(normalizedQuery);
      return matchesQuery;
    });
  }, [projects, query]);

  const counts: Record<string, number> = { All: matchingQuery.length };
  for (const name of CATEGORIES) {
    counts[name] = matchingQuery.filter((project) => project.category === name).length;
  }
  const groups = CATEGORIES
    .filter((name) => category === "All" || category === name)
    .map((name) => ({
      name,
      projects: matchingQuery.filter((project) => project.category === name),
    }))
    .filter((group) => group.projects.length > 0);
  const filteredCount = groups.reduce((total, group) => total + group.projects.length, 0);

  return (
    <div className={pageStyles.layout}>
      <aside className={pageStyles.sidebar} aria-label="Gallery filters">
        <Header projectCount={projects.length} categoryCount={categoryCount} />
        <h2 className={styles.sidebarHeading}>Categories</h2>
        <CategoryFilter categories={FILTERS} active={category} counts={counts} onChange={setCategory} />
        <section className={styles.contributors} aria-labelledby="contributors-heading">
          <h2 id="contributors-heading" className={styles.sidebarHeading}>Contributors</h2>
          <ul className={styles.contributorList}>
            {contributors.map((contributor) => (
              <li key={contributor.username}>
                <a
                  href={contributor.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={styles.contributor}
                  aria-label={`${contributor.name} on GitHub (opens in a new tab)`}
                >
                  <Image
                    src={contributor.avatar}
                    alt=""
                    width={32}
                    height={32}
                    unoptimized
                    className={styles.avatar}
                  />
                  <span>{contributor.name}</span>
                </a>
              </li>
            ))}
          </ul>
        </section>
      </aside>

      <div className={styles.collection}>
        <div className={pageStyles.topNavigation}>
          <NavTabs active="/" />
        </div>
        <div className={styles.searchControls}>
        <SearchBar value={query} onChange={setQuery} />
        <div className={styles.viewSwitcher} role="group" aria-label="Project view">
          <button type="button" aria-label="Gallery view" title="Gallery view" aria-pressed={view === "gallery"} onClick={() => setView("gallery")}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
              <rect x="3" y="3" width="7" height="7" rx="1" />
              <rect x="14" y="3" width="7" height="7" rx="1" />
              <rect x="3" y="14" width="7" height="7" rx="1" />
              <rect x="14" y="14" width="7" height="7" rx="1" />
            </svg>
          </button>
          <button type="button" aria-label="List view" title="List view" aria-pressed={view === "list"} onClick={() => setView("list")}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
              <path d="M8 5h13M8 12h13M8 19h13M3 5h1M3 12h1M3 19h1" />
            </svg>
          </button>
        </div>
        </div>
        <div className={styles.collectionMeta}>
        <p role="status" aria-live="polite">
          Showing {filteredCount} of {projects.length} projects
        </p>
      </div>
      {filteredCount === 0 ? (
        <div className={styles.empty}>
          <h2>{projects.length === 0 ? "The collection starts with you." : "No projects match your search."}</h2>
          <p>{projects.length === 0 ? "Share something you made with AI." : "Try another title, author, or category."}</p>
          {(query || category !== "All") && (
            <button type="button" onClick={() => { setQuery(""); setCategory("All"); }}>
              Clear search and filters
            </button>
          )}
        </div>
      ) : (
        <div className={styles.groups}>
          {groups.map((group) => (
            <section key={group.name} aria-labelledby={`category-${group.name}`}>
              <h2 id={`category-${group.name}`} className={styles.groupHeading}>{group.name}</h2>
              <div className={view === "gallery" ? styles.grid : styles.list}>
                {group.projects.map((project) => (
                  <ProjectCard key={project.slug} project={project} index={projects.indexOf(project)} view={view} />
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
      <Footer />
      </div>
    </div>
  );
}
