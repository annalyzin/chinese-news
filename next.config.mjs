/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    // Allow images from any HTTPS hostname (news sources vary)
    remotePatterns: [
      { protocol: 'https', hostname: '**' },
    ],
  },
};

export default nextConfig;
