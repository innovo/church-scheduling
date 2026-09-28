import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { getBranding } from "./api";
import { CHURCH_NAME, CHURCH_TAGLINE, CHURCH_ADDRESS, CHURCH_EMAIL, CHURCH_PHONE, type Branding } from "./types";

const DEFAULT_BRANDING: Branding = {
  name: CHURCH_NAME,
  tagline: CHURCH_TAGLINE,
  address: CHURCH_ADDRESS,
  email: CHURCH_EMAIL,
  phone: CHURCH_PHONE,
  logoUrl: null,
  primaryColor: null,
};

const BrandingContext = createContext<Branding>(DEFAULT_BRANDING);

/**
 * Fetches the tenant's branding (name, tagline, contact info, logo, color) once
 * and makes it available to the whole app. Falls back to the static CHURCH_*
 * constants until it loads, and if it fails, so the page never shows blank.
 */
export function BrandingProvider({ children }: { children: ReactNode }) {
  const [branding, setBranding] = useState<Branding>(DEFAULT_BRANDING);

  useEffect(() => {
    let cancelled = false;
    getBranding()
      .then((b) => {
        if (!cancelled) setBranding(b);
      })
      .catch(() => {
        // Keep the static defaults if the fetch fails.
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return <BrandingContext.Provider value={branding}>{children}</BrandingContext.Provider>;
}

export function useBranding() {
  return useContext(BrandingContext);
}
