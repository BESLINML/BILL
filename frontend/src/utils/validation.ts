const optionalMatch = (value: string, pattern: RegExp) => !value.trim() || pattern.test(value.trim());

export const isValidEmail = (value: string) => optionalMatch(value, /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/);

export const isValidPhone = (value: string) => {
  if (!value.trim()) return true;
  const normalized = value.replace(/[\s()-]/g, "");
  return /^\+?[1-9]\d{7,14}$/.test(normalized);
};

export const isValidGstin = (value: string) => optionalMatch(value, /^\d{2}[A-Z]{5}\d{4}[A-Z][A-Z\d]Z[A-Z\d]$/i);
export const isValidPan = (value: string) => optionalMatch(value, /^[A-Z]{5}\d{4}[A-Z]$/i);
export const isValidIfsc = (value: string) => optionalMatch(value, /^[A-Z]{4}0[A-Z0-9]{6}$/i);
export const isValidAccountNumber = (value: string) => optionalMatch(value, /^\d{9,18}$/);
export const isValidPostalCode = (value: string) => optionalMatch(value, /^\d{6}$/);

export const isValidWebsite = (value: string) => {
  if (!value.trim()) return true;
  try {
    const url = new URL(value.trim());
    return (url.protocol === "http:" || url.protocol === "https:") && Boolean(url.hostname.includes("."));
  } catch {
    return false;
  }
};
