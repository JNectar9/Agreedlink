/** @type {import('next').NextConfig} */
const securityHeaders = [
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' }
];

const codespaceHost = process.env.CODESPACE_NAME ? `${process.env.CODESPACE_NAME}-3000.app.github.dev` : null;

const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ['lucide-react'],
  poweredByHeader: false,
  experimental: {
    serverActions: {
      allowedOrigins: ['localhost:3000', '*.app.github.dev', ...(codespaceHost ? [codespaceHost] : [])]
    }
  },
  async headers() {
    return [{ source: '/:path*', headers: securityHeaders }];
  }
};

export default nextConfig;
