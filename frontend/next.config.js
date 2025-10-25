/** @type {import('next').NextConfig} */
let nextConfig = {
  // Add these two lines to ignore linting errors during build
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  experimental: {
    serverActions: {},
  },
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: 'http://127.0.0.1:8000/api/:path*',
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