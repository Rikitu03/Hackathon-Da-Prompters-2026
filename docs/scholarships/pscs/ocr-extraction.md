# PSCS OCR extraction priorities and keyword reference

Prepared **13 November 2026** for Member 4 and the applicant document-review UI.

Use [ocr-profiles.json](ocr-profiles.json) as the machine-readable reference. It defines 20 document profiles, shared field keys, English/Filipino keyword hints, priorities, and review checks. The field lists are proposed extraction targets; they do not establish official PSCS requirements or change which documents a program accepts. Check the [documentary requirements reference](requirements.md) for policy applicability.

## What to prioritize

`P0` means read/review first, `P1` adds useful context, and `P2` is optional supporting text. A missing P0 value means review is needed, not that a document or applicant has been rejected. Some layouts do not print every target field.

| Document | P0: read first | P1: useful context |
|---|---|---|
| Barangay indigency | Named beneficiary, issue date, residence city, stated purpose | Barangay, issuer, address |
| Barangay residency | Named resident, barangay, residence city, explicit duration of residence, issue date | Purpose, issuer, address |
| Enrollment evidence | Student, school, school year, grade/year level | Semester, enrollment statement, course/strand, issue date; semester becomes P0 for a semester-specific requirement |
| School report card | Student, school, school year, level, grading period, subject grades | Printed average, semester, grading legend |
| College grade report | Student, school, school year, semester, subject grades/statuses | Printed average, grading scale, course, year level |
| Payslip | Employee, employer, pay period, gross earnings, currency | Net pay and income basis |
| Income-tax document | Taxpayer, tax year, labeled income figure, income basis, currency | Employer where applicable |
| Non-filing affidavit | Declarant, explicit non-filing reason, execution date | Employment/income circumstances, amount and basis, address, purpose |
| OFW remittance | Sender, recipient, transaction date, labeled amount, currency | Keep any additional context only if needed |
| Scholarship application | Applicant, year, level, school, printed/selected classification | Course, combined monthly income, parent/guardian names, semester |
| School/valid ID | Named holder, issuer | School and school year if printed |
| Interview intake | Applicant, school, level | Parent/guardian roles and combined income |
| Essay | Essay body | Named author if present |
| Birth certificate | Child's name and birth date | Birthplace; historical PAG-ASA fixture only |
| Voter certification | Named voter, locality city, issue date | Barangay and issuer; historical PAG-ASA fixture only |
| Good-moral certification | Student, school, explicit conduct statement | Issue date and issuer; historical PAG-ASA fixture only |
| Admission proof | Applicant, institution, program, admission statement | Year, semester, issue date; historical PAG-ASA fixture only |
| Listahanan certification | Named household, explicitly named register, issuer | Issue date and locality; historical PAG-ASA fixture only |
| 1 × 1 photo | No OCR field targets | Visual/manual attachment check |
| GCash form | Field list pending inspection of the official form | Attachment category only |

For barangay indigency, the main keyword groups are:

```json
{
  "document_type": "barangay_indigency",
  "P0": ["full_name", "date_issued", "city", "purpose"],
  "P1": ["barangay", "issuing_office", "address"],
  "keyword_hints": {
    "full_name": ["Name", "Full Name", "Pangalan", "Buong Pangalan"],
    "date_issued": ["Date Issued", "Issued On", "Date of Issuance", "Petsa ng Pag-isyu"],
    "city": ["City", "Municipality", "Lungsod", "Bayan"],
    "purpose": ["Purpose", "For the Purpose Of", "Layunin", "Para Sa"],
    "barangay": ["Barangay", "Brgy", "Brgy."],
    "issuing_office": ["Issuing Office", "Issued By", "Tanggapan ng Punong Barangay"]
  }
}
```

These are candidate label/phrase matches, not a working prompt or a native Lumen request. An indigency certificate can use narrative text instead of labels, for example a beneficiary name after a certification phrase. That needs a bounded extraction rule and a highlighted evidence span; adding a keyword alone does not implement it.

