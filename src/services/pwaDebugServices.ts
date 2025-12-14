/**
 * PWA Debug Services Integration
 *
 * Initializes pwa-utils services: SessionRecorder, BugReporter, VersionCheck
 */

import {
	BugReporterService,
	ShakeDetector,
} from "@idvorkin/pwa-utils/bug-reporter";
import { SessionRecorder } from "@idvorkin/pwa-utils/session-recorder";
import { VersionCheckService } from "@idvorkin/pwa-utils/version-check";
import {
	BUILD_TIMESTAMP,
	GIT_BRANCH,
	GIT_COMMIT_URL,
	GIT_CURRENT_URL,
	GIT_SHA,
} from "../generated_version";

// Repository for bug reports
const GITHUB_REPO = "idvorkin/igor-timer";

// Version info for bug reports
const versionInfo = {
	sha: GIT_SHA,
	shaShort: GIT_SHA.substring(0, 7),
	commitUrl: GIT_COMMIT_URL,
	currentUrl: GIT_CURRENT_URL,
	branch: GIT_BRANCH,
	buildTimestamp: BUILD_TIMESTAMP,
};

// Initialize Session Recorder
export const sessionRecorder = new SessionRecorder({
	buildInfo: {
		version: versionInfo.shaShort,
		commit: GIT_SHA,
		time: BUILD_TIMESTAMP,
	},
});
sessionRecorder.start();

// Initialize Bug Reporter Service
export const bugReporter = new BugReporterService({
	repository: GITHUB_REPO,
	versionInfo,
	labels: ["bug", "user-reported"],
});

// Initialize Shake Detector
export const shakeDetector = new ShakeDetector({
	threshold: 25,
	cooldownMs: 2000,
	enabled: bugReporter.shakeEnabled,
});

// Initialize Version Check Service
export const versionChecker = new VersionCheckService({
	checkIntervalMs: 30 * 60 * 1000, // 30 minutes
});

// Helper to open bug report with session data
export async function openBugReportWithSession(
	title: string,
	description: string,
): Promise<void> {
	const stats = sessionRecorder.getStats();

	const enhancedDescription = `${description}

---
**Session Info:**
- Duration: ${Math.round(stats.duration / 1000)}s
- Interactions: ${stats.interactions}
- Errors logged: ${stats.errors}`;

	await bugReporter.submitReport({
		title,
		description: enhancedDescription,
		includeMetadata: true,
	});
}
