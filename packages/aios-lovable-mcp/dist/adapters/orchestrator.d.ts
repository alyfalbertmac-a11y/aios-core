/**
 * Orchestrator - Routes MCP tool calls to the appropriate AIOS agent adapter.
 *
 * For Phase 1 (MVP), agent execution is synchronous and in-process.
 * Phase 2 will introduce BullMQ async job processing.
 */
import type { AgentResponse } from '../types/lovable.js';
export declare class Orchestrator {
    private architectAdapter;
    private devAdapter;
    constructor();
    designArchitecture(input: {
        spec: string;
        requirements?: Record<string, unknown>;
        stack_preference?: string;
    }): Promise<AgentResponse>;
    generateCode(input: {
        spec: string;
        architecture?: Record<string, unknown>;
        ux_spec?: Record<string, unknown>;
        target_files?: string[];
        framework?: string;
    }): Promise<AgentResponse>;
}
//# sourceMappingURL=orchestrator.d.ts.map