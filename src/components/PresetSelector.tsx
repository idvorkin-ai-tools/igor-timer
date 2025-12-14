import styles from "./PresetSelector.module.css";

export interface Preset {
	id: string;
	name: string;
	workTime: number;
	restTime: number;
	rounds: number;
}

interface PresetSelectorProps {
	presets: Preset[];
	activePreset: string;
	onSelect: (presetId: string) => void;
}

export function PresetSelector({ presets, activePreset, onSelect }: PresetSelectorProps) {
	return (
		<div className={styles.presetBubbles}>
			{presets.map((preset) => (
				<button
					key={preset.id}
					className={`${styles.presetBtn} ${activePreset === preset.id ? styles.active : ""}`}
					onClick={() => onSelect(preset.id)}
				>
					{preset.name}
				</button>
			))}
		</div>
	);
}
