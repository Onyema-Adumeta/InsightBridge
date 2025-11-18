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
  
  // ✅ ADDED: Experimental optimizations
  experimental: {
    serverActions: {
      bodySizeLimit: '10mb',
    },
    // ✅ Reduce memory usage during build
    workerThreads: false,
    cpus: 1,
  },
  
  // API configuration
  api: {
    responseLimit: false,
    bodyParser: {
      sizeLimit: '10mb',
    },
  },
  
  // ✅ ADDED: Webpack optimizations for memory
  webpack: (config, { isServer, dev }) => {
    // Only optimize in production builds
    if (!dev && !isServer) {
      config.optimization = {
        ...config.optimization,
        splitChunks: {
          chunks: 'all',
          cacheGroups: {
            default: false,
            vendors: false,
            // Vendor chunk
            vendor: {
              name: 'vendor',
              chunks: 'all',
              test: /node_modules/,
              priority: 20,
            },
            // Common chunk
            common: {
              name: 'common',
              minChunks: 2,
              chunks: 'all',
              priority: 10,
              reuseExistingChunk: true,
              enforce: true,
            },
          },
        },
      };
    }
    
    return config;
  },
  
  // ✅ ADDED: Disable source maps in production to save memory
  productionBrowserSourceMaps: false,
  
  // ✅ ADDED: Compiler optimizations
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production' ? {
      exclude: ['error', 'warn']
    } : false,
  },
  
  // Rewrites for API proxy
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