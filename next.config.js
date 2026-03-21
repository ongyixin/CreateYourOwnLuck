/** @type {import("next").NextConfig} */
const nextConfig = {
  experimental: {
    serverComponentsExternalPackages: ['apify-client', 'proxy-agent', '@react-pdf/renderer'],
  },
};
module.exports = nextConfig;
