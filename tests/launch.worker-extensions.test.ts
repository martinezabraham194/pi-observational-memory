import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { loadConfig } from "../src/config.js";
import { AGENT_EXTENSION_PATH, buildWorkerArgv } from "../src/spawn/launch.js";

const model = { provider: "x", id: "y" };

describe("buildWorkerArgv workerExtensions", () => {
	it("matches the upstream argv when workerExtensions is absent or empty", () => {
		const base = buildWorkerArgv({ model, sessionName: "n", kickoffPrompt: "p" });
		expect(buildWorkerArgv({ model, sessionName: "n", kickoffPrompt: "p", workerExtensions: [] })).toEqual(base);
		expect(base.filter((a) => a === "-e")).toHaveLength(1);
	});

	it("emits -e <path> before the agent extension and keeps spaces in one element", () => {
		const argv = buildWorkerArgv({ model, sessionName: "n", kickoffPrompt: "p", workerExtensions: ["/a b/bridge.ts"] });
		const i = argv.indexOf("/a b/bridge.ts");
		expect(i).toBeGreaterThan(0);
		expect(argv[i - 1]).toBe("-e");
		expect(argv.indexOf(AGENT_EXTENSION_PATH)).toBeGreaterThan(i);
		expect(argv[argv.indexOf(AGENT_EXTENSION_PATH) - 1]).toBe("-e");
	});
});

describe("loadConfig workerExtensions", () => {
	let dir: string;
	let agentDir: string;
	let prev: string | undefined;
	beforeEach(() => {
		dir = mkdtempSync(join(tmpdir(), "om-we-"));
		agentDir = mkdtempSync(join(tmpdir(), "om-agent-"));
		prev = process.env.PI_CODING_AGENT_DIR;
		process.env.PI_CODING_AGENT_DIR = agentDir;
		mkdirSync(join(dir, ".pi"));
	});
	afterEach(() => {
		if (prev === undefined) delete process.env.PI_CODING_AGENT_DIR;
		else process.env.PI_CODING_AGENT_DIR = prev;
		rmSync(dir, { recursive: true, force: true });
		rmSync(agentDir, { recursive: true, force: true });
	});
	const writeProject = (v: unknown) =>
		writeFileSync(join(dir, ".pi", "settings.json"), JSON.stringify({ "observational-memory": { workerExtensions: v } }));

	it("defaults to []", () => {
		expect(loadConfig(dir).workerExtensions).toEqual([]);
	});
	it("ignores project settings (a cloned repo must not pick worker code)", () => {
		writeProject(["/x.ts"]);
		expect(loadConfig(dir).workerExtensions).toEqual([]);
	});
	it("reads global settings and ignores non-array values and non-string entries", () => {
		const writeGlobal = (v: unknown) =>
			writeFileSync(join(agentDir, "settings.json"), JSON.stringify({ "observational-memory": { workerExtensions: v } }));
		writeGlobal(["/x.ts"]);
		expect(loadConfig(dir).workerExtensions).toEqual(["/x.ts"]);
		writeGlobal("nope");
		expect(loadConfig(dir).workerExtensions).toEqual([]);
		writeGlobal(["/x.ts", 3, "", null]);
		expect(loadConfig(dir).workerExtensions).toEqual(["/x.ts"]);
	});
	it("project cannot override global", () => {
		writeFileSync(join(agentDir, "settings.json"), JSON.stringify({ "observational-memory": { workerExtensions: ["/g.ts"] } }));
		writeProject(["/p.ts"]);
		expect(loadConfig(dir).workerExtensions).toEqual(["/g.ts"]);
	});
});
