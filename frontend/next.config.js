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
    // ✅ Enable optimized package imports
    optimizePackageImports: ['lucide-react', 'date-fns', 'lodash'],
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
    unoptimized: true,
  },
  
  // ✅ CRITICAL: Configure webpack for aggressive code splitting
  webpack: (config, { isServer, webpack }) => {
    // ✅ Reduce memory usage during build
    config.optimization = {
      ...config.optimization,
      minimize: process.env.NODE_ENV === 'production',
      
      // ✅ AGGRESSIVE code splitting to reduce bundle sizes
      splitChunks: isServer ? false : {
        chunks: 'all',
        cacheGroups: {
          default: false,
          vendors: false,
          
          // React framework
          framework: {
            name: 'framework',
            test: /[\\/]node_modules[\\/](react|react-dom|scheduler)[\\/]/,
            priority: 40,
            enforce: true,
          },
          
          // UI libraries (likely causing large bundles)
          ui: {
            name: 'ui',
            test: /[\\/]node_modules[\\/](@radix-ui|@headlessui|lucide-react)[\\/]/,
            priority: 35,
            enforce: true,
          },
          
          // Chart/data visualization libraries
          charts: {
            name: 'charts',
            test: /[\\/]node_modules[\\/](recharts|chart\.js|d3)[\\/]/,
            priority: 35,
            enforce: true,
          },
          
          // Date/utility libraries
          utils: {
            name: 'utils',
            test: /[\\/]node_modules[\\/](date-fns|lodash|moment)[\\/]/,
            priority: 35,
            enforce: true,
          },
          
          // Other vendor packages
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
            maxSize: 244000, // 244kb max per chunk
          },
          
          // Common components used across pages
          commons: {
            name: 'commons',
            minChunks: 2,
            priority: 20,
            reuseExistingChunk: true,
            maxSize: 244000,
          },
        },
        
        // ✅ Maximum sizes to enforce splitting
        maxSize: 244000, // 244kb - forces splitting of large chunks
        maxAsyncSize: 244000,
        maxInitialSize: 244000,
      },
      
      // ✅ Reduce duplication
      runtimeChunk: isServer ? false : 'single',
    };

    // ✅ Set performance budgets (will warn but not fail)
    config.performance = {
      hints: 'warning',
      maxAssetSize: 244000, // 244kb
      maxEntrypointSize: 244000, // 244kb
    };

    // ✅ Optimize resolver to speed up builds
    config.resolve = {
      ...config.resolve,
      alias: {
        ...config.resolve.alias,
      },
    };

    // ✅ Add module concatenation for smaller bundles
    config.plugins.push(
      new webpack.optimize.ModuleConcatenationPlugin()
    );

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