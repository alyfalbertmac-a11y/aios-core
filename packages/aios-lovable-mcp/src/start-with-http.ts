#!/usr/bin/env node

/**
 * Start AIOS Lovable MCP Server with both MCP (stdio) and HTTP REST API
 *
 * This allows:
 * - Local testing via HTTP on :3000
 * - Lovable integration via SSE MCP transport over HTTP
 * - Full MCP tool availability via both stdio and HTTP
 */

import { createServer } from './server.js';
import { HttpServer } from './services/http-server.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { SSEServerTransport } from '@modelcontextprotocol/sdk/server/sse.js';
import type { Request, Response } from 'express';

const HTTP_PORT = parseInt(process.env.PORT || '3000', 10);
const MCP_ENABLED = process.env.MCP_ENABLED !== 'false';

async function main(): Promise<void> {
  try {
    // Start HTTP server
    const httpServer = new HttpServer(HTTP_PORT);

    // Track active SSE transports by session ID
    const sseTransports = new Map<string, SSEServerTransport>();

    // Mount SSE MCP transport on /sse (GET) and /messages (POST)
    // This allows HTTP-based MCP clients (like Lovable) to connect
    httpServer.app.get('/sse', async (req: Request, res: Response) => {
      console.error('[MCP SSE] New SSE connection request');
      const mcpServer = createServer();
      const transport = new SSEServerTransport('/messages', res);

      sseTransports.set(transport.sessionId, transport);
      console.error(`[MCP SSE] Session created: ${transport.sessionId}`);

      // Clean up on disconnect
      res.on('close', () => {
        console.error(`[MCP SSE] Session closed: ${transport.sessionId}`);
        sseTransports.delete(transport.sessionId);
        transport.close().catch(() => {});
      });

      try {
        await mcpServer.connect(transport);
        console.error(`[MCP SSE] MCP server connected for session: ${transport.sessionId}`);
      } catch (err) {
        console.error('[MCP SSE] Connection error:', err);
        sseTransports.delete(transport.sessionId);
        if (!res.headersSent) {
          res.status(500).end();
        }
      }
    });

    httpServer.app.post('/messages', async (req: Request, res: Response) => {
      const sessionId = req.query.sessionId as string;
      if (!sessionId) {
        res.status(400).json({ error: 'sessionId query parameter required' });
        return;
      }

      const transport = sseTransports.get(sessionId);
      if (!transport) {
        res.status(404).json({ error: `Session ${sessionId} not found` });
        return;
      }

      try {
        await transport.handlePostMessage(req, res);
      } catch (err) {
        console.error('[MCP SSE] Message handling error:', err);
        if (!res.headersSent) {
          res.status(500).json({ error: 'Message handling failed' });
        }
      }
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
   MCP over SSE:   http://localhost:${HTTP_PORT}/sse
   7 MCP Tools:    Available
   Webhooks:       Ready

Configuration for Lovable:
   Server Name:       AIOS Lovable
   Server URL:        http://localhost:${HTTP_PORT}/sse
   Auth Type:         Bearer token or API key
   API Key:           (set via AIOS_API_KEYS env var)

Endpoints:
   GET    /sse                       MCP SSE transport
   POST   /messages?sessionId=...    MCP message endpoint
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
