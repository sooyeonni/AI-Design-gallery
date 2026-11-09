# Submitted projects

This folder retains **legacy maintainer-reviewed repository submissions**.
New participant submissions use the site's ZIP upload instead; they are stored
privately in Blob with metadata/status in Supabase, not copied into this folder.
See [ZIP submission setup](../docs/submissions.md) and [AGENTS.md](../AGENTS.md).

Each repository-managed gallery project lives in its own folder:

```text
projects/
└── my-project/
    ├── package.json
    ├── src/
    └── ...
```

The folder name must exactly match the entry's kebab-case `slug` in
[`projects.json`](../projects.json).

## What to include

Add a complete web project that Vercel can deploy from this folder. It must
contain at least one of:

- `index.html` for a static site
- `package.json` for a framework project
- `vercel.json` for an explicitly configured Vercel project

Keep source code, assets, lockfiles, and required public configuration. Do not
include `node_modules`, build caches, `.git`, `.vercel`, environment files,
private keys, credentials, or secrets. Symlinks are not accepted.

The automated workflow runs only after a maintainer merges the Pull Request.
It deploys the folder as an isolated Vercel project and writes the resulting
HTTPS URL into `projects.json`. Participants must not add the `url` themselves.

If validation or deployment fails, open the GitHub Actions run for the exact
error, fix the project in a new Pull Request, and merge that fix to retry.
