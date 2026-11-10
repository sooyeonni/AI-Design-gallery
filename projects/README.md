# Submitted static projects

Add your **tested static export**, not a ZIP or framework source:

```text
projects/
  my-project/
    index.html
    assets/
      main.js
      style.css
```

Use relative asset paths. The deployed URL is
`https://sooyeonni.github.io/AI-Design-gallery/projects/my-project/`.

Add a matching entry without `url` or `sample` to [projects.json](../projects.json).
Categories: Slides, Prototype, Experiment, Tool, Other.
Open a PR from your fork; Soo reviews and merges before automatic Pages deployment.

Limits: 100 MiB/project, 20 MiB/file, 300 files/directories.
Local WASM, MediaPipe models, images, fonts and other supported static assets can
be included. Do not include hidden files, environment files, secrets, symlinks,
dependencies, `package.json`, `vercel.json`, server code, or build configuration.
Files are public and share the gallery's origin; no sensitive or login-based apps.
CI copies files only and never runs your project's build scripts.

See the [main guide](../README.md) and [agent instructions](../AGENTS.md).
