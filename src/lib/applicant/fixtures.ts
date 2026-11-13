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
          title: "Certificate of Registration",
          description:
            "A sample school document showing your name, student number, course, school year and year level. Confirm the exact document and academic period in the current official guide.",
          required: true,
          steps: [
            "Read the current official guide to confirm which enrollment document and academic period are requested. Some guides ask for enrollment evidence under a different title.",
            "Ask your school registrar how to request your Certificate of Registration, and about any fees or release time. These details are not verified here.",
            "Keep a complete, readable copy, then use “Check this document” on this page to compare the details read from it with your original.",
          ],
          faqs: [
            {
              question: "Can I use last year’s Certificate of Registration?",
              answer:
                "This walkthrough cannot confirm accepted periods. The document check flags an enrollment date from an earlier year so you can confirm the right document with the scholarship office.",
            },
          ],
        },
        {
          id: "illustrative-residency",
          title: "Certificate of Residency",
          description:
            "A sample barangay document showing your name, address, years stayed, date issued and city. Confirm the accepted document and issuing office before requesting a copy.",
          required: true,
          steps: [
            "Check the official requirements for the exact accepted proof of residence. A Certificate of Indigency is a different document.",
            "Confirm the issuing office and request process with the barangay or the scholarship office.",
            "Ask the issuing office what to bring and how to collect the document. Do not assume any fees or office hours from this example.",
          ],
          faqs: [
            {
              question: "Is a Certificate of Indigency the same as a Certificate of Residency?",
              answer:
                "No, they are different documents. This walkthrough cannot confirm which one a cycle accepts, so use the current official guide.",
            },
          ],
        },
        {
          id: "illustrative-school-id",
          title: "School ID or government-issued ID",
          description:
            "A sample ID showing your name, student number and section. Confirm which ID types the current official guide accepts, and whether both sides are needed.",
          required: true,
          steps: [
            "Read the current official guide to confirm which ID types are accepted and whether the front and back are both requested.",
            "Take a clear, well-lit photo or scan that shows every printed detail.",
            "Compare the name and student number with your Certificate of Registration, then use “Check this document” on this page to see any differences.",
          ],
          faqs: [
            {
              question: "Can I use a different valid ID?",
              answer:
                "Accepted alternatives depend on the cycle. This walkthrough cannot confirm them, so check the current official guide or ask the scholarship office.",
            },
          ],
        },
      ],
    },
  ],
};
