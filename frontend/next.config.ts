import type { NextConfig } from "next";

// EXPORT_STATIC=true enables static HTML export for Capacitor mobile builds.
// Regular dev/production builds keep API routes (including NextAuth) working.
const isStaticExport = process.env.EXPORT_STATIC === "true";

const nextConfig: NextConfig = {
  ...(isStaticExport && { output: "export", trailingSlash: true }),
  // react-markdown, remark-gfm and the whole unified/mdast/hast ecosystem are
  // ESM-only packages. Without transpilePackages, Next.js bundles them as CJS
  // which causes silent import failures (Markdown component is undefined).
  transpilePackages: [
    "react-markdown",
    "remark-gfm",
    "remark-parse",
    "remark-rehype",
    "unified",
    "bail",
    "is-plain-obj",
    "trough",
    "vfile",
    "vfile-message",
    "unist-util-stringify-position",
    "unist-util-visit",
    "unist-util-visit-parents",
    "unist-util-is",
    "unist-util-position",
    "mdast-util-from-markdown",
    "mdast-util-to-hast",
    "mdast-util-gfm",
    "mdast-util-gfm-table",
    "mdast-util-gfm-strikethrough",
    "mdast-util-gfm-task-list-item",
    "mdast-util-gfm-autolink-literal",
    "mdast-util-gfm-footnote",
    "mdast-util-to-markdown",
    "mdast-util-find-and-replace",
    "micromark",
    "micromark-core-commonmark",
    "micromark-extension-gfm",
    "micromark-extension-gfm-table",
    "micromark-extension-gfm-strikethrough",
    "micromark-extension-gfm-task-list-item",
    "micromark-extension-gfm-autolink-literal",
    "micromark-extension-gfm-footnote",
    "micromark-util-combine-extensions",
    "micromark-util-chunked",
    "micromark-util-character",
    "micromark-util-classify-character",
    "micromark-util-decode-numeric-character-reference",
    "micromark-util-decode-string",
    "micromark-util-encode",
    "micromark-util-html-tag-name",
    "micromark-util-normalize-identifier",
    "micromark-util-resolve-all",
    "micromark-util-sanitize-uri",
    "micromark-util-subtokenize",
    "micromark-util-symbol",
    "micromark-util-types",
    "hast-util-to-jsx-runtime",
    "hast-util-whitespace",
    "hast-util-is-element",
    "hast-util-from-parse5",
    "property-information",
    "space-separated-tokens",
    "comma-separated-tokens",
    "ccount",
    "decode-named-character-reference",
    "character-entities",
    "zwitch",
    "longest-streak",
    "trim-lines",
    "devlop",
  ],
  images: {
    unoptimized: isStaticExport,
    remotePatterns: [
      { protocol: "https", hostname: "lh3.googleusercontent.com" },
      { protocol: "https", hostname: "avatars.githubusercontent.com" },
    ],
  },
};

export default nextConfig;
