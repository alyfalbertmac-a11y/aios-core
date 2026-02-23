/**
 * HTTP REST API Server for Lovable Integration
 *
 * Provides REST endpoints for job management and SSE for real-time updates.
 * Also integrates MCP server via stdio.
 */

import express, { Express, Request, Response } from 'express';
import cors from 'cors';
import { jobQueue, getJobStatus, getJobResult } from './queue.js';
import { apiKeyManager } from './api-keys.js';
import { webhookService } from './webhook.js';
import type { JobData, JobResult } from '../types/lovable.js';

interface AuthRequest extends Request {
  apiKey?: string;
}

export class HttpServer {
  private app: Express;
  private port: number;
  private sseClients = new Map<string, Response>();

  constructor(port = 3000) {
    this.port = port;
    this.app = express();
    this.setupMiddleware();
    this.setupRoutes();
  }

  private setupMiddleware(): void {
    // CORS - allow requests from Lovable and other origins
    this.app.use(cors({
      origin: '*',
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization'],
      credentials: false,
    }));

    // Parse JSON
    this.app.use(express.json({ limit: '10mb' }));

    // API Key validation middleware
    this.app.use((req: AuthRequest, res, next) => {
      const authHeader = req.headers.authorization || '';
      const match = authHeader.match(/Bearer\s+(.+)/);
      const apiKey = match ? match[1] : req.query.api_key;

      // Skip auth for public endpoints
      if (req.path === '/' || req.path === '/health' || req.path === '/mcp') {
        return next();
      }

      if (!apiKey) {
        return res.status(401).json({
          error: { code: 'UNAUTHORIZED', message: 'API key required' },
        });
      }

      const validation = apiKeyManager.validateKey(apiKey as string);
      if (!validation.valid) {
        return res.status(401).json({
          error: { code: 'INVALID_KEY', message: validation.error },
        });
      }

      // Check rate limit
      const rateLimit = apiKeyManager.checkRateLimit(apiKey as string);
      if (!rateLimit.allowed) {
        return res.status(429).json({
          error: { code: 'RATE_LIMITED', message: rateLimit.error },
        });
      }

      req.apiKey = apiKey as string;
      res.set('X-RateLimit-Remaining', String(rateLimit.remaining || 0));
      next();
    });
  }

