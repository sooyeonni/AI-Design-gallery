"use client";

import { motion, useReducedMotion } from "framer-motion";
import Image from "next/image";
import { useState } from "react";
import type { Project } from "@/lib/types";
import { formatDate } from "@/lib/dates";
import styles from "./ProjectCard.module.css";

interface ProjectCardProps {
  project: Project;
  index: number;
  view: "gallery" | "list";
}

export default function ProjectCard({ project, index, view }: ProjectCardProps) {
  const reduceMotion = useReducedMotion();
  const [failedThumbnail, setFailedThumbnail] = useState<string>();
  const thumbnailUrl = project.thumbnailUrl;
  const preview = (
    <>
      <div className={styles.preview} data-category={project.category} aria-hidden="true">
        {thumbnailUrl && failedThumbnail !== thumbnailUrl ? (
          <Image
            src={thumbnailUrl}
            alt=""
            fill
            unoptimized
            sizes={view === "list" ? "128px" : "(max-width: 640px) 100vw, 33vw"}
            className={styles.thumbnail}
            onError={() => {
              console.error(`Project thumbnail could not be loaded: ${project.slug}`);
              setFailedThumbnail(thumbnailUrl);
            }}
          />
        ) : (
          <>
            {project.sample && <><span className={styles.shapeOne} /><span className={styles.shapeTwo} /></>}
            <span className={styles.previewTitle}>{project.title}</span>
            <span className={styles.previewLabel}>{project.sample ? "Sample" : "Preview unavailable"}</span>
          </>
        )}
      </div>
      <h3 className={styles.title}>{project.title}</h3>
    </>
  );

  return (
    <motion.article
      className={styles.card}
      data-view={view}
      initial={false}
      whileHover={reduceMotion ? undefined : { y: -2 }}
      transition={{ duration: 0.2 }}
    >
      {project.url ? (
        <a href={project.url} target="_blank" rel="noopener noreferrer" className={styles.projectLink}
          aria-label={`${project.title} (opens in a new tab${project.sample ? "; placeholder destination" : ""})`}>
          {preview}
        </a>
      ) : (
        <div className={styles.projectLink}>
          {preview}
          <span className={styles.pending} role="status">Deployment pending</span>
        </div>
      )}
      <p className={styles.author}>{project.author} <span aria-hidden="true">·</span> {project.tools.join(", ")}</p>
      <div className={styles.details}>
        <time dateTime={project.createdAt}>{formatDate(project.createdAt)}</time>
        <span>{String(index + 1).padStart(2, "0")}{project.sample && " / Sample"}</span>
      </div>
    </motion.article>
  );
}
