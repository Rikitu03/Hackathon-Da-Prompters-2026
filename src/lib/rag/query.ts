const STOPWORDS = new Set([
  // English
  "the", "and", "for", "with", "what", "where", "when", "how", "who", "which", "can", "does", "are", "was", "were",
  "this", "that", "from", "have", "has", "you", "your", "our", "about", "need", "get", "into", "there", "their",
  "will", "would", "should", "could", "any", "all", "not", "but", "also", "then", "than", "them", "they", "its",
  // Filipino
  "ang", "mga", "ako", "ikaw", "siya", "kami", "kayo", "sila", "namin", "natin", "nila", "niya", "ito", "iyan",
  "iyon", "saan", "paano", "ano", "kailan", "sino", "bakit", "para", "kung", "din", "rin", "lang", "lamang",
  "opo", "yung", "nang", "mag", "pag", "may", "wala", "meron", "dito", "doon", "naman", "lahat",
]);

/** Question → OR-joined tsquery over letter/digit tokens only, so no tsquery syntax can be injected. */
export function buildTsQuery(question: string, maxTerms = 10): string | null {
  const terms = [
    ...new Set(
      question
        .normalize("NFKC")
        .toLowerCase()
        .split(/[^\p{L}\p{N}]+/u)
        .filter((t) => t.length >= 3 && !STOPWORDS.has(t)),
    ),
  ].slice(0, maxTerms);
  return terms.length ? terms.join(" | ") : null;
}
