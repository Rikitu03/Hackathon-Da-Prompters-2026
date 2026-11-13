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
          issuingOffice: "Your school’s Registrar’s Office or official student portal",
          steps: [
            "Get your Certificate of Registration (COR) from your school’s Registrar’s Office. If your school provides it through an official student portal, select the first semester of AY 2026–2027 and download or print the COR.",
            "Have your student number and enrollment details ready. Ask the registrar whether your enrollment must be confirmed and whether you need to submit a document request before the COR can be released.",
            "Tell the registrar that the copy is for a scholarship application. Ask whether a signed or certified copy is available, whether there is a fee, and when and how you can collect it. Follow your school’s instructions and keep any receipt or request reference.",
            "Check that it shows your name, student number, address, course, department, enrollment date, school year and year level.",
            "Ask the registrar to correct any wrong details. Keep the original or official downloaded file and prepare a clear scan or photo of the complete document, with all edges visible.",
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
          issuingOffice: "Your barangay hall; Pinagbuhatan Barangay Hall if you live in Pinagbuhatan",
          officeAddress: "Pinagbuhatan, Pasig City — the pinned location is for Pinagbuhatan residents.",
          // Location and stated hours come from the user-supplied Pinagbuhatan-Barangay-Hall.pdf.
          // The PDF does not establish service days, fees, processing time, or request requirements.
          officeHours: "Pinagbuhatan reference: 8:00 AM–5:00 PM. Confirm service days and certificate-request hours before visiting.",
          mapUrl: "https://www.google.com/maps/place/Pinagbuhatan+Barangay+Hall/@14.5573469,121.0913655,17.5z/data=!4m6!3m5!1s0x3397c7cd6f709e05:0xc9481ff04396c444!8m2!3d14.5571675!4d121.0909313!16s%2Fg%2F11b8t533ft?hl=en",
          steps: [
            "Go to the barangay hall of the barangay where you currently live. If you live in Pinagbuhatan, use the Pinagbuhatan Barangay Hall location below. If you live in another barangay, request the certificate from your own barangay hall.",
            "Before visiting, ask the barangay office what to bring, its service hours, any fee and the release schedule. Ask which ID and proof of address it accepts, such as a utility bill or lease, and bring the documents it requests.",
            "At the barangay’s certificate or service desk, request a Certificate of Residency for a scholarship application. Explain that it needs to state your years of residence. This is different from a Certificate of Indigency.",
            "Fill out the barangay’s request form or provide the details staff ask for, including your full name, complete address and years of residence. Follow any verification and payment instructions, keep any official receipt or claim slip, and collect the certificate on the advised date.",
            "Make sure it states your name, address, how many years you have lived there, the date issued and the city.",
            "Ask the barangay staff to correct any errors before you leave. Keep the certificate and prepare a clear scan or photo of the entire page, including the issuing official’s signature and any seal.",
            "Use “Check this document” to compare its name and address with your Certificate of Registration.",
          ],
          faqs: [
            {
              question: "Do I have to go to Pinagbuhatan Barangay Hall?",
              answer:
                "Only if you live in Pinagbuhatan. The pinned location and the 8:00 AM–5:00 PM hours are from the supplied Pinagbuhatan Barangay Hall reference. Confirm current service days and hours before visiting. Residents of other barangays should contact their own barangay hall.",
            },
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
          issuingOffice: "Your school’s ID office; ask the Registrar’s Office or Student Affairs Office for directions",
          steps: [
            "If you need a school ID, contact your school’s Registrar’s Office or Student Affairs Office and ask which campus office handles ID issuance, validation and replacement. Some schools have a separate ID or ICT office.",
            "Have your student number and current Certificate of Registration ready. Ask the issuing office what documents or photo it needs, whether you need an appointment, and whether a fee applies.",
            "Follow your school’s ID request process, including any photo capture or validation step. Keep any receipt or claim slip, confirm the release schedule, and collect your ID from the designated office.",
            "If your ID is lost, damaged or awaiting release, ask the school about replacement or validation. Before using another valid ID instead, confirm its acceptance with the scholarship office.",
            "Prepare a clear copy of the front and back of your school ID or another valid ID.",
            "Check that your name matches your Certificate of Registration and, for a school ID, that any printed student number matches too. Make sure the photo and all printed details on both sides are readable.",
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
