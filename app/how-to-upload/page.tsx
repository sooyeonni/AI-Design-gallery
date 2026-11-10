import type { Metadata } from "next";
import type { ReactNode } from "react";
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

My GitHub username is: [replace with your username]
My fork URL is: https://github.com/[your-username]/AI-Design-gallery

Use the project open in this workspace. Read the gallery's current instructions:
https://github.com/sooyeonni/AI-Design-gallery/blob/main/AGENTS.md
If you cannot read that URL, ask me to attach the downloaded AGENTS.md.
Do not overwrite an existing AGENTS.md in my project.
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

Use my fork (or guide me through creating it if missing). Clone it into a separate folder,
not inside or over my original project. Create a branch such as add-my-project.
Keep my original project intact and copy only its tested static export into the fork.
If GitHub sign-in is needed, guide me through it; never ask me to paste a token into chat.
Prepare a Pull Request with base sooyeonni/AI-Design-gallery:main and my fork/branch as the head.
All submitted files will be public. Ask for my confirmation before pushing or opening the PR.
Do not run submitted projects in the gallery's CI or deploy anything yourself.
Give me the PR link, or clear manual steps if GitHub access is unavailable.
Soo will review and merge it; GitHub Pages then publishes it automatically.`;

const STEPS = [
  { id: "get-started", title: "Create your fork" },
  { id: "build-and-prepare", title: "Build & prepare" },
  { id: "ask-your-ai-agent", title: "Ask your AI agent" },
  { id: "submit-your-pr", title: "Submit your PR" },
  { id: "we-publish-it", title: "We publish it" },
];

function GitHubIllustration({ title, children, caption }: {
  title: string; children: ReactNode; caption: string;
}) {
  return (
    <figure className={styles.illustration}>
      <div className={styles.browserBar}><span aria-hidden="true">● ● ●</span> {title}</div>
      <div className={styles.mockScreen}>{children}</div>
      <figcaption>{caption} Illustration, not a live GitHub screen; labels may vary slightly.</figcaption>
    </figure>
  );
}

export default function HowToUploadPage() {
  const basePath = process.env.GITHUB_PAGES === "true" ? "/AI-Design-gallery" : "";
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
            <div className={styles.startHere}>
              <strong>New to GitHub? You do not need to write code.</strong>
              <p>Make your own copy of this gallery, let your AI coding agent prepare your project,
                then send Soo a review request. Your original project stays untouched.</p>
              <dl className={styles.glossary}>
                <div><dt>Fork</dt><dd>Your own copy of this repository on GitHub.</dd></div>
                <div><dt>Branch</dt><dd>A separate workspace for your changes.</dd></div>
                <div><dt>Pull Request (PR)</dt><dd>A request to add your changes to Soo&rsquo;s gallery.</dd></div>
                <div><dt>Merge</dt><dd>Soo accepts your PR. Publishing starts automatically.</dd></div>
              </dl>
            </div>
          </header>
          <ol className={styles.steps}>
            <li id="get-started" className={styles.step}>
              <span className={styles.stepNumber}>01</span>
              <h2 className={styles.stepTitle}>Create your GitHub account &amp; fork</h2>
              <p className={styles.stepBody}>
                You only need to fork once. It does not change Soo&rsquo;s gallery or copy
                anything from your computer.
              </p>
              <ol className={styles.substeps}>
                <li><a href="https://github.com/signup" target="_blank" rel="noopener noreferrer">Create a free GitHub account</a>, or sign in to your personal account. No paid plan is needed.</li>
                <li><a href="https://github.com/sooyeonni/AI-Design-gallery" target="_blank" rel="noopener noreferrer">Open the gallery repository</a>. At the top right, click <strong>Fork</strong>, then <strong>Create a new fork</strong> if a menu appears.</li>
                <li>On the next screen, set <strong>Owner</strong> to your username. Keep <strong>Repository name</strong> as <strong>AI-Design-gallery</strong> and click <strong>Create fork</strong>.</li>
                <li>Check the page heading: it should say <strong>your-username / AI-Design-gallery</strong>, with &ldquo;forked from sooyeonni/AI-Design-gallery&rdquo; below. Copy this page&rsquo;s URL for your agent.</li>
              </ol>
              <GitHubIllustration title="GitHub · create your copy" caption="1. Fork the original. 2. Choose your account. 3. Check that the copy belongs to you.">
                <div className={styles.mockRow}><span>sooyeonni / <strong>AI-Design-gallery</strong></span><span className={styles.mockButton}>1 · Fork</span></div>
                <div className={styles.mockDivider} />
                <div className={styles.mockField}><span>2 · Owner</span><strong>your-username</strong></div>
                <div className={styles.mockField}><span>Repository name</span><strong>AI-Design-gallery</strong></div>
                <span className={styles.mockPrimary}>Create fork</span>
                <p className={styles.mockHint}>3 · Your copy: your-username / AI-Design-gallery</p>
              </GitHubIllustration>
              <p className={styles.stepBody}>
                Already have a fork? Open it and use <strong>Sync fork → Update branch</strong> if
                available before starting. If GitHub reports a conflict, ask your agent for help;
                do not discard your own changes. If you are Soo, use the original repository and
                create a branch instead of a fork.
              </p>
              <p className={styles.notice}>Everything you submit will be public, including PR history.
                Never include company files, credentials, or work you do not have permission to publish.</p>
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
                A <strong>static export</strong> is the finished website, not the editable source
                project. Ask your coding agent to prepare it in the next step. A <strong>slug</strong> is
                a short URL-friendly folder name, such as <code className={styles.inlineCode}>blow-and-pop</code>.
              </p>
              <GitHubIllustration title="Files your agent prepares" caption="Only the finished website and one project entry go into your fork.">
                <pre className={styles.fileTree}>{`AI-Design-gallery/
