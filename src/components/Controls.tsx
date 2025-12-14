import styles from "./Controls.module.css";

interface ControlsProps {
	currentRound: number;
	totalRounds: number;
	isRunning: boolean;
	isPaused: boolean;
	onToggle: () => void;
}

export function Controls({ currentRound, totalRounds, isRunning, isPaused, onToggle }: ControlsProps) {
	const buttonLabel = isRunning ? "STOP" : isPaused ? "RESUME" : "START";

	return (
		<section className={styles.controlsSection}>
			<div className={styles.statsRow}>
				<div className={styles.stat}>
					<div className={`${styles.statValue} ${styles.blue}`}>{currentRound}</div>
					<div className={styles.statLabel}>ROUND</div>
				</div>
				<div className={styles.centerControl}>
					<button className={styles.playBtn} onClick={onToggle} aria-label={buttonLabel}>
						{isRunning ? (
							<div className={styles.stopIcon} />
						) : (
							<svg className={styles.playIcon} viewBox="0 0 24 24">
								<polygon points="5,3 19,12 5,21" />
							</svg>
						)}
					</button>
					<div className={styles.btnLabel}>{buttonLabel}</div>
				</div>
				<div className={styles.stat}>
					<div className={`${styles.statValue} ${styles.yellow}`}>{totalRounds}</div>
					<div className={styles.statLabel}>OF</div>
				</div>
			</div>
		</section>
	);
}
