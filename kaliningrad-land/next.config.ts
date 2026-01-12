import type { NextConfig } from "next";
import path from "path";

/**
 * URL бэкенда для проксирования в режиме разработки.
 * В Docker используется INTERNAL_API_URL, локально - localhost:8001
 */
const BACKEND_URL = process.env.INTERNAL_API_URL || "http://localhost:8001";

const nextConfig: NextConfig = {
  turbopack: {
    root: path.resolve(__dirname),
  },
  images: {
    remotePatterns: [
      {
        protocol: "http",
        hostname: "localhost",
      },
      {
        protocol: "http",
        hostname: "127.0.0.1",
      },
    ],
  },
  output: "standalone",

  /**
   * Rewrites для проксирования API и статических файлов на backend.
   * В режиме разработки (без nginx) Next.js проксирует запросы.
   * В production nginx обрабатывает проксирование, эти правила не используются.
   * 
   * Используем afterFiles, чтобы внутренние Next.js API routes (например /api/site-icon)
   * обрабатывались сначала, а проксирование на backend — только для остальных путей.
   */
  async rewrites() {
    return {
      // afterFiles проверяются после внутренних API routes Next.js
      afterFiles: [
        // Проксируем все API запросы на backend
        {
          source: "/api/:path*",
          destination: `${BACKEND_URL}/api/:path*`,
        },
        // Проксируем загруженные файлы
        {
          source: "/uploads/:path*",
          destination: `${BACKEND_URL}/uploads/:path*`,
        },
      ],
    };
  },
};

export default nextConfig;
