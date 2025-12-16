/**
 * AudioService - iOS-Safe Web Audio Playback
 *
 * A singleton service that handles Web Audio API playback with full iOS Safari support.
 * iOS Safari has strict requirements that make audio playback tricky:
 *
 * 1. AudioContext must be created/resumed within a user gesture
 * 2. Safari limits pages to 4 AudioContext instances
 * 3. Context can be "interrupted" by phone calls, Siri, tab switches
 * 4. resume() can hang indefinitely (requires timeout)
 * 5. Sometimes resume() times out and context becomes unrecoverable
 *
 * Solution: Single shared context with aggressive recovery. On ANY resume failure,
 * destroy the context entirely. Next user gesture creates a fresh one.
 *
 * @example
 * // Simple beep
 * audioService.playBeep(440, 0.2);
 *
 * // Ensure running before timer starts (call in click handler)
 * await audioService.ensureRunning();
 *
 * @see https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API/Best_practices
 * @see https://webkit.org/blog/6784/new-video-policies-for-ios/
 */

import { sessionRecorder } from "./pwaDebugServices";

// ============================================================================
// Types
// ============================================================================

/** AudioContext states including iOS-specific "interrupted" */
type ContextState = "suspended" | "running" | "closed" | "interrupted";

/** Events recorded to session for debugging audio issues */
type AudioEventType =
	| "audio:context_created"
	| "audio:context_destroyed"
	| "audio:resuming"
	| "audio:resumed"
	| "audio:resume_failed"
	| "audio:silent_warmup"
	| "audio:played"
	| "audio:play_skipped"
	| "audio:play_error"
	| "audio:test_requested"
	| "audio:test_success"
	| "audio:test_failed";

// ============================================================================
// Constants
// ============================================================================

/** Timeout for resume() - iOS Safari can hang indefinitely */
const RESUME_TIMEOUT_MS = 3000;

/** Events that indicate a user gesture (for iOS unlock) */
const USER_GESTURE_EVENTS = ["touchstart", "touchend", "mousedown", "keydown", "click"] as const;

// ============================================================================
// Helpers
// ============================================================================

/** Record audio event to session recorder for debugging */
function recordEvent(type: AudioEventType, details?: Record<string, unknown>): void {
	sessionRecorder.recordStateChange({ type, timestamp: Date.now(), details });
}

/** Extract error message from unknown error */
function getErrorMessage(error: unknown): string {
	return error instanceof Error ? error.message : String(error);
}

/**
 * Race a promise against a timeout. Cleans up timer on success.
 */
function withTimeout<T>(promise: Promise<T>, ms: number, timeoutMsg: string): Promise<T> {
	let timeoutId: ReturnType<typeof setTimeout>;

	const timeoutPromise = new Promise<never>((_, reject) => {
		timeoutId = setTimeout(() => reject(new Error(timeoutMsg)), ms);
	});

	return Promise.race([promise, timeoutPromise]).finally(() => clearTimeout(timeoutId));
}

/**
 * Play silent buffer to "warm up" iOS Safari AudioContext.
 * iOS sometimes requires actual playback (not just resume()) to unlock.
 * Pattern used by Howler.js and other audio libraries.
 */
function playSilentWarmup(ctx: AudioContext): void {
	try {
		const buffer = ctx.createBuffer(1, 1, 22050);
		const source = ctx.createBufferSource();
		source.buffer = buffer;
		source.connect(ctx.destination);
		source.start(0);
		recordEvent("audio:silent_warmup", { state: ctx.state });
	} catch (error) {
		// Best-effort - don't fail if warmup fails
		recordEvent("audio:silent_warmup", { state: ctx.state, error: getErrorMessage(error) });
	}
}

// ============================================================================
// AudioService Class
// ============================================================================

class AudioService {
	/** The shared AudioContext instance */
	private context: AudioContext | null = null;

	/** Promise for in-progress resume operation (allows coalescing parallel calls) */
	private resumePromise: Promise<boolean> | null = null;

	/** Whether listeners have been attached (they persist across context recreation) */
	private listenersAttached = false;

	/** Whether we've ever successfully unlocked (for statechange auto-recovery) */
	private hasUnlockedBefore = false;

	// ==========================================================================
	// Context Lifecycle
	// ==========================================================================

