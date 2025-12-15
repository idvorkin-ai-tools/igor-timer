/**
 * AudioService Tests
 *
 * Tests for the global AudioContext service that handles iOS Safari audio unlock.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// Mock AudioContext
class MockAudioContext {
	state: "suspended" | "running" | "closed" = "suspended";
	currentTime = 0;
	destination = {};
	private listeners: Map<string, Function[]> = new Map();

	resume = vi.fn().mockImplementation(() => {
		this.state = "running";
		return Promise.resolve();
	});

	close = vi.fn().mockImplementation(() => {
		this.state = "closed";
		return Promise.resolve();
	});

	addEventListener = vi.fn().mockImplementation((event: string, handler: Function) => {
		if (!this.listeners.has(event)) {
			this.listeners.set(event, []);
		}
		this.listeners.get(event)!.push(handler);
	});

	createOscillator = vi.fn().mockReturnValue({
		connect: vi.fn(),
		frequency: { value: 0 },
		type: "sine",
		start: vi.fn(),
		stop: vi.fn(),
	});

	createGain = vi.fn().mockReturnValue({
		connect: vi.fn(),
		gain: {
			setValueAtTime: vi.fn(),
			exponentialRampToValueAtTime: vi.fn(),
		},
	});

	// For silent buffer warmup
	createBuffer = vi.fn().mockReturnValue({});
	createBufferSource = vi.fn().mockReturnValue({
		buffer: null,
		connect: vi.fn(),
		start: vi.fn(),
	});
}

// Store original
const originalAudioContext = globalThis.AudioContext;

describe("AudioService", () => {
	let mockAudioContext: MockAudioContext;

	beforeEach(() => {
		mockAudioContext = new MockAudioContext();
		// @ts-expect-error - mocking global
		globalThis.AudioContext = vi.fn(() => mockAudioContext);
		// Reset module to get fresh instance
		vi.resetModules();
	});

	afterEach(() => {
		globalThis.AudioContext = originalAudioContext;
		vi.restoreAllMocks();
	});

	describe("getState", () => {
		it("should return null state before any audio call", async () => {
			const { audioService } = await import("./audioService");
			const state = audioService.getState();
			// Context created lazily, so initially null
			expect(state.contextExists).toBe(false);
			expect(state.state).toBe(null);
		});

		it("should return context state after prime()", async () => {
			const { audioService } = await import("./audioService");
			audioService.prime();
			const state = audioService.getState();
			expect(state.contextExists).toBe(true);
			expect(state.state).toBe("suspended");
		});
	});

	describe("playBeep", () => {
		it("should call resume when context is suspended", async () => {
			const { audioService } = await import("./audioService");
			audioService.playBeep(440, 0.1);

			expect(mockAudioContext.resume).toHaveBeenCalled();
		});

		it("should create oscillator and gain nodes when context is running", async () => {
			mockAudioContext.state = "running";
			const { audioService } = await import("./audioService");
			audioService.playBeep(440, 0.1);

			expect(mockAudioContext.createOscillator).toHaveBeenCalled();
			expect(mockAudioContext.createGain).toHaveBeenCalled();
		});

		it("should use provided frequency and duration", async () => {
			mockAudioContext.state = "running";
			const { audioService } = await import("./audioService");
			audioService.playBeep(880, 0.2, "square", 0.5);

			const oscillator = mockAudioContext.createOscillator.mock.results[0].value;
			expect(oscillator.frequency.value).toBe(880);
			expect(oscillator.type).toBe("square");
		});
	});

	describe("testSound", () => {
		it("should return state information", async () => {
			const { audioService } = await import("./audioService");
			const result = await audioService.testSound();

			expect(result).toHaveProperty("state");
			expect(result).toHaveProperty("played");
		});

		it("should play immediately when context is running", async () => {
			mockAudioContext.state = "running";
			const { audioService } = await import("./audioService");
			const result = await audioService.testSound();

			expect(result.played).toBe(true);
			expect(mockAudioContext.createOscillator).toHaveBeenCalled();
		});

		it("should resume and play when context is suspended", async () => {
			const { audioService } = await import("./audioService");
			const result = await audioService.testSound();

			expect(result.played).toBe(true);
			expect(mockAudioContext.resume).toHaveBeenCalled();
		});
	});

	describe("ensureRunning", () => {
		it("should return immediately if context is running", async () => {
			mockAudioContext.state = "running";
			const { audioService } = await import("./audioService");
			const ctx = await audioService.ensureRunning();

			expect(ctx).toBeDefined();
			expect(mockAudioContext.resume).not.toHaveBeenCalled();
		});

		it("should call resume if context is suspended", async () => {
			const { audioService } = await import("./audioService");
			await audioService.ensureRunning();

			expect(mockAudioContext.resume).toHaveBeenCalled();
		});

		it("should timeout if resume hangs forever", async () => {
			// Make resume hang forever
			mockAudioContext.resume = vi.fn().mockImplementation(() => new Promise(() => {}));

			const { audioService } = await import("./audioService");

			// Use fake timers to test timeout
			vi.useFakeTimers();
			const promise = audioService.ensureRunning();

			// Fast-forward past the timeout
			await vi.advanceTimersByTimeAsync(4000);

			// Should resolve (not hang) even though resume never resolved
			const ctx = await promise;
			expect(ctx).toBeDefined();

			vi.useRealTimers();
		});

		it("should reuse existing unlock promise if called multiple times", async () => {
			const { audioService } = await import("./audioService");

			// Call twice simultaneously
			const promise1 = audioService.ensureRunning();
			const promise2 = audioService.ensureRunning();

			await Promise.all([promise1, promise2]);

			// Should only call resume once
			expect(mockAudioContext.resume).toHaveBeenCalledTimes(1);
		});
	});

	describe("testSound timeout", () => {
		it("should timeout and destroy context if resume hangs", async () => {
			// Make resume hang forever
			mockAudioContext.resume = vi.fn().mockImplementation(() => new Promise(() => {}));

			const { audioService } = await import("./audioService");

			vi.useFakeTimers();
			const promise = audioService.testSound();

			// Fast-forward past timeout
			await vi.advanceTimersByTimeAsync(4000);

			const result = await promise;
			expect(result.played).toBe(false);
			// Context gets destroyed after timeout, so it reports destroyed state
			expect(result.error).toContain("destroyed");

			vi.useRealTimers();
		});
	});

	describe("visibility listener", () => {
		it("should set up visibility change listener on context creation", async () => {
			const addEventListenerSpy = vi.spyOn(document, "addEventListener");

			const { audioService } = await import("./audioService");
			audioService.prime(); // Create context

			expect(addEventListenerSpy).toHaveBeenCalledWith(
				"visibilitychange",
				expect.any(Function)
			);
		});
	});

	describe("gesture listeners", () => {
		it("should set up gesture listeners on context creation", async () => {
			const addEventListenerSpy = vi.spyOn(document.body, "addEventListener");

			const { audioService } = await import("./audioService");
			audioService.prime();

			// Should listen for touch, mouse, and keyboard events
			const eventTypes = addEventListenerSpy.mock.calls.map(call => call[0]);
			expect(eventTypes).toContain("touchstart");
			expect(eventTypes).toContain("click");
			expect(eventTypes).toContain("keydown");
		});
	});
});
