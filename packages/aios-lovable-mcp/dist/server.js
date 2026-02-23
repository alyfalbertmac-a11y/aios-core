#!/usr/bin/env node
/**
 * Synkra AIOS MCP Server for Lovable Integration
 *
 * Exposes AIOS agents as MCP tools that Lovable can invoke.
 * Phase 1 (MVP): 2 tools - aios_design_architecture + aios_generate_code
 *
 * Transport: stdio (standard MCP transport for local dev)
 * Auth: Bearer token via AIOS_API_KEY env var (MVP: hardcoded check)
 */
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';
import { Orchestrator } from './adapters/orchestrator.js';
const SERVER_NAME = 'aios-lovable-mcp';
const SERVER_VERSION = '0.1.0';
function createServer() {
    const server = new McpServer({
        name: SERVER_NAME,
        version: SERVER_VERSION,
    });
    const orchestrator = new Orchestrator();
    // -------------------------------------------------------------------------
    // Tool: aios_design_architecture
    // -------------------------------------------------------------------------
    server.tool('aios_design_architecture', 'Produce a complete system architecture document including stack selection, data model, API design, and security. Runs the @architect agent.', {
        spec: z.string().min(1).describe('Product spec or requirements JSON'),
        requirements: z
            .record(z.unknown())
            .optional()
            .describe('Output from aios_strategize (optional)'),
        stack_preference: z
            .string()
            .optional()
            .describe("Preferred tech stack (e.g., 'nextjs-react', 'vite-react')"),
    }, async (args) => {
        const response = await orchestrator.designArchitecture({
            spec: args.spec,
            requirements: args.requirements,
            stack_preference: args.stack_preference,
        });
        if (!response.success) {
            return {
                content: [
                    {
                        type: 'text',
                        text: JSON.stringify({
                            error: response.error,
                        }, null, 2),
                    },
                ],
                isError: true,
            };
        }
        return {
            content: [
                {
                    type: 'text',
                    text: JSON.stringify(response.data, null, 2),
                },
            ],
        };
    });
    // -------------------------------------------------------------------------
    // Tool: aios_generate_code
    // -------------------------------------------------------------------------
    server.tool('aios_generate_code', 'Generate production-ready implementation code (React/Next.js components, API routes, schemas). Runs the @dev agent.', {
        spec: z.string().min(1).describe('Product specification'),
        architecture: z
            .record(z.unknown())
            .optional()
            .describe('Output from aios_design_architecture (optional)'),
        ux_spec: z
            .record(z.unknown())
            .optional()
            .describe('Output from aios_design_ux (optional)'),
        target_files: z
            .array(z.string())
            .optional()
            .describe('Specific files to generate (optional)'),
        framework: z
            .string()
            .optional()
            .describe("Target framework preset (default: 'nextjs-react')"),
    }, async (args) => {
        const response = await orchestrator.generateCode({
            spec: args.spec,
            architecture: args.architecture,
            ux_spec: args.ux_spec,
            target_files: args.target_files,
            framework: args.framework,
        });
        if (!response.success) {
            return {
                content: [
                    {
                        type: 'text',
                        text: JSON.stringify({
                            error: response.error,
                        }, null, 2),
                    },
                ],
                isError: true,
            };
        }
        return {
            content: [
                {
                    type: 'text',
                    text: JSON.stringify(response.data, null, 2),
                },
            ],
        };
    });
    return server;
}
async function main() {
    const server = createServer();
    const transport = new StdioServerTransport();
    console.error(`[${SERVER_NAME}] Starting MCP server v${SERVER_VERSION}...`);
    console.error(`[${SERVER_NAME}] Transport: stdio`);
    console.error(`[${SERVER_NAME}] Tools: aios_design_architecture, aios_generate_code`);
    await server.connect(transport);
    console.error(`[${SERVER_NAME}] Server connected and ready.`);
}
main().catch((err) => {
    console.error(`[${SERVER_NAME}] Fatal error:`, err);
    process.exit(1);
});
export { createServer };
//# sourceMappingURL=server.js.map