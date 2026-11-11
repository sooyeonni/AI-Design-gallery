import type { Project } from "./types.ts";

export interface Contributor {
  username: string;
  name: string;
  avatar: string;
  url: string;
}

const LEGACY_CONTRIBUTORS: Contributor[] = [
  {
    username: "sooyeonni",
    name: "sooyeonni",
    avatar: "https://avatars.githubusercontent.com/u/29706402?v=4",
    url: "https://github.com/sooyeonni",
  },
  {
    username: "worktaelim",
    name: "Tae Lim",
    avatar: "https://avatars.githubusercontent.com/u/271098619?v=4",
    url: "https://github.com/worktaelim",
  },
];

export function getContributors(projects: readonly Project[]): Contributor[] {
  const contributors = new Map(
    LEGACY_CONTRIBUTORS.map((contributor) => [contributor.username.toLowerCase(), contributor]),
  );

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
