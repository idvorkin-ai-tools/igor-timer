import { AboutSection } from "./AboutSection";
import styles from "./SettingsModal.module.css";

interface AppSettingsModalProps {
	isOpen: boolean;
	onClose: () => void;
}

export function AppSettingsModal({ isOpen, onClose }: AppSettingsModalProps) {
	if (!isOpen) return null;

	const handleOverlayClick = (e: React.MouseEvent) => {
		if (e.target === e.currentTarget) {
			onClose();
		}
	};

	return (
		<div className={styles.modalOverlay} onClick={handleOverlayClick}>
			<div className={styles.modal}>
				<div className={styles.modalHeader}>
					<h2 className={styles.modalTitle}>SETTINGS</h2>
					<button className={styles.modalClose} onClick={onClose}>
						&times;
					</button>
				</div>
				<div className={styles.modalBody}>
					<AboutSection />
				</div>
			</div>
		</div>
	);
}
