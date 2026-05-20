import * as Localization from "expo-localization";

import { getInitialLanguage } from "@/lib/i18n";

describe("getInitialLanguage", () => {
  test("returns 'lt' when device locale is Lithuanian", () => {
    (Localization.getLocales as jest.Mock).mockReturnValueOnce([
      { languageCode: "lt", languageTag: "lt-LT" },
    ]);
    expect(getInitialLanguage()).toBe("lt");
  });

  test("returns 'en' when device locale is English", () => {
    (Localization.getLocales as jest.Mock).mockReturnValueOnce([
      { languageCode: "en", languageTag: "en-GB" },
    ]);
    expect(getInitialLanguage()).toBe("en");
  });

  test("falls back to 'en' for unsupported locales", () => {
    (Localization.getLocales as jest.Mock).mockReturnValueOnce([
      { languageCode: "de", languageTag: "de-DE" },
    ]);
    expect(getInitialLanguage()).toBe("en");
  });

  test("falls back to 'en' when getLocales returns empty", () => {
    (Localization.getLocales as jest.Mock).mockReturnValueOnce([]);
    expect(getInitialLanguage()).toBe("en");
  });
});
