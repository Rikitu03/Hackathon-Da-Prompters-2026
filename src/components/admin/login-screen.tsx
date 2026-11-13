"use client";

import Image from "next/image";
import { useState, type FormEvent } from "react";
import {
  ArrowRight, BookmarkCheck, Eye, EyeOff,
  FileCheck2, LoaderCircle, LockKeyhole, Mail,
  MessageCircleMore, RefreshCw, ShieldCheck,
} from "lucide-react";
import { GabayBrand } from "@/components/shared/gabay-brand";
import { validateAdminEmail, validateAdminPassword } from "./login-validation";
import "./login.css";

type Gate = "loading" | "setup" | "login" | "denied" | "error";
type Props = {
  gate: Gate;
  email: string;
  password: string;
  busy: boolean;
  error: string;
  onEmailChange: (value: string) => void;
  onPasswordChange: (value: string) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onRetry: () => void;
  onSignOut: () => void;
};

const benefits = [
  { icon: BookmarkCheck, label: "Manage scholarship programs" },
  { icon: FileCheck2, label: "Review requirements and application guides" },
  { icon: MessageCircleMore, label: "Publish clear, verified student guidance" },
] as const;

function Skyline() {
  return (
    <svg className="admin-login-skyline" viewBox="0 0 560 72" preserveAspectRatio="xMidYMax slice" aria-hidden="true">
      <path fill="#d8edff" d="M0 53h20V35h12V26h13v27h12V40h18v13h9V23h15v-9h8v39h12V31h16v22h15V41h16v12h12V27h13V16h8v37h15V38h21v15h10V33h15v20h8V42h17v11h14V29h11v24h13V39h18v14h12V24h10v29h15V35h22v18h10V42h14v11h15V29h14v24h12V38h15v15h12V25h11v28h14V41h16v12h25v19H0z"/>
      <path fill="#93caef" d="M0 66h95c56-1 88-22 135-22s73 22 113 22h217v6H0z"/>
      <path d="M130 67c35-29 72-29 103 0m-94-1V57m15 9V48m16 18V41m15 25V39m16 27V42m16 24V49" fill="none" stroke="#5da8df" strokeWidth="2.3"/>
    </svg>
  );
}

