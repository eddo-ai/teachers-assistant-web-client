import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '*.auth0.com',
        pathname: '/avatar/**',
      },
      {
        protocol: 'https',
        hostname: 'lh3.googleusercontent.com',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 's.gravatar.com',
        pathname: '/avatar/**',
      },
      {
        protocol: 'https',
        hostname: 'eddolearning.com',
        pathname: '/**',
      }
    ],
  },
  env: {
    AUTH0_BASE_URL: process.env.VERCEL_URL || process.env.AUTH0_BASE_URL,
  },
};

module.exports = nextConfig;