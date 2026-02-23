#!/usr/bin/env node
/**
 * Start AIOS Lovable MCP Server with SSE transport on /sse endpoint
 *
 * This allows:
 * - Local testing via HTTP on :3000
 * - Lovable integration via SSE MCP transport (like CoinGecko)
 * - Full MCP tool availability
 */
import { createServer } from './server.js';
import { HttpServer } from './services/http-server.js';
import { SSEServerTransport } from '@modelcontextprotocol/sdk/server/sse.js';
const HTTP_PORT = parseInt(process.env.PORT || '3000', 10);
async function main() {
    try {
        // Start HTTP server
        const httpServer = new HttpServer(HTTP_PORT);
        // Create a single MCP server instance
        const mcpServer = createServer();
        // Track active SSE transports by session ID
        const sseTransports = new Map();
        // Mount SSE MCP transport on /sse (like CoinGecko uses)
        // This is the pattern that Lovable successfully connects to
        httpServer.app.get('/sse', async (req, res) => {
            console.error('[MCP SSE] New SSE connection request');
            // Create transport for this connection
            const transport = new SSEServerTransport('/sse/message', res);
            sseTransports.set(transport.sessionId, transport);
            console.error(`[MCP SSE] Session created: ${transport.sessionId}`);
            // Clean up on disconnect
            res.on('close', () => {
                console.error(`[MCP SSE] Session closed: ${transport.sessionId}`);
                sseTransports.delete(transport.sessionId);
                transport.close().catch(() => { });
            });
            try {
                // Use the single shared MCP server for this transport
                await mcpServer.connect(transport);
                console.error(`[MCP SSE] MCP server connected for session: ${transport.sessionId}`);
            }
            catch (err) {
                console.error('[MCP SSE] Connection error:', err);
                sseTransports.delete(transport.sessionId);
                if (!res.headersSent) {
                    res.status(500).end();
                }
            }
        });
        // Handle messages from clients
        httpServer.app.post('/sse/message', async (req, res) => {
            // Accept sessionId from either header or query parameter
            const sessionId = req.headers['mcp-session-id'] || req.query.sessionId;
            if (!sessionId) {
                res.status(400).json({ error: 'sessionId required (header or query parameter)' });
                return;
            }
            const transport = sseTransports.get(sessionId);
            if (!transport) {
                res.status(404).json({ error: `Session ${sessionId} not found` });
                return;
            }
            try {
                await transport.handlePostMessage(req, res);
            }
            catch (err) {
                console.error('[MCP SSE] Message handling error:', err);
                if (!res.headersSent) {
                    res.status(500).json({ error: 'Message handling failed' });
                }
            }
        });
        // Support GET / for root (some clients expect this)
        httpServer.app.get('/', (req, res) => {
            res.json({
                type: 'mcp-server',
                name: 'AIOS Lovable',
                version: '1.0.0',
                transport: 'sse',
                status: 'ready',
            });
        });
        await httpServer.start();
        // Optional: start MCP server on stdio for local dev (disabled in production)
        // if (!process.env.DISABLE_STDIO_MCP) {
        //   const stdiMcpServer = createServer();
        //   const transport = new StdioServerTransport();
        //   console.error(`[Main] Connecting MCP server to stdio...`);
        //   await stdiMcpServer.connect(transport);
        //   console.error(`[Main] MCP server connected on stdio`);
        // }
        console.error(`
================================================================
         AIOS Lovable MCP Server - READY
================================================================

Services Running:
   HTTP REST API:  http://localhost:${HTTP_PORT}
   MCP HTTP-RPC:   http://localhost:${HTTP_PORT}/mcp
   7 MCP Tools:    Available
   Webhooks:       Ready

Configuration for Lovable:
   Server Name:       AIOS Lovable
   Server URL:        http://localhost:${HTTP_PORT}/mcp
   Auth Type:         No authentication
   Protocol:          HTTP JSON-RPC

Endpoints:
   POST   /mcp                       JSON-RPC requests
   GET    /mcp                       Server info
   GET    /health                    Health check
   POST   /api/auth                  Auth validation
   POST   /api/jobs                  Create job
   GET    /api/jobs/:jobId           Check status
   GET    /api/jobs/:jobId/stream    Real-time updates
   POST   /api/webhooks/test         Test webhook

Quick Test:
   curl http://localhost:${HTTP_PORT}/health

Ready to integrate with Lovable.
`);
    }
    catch (err) {
        console.error('[Main] Fatal error:', err);
        process.exit(1);
    }
}
main();
//# sourceMappingURL=start-with-http.js.map