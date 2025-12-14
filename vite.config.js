var __spreadArray = (this && this.__spreadArray) || function (to, from, pack) {
    if (pack || arguments.length === 2) for (var i = 0, l = from.length, ar; i < l; i++) {
        if (ar || !(i in from)) {
            if (!ar) ar = Array.prototype.slice.call(from, 0, i);
            ar[i] = from[i];
        }
    }
    return to.concat(ar || Array.prototype.slice.call(from));
};
/// <reference types="vitest" />
import { execSync } from "node:child_process";
import { existsSync } from "node:fs";
import basicSsl from "@vitejs/plugin-basic-ssl";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import { VitePWA } from "vite-plugin-pwa";
// Detect if running in a container
function isContainer() {
    return existsSync("/.dockerenv") || process.env.container !== undefined;
}
// Get Tailscale hostnames (short like "c-5002" and full like "c-5002.squeaker-teeth.ts.net")
function getTailscaleHostnames() {
    var _a;
    try {
        var output = execSync("tailscale status --json", {
            encoding: "utf-8",
            stdio: ["pipe", "pipe", "pipe"],
        });
        var status_1 = JSON.parse(output);
        var dnsName = (_a = status_1.Self) === null || _a === void 0 ? void 0 : _a.DNSName;
        if (!dnsName)
            return [];
        // DNSName is like "c-5002.squeaker-teeth.ts.net."
        var fullName = dnsName.replace(/\.$/, ""); // Remove trailing dot
        var shortName = fullName.split(".")[0];
        return [shortName, fullName];
    }
    catch (_b) {
        return [];
    }
}
// Configure dev server host based on environment
var inContainer = isContainer();
var tailscaleHosts = getTailscaleHostnames();
var devHost = inContainer && tailscaleHosts.length > 0 ? "0.0.0.0" : "localhost";
var devPort = Number(process.env.PORT) || 3000;
// Enable HTTPS for Tailscale (some browser APIs require secure context)
var useSsl = inContainer && tailscaleHosts.length > 0;
// Plugin to print Tailscale URL after server starts (with correct port)
function tailscaleUrlPlugin() {
    return {
        name: "tailscale-url",
        configureServer: function (server) {
            if (!useSsl || tailscaleHosts.length === 0)
                return;
            var httpServer = server.httpServer;
            httpServer === null || httpServer === void 0 ? void 0 : httpServer.once("listening", function () {
                var address = httpServer === null || httpServer === void 0 ? void 0 : httpServer.address();
                var actualPort = typeof address === "object" && address ? address.port : devPort;
                console.log("\n\uD83D\uDD17 Tailscale detected in container");
                console.log("   Access via: https://".concat(tailscaleHosts[1], ":").concat(actualPort, "\n"));
            });
        },
    };
}
export default defineConfig({
    plugins: __spreadArray(__spreadArray([
        react()
    ], (useSsl ? [basicSsl(), tailscaleUrlPlugin()] : []), true), [
        VitePWA({
            registerType: "autoUpdate",
            includeAssets: ["favicon.ico", "icons/*.png", "icons/*.svg"],
            manifest: {
                name: "Gym Timer",
                short_name: "Gym Timer",
                description: "Interval training timer and stopwatch for your workouts",
                theme_color: "#0D0D0D",
                background_color: "#0D0D0D",
                display: "standalone",
                orientation: "portrait",
                icons: [
                    {
                        src: "icons/icon-192.png",
                        sizes: "192x192",
                        type: "image/png",
                    },
                    {
                        src: "icons/icon-512.png",
                        sizes: "512x512",
                        type: "image/png",
                    },
                    {
                        src: "icons/icon-512.png",
                        sizes: "512x512",
                        type: "image/png",
                        purpose: "any maskable",
                    },
                ],
            },
            workbox: {
                globPatterns: ["**/*.{js,css,html,ico,png,svg,woff2}"],
            },
        }),
    ], false),
    server: {
        port: devPort,
        open: true,
        host: devHost,
        // Allow Tailscale hostnames (both short "c-5002" and full "c-5002.squeaker-teeth.ts.net")
        allowedHosts: tailscaleHosts.length > 0 ? tailscaleHosts : undefined,
    },
    build: {
        outDir: "dist",
        sourcemap: true,
    },
    test: {
        globals: true,
        environment: "jsdom",
        setupFiles: "./src/test/setup.ts",
        include: ["src/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}"],
        deps: {
            // Inline pwa-utils to handle ESM module resolution
            inline: ["@anthropic/pwa-utils"],
        },
    },
});
