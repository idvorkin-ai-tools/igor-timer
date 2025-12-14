import fs from "node:fs";
import sharp from "sharp";

const svgPath = "public/icons/icon.svg";
const outputDir = "public/icons";

async function generateIcons() {
	if (!fs.existsSync(svgPath)) {
		console.error(`SVG file not found: ${svgPath}`);
		process.exit(1);
	}

	const svg = fs.readFileSync(svgPath);

	try {
		await Promise.all([
			sharp(svg).resize(192, 192).png().toFile(`${outputDir}/icon-192.png`),
			sharp(svg).resize(512, 512).png().toFile(`${outputDir}/icon-512.png`),
		]);
		console.log("Icons generated successfully:");
		console.log("  - icon-192.png");
		console.log("  - icon-512.png");
	} catch (err) {
		console.error("Error generating icons:", err);
		process.exit(1);
	}
}

generateIcons();
