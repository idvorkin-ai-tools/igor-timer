import { useCallback, useState } from "react";

export interface SetsState {
	count: number;
	maxCount: number;
}

export function useSets(maxCount = 10) {
	const [count, setCount] = useState(0);

	const increment = useCallback(() => {
		setCount((prev) => Math.min(prev + 1, maxCount));
	}, [maxCount]);

	const undo = useCallback(() => {
		setCount((prev) => Math.max(prev - 1, 0));
	}, []);

	const reset = useCallback(() => {
		setCount(0);
	}, []);

	return {
		state: { count, maxCount },
		increment,
		undo,
		reset,
	};
}
