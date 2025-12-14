import { useCallback, useRef } from "react";

export function useAudio() {
	const audioCtxRef = useRef<AudioContext | null>(null);

	const initAudio = useCallback(() => {
		if (!audioCtxRef.current) {
			audioCtxRef.current = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
		}
		return audioCtxRef.current;
	}, []);

	const playBeep = useCallback((frequency = 880, duration = 0.15, type: OscillatorType = "sine") => {
		const ctx = initAudio();
		const oscillator = ctx.createOscillator();
		const gainNode = ctx.createGain();
		oscillator.connect(gainNode);
		gainNode.connect(ctx.destination);
		oscillator.frequency.value = frequency;
		oscillator.type = type;
		gainNode.gain.setValueAtTime(0.5, ctx.currentTime);
		gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + duration);
		oscillator.start(ctx.currentTime);
		oscillator.stop(ctx.currentTime + duration);
	}, [initAudio]);

	const playStartBeep = useCallback(() => playBeep(1200, 0.2, "sine"), [playBeep]);

	const playEndBeep = useCallback(() => {
		playBeep(600, 0.3, "sine");
		setTimeout(() => playBeep(600, 0.3, "sine"), 150);
	}, [playBeep]);

	const playCountdownBeep = useCallback(() => playBeep(880, 0.1, "sine"), [playBeep]);

	const playFinishBeep = useCallback(() => {
		playBeep(600, 0.3, "sine");
		setTimeout(() => playBeep(600, 0.3, "sine"), 300);
		setTimeout(() => playBeep(600, 0.3, "sine"), 600);
	}, [playBeep]);

	return { initAudio, playStartBeep, playEndBeep, playCountdownBeep, playFinishBeep };
}
