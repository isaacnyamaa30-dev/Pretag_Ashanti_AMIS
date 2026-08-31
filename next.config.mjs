/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  experimental: {
    // exceljs is only used in server code (route handlers / server actions)
    serverComponentsExternalPackages: ["exceljs"],
  },
};

export default nextConfig;
