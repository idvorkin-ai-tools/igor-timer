/**
 * Global AudioContext Service with iOS Safari Auto-Unlock
 *
 * Provides a reliable way to play Web Audio on all platforms, including iOS Safari
 * which has strict requirements around AudioContext initialization and user gestures.
 *
 * Best Practices Implemented:
 * - Single shared AudioContext (Safari limits to 4 max)
 * - Auto-unlock on first user gesture
 * - Handles suspended/interrupted/closed states
 * - Destroys and recreates context on resume failure (iOS recovery)
 * - Records audio events to session recorder for debugging
 *
 * Usage:
 *   import { audioService } from './services/audioService';
 *   audioService.playBeep(440, 0.2);  // Play 440Hz for 200ms
 *
 * @see https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API/Best_practices
 * @see https://www.mattmontag.com/web/unlock-web-audio-in-safari-for-ios-and-macos
 */

import { sessionRecorder } from "./pwaDebugServices";

type AudioContextState = "suspended" | "running" | "closed" | "interrupted";

// Audio event types for session recording
type AudioEventType =
	| "audio:played"
	| "audio:play_skipped"
	| "audio:play_error"
	| "audio:resuming"
	| "audio:resumed"
	| "audio:resume_failed"
	| "audio:context_created"
	| "audio:context_closed"
	| "audio:test_requested"
	| "audio:test_played"
	| "audio:test_failed"
	| "audio:silent_warmup";

// Timeout for resume() calls - iOS Safari can hang indefinitely
const RESUME_TIMEOUT_MS = 3000;

// Helper to record audio events to session recorder
function recordAudioEvent(type: AudioEventType, details?: Record<string, unknown>): void {
	sessionRecorder.recordStateChange({
		type,
		timestamp: Date.now(),
		details,
	});
}

/**
 * Wrap a promise with a timeout - rejects if promise doesn't resolve in time
 */
function withTimeout<T>(promise: Promise<T>, ms: number, errorMsg: string): Promise<T> {
	return Promise.race([
		promise,
		new Promise<T>((_, reject) =>
			setTimeout(() => reject(new Error(errorMsg)), ms)
		),
	]);
}

/**
 * Play a silent buffer to "warm up" the AudioContext on iOS Safari
 * iOS requires actual audio playback (not just resume()) to unlock the context
 */
function playSilentBuffer(ctx: AudioContext): void {
	try {
		const buffer = ctx.createBuffer(1, 1, 22050);
		const source = ctx.createBufferSource();
		source.buffer = buffer;
		source.connect(ctx.destination);
		source.start(0);
		recordAudioEvent("audio:silent_warmup", { state: ctx.state });
	} catch (error) {
		recordAudioEvent("audio:silent_warmup", {
			state: ctx.state,
			error: error instanceof Error ? error.message : String(error)
		});
	}
}

// Convenience functions for common audio events
export function recordAudioPlayed(frequency: number, state: string): void {
	recordAudioEvent("audio:played", { frequency, state });
}

export function recordAudioPlaySkipped(reason: string, state: string): void {
	recordAudioEvent("audio:play_skipped", { reason, state });
}

export function recordAudioResuming(fromState: string): void {
	recordAudioEvent("audio:resuming", { fromState });
}

export function recordAudioResumed(newState: string): void {
	recordAudioEvent("audio:resumed", { newState });
}

export function recordAudioResumeFailed(error: string, fromState: string): void {
	recordAudioEvent("audio:resume_failed", { error, fromState });
}

export function recordAudioError(error: string, frequency?: number): void {
	recordAudioEvent("audio:play_error", { error, frequency });
}

class AudioService {
	private context: AudioContext | null = null;
	private unlockPromise: Promise<boolean> | null = null;
	private unlockListenersAttached = false;
	private visibilityListenerAttached = false;
	private resumeInProgress = false;
	private audioUnlocked = false;

	/**
	 * Get or create the global AudioContext
	 */
	private getContext(): AudioContext {
		if (!this.context || this.context.state === "closed") {
			const AudioContextClass =
				window.AudioContext ||
				(window as unknown as { webkitAudioContext: typeof AudioContext })
					.webkitAudioContext;
			this.context = new AudioContextClass();
			recordAudioEvent("audio:context_created", { state: this.context.state });

			this.setupUnlockListeners();
			this.setupVisibilityListener();
			this.setupStateChangeListener();
		}
		return this.context;
	}

	/**
	 * Destroy context so it can be recreated fresh
	 * Called on ANY resume failure - iOS contexts get stuck and won't recover
	 */
	private destroyContext(): void {
		if (this.context) {
			recordAudioEvent("audio:context_closed", { reason: "destroyed_for_recovery" });
			try {
				this.context.close();
			} catch {
				// Ignore close errors
			}
			this.context = null;
			this.unlockPromise = null;
			this.resumeInProgress = false;
			this.audioUnlocked = false; // Reset so statechange listener doesn't auto-resume new context
		}
	}

