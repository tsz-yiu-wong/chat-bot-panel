import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // 优化编译性能
  experimental: {
    optimizePackageImports: ['lucide-react', '@radix-ui/react-dropdown-menu'],
  },
  // 优化图片加载
  images: {
    formats: ['image/webp', 'image/avif'],
  },
  // 启用 gzip 压缩
  compress: true,
  // 优化 webpack 配置
  webpack: (config, { dev }) => {
    // 解决 punycode 弃用警告
    config.resolve.fallback = {
      ...config.resolve.fallback,
      punycode: false,
    };
    
    
    return config;
  },
};

export default nextConfig;
