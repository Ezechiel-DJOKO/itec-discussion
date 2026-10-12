import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  turbopack: {}, // 👈 Désactive le conflit Turbopack / Webpack
  compress: true,
  poweredByHeader: false,
  reactStrictMode: true,
  images: {
    formats: ['image/avif', 'image/webp'],
  },
};

export default nextConfig;