#!/usr/bin/env node

/**
 * Start AIOS Lovable MCP Server with both MCP (stdio) and HTTP REST API
 *
 * This allows:
 * - Local testing via HTTP on :3000
 * - Lovable integration via modern Streamable HTTP MCP transport
 * - Full MCP tool availability via both stdio and HTTP
 */

import { createServer } from './server.js';
import { HttpServer } from './services/http-server.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import type { Request, Response } from 'express';

const HTTP_PORT = parseInt(process.env.PORT || '3000', 10);
const MCP_ENABLED = process.env.MCP_ENABLED !== 'false';

async function main(): Promise<void> {
  try {
    // Start HTTP server
    const httpServer = new HttpServer(HTTP_PORT);

    // Mount modern Streamable HTTP MCP transport on /mcp
    // This allows HTTP-based MCP clients (like Lovable) to connect
    httpServer.app.post('/mcp', async (req: Request, res: Response) => {
      console.error(`[MCP HTTP] New Streamable HTTP request`);

      const mcpServer = createServer();
      const transport = new StreamableHTTPServerTransport();

      try {
        console.error(`[MCP HTTP] Connecting MCP server to Streamable HTTP transport`);
        await mcpServer.connect(transport);

        // Handle the HTTP request/response
        await transport.handleRequest(req, res);
        console.error(`[MCP HTTP] Request handled successfully`);
      } catch (err) {
        console.error('[MCP HTTP] Connection error:', err);
        if (!res.headersSent) {
          res.status(500).json({ error: 'MCP connection failed' });
        }
      }
    });

    // Also support GET for initial connection probes
    httpServer.app.get('/mcp', (req: Request, res: Response) => {
      res.json({
        type: 'mcp-server',
        name: 'AIOS Lovable',
        version: '1.0.0',
        transport: 'streamable-http',
        capabilities: {
          tools: 7,
        },
      });
    });

    await httpServer.start();

    // Optionally start MCP server on stdio (for local dev / CLI usage)
    if (MCP_ENABLED && !process.env.DISABLE_STDIO_MCP) {
      const mcpServer = createServer();
      const transport = new StdioServerTransport();

      console.error(`[Main] Connecting MCP server to stdio...`);
      await mcpServer.connect(transport);
      console.error(`[Main] MCP server connected on stdio`);
    }

    console.error(`
================================================================
         AIOS Lovable MCP Server - READY
================================================================

Services Running:
   HTTP REST API:  http://localhost:${HTTP_PORT}
   MCP Streamable: http://localhost:${HTTP_PORT}/mcp
   7 MCP Tools:    Available
   Webhooks:       Ready

Configuration for Lovable:
   Server Name:       AIOS Lovable
   Server URL:        http://localhost:${HTTP_PORT}/mcp
   Auth Type:         Bearer token or API key
   API Key:           (set via AIOS_API_KEYS env var)

Endpoints:
   ALL    /mcp                       Modern Streamable HTTP MCP transport
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
  } catch (err) {
    console.error('[Main] Fatal error:', err);
    process.exit(1);
  }
}

main();
