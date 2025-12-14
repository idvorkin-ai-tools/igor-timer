/**
 * Hook for checking PWA version updates
 */

import { useCallback, useEffect, useState } from "react";
import { versionChecker } from "../services/pwaDebugServices";

interface VersionCheckState {
	/** Whether an update is available */
	updateAvailable: boolean;
	/** Whether currently checking for updates */
	isChecking: boolean;
	/** Last time updates were checked */
	lastCheckTime: Date | null;
}

interface UseVersionCheckReturn extends VersionCheckState {
	/** Manually check for updates */
	checkForUpdate: () => Promise<void>;
	/** Apply the update (reloads page) */
	applyUpdate: () => void;
	/** Dismiss the update notification */
	dismissUpdate: () => void;
}

export function useVersionCheck(): UseVersionCheckReturn {
	const [state, setState] = useState<VersionCheckState>(() => {
		const s = versionChecker.getState();
		return {
			updateAvailable: s.updateAvailable,
			isChecking: s.isChecking,
			lastCheckTime: s.lastCheckTime,
		};
	});
	const [dismissed, setDismissed] = useState(false);

	useEffect(() => {
		const unsubscribe = versionChecker.onStateChange((s) => {
			setState({
				updateAvailable: s.updateAvailable,
				isChecking: s.isChecking,
				lastCheckTime: s.lastCheckTime,
			});
			// Reset dismissed when new update available
			if (s.updateAvailable) {
				setDismissed(false);
			}
		});

		// Check on mount
		versionChecker.checkForUpdate();

		return unsubscribe;
	}, []);

	const checkForUpdate = useCallback(async () => {
		await versionChecker.checkForUpdate();
	}, []);

	const applyUpdate = useCallback(() => {
		versionChecker.applyUpdate();
	}, []);

	const dismissUpdate = useCallback(() => {
		setDismissed(true);
	}, []);

	return {
		updateAvailable: state.updateAvailable && !dismissed,
		isChecking: state.isChecking,
		lastCheckTime: state.lastCheckTime,
		checkForUpdate,
		applyUpdate,
		dismissUpdate,
	};
}
