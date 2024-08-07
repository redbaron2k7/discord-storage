/** @type {import('next').NextConfig} */
const nextConfig = {
    reactStrictMode: true,
    experimental: {
      appDir: true,
    },
    webpack: (config, { isServer }) => {
        if (!isServer) {
          config.optimization.splitChunks = false;
        }
        return config;
      },
    }

export default nextConfig;
