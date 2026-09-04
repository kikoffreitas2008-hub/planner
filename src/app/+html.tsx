import { ScrollViewStyleReset } from "expo-router/html";
import type { PropsWithChildren } from "react";

/**
 * The root HTML document for the static web export. This is what makes the
 * install-to-home-screen PWA work: `manifest.json` plus the Apple-specific
 * meta tags. Every route renders inside it — Expo Router's client-side
 * navigation keeps every screen inside this same standalone shell
 * (blueprint/03 §6; the previous build let some routes fall back to
 * Safari's chrome because a route was reached outside the app shell).
 */
export default function Root({ children }: PropsWithChildren) {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta httpEquiv="X-UA-Compatible" content="IE=edge" />
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1, shrink-to-fit=no, viewport-fit=cover"
        />
        <title>Planner</title>
        <meta
          name="description"
          content="A calm day, project and calendar planner — no ads, no streaks, no noise."
        />

        {/* Installable PWA */}
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#FFFFFF" />
        <link rel="icon" href="/favicon-32.png" sizes="32x32" type="image/png" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />

        {/* Full-screen, no Safari chrome, once added to the home screen */}
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-title" content="Planner" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />

        <ScrollViewStyleReset />
      </head>
      <body>{children}</body>
    </html>
  );
}
