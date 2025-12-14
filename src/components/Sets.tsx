import { useSets } from "../hooks/useSets";
import styles from "./Sets.module.css";

interface TallyMarkProps {
	index: number;
	isStrike: boolean;
}

function TallyMark({ index, isStrike }: TallyMarkProps) {
	// Create slight variations for scratchy hand-drawn look
	const seed = index * 17;
	const rotation = isStrike ? -25 + (seed % 10) - 5 : -5 + (seed % 10);
	const offsetX = (seed % 7) - 3;
	const offsetY = (seed % 5) - 2;

	// Scratchy path with slight wobble
	const wobble1 = ((seed * 3) % 6) - 3;
	const wobble2 = ((seed * 7) % 6) - 3;

	if (isStrike) {
		// Diagonal strike-through line
		return (
			<svg
				className={styles.strikeThrough}
				viewBox="0 0 120 80"
				style={{
					transform: `rotate(${rotation}deg)`,
				}}
			>
				<path
					d={`M 5,${40 + wobble1}
						Q 30,${35 + wobble2} 60,${42 + wobble1}
						T 115,${40 + wobble2}`}
					stroke="currentColor"
					strokeWidth="4"
					strokeLinecap="round"
					fill="none"
					className={styles.scratchyLine}
				/>
				{/* Extra scratch marks for texture */}
				<path
					d={`M 10,${42 + wobble2} Q 35,${38} 55,${44}`}
					stroke="currentColor"
					strokeWidth="2"
					strokeLinecap="round"
					fill="none"
					opacity="0.4"
				/>
			</svg>
		);
	}

	// Vertical tally mark
	return (
		<svg
			className={styles.tallyMark}
			viewBox="0 0 20 80"
			style={{
				transform: `rotate(${rotation}deg) translate(${offsetX}px, ${offsetY}px)`,
			}}
		>
			<path
				d={`M ${10 + wobble1},5
					Q ${8 + wobble2},25 ${11 + wobble1},40
					T ${10 + wobble2},75`}
				stroke="currentColor"
				strokeWidth="4"
				strokeLinecap="round"
				fill="none"
				className={styles.scratchyLine}
			/>
			{/* Extra scratch for texture */}
			<path
				d={`M ${9},10 Q ${11},30 ${9},50`}
				stroke="currentColor"
				strokeWidth="1.5"
				strokeLinecap="round"
				fill="none"
				opacity="0.3"
			/>
		</svg>
	);
}

interface TallyGroupProps {
	count: number;
	groupIndex: number;
}

function TallyGroup({ count, groupIndex }: TallyGroupProps) {
	const marks = [];
	const hasStrike = count === 5;

	// Render vertical marks (up to 4)
	for (let i = 0; i < Math.min(count, 4); i++) {
		marks.push(
			<TallyMark key={i} index={groupIndex * 5 + i} isStrike={false} />
		);
	}

	return (
		<div className={styles.tallyGroup}>
			<div className={styles.verticalMarks}>{marks}</div>
			{hasStrike && (
				<TallyMark index={groupIndex * 5 + 4} isStrike={true} />
			)}
		</div>
	);
}

export function Sets() {
	const { state, increment, undo, reset } = useSets(10);
	const { count, maxCount } = state;

	// Split count into groups of 5
	const fullGroups = Math.floor(count / 5);
	const remainder = count % 5;

	const groups = [];
	for (let i = 0; i < fullGroups; i++) {
		groups.push(<TallyGroup key={i} count={5} groupIndex={i} />);
	}
	if (remainder > 0) {
		groups.push(<TallyGroup key={fullGroups} count={remainder} groupIndex={fullGroups} />);
	}

	const isMaxed = count >= maxCount;

	return (
		<>
			<div className={styles.setsDisplay}>
				<div className={styles.countNumber}>{count}</div>
				<div
					className={styles.tallyContainer}
					onClick={!isMaxed ? increment : undefined}
					role="button"
					tabIndex={0}
					onKeyDown={(e) => {
						if (e.code === "Space" || e.code === "Enter") {
							if (!isMaxed) increment();
						}
					}}
				>
					{count === 0 ? (
						<div className={styles.placeholder}>TAP TO COUNT</div>
					) : (
						<div className={styles.tallyMarks}>{groups}</div>
					)}
				</div>
				{isMaxed && (
					<div className={styles.maxedOut}>MAX REACHED!</div>
				)}
			</div>

			<section className={styles.controlsSection}>
				<div className={styles.controlsRow}>
					<button
						className={styles.controlBtn}
						onClick={undo}
						disabled={count === 0}
					>
						UNDO
					</button>
					<button
						className={`${styles.controlBtn} ${styles.addBtn}`}
						onClick={increment}
						disabled={isMaxed}
					>
						+1
					</button>
					<button
						className={`${styles.controlBtn} ${styles.resetBtn}`}
						onClick={reset}
						disabled={count === 0}
					>
						RESET
					</button>
				</div>
			</section>
		</>
	);
}
