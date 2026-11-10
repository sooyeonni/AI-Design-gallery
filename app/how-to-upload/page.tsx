import type { Metadata } from "next";
import Link from "next/link";
import NavTabs from "@/components/NavTabs";
import CopyCodeBlock from "@/components/CopyCodeBlock";
import UploadContents from "@/components/UploadContents";
import Footer from "@/components/Footer";
import { UploadProjectButton } from "@/components/UploadDialog";
import pageStyles from "@/app/page.module.css";
import headerStyles from "@/components/Header.module.css";
import styles from "./how-to-upload.module.css";

export const metadata: Metadata = {
  title: "How to Upload · AI Design Study",
  description: "A step-by-step guide to adding your project to the AI Design Study gallery.",
};

const AGENT_PROMPT = `Package the project open in this workspace as a ZIP for AI Design Study. Prepare the file only; I will upload it myself.

Inspect the project and use its existing documented build/export command to prepare a self-contained static website.
Put index.html at the ZIP root, or inside one wrapper folder, with all required assets.

Exclude node_modules, .git, .vercel, build caches, symlinks, environment files, private keys, credentials and API tokens.
Keep the ZIP under 3 MiB compressed, 20 MiB expanded, 5 MiB per file and 300 entries.
Do not include package.json or vercel.json in the exported static-site ZIP.

Build and test the static export locally, check its assets and ZIP limits, and report any failure. Do not claim a broken export is ready.
If the project needs a server, database, external API or private key, explain the blocker. Do not silently remove features.

Do not ask for my title, author name, category or AI tools; I will enter those on the website.
Only ask a question if the project cannot be located or a technical blocker prevents packaging.
Do not upload, deploy, edit gallery metadata, create a branch, commit, push or open a Pull Request.
Give me the ZIP path and direct me to https://ai-design-gallery.vercel.app/how-to-upload to enter my project details and upload it myself.`;

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
              Anyone can submit a project. Let your AI agent prepare the ZIP,
              then upload it here yourself. No GitHub account or deployment
              setup is needed. Only submit work you own or have permission to publish.
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
              project. It handles the build, packaging, and checks — no project
              details interview needed. You will enter those details on this
              website. Paste this prompt into your agent:
            </p>
            <CopyCodeBlock label="AI agent prompt" code={AGENT_PROMPT} />
          </li>

          <li id="upload-your-zip" className={styles.step}>
            <span className={styles.stepNumber}>04</span>
            <h2 className={styles.stepTitle}>Upload your ZIP</h2>
            <p className={styles.stepBody}>
              Click <strong>Upload project</strong>, enter your title, author name,
              category, and AI tools, then choose the ZIP your agent prepared.
              ZIPs are stored privately while being checked. The limit is 3 MiB
              compressed, 20 MiB expanded, 5 MiB per file, and 300 entries.
              Never upload credentials or private environment files. Save your
              private status link after uploading so you can return for updates.
            </p>
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
            <Footer />
          </li>
        </ol>
        </div>
      </main>
    </div>
  );
}
