/** @type {import('next').NextConfig} */

module.exports = {
  webpack(config, { isServer }) {
    config.module.rules.push({
      test: /\.svg$/,
      use: ["@svgr/webpack"],
    })

    config.externals.push("pino-pretty", "lokijs", "encoding")

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
      },
    }
  },
  experimental: {
    serverActions: true,
  },
}