  private setupRoutes(): void {
    // Root endpoint (no auth required)
    this.app.get('/', (req, res) => {
      res.json({
        name: 'AIOS Lovable MCP Server',
        version: '1.0.0',
        status: 'ready',
        endpoints: {
          health: '/health',
          jobs: '/api/jobs',
          mcp: '/mcp',
        },
      });
    });

    // MCP server info endpoint (no auth required)
    this.app.get('/mcp', (req, res) => {
      res.json({
        type: 'mcp-server',
        name: 'AIOS Lovable',
        version: '1.0.0',
        capabilities: {
          tools: 7,
          resources: ['strategize', 'design', 'architecture', 'code', 'pipeline', 'status', 'artifact'],
        },
      });
    });

    // Lovable connection test endpoint
    this.app.post('/api/auth', async (req: AuthRequest, res) => {
      try {
        if (!req.apiKey) {
          return res.status(401).json({
            error: { code: 'UNAUTHORIZED', message: 'API key required' },
          });
        }
        res.json({
          authenticated: true,
          api_key: req.apiKey,
          server_name: 'AIOS Lovable MCP',
          ready: true,
        });
      } catch (error) {
        res.status(500).json({
          error: { code: 'AUTH_FAILED', message: 'Authentication failed' },
        });
      }
    });

    // Health check
    this.app.get('/health', (req, res) => {
      res.json({
        status: 'healthy',
        uptime: process.uptime(),
        timestamp: new Date().toISOString(),
      });
    });

    // Create async job
    this.app.post('/api/jobs', async (req: AuthRequest, res) => {
      try {
        if (!jobQueue) {
          return res.status(503).json({
            error: { code: 'SERVICE_UNAVAILABLE', message: 'Job queue service not available - Redis not configured' },
          });
        }

        const { tool, input, webhook_url } = req.body;

        if (!tool || !input) {
          return res.status(400).json({
            error: { code: 'INVALID_REQUEST', message: 'tool and input required' },
          });
        }

        const jobData: JobData = {
          tool,
          input,
          webhook_url,
        };

        const jobId = await jobQueue.add(`task-${tool}`, jobData, {
          jobId: undefined, // Let BullMQ generate it
        });

        res.status(202).json({
          job_id: jobId.id,
          status: 'queued',
          status_url: `/api/jobs/${jobId.id}`,
          polling_interval_ms: 1000,
        });
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        res.status(500).json({
          error: { code: 'JOB_CREATION_FAILED', message },
        });
      }
    });

    // Get job status
    this.app.get('/api/jobs/:jobId', async (req: AuthRequest, res) => {
      try {
        const { jobId } = req.params;
        const status = await getJobStatus(jobId);

        if (!status) {
          return res.status(404).json({
            error: { code: 'JOB_NOT_FOUND', message: `Job ${jobId} not found` },
          });
        }

        res.json({
          job_id: jobId,
          status: status.status,
          progress: status.progress,
          output: status.result,
          error: status.error,
        });
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        res.status(500).json({
          error: { code: 'STATUS_CHECK_FAILED', message },
        });
      }
    });

    // Server-Sent Events (SSE) for real-time updates
    this.app.get('/api/jobs/:jobId/stream', (req: AuthRequest, res) => {
      const { jobId } = req.params;

      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');
      res.setHeader('Access-Control-Allow-Origin', '*');

      // Store client connection
      this.sseClients.set(jobId, res);

      // Send initial connection message
      res.write(`data: ${JSON.stringify({ type: 'connected', job_id: jobId })}\n\n`);

      // Clean up on disconnect
      req.on('close', () => {
        this.sseClients.delete(jobId);
        res.end();
      });

      // Send current status
      setInterval(async () => {
        try {
          const status = await getJobStatus(jobId);
          if (status) {
            res.write(
              `data: ${JSON.stringify({ type: 'status_update', ...status, job_id: jobId })}\n\n`
            );
          }
        } catch (error) {
          console.error('[SSE] Error reading job status:', error);
        }
      }, 1000);
    });

    // API Key management (admin endpoints)
    this.app.get('/api/admin/keys', (req: AuthRequest, res) => {
      // Only allow if ADMIN_API_KEY matches
      const adminKey = req.query.admin_key;
      if (adminKey !== process.env.ADMIN_API_KEY) {
        return res.status(403).json({
          error: { code: 'FORBIDDEN', message: 'Admin access required' },
        });
      }

      res.json({
        keys: apiKeyManager.getAllKeys(),
      });
    });

    this.app.post('/api/admin/keys', (req: AuthRequest, res) => {
      const adminKey = req.query.admin_key;
      if (adminKey !== process.env.ADMIN_API_KEY) {
        return res.status(403).json({
          error: { code: 'FORBIDDEN', message: 'Admin access required' },
        });
      }

      const { name, requests_per_minute } = req.body;
      const newKey = apiKeyManager.generateKey(name, requests_per_minute || 60);

      res.status(201).json({
        key: newKey,
        name,
        created_at: new Date().toISOString(),
      });
    });

    // Webhook testing endpoint
    this.app.post('/api/webhooks/test', async (req: AuthRequest, res) => {
      try {
        const { url } = req.body;

        if (!url) {
          return res.status(400).json({
            error: { code: 'INVALID_REQUEST', message: 'url required' },
          });
        }

        const testPayload = {
          job_id: 'test-' + Date.now(),
          status: 'completed' as const,
          progress: 100,
          output: { message: 'Webhook test successful' },
          timestamp: new Date().toISOString(),
        };

        const success = await webhookService.sendUpdate(url, testPayload);

        res.json({
          webhook_url: url,
          delivered: success,
          timestamp: new Date().toISOString(),
        });
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        res.status(500).json({
          error: { code: 'WEBHOOK_TEST_FAILED', message },
        });
      }
    });
  }

  async broadcastJobUpdate(jobId: string, status: any): Promise<void> {
    const client = this.sseClients.get(jobId);
    if (client && !client.destroyed) {
      client.write(`data: ${JSON.stringify({ type: 'update', ...status, job_id: jobId })}\n\n`);
    }
  }

  start(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.app.listen(this.port, '0.0.0.0', () => {
        console.error(`[HTTP Server] 🚀 Started on 0.0.0.0:${this.port}`);
        console.error(`[HTTP Server] Endpoints:`);
        console.error(`  POST   /api/jobs - Create async job`);
        console.error(`  GET    /api/jobs/:jobId - Check job status`);
        console.error(`  GET    /api/jobs/:jobId/stream - Real-time SSE updates`);
        console.error(`  POST   /api/webhooks/test - Test webhook delivery`);
        console.error(`  GET    /health - Health check`);
        // Never resolve - keep server running indefinitely
      }).on('error', (err) => {
        console.error(`[HTTP Server] ❌ Failed to start:`, err);
        reject(err);
      });
    });
  }
}
