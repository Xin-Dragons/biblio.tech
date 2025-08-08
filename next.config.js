/** @type {import('next').NextConfig} */

module.exports = {
  reactStrictMode: false,
  experimental: {
    serverActions: true,
  },
  webpack(config, { isServer }) {
    config.module.rules.push({
      test: /\.svg$/,
      use: ["@svgr/webpack"],
    })

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
          child_process: false,
          readline: false,
          "stream/promises": false,
        },
      },
    }
  },
}
