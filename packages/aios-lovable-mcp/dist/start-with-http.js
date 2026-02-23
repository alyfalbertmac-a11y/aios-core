#!/usr/bin/env node
/**
 * Start AIOS Lovable MCP Server with both MCP (stdio) and HTTP REST API
 *
 * This allows:
 * - Local testing via HTTP on :3000
 * - Lovable integration via HTTP endpoints
 * - Full MCP tool availability
 */
import { createServer } from './server.js';
import { HttpServer } from './services/http-server.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
const HTTP_PORT = parseInt(process.env.PORT || '3000', 10);
const MCP_ENABLED = process.env.MCP_ENABLED !== 'false';
async function main() {
    try {
        // Start HTTP server
        const httpServer = new HttpServer(HTTP_PORT);
        await httpServer.start();
        // Optionally start MCP server on stdio
        if (MCP_ENABLED) {
            const mcpServer = createServer();
            const transport = new StdioServerTransport();
            console.error(`[Main] 🔗 Connecting MCP server to stdio...`);
            await mcpServer.connect(transport);
            console.error(`[Main] ✅ MCP server connected on stdio`);
        }
        console.error(`
╔════════════════════════════════════════════════════════════╗
║         AIOS Lovable MCP Server - READY! 🚀               ║
╚════════════════════════════════════════════════════════════╝

📡 Services Running:
   ✅ HTTP REST API:  http://localhost:${HTTP_PORT}
   ✅ 7 MCP Tools:    Available
   ✅ Webhooks:       Ready

🔑 Configuration for Lovable:
   Server Name:       AIOS Lovable
   Server URL:        http://localhost:${HTTP_PORT}
   Auth Type:         Bearer token or API key
   API Key:           aios_lovable_mlyixanmi1ooyce8ys

📚 Endpoints:
   GET    /health                  Health check
   POST   /api/jobs                Create job
   GET    /api/jobs/:jobId         Check status
   GET    /api/jobs/:jobId/stream  Real-time updates
   POST   /api/webhooks/test       Test webhook

🧪 Quick Test:
   curl http://localhost:${HTTP_PORT}/health

Ready to integrate with Lovable! 🎉
`);
    }
    catch (err) {
        console.error('[Main] ❌ Fatal error:', err);
        process.exit(1);
    }
}
main();
//# sourceMappingURL=start-with-http.js.map