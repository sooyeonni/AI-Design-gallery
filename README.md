# AI Design Study — Gallery

A small, polished web gallery showcasing projects built by members of the
**AI Design Study** using AI tools such as Claude, ChatGPT, Cursor, Figma
Make, Lovable, v0, and more.

This is a community showcase with a Next.js gallery and a private ZIP
submission pipeline. Participants do not need GitHub or Vercel accounts.

Visit [AI Design Study](https://ai-design-gallery.vercel.app).

## Submit your project

1. Open your project in your AI coding tool and copy the packaging prompt from
   [How to Upload](https://ai-design-gallery.vercel.app/how-to-upload).
2. Let your agent build, test, and package a self-contained static-site ZIP.
   It should return the ZIP path, not interview you for submission details.
   Agent instructions: [`AGENTS.md`](./AGENTS.md).
3. Click **Upload project** on the website. Enter your title, author name,
   category, and AI tools, choose the ZIP, and complete the anti-bot check.
   You upload it yourself; your agent does not submit or deploy it.
4. Save your private status link for review feedback and deployment updates.
5. After archive validation, self-hosted AI review, isolated desktop/mobile
   preview checks, and a verified deployment pass, the project appears in the gallery.

Automatic publication supports static exports with `index.html` and local assets,
not arbitrary source builds. Server/API/database projects and uncertain results
need further review. Missing review or deployment services block publication;
a successful upload is not an approval.

ZIP limits: **25 MiB compressed, 100 MiB expanded, 20 MiB per file, 300 entries**.
The browser uploads directly to private Blob storage using a short-lived,
path-scoped token. Server-side archive checks must pass before review is queued.
Existing installations must apply [the direct-upload migration](./supabase/direct-uploads.sql)
before deploying this version.
Never include secrets, private environment files, dependencies, repository metadata,
or symlinks. You must have permission to publish all included assets.

For service configuration and worker operations, see the
[submission system guide](./docs/submissions.md).

## What this is

- A **Gallery** page with a category sidebar, title/author search, and
  a responsive preview grid grouped by category. A Gallery / List switcher
  beside search changes the layout without resetting search or filters.
  Sidebar counts reflect the
  current search across all categories. Preview artwork is illustrative,
  generated with CSS rather than screenshots of submitted projects.
- A **Contributors** section below the gallery categories shows confirmed
  GitHub names, avatars, and profile links. Profiles are curated in
  [`GalleryClient.tsx`](./components/GalleryClient.tsx), not inferred from
  sample authors or fetched from the private repository at runtime.
- A **How to Upload** page that walks anyone through preparing and submitting
  a project — including copyable prompts for AI coding agents. It shares the
  gallery's sidebar layout and compact typography, with links to each step.
  The sidebar highlights the current step as you scroll.
- An icon-only **light / dark mode** toggle beside GitHub appears on both
  pages. The theme stays selected during navigation and resets to light
  when the page is reloaded. Illustrative preview artwork retains its colors.
- A shared footer on both pages credits **Made by Soo** and **© 2026 AI Design Study**.
- All project metadata lives in [`projects.json`](./projects.json), which
  retains existing/sample and maintainer-managed projects. Published ZIP
  submissions are read from Supabase alongside that file.
- Public **ZIP submissions** use private Vercel Blob storage, Supabase,
  Turnstile, and a separate review worker. Participants never need a PR.
  Setup and operational details: [submission system](./docs/submissions.md).
- Existing web projects under [`projects/`](./projects/) retain their
  reviewed post-merge deployment workflow.

The gallery is a Next.js app with server-side intake/status APIs. Submission
builds never execute in its web server. ZIP publication is fail-closed when
review infrastructure is not configured.

## Tech stack

- [Next.js](https://nextjs.org/) (App Router) + React + TypeScript
- CSS Modules / global CSS (no Tailwind)
- [Framer Motion](https://www.framer.com/motion/) for subtle animation
- Ready to deploy on [Vercel](https://vercel.com/)
- GitHub Actions + Vercel CLI for post-merge project deployment

## Running locally

Use Node.js 24 LTS and npm. The gallery reads published submissions at request
time; search, filters, and clipboard interactions run in the browser.
With no submission environment configured, existing projects still display,
while uploads are visibly unavailable.

```bash
npm ci
npm run dev
```

Then open [http://localhost:3000](http://localhost:3000).

Other useful scripts:

```bash
npm run build   # production build
npm run start   # run the production build locally
npm run lint    # ESLint
npm run typecheck # generated route types + TypeScript
npm test        # metadata, archive, review, and database tests
npm run validate:submissions # metadata and project-folder safety checks
```

## Deploying to Vercel

1. Push this repository to GitHub under `sooyeonni`. Keep it private.
2. Go to [vercel.com/new](https://vercel.com/new) and import the
   repository.
3. Grant the Vercel GitHub integration access to this private repository.
   Use the default Next.js build settings, Node.js 24, and `main` as the
   production branch. No environment variables are required for browsing
   existing projects; ZIP intake requires the configuration documented
   in [submission setup](./docs/submissions.md).
4. Deploy. Every merge to the default branch automatically redeploys the
   gallery.

### Configure legacy project deployment

The gallery deployment and submitted-project deployment are separate:

1. Create a Vercel access token for the account or team that will own the
   study projects.
2. In GitHub, open **Settings → Secrets and variables → Actions** and add the
   token as the repository secret `VERCEL_TOKEN`.
3. If deploying to a Vercel team, add its team slug as the repository
   variable `VERCEL_SCOPE`. Leave it unset for a personal Vercel account.
4. Ensure GitHub Actions is allowed to write repository contents. If `main`
   has branch protection, allow the `github-actions[bot]` writeback or use a
   ruleset exception for the `Deploy submitted projects` workflow.

The workflow only receives the token on a `push` to `main` after review and
merge. Pull Request workflows never receive it and never execute participant
project build scripts.

## Legacy maintainer-managed projects

Existing repository-managed projects have:

- deployable source code in `projects/<slug>/`
- one matching metadata object in [`projects.json`](./projects.json)

```json
{
  "title": "AI Travel Planner",
  "author": "Soo",
  "category": "Prototype",
  "tools": ["Claude Code", "Figma Make"],
  "slug": "ai-travel-planner",
  "createdAt": "2026-09-23"
}
```

- `slug` matches the project folder exactly and uniquely.
- `createdAt` (ISO `YYYY-MM-DD`) is used both to display the date and to
  sort projects, newest first.
- `tools` is an array, so a project can list multiple AI tools.
- `url` is intentionally omitted from a participant's Pull Request. After
  merge, the deployment workflow adds the HTTPS URL returned by Vercel.
- Entries marked `"sample": true` are placeholder projects included so the
  gallery can be visually evaluated during development. Remove them
  whenever you like once real projects are added. They are visibly labeled
  **Sample** and link to the reserved `example.com` domain, not real member
  deployments. Replace the URL and remove the flag for a real submission.
- Validation checks required fields, category, slug uniqueness, optional
  HTTPS URLs, real calendar dates, project folders, sensitive files, generated
  dependencies, and symlinks. Failures identify the entry or path.

## Project requirements

Every ZIP submission must have:

- A **title**
- An **author**
- A valid **category** (see below)
- At least one **AI tool** used
- A ZIP up to 25 MiB compressed / 100 MiB expanded / 300 entries / 20 MiB per file
- For automatic publication: `index.html` plus local assets, without source
  build configuration, server code or external network dependencies

The server generates unique slugs and creation dates. Participants do not
provide a public URL; the review worker supplies it after a verified deploy.
Projects must not contain secrets, environment files, dependency folders,
repository metadata, Vercel state, or symlinks.

## Available categories

- `Slides`
- `Prototype`
- `Experiment`
- `Tool`
- `Other`

## Contributing

- Project submissions: see "Submit your project" above, or just
  ask your AI coding agent to read [`AGENTS.md`](./AGENTS.md).
- Gallery UI/design changes: open a Pull Request with your change. Please
  avoid introducing Tailwind or unrelated dependencies — keep
  the architecture simple.

## Validation

Run `npm run lint`, `npm run typecheck`, `npm test`,
`npm run validate:submissions`, and `npm run build` before sharing changes.
Then run `npm start` and verify:

- Search matches titles and authors, regardless of capitalization.
- Slides appears first, followed by Prototype, Experiment, Tool, and Other.
- Each of the five categories works, including combined search/filter and
  empty results; clearing filters restores the full collection.
- Cards within each category are newest first, show all metadata, and open their HTTPS URL in
  a separate tab with `noopener noreferrer`; projects awaiting deployment
  show a non-interactive status instead of a broken link.
- The packaging prompt's copy button copies the exact prompt, shows temporary feedback, and
  surface a helpful error if clipboard permission is denied.
- Keyboard focus, reduced motion, and narrow mobile layouts work on both pages.

Clipboard access requires HTTPS or localhost. Submission credentials stay
server-side. ZIP deployment credentials belong only on the dedicated worker;
legacy deployment credentials remain protected GitHub Actions secrets.
Database/state tests use in-memory Postgres through PGlite.

## Legacy automatic deployment behavior

[`deploy-projects.yml`](./.github/workflows/deploy-projects.yml) runs only
after changes to `projects/` or `projects.json` land on `main`. It:

1. Validates metadata and every real project folder.
2. Redeploys every real project so the newest merge always covers changes from
   any queued or closely timed push.
3. Creates or reuses an isolated Vercel project named
   `ai-design-study-<slug>`.
4. deploys the matching folder with the pinned Vercel CLI.
5. Writes successful HTTPS deployment URLs back to `projects.json`.
6. Commits and pushes the metadata update as `github-actions[bot]`.

All deployments must succeed before metadata is written. The workflow retries
its writeback if `main` advances during deployment, rebuilding the metadata
update on top of the latest commit when needed. This avoids lost updates,
partially updated data, and broken gallery links. A workflow failure leaves
pending cards in their safe "Deployment pending" state. The validation
workflow also rejects participant attempts to add or alter `url` or the
reserved `sample` flag.
