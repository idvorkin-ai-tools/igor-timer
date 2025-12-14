import { useEffect, useState } from "react";
import type { TimerProfile } from "../hooks/useTimer";
import styles from "./SettingsModal.module.css";

interface TimerSettingsModalProps {
	isOpen: boolean;
	profile: TimerProfile;
	onClose: () => void;
	onSave: (profile: TimerProfile) => void;
}

export function TimerSettingsModal({ isOpen, profile, onClose, onSave }: TimerSettingsModalProps) {
	const [workTime, setWorkTime] = useState(profile.workTime);
	const [restTime, setRestTime] = useState(profile.restTime);
	const [rounds, setRounds] = useState(profile.rounds);
	const [cycles, setCycles] = useState(profile.cycles);
	const [prepTime, setPrepTime] = useState(profile.prepTime);

	// Sync state when profile changes (e.g., preset selection)
	useEffect(() => {
		setWorkTime(profile.workTime);
		setRestTime(profile.restTime);
		setRounds(profile.rounds);
		setCycles(profile.cycles);
		setPrepTime(profile.prepTime);
	}, [profile]);

	if (!isOpen) return null;

	const handleSave = () => {
		onSave({
			...profile,
			workTime,
			restTime,
			rounds,
			cycles,
			prepTime,
		});
		onClose();
	};

	const handleOverlayClick = (e: React.MouseEvent) => {
		if (e.target === e.currentTarget) {
			onClose();
		}
	};

	return (
		<div className={styles.modalOverlay} onClick={handleOverlayClick}>
			<div className={styles.modal}>
				<div className={styles.modalHeader}>
					<h2 className={styles.modalTitle}>TIMER SETTINGS</h2>
					<button className={styles.modalClose} onClick={onClose}>
						&times;
					</button>
				</div>
				<div className={styles.modalBody}>
					<div className={styles.settingGroup}>
						<label className={styles.settingLabel}>WORK TIME (seconds)</label>
						<div className={styles.settingInput}>
							<input
								type="number"
								value={workTime}
								onChange={(e) => setWorkTime(Number(e.target.value))}
								min="1"
								max="600"
							/>
						</div>
					</div>
					<div className={styles.settingGroup}>
						<label className={styles.settingLabel}>REST TIME (seconds)</label>
						<div className={styles.settingInput}>
							<input
								type="number"
								value={restTime}
								onChange={(e) => setRestTime(Number(e.target.value))}
								min="1"
								max="600"
							/>
						</div>
					</div>
					<div className={styles.settingGroup}>
						<label className={styles.settingLabel}>ROUNDS</label>
						<div className={styles.settingInput}>
							<input
								type="number"
								value={rounds}
								onChange={(e) => setRounds(Number(e.target.value))}
								min="1"
								max="50"
							/>
						</div>
					</div>
					<div className={styles.settingGroup}>
						<label className={styles.settingLabel}>CYCLES</label>
						<div className={styles.settingInput}>
							<input
								type="number"
								value={cycles}
								onChange={(e) => setCycles(Number(e.target.value))}
								min="1"
								max="10"
							/>
						</div>
					</div>
					<div className={styles.settingGroup}>
						<label className={styles.settingLabel}>PREP TIME (seconds)</label>
						<div className={styles.settingInput}>
							<input
								type="number"
								value={prepTime}
								onChange={(e) => setPrepTime(Number(e.target.value))}
								min="0"
								max="60"
							/>
						</div>
					</div>
					<button className={styles.modalSave} onClick={handleSave}>
						SAVE SETTINGS
					</button>
				</div>
			</div>
		</div>
	);
}
