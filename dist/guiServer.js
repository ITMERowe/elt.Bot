"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const http_1 = __importDefault(require("http"));
const promises_1 = __importDefault(require("fs/promises"));
const path_1 = __importDefault(require("path"));
const readline_1 = __importDefault(require("readline"));
const child_process_1 = require("child_process");
const config_1 = require("./config");
const storage_1 = require("./services/storage");
const PORT = Number(process.env.GUI_PORT || '4173');
const PUBLIC_DIR = path_1.default.resolve(process.cwd(), 'public');
const ALLOWED_JOBS = {
    update: 'update-fetch',
    send: 'send-new-posts',
    backfill: 'backfill-updates',
    sample: 'send-sample',
    initial: 'initial-fetch',
    monitor: 'dev'
};
let activeProcess = null;
let activeJob = null;
let presenceProcess = null;
let logs = [];
let shuttingDown = false;
let shutdownPromptActive = false;
function sendJson(response, status, body) {
    response.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8' });
    response.end(JSON.stringify(body));
}
function appendLog(value) {
    logs.push(value);
    if (logs.length > 300)
        logs = logs.slice(-300);
}
async function readBody(request) {
    const chunks = [];
    for await (const chunk of request)
        chunks.push(Buffer.from(chunk));
    return Buffer.concat(chunks).toString('utf8');
}
async function getStatus() {
    const state = await (0, storage_1.readState)();
    const lastSentPost = state.lastSentDisc
        ? state.seenPosts.find(post => post.id === state.lastSentDisc)
        : undefined;
    return {
        activeJob,
        running: activeProcess !== null,
        discordOnline: presenceProcess !== null,
        logs,
        state: {
            seen: state.seenPosts.length,
            pinned: state.seenPosts.filter(post => post.pinned).length,
            lastPostId: state.lastPostId,
            lastSentDisc: state.lastSentDisc,
            lastSentTitle: lastSentPost?.title || 'Untitled post'
        },
        posts: state.seenPosts.map(post => ({
            id: post.id,
            title: post.title || 'Untitled post',
            url: post.url,
            locked: !!post.locked,
            pinned: !!post.pinned
        })),
        creatorUrl: config_1.config.ganknowCreatorUrl,
        creatorName: config_1.config.ganknowCreatorName,
        pollIntervalMs: config_1.config.pollIntervalMs
    };
}
function runJob(jobKey) {
    const script = ALLOWED_JOBS[jobKey];
    if (!script || activeProcess)
        return;
    if (jobKey === 'monitor')
        stopPresence();
    const isWindows = process.platform === 'win32';
    const command = isWindows ? 'cmd.exe' : 'npm';
    const commandArgs = isWindows
        ? ['/d', '/s', '/c', `npm.cmd run ${script}`]
        : ['run', script];
    activeJob = jobKey;
    logs = [`[GUI] Starting npm run ${script}`];
    activeProcess = (0, child_process_1.spawn)(command, commandArgs, {
        cwd: process.cwd(),
        env: process.env,
        stdio: ['ignore', 'pipe', 'pipe']
    });
    activeProcess.stdout?.on('data', data => appendLog(String(data).trimEnd()));
    activeProcess.stderr?.on('data', data => appendLog(String(data).trimEnd()));
    activeProcess.on('close', code => {
        appendLog(`[GUI] ${script} finished with exit code ${code ?? 'unknown'}`);
        activeProcess = null;
        activeJob = null;
        if (!shuttingDown)
            startPresence();
    });
    activeProcess.on('error', error => appendLog(`[GUI] Failed to start job: ${error.message}`));
}
function stopJob() {
    if (!activeProcess)
        return;
    appendLog('[GUI] Stopping active job...');
    if (process.platform === 'win32' && activeProcess.pid) {
        (0, child_process_1.spawn)('taskkill', ['/pid', String(activeProcess.pid), '/t', '/f']);
    }
    else {
        activeProcess.kill();
    }
}
function startPresence() {
    if (presenceProcess)
        return;
    const isWindows = process.platform === 'win32';
    const command = isWindows ? 'cmd.exe' : 'npm';
    const commandArgs = isWindows
        ? ['/d', '/s', '/c', 'npm.cmd run presence']
        : ['run', 'presence'];
    appendLog('[GUI] Starting Discord presence');
    presenceProcess = (0, child_process_1.spawn)(command, commandArgs, {
        cwd: process.cwd(),
        env: process.env,
        stdio: ['ignore', 'pipe', 'pipe']
    });
    presenceProcess.stdout?.on('data', data => appendLog(String(data).trimEnd()));
    presenceProcess.stderr?.on('data', data => appendLog(String(data).trimEnd()));
    presenceProcess.on('close', code => {
        appendLog(`[GUI] Discord presence stopped with exit code ${code ?? 'unknown'}`);
        presenceProcess = null;
    });
    presenceProcess.on('error', error => appendLog(`[GUI] Failed to start Discord presence: ${error.message}`));
}
function stopPresence() {
    if (!presenceProcess)
        return;
    appendLog('[GUI] Stopping Discord presence...');
    if (process.platform === 'win32' && presenceProcess.pid) {
        (0, child_process_1.spawn)('taskkill', ['/pid', String(presenceProcess.pid), '/t', '/f']);
    }
    else {
        presenceProcess.kill();
    }
    presenceProcess = null;
}
async function serveStatic(requestPath, response) {
    const requested = requestPath === '/' ? '/index.html' : requestPath;
    const filePath = path_1.default.resolve(PUBLIC_DIR, `.${requested}`);
    if (!filePath.startsWith(PUBLIC_DIR)) {
        response.writeHead(403);
        response.end('Forbidden');
        return;
    }
    try {
        const content = await promises_1.default.readFile(filePath);
        const extension = path_1.default.extname(filePath);
        const contentType = extension === '.html' ? 'text/html; charset=utf-8'
            : extension === '.css' ? 'text/css; charset=utf-8'
                : 'application/javascript; charset=utf-8';
        response.writeHead(200, { 'Content-Type': contentType, 'Cache-Control': 'no-store' });
        response.end(content);
    }
    catch {
        response.writeHead(404);
        response.end('Not found');
    }
}
const server = http_1.default.createServer(async (request, response) => {
    const requestUrl = new URL(request.url || '/', `http://${request.headers.host || 'localhost'}`);
    if (requestUrl.pathname === '/api/status' && request.method === 'GET') {
        sendJson(response, 200, await getStatus());
        return;
    }
    if (requestUrl.pathname === '/api/run' && request.method === 'POST') {
        const body = JSON.parse(await readBody(request) || '{}');
        if (!body.job || !ALLOWED_JOBS[body.job]) {
            sendJson(response, 400, { error: 'Unknown job' });
            return;
        }
        if (activeProcess) {
            sendJson(response, 409, { error: 'Another job is already running' });
            return;
        }
        runJob(body.job);
        sendJson(response, 202, { ok: true });
        return;
    }
    if (requestUrl.pathname === '/api/stop' && request.method === 'POST') {
        stopJob();
        sendJson(response, 200, { ok: true });
        return;
    }
    if (requestUrl.pathname === '/api/shutdown' && request.method === 'POST') {
        sendJson(response, 200, { ok: true });
        setTimeout(shutdown, 50);
        return;
    }
    await serveStatic(requestUrl.pathname, response);
});
server.listen(PORT, '127.0.0.1', () => {
    console.info(`[GUI] Dashboard running at http://127.0.0.1:${PORT}`);
    startPresence();
});
function shutdown() {
    shuttingDown = true;
    stopJob();
    stopPresence();
    server.close();
    setTimeout(() => process.exit(0), 250);
}
process.once('SIGINT', () => {
    if (shutdownPromptActive || shuttingDown)
        return;
    shutdownPromptActive = true;
    const prompt = readline_1.default.createInterface({ input: process.stdin, output: process.stdout });
    prompt.question('\nTurn off the bot and close the GUI? (y/n) ', answer => {
        prompt.close();
        shutdownPromptActive = false;
        if (answer.trim().toLowerCase() === 'y')
            shutdown();
        else
            console.info('[GUI] Shutdown cancelled. Bot and GUI are still running.');
    });
});
process.once('SIGTERM', shutdown);
