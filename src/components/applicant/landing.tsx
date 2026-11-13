"use client";
import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { motion, useReducedMotion } from "motion/react";
import {
  ArrowRight,
  BookOpen,
  Check,
  ClipboardCheck,
  ExternalLink,
  Menu,
  MessageCircle,
  ScanText,
  Search,
  ShieldCheck,
  X,
} from "lucide-react";
import { Brand, OfficialLink } from "./workspace";
import { useGabay } from "./gabay-context";
import { JOURNEY_STAGES } from "@/lib/applicant/model";

const journeyIcons = [Search, ClipboardCheck, ScanText, MessageCircle, ExternalLink];
const tools = [
  {
    icon: BookOpen,
    title: "Scholarship explorer",
    description:
      "A clearer place to start. Find a guide and understand what to prepare.",
    href: "/scholarships",
    action: "Explore guides",
  },
  {
    icon: ClipboardCheck,
    title: "Your preparation checklist",
    description:
      "One requirement at a time. Save your progress in this browser.",
    href: "/my-checklist",
    action: "Open checklist",
  },
  {
    icon: ScanText,
    title: "Check a document",
    description:
      "Read extracted details, make corrections, and check against your original.",
    href: "/document-review",
    action: "Check a document",
  },
];
function River() {
  return (
    <svg
      className="river-divider"
      viewBox="0 0 1440 100"
      preserveAspectRatio="none"
      aria-hidden="true"
    >
      <path
        d="M0 35C220 105 390 5 650 40S1050 95 1440 12V100H0Z"
        fill="#d9edff"
      />
      <path
        d="M0 55C250 10 430 95 720 62S1180 15 1440 49V100H0Z"
        fill="#a7d4fa"
      />
      <path
        d="M0 77C280 120 480 55 760 79S1160 110 1440 65V100H0Z"
        fill="#fff"
      />
    </svg>
  );
}
export function Landing() {
  const { openChat } = useGabay();
  const [open, setOpen] = useState(false);
  const reduced = useReducedMotion();
  return (
    <div
      className="applicant-ui landing"
      onKeyDown={(e) => {
        if (e.key === "Escape" && open) {
          setOpen(false);
          e.currentTarget
            .querySelector<HTMLButtonElement>(".mobile-menu-toggle")
            ?.focus();
        }
      }}
    >
      <a href="#main" className="skip-link">
        Skip to content
      </a>
      <header className="marketing-header">
        <Brand />
        <button
          className="icon-button mobile-menu-toggle"
          aria-label={open ? "Close navigation" : "Open navigation"}
          aria-expanded={open}
          aria-controls="public-navigation"
          onClick={() => setOpen(!open)}
        >
          {open ? <X /> : <Menu />}
        </button>
        <nav
          id="public-navigation"
          className={open ? "is-open" : ""}
          aria-label="Main navigation"
        >
          <Link href="/" aria-current="page" onClick={() => setOpen(false)}>
            Home
          </Link>
          <Link href="/scholarships">Scholarships</Link>
          <a href="#how-it-works" onClick={() => setOpen(false)}>
            How it works
          </a>
          <a href="#preparation-tools" onClick={() => setOpen(false)}>
            Preparation tools
          </a>
          <Link className="btn primary" href="/onboarding">
            Start preparing
            <ArrowRight size={16} />
          </Link>
        </nav>
      </header>
      <main id="main">
        <section className="hero">
          <div className="hero-inner">
            <motion.div
              className="hero-copy"
              initial={reduced ? false : { opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.45 }}
            >
              <h1>
                Your guide to
                <br />
                <span>
                  Pasig City
                  <br className="desktop-break" /> scholarships.
                </span>
              </h1>
              <p>
                Big dreams start with a little guidance. Discover scholarship
                information, understand the requirements, and prepare with a
                clear next step.
              </p>
              <div className="hero-actions">
                <Link href="/scholarships" className="btn primary">
                  Explore scholarships
                  <ArrowRight size={18} />
                </Link>
                <Link href="/onboarding" className="btn secondary">
                  Start preparing
                </Link>
              </div>
              <p className="hero-reassurance">
                <Check size={16} /> Free to explore. No student account needed.
              </p>
            </motion.div>
            <div className="hero-art">
              <Image
                src="/illustrations/students-pasig.png"
                alt="Two Filipino students looking ahead, with a blue river, bridge, and Pasig-inspired city behind them"
                width={1448}
                height={1086}
                priority
                sizes="(max-width: 760px) 100vw, 58vw"
              />
            </div>
          </div>
          <River />
        </section>
        <div className="trust-strip">
          <ShieldCheck size={18} />
          <p>
            An independent preparation companion for aspiring Pasig scholars.
            <span> Official applications stay on the official portal.</span>
          </p>
        </div>
        <section id="how-it-works" className="marketing-section how-section">
          <div className="section-heading">
            <h2>
              A little clarity.
              <br className="mobile-break" /> A clear way forward.
            </h2>
            <p>From “where do I start?” to knowing your next step.</p>
          </div>
          <ol className="journey-grid">
            {JOURNEY_STAGES.map(({ id, label, description }, i) => {
              const Icon = journeyIcons[i];
              return <li key={id}>
                <div className="journey-icon">
                  <Icon size={29} />
                  <span>{i + 1}</span>
                </div>
                <h3>{label}</h3>
                <p>{description}</p>
                {i < JOURNEY_STAGES.length - 1 && (
                  <ArrowRight
                    className="journey-connector"
                    size={22}
                    aria-hidden="true"
                  />
                )}
              </li>;
            })}
          </ol>
        </section>
        <section id="preparation-tools" className="tools-section">
          <div className="marketing-section">
            <div className="section-heading">
              <h2>Everything you need to prepare.</h2>
              <p>Useful tools. Understandable steps. Your own pace.</p>
            </div>
            <div className="tools-grid">
              {tools.map(({ icon: Icon, title, description, href, action }) => (
                <Link href={href} key={href} className="tool-card">
                  <Icon size={28} />
                  <h3>{title}</h3>
                  <p>{description}</p>
                  <span>
                    {action}
                    <ArrowRight size={16} />
                  </span>
                </Link>
              ))}
            </div>
          </div>
        </section>
        <section className="marketing-section guide-preview">
          <div className="preview-story">
            <h2>
              One guide.
              <br />A more manageable journey.
            </h2>
            <p>
              Know what each document is for, see how to get started, and keep
              track of what still needs a little care.
            </p>
            <ul className="benefits">
              <li>
                <Check />
                Plain-language instructions
              </li>
              <li>
                <Check />
                Progress saved on this browser
              </li>
              <li>
                <Check />
                Sources and official next steps
              </li>
            </ul>
            <Link
              className="text-link"
              href="/scholarships/illustrative-college"
            >
              Walk through an example
              <ArrowRight size={17} />
            </Link>
          </div>
          <div className="preview-paper">
            <div className="paper-header">
              <span className="illustrative-label">Illustrative preview</span>
              <BookOpen size={24} />
            </div>
            <h3>Your preparation, in one place.</h3>
            <p>
              A sample checklist. Always confirm the current official
              requirements.
            </p>
            {[
              "Enrollment certificate",
              "Record of grades",
              "Proof of residency",
            ].map((t, i) => (
              <div className="preview-row" key={t}>
                <span
                  className={
                    i === 0 ? "preview-check checked" : "preview-check"
                  }
                >
                  {i === 0 && <Check size={14} />}
                </span>
                <span>{t}</span>
                <span className="preview-state">
                  {i === 0 ? "Prepared" : "To prepare"}
                </span>
              </div>
            ))}
            <div className="paper-footer">
              Your own preparation status · Not an official assessment
            </div>
          </div>
        </section>
        <section className="workspace-cta">
          <div>
            <h2>
              Your next chapter starts
              <br />
              with your next step.
            </h2>
            <p>Choose a guide. Make a plan. Start preparing today.</p>
          </div>
          <Link href="/onboarding" className="btn yellow">
            Create my checklist
            <ArrowRight size={18} />
          </Link>
        </section>
      </main>
      <footer className="marketing-footer">
        <div className="footer-grid">
          <div>
            <Brand inverse />
            <p>
              A little guidance for your
              <br />
              scholarship journey.
            </p>
          </div>
          <div>
            <h2>Explore</h2>
            <Link href="/scholarships">Scholarship guides</Link>
            <a href="#how-it-works">How it works</a>
            <Link href="/dashboard">Student workspace</Link>
          </div>
          <div>
            <h2>Preparation tools</h2>
            <Link href="/my-checklist">My checklist</Link>
            <button className="text-link" type="button" onClick={() => openChat()}>Ask Gabay</button>
            <Link href="/document-review">Check a document</Link>
          </div>
          <div>
            <h2>The official next step</h2>
            <OfficialLink />
            <p className="footer-small">
              GabayIskolar does not submit applications or determine
              eligibility.
            </p>
            <Link href="/admin/login">Content administrator</Link>
          </div>
        </div>
        <div className="footer-bottom">
          <span>© 2026 GabayIskolar · The Prompters · OVERCLOCK 2026</span>
          <span>
            Independent student prototype. Not affiliated with Pasig City
            Government.
          </span>
        </div>
      </footer>
    </div>
  );
}
