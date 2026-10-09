/** @type {import('next').NextConfig} */
const nextConfig = {
  devIndicators: false, // Black 'N' dev button-ti hide korar jonno

  // Transpile workspace packages (source TS, no pre-build step needed)
  transpilePackages: ['@repo/type'],

  experimental: {
    // Enables the App Router (already default in Next 14, but explicit for clarity)
  },

  // Recommended: enable strict mode
  reactStrictMode: true,

  // Image optimization - add your domains here
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**.placeholder.com',
      },
    ],
  },
};

export default nextConfig;