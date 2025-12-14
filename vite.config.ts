/// <reference types="vitest" />
import { execSync } from "node:child_process";
import { existsSync } from "node:fs";
import basicSsl from "@vitejs/plugin-basic-ssl";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import { VitePWA } from "vite-plugin-pwa";

// Detect if running in a container
function isContainer(): boolean {
	return existsSync("/.dockerenv") || process.env.container !== undefined;
}

// Get Tailscale hostnames (short like "c-5002" and full like "c-5002.squeaker-teeth.ts.net")
function getTailscaleHostnames(): string[] {
	try {
		const output = execSync("tailscale status --json", {
			encoding: "utf-8",
			stdio: ["pipe", "pipe", "pipe"],
		});
		const status = JSON.parse(output);
		const dnsName = status.Self?.DNSName;
		if (!dnsName) return [];

		// DNSName is like "c-5002.squeaker-teeth.ts.net."
		const fullName = dnsName.replace(/\.$/, ""); // Remove trailing dot
		const shortName = fullName.split(".")[0];
		return [shortName, fullName];
	} catch {
		return [];
	}
}

// Configure dev server host based on environment
const inContainer = isContainer();
const tailscaleHosts = getTailscaleHostnames();
const devHost = inContainer && tailscaleHosts.length > 0 ? "0.0.0.0" : "localhost";
const devPort = Number(process.env.PORT) || 3000;

// Enable HTTPS for Tailscale (some browser APIs require secure context)
const useSsl = inContainer && tailscaleHosts.length > 0;

// Plugin to print Tailscale URL after server starts (with correct port)
function tailscaleUrlPlugin() {
	return {
		name: "tailscale-url",
		configureServer(server: { httpServer: unknown }) {
			if (!useSsl || tailscaleHosts.length === 0) return;

			const httpServer = server.httpServer as {
				once: (event: string, cb: () => void) => void;
				address: () => { port: number } | string | null;
			} | null;

			httpServer?.once("listening", () => {
				const address = httpServer?.address();
				const actualPort = typeof address === "object" && address ? address.port : devPort;
				console.log(`\n🔗 Tailscale detected in container`);
				console.log(`   Access via: https://${tailscaleHosts[1]}:${actualPort}\n`);
			});
		},
	};
}

export default defineConfig({
	plugins: [
		react(),
		...(useSsl ? [basicSsl(), tailscaleUrlPlugin()] : []),
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
	],
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
	},
});
