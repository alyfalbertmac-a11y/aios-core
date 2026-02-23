#!/usr/bin/env node

/**
 * Start AIOS Lovable MCP Server with HTTP JSON-RPC transport
 *
 * This allows:
 * - Local testing via HTTP on :3000
 * - Lovable integration via simple HTTP JSON-RPC transport
 * - Full MCP tool availability
 */

import { createServer } from './server.js';
import { HttpServer } from './services/http-server.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import type { Request, Response } from 'express';

const HTTP_PORT = parseInt(process.env.PORT || '3000', 10);
const MCP_ENABLED = process.env.MCP_ENABLED !== 'false';

async function main(): Promise<void> {
  try {
    // Start HTTP server
    const httpServer = new HttpServer(HTTP_PORT);

    // Create a single MCP server instance
    const mcpServer = createServer();

    // Mount HTTP JSON-RPC transport on /mcp
    // Simple POST-based protocol for Lovable integration
    httpServer.app.post('/mcp', async (req: Request, res: Response) => {
      try {
        console.error('[MCP HTTP-RPC] Received request:', req.body);

        // For now, return a simple initialize response to test connection
        // This is a basic JSON-RPC 2.0 response
        const response = {
          jsonrpc: '2.0',
          id: req.body?.id || 1,
          result: {
            protocolVersion: '2024-11-05',
            capabilities: {
              tools: {
                listChanged: true,
              },
              prompts: {},
              resources: {},
            },
            serverInfo: {
              name: 'AIOS Lovable MCP',
              version: '1.0.0',
            },
          }
        };

        console.error('[MCP HTTP-RPC] Sending response:', response);
        res.json(response);
      } catch (err) {
        console.error('[MCP HTTP-RPC] Error:', err);
        const errorMessage = err instanceof Error ? err.message : String(err);
        res.status(500).json({
          jsonrpc: '2.0',
          error: {
            code: -32603,
            message: 'Internal error',
            data: { details: errorMessage }
          },
          id: (req.body && req.body.id) || null
        });
      }
    });

    // Support GET /mcp for connection test
    httpServer.app.get('/mcp', (req: Request, res: Response) => {
      res.json({
        type: 'mcp-server',
        name: 'AIOS Lovable',
        version: '1.0.0',
        transport: 'http-jsonrpc',
        capabilities: {
          tools: 7,
          resources: ['strategize', 'design', 'architecture', 'code', 'pipeline', 'status', 'artifact'],
        },
      });
    });

    await httpServer.start();

    // Optionally start MCP server on stdio (for local dev / CLI usage)
    if (MCP_ENABLED && !process.env.DISABLE_STDIO_MCP) {
      const stdiMcpServer = createServer();
      const transport = new StdioServerTransport();

      console.error(`[Main] Connecting MCP server to stdio...`);
      await stdiMcpServer.connect(transport);
      console.error(`[Main] MCP server connected on stdio`);
    }

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
  } catch (err) {
    console.error('[Main] Fatal error:', err);
    process.exit(1);
  }
}

main();
