import type { Metadata } from "next";
import Link from "next/link";
import NavTabs from "@/components/NavTabs";
import CopyCodeBlock from "@/components/CopyCodeBlock";
import UploadContents from "@/components/UploadContents";
import { UploadProjectButton } from "@/components/UploadDialog";
import pageStyles from "@/app/page.module.css";
import headerStyles from "@/components/Header.module.css";
import styles from "./how-to-upload.module.css";

export const metadata: Metadata = {
  title: "How to Upload · AI Design Study",
  description: "A step-by-step guide to adding your project to the AI Design Study gallery.",
};

const AGENT_PROMPT = `Help me package my project for the AI Design Study ZIP upload.

Inspect my project and use its existing build command to export a self-contained static website.
Put index.html at the ZIP root, or inside one wrapper folder, with all required assets.

Exclude node_modules, .git, .vercel, build caches, symlinks, environment files, private keys, credentials and API tokens.
Keep the ZIP under 3 MiB compressed, 20 MiB expanded, 5 MiB per file and 300 entries.
Do not include package.json or vercel.json in the exported static-site ZIP.

If the project needs a server, database, external API or private key, tell me before packaging. Do not silently remove features.

Ask for my project title, author name, category and AI tools used if missing.
Do not deploy, edit gallery metadata, create a branch, commit or open a Pull Request.
Give me the ZIP path and explain how to submit it through How to Upload.`;

const REVIEW_PROMPT = `Check my submission ZIP before I upload it:
- index.html and all local assets are included and work without external services
- no secrets, environment files, symlinks, dependencies or repository metadata are included
- the ZIP satisfies the displayed size and file limits
- I have permission to publish every included asset
Report any issue. Do not upload or deploy anything without my confirmation.`;

const STEPS = [
  { id: "get-started", title: "Get started" },
  { id: "build-and-prepare", title: "Build & prepare" },
  { id: "ask-your-ai-agent", title: "Ask your AI agent" },
  { id: "upload-your-zip", title: "Upload your ZIP" },
  { id: "we-deploy-it", title: "We deploy it" },
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
            <p className={headerStyles.meta}>5 steps · No GitHub account needed</p>
          </header>
          <UploadContents steps={STEPS} />
        </aside>

        <div className={styles.main}>
        <div className={pageStyles.topNavigation}>
          <NavTabs active="/how-to-upload" />
        </div>
        <header className={styles.intro}>
          <h1 className={headerStyles.title}>How to Upload</h1>
          <p className={styles.subtitle}>
            Share a ZIP. We handle checks, review, and deployment — no GitHub
            account, Pull Request, or deployment URL needed.
          </p>
        </header>

        <ol className={styles.steps}>
          <li id="get-started" className={styles.step}>
            <span className={styles.stepNumber}>01</span>
            <h2 className={styles.stepTitle}>Get started</h2>
            <p className={styles.stepBody}>
              Anyone can submit a project. Prepare its title, your author name,
              a category, and the AI tools you used. Only submit work you own
              or have permission to publish.
            </p>
          </li>

          <li id="build-and-prepare" className={styles.step}>
            <span className={styles.stepNumber}>02</span>
            <h2 className={styles.stepTitle}>Build &amp; prepare</h2>
            <p className={styles.stepBody}>
              Create your project with an AI design or coding tool and make
              sure it can run as a web project. You do <strong>not</strong>{" "}
              need to deploy it yourself or create a Vercel project.
            </p>
            <div className={styles.examples}>
              <div>
               <h3>Things you can make</h3>
               <ul>
                 <li>Interactive prototype</li>
                 <li>Website</li>
                 <li>Slide deck</li>
                 <li>Small app</li>
                 <li>Design experiment</li>
                 <li>AI workflow</li>
               </ul>
              </div>
              <div>
               <h3>Tools you can use</h3>
               <p>Claude, ChatGPT, Cursor, Codex, GitHub Copilot, Figma Make, Lovable, v0, or another AI tool.</p>
              </div>
            </div>
            <p className={styles.stepBody}>
              Automatic publication currently supports self-contained static
              exports. Include index.html and its assets, without build
              configuration or external services. Source-only projects and
              projects requiring a server, database, or API key need further review.
            </p>
          </li>

          <li id="ask-your-ai-agent" className={styles.step}>
            <span className={styles.stepNumber}>03</span>
            <h2 className={styles.stepTitle}>Ask your AI agent</h2>
            <p className={styles.stepBody}>
              Ask your AI coding agent to prepare a submission ZIP from your
              project. No repository access or metadata editing is needed.
              Paste this prompt into your agent:
            </p>
            <CopyCodeBlock label="AI agent prompt" code={AGENT_PROMPT} />
          </li>

          <li id="upload-your-zip" className={styles.step}>
            <span className={styles.stepNumber}>04</span>
            <h2 className={styles.stepTitle}>Upload your ZIP</h2>
            <p className={styles.stepBody}>
              ZIPs are stored privately while being checked. The limit is 3 MiB
              compressed, 20 MiB expanded, 5 MiB per file, and 300 entries.
              Never upload credentials or private environment files. Save your
              private status link after uploading so you can return for updates.
            </p>
            <CopyCodeBlock label="Review instruction" code={REVIEW_PROMPT} />
            <div><UploadProjectButton /></div>
          </li>

          <li id="we-deploy-it" className={styles.step}>
            <span className={styles.stepNumber}>05</span>
            <h2 className={styles.stepTitle}>We deploy it</h2>
            <p className={styles.stepBody}>
              Your ZIP passes archive checks, self-hosted AI review, and
              isolated desktop/mobile preview checks before deployment to a
              separate Vercel site. Only a ready, reachable deployment appears
              in the gallery. You never need to configure Vercel yourself.
            </p>
            <p className={styles.stepBody}>
              If review services are not configured, your project stays in review.
              Unsupported projects, uncertain AI decisions, and failed checks
              are not published automatically. Your private status link shows
              feedback and next steps. AI review reduces risk but is not a
              guarantee that a project is safe.
            </p>
            <ol className={styles.finishFlow} aria-label="Your path to the gallery">
              {["Build", "ZIP upload", "Checks", "AI review", "Deployment", "Gallery ✨"].map((stage) => (
                <li key={stage}>{stage}</li>
              ))}
            </ol>
          </li>
        </ol>
        </div>
      </main>
    </div>
  );
}
