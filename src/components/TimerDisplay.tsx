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
	const phaseLabel = phase === "prep" ? "GET READY" : phase === "done" ? "DONE!" : phase === "idle" ? "WORK" : phase.toUpperCase();

	return (
		<main className={styles.timerDisplay}>
			<div className={`${styles.workSection} ${isResting ? styles.resting : ""}`}>
				<div className={styles.phaseLabel}>{phaseLabel}</div>
				<div className={styles.mainTime}>{mainTime}</div>
			</div>
			<div className={`${styles.restPreview} ${isResting ? styles.working : ""}`}>
				<div className={styles.restPreviewLabel}>{previewLabel}</div>
				<div className={styles.restPreviewTime}>{previewTime}</div>
			</div>
		</main>
	);
}
