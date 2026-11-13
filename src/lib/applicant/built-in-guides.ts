import type { Guide } from "./model";

// Source register: docs/scholarships/pscs/requirements.md (set R26), reviewed 13 Nov 2026.
const REVIEWED = "2026-11-13";

/**
 * Pasig City Scholarship Program, CORE Academic renewal for college, first semester AY 2026–2027.
 * Covers the three priority documents only (docs/scholarships/pscs/three-document-scope.md).
 * Wording follows the official list; acceptance questions it leaves open stay open.
 */
export const pscsCoreCollegeRenewal: Guide = {
  id: "pscs-core-college-renewal",
  title: "Pasig City Scholarship Program — CORE Academic renewal (College)",
  demo: false,
  level: "College / university",
  description:
    "Prepare three of the documents in the AY 2026–2027 first-semester CORE Academic renewal list: enrollment evidence (Certificate of Registration), a barangay residency certificate, and a valid ID.",
  scope:
    "This guide covers 3 documents only: Certificate of Registration, Barangay Certificate of Residency, and School ID or any Valid-ID. The official renewal list also asks for your latest report card (second semester, AY 2025–2026), income evidence, the signed renewal application form and a 1 × 1 photo with a white background. Use the official announcement for the complete list and how to submit.",
  cycles: [
    {
      id: "pscs-core-college-renewal-ay2026-s1",
      year: "AY 2026–2027, 1st semester",
      start: null,
      end: null,
      officialUrl:
        "https://pasigcity.gov.ph/news-and-releases/renewal-application-para-sa-pasig-city-scholarship-program-core-academic-para-sa-ay-2026-2027-magbubukas-na-158",
      applicantType: "Renewal",
      sources: [
        { id: "s26-core", title: "AGOS: CORE Academic renewal announcement (13 Aug 2026)", url: "https://t.me/pasigscholarship/597", reviewedAt: REVIEWED },
        {
          id: "s26-city",
          title: "Pasig City: CORE Academic renewal for AY 2026–2027 (14 Aug 2026)",
          url: "https://pasigcity.gov.ph/news-and-releases/renewal-application-para-sa-pasig-city-scholarship-program-core-academic-para-sa-ay-2026-2027-magbubukas-na-158",
          reviewedAt: REVIEWED,
        },
        {
          id: "s26-city-requirements",
          title: "Pasig City: documentary requirements graphic, page 3",
          url: "https://admin2022.pasigcity.gov.ph/storage/news/2026/08/20//6a86663c2c729_773167147-1029879349939140-4259349032637178597-n.jpeg",
          reviewedAt: REVIEWED,
        },
        {
          id: "college-renewal-form",
          title: "Official college renewal blank form (AY 2026–2027, 1st semester)",
          url: "https://drive.google.com/file/d/1QU2MBbp87QlpDKGTJD8sGPjA00hsuigZ/view",
          reviewedAt: REVIEWED,
        },
      ],
      requirements: [
        {
          id: "certificate-of-registration",
          title: "Certificate of Registration",
          description:
            "The official list asks for enrollment evidence for the first semester of AY 2026–2027. A Certificate of Registration is the usual school record for this; confirm with the scholarship office that it is accepted for this cycle.",
          required: true,
          steps: [
            "Request your Certificate of Registration for the first semester of AY 2026–2027 from your school registrar.",
            "Check that it shows your name, student number, address, course, department, enrollment date, school year and year level.",
            "Use “Check this document” on this page to read the details and flag anything outdated or inconsistent.",
          ],
          faqs: [
            {
              question: "Can I use last year’s Certificate of Registration?",
              answer:
                "The list asks for enrollment in the first semester of AY 2026–2027. The document check flags an enrollment date from an earlier year so you can get the current one.",
            },
          ],
        },
        {
          id: "barangay-residency",
          title: "Barangay Certificate of Residency",
          description:
            "The official list asks for a barangay residency certificate that states your years of residence. A Certificate of Indigency is a different document.",
          required: true,
          steps: [
            "Request a Certificate of Residency from your barangay hall.",
            "Make sure it states your name, address, how many years you have lived there, the date issued and the city.",
            "Use “Check this document” to compare its name and address with your Certificate of Registration.",
          ],
          faqs: [
            {
              question: "Can I submit a Certificate of Indigency instead?",
              answer:
                "The official list does not say so. Ask the scholarship office before using a different document.",
            },
          ],
        },
        {
          id: "school-or-valid-id",
          title: "School ID or any Valid-ID",
          description: "The official list asks for a copy of a valid ID, both sides.",
          required: true,
          steps: [
            "Prepare a clear copy of the front and back of your school ID or another valid ID.",
            "Check that the name and student number match your Certificate of Registration.",
            "Use “Check this document” to read the ID and compare it with your Certificate of Registration.",
          ],
          faqs: [
            {
              question: "Which IDs are accepted?",
              answer:
                "The list says valid ID, both sides, without listing types. If you are not using your school ID, confirm with the scholarship office.",
            },
          ],
        },
      ],
    },
  ],
};

export const BUILT_IN_GUIDES: readonly Guide[] = [pscsCoreCollegeRenewal];

export function builtInGuide(id: string | undefined): Guide | undefined {
  return BUILT_IN_GUIDES.find((guide) => guide.id === id);
}
