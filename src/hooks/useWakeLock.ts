import { useCallback, useEffect, useRef } from "react";

export function useWakeLock() {
	const wakeLockRef = useRef<WakeLockSentinel | null>(null);

	const requestWakeLock = useCallback(async () => {
		if (!("wakeLock" in navigator)) {
			console.log("Wake Lock API not supported");
			return;
		}

		// Release existing lock before requesting new one (prevents leaks on rapid calls)
		if (wakeLockRef.current) {
			try {
				await wakeLockRef.current.release();
			} catch {
				// Ignore release errors
			}
			wakeLockRef.current = null;
		}

		try {
			const wakeLock = await navigator.wakeLock.request("screen");
			wakeLockRef.current = wakeLock;
			console.log("Wake Lock acquired");

			// Use a named handler to avoid listener accumulation
			const handleRelease = () => {
				console.log("Wake Lock released");
				// Clean up ref when released externally
				if (wakeLockRef.current === wakeLock) {
					wakeLockRef.current = null;
				}
			};
			wakeLock.addEventListener("release", handleRelease, { once: true });
		} catch (err) {
			console.log("Wake Lock request failed:", err);
		}
	}, []);

	const releaseWakeLock = useCallback(async () => {
		if (wakeLockRef.current) {
			try {
				await wakeLockRef.current.release();
			} catch {
				// Ignore release errors
			}
			wakeLockRef.current = null;
		}
	}, []);

	// Request wake lock on mount
	useEffect(() => {
		requestWakeLock();

		// Re-acquire wake lock when page becomes visible again
		const handleVisibilityChange = () => {
			if (document.visibilityState === "visible") {
				requestWakeLock();
			}
		};

		document.addEventListener("visibilitychange", handleVisibilityChange);

		return () => {
			releaseWakeLock();
			document.removeEventListener("visibilitychange", handleVisibilityChange);
		};
	}, [requestWakeLock, releaseWakeLock]);

	return { requestWakeLock, releaseWakeLock };
}
