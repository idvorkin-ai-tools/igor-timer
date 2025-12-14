import { useCallback, useEffect, useRef } from "react";

export function useWakeLock() {
	const wakeLockRef = useRef<WakeLockSentinel | null>(null);

	const requestWakeLock = useCallback(async () => {
		if (!("wakeLock" in navigator)) {
			console.log("Wake Lock API not supported");
			return;
		}

		try {
			wakeLockRef.current = await navigator.wakeLock.request("screen");
			console.log("Wake Lock acquired");

			wakeLockRef.current.addEventListener("release", () => {
				console.log("Wake Lock released");
			});
		} catch (err) {
			console.log("Wake Lock request failed:", err);
		}
	}, []);

	const releaseWakeLock = useCallback(async () => {
		if (wakeLockRef.current) {
			await wakeLockRef.current.release();
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
