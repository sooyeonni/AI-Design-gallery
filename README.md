# AI Design Study Gallery 🎨

A community gallery for projects made with AI. Projects are shared as static
websites and published on GitHub Pages.

**Visit the gallery:** https://sooyeonni.github.io/AI-Design-gallery/

## Add your project 📂

The easiest way to contribute is to submit a pull request (PR). If you have
write access to the gallery repository, create a new branch there for each
project—no fork is needed. Otherwise, fork the gallery once and reuse your fork
with a new branch for each submission.

1. Sign in to GitHub. If you do not have write access to this repository,
   [fork it](https://github.com/sooyeonni/AI-Design-gallery/fork), or reuse your
   existing fork.
2. Follow your project's own build instructions to create and test a static
   export on your computer. The gallery's CI checks exported files but does not
   run your project's build scripts.
3. In the repository you will submit from (the gallery itself if you have write
   access, or your fork), create a new branch and add the export to
   `projects/<your-project-slug>/`. Put an `index.html` at the folder root and
   use relative paths for assets so the project works from its gallery URL.
4. Add one entry for your project to [projects.json](./projects.json):

   ```json
   {
     "title": "My project",
     "author": "Your name",
     "githubUsername": "your-github-username",
     "category": "Prototype",
     "tools": ["Claude Code"],
     "slug": "my-project",
     "createdAt": "YYYY-MM-DD"
   }
   ```

   Choose a category from **Slides**, **Prototype**, **Experiment**, **Tool**,
   or **Other**. Use your exact GitHub username for `githubUsername`; it adds
   you to the gallery's contributor list. Use a unique, lowercase, kebab-case
   slug. Do not add `url` or `sample` to a new entry.
5. Push your branch to that repository and open a PR to
   `sooyeonni/AI-Design-gallery`'s `main` branch. If you use a branch in the
   gallery repository, do not push directly to `main`. Check that the PR
   includes only your project folder and its `projects.json` entry.
6. After review and merge, GitHub checks and publishes the gallery. It also
   captures a thumbnail of your project's opening screen; you do not need to
   upload one. A failed check or capture prevents the update from being
   published, so the current live gallery stays available.

Need a hand? The [How to Upload guide](https://sooyeonni.github.io/AI-Design-gallery/how-to-upload/)
has step-by-step instructions and a prompt you can give your coding agent. The
prompt checks whether you can use a branch in the gallery repository or need
to submit from a fork.
You can also read [AGENTS.md](./AGENTS.md) for detailed submission requirements.
Always review your agent's changes, and confirm before it pushes or opens a PR.

## What can I submit? 🔍

Projects must be self-contained static websites: HTML, CSS, JavaScript, and
local assets. Local images, fonts, audio/video, and supported model files such
as `.wasm`, `.task`, `.tflite`, and `.bin` are allowed.

- Maximum **100 MiB per project**, **20 MiB per file**, and **300 files and
  directories** per project.
- Keep all projects together under **750 MiB** to leave room for the gallery.
- Include only files needed to run the exported site. Do not include
  dependencies, build configuration, server code, hidden files, symlinks,
  environment files, or secrets.
- Projects that need a server, database, or secret API key cannot run as static
  exports. Explain any features that cannot be included; do not remove them
  without telling the project owner.

All submitted files and Git history are public. Only submit work and assets you
have permission to share. Projects share the `sooyeonni.github.io` website
origin with the gallery, so do not include logins, sensitive transactions, or
other private data. Camera features are not tested automatically; test them
yourself over localhost or HTTPS.

## For gallery contributors and maintainers

This section is for people working on the gallery itself—not for submitting a
project. You need **Node.js 24** and npm to run the gallery locally:

```bash
npm ci
npm run dev
```

To check your changes before opening a PR:

```bash
npm run lint
npm run typecheck
npm test
npm run validate:submissions
```

Maintainers can build the GitHub Pages version with `npm run build:pages`.
It creates a static export in `out/` and copies only validated project files;
it does not run submitted build scripts. For an exact preview of the Pages
paths, serve `out/` at `/AI-Design-gallery/`.

## Publishing and previous submissions 📚

The gallery is published from this public repository using GitHub Actions and
GitHub Pages. No paid hosting account is needed. Maintainers can find setup and
deployment details in the
[Pages workflow](./.github/workflows/deploy-pages.yml).

New projects use static-export PRs; ZIP uploads are closed. Historical ZIP/Vercel
submission records and receipt endpoints are retained and are not part of the
new publishing flow. See the [historical submission notes](./docs/submissions.md)
for details.
