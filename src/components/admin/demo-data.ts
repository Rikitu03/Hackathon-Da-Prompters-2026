import type { AdminData } from "./data";

/**
 * Fictional, client-only preview data.
 * NEVER use this data in public scholarship retrieval, source-grounded answers, or publication.
 */
export const demoData: AdminData = {
  programs: [
    {
      id: "demo-program-1",
      title: "Sample Scholarship Preparation Guide",
      description: "Fictional content for testing the GabayIskolar admin interface. This is not an actual scholarship announcement or eligibility guidance.",
      status: "draft",
      created_at: "2026-11-01T00:00:00Z"
    },
    {
      id: "demo-program-2",
      title: "Example Renewal Guide",
      description: "Illustrative renewal-program placeholder for previewing responsive navigation and lists. Verify all real guidance with its issuing office.",
      status: "draft",
      created_at: "2026-10-28T00:00:00Z"
    }
  ],
  cycles: [
    {
      id: "demo-cycle-1",
      program_id: "demo-program-1",
      academic_year: "Fictional demo cycle",
      application_start: null,
      application_end: null,
      official_url: null,
      status: "draft",
      published_at: null
    },
    {
      id: "demo-cycle-2",
      program_id: "demo-program-2",
      academic_year: "Fictional renewal cycle",
      application_start: null,
      application_end: null,
      official_url: null,
      status: "draft",
      published_at: null
    }
  ],
  requirements: [
    {
      id: "demo-requirement-1",
      cycle_id: "demo-cycle-1",
      title: "Example enrollment document",
      description: "Illustrative document item only. An official source must establish actual required documents.",
      is_required: true,
      position: 0
    },
    {
      id: "demo-requirement-2",
      cycle_id: "demo-cycle-1",
      title: "Example additional document",
      description: "Fictional conditional requirement shown to preview the editable checklist.",
      is_required: false,
      position: 1
    }
  ],
  steps: [
    {
      id: "demo-step-1",
      requirement_id: "demo-requirement-1",
      position: 0,
      instruction: "Consult the issuing office's official guide for the correct document name."
    },
    {
      id: "demo-step-2",
      requirement_id: "demo-requirement-1",
      position: 1,
      instruction: "Check the document against the official published instructions."
    }
  ],
  faqs: [
    {
      id: "demo-faq-1",
      requirement_id: "demo-requirement-1",
      question: "Is this an official requirement?",
      answer: "No. This entry is fictional UI-preview data, not scholarship policy."
    }
  ],
  sources: [
    {
      id: "demo-source-1",
      cycle_id: "demo-cycle-1",
      title: "Sample reference — not verified",
      source_url: null,
      reviewed_at: null,
      content_version: 1,
      is_approved: false
    }
  ]
};
