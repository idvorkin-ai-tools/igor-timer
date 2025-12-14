import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useTimer, type TimerProfile } from "./useTimer";

const defaultProfile: TimerProfile = {
	name: "Test",
	workTime: 3,
	restTime: 2,
	rounds: 2,
	cycles: 1,
	prepTime: 2,
};

describe("useTimer", () => {
	beforeEach(() => {
		vi.useFakeTimers();
	});

	afterEach(() => {
		vi.useRealTimers();
	});

	it("should initialize with idle state", () => {
		const { result } = renderHook(() => useTimer(defaultProfile));

		expect(result.current.state.isRunning).toBe(false);
		expect(result.current.state.isPaused).toBe(false);
		expect(result.current.state.phase).toBe("idle");
		expect(result.current.state.currentRound).toBe(1);
		expect(result.current.state.totalRounds).toBe(2);
	});

	it("should calculate total time correctly", () => {
		const { result } = renderHook(() => useTimer(defaultProfile));

		// (workTime + restTime) * rounds * cycles + prepTime
		// (3 + 2) * 2 * 1 + 2 = 12
		expect(result.current.calculateTotalTime()).toBe(12);
	});

	it("should start timer and enter prep phase", () => {
		const { result } = renderHook(() => useTimer(defaultProfile));

		act(() => {
			result.current.start();
		});

		expect(result.current.state.isRunning).toBe(true);
		expect(result.current.state.phase).toBe("prep");
		expect(result.current.state.timeLeft).toBe(2);
	});

	it("should transition from prep to work after prep time", () => {
		const { result } = renderHook(() => useTimer(defaultProfile));

		act(() => {
			result.current.start();
		});

		expect(result.current.state.phase).toBe("prep");
		expect(result.current.state.timeLeft).toBe(2);

		// Advance through prep (2 seconds)
		act(() => {
			vi.advanceTimersByTime(1000);
		});
		expect(result.current.state.timeLeft).toBe(1);

		act(() => {
			vi.advanceTimersByTime(1000);
		});

		expect(result.current.state.phase).toBe("work");
		expect(result.current.state.timeLeft).toBe(3);
		expect(result.current.state.currentRound).toBe(1);
	});

	it("should transition from work to rest", () => {
		const { result } = renderHook(() => useTimer(defaultProfile));

		act(() => {
			result.current.start();
		});

		// Skip prep (2s) + work (3s) = 5s
		act(() => {
			vi.advanceTimersByTime(2000); // End of prep
		});
		expect(result.current.state.phase).toBe("work");

		act(() => {
			vi.advanceTimersByTime(3000); // End of work
		});

		expect(result.current.state.phase).toBe("rest");
		expect(result.current.state.timeLeft).toBe(2);
		expect(result.current.state.currentRound).toBe(1); // Still round 1
	});

	it("should transition from rest to work and increment round", () => {
		const { result } = renderHook(() => useTimer(defaultProfile));

		act(() => {
			result.current.start();
		});

		// Skip prep (2s) + work (3s) + rest (2s) = 7s
		act(() => {
			vi.advanceTimersByTime(2000); // End of prep
		});
		act(() => {
			vi.advanceTimersByTime(3000); // End of work round 1
		});
		act(() => {
			vi.advanceTimersByTime(2000); // End of rest
		});

		expect(result.current.state.phase).toBe("work");
		expect(result.current.state.currentRound).toBe(2);
		expect(result.current.state.timeLeft).toBe(3);
	});

	it("should complete workout after all rounds", () => {
		const { result } = renderHook(() => useTimer(defaultProfile));

		act(() => {
			result.current.start();
		});

		// Full workout: prep(2) + work(3) + rest(2) + work(3) = 10s
		// But last round has no rest, so: prep(2) + work(3) + rest(2) + work(3) = 10s
		act(() => {
			vi.advanceTimersByTime(2000); // End of prep -> work
		});
		act(() => {
			vi.advanceTimersByTime(3000); // End of work 1 -> rest
		});
		act(() => {
			vi.advanceTimersByTime(2000); // End of rest -> work 2
		});
		act(() => {
			vi.advanceTimersByTime(3000); // End of work 2 -> done
		});

		expect(result.current.state.phase).toBe("done");
		expect(result.current.state.isRunning).toBe(false);
	});

	it("should pause and resume timer", () => {
		const { result } = renderHook(() => useTimer(defaultProfile));

		act(() => {
			result.current.start();
		});

		act(() => {
			vi.advanceTimersByTime(1000);
		});

		expect(result.current.state.timeLeft).toBe(1);

		act(() => {
			result.current.pause();
		});

		expect(result.current.state.isRunning).toBe(false);
		expect(result.current.state.isPaused).toBe(true);

		// Timer should not advance while paused
		act(() => {
			vi.advanceTimersByTime(2000);
		});
		expect(result.current.state.timeLeft).toBe(1);

		act(() => {
			result.current.start();
		});

		expect(result.current.state.isRunning).toBe(true);
		expect(result.current.state.isPaused).toBe(false);
		expect(result.current.state.timeLeft).toBe(1); // Still 1 from before
	});

	it("should reset timer to initial state", () => {
		const { result } = renderHook(() => useTimer(defaultProfile));

		act(() => {
			result.current.start();
		});

		act(() => {
			vi.advanceTimersByTime(3000);
		});

		act(() => {
			result.current.reset();
		});

		expect(result.current.state.isRunning).toBe(false);
		expect(result.current.state.isPaused).toBe(false);
		expect(result.current.state.phase).toBe("idle");
		expect(result.current.state.currentRound).toBe(1);
		expect(result.current.state.timeLeft).toBe(0);
	});

	it("should toggle between start and pause", () => {
		const { result } = renderHook(() => useTimer(defaultProfile));

		act(() => {
			result.current.toggle();
		});

		expect(result.current.state.isRunning).toBe(true);

		act(() => {
			result.current.toggle();
		});

		expect(result.current.state.isRunning).toBe(false);
		expect(result.current.state.isPaused).toBe(true);
	});
});