## Suggested extraction and review sequence

1. Use the selected checklist item as context and classify the actual document from its title/text. Keep the selected requirement and detected document type separate. A file uploaded for residency can still contain an indigency certificate.
2. Select the corresponding JSON profile. Allow unknown or conflicting classification and ask for review.
3. Match labels, nearby cells, or explicitly supported narrative spans. Use layout context for tables; distinguish the document's subject from its issuer/signatory.
4. Preserve the original value, line/page evidence, and provider confidence when available. Never invent confidence for a derived field.
5. Normalize only unambiguous values. Preserve leading zeroes in identifiers, gross/net labels, income frequency/currency, and grading scales. An ambiguous numeric date stays ambiguous.
6. Show editable values and review warnings. Compare only against explicit criteria from the selected approved cycle, keeping document role and period distinct.

Do not derive the student's city from a school or office letterhead. Do not treat every `Date` as issuance, every `Name` as the student, or every amount as monthly income. Missing fields stay empty in the current API. Do not fill them from the expected policy or another document.

## Current build versus proposed profiles

The existing [extractor](../../../src/lib/ocr/extract-fields.ts) emits only:

```json
[
  "document_type",
  "full_name",
  "barangay",
  "date_issued",
  "purpose",
  "issuing_office"
]
```

It looks for same-line labels separated from their values by a colon or dash. Its current aliases are recorded separately in the JSON. **City, residence duration, academic periods, income, grades, and the additional aliases in the profiles are not implemented by this reference.** The generic document-title matcher also does not yet implement these 20 classifications.

Keep the [existing OCR response contract](../../API_CONTRACTS.md) when implementing new fields. Each `fields[]` entry uses string `value`, `originalText`, `needsReview`, and `warnings`. Array/table extraction can initially be presented as reviewable text; changing to nested typed values requires a separately coordinated frontend contract.

For example, after implementing city extraction, this is an illustrative field entry for a fictional specimen; it is not a recorded provider response:

```json
{
  "key": "city",
  "label": "City / municipality of residence",
  "value": "Pasig City",
  "needsReview": true,
  "originalText": "City of Residence: Pasig City",
  "warnings": ["Please confirm that this is the named subject's residence, not the issuing office address."]
}
```

Member 4 should implement profile selection and extraction in the local normalization layer after Lumen returns OCR lines/pages. Member 1 can render P0 fields first using the profile while continuing to render the same `fields[]` contract. The current upload route does not accept a profile/cycle selector as a documented extraction input; coordinate that addition or perform post-extraction review in the UI. Keep provider credentials and calls server-side.

## Checks that need special care

- **Indigency versus residency:** both can contain name, address, city, date, and purpose. Shared fields do not make them interchangeable. Their title and assertion must stay distinct.
- **Enrollment versus grades:** R26 enrollment is first semester 2026–2027, while its grade report is second semester 2025–2026. The two documents need different expected periods.
- **Parent versus applicant:** a parent's payslip correctly names the parent. Any relationship check needs explicit applicant/household context; OCR alone does not establish that relationship.
- **Dates:** issue date, birth date, payroll period, execution date, and remittance date are separate keys. Do not impose an unsupported certificate age limit.
- **Money:** preserve period, currency, gross/net distinctions, and the exact tax/income label. Do not infer monthly earnings from a single remittance or annual tax figure.
- **Signatures/notarial blocks:** printed labels or jurat text are readable text, not signature/notarization verification. A missing OCR line is not proof that the original lacks that element.
- **Photo/GCash:** OCR cannot establish portrait dimensions or facial identity. The GCash layout remains uninspected; no guessed wallet fields are added.

For the first implementation, add **city to barangay documents and explicit residence duration to residency certificates**, then **school year, semester, student and school to enrollment/grade documents**. Use the [fictional specimen and negative variants](demo-data.md) before expanding to financial tables. Review and cite official guidance for any policy comparison; these extraction priorities are implementation choices.
