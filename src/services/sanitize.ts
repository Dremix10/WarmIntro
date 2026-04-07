/**
 * Wraps user-provided text for safe interpolation into Claude prompts.
 * Strips any XML-like tags that could interfere with prompt structure
 * and truncates to a max length.
 */
export function sanitizeForPrompt(input: string, maxLength = 5000): string {
  return input
    .replace(/<\/?[a-zA-Z][^>]*>/g, "")  // strip HTML/XML tags
    .replace(/\x00/g, "")                 // strip null bytes
    .slice(0, maxLength);
}

/**
 * Wraps user data in XML delimiters with an instruction to treat as data only.
 * Claude is trained to respect these boundaries.
 */
export function wrapUserData(label: string, value: string, maxLength = 5000): string {
  const sanitized = sanitizeForPrompt(value, maxLength);
  return `<user_data field="${label}">${sanitized}</user_data>`;
}