	/**
	 * Core resume logic - DRY helper used by all resume paths
	 * Returns true if context is now running, false otherwise
	 */
	private attemptResume(trigger: string): Promise<boolean> {
		const ctx = this.context;
		if (!ctx) return Promise.resolve(false);

		const state = ctx.state as AudioContextState;

		// Already running
		if (state === "running") {
			return Promise.resolve(true);
		}

		// If another resume is in progress, wait for it
		if (this.unlockPromise) {
			return this.unlockPromise;
		}

		// Only resume from suspended/interrupted states
		if (state !== "suspended" && state !== "interrupted") {
			return Promise.resolve(false);
		}

		// Create promise that other callers can wait on
		this.resumeInProgress = true;
		recordAudioEvent("audio:resuming", { trigger, fromState: state });
		playSilentBuffer(ctx);

		this.unlockPromise = withTimeout(ctx.resume(), RESUME_TIMEOUT_MS, `Resume timeout (${trigger})`)
			.then(() => {
				this.audioUnlocked = true;
				recordAudioResumed(ctx.state);
				return ctx.state === "running";
			})
			.catch((error) => {
				const errorMsg = error instanceof Error ? error.message : String(error);
				recordAudioResumeFailed(errorMsg, state);
				// Context is stuck - destroy it so next attempt gets a fresh one
				this.destroyContext();
				return false;
			})
			.finally(() => {
				this.resumeInProgress = false;
				this.unlockPromise = null;
			});

		return this.unlockPromise;
	}

	/**
	 * Listen for AudioContext state changes (pattern from Howler.js PR #1770)
	 */
	private setupStateChangeListener(): void {
		if (!this.context?.addEventListener) return;

		this.context.addEventListener("statechange", () => {
			if (!this.context || this.context.state === "running" || !this.audioUnlocked) {
				return;
			}
			this.attemptResume("statechange");
		});
	}

	/**
	 * Resume audio when user returns to tab
	 */
	private setupVisibilityListener(): void {
		if (this.visibilityListenerAttached) return;
		this.visibilityListenerAttached = true;

		document.addEventListener("visibilitychange", () => {
			if (document.visibilityState === "visible" && this.context) {
				this.attemptResume("visibility");
			}
		});
	}

	/**
	 * Unlock audio on ANY user gesture
	 */
	private setupUnlockListeners(): void {
		if (this.unlockListenersAttached) return;
		this.unlockListenersAttached = true;

		const events = ["touchstart", "touchend", "mousedown", "keydown", "click"];
		events.forEach((event) =>
			document.body.addEventListener(event, () => this.attemptResume("gesture"), { passive: true }),
		);
	}

	/**
	 * Ensure AudioContext is running before playing audio
	 */
	async ensureRunning(): Promise<AudioContext> {
		const ctx = this.getContext();

		if (ctx.state === "running") {
			return ctx;
		}

		await this.attemptResume("ensureRunning");
		return this.getContext();
	}

	/**
	 * Play a beep sound
	 */
	playBeep(
		frequency = 880,
		duration = 0.15,
		type: OscillatorType = "sine",
		volume = 0.7,
	): void {
		const ctx = this.getContext();
		const state = ctx.state as AudioContextState;

		if (state === "running") {
			this.doPlayBeep(ctx, frequency, duration, type, volume);
			return;
		}

		if (state === "suspended" || state === "interrupted") {
			if (this.resumeInProgress) {
				recordAudioPlaySkipped("resume_in_progress", state);
				return;
			}
			this.attemptResume("playBeep").then((success) => {
				if (success && this.context?.state === "running") {
					this.doPlayBeep(this.context, frequency, duration, type, volume);
				}
			});
			return;
		}

		recordAudioPlaySkipped("unexpected_state", ctx.state);
	}

	/**
	 * Actually play the beep
	 */
	private doPlayBeep(
		ctx: AudioContext,
		frequency: number,
		duration: number,
		type: OscillatorType,
		volume: number,
	): void {
		if (ctx.state !== "running") {
			recordAudioPlaySkipped("not_running", ctx.state);
			return;
		}

		try {
			const oscillator = ctx.createOscillator();
			const gainNode = ctx.createGain();
			oscillator.connect(gainNode);
			gainNode.connect(ctx.destination);
			oscillator.frequency.value = frequency;
			oscillator.type = type;
			gainNode.gain.setValueAtTime(volume, ctx.currentTime);
			gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + duration);
			oscillator.start(ctx.currentTime);
			oscillator.stop(ctx.currentTime + duration);
			recordAudioPlayed(frequency, ctx.state);
		} catch (error) {
			const errorMsg = error instanceof Error ? error.message : String(error);
			recordAudioError(errorMsg, frequency);
			this.destroyContext();
		}
	}

	/**
	 * Prime the audio context on app startup
	 */
	prime(): void {
		this.getContext();
	}

	/**
	 * Test sound - plays a beep and returns diagnostic info
	 */
	async testSound(): Promise<{ state: string; played: boolean; error?: string }> {
		const ctx = this.getContext();
		const initialState = ctx.state;

		recordAudioEvent("audio:test_requested", {
			initialState,
			contextExists: !!this.context,
			resumeInProgress: this.resumeInProgress,
		});

		try {
			const success = await this.attemptResume("testSound");

			if (success && this.context?.state === "running") {
				this.doPlayBeep(this.context, 440, 0.3, "sine", 0.8);
				recordAudioEvent("audio:test_played", { state: this.context.state });
				return { state: this.context.state, played: true };
			}

			const finalState = this.context?.state ?? "destroyed";
			recordAudioEvent("audio:test_failed", { reason: "not_running", state: finalState });
			return { state: finalState, played: false, error: `Context state: ${finalState}` };
		} catch (error) {
			const errorMsg = error instanceof Error ? error.message : String(error);
			recordAudioEvent("audio:test_failed", { error: errorMsg, initialState });
			return { state: initialState, played: false, error: errorMsg };
		}
	}

	/**
	 * Get current state for diagnostics
	 */
	getState(): { contextExists: boolean; state: string | null; unlockListenersAttached: boolean } {
		return {
			contextExists: !!this.context,
			state: this.context?.state ?? null,
			unlockListenersAttached: this.unlockListenersAttached,
		};
	}
}

export const audioService = new AudioService();
