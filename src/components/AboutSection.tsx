import { useVersionCheck } from "../hooks/useVersionCheck";
import { formatTimestamp, getBuildInfo, getGitHubLinks } from "../services/githubService";
import styles from "./AboutSection.module.css";

function formatRelativeTime(date: Date | null): string {
	if (!date) return "Never";
	const now = new Date();
	const diffMs = now.getTime() - date.getTime();
	const diffSec = Math.floor(diffMs / 1000);
	const diffMin = Math.floor(diffSec / 60);
	const diffHour = Math.floor(diffMin / 60);

	if (diffSec < 10) return "Just now";
	if (diffSec < 60) return `${diffSec}s ago`;
	if (diffMin < 60) return `${diffMin}m ago`;
	if (diffHour < 24) return `${diffHour}h ago`;
	return date.toLocaleDateString();
}

export function AboutSection() {
	const buildInfo = getBuildInfo();
	const links = getGitHubLinks();
	const isDev = buildInfo.sha === "development";
	const { lastCheckTime, isChecking, checkForUpdate, updateAvailable } = useVersionCheck();

	return (
		<div className={styles.aboutSection}>
			<div className={styles.aboutHeader}>
				<h3 className={styles.aboutTitle}>Igor Timer</h3>
				<p className={styles.aboutTagline}>Interval training, stopwatch & rep counter</p>
			</div>

			<div className={styles.aboutInfo}>
				<div className={styles.infoRow}>
					<span className={styles.infoLabel}>Build</span>
					<span className={styles.infoValue}>
						{isDev ? (
							<span className={styles.devBadge}>dev</span>
						) : (
							<a
								href={buildInfo.commitUrl}
								target="_blank"
								rel="noopener noreferrer"
								className={styles.link}
							>
								{buildInfo.sha.slice(0, 7)}
							</a>
						)}
					</span>
				</div>

				<div className={styles.infoRow}>
					<span className={styles.infoLabel}>Branch</span>
					<span className={styles.infoValue}>{buildInfo.branch}</span>
				</div>

				{buildInfo.timestamp && (
					<div className={styles.infoRow}>
						<span className={styles.infoLabel}>Built</span>
						<span className={styles.infoValue}>
							{formatTimestamp(buildInfo.timestamp)}
						</span>
					</div>
				)}

				<div className={styles.infoRow}>
					<span className={styles.infoLabel}>Last Checked</span>
					<span className={styles.infoValue}>
						{formatRelativeTime(lastCheckTime)}
						{updateAvailable && <span className={styles.updateBadge}>Update!</span>}
					</span>
				</div>
			</div>

			<button
				type="button"
				className={styles.checkUpdateBtn}
				onClick={checkForUpdate}
				disabled={isChecking}
			>
				{isChecking ? "Checking..." : "Check for Updates"}
			</button>

			<div className={styles.buttonRow}>
				<a
					href={links.repo}
					target="_blank"
					rel="noopener noreferrer"
					className={styles.githubButton}
				>
					<svg viewBox="0 0 24 24" fill="currentColor" className={styles.githubIcon}>
						<path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
					</svg>
					GitHub
				</a>

				<a
					href={links.newIssue}
					target="_blank"
					rel="noopener noreferrer"
					className={`${styles.githubButton} ${styles.bugButton}`}
				>
					<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={styles.githubIcon}>
						<circle cx="12" cy="12" r="10" />
						<path d="M12 8v4M12 16h.01" />
					</svg>
					Report Bug
				</a>
			</div>
		</div>
	);
}
