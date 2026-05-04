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

export interface Translation {
  site: {
    title: string;
    description: string;
    seoDescription: string;
    keywords: string;
    footer: string;
  };
  chatbot: {
    urlLabel: string;
    urlPlaceholder: string;
    urlHint: string;
    categoriesLabel: string;
    buttonRoast: string;
    buttonLoading: string;
    overallScore: string;
    detailedRoasts: string;
    fixPrompt: string;
    groups: Record<string, string>;
    categories: Record<string, string>;
    loadingMessages: string[];
    verifyingRobot: string;
    agentIteration: string;
    agentActions: Record<string, string>;
  };
  privacy: {
    message: string;
    accept: string;
    decline: string;
  };
  rankings: {
    navLink: string;
    title: string;
    subtitle: string;
    noRoasts: string;
    noRoastsSubtitle: string;
    roastSiteCta: string;
    categories: string;
    backLink: string;
    analyzedOn: string;
    scoresTitle: string;
    roastsTitle: string;
    fixPromptLabel: string;
    roastYourSiteCta: string;
    homeLink: string;
    shareRoast: string;
    stats: string;
  };
  errors: {
    urlRequired: string;
    highTraffic: string;
    invalidJson: string;
    unknown: string;
    aiApi: string;
    captchaExpired: string;
  };
  nav: {
    about: string;
    howItWorks: string;
  };
  home: {
    recentRoasts: string;
  };
  history: {
    title: string;
    clearAll: string;
  };
  about: {
    title: string;
    subtitle: string;
    intro: string;
    mission: string;
    team: string;
    cta: string;
    statsSites: string;
    statsSubtitle: string;
  };
  howItWorks: {
    title: string;
    subtitle: string;
    intro: string;
    step1Title: string;
    step1Desc: string;
    step2Title: string;
    step2Desc: string;
    step3Title: string;
    step3Desc: string;
    step4Title: string;
    step4Desc: string;
    cta: string;
  };
  newsletter: {
    title: string;
    placeholder: string;
    submit: string;
    success: string;
    error: string;
  };
}

export const translations = { en, it, fr, es, pt, de, nl, ru, et } as unknown as Record<Locale, Translation>;

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

export function getTranslations(locale: Locale): Translation {
  return translations[locale] || translations.en;
}

export function useTranslations(locale: Locale) {
  const t = (key: string, params?: Record<string, string | number>): string => {
    const keys = key.split(".");
    let value: unknown = translations[locale] || translations.en;
    
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
  
  return { t, locale, translations: translations[locale] || translations.en };
}
