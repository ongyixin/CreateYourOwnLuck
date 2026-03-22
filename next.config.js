/** @type {import("next").NextConfig} */
const nextConfig = {
  experimental: {
    // 'rocketride' uses WebSocket internals that must not be bundled by webpack.
    serverComponentsExternalPackages: ['apify-client', 'proxy-agent', '@react-pdf/renderer', 'rocketride'],
  },
};
module.exports = nextConfig;
