/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  experimental: {
    serverActions: { bodySizeLimit: "2mb" },
    // Surface every request that ends in 500 inside the server logs and the
    // instrumentation pipeline (Sentry hooks into this).
    instrumentationHook: true,
  },
};

// Sentry is optional. When SENTRY_DSN is set we wrap the config to upload
// source-maps and forward the runtime to its bundler plugin; otherwise we ship
// the bare config so the build never depends on the Sentry CLI.
async function withMaybeSentry(config) {
  if (!process.env.SENTRY_DSN && !process.env.NEXT_PUBLIC_SENTRY_DSN) {
    return config;
  }
  try {
    const { withSentryConfig } = await import("@sentry/nextjs");
    return withSentryConfig(config, {
      org: process.env.SENTRY_ORG,
      project: process.env.SENTRY_PROJECT,
      authToken: process.env.SENTRY_AUTH_TOKEN,
      silent: !process.env.CI,
      // Source-maps only when an auth token is provided.
      sourcemaps: { disable: !process.env.SENTRY_AUTH_TOKEN },
      disableLogger: true,
      tunnelRoute: "/monitoring",
    });
  } catch {
    // @sentry/nextjs not installed — fall back to the bare config so the build
    // still works in environments that opted out of the dep.
    return config;
  }
}

export default await withMaybeSentry(nextConfig);
