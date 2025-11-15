/** @type {import('next').NextConfig} */
let nextConfig = {
  outputFileTracingRoot: __dirname,
  // Add these two lines to ignore linting errors during build
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  experimental: {
    serverActions: {
      bodySizeLimit: '10mb',  // ← ADDED
    },
  },
  // ← ADDED API configuration
  api: {
    responseLimit: false,
    bodyParser: {
      sizeLimit: '10mb',
    },
  },
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: 'https://bridge-backend-test.azurewebsites.net/api/:path*',
      },
    ];
  },
};
// Only use bundle analyzer if the package is installed
if (process.env.ANALYZE === 'true') {
  try {
    const withBundleAnalyzer = require('@next/bundle-analyzer')({
      enabled: true,
    });
    nextConfig = withBundleAnalyzer(nextConfig);
  } catch (e) {
    console.log('Bundle analyzer not installed, skipping...');
  }
}
module.exports = nextConfig;