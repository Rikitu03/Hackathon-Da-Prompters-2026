import type { OcrInputPage } from "../extract-fields";

export const demoPages: OcrInputPage[] = [
  {
    pageNumber: 1,
    lines: [
      { text: "SAMPLE DOCUMENT - FOR TESTING ONLY", confidence: 0.9876 },
      { text: "Republic of the Philippines (DEMO)", confidence: 0.9994 },
      { text: "CERTIFICATE OF INDIGENCY", confidence: 0.9999 },
      { text: "Name: Juan Dela Cruz (fictional)", confidence: 0.9896 },
      { text: "Barangay: Demo Barangay", confidence: 0.9987 },
      { text: "Date Issued: 2026-11-13", confidence: 0.9971 },
      { text: "Purpose: Scholarship application (demo)", confidence: 0.9995 },
      { text: "Issuing Office: Office of the Punong Barangay (demo)", confidence: 0.9989 },
    ],
  },
];
