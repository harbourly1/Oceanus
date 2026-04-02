/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ['@oceanus/shared'],
  experimental: {
    serverActions: {
      bodySizeLimit: '10mb',
    },
  },
};

module.exports = nextConfig;
