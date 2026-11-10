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
  description: "Fork the gallery, ask your AI agent to prepare a project, and send a Pull Request.",
};

const AGENT_PROMPT = `Help me submit my project to AI Design Study.
My fork URL: https://github.com/[your-username]/AI-Design-gallery

Read and follow:
https://github.com/sooyeonni/AI-Design-gallery/blob/main/AGENTS.md
If you cannot read it, ask me to attach AGENTS.md.

Use the project open in my workspace. Keep it intact and clone my fork into a separate folder.
Ask only for missing title, author, category and AI tools.
Build and test a static export with local assets and working subfolder paths.
Do not silently remove features; explain any export blocker.
Add the export to projects/<slug>/ and its entry to projects.json. Omit url and sample.
Change only my project folder and metadata entry. Never include secrets or private files.
Create a branch and prepare a PR to sooyeonni/AI-Design-gallery:main.
Ask for confirmation before pushing or opening the PR. Never ask for passwords or tokens in chat.
Give me the PR link, or simple manual steps if GitHub access is unavailable.`;

const STEPS = [
  { id: "get-started", title: "Create your fork" },
  { id: "build-and-prepare", title: "Build & prepare" },
  { id: "ask-your-ai-agent", title: "Ask your AI agent" },
  { id: "submit-your-pr", title: "Submit your PR" },
  { id: "we-publish-it", title: "We publish it" },
];

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
            <p className={styles.subtitle}>Share what you made. Your AI agent helps prepare it;
              Soo reviews it before it goes live.</p>
          </header>
          <ol className={styles.steps}>
            <li id="get-started" className={styles.step}>
              <span className={styles.stepNumber}>01</span>
              <h2 className={styles.stepTitle}>Create your fork</h2>
              <p className={styles.stepBody}>A fork is your own copy of the gallery on GitHub.
                You only need to make it once.</p>
              <ol className={styles.substeps}>
                <li><a href="https://github.com/signup" target="_blank" rel="noopener noreferrer">Sign up</a> or sign in to your personal GitHub account.</li>
                <li><a href="https://github.com/sooyeonni/AI-Design-gallery/fork" target="_blank" rel="noopener noreferrer">Open the Fork page</a>. Choose your account as <strong>Owner</strong>, keep the name, and click <strong>Create fork</strong>.</li>
                <li>Copy your new repository URL: <strong>github.com/your-username/AI-Design-gallery</strong>.</li>
              </ol>
            </li>
            <li id="build-and-prepare" className={styles.step}>
              <span className={styles.stepNumber}>02</span>
              <h2 className={styles.stepTitle}>Build &amp; prepare</h2>
              <p className={styles.stepBody}>Make something with AI. Your agent will turn it into
                a finished website for the gallery.</p>
              <div className={styles.examples}>
                <div>
                  <h3>Things you can make</h3>
                  <ul>
                    <li>Interactive prototype</li>
                    <li>Website</li>
                    <li>Slide deck</li>
                    <li>Small app</li>
                    <li>Design experiment</li>
                    <li>AI workflow demo</li>
                  </ul>
                </div>
                <div>
                  <h3>Tools you can use</h3>
                  <p>Claude, ChatGPT, Cursor, Codex, GitHub Copilot, Figma Make,
                    Lovable, v0, or another AI tool.</p>
                </div>
              </div>
              <p className={styles.stepBody}>Static websites only — no backend or secret API keys.
                Up to 100 MiB per project, 20 MiB per file, and 300 files/folders.
                Local MediaPipe models and WASM are supported.</p>
            </li>
            <li id="ask-your-ai-agent" className={styles.step}>
              <span className={styles.stepNumber}>03</span>
              <h2 className={styles.stepTitle}>Ask your AI agent</h2>
              <p className={styles.stepBody}>Open your project in a coding tool such as Cursor,
                Claude Code, or Copilot. Paste this prompt and replace the fork URL with yours.
                The agent will prepare the files and project details.</p>
              <div className={styles.resourceActions} aria-label="Agent instructions">
                <a href="https://github.com/sooyeonni/AI-Design-gallery/blob/main/AGENTS.md"
                  target="_blank" rel="noopener noreferrer">Read AGENTS.md ↗</a>
                <a href={`${basePath}/instructions/AGENTS.md`} download="AGENTS.md">Download AGENTS.md ↓</a>
              </div>
              <CopyCodeBlock label="AI agent prompt" code={AGENT_PROMPT} />
            </li>
            <li id="submit-your-pr" className={styles.step}>
              <span className={styles.stepNumber}>04</span>
              <h2 className={styles.stepTitle}>Submit your PR</h2>
              <p className={styles.stepBody}>A Pull Request (PR) asks Soo to add your project.
                Your agent can open one after you confirm. If it gives you a PR link,
                open it and check <strong>Files changed</strong>.</p>
              <ol className={styles.substeps}>
                <li>Doing it yourself? Open your fork and click <strong>Compare &amp; pull request</strong> after your agent pushes the files.</li>
                <li>Check the destination is <strong>sooyeonni/AI-Design-gallery → main</strong>, and the source is your fork&rsquo;s project branch.</li>
                <li>Only your project folder and its <strong>projects.json</strong> entry should change. Click <strong>Create pull request</strong> and complete the checklist.</li>
              </ol>
              <p className={styles.stepBody}>All submitted files are public. Never include secrets,
                company files, or work you do not have permission to publish.</p>
            </li>
            <li id="we-publish-it" className={styles.step}>
              <span className={styles.stepNumber}>05</span>
              <h2 className={styles.stepTitle}>We publish it</h2>
              <p className={styles.stepBody}>Soo checks your PR and merges it. GitHub Pages then
                publishes your project automatically. No hosting setup needed.</p>
              <p className={styles.stepBody}>Save your PR link for updates. If changes are requested,
                share the feedback with your agent. Your project is live once the deployment
                succeeds and it appears in the gallery.</p>
              <ol className={styles.finishFlow} aria-label="Your path to the gallery">
                {["Build", "Pull Request", "Soo reviews", "Gallery ✨"].map((stage) => <li key={stage}>{stage}</li>)}
              </ol>
            </li>
          </ol>
          <Footer />
        </div>
      </main>
    </div>
  );
}
