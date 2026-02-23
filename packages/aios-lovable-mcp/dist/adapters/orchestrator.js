/**
 * Orchestrator - Routes MCP tool calls to the appropriate AIOS agent adapter.
 *
 * For Phase 1 (MVP), agent execution is synchronous and in-process.
 * Phase 2 will introduce BullMQ async job processing.
 */
import { ArchitectAdapter } from './architect-adapter.js';
import { DevAdapter } from './dev-adapter.js';
export class Orchestrator {
    architectAdapter;
    devAdapter;
    constructor() {
        this.architectAdapter = new ArchitectAdapter();
        this.devAdapter = new DevAdapter();
    }
    async designArchitecture(input) {
        return this.architectAdapter.execute(input);
    }
    async generateCode(input) {
        return this.devAdapter.execute(input);
    }
}
//# sourceMappingURL=orchestrator.js.map