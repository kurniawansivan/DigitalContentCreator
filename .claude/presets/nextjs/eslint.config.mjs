// Next.js additions. Merge on top of ../react/eslint.config.mjs.
//
// Install: npm i -D @next/eslint-plugin-next

import nextPlugin from "@next/eslint-plugin-next";
import reactConfig from "../react/eslint.config.mjs";

export default [
  ...reactConfig,

  {
    files: ["**/*.{ts,tsx}"],
    plugins: { "@next/next": nextPlugin },
    rules: {
      ...nextPlugin.configs.recommended.rules,
      ...nextPlugin.configs["core-web-vitals"].rules,

      // next/image handles sizing, formats, and lazy loading. A raw <img> is how layout
      // shift and oversized downloads get shipped.
      "@next/next/no-img-element": "error",
      "@next/next/no-html-link-for-pages": "error",
      "@next/next/no-sync-scripts": "error",
      "@next/next/no-css-tags": "error",
      "@next/next/no-page-custom-font": "error",
      "@next/next/google-font-display": "error",
      "@next/next/no-before-interactive-script-outside-document": "error",
    },
  },

  // Server-side files may read the environment; client components may not.
  {
    files: ["app/**/page.tsx", "app/**/layout.tsx", "app/**/route.ts", "middleware.ts"],
    rules: { "no-console": "error" },
  },
];

// Also required in next.config.mjs - security headers are not optional:
//
// const securityHeaders = [
//   { key: "Strict-Transport-Security", value: "max-age=31536000; includeSubDomains" },
//   { key: "X-Content-Type-Options", value: "nosniff" },
//   { key: "X-Frame-Options", value: "DENY" },
//   { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
//   { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
// ];
//
// export default {
//   reactStrictMode: true,
//   poweredByHeader: false,
//   eslint: { ignoreDuringBuilds: false },   // never true
//   typescript: { ignoreBuildErrors: false }, // never true
//   async headers() {
//     return [{ source: "/:path*", headers: securityHeaders }];
//   },
// };
