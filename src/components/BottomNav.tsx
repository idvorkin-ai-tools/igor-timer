import styles from "./BottomNav.module.css";

export type Mode = "rounds" | "stopwatch";

interface BottomNavProps {
	activeMode: Mode;
	onModeChange: (mode: Mode) => void;
}

export function BottomNav({ activeMode, onModeChange }: BottomNavProps) {
	return (
		<nav className={styles.bottomNav}>
			<button
				className={`${styles.navItem} ${activeMode === "rounds" ? styles.active : ""}`}
				onClick={() => onModeChange("rounds")}
			>
				<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
					<circle cx="12" cy="12" r="10" />
					<path d="M12 6v6" />
				</svg>
				<span>ROUNDS</span>
			</button>
			<button
				className={`${styles.navItem} ${activeMode === "stopwatch" ? styles.active : ""}`}
				onClick={() => onModeChange("stopwatch")}
			>
				<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
					<circle cx="12" cy="13" r="8" />
					<path d="M12 9v4l2 2" />
					<path d="M9 2h6" />
					<path d="M12 2v2" />
				</svg>
				<span>STOPWATCH</span>
			</button>
		</nav>
	);
}