├── projects/
│   └── blow-and-pop/
│       ├── index.html
│       └── assets/
│           └── ...local files
└── projects.json  ← add your project info`}</pre>
              </GitHubIllustration>
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
                Use a coding agent that can read local files, such as Copilot in VS Code,
                Cursor, or Claude Code. A browser-only chat cannot edit your local project
                unless it has an appropriate file/workspace connection.
              </p>
              <div className={styles.resourceCard}>
                <strong>Get the instructions: AGENTS.md</strong>
                <p>A plain-text guide for your AI coding agent, not an app to install.
                  The exact filename is <strong>AGENTS.md</strong> (plural).</p>
                <div className={styles.resourceActions}>
                  <a href="https://github.com/sooyeonni/AI-Design-gallery/blob/main/AGENTS.md"
                    target="_blank" rel="noopener noreferrer">Read on GitHub ↗</a>
                  <a href={`${basePath}/instructions/AGENTS.md`} download="AGENTS.md">Download AGENTS.md ↓</a>
                </div>
                <p>Attach the downloaded file to your agent chat, or give it the GitHub link.
                  You do not need to move it into your project. Do not replace an existing
                  AGENTS.md there. Your fork already includes this guide at its root.</p>
              </div>
              <ol className={styles.substeps}>
                <li>Open your original project folder in your coding tool. Keep a backup of your work.</li>
                <li>Copy the prompt below. Replace the two <strong>[your-username]</strong> placeholders with your GitHub username and fork URL.</li>
                <li>Paste it into your agent chat and provide the guide link or attachment. The agent should clone your fork into a <strong>separate folder</strong> and create a branch.</li>
                <li>Answer any missing title, author, category, and AI tool questions. Ask it to test the export under a subfolder, not just at the domain root.</li>
                <li>When asked, sign in through GitHub&rsquo;s official sign-in flow. Never paste passwords or access tokens into chat. Only confirm pushing after checking the files in the next step.</li>
              </ol>
              <CopyCodeBlock label="AI agent prompt" code={AGENT_PROMPT} />
              <p className={styles.notice}>If your app only exists in a browser tool, download/export
                its project first. If export or GitHub access is unavailable, stop and ask for help;
                a ZIP alone is not a PR submission. Do not run unfamiliar submitted projects on a company computer.</p>
            </li>
            <li id="submit-your-pr" className={styles.step}>
              <span className={styles.stepNumber}>04</span>
              <h2 className={styles.stepTitle}>Submit your PR</h2>
              <p className={styles.stepBody}>
                Your agent may give you a PR link directly. Open it and check the destination
                and <strong>Files changed</strong>. If it only pushed a branch, follow these
                browser steps to open the PR yourself:
              </p>
              <ol className={styles.substeps}>
                <li>Open your fork on GitHub. Click <strong>Compare &amp; pull request</strong> if shown. Otherwise use <strong>Pull requests → New pull request → compare across forks</strong>.</li>
                <li>Set the destination (<strong>base repository</strong>) to <strong>sooyeonni/AI-Design-gallery</strong> and <strong>base</strong> to <strong>main</strong>.</li>
                <li>Set <strong>head repository</strong> to your fork and <strong>compare</strong> to the branch your agent created, such as <strong>add-blow-and-pop</strong>.</li>
                <li>Check <strong>Files changed</strong>: only your <code className={styles.inlineCode}>projects/your-slug/</code> folder and your entry in <code className={styles.inlineCode}>projects.json</code> should change. No ZIP, source build, secrets, or changes to other projects.</li>
                <li>Click <strong>Create pull request</strong>. Add a title such as &ldquo;Add Blow &amp; Pop&rdquo;, complete the checklist, and click <strong>Create pull request</strong> again to submit.</li>
                <li>Save the PR link. You are done when the PR is <strong>Open</strong> in Soo&rsquo;s repository. You do not need to merge it or set up hosting.</li>
              </ol>
              <GitHubIllustration title="GitHub · compare changes" caption="The arrow points from your branch to Soo’s main branch. Check both sides before submitting.">
                <div className={styles.compareGrid}>
                  <div className={styles.mockField}><span>Destination · base</span><strong>sooyeonni/AI-Design-gallery</strong><span>main</span></div>
                  <span className={styles.compareArrow} aria-label="receives changes from">←</span>
                  <div className={styles.mockField}><span>Your copy · head</span><strong>your-username/AI-Design-gallery</strong><span>add-blow-and-pop</span></div>
                </div>
                <div className={styles.mockDivider} />
                <p>Files changed: your project folder + projects.json</p>
                <span className={styles.mockPrimary}>Create pull request</span>
              </GitHubIllustration>
              <p className={styles.stepBody}>
                Only change your project folder and metadata entry. Check the PR for secrets
                before sharing it. New contributors may need Soo to allow the validation
                workflow to run.
              </p>
              <details className={styles.troubleshooting}>
                <summary>Stuck? Common GitHub messages</summary>
                <dl>
                  <dt>&ldquo;There isn&rsquo;t anything to compare&rdquo;</dt>
                  <dd>Check that your agent pushed the files to your fork and that compare selects the correct branch, not an unchanged main branch.</dd>
                  <dt>&ldquo;Permission denied&rdquo; when pushing</dt>
                  <dd>You may be pushing to Soo&rsquo;s original repository. Ask the agent to check that its push remote points to your fork and that you are signed in as yourself.</dd>
                  <dt>Your PR is in your own fork, not Soo&rsquo;s repository</dt>
                  <dd>Open a new comparison with base repository set to sooyeonni/AI-Design-gallery. A PR into your own fork does not reach Soo.</dd>
                  <dt>Files exceed GitHub&rsquo;s browser upload limits</dt>
                  <dd>Use your coding agent&rsquo;s Git push workflow rather than dragging the files into GitHub&rsquo;s web uploader. The gallery&rsquo;s own size limits still apply.</dd>
                </dl>
              </details>
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
              <ul className={styles.substeps}>
                <li><strong>Open / checks pending:</strong> your PR is submitted, not yet published. First-time workflows may need Soo&rsquo;s permission.</li>
                <li><strong>Changes requested / red check:</strong> share the feedback with your agent. Push fixes to the <strong>same branch</strong>; the PR updates automatically.</li>
                <li><strong>Merged:</strong> Soo accepted it. Wait for <strong>Publish gallery to GitHub Pages</strong> in the repository&rsquo;s Actions tab to turn green.</li>
                <li><strong>Live:</strong> open the gallery and your project card. Merge alone does not mean deployment succeeded. If Actions fails, contact Soo; the previous site stays online.</li>
              </ul>
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
