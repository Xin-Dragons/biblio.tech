/** @type {import('next').NextConfig} */

const withBundleAnalyzer = require('@next/bundle-analyzer')({
  enabled: process.env.ANALYZE === 'true',
})
module.exports = withBundleAnalyzer({
  reactStrictMode: false,
  webpack(config, { isServer }) {
    config.module.rules.push({
      test: /\.svg$/,
      use: ["@svgr/webpack"]
    });

    if (isServer) {
      return config
    }

    return {
      ...config,
      resolve: {
        ...config.resolve,
        fallback: {
          ...config.resolve.fallback,
          fs: false,
        },
      }
    }
  }
})