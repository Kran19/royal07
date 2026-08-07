import type { NextConfig } from "next";

const internalBackendUrl = process.env.INTERNAL_BACKEND_URL || 'http://localhost:4000';

const nextConfig: NextConfig = {
  async redirects() {
    return [
      {
        source: '/',
        destination: '/user',
        permanent: true,
      },
    ];
  },
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: `${internalBackendUrl}/:path*`,
      },
      {
        source: '/uploads/:path*',
        destination: `${internalBackendUrl}/uploads/:path*`,
      },
      {
        source: '/game/:path*',
        destination: `${internalBackendUrl}/game/:path*`,
      },
      {
        source: '/socket.io',
        destination: `${internalBackendUrl}/socket.io`,
      },
      {
        source: '/socket.io/:path*',
        destination: `${internalBackendUrl}/socket.io/:path*`,
      }
    ];
  },
  async headers() {
    return [
      {
        // Apply to all routes
        source: "/(.*)",
        headers: [
          {
            // This bypasses the ngrok browser warning page so JS works correctly
            key: "ngrok-skip-browser-warning",
            value: "true",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
