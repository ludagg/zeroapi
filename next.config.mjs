import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./i18n/request.ts");

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  experimental: {
    serverActions: { bodySizeLimit: "2mb" },
    // Required in Next 14 to load instrumentation.ts (Sentry server/edge init).
    instrumentationHook: true,
  },
};

export default withNextIntl(nextConfig);