	/**
	 * Get or create the AudioContext.
	 * Lazily creates context on first access and sets up unlock listeners.
	 */
	private getContext(): AudioContext {
		if (!this.context || this.context.state === "closed") {
			const AudioContextClass =
				window.AudioContext ||
				(window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;

			this.context = new AudioContextClass();
			recordEvent("audio:context_created", { state: this.context.state });

			this.setupListeners();
			// Re-attach statechange listener for this new context instance
			this.setupStateChangeListener();
		}
		return this.context;
	}

	/**
	 * Destroy context for recovery. Called on ANY resume failure.
	 *
	 * iOS Safari contexts can get stuck in states where resume() times out
	 * but the context isn't technically "closed". Destroying and recreating
	 * is the only reliable recovery path.
	 */
	private destroyContext(): void {
		if (!this.context) return;

		recordEvent("audio:context_destroyed", {
			previousState: this.context.state,
			hadUnlocked: this.hasUnlockedBefore,
		});

		try {
			this.context.close();
		} catch {
			// Ignore close errors
		}

		this.context = null;
		this.resumePromise = null;
		this.hasUnlockedBefore = false;
	}

	// ==========================================================================
	// Resume Logic
	// ==========================================================================

	/**
	 * Attempt to resume the AudioContext.
	 *
	 * This is the core method - all resume paths go through here.
	 * Handles: coalescing parallel calls, timeout, silent warmup, error recovery.
	 *
	 * @param trigger - What triggered this resume (for logging)
	 * @returns Promise<boolean> - true if context is now running
	 */
	private attemptResume(trigger: string): Promise<boolean> {
		const ctx = this.context;
		if (!ctx) return Promise.resolve(false);

		const state = ctx.state as ContextState;

		// Already running - success
		if (state === "running") {
			return Promise.resolve(true);
		}

		// Resume already in progress - wait for it (coalesce parallel calls)
		if (this.resumePromise) {
			return this.resumePromise;
		}

		// Can only resume from suspended/interrupted
		if (state !== "suspended" && state !== "interrupted") {
			return Promise.resolve(false);
		}

		// Start resume operation
		recordEvent("audio:resuming", { trigger, fromState: state });
		playSilentWarmup(ctx);

		this.resumePromise = withTimeout(
			ctx.resume(),
			RESUME_TIMEOUT_MS,
			`Resume timeout (${trigger})`
		)
			.then(() => {
				this.hasUnlockedBefore = true;
				recordEvent("audio:resumed", { state: ctx.state, trigger });
				return ctx.state === "running";
			})
			.catch((error) => {
				recordEvent("audio:resume_failed", {
					error: getErrorMessage(error),
					fromState: state,
					trigger,
				});
				// Context is stuck - destroy so next attempt gets fresh one
				this.destroyContext();
				return false;
			})
			.finally(() => {
				this.resumePromise = null;
			});

		return this.resumePromise;
	}

	// ==========================================================================
	// Event Listeners
	// ==========================================================================

	/**
	 * Set up all event listeners for auto-unlock.
	 * Called once per AudioService lifetime (listeners persist across context recreation).
	 */
	private setupListeners(): void {
		if (this.listenersAttached) return;
		this.listenersAttached = true;

		// User gesture listeners - attempt unlock on any interaction
		for (const event of USER_GESTURE_EVENTS) {
			document.body.addEventListener(
				event,
				() => this.attemptResume("gesture"),
				{ passive: true }
			);
		}

		// Visibility listener - resume when user returns to tab
		document.addEventListener("visibilitychange", () => {
			if (document.visibilityState === "visible" && this.context) {
				this.attemptResume("visibility");
			}
		});

		// StateChange listener - auto-recover from iOS interruptions
		// Pattern from Howler.js PR #1770
		this.setupStateChangeListener();
	}

	/**
	 * Listen for AudioContext statechange events.
	 * Must be re-attached for each new context instance.
	 */
	private setupStateChangeListener(): void {
		if (!this.context?.addEventListener) return;

		this.context.addEventListener("statechange", () => {
			// Only auto-resume if we've successfully unlocked before
			// (don't auto-resume a fresh context that was never user-unlocked)
			if (this.context?.state !== "running" && this.hasUnlockedBefore) {
				this.attemptResume("statechange");
			}
		});
	}

	// ==========================================================================
	// Playback
	// ==========================================================================

	/**
	 * Play a beep sound.
	 *
	 * If context needs resuming, attempts resume then plays.
	 * If resume is already in progress, skips this beep (fire-and-forget).
	 *
	 * Design decision: playBeep is fire-and-forget because beeps are usually
	 * time-sensitive (timers). Waiting 3s for a timeout would miss the moment.
	 * Better to skip and let the next beep succeed with a fresh context.
	 *
	 * @param frequency - Hz (default 880)
	 * @param duration - seconds (default 0.15)
	 * @param type - oscillator type (default "sine")
	 * @param volume - 0-1 (default 0.7)
	 */
	playBeep(
		frequency = 880,
		duration = 0.15,
		type: OscillatorType = "sine",
		volume = 0.7
	): void {
		const ctx = this.getContext();
		const state = ctx.state as ContextState;

		if (state === "running") {
			this.doPlayBeep(ctx, frequency, duration, type, volume);
			return;
		}

		if (state === "suspended" || state === "interrupted") {
			// If resume already in progress, skip (don't queue beeps)
			if (this.resumePromise) {
				recordEvent("audio:play_skipped", { reason: "resume_in_progress", state });
				return;
			}

			this.attemptResume("playBeep").then((success) => {
				if (success && this.context?.state === "running") {
					this.doPlayBeep(this.context, frequency, duration, type, volume);
				}
			});
			return;
		}

		recordEvent("audio:play_skipped", { reason: "unexpected_state", state });
	}

	/**
	 * Internal: actually play the beep (assumes context is running).
	 */
	private doPlayBeep(
		ctx: AudioContext,
		frequency: number,
		duration: number,
		type: OscillatorType,
		volume: number
	): void {
		if (ctx.state !== "running") {
			recordEvent("audio:play_skipped", { reason: "not_running", state: ctx.state });
			return;
		}

		try {
			const oscillator = ctx.createOscillator();
			const gain = ctx.createGain();

			oscillator.connect(gain);
			gain.connect(ctx.destination);

			oscillator.frequency.value = frequency;
			oscillator.type = type;

			gain.gain.setValueAtTime(volume, ctx.currentTime);
			gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + duration);

			oscillator.start(ctx.currentTime);
			oscillator.stop(ctx.currentTime + duration);

			recordEvent("audio:played", { frequency, duration, state: ctx.state });
		} catch (error) {
			recordEvent("audio:play_error", { error: getErrorMessage(error), frequency });
			this.destroyContext();
		}
	}

