/** @type {import("next").NextConfig} */
const nextConfig = {
  experimental: {
    serverComponentsExternalPackages: ['apify-client', 'proxy-agent'],
  },
};
module.exports = nextConfig;
