import styles from "./Header.module.css";

interface HeaderProps {
	profileName: string;
	totalTime: string;
	onSettingsClick: () => void;
	onResetClick: () => void;
}

export function Header({ profileName, totalTime, onSettingsClick, onResetClick }: HeaderProps) {
	return (
		<header className={styles.header}>
			<button className={styles.headerBtn} onClick={onSettingsClick} aria-label="Settings">
				<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
					<circle cx="12" cy="12" r="3" />
					<path d="M12 1v4m0 14v4M4.22 4.22l2.83 2.83m9.9 9.9l2.83 2.83M1 12h4m14 0h4M4.22 19.78l2.83-2.83m9.9-9.9l2.83-2.83" />
				</svg>
			</button>
			<div className={styles.headerCenter}>
				<div className={styles.profileName}>{profileName}</div>
				<div className={styles.totalTime}>{totalTime}</div>
			</div>
			<button className={styles.headerBtn} onClick={onResetClick} aria-label="Reset">
				<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
					<path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
					<path d="M3 3v5h5" />
				</svg>
			</button>
		</header>
	);
}