	// ==========================================================================
	// Public API
	// ==========================================================================

	/**
	 * Prime the audio context.
	 * Call on app startup to create context and attach unlock listeners early.
	 * The context will still be suspended until a user gesture.
	 */
	prime(): void {
		this.getContext();
	}

	/**
	 * Ensure AudioContext is running.
	 * Call this in a click handler before starting a timer.
	 * Waits for resume to complete (unlike playBeep which is fire-and-forget).
	 *
	 * @returns The running AudioContext
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
	 * Test sound playback.
	 * Plays a recognizable beep and returns diagnostic info.
	 * Used by the settings panel "Test Sound" button.
	 *
	 * @returns Diagnostic info about the attempt
	 */
	async testSound(): Promise<{ state: string; played: boolean; error?: string }> {
		const ctx = this.getContext();
		const initialState = ctx.state;

		recordEvent("audio:test_requested", {
			initialState,
			hasContext: !!this.context,
			hasUnlockedBefore: this.hasUnlockedBefore,
		});

		try {
			const success = await this.attemptResume("testSound");

			if (success && this.context?.state === "running") {
				this.doPlayBeep(this.context, 440, 0.3, "sine", 0.8);
				recordEvent("audio:test_success", { state: this.context.state });
				return { state: this.context.state, played: true };
			}

			const finalState = this.context?.state ?? "destroyed";
			recordEvent("audio:test_failed", { reason: "not_running", state: finalState });
			return { state: finalState, played: false, error: `Context state: ${finalState}` };
		} catch (error) {
			const errorMsg = getErrorMessage(error);
			recordEvent("audio:test_failed", { error: errorMsg, initialState });
			return { state: initialState, played: false, error: errorMsg };
		}
	}

	/**
	 * Get diagnostic state info.
	 * Used by debug UI to show current audio status.
	 */
	getState(): {
		contextExists: boolean;
		state: string | null;
		hasUnlockedBefore: boolean;
		resumeInProgress: boolean;
	} {
		return {
			contextExists: !!this.context,
			state: this.context?.state ?? null,
			hasUnlockedBefore: this.hasUnlockedBefore,
			resumeInProgress: this.resumePromise !== null,
		};
	}
}

// Export singleton
export const audioService = new AudioService();
