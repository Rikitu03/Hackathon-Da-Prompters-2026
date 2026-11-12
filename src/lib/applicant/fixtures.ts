import type { Guide } from "./model";

export const demoGuide: Guide = {
  id: "illustrative-college",
  title: "Pasig scholarship preparation walkthrough",
  demo: true,
  level: "College",
  description:
    "An illustrative guide for learning how to prepare. This is not an official scholarship offering, current eligibility rule, or application cycle.",
  cycles: [
    {
      id: "illustrative-college-cycle",
      year: "Sample academic year",
      start: null,
      end: null,
      officialUrl: "https://scholars.pasigcity.gov.ph/",
      applicantType: "New or renewing applicant",
      sources: [],
      requirements: [
        {
          id: "illustrative-enrollment",
          title: "Enrollment certificate",
          description:
            "A sample school document. Confirm the exact document and academic period in the current official guide.",
          required: true,
          steps: [
            "Read the current official guide to confirm which enrollment document and academic period are requested.",
            "Ask your school registrar about its official request process, fees, and release time. These details are not verified here.",
            "Keep a complete, readable copy and check that its details match your original.",
          ],
          faqs: [
            {
              question: "Can I use last year’s certificate?",
              answer:
                "This walkthrough cannot confirm accepted periods. Check the current published requirements or ask the scholarship office.",
            },
          ],
        },
        {
          id: "illustrative-grades",
          title: "Record of grades",
          description:
            "A sample academic record. This guide sets no grade cutoff or eligibility rule.",
          required: true,
          steps: [
            "Confirm the exact academic term and accepted record type with the current official scholarship guide.",
            "Ask your school registrar how to request that record.",
            "Check that your copy is readable, complete, and shows the requested period.",
          ],
          faqs: [
            {
              question: "Is a screenshot accepted?",
              answer:
                "Accepted formats are not verified in this walkthrough. Confirm with the scholarship office.",
            },
          ],
        },
        {
          id: "illustrative-residency",
          title: "Proof of residency",
          description:
            "An example category only. Confirm the accepted document and issuing office before requesting a copy.",
          required: true,
          steps: [
            "Check the official requirements for the exact accepted proof of residence.",
            "Confirm the issuing office and request process with the scholarship office.",
            "Ask the issuing office what to bring and how to collect the document. Do not assume any fees or office hours from this example.",
          ],
          faqs: [
            {
              question: "Which proof should I get?",
              answer:
                "No specific proof is verified here. Use the current official guide to avoid requesting the wrong document.",
            },
          ],
        },
      ],
    },
  ],
};
