export type ProjectCategory =
  | "Slides"
  | "Prototype"
  | "Experiment"
  | "Tool"
  | "Other";

export interface Project {
  /** Project title */
  title: string;
  /** Author / member name */
  author: string;
  /** GitHub username used for the gallery's contributor link */
  githubUsername?: string;
  /** One of the supported gallery categories */
  category: ProjectCategory;
  /** AI tool(s) used to build the project */
  tools: string[];
  /**
   * Kebab-case identifier matching the project's static build output at
   * `projects/<slug>/`. Used by the automated deployment workflow to find
   * the project folder and to match it back to this entry.
   */
  slug: string;
  /**
   * Publicly accessible deployed URL. Resolved automatically for Pages projects;
   * participants do not need to supply it.
   */
  url?: string;
  /** Generated screenshot URL, resolved by the gallery rather than participant metadata. */
  thumbnailUrl?: string;
  /** ISO date string (YYYY-MM-DD) */
  createdAt: string;
  /** Marks example/placeholder data that can be safely removed */
  sample?: boolean;
}

/** Kebab-case slug: lowercase letters, numbers, and single hyphens between segments. */
export const SLUG_PATTERN = /^[a-z0-9]+(-[a-z0-9]+)*$/;

export const CATEGORIES: ProjectCategory[] = [
  "Slides",
  "Prototype",
  "Experiment",
  "Tool",
  "Other",
];
