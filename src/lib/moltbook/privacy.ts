import type {
  PrivacyBlocklist,
  PrivacyCheckResult,
  PrivacyViolation,
  PrivacyViolationType,
} from "./types";

// ─────────────────────────────────────────────
// Regex patterns for PII detection
// ─────────────────────────────────────────────

const EMAIL_PATTERN = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;

const PHONE_PATTERN =
  /(?:\+?1[-.\s]?)?(?:\(?\d{3}\)?[-.\s]?)?\d{3}[-.\s]?\d{4}/g;

// Matches patterns like "123 Main St", "456 Oak Avenue, Suite 200"
const ADDRESS_PATTERN =
  /\d{1,5}\s+[A-Z][a-zA-Z]+(?:\s+[A-Z][a-zA-Z]+)*\s+(?:St(?:reet)?|Ave(?:nue)?|Blvd|Boulevard|Dr(?:ive)?|Ln|Lane|Rd|Road|Ct|Court|Pl(?:ace)?|Way|Pkwy|Parkway|Cir(?:cle)?)\b[^.]*?(?:\d{5}(?:-\d{4})?)?/gi;

// Matches "$X,XXX" or "$XX" with financial context words nearby
const FINANCIAL_PATTERN =
  /(?:revenue|cost|price|pricing|margin|profit|billing|invoice|payment|earning|salary|wage|budget)\s+(?:of\s+|is\s+|was\s+|at\s+)?\$[\d,]+(?:\.\d{2})?|\$[\d,]+(?:\.\d{2})?\s*(?:\/\s*(?:mo(?:nth)?|yr|year|week|hour|hr))/gi;

// ─────────────────────────────────────────────
// PrivacyFilter
// ─────────────────────────────────────────────

/**
 * Scans content for potential PII and privacy violations before
 * publishing to Moltbook. Returns a result indicating whether the
 * content is safe, with details on any violations found.
 */
export function checkContent(
  content: string,
  blocklist: PrivacyBlocklist
): PrivacyCheckResult {
  const violations: PrivacyViolation[] = [];

  // 1. Blocklist — business name, owner name, custom terms
  checkBlocklist(content, blocklist, violations);

  // 2. Email addresses
  checkPattern(content, EMAIL_PATTERN, "email", "an email address", violations);

  // 3. Phone numbers
  checkPattern(
    content,
    PHONE_PATTERN,
    "phone",
    "a phone number",
    violations
  );

  // 4. Physical addresses
  checkPattern(
    content,
    ADDRESS_PATTERN,
    "address",
    '"a location" or a general region',
    violations
  );

  // 5. Financial data with context
  checkPattern(
    content,
    FINANCIAL_PATTERN,
    "financial",
    "anonymized metrics without dollar amounts",
    violations
  );

  if (violations.length === 0) {
    return { passed: true, violations: [], sanitized: null };
  }

  return {
    passed: false,
    violations,
    sanitized: buildSanitized(content, violations),
  };
}

/**
 * Auto-sanitizes content by replacing all detected violations with
 * their suggested replacements. Useful for the heartbeat auto-draft flow.
 */
export function sanitize(
  content: string,
  blocklist: PrivacyBlocklist
): string {
  const result = checkContent(content, blocklist);
  return result.sanitized ?? content;
}

// ─────────────────────────────────────────────
// Internal helpers
// ─────────────────────────────────────────────

function checkBlocklist(
  content: string,
  blocklist: PrivacyBlocklist,
  violations: PrivacyViolation[]
): void {
  const lower = content.toLowerCase();

  // Business name
  if (blocklist.businessName) {
    const term = blocklist.businessName.toLowerCase();
    if (lower.includes(term)) {
      violations.push({
        type: "business_name",
        match: findOriginalCase(content, blocklist.businessName),
        suggestion: '"a client" or "a business I work with"',
      });
    }
  }

  // Owner name — check full name and individual parts (first/last)
  if (blocklist.ownerName) {
    const fullName = blocklist.ownerName.toLowerCase();
    if (lower.includes(fullName)) {
      violations.push({
        type: "person_name",
        match: findOriginalCase(content, blocklist.ownerName),
        suggestion: '"the owner" or "my operator"',
      });
    } else {
      // Check individual name parts (skip titles like "Dr." and short words)
      const parts = blocklist.ownerName
        .replace(/^(?:Dr|Mr|Mrs|Ms|Prof)\.?\s*/i, "")
        .split(/\s+/)
        .filter((p) => p.length > 2);
      for (const part of parts) {
        // Only flag if it appears as a whole word
        const wordBoundary = new RegExp(`\\b${escapeRegex(part)}\\b`, "i");
        if (wordBoundary.test(content)) {
          violations.push({
            type: "person_name",
            match: part,
            suggestion: '"the owner" or "my operator"',
          });
        }
      }
    }
  }

  // Custom blocked terms
  if (blocklist.customTerms) {
    for (const term of blocklist.customTerms) {
      if (term.length > 0 && lower.includes(term.toLowerCase())) {
        violations.push({
          type: "business_name",
          match: findOriginalCase(content, term),
          suggestion: "an anonymized reference",
        });
      }
    }
  }
}

function checkPattern(
  content: string,
  pattern: RegExp,
  type: PrivacyViolationType,
  suggestion: string,
  violations: PrivacyViolation[]
): void {
  // Reset lastIndex for global regexes
  pattern.lastIndex = 0;
  let match: RegExpExecArray | null;
  while ((match = pattern.exec(content)) !== null) {
    violations.push({
      type,
      match: match[0],
      suggestion,
    });
  }
}

function buildSanitized(
  content: string,
  violations: PrivacyViolation[]
): string {
  let sanitized = content;

  // Sort by match length descending to replace longer matches first
  // (prevents partial replacement issues)
  const sorted = [...violations].sort(
    (a, b) => b.match.length - a.match.length
  );

  const replacements: Record<PrivacyViolationType, string> = {
    business_name: "a client",
    person_name: "the owner",
    email: "[email redacted]",
    phone: "[phone redacted]",
    address: "a location",
    financial: "[financial data redacted]",
  };

  for (const v of sorted) {
    const replacement = replacements[v.type];
    // Case-insensitive replacement of the matched string
    const escaped = escapeRegex(v.match);
    sanitized = sanitized.replace(new RegExp(escaped, "gi"), replacement);
  }

  return sanitized;
}

function findOriginalCase(content: string, term: string): string {
  const idx = content.toLowerCase().indexOf(term.toLowerCase());
  if (idx === -1) return term;
  return content.slice(idx, idx + term.length);
}

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
