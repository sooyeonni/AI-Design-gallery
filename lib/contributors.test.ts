import assert from "node:assert/strict";
import { test } from "node:test";
import { getContributors } from "./contributors.ts";
import type { Project } from "./types.ts";

const project: Project = {
  title: "Test project",
  author: "Study member",
  githubUsername: "study-member",
  category: "Prototype",
  tools: ["Claude Code"],
  slug: "test-project",
  createdAt: "2026-09-23",
};

test("contributors include unique GitHub accounts from project metadata", () => {
  const contributors = getContributors([
    project,
    { ...project, title: "Another project", slug: "another-project", githubUsername: "STUDY-MEMBER" },
    { ...project, title: "No GitHub account", slug: "no-github", githubUsername: undefined },
  ]);
  assert.equal(contributors.filter((contributor) => contributor.username.toLowerCase() === "study-member").length, 1);
  assert.deepEqual(contributors.find((contributor) => contributor.username === "study-member"), {
    username: "study-member",
    name: "Study member",
    avatar: "https://github.com/study-member.png?size=64",
    url: "https://github.com/study-member",
  });
});
