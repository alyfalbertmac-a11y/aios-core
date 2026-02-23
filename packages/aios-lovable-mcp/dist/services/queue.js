import { Queue, Worker, QueueEvents } from 'bullmq';
import { createClient } from 'redis';
import { nanoid } from 'nanoid';
// Create Redis clients for BullMQ
const redisClient = createClient({
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379', 10),
});
redisClient.on('error', (err) => {
    console.error('[Queue] Redis error:', err);
});
export const jobQueue = new Queue('aios-jobs', {
    connection: redisClient,
    defaultJobOptions: {
        attempts: 3,
        backoff: {
            type: 'exponential',
            delay: 2000,
        },
        removeOnComplete: {
            age: 3600, // Keep completed jobs for 1 hour
        },
        removeOnFail: {
            age: 86400, // Keep failed jobs for 24 hours
        },
    },
});
export const queueEvents = new QueueEvents('aios-jobs', { connection: redisClient });
const jobStatus = new Map();
export async function createJob(data) {
    const jobId = nanoid(12);
    const job = await jobQueue.add(`task-${data.tool}`, data, {
        jobId,
        priority: data.priority ? data.priority : 'normal',
    });
    jobStatus.set(jobId, { status: 'queued', progress: 0 });
    return jobId;
}
export async function getJobStatus(jobId) {
    const cached = jobStatus.get(jobId);
    if (!cached) {
        return null;
    }
    const job = await jobQueue.getJob(jobId);
    if (!job) {
        return cached;
    }
    const state = await job.getState();
    let progressValue = 0;
    try {
        const progressData = job.progress;
        if (typeof progressData === 'number') {
            progressValue = progressData;
        }
        else if (typeof progressData === 'object' && progressData && 'progress' in progressData) {
            progressValue = progressData.progress;
        }
    }
    catch {
        progressValue = 0;
    }
    return {
        status: state,
        progress: progressValue || 0,
        result: job.returnvalue,
        error: job.failedReason || undefined,
    };
}
export async function getJobResult(jobId) {
    const job = await jobQueue.getJob(jobId);
    if (!job) {
        return null;
    }
    const state = await job.getState();
    if (state === 'completed') {
        return job.returnvalue;
    }
    if (state === 'failed') {
        throw new Error(`Job failed: ${job.failedReason || 'Unknown error'}`);
    }
    return null;
}
export async function waitForJob(jobId, timeout = 300000) {
    const job = await jobQueue.getJob(jobId);
    if (!job) {
        throw new Error(`Job not found: ${jobId}`);
    }
    return new Promise((resolve, reject) => {
        const timer = setTimeout(() => {
            reject(new Error(`Job timeout after ${timeout}ms`));
        }, timeout);
        queueEvents.on('completed', (event) => {
            if (event.jobId === jobId) {
                clearTimeout(timer);
                resolve(event.returnvalue);
            }
        });
        queueEvents.on('failed', (event) => {
            if (event.jobId === jobId) {
                clearTimeout(timer);
                reject(new Error(`Job failed: ${event.failedReason || 'Unknown error'}`));
            }
        });
        // Check if already completed
        job.isCompleted().then((completed) => {
            if (completed) {
                clearTimeout(timer);
                resolve(job.returnvalue);
            }
        });
    });
}
// Register job processor
export function registerJobProcessor(handler) {
    new Worker('aios-jobs', async (job) => {
        const jobId = job.id;
        try {
            const status = jobStatus.get(jobId);
            if (status) {
                status.status = 'processing';
            }
            const result = await handler(job);
            if (status) {
                status.status = 'completed';
                status.result = result;
            }
            return result;
        }
        catch (error) {
            const status = jobStatus.get(jobId);
            if (status) {
                status.status = 'failed';
                status.error = error instanceof Error ? error.message : String(error);
            }
            throw error;
        }
    }, {
        connection: redisClient,
        concurrency: parseInt(process.env.QUEUE_CONCURRENCY || '5', 10),
    });
}
export async function cleanup() {
    await redisClient.quit();
}
//# sourceMappingURL=queue.js.map