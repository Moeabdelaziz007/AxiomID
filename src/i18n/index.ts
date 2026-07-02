import en from "./en.json";
import ar from "./ar.json";
import type { Language } from "@/app/context/language-context";

export type { Language };

const bundles: Record<Language, Record<string, string>> = { en, ar };

export function getTranslation(lang: Language, key: string): string {
  return bundles[lang]?.[key] ?? bundles.en[key] ?? key;
}

export function getTranslations(lang: Language): Record<string, string> {
  return bundles[lang] ?? bundles.en;
}
