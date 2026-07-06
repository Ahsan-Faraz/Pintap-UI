/** Option lists for the recommender profile editor (R-14). */

/** Gender values; labels resolve via i18n key `appPages.profile.genderOptions.<value>`. */
export const GENDER_VALUES = [
  "female",
  "male",
  "non_binary",
  "prefer_not_to_say",
] as const;

/** Social platforms. Display names are proper nouns (same in EN/DE). */
export const SOCIAL_PLATFORMS = [
  "Instagram",
  "TikTok",
  "YouTube",
  "X",
  "Facebook",
  "Pinterest",
  "Website",
] as const;

/** A small curated country list (ISO codes). The user's existing value is always included. */
export const COUNTRY_CODES = [
  "US",
  "GB",
  "DE",
  "FR",
  "ES",
  "IT",
  "NL",
  "BE",
  "AT",
  "CH",
  "IE",
  "SE",
  "NO",
  "DK",
  "PL",
  "PT",
  "CA",
  "AU",
] as const;
