/** @type {import('next').NextConfig} */
let nextConfig = {
  outputFileTracingRoot: __dirname,
  
  // ✅ Use SWC minifier (faster and uses less memory than Terser)
  swcMinify: true,
  
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
  
  // ✅ Disable source maps to save memory
  productionBrowserSourceMaps: false,
  
  // ✅ Compiler optimizations
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production' ? {
      exclude: ['error', 'warn']
    } : false,
  },
  
  // ✅ Optimize images (disable optimization to save memory during build)
  images: {
    unoptimized: true, // Set to false if you need image optimization
  },
  
  // ✅ Reduce bundle size
  modularizeImports: {
    // Only import what you use from libraries
    'lucide-react': {
      transform: 'lucide-react/dist/esm/icons/{{member}}',
    },
  },
  
  // ✅ Configure webpack for memory optimization
  webpack: (config, { isServer }) => {
    // Reduce memory usage during build
    config.optimization = {
      ...config.optimization,
      // Use less memory for minimization
      minimize: process.env.NODE_ENV === 'production',
      splitChunks: isServer ? false : {
        chunks: 'all',
        cacheGroups: {
          default: false,
          vendors: false,
          // Split vendor code into smaller chunks
          framework: {
            name: 'framework',
            test: /[\\/]node_modules[\\/](react|react-dom|scheduler)[\\/]/,
            priority: 40,
            enforce: true,
          },
          lib: {
            test: /[\\/]node_modules[\\/]/,
            name(module) {
              const packageName = module.context.match(
                /[\\/]node_modules[\\/](.*?)([\\/]|$)/
              )?.[1];
              return `npm.${packageName?.replace('@', '')}`;
            },
            priority: 30,
            minChunks: 1,
            reuseExistingChunk: true,
          },
          commons: {
            name: 'commons',
            minChunks: 2,
            priority: 20,
          },
        },
      },
    };

    // Reduce memory footprint
    config.performance = {
      ...config.performance,
      maxAssetSize: 1000000, // 1MB
      maxEntrypointSize: 1000000, // 1MB
    };

    return config;
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