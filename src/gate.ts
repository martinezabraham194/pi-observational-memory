import { OM_ENABLED, type Entry } from "./ledger/index.js";

/**
 * The per-session on/off gate: the latest `om.enabled` entry on the branch wins (an explicit
 * `/om on|off`); a session that never toggled falls back to `config.enabledByDefault`.
 */
export function readGateFromLedger(branch: Entry[], fallback: boolean): boolean {
	for (let i = branch.length - 1; i >= 0; i--) {
		const entry = branch[i];
		if (entry.type === "custom" && entry.customType === OM_ENABLED) {
			return (entry.data as { enabled?: boolean } | undefined)?.enabled ?? false;
		}
	}
	return fallback;
}
