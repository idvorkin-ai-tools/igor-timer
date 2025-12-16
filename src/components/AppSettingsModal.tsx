import { useEffect, useRef, useState } from "react";
import { useBugReporter } from "../contexts/BugReporterContext";
import { audioService } from "../services/audioService";
import { sessionName, sessionRecorder } from "../services/pwaDebugServices";
import { AboutSection } from "./AboutSection";
import styles from "./SettingsModal.module.css";

interface AppSettingsModalProps {
	isOpen: boolean;
	onClose: () => void;
}

export function AppSettingsModal({ isOpen, onClose }: AppSettingsModalProps) {
	const {
		shakeEnabled,
		setShakeEnabled,
		isShakeSupported,
		requestShakePermission,
		showDialog,
	} = useBugReporter();
	const [audioTestStatus, setAudioTestStatus] = useState<"idle" | "testing" | "success" | "failed">("idle");
	const audioTestTimeoutRef = useRef<ReturnType<typeof setTimeout>>();

	// Clean up timeout on unmount
	useEffect(() => {
		return () => {
			if (audioTestTimeoutRef.current) {
				clearTimeout(audioTestTimeoutRef.current);
			}
		};
	}, []);

	// Handle Escape key to close modal
	useEffect(() => {
		if (!isOpen) return;
		const handleEscape = (e: KeyboardEvent) => {
			if (e.key === "Escape") onClose();
		};
		document.addEventListener("keydown", handleEscape);
		return () => document.removeEventListener("keydown", handleEscape);
	}, [isOpen, onClose]);

	if (!isOpen) return null;

	const handleOverlayClick = (e: React.MouseEvent) => {
		if (e.target === e.currentTarget) {
			onClose();
		}
	};

	const handleShakeToggle = async () => {
		if (!shakeEnabled) {
			// Request permission when enabling
			const granted = await requestShakePermission();
			if (granted) {
				setShakeEnabled(true);
			}
		} else {
			setShakeEnabled(false);
		}
	};

	return (
		<div className={styles.modalOverlay} onClick={handleOverlayClick}>
			<div className={styles.modal}>
				<div className={styles.modalHeader}>
					<h2 className={styles.modalTitle}>SETTINGS</h2>
					<button type="button" className={styles.modalClose} onClick={onClose} aria-label="Close">
						&times;
					</button>
				</div>
				<div className={styles.modalBody}>
					{/* Bug Report Section */}
					<div className={styles.section}>
						<h3 className={styles.sectionTitle}>Bug Reporting</h3>

						{isShakeSupported && (
							<div className={styles.settingRow}>
								<span className={styles.settingLabel}>Shake to report bug</span>
								<button
									type="button"
									className={`${styles.toggle} ${shakeEnabled ? styles.toggleOn : ""}`}
									onClick={handleShakeToggle}
								>
									{shakeEnabled ? "ON" : "OFF"}
								</button>
							</div>
						)}

						<button
							type="button"
							className={styles.reportBtn}
							onClick={() => {
								onClose();
								showDialog();
							}}
						>
							Report a Bug
						</button>

					</div>

					{/* Debug Section */}
					<div className={styles.section}>
						<h3 className={styles.sectionTitle}>Debug</h3>

						<div className={styles.settingRow}>
							<span className={styles.settingLabel}>
								Audio: {audioService.getState().state ?? "not initialized"}
								{audioTestStatus === "success" && " ✓"}
								{audioTestStatus === "failed" && " ✗"}
							</span>
							<button
								type="button"
								className={`${styles.toggle} ${audioTestStatus === "success" ? styles.toggleOn : ""}`}
								disabled={audioTestStatus === "testing"}
								onClick={async () => {
									setAudioTestStatus("testing");
									const result = await audioService.testSound();
									setAudioTestStatus(result.played ? "success" : "failed");
									// Reset after 2 seconds (clear any pending timeout first)
									if (audioTestTimeoutRef.current) {
										clearTimeout(audioTestTimeoutRef.current);
									}
									audioTestTimeoutRef.current = setTimeout(() => setAudioTestStatus("idle"), 2000);
								}}
							>
								{audioTestStatus === "testing" ? "..." : "Test"}
							</button>
						</div>

						<button
							type="button"
							className={styles.reportBtn}
							onClick={() => {
								let url: string | undefined;
								try {
									const blob = sessionRecorder.getRecordingAsBlob();
									url = URL.createObjectURL(blob);
									const a = document.createElement("a");
									a.href = url;
									a.download = `${sessionName}.json`;
									a.click();
								} catch (error) {
									console.error("Failed to download session recording:", error);
								} finally {
									if (url) URL.revokeObjectURL(url);
								}
							}}
						>
							Download Session Recording
						</button>
					</div>

					<AboutSection />
				</div>
			</div>
		</div>
	);
}
