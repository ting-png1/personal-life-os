import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import { fileURLToPath, URL } from 'node:url';
export default defineConfig({
    plugins: [
        react(),
        VitePWA({
            registerType: 'autoUpdate',
            includeAssets: ['favicon.svg', 'icons/apple-touch-icon.png'],
            manifest: {
                name: '生活状态 · 个人生活管理',
                short_name: '生活状态',
                description: '个人生活状态管理与智能规划',
                theme_color: '#FB6F92',
                background_color: '#FFF8FA',
                display: 'standalone',
                orientation: 'portrait',
                start_url: '/',
                scope: '/',
                lang: 'zh-CN',
                icons: [
                    {
                        src: 'icons/icon-192.png',
                        sizes: '192x192',
                        type: 'image/png',
                    },
                    {
                        src: 'icons/icon-512.png',
                        sizes: '512x512',
                        type: 'image/png',
                    },
                    {
                        src: 'icons/icon-512.maskable.png',
                        sizes: '512x512',
                        type: 'image/png',
                        purpose: 'maskable',
                    },
                ],
            },
            workbox: {
                globPatterns: ['**/*.{js,css,html,svg,png,ico,woff2}'],
                runtimeCaching: [
                    {
                        urlPattern: /\.(?:png|jpg|jpeg|svg|gif|webp|ico)$/,
                        handler: 'CacheFirst',
                        options: {
                            cacheName: 'image-cache',
                            expiration: {
                                maxEntries: 60,
                                maxAgeSeconds: 30 * 24 * 60 * 60, // 30 天
                            },
                        },
                    },
                ],
            },
            devOptions: {
                enabled: false, // 开发环境不启用 Service Worker，避免调试干扰
            },
        }),
    ],
    resolve: {
        alias: {
            '@': fileURLToPath(new URL('./src', import.meta.url)),
        },
    },
    server: {
        port: 5173,
        open: true,
    },
});
