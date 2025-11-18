/** @type {import('next').NextConfig} */
let nextConfig = {
  outputFileTracingRoot: __dirname,
  
  // Ignore linting/type errors during build
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  
  // ✅ CRITICAL: Disable worker threads to prevent memory issues
  experimental: {
    serverActions: {
      bodySizeLimit: '10mb',
    },
    // ✅ This forces single-threaded build which respects NODE_OPTIONS
    workerThreads: false,
    cpus: 1,
  },
  
  // Disable source maps to save memory
  productionBrowserSourceMaps: false,
  
  // Compiler optimizations
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production' ? {
      exclude: ['error', 'warn']
    } : false,
  },
  
  // API proxy rewrite
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: 'https://insightbridge-backend-test.azurewebsites.net/api/:path*',
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