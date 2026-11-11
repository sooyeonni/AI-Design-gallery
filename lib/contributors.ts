import type { Project } from "./types.ts";

export interface Contributor {
  username: string;
  name: string;
  avatar: string;
  url: string;
}

export function getContributors(projects: readonly Project[]): Contributor[] {
  const contributors = new Map<string, Contributor>();

  for (const project of projects) {
    const username = project.githubUsername;
    if (!username) continue;

    const key = username.toLowerCase();
    if (contributors.has(key)) continue;

    contributors.set(key, {
      username,
      name: project.author,
      avatar: `https://github.com/${username}.png?size=64`,
      url: `https://github.com/${username}`,
    });
  }

  return [...contributors.values()];
}
