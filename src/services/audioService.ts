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
 * - Self-cleaning event listeners after unlock
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
	| "audio:test_failed";

// Helper to record audio events to session recorder
function recordAudioEvent(type: AudioEventType, details?: Record<string, unknown>): void {
	sessionRecorder.recordStateChange({
		type,
		timestamp: Date.now(),
		details,
	});
}

// Convenience functions for common audio events (like swing-analyzer pattern)
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
	private unlockPromise: Promise<void> | null = null;
	private unlockListenersAttached = false;

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

			// Set up auto-unlock listeners on creation
			this.setupUnlockListeners();
		}
		return this.context;
	}

	/**
	 * Set up event listeners to unlock audio on first user gesture
	 * Listeners remove themselves after successful unlock
	 */
	private setupUnlockListeners(): void {
		if (this.unlockListenersAttached) return;
		this.unlockListenersAttached = true;

		const events = ["touchstart", "touchend", "mousedown", "keydown", "click"];

		const attemptUnlock = async () => {
			const ctx = this.context;
			if (!ctx) return;

			const state = ctx.state as AudioContextState;
			if (state === "running") {
				cleanup();
				return;
			}

			if (state === "suspended" || state === "interrupted") {
				try {
					await ctx.resume();
					if (ctx.state === "running") {
						cleanup();
					}
				} catch (error) {
					console.warn("AudioContext unlock attempt failed:", error);
				}
			}
		};

		const cleanup = () => {
			events.forEach((event) =>
				document.body.removeEventListener(event, attemptUnlock),
			);
			this.unlockListenersAttached = false;
		};

		events.forEach((event) =>
			document.body.addEventListener(event, attemptUnlock, { passive: true }),
		);
	}

	/**
	 * Ensure AudioContext is running before playing audio
	 * Safe to call multiple times - will reuse existing unlock promise
	 */
	async ensureRunning(): Promise<AudioContext> {
		const ctx = this.getContext();
		const state = ctx.state as AudioContextState;

		if (state === "running") {
			return ctx;
		}

		// Handle suspended or interrupted states
		if (state === "suspended" || state === "interrupted") {
			// Reuse existing unlock promise if one is in progress
			if (!this.unlockPromise) {
				this.unlockPromise = ctx.resume().finally(() => {
					this.unlockPromise = null;
				});
			}

			try {
				await this.unlockPromise;
			} catch (error) {
				console.warn("AudioContext resume failed:", error);
			}
		}

		return ctx;
	}

	/**
	 * Play a beep sound with the given parameters
	 * Handles all unlock logic internally
	 */
	playBeep(
		frequency = 880,
		duration = 0.15,
		type: OscillatorType = "sine",
		volume = 0.7,
	): void {
		const ctx = this.getContext();
		const state = ctx.state as AudioContextState;

		// If context needs resuming, await it before playing
		// This is critical - resume() is async and we must wait for it
		if (state === "suspended" || state === "interrupted") {
			recordAudioResuming(state);
			ctx.resume()
				.then(() => {
					recordAudioResumed(ctx.state);
					this.doPlayBeep(ctx, frequency, duration, type, volume);
				})
				.catch((error) => {
					const errorMsg = error instanceof Error ? error.message : String(error);
					recordAudioResumeFailed(errorMsg, state);
				});
			return;
		}

		// Context already running - play immediately
		if (ctx.state === "running") {
			this.doPlayBeep(ctx, frequency, duration, type, volume);
		} else {
			// Unexpected state - not suspended, not running
			recordAudioPlaySkipped("unexpected_state", ctx.state);
		}
	}

	/**
	 * Internal method to actually play the beep
	 */
	private doPlayBeep(
		ctx: AudioContext,
		frequency: number,
		duration: number,
		type: OscillatorType,
		volume: number,
	): void {
		// Double-check context is still valid and running
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
			gainNode.gain.exponentialRampToValueAtTime(
				0.01,
				ctx.currentTime + duration,
			);
			oscillator.start(ctx.currentTime);
			oscillator.stop(ctx.currentTime + duration);
			recordAudioPlayed(frequency, ctx.state);
		} catch (error) {
			const errorMsg = error instanceof Error ? error.message : String(error);
			recordAudioError(errorMsg, frequency);
			// If playback fails, destroy context so it gets recreated
			if (this.context) {
				try {
					this.context.close();
				} catch {
					// Ignore close errors
				}
				this.context = null;
			}
		}
	}

	/**
	 * Prime the audio context - call on app startup or first user interaction
	 * This ensures the context exists and unlock listeners are attached
	 */
	prime(): void {
		this.getContext();
	}

	/**
	 * Test sound - plays a recognizable beep and logs diagnostic info
	 * Useful for debugging audio issues on iOS
	 * Returns a promise that resolves when the sound has been played (or failed)
	 */
	async testSound(): Promise<{ state: string; played: boolean; error?: string }> {
		const ctx = this.getContext();
		const initialState = ctx.state;

		recordAudioEvent("audio:test_requested", {
			initialState,
			contextExists: !!this.context,
		});

		try {
			// Resume if needed and wait for it
			if (ctx.state !== "running") {
				recordAudioResuming(ctx.state);
				await ctx.resume();
				recordAudioResumed(ctx.state);
			}

			// Now try to play
			if (ctx.state === "running") {
				this.doPlayBeep(ctx, 440, 0.3, "sine", 0.8); // A4 note, 300ms
				recordAudioEvent("audio:test_played", { state: ctx.state });
				return { state: ctx.state, played: true };
			}

			recordAudioEvent("audio:test_failed", {
				reason: "not_running_after_resume",
				state: ctx.state
			});
			return { state: ctx.state, played: false, error: `Context state: ${ctx.state}` };
		} catch (error) {
			const errorMsg = error instanceof Error ? error.message : String(error);
			recordAudioEvent("audio:test_failed", {
				error: errorMsg,
				initialState
			});
			return { state: initialState, played: false, error: errorMsg };
		}
	}

	/**
	 * Get current audio context state for diagnostics
	 */
	getState(): { contextExists: boolean; state: string | null; unlockListenersAttached: boolean } {
		return {
			contextExists: !!this.context,
			state: this.context?.state ?? null,
			unlockListenersAttached: this.unlockListenersAttached,
		};
	}
}

// Export singleton instance
export const audioService = new AudioService();
