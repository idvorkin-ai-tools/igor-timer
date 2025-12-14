import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import App from "./App";

describe("App", () => {
	it("should render the timer display", () => {
		render(<App />);

		expect(screen.getByText("WORK")).toBeInTheDocument();
		expect(screen.getByText("00:30")).toBeInTheDocument();
		expect(screen.getByText("REST")).toBeInTheDocument();
	});

	it("should render preset buttons", () => {
		render(<App />);

		// Use getAllByText since "30 SEC" appears in both preset button and header
		expect(screen.getAllByText("30 SEC").length).toBeGreaterThanOrEqual(1);
		expect(screen.getByText("1 MIN")).toBeInTheDocument();
		expect(screen.getByText("5-1")).toBeInTheDocument();
	});

	it("should render navigation buttons", () => {
		render(<App />);

		expect(screen.getByText("ROUNDS")).toBeInTheDocument();
		expect(screen.getByText("STOPWATCH")).toBeInTheDocument();
	});

	it("should render start button", () => {
		render(<App />);

		expect(screen.getByText("START")).toBeInTheDocument();
	});

	it("should change preset when clicked", async () => {
		const user = userEvent.setup();
		render(<App />);

		await user.click(screen.getByText("1 MIN"));

		expect(screen.getByText("01:00")).toBeInTheDocument();
	});

	it("should open timer settings modal when timer settings button clicked", async () => {
		const user = userEvent.setup();
		render(<App />);

		await user.click(screen.getByLabelText("Timer Settings"));

		expect(screen.getByText("TIMER SETTINGS")).toBeInTheDocument();
		expect(screen.getByText("WORK TIME (seconds)")).toBeInTheDocument();
	});

	it("should close timer settings modal when close button clicked", async () => {
		const user = userEvent.setup();
		render(<App />);

		await user.click(screen.getByLabelText("Timer Settings"));
		await user.click(screen.getByText("×"));

		expect(screen.queryByText("TIMER SETTINGS")).not.toBeInTheDocument();
	});

	it("should open app settings modal when settings button clicked", async () => {
		const user = userEvent.setup();
		render(<App />);

		await user.click(screen.getByLabelText("Settings"));

		expect(screen.getByText("SETTINGS")).toBeInTheDocument();
		expect(screen.getByText("Igor Timer")).toBeInTheDocument();
	});
});
