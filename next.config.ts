import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Proyek ini ada di bawah $HOME; batasi tracing ke folder proyek.
  outputFileTracingRoot: process.cwd(),
  reactStrictMode: true,
};

export default nextConfig;