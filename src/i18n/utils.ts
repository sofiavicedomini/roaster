import en from "@/locales/en.json";
import it from "@/locales/it.json";
import fr from "@/locales/fr.json";
import es from "@/locales/es.json";
import pt from "@/locales/pt.json";
import de from "@/locales/de.json";
import nl from "@/locales/nl.json";
import ru from "@/locales/ru.json";
import et from "@/locales/et.json";

export type Locale = "en" | "it" | "fr" | "es" | "pt" | "de" | "nl" | "ru" | "et";

export const locales: Locale[] = ["en", "it", "fr", "es", "pt", "de", "nl", "ru", "et"];

export const localeNames: Record<Locale, string> = {
  en: "English",
  it: "Italiano",
  fr: "Français",
  es: "Español",
  pt: "Português",
  de: "Deutsch",
  nl: "Nederlands",
  ru: "Русский",
  et: "Eesti",
};

export const translations: Record<Locale, typeof en> = { en, it, fr, es, pt, de, nl, ru, et };

export function getLocaleFromURL(url: URL, request?: Request): Locale {
  const pathLocale = url.pathname.split("/")[1];
  if (locales.includes(pathLocale as Locale)) {
    return pathLocale as Locale;
  }

  if (request) {
    const acceptLanguage = request.headers.get("accept-language");
    if (acceptLanguage) {
      const browserLocales = acceptLanguage
        .split(",")
        .map((lang) => lang.split(";")[0].trim().split("-")[0]);
      for (const lang of browserLocales) {
        if (locales.includes(lang as Locale)) {
          return lang as Locale;
        }
      }
    }
  }

  return "it";
}

export function getTranslations(locale: Locale) {
  return translations[locale] || translations.en;
}

export function useTranslations(locale: Locale) {
  const t = (key: string, params?: Record<string, string | number>): string => {
    const keys = key.split(".");
    let value: unknown = translations[locale];

    for (const k of keys) {
      if (value && typeof value === "object" && k in value) {
        value = (value as Record<string, unknown>)[k];
      } else {
        return key;
      }
    }

    if (typeof value !== "string") return key;

    if (params) {
      return value.replace(/\{(\w+)\}/g, (_, p) => String(params[p] ?? p));
    }

    return value;
  };

  return { t, locale, translations: translations[locale] };
}
