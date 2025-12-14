import styles from "./GlobalHeader.module.css";

interface GlobalHeaderProps {
	onSettingsClick: () => void;
}

export function GlobalHeader({ onSettingsClick }: GlobalHeaderProps) {
	return (
		<header className={styles.header}>
			<div className={styles.spacer} />
			<div className={styles.title}>IGOR TIMER</div>
			<button className={styles.settingsBtn} onClick={onSettingsClick} aria-label="Settings">
				<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
					<circle cx="12" cy="12" r="3" />
					<path d="M12 1v4m0 14v4M4.22 4.22l2.83 2.83m9.9 9.9l2.83 2.83M1 12h4m14 0h4M4.22 19.78l2.83-2.83m9.9-9.9l2.83-2.83" />
				</svg>
			</button>
		</header>
	);
}
