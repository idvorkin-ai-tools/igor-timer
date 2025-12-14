/**
 * Context for sharing bug reporter state across components
 */

import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import {
	bugReporter,
	openBugReportWithSession,
	sessionRecorder,
	shakeDetector,
} from "../services/pwaDebugServices";

export interface BugReportMetadata {
	device: string;
	screen: string;
	browser: string;
	version: string;
	sessionDuration: string;
	interactions: number;
	errors: number;
}

interface BugReporterContextType {
	shakeEnabled: boolean;
	setShakeEnabled: (enabled: boolean) => void;
	isShakeSupported: boolean;
	requestShakePermission: () => Promise<boolean>;
	submitBugReport: (title?: string, description?: string) => Promise<void>;
	showDialog: () => void;
	showBugDialog: boolean;
	dismissBugDialog: () => void;
	getMetadata: () => BugReportMetadata;
}

const BugReporterContext = createContext<BugReporterContextType | null>(null);

export function BugReporterProvider({ children }: { children: ReactNode }) {
	const [shakeEnabled, setShakeEnabledState] = useState(bugReporter.shakeEnabled);
	const [showBugDialog, setShowBugDialog] = useState(false);
	const [shakeState, setShakeState] = useState(shakeDetector.getState());

	// Sync shake detector with bug reporter preference
	useEffect(() => {
		shakeDetector.setEnabled(shakeEnabled);
	}, [shakeEnabled]);

	// Listen for shake events
	useEffect(() => {
		const unsubscribe = shakeDetector.onShake(() => {
			if (shakeEnabled) {
				setShowBugDialog(true);
			}
		});

		const unsubscribeState = shakeDetector.onStateChange(setShakeState);

		return () => {
			unsubscribe();
			unsubscribeState();
		};
	}, [shakeEnabled]);

	const setShakeEnabled = useCallback((enabled: boolean) => {
		bugReporter.shakeEnabled = enabled;
		setShakeEnabledState(enabled);
	}, []);

	const requestShakePermission = useCallback(async () => {
		const granted = await shakeDetector.requestPermission();
		if (granted) {
			setShakeState(shakeDetector.getState());
		}
		return granted;
	}, []);

	const submitBugReport = useCallback(
		async (title = "Bug Report", description = "") => {
			setShowBugDialog(false);
			await openBugReportWithSession(title, description);
		},
		[],
	);

	const showDialog = useCallback(() => {
		setShowBugDialog(true);
	}, []);

	const dismissBugDialog = useCallback(() => {
		setShowBugDialog(false);
	}, []);

	const getMetadata = useCallback((): BugReportMetadata => {
		const meta = bugReporter.getMetadata();
		const stats = sessionRecorder.getStats();
		const versionInfo = bugReporter.getVersionInfo();

		const durationSec = Math.round(stats.duration / 1000);
		const durationMin = Math.floor(durationSec / 60);
		const durationStr = durationMin > 0
			? `${durationMin}m ${durationSec % 60}s`
			: `${durationSec}s`;

		return {
			device: String(meta.platform || "Unknown"),
			screen: `${meta.screenWidth}×${meta.screenHeight}`,
			browser: extractBrowser(String(meta.userAgent || "")),
			version: versionInfo?.shaShort || "dev",
			sessionDuration: durationStr,
			interactions: stats.interactions,
			errors: stats.errors,
		};
	}, []);

	return (
		<BugReporterContext.Provider
			value={{
				shakeEnabled,
				setShakeEnabled,
				isShakeSupported: shakeState.isSupported,
				requestShakePermission,
				submitBugReport,
				showDialog,
				showBugDialog,
				dismissBugDialog,
				getMetadata,
			}}
		>
			{children}
		</BugReporterContext.Provider>
	);
}

export function useBugReporter(): BugReporterContextType {
	const context = useContext(BugReporterContext);
	if (!context) {
		throw new Error("useBugReporter must be used within BugReporterProvider");
	}
	return context;
}

function extractBrowser(userAgent: string): string {
	if (userAgent.includes("Edg")) return "Edge"; // Modern Edge uses "Edg"
	if (userAgent.includes("Chrome")) return "Chrome";
	if (userAgent.includes("Firefox")) return "Firefox";
	if (userAgent.includes("Safari")) return "Safari";
	return "Unknown";
}
