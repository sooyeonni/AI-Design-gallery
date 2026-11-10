import type { Metadata } from "next";
import Link from "next/link";
import NavTabs from "@/components/NavTabs";
import CopyCodeBlock from "@/components/CopyCodeBlock";
import UploadContents from "@/components/UploadContents";
import Footer from "@/components/Footer";
import pageStyles from "@/app/page.module.css";
import headerStyles from "@/components/Header.module.css";
import styles from "./how-to-upload.module.css";

export const metadata: Metadata = {
  title: "How to Upload · AI Design Study",
  description: "Submit a static project by Pull Request. After Soo merges it, GitHub Pages publishes it automatically.",
};

const AGENT_PROMPT = `Prepare my project for the AI Design Study gallery:
https://github.com/sooyeonni/AI-Design-gallery

Use the project open in this workspace. Follow the gallery's AGENTS.md.
Use my existing documented build/export command to create and locally test a static export.
Do not remove features or move assets to external services to force an export.
Use relative asset paths so it works at /AI-Design-gallery/projects/<slug>/.
If the project needs a backend, secrets or unsupported server functionality, explain the blocker.

Ask only for missing title, author, category (Slides, Prototype, Experiment, Tool, Other) and AI tools.
Place only the tested static export in projects/<slug>/ with index.html at its root.
Include local assets, including required MediaPipe WASM/model files.
Limits: 100 MiB per project, 20 MiB per file, 300 files/directories.
Exclude secrets, environment files, node_modules, .git, .vercel, symlinks, package.json and build configuration.
Add my entry to projects.json: title, author, category, tools, slug, createdAt (YYYY-MM-DD).
Omit url and sample. Do not edit other projects, gallery code or workflows.

Help me fork the gallery repository and prepare a branch and Pull Request.
All submitted files will be public. Ask for my confirmation before pushing or opening the PR.
Do not run submitted projects in the gallery's CI or deploy anything yourself.
Give me the PR link, or clear manual steps if GitHub access is unavailable.
Soo will review and merge it; GitHub Pages then publishes it automatically.`;

const STEPS = [
  { id: "get-started", title: "Get started" },
  { id: "build-and-prepare", title: "Build & prepare" },
  { id: "ask-your-ai-agent", title: "Ask your AI agent" },
  { id: "submit-your-pr", title: "Submit your PR" },
  { id: "we-publish-it", title: "We publish it" },
];

export default function HowToUploadPage() {
  return (
    <div className={pageStyles.page}>
      <main id="main-content" tabIndex={-1} className={pageStyles.layout}>
        <aside className={pageStyles.sidebar} aria-label="Upload guide navigation">
          <header className={headerStyles.header}>
            <p className={headerStyles.title}><Link href="/">AI Design Study</Link></p>
            <p className={headerStyles.description}>
              Explore things we&rsquo;re making with AI. Share something you made with AI
              through the simple instruction.
            </p>
            <p className={headerStyles.meta}>5 steps · GitHub account required</p>
          </header>
          <UploadContents steps={STEPS} />
        </aside>
        <div className={styles.main}>
          <div className={pageStyles.topNavigation}><NavTabs active="/how-to-upload" /></div>
          <header className={styles.intro}>
            <h1 className={headerStyles.title}>How to Upload</h1>
            <p className={styles.subtitle}>
              Submit a Pull Request. Soo reviews it, then GitHub Pages publishes it after merge.
              No paid server or personal deployment account needed.
            </p>
          </header>
          <ol className={styles.steps}>
            <li id="get-started" className={styles.step}>
              <span className={styles.stepNumber}>01</span>
              <h2 className={styles.stepTitle}>Get started</h2>
              <p className={styles.stepBody}>
                Create a free GitHub account and fork the gallery repository. Submissions and
                their files are public. Only share work you own or have permission to publish;
                never include company files, private information, or credentials.
              </p>
            </li>
            <li id="build-and-prepare" className={styles.step}>
              <span className={styles.stepNumber}>02</span>
              <h2 className={styles.stepTitle}>Build &amp; prepare</h2>
              <p className={styles.stepBody}>
                Make a website, slide deck, prototype, or experiment with your AI tool.
                Export and test a static site with index.html and local assets. Use relative
                asset paths: your project will live under a subfolder, not the domain root.
              </p>
              <p className={styles.stepBody}>
                Up to 100 MiB per project, 20 MiB per file, and 300 files/directories.
                Local MediaPipe WASM and model files are supported; test camera features
                over HTTPS or localhost. Projects needing a backend, database, or secret
                API key cannot run on GitHub Pages.
              </p>
            </li>
            <li id="ask-your-ai-agent" className={styles.step}>
              <span className={styles.stepNumber}>03</span>
              <h2 className={styles.stepTitle}>Ask your AI agent</h2>
              <p className={styles.stepBody}>
                Your agent can prepare the static files, metadata, and PR. Paste this prompt:
              </p>
              <CopyCodeBlock label="AI agent prompt" code={AGENT_PROMPT} />
            </li>
            <li id="submit-your-pr" className={styles.step}>
              <span className={styles.stepNumber}>04</span>
              <h2 className={styles.stepTitle}>Submit your PR</h2>
              <p className={styles.stepBody}>
                Put the exported files in projects/&lt;slug&gt;/ and add your title, author,
                category, tools, slug, and creation date to projects.json. Leave out url and
                sample. Push a branch to your fork and open a Pull Request to main.
                Submit the exported files, not a ZIP or your source build.
              </p>
              <p className={styles.stepBody}>
                Only change your project folder and metadata entry. Check the PR for secrets
                before sharing it. New contributors may need Soo to allow the validation
                workflow to run.
              </p>
              <div><a className={headerStyles.title}
                href="https://github.com/sooyeonni/AI-Design-gallery/fork"
                target="_blank" rel="noopener noreferrer">Fork &amp; submit on GitHub ↗</a></div>
            </li>
            <li id="we-publish-it" className={styles.step}>
              <span className={styles.stepNumber}>05</span>
              <h2 className={styles.stepTitle}>We publish it</h2>
              <p className={styles.stepBody}>
                Automatic file checks must pass, and Soo reviews the changes before merging.
                After merge, GitHub Actions copies the approved static files and publishes the
                gallery and projects to GitHub Pages. No participant build scripts run in CI.
                A failed deployment leaves the previous site live.
              </p>
              <p className={styles.stepBody}>
                This is a shared-origin showcase for trusted study members, not isolated
                hosting for arbitrary apps. Do not use it for logins or sensitive transactions.
                Hosting uses GitHub&rsquo;s free public-repository features within their usage
                limits; no AI review server is required.
              </p>
              <ol className={styles.finishFlow} aria-label="Your path to the gallery">
                {["Build", "Pull Request", "Checks", "Soo reviews", "Merge", "Gallery ✨"].map((stage) => <li key={stage}>{stage}</li>)}
              </ol>
            </li>
          </ol>
          <Footer />
        </div>
      </main>
    </div>
  );
}
