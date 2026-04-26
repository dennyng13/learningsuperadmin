import { useEffect } from "react";
import { useBrandAsset } from "@shared/hooks/useBrandAsset";

/**
 * Keeps `<link rel="icon">` in sync with the active `favicon` brand asset.
 * Mount once at the app root — it shares the same React Query cache as
 * `useBrandAsset()` calls in the sidebar / login page, so no extra request.
 *
 * If no favicon asset is found in the registry the existing `<link>` (set in
 * `index.html`) is left untouched.
 */
export function BrandFavicon() {
  const { url } = useBrandAsset(["favicon", "logoApp"]);

  useEffect(() => {
    if (!url) return;
    // Find or create the icon link element.
    let link = document.querySelector<HTMLLinkElement>("link[rel='icon']");
    if (!link) {
      link = document.createElement("link");
      link.rel = "icon";
      document.head.appendChild(link);
    }
    if (link.href !== url) link.href = url;
  }, [url]);

  return null;
}

export default BrandFavicon;