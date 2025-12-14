import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import { BugReporterProvider } from "./contexts/BugReporterContext";
import "./index.css";

createRoot(document.getElementById("root")!).render(
	<StrictMode>
		<BugReporterProvider>
			<App />
		</BugReporterProvider>
	</StrictMode>,
);
