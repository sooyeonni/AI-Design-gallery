# AI Design Study — Gallery

A gallery of things we make with AI, published with free public-repository
GitHub Actions and GitHub Pages.

**Site:** https://sooyeonni.github.io/AI-Design-gallery/

## Submit a project

1. Create a free GitHub account and fork this repository.
2. Build and locally test your project's static export with its existing workflow.
3. Add only the exported files to `projects/<slug>/`, including `index.html`.
   Use relative asset paths so they work under
   `/AI-Design-gallery/projects/<slug>/`, not just at a domain root.
4. Add one entry to [projects.json](./projects.json):

   ```json
   {
     "title": "My project",
     "author": "Soo",
     "category": "Prototype",
     "tools": ["Claude Code"],
     "slug": "my-project",
     "createdAt": "2026-11-09"
   }
   ```

5. Leave out `url` and `sample`. Push a branch to your fork and open a PR to `main`.
6. File checks run; Soo reviews and merges. GitHub Actions captures your opening
   screen and publishes the gallery and approved files. No thumbnail upload is
   needed. A failed capture or deployment leaves the old site live.

Your AI coding agent can help: copy the prompt on **How to Upload** or use
[AGENTS.md](./AGENTS.md). Confirm before it pushes or opens a PR.
The guide includes five short steps, project examples and suggested AI tools.
Read AGENTS.md on GitHub or download
the current file from the guide; attach it to your agent chat without overwriting
any instructions in your own project. The download is generated from this repository's
AGENTS.md during the build so the two stay in sync.
All submitted files and Git history are public. Do not submit confidential/company
files or assets without permission. A GitHub account is required; a Vercel account is not.

Categories: **Slides, Prototype, Experiment, Tool, Other**.

## Supported projects and limits

- Static HTML/CSS/JavaScript with local assets. Local MediaPipe `.wasm`, `.task`,
  `.tflite`, and `.bin` files are supported, but no automated webcam interaction
  testing is claimed. Test camera features over localhost/HTTPS yourself.
- **100 MiB per project, 20 MiB per file, 300 files/directories.**
- No server functions, databases, secret API keys, build configuration, hidden files,
  dependencies, symlinks, or ZIP uploads. Export locally; CI does not build submissions.
- Keep all projects together under 750 MiB to leave room for the gallery.
- Existing reviewed entries with explicit HTTPS `url` values retain those URLs.
  Existing sample entries remain labeled; new PRs must not add sample flags.

This is a **trusted study-member showcase**, not an arbitrary untrusted app host.
Projects share the `sooyeonni.github.io` origin with the gallery and any other
Pages projects on that account. They are not isolated by subfolder.
Review scripts, service workers, and external data requests before merging.
Do not host logins or sensitive transactions. CI checks reduce risk but do not
certify safety, asset permissions, or functional correctness.

## Development

Node.js 24 and npm:

```bash
npm ci
npm run dev
npm run lint
npm run typecheck
npm test
npm run validate:submissions
npm run build:pages
```

`build:pages` produces `out/` with repository-prefixed gallery assets and
`projects/<slug>/` static exports. It builds in a temporary directory, excludes
legacy API/status routes, copies only validated static project files, and cleans
the temporary build. It never copies private environment files into the export.
No submission services or credentials are required.

To preview the exact Pages paths, serve the repository root with a local static
server or mount `out/` at `/AI-Design-gallery/`. Do not execute submitted scripts
on a company computer. Maintainers should inspect code and use a separately
isolated environment for interactive review of unfamiliar projects.

## GitHub Pages setup

1. Keep this repository **public**.
2. In **Settings → Pages**, select **GitHub Actions** as the source.
3. Merge to `main`, or run **Publish gallery to GitHub Pages** from Actions.
4. Check the workflow's deployment URL. No custom domain or paid server is required.

The workflow builds on a standard `ubuntu-latest` runner with read-only repository
permission and no deployment secrets. A separate deploy job receives only Pages/OIDC
permissions and deploys the artifact. Submitted build scripts are never executed.
PR validation has no secrets; first-time contributors may need workflow approval.
Protect `main` and review infrastructure changes before merging.

Between build and deploy, a separate read-only capture job renders reviewed static
exports in a non-root Playwright Docker container. The container has no credentials,
Docker socket, host network, or external network access; exports are mounted read-only.
Capabilities are dropped, privilege escalation is disabled, and CPU, memory, process,
temporary storage and workflow runtime are limited. Chromium's internal sandbox is
disabled inside this restricted container; do not treat Docker as a safety certification
or use this workflow for arbitrary unreviewed submissions.
Each project gets a fresh browser context with service workers/downloads blocked.
Only the project's own files are served, under the exact Pages subfolder.
Opening screens are captured at 1280 × 720 after fonts load and a short render delay,
without clicking, signing in, or granting camera/microphone permissions.
External requests are blocked, so assets must be local. JavaScript errors or capture
failures stop publication, with details in Actions. This is a thumbnail check, not a
functional or security review. Existing externally hosted URLs are not captured.

The worker's Playwright package and container image versions must match; its npm
lockfile lives in `scripts/thumbnail-worker/`. Generated PNGs are checked for a
regular file, size, format and dimensions before being added to the Pages artifact.
They are not committed to Git. `build:pages` alone produces a capture manifest,
not screenshots; automatic capture runs only on GitHub after merge or manual dispatch.
Do not run the screenshot worker with unfamiliar submissions on a company computer.

The workflow uses one-day Pages artifacts, no Actions cache, no paid runners,
and no external AI or Vercel deployment service. Free services have quotas:
Pages sites are at most 1 GB with a 100 GB/month soft bandwidth limit.
Repository history and artifacts also consume storage. Stay within GitHub's
terms; do not enable paid features or assume unlimited capacity.

Official limits: [Pages](https://docs.github.com/pages/getting-started-with-github-pages/github-pages-limits)
and [Actions billing](https://docs.github.com/en/billing/concepts/product-billing/github-actions).

## Previous ZIP/Vercel system

New ZIP intake is closed (POST returns 410). Existing private submissions, Blob
files and Supabase records are **not deleted or published** by this migration.
Existing private receipts remain on the old Vercel site's `/submission-status`
and its API; they do not move to Pages. The old Vercel application can still be
built with `npm run build`, but is not required for new Pages submissions.
Historical operational details: [ZIP system](./docs/submissions.md).

The former Vercel project-deployment workflow is replaced by Pages. Legacy scripts
are retained but do not run automatically. Do not run them for new submissions.
No Vercel/Supabase/Blob services, keys, or billing settings are removed automatically:
only disconnect/delete them after separately confirming retention and old receipts.

The gallery retains search, category filters, Gallery/List views, light/dark mode,
contributor links, and the shared **Made by Soo · © 2026 AI Design Study** footer.
