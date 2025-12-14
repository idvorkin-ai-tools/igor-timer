/**
 * GitHub Integration Service
 */

import {
	BUILD_TIMESTAMP,
	GIT_BRANCH,
	GIT_COMMIT_URL,
	GIT_SHA,
} from "../generated_version";

const DEFAULT_REPO_URL = "https://github.com/idvorkin/igor-timer";

export interface BuildInfo {
	sha: string;
	commitUrl: string;
	branch: string;
	timestamp: string;
}

export interface GitHubLinks {
	repo: string;
	issues: string;
	newIssue: string;
}

export function getBuildInfo(): BuildInfo {
	return {
		sha: GIT_SHA,
		commitUrl: GIT_COMMIT_URL,
		branch: GIT_BRANCH,
		timestamp: BUILD_TIMESTAMP,
	};
}

export function getRepoUrl(): string {
	if (
		typeof import.meta !== "undefined" &&
		import.meta.env?.VITE_GITHUB_REPO_URL
	) {
		return import.meta.env.VITE_GITHUB_REPO_URL;
	}
	return DEFAULT_REPO_URL;
}

export function getGitHubLinks(repoUrl: string = getRepoUrl()): GitHubLinks {
	const base = repoUrl.replace(/\.git$/, "");
	return {
		repo: base,
		issues: `${base}/issues`,
		newIssue: `${base}/issues/new`,
	};
}

export function formatTimestamp(timestamp: string): string {
	if (!timestamp) return "";
	try {
		return new Date(timestamp).toLocaleString();
	} catch {
		return timestamp;
	}
}
