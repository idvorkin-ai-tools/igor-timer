import "@testing-library/jest-dom";

// Mock canvas getContext to suppress jsdom warning about WebGL
HTMLCanvasElement.prototype.getContext = () => null;

// Mock AudioContext for tests
class MockAudioContext {
	state: AudioContextState = "running";

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
	createBuffer() {
		return {};
	}
	createBufferSource() {
		return {
			connect: () => {},
			start: () => {},
			buffer: null,
		};
	}
	get currentTime() {
		return 0;
	}
	get destination() {
		return {};
	}
	resume() {
		this.state = "running";
		return Promise.resolve();
	}
	suspend() {
		this.state = "suspended";
		return Promise.resolve();
	}
	close() {
		this.state = "closed";
		return Promise.resolve();
	}
	addEventListener() {}
	removeEventListener() {}
}

Object.defineProperty(window, "AudioContext", {
	writable: true,
	value: MockAudioContext,
});

Object.defineProperty(window, "webkitAudioContext", {
	writable: true,
	value: MockAudioContext,
});
