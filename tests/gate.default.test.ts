import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { loadConfig } from "../src/config.js";
import { readGateFromLedger } from "../src/gate.js";
import { OM_ENABLED, type Entry } from "../src/ledger/index.js";

const gate = (enabled: boolean) => ({ type: "custom", customType: OM_ENABLED, data: { enabled } }) as unknown as Entry;
const msg = { type: "message" } as unknown as Entry;

describe("readGateFromLedger", () => {
	it("falls back to the default when the session has no om.enabled entry", () => {
		expect(readGateFromLedger([msg], false)).toBe(false);
		expect(readGateFromLedger([msg], true)).toBe(true);
	});
	it("an explicit /om toggle in the session wins over the default", () => {
		expect(readGateFromLedger([gate(false), msg], true)).toBe(false);
		expect(readGateFromLedger([gate(false), gate(true)], false)).toBe(true);
	});
});

describe("loadConfig enabledByDefault", () => {
	let dir: string;
	let agentDir: string;
	let prev: string | undefined;
	beforeEach(() => {
		dir = mkdtempSync(join(tmpdir(), "om-gate-"));
		agentDir = mkdtempSync(join(tmpdir(), "om-agent-"));
		prev = process.env.PI_CODING_AGENT_DIR;
		process.env.PI_CODING_AGENT_DIR = agentDir;
	});
	afterEach(() => {
		if (prev === undefined) delete process.env.PI_CODING_AGENT_DIR;
		else process.env.PI_CODING_AGENT_DIR = prev;
		rmSync(dir, { recursive: true, force: true });
		rmSync(agentDir, { recursive: true, force: true });
	});

	it("defaults to false", () => {
		expect(loadConfig(dir).enabledByDefault).toBe(false);
	});
	it("reads a boolean from settings and ignores non-booleans", () => {
		const writeGlobal = (v: unknown) =>
			writeFileSync(join(agentDir, "settings.json"), JSON.stringify({ "observational-memory": { enabledByDefault: v } }));
		writeGlobal(true);
		expect(loadConfig(dir).enabledByDefault).toBe(true);
		writeGlobal("yes");
		expect(loadConfig(dir).enabledByDefault).toBe(false);
	});
});