export function AdminLoginScreen({
  gate, email, password, busy, error, onEmailChange,
  onPasswordChange, onSubmit, onRetry, onSignOut,
}: Props) {
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [emailTouched, setEmailTouched] = useState(false);
  const [passwordTouched, setPasswordTouched] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);

  const emailError = submitted || emailTouched ? validateAdminEmail(email) : "";
  const passwordError = submitted || passwordTouched ? validateAdminPassword(password) : "";

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitted(true);
    if (busy || validateAdminEmail(email) || validateAdminPassword(password)) return;
    onSubmit(event);
  }

  return (
    <div className="admin-portal admin-login-page">
      <a href="#admin-signin" className="admin-login-skip">Skip to sign in</a>
      <div className="admin-login-layout">
        <section className="admin-login-hero" aria-label="GabayIskolar administration">
          <GabayBrand className="admin-login-brand" />
          <div className="admin-login-hero-copy">
            <p className="admin-login-eyebrow">GabayIskolar Admin Workspace</p>
            <h1>Support Every <span>Scholarship Journey</span></h1>
            <p className="admin-login-intro">
              Sign in to manage scholarship programs, verify requirements,
              and guide students preparing for opportunities in Pasig City.
            </p>
            <ul className="admin-login-benefits">
              {benefits.map(({ icon: Icon, label }) => (
                <li key={label}><Icon aria-hidden="true" size={27} strokeWidth={2.35}/><span>{label}</span></li>
              ))}
            </ul>
          </div>
          <div className="admin-login-illustration" aria-hidden="true">
            <Image
              src="/illustrations/students-pasig.png"
              alt=""
              fill
              priority
              sizes="(max-width: 800px) 100vw, 60vw"
              style={{ objectFit: "contain", objectPosition: "center bottom" }}
            />
          </div>
        </section>

        <main className="admin-login-card" id="admin-signin">
          <div className="admin-login-card-main">
            <p className="admin-login-card-eyebrow"><ShieldCheck size={16} aria-hidden="true"/> Authorized administrators only</p>
            <h2>Sign In to <span>GabayIskolar</span></h2>
            <p className="admin-login-card-desc">
              Access the administration workspace to manage scholarship content and student guidance.
            </p>

            {error ? <div className="admin-login-server-error" role="alert">{error}</div> : null}

            {gate === "loading" ? (
              <div className="admin-login-status" role="status">
                <LoaderCircle className="admin-login-spin" size={21} aria-hidden="true"/>
                Checking your administrator session…
              </div>
            ) : null}
            {gate === "setup" ? (
              <div className="admin-login-status" role="status">
                Administrator sign-in is temporarily unavailable because Supabase public configuration is missing. Contact the project administrator.
              </div>
            ) : null}
            {gate === "denied" ? (
              <div className="admin-login-state">
                <p role="alert">This account does not have an editor or publisher role.</p>
                <button type="button" className="admin-login-secondary" onClick={onSignOut}>
                  Sign out and use another account
                </button>
              </div>
            ) : null}
            {gate === "error" ? (
              <div className="admin-login-state">
                <p>We could not verify your administrator session.</p>
                <button type="button" className="admin-login-secondary" onClick={onRetry}>
                  <RefreshCw size={17} aria-hidden="true"/> Retry connection
                </button>
              </div>
            ) : null}

            {gate === "login" ? (
              <form className="admin-login-form" onSubmit={handleSubmit} noValidate>
                <div className="admin-login-field">
                  <label htmlFor="admin-email">Email address</label>
                  <div className="admin-login-input-wrap">
                    <Mail aria-hidden="true" size={21}/>
                    <input
                      id="admin-email"
                      name="email"
                      type="email"
                      value={email}
                      onChange={(event) => onEmailChange(event.target.value)}
                      onBlur={() => setEmailTouched(true)}
                      placeholder="Enter your email"
                      autoComplete="username"
                      required
                      maxLength={254}
                      aria-invalid={Boolean(emailError)}
                      aria-describedby={emailError ? "admin-email-error" : undefined}
                    />
                  </div>
                  {emailError ? <p id="admin-email-error" className="admin-login-field-error">{emailError}</p> : null}
                </div>

                <div className="admin-login-field">
                  <label htmlFor="admin-password">Password</label>
                  <div className="admin-login-input-wrap">
                    <LockKeyhole aria-hidden="true" size={21}/>
                    <input
                      id="admin-password"
                      name="password"
                      type={passwordVisible ? "text" : "password"}
                      value={password}
                      onChange={(event) => onPasswordChange(event.target.value)}
                      onBlur={() => setPasswordTouched(true)}
                      placeholder="Enter your password"
                      autoComplete="current-password"
                      required
                      maxLength={1024}
                      aria-invalid={Boolean(passwordError)}
                      aria-describedby={passwordError ? "admin-password-error" : undefined}
                    />
                    <button
                      type="button"
                      className="admin-login-eye"
                      aria-label={passwordVisible ? "Hide password" : "Show password"}
                      aria-pressed={passwordVisible}
                      onClick={() => setPasswordVisible((visible) => !visible)}
                    >
                      {passwordVisible ? <Eye size={21} aria-hidden="true"/> : <EyeOff size={21} aria-hidden="true"/>}
                    </button>
                  </div>
                  {passwordError ? <p id="admin-password-error" className="admin-login-field-error">{passwordError}</p> : null}
                </div>

                <div className="admin-login-form-options">
                  <span><ShieldCheck size={17} aria-hidden="true"/> Secure admin access</span>
                  <button type="button" onClick={() => setHelpOpen((open) => !open)} aria-expanded={helpOpen} aria-controls="admin-login-help">
                    Forgot password?
                  </button>
                </div>
                {helpOpen ? (
                  <div id="admin-login-help" className="admin-login-help" role="status">
                    For account recovery, contact your project administrator. Password resets and admin roles are managed securely through Supabase.
                  </div>
                ) : null}

                <button className="admin-login-submit" type="submit" disabled={busy}>
                  {busy ? <LoaderCircle size={20} className="admin-login-spin" aria-hidden="true"/> : null}
                  <span>{busy ? "Signing in…" : "Sign In"}</span>
                  {!busy ? <ArrowRight size={20} aria-hidden="true"/> : null}
                </button>
              </form>
            ) : null}

          </div>
          <Skyline/>
        </main>
      </div>
      <svg className="admin-login-waves" viewBox="0 0 980 128" preserveAspectRatio="none" aria-hidden="true">
        <path fill="#ffffff" d="M0 36C132 2 208 114 347 81S546 25 662 49s202-36 318-19v98H0z"/>
        <path fill="#1264bd" d="M0 64C170 10 245 111 384 87s186-80 318-50 178 45 278 22v69H0z"/>
        <path fill="#5ba9ef" d="M0 117c165-36 267-15 370-2 109 14 186-68 330-63s187 8 280 39v37H0z"/>
        <path fill="#f9d456" d="M530 92c128-39 254-58 450-43v8c-157-6-315 5-450 35z"/>
      </svg>
    </div>
  );
}