import { useEffect } from "react";

function SEO({
  title,
  description,
  canonical,
  image,
  type = "website",
  jsonLd,
}) {
  useEffect(() => {
    const previousTitle = document.title;
    const restorers = [];

    document.title = title;

    const setMeta = (
      selector,
      attribute,
      value,
    ) => {
      if (!value) {
        return;
      }

      let element =
        document.head.querySelector(selector);
      const wasCreated = !element;
      const previousValue =
        element?.getAttribute("content");

      if (!element) {
        element =
          document.createElement("meta");

        if (attribute === "property") {
          element.setAttribute(
            "property",
            selector.match(
              /\[property="([^"]+)"\]/,
            )?.[1] || "",
          );
        } else {
          element.setAttribute(
            "name",
            selector.match(
              /\[name="([^"]+)"\]/,
            )?.[1] || "",
          );
        }

        document.head.appendChild(element);
      }

      element.setAttribute("content", value);

      restorers.push(() => {
        if (wasCreated) {
          element.remove();
        } else if (previousValue !== null) {
          element.setAttribute(
            "content",
            previousValue,
          );
        }
      });
    };

    setMeta(
      'meta[name="description"]',
      "name",
      description,
    );
    setMeta(
      'meta[property="og:title"]',
      "property",
      title,
    );
    setMeta(
      'meta[property="og:description"]',
      "property",
      description,
    );
    setMeta(
      'meta[property="og:type"]',
      "property",
      type,
    );
    setMeta(
      'meta[property="og:url"]',
      "property",
      canonical,
    );
    setMeta(
      'meta[property="og:image"]',
      "property",
      image,
    );
    setMeta(
      'meta[name="twitter:card"]',
      "name",
      image
        ? "summary_large_image"
        : "summary",
    );
    setMeta(
      'meta[name="twitter:title"]',
      "name",
      title,
    );
    setMeta(
      'meta[name="twitter:description"]',
      "name",
      description,
    );
    setMeta(
      'meta[name="twitter:image"]',
      "name",
      image,
    );

    let canonicalElement =
      document.head.querySelector(
        'link[rel="canonical"]',
      );
    const canonicalWasCreated =
      !canonicalElement;
    const previousCanonical =
      canonicalElement?.getAttribute("href");

    if (canonical) {
      if (!canonicalElement) {
        canonicalElement =
          document.createElement("link");
        canonicalElement.setAttribute(
          "rel",
          "canonical",
        );
        document.head.appendChild(
          canonicalElement,
        );
      }

      canonicalElement.setAttribute(
        "href",
        canonical,
      );
    }

    let structuredDataElement = null;

    if (jsonLd) {
      structuredDataElement =
        document.createElement("script");
      structuredDataElement.type =
        "application/ld+json";
      structuredDataElement.dataset.kushiBlog =
        "article";
      structuredDataElement.textContent =
        JSON.stringify(jsonLd);
      document.head.appendChild(
        structuredDataElement,
      );
    }

    return () => {
      document.title = previousTitle;
      restorers.reverse().forEach(
        (restore) => restore(),
      );

      if (canonicalElement) {
        if (canonicalWasCreated) {
          canonicalElement.remove();
        } else if (
          previousCanonical !== null
        ) {
          canonicalElement.setAttribute(
            "href",
            previousCanonical,
          );
        }
      }

      structuredDataElement?.remove();
    };
  }, [
    canonical,
    description,
    image,
    jsonLd,
    title,
    type,
  ]);

  return null;
}

export default SEO;
