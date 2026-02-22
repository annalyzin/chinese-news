/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: '*.8world.com' },
      { protocol: 'https', hostname: '*.mediacorp.sg' },
    ],
  },
  serverExternalPackages: ['jsdom'],
};

export default nextConfig;
