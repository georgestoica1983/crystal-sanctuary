/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Lets a second dev server or build use its own folder (default .next)
  distDir: process.env.NEXT_DIST_DIR || ".next",
};

export default nextConfig;
