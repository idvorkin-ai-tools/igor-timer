import type { Phase } from "../hooks/useTimer";
import styles from "./TimerDisplay.module.css";

interface TimerDisplayProps {
	phase: Phase;
	mainTime: string;
	previewTime: string;
	previewLabel: string;
}

export function TimerDisplay({ phase, mainTime, previewTime, previewLabel }: TimerDisplayProps) {
	const isResting = phase === "rest";
	// Only show label during active phases (prep, work, rest, done), not idle
	const phaseLabel = phase === "prep" ? "GET READY" : phase === "done" ? "DONE!" : phase === "idle" ? "" : phase.toUpperCase();

	return (
		<main className={styles.timerDisplay}>
			<div className={`${styles.workSection} ${isResting ? styles.resting : ""}`}>
				{phaseLabel && <div className={styles.phaseLabel}>{phaseLabel}</div>}
				<div className={styles.mainTime}>{mainTime}</div>
			</div>
			<div className={`${styles.restPreview} ${isResting ? styles.working : ""}`}>
				<div className={styles.restPreviewLabel}>{previewLabel}</div>
				<div className={styles.restPreviewTime}>{previewTime}</div>
			</div>
		</main>
	);
}
