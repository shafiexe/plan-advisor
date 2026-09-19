"use client";
import { createContext, useContext, useState, useEffect, ReactNode } from "react";

export type Locale = "en" | "hi" | "ar" | "ta";

type Messages = Record<string, unknown>;

type LanguageContextValue = {
  locale: Locale;
  setLocale: (l: Locale) => void;
  t: (key: string) => string;
  tArray: (key: string) => string[];
  dir: "ltr" | "rtl";
};

const LanguageContext = createContext<LanguageContextValue>({
  locale: "en",
  setLocale: () => {},
  t: (k) => k,
  tArray: () => [],
  dir: "ltr",
});

const RTL_LOCALES: Locale[] = ["ar"];

// Static map so bundlers can statically analyze the imports
function loadMessages(locale: Locale): Promise<Messages> {
  switch (locale) {
    case "hi": return import("@/messages/hi.json").then((m) => m.default as unknown as Messages);
    case "ar": return import("@/messages/ar.json").then((m) => m.default as unknown as Messages);
    case "ta": return import("@/messages/ta.json").then((m) => m.default as unknown as Messages);
    default:   return import("@/messages/en.json").then((m) => m.default as unknown as Messages);
  }
}

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>("en");
  const [messages, setMessages] = useState<Messages>({});

  // Load persisted locale on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem("plan-advisor-locale") as Locale | null;
      if (saved && (["en", "hi", "ar", "ta"] as string[]).includes(saved)) {
        setLocaleState(saved as Locale);
      }
    } catch {}
  }, []);

  // Load messages when locale changes
  useEffect(() => {
    loadMessages(locale).then(setMessages).catch(() => {});
  }, [locale]);

  const setLocale = (l: Locale) => {
    setLocaleState(l);
    try {
      localStorage.setItem("plan-advisor-locale", l);
    } catch {}
  };

  const t = (key: string): string => {
    const parts = key.split(".");
    let val: unknown = messages;
    for (const p of parts) {
      if (typeof val !== "object" || val === null) return key;
      val = (val as Record<string, unknown>)[p];
    }
    if (typeof val === "string") return val;
    if (Array.isArray(val)) return (val as string[]).join(", ");
    return key;
  };

  const tArray = (key: string): string[] => {
    const parts = key.split(".");
    let val: unknown = messages;
    for (const p of parts) {
      if (typeof val !== "object" || val === null) return [];
      val = (val as Record<string, unknown>)[p];
    }
    if (Array.isArray(val)) return val as string[];
    return [];
  };

  const dir: "ltr" | "rtl" = RTL_LOCALES.includes(locale) ? "rtl" : "ltr";

  return (
    <LanguageContext.Provider value={{ locale, setLocale, t, tArray, dir }}>
      <div dir={dir} className="contents">
        {children}
      </div>
    </LanguageContext.Provider>
  );
}

export const useLanguage = () => useContext(LanguageContext);
