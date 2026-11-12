"use client";
import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Check, FileText, ScanText, Upload, X } from "lucide-react";
import { reviewDocument, type OcrResult } from "@/lib/applicant/api";
import { validateFile } from "@/lib/applicant/model";
import { Notice } from "./workspace";

const example: OcrResult = {
  rawText:
    "FICTIONAL DOCUMENT — UI EXAMPLE ONLY\nEnrollment certificate\nAcademic year: 2026–2027\nEducation level: College",
  fields: [
    {
      key: "academicYear",
      label: "Academic year",
      value: "2025–2026",
      needsReview: true,
    },
    {
      key: "educationLevel",
      label: "Education level",
      value: "College",
      needsReview: false,
    },
  ],
  warnings: [
    "Possible mismatch — please verify against your document. The example deliberately contains an incorrect extracted academic year.",
  ],
};
export function DocumentReview() {
  const [file, setFile] = useState<File | null>(null),
    [preview, setPreview] = useState(""),
    [consent, setConsent] = useState(false),
    [pending, setPending] = useState(false),
    [error, setError] = useState(""),
    [result, setResult] = useState<OcrResult | null>(null),
    [simulated, setSimulated] = useState(false),
    [checked, setChecked] = useState(false),
    [confirmed, setConfirmed] = useState(false),
    [dragging, setDragging] = useState(false);
  const input = useRef<HTMLInputElement>(null),
    controller = useRef<AbortController | null>(null);
  useEffect(() => {
    if (!file) {
      setPreview("");
      return;
    }
    const url = URL.createObjectURL(file);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);
  useEffect(() => () => controller.current?.abort(), []);
  function choose(next: File | undefined) {
    if (!next || pending) return;
    const issue = validateFile(next);
    setError(issue ?? "");
    if (issue) return;
    setFile(next);
    setResult(null);
    setSimulated(false);
    setConsent(false);
    setChecked(false);
    setConfirmed(false);
  }
  function clear() {
    controller.current?.abort();
    setPending(false);
    setFile(null);
    setConsent(false);
    setResult(null);
    setSimulated(false);
    setChecked(false);
    setConfirmed(false);
    setError("");
    if (input.current) input.current.value = "";
  }
  async function process() {
    if (!file || !consent || pending) return;
    setPending(true);
    setError("");
    setResult(null);
    setChecked(false);
    setConfirmed(false);
    const c = new AbortController();
    controller.current = c;
    let timedOut = false;
    const timeout = setTimeout(() => {
      timedOut = true;
      c.abort();
    }, 45000);
    try {
      const next = await reviewDocument(file, c.signal);
      if (!c.signal.aborted) setResult(next);
    } catch (e) {
      if (!c.signal.aborted || timedOut)
        setError(
          timedOut
            ? "Document review took too long. Retry or continue with the manual checklist."
            : e instanceof Error
              ? e.message
              : "Could not reach document review. Please check your connection.",
        );
    } finally {
      clearTimeout(timeout);
      if (controller.current === c) {
        setPending(false);
        controller.current = null;
      }
    }
  }
  function showExample() {
    clear();
    setSimulated(true);
    setResult(structuredClone(example));
  }
  return (
    <>
      <div className="page-heading">
        <h1>A closer look at your document.</h1>
        <p>
          Read extracted details, correct mistakes, and compare everything with
          your original.
        </p>
      </div>
      <Notice>
        Document review helps with readability and extraction. It cannot confirm
        authenticity, eligibility, or acceptance. Your files and extracted
        values are not saved in your checklist.
      </Notice>
      <div className="document-layout">
        <section className="surface upload-panel">
          <h2>1. Choose a document</h2>
          <div
            className={`upload-zone ${dragging ? "dragging" : ""}`}
            onDragOver={(e) => {
              e.preventDefault();
              setDragging(true);
            }}
            onDragLeave={() => setDragging(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDragging(false);
              if (e.dataTransfer.files.length > 1) {
                setError("Choose one document at a time.");
                return;
              }
              choose(e.dataTransfer.files[0]);
            }}
          >
            <Upload size={36} />
            <h3>{file ? file.name : "Start with a readable copy"}</h3>
            <p>Drop a file here, or choose one from your device.</p>
            <button
              type="button"
              className="btn secondary compact"
              onClick={() => input.current?.click()}
              disabled={pending}
            >
              {file ? "Choose another file" : "Choose document"}
            </button>
            <input
              ref={input}
              type="file"
              className="sr-only"
              aria-label="Choose document file"
              accept="image/jpeg,image/png,application/pdf"
              disabled={pending}
              onChange={(e) => choose(e.target.files?.[0])}
            />
            <small>JPG, PNG, or PDF · Up to 10 MB in this browser</small>
          </div>
          {file && (
            <div className="file-meta">
              <FileText size={18} />
              <span>
                {(file.size / 1024 / 1024).toFixed(2)} MB · Available for this
                visit only
              </span>
              <button
                className="icon-button"
                aria-label="Remove document"
                onClick={clear}
              >
                <X size={17} />
              </button>
            </div>
          )}
          {(preview || simulated) && (
            <div className="document-preview">
              <h3>Original document · Local preview</h3>
              {simulated ? (
                <div className="fictional-paper">
                  <strong>FICTIONAL DOCUMENT</strong>
                  <span>UI example only</span>
                  <h4>Enrollment certificate</h4>
                  <p>
                    Academic year: <strong>2026–2027</strong>
                  </p>
                  <p>Education level: College</p>
                  <small>No student record or personal data.</small>
                </div>
              ) : file?.type === "application/pdf" ? (
                <>
                  <iframe src={preview} title="Local PDF document preview" />
                  <a
                    href={preview}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-link"
                  >
                    Open local PDF preview
                  </a>
                </>
              ) : (
                <Image
                  src={preview}
                  alt="Your selected document for local comparison"
                  width={600}
                  height={800}
                  unoptimized
                />
              )}
            </div>
          )}
          <label className="checkbox-field consent">
            <input
              type="checkbox"
              checked={consent}
              disabled={!file || pending}
              onChange={(e) => setConsent(e.target.checked)}
            />
            <span>
              I consent to sending this document to the review service for text
              extraction.
              <small>
                Only select a document you have permission to process. It stays
                local until you choose Extract details.
              </small>
            </span>
          </label>
          <button
            className="btn primary"
            disabled={!file || !consent || pending}
            onClick={() => void process()}
          >
            <ScanText size={18} />
            {pending
              ? "Extracting details…"
              : result && !simulated
                ? "Extract again"
                : "Extract details"}
          </button>
          {pending && (
            <button
              className="text-link"
              onClick={() => {
                controller.current?.abort();
                setPending(false);
                setError(
                  "Processing stopped. Your local file is still available to retry.",
                );
              }}
            >
              Cancel processing
            </button>
          )}
          <p className="helper">
            The review service may enforce a smaller limit. Your file is
            released from the preview when you clear it or leave this screen.
          </p>
        </section>
        <section className="surface extraction-panel">
          <h2>2. Check the extracted details</h2>
          {error && (
            <Notice tone="error">
              <p>{error}</p>
              {file && consent && (
                <button
                  className="text-link"
                  disabled={pending}
                  onClick={() => void process()}
                >
                  Retry extraction
                </button>
              )}
            </Notice>
          )}
          {pending ? (
            <div className="processing-state" role="status">
              <ScanText size={36} />
              <h3>Reading your document…</h3>
              <p>
                Keep this page open. You can cancel and use the manual
                checklist.
              </p>
            </div>
          ) : result ? (
            <>
              {simulated && (
                <Notice tone="warning">
                  <strong>Simulated extraction.</strong> This fictional example
                  was not sent to OCR. Correct the academic year to try the
                  review interaction.
                </Notice>
              )}
              {result.warnings.map((warning, i) => (
                <Notice key={i} tone="warning">
                  {warning}
                </Notice>
              ))}
              <div className="extracted-fields">
                {result.fields.length ? (
                  result.fields.map((field, i) => (
                    <label className="field" key={`${field.key}-${i}`}>
                      {field.label}
                      {field.needsReview && (
                        <span className="field-warning">
                          Check against the original
                        </span>
                      )}
                      <input
                        value={field.value}
                        onChange={(e) => {
                          setResult((r) =>
                            r
                              ? {
                                  ...r,
                                  fields: r.fields.map((f, j) =>
                                    j === i
                                      ? { ...f, value: e.target.value }
                                      : f,
                                  ),
                                }
                              : r,
                          );
                          setChecked(false);
                          setConfirmed(false);
                        }}
                      />
                    </label>
                  ))
                ) : (
                  <Notice>
                    No structured fields were extracted. Check the raw text and
                    use your manual guide.
                  </Notice>
                )}
              </div>
              <details>
                <summary>View extracted text</summary>
                <pre className="raw-text">
                  {result.rawText || "No text was extracted."}
                </pre>
              </details>
              <label className="checkbox-field">
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={(e) => {
                    setChecked(e.target.checked);
                    setConfirmed(false);
                  }}
                />
                <span>
                  I compared these details with the original and corrected any
                  mistakes.
                </span>
              </label>
              <button
                className="btn primary"
                disabled={!checked || confirmed}
                onClick={() => setConfirmed(true)}
              >
                <Check size={17} />
                {confirmed
                  ? "Review recorded for this visit"
                  : "Confirm my review"}
              </button>
              {confirmed && (
                <Notice>
                  <strong>You reviewed these details.</strong> This is your own
                  check, not official verification.{" "}
                  <Link className="text-link" href="/my-checklist">
                    Return to checklist
                    <ArrowRight size={15} />
                  </Link>
                </Notice>
              )}
              <button className="text-link" onClick={clear}>
                Clear document and extracted details
              </button>
            </>
          ) : (
            <div className="extraction-empty">
              <ScanText size={42} />
              <h3>Your details will appear here.</h3>
              <p>
                Choose a file and give consent to extract text. Then check each
                value against your original.
              </p>
              <hr />
              <p>Want to try the review interaction first?</p>
              <button className="btn secondary compact" onClick={showExample}>
                Try fictional example
              </button>
              <small>Clearly labeled sample · No file is uploaded</small>
            </div>
          )}
        </section>
      </div>
    </>
  );
}
