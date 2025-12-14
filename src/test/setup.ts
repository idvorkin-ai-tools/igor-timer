import "@testing-library/jest-dom";

// Mock AudioContext for tests
class MockAudioContext {
	createOscillator() {
		return {
			connect: () => {},
			start: () => {},
			stop: () => {},
			frequency: { value: 0 },
			type: "sine",
		};
	}
	createGain() {
		return {
			connect: () => {},
			gain: {
				setValueAtTime: () => {},
				exponentialRampToValueAtTime: () => {},
			},
		};
	}
	get currentTime() {
		return 0;
	}
	get destination() {
		return {};
	}
}

Object.defineProperty(window, "AudioContext", {
	writable: true,
	value: MockAudioContext,
});

Object.defineProperty(window, "webkitAudioContext", {
	writable: true,
	value: MockAudioContext,
});
