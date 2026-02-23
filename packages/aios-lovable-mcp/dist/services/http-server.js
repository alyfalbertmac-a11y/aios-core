/**
 * HTTP REST API Server for Lovable Integration
 *
 * Provides REST endpoints for job management and SSE for real-time updates.
 * Also integrates MCP server via stdio.
 */
import express from 'express';
import { jobQueue, getJobStatus } from './queue.js';
import { apiKeyManager } from './api-keys.js';
import { webhookService } from './webhook.js';
export class HttpServer {
    app;
    port;
    sseClients = new Map();
    constructor(port = 3000) {
        this.port = port;
        this.app = express();
        this.setupMiddleware();
        this.setupRoutes();
    }
    setupMiddleware() {
        // Parse JSON
        this.app.use(express.json({ limit: '10mb' }));
        // API Key validation middleware
        this.app.use((req, res, next) => {
            const authHeader = req.headers.authorization || '';
            const match = authHeader.match(/Bearer\s+(.+)/);
            const apiKey = match ? match[1] : req.query.api_key;
            // Skip auth for health check
            if (req.path === '/health') {
                return next();
            }
            if (!apiKey) {
                return res.status(401).json({
                    error: { code: 'UNAUTHORIZED', message: 'API key required' },
                });
            }
            const validation = apiKeyManager.validateKey(apiKey);
            if (!validation.valid) {
                return res.status(401).json({
                    error: { code: 'INVALID_KEY', message: validation.error },
                });
            }
            // Check rate limit
            const rateLimit = apiKeyManager.checkRateLimit(apiKey);
            if (!rateLimit.allowed) {
                return res.status(429).json({
                    error: { code: 'RATE_LIMITED', message: rateLimit.error },
                });
            }
            req.apiKey = apiKey;
            res.set('X-RateLimit-Remaining', String(rateLimit.remaining || 0));
            next();
        });
    }
    setupRoutes() {
        // Health check
        this.app.get('/health', (req, res) => {
            res.json({
                status: 'healthy',
                uptime: process.uptime(),
                timestamp: new Date().toISOString(),
            });
        });
        // Create async job
        this.app.post('/api/jobs', async (req, res) => {
            try {
                const { tool, input, webhook_url } = req.body;
                if (!tool || !input) {
                    return res.status(400).json({
                        error: { code: 'INVALID_REQUEST', message: 'tool and input required' },
                    });
                }
                const jobData = {
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
            }
            catch (error) {
                const message = error instanceof Error ? error.message : String(error);
                res.status(500).json({
                    error: { code: 'JOB_CREATION_FAILED', message },
                });
            }
        });
        // Get job status
        this.app.get('/api/jobs/:jobId', async (req, res) => {
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
            }
            catch (error) {
                const message = error instanceof Error ? error.message : String(error);
                res.status(500).json({
                    error: { code: 'STATUS_CHECK_FAILED', message },
                });
            }
        });
        // Server-Sent Events (SSE) for real-time updates
        this.app.get('/api/jobs/:jobId/stream', (req, res) => {
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
                        res.write(`data: ${JSON.stringify({ type: 'status_update', ...status, job_id: jobId })}\n\n`);
                    }
                }
                catch (error) {
                    console.error('[SSE] Error reading job status:', error);
                }
            }, 1000);
        });
        // API Key management (admin endpoints)
        this.app.get('/api/admin/keys', (req, res) => {
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
        this.app.post('/api/admin/keys', (req, res) => {
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
        this.app.post('/api/webhooks/test', async (req, res) => {
            try {
                const { url } = req.body;
                if (!url) {
                    return res.status(400).json({
                        error: { code: 'INVALID_REQUEST', message: 'url required' },
                    });
                }
                const testPayload = {
                    job_id: 'test-' + Date.now(),
                    status: 'completed',
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
            }
            catch (error) {
                const message = error instanceof Error ? error.message : String(error);
                res.status(500).json({
                    error: { code: 'WEBHOOK_TEST_FAILED', message },
                });
            }
        });
    }
    async broadcastJobUpdate(jobId, status) {
        const client = this.sseClients.get(jobId);
        if (client && !client.destroyed) {
            client.write(`data: ${JSON.stringify({ type: 'update', ...status, job_id: jobId })}\n\n`);
        }
    }
    start() {
        return new Promise((resolve) => {
            this.app.listen(this.port, () => {
                console.error(`[HTTP Server] 🚀 Started on port ${this.port}`);
                console.error(`[HTTP Server] Endpoints:`);
                console.error(`  POST   /api/jobs - Create async job`);
                console.error(`  GET    /api/jobs/:jobId - Check job status`);
                console.error(`  GET    /api/jobs/:jobId/stream - Real-time SSE updates`);
                console.error(`  POST   /api/webhooks/test - Test webhook delivery`);
                console.error(`  GET    /health - Health check`);
                resolve();
            });
        });
    }
}
//# sourceMappingURL=http-server.js.map