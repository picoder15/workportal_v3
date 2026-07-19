#!/usr/bin/env node

import { spawn, execSync } from 'child_process';
import { readFileSync, writeFileSync, existsSync, unlinkSync, mkdirSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = __dirname;  // because portal.js is at root
const PID_FILE = path.join(PROJECT_ROOT, '.portal.pid');
const LOG_FILE = path.join(PROJECT_ROOT, 'portal.log');
const BACKEND_DIR = path.join(PROJECT_ROOT, 'server');
const FRONTEND_DIR = PROJECT_ROOT;

function log(message, isError = false) {
  const timestamp = new Date().toISOString();
  const line = `[${timestamp}] ${message}\n`;
  if (isError) console.error(line.trim());
  else console.log(line.trim());
  if (process.env.PORTAL_BG) {
    writeFileSync(LOG_FILE, line, { flag: 'a' });
  }
}

function killProcess(pid) {
  try {
    process.kill(pid, 'SIGTERM');
    return true;
  } catch (e) {
    return false;
  }
}

function stop() {
  if (existsSync(PID_FILE)) {
    const pid = parseInt(readFileSync(PID_FILE, 'utf8').trim());
    if (killProcess(pid)) {
      log(`Stopped process ${pid}`);
      unlinkSync(PID_FILE);
    } else {
      log(`Process ${pid} not found, removing PID file`);
      unlinkSync(PID_FILE);
    }
  } else {
    log('No PID file found. Is the project running?');
  }
}

function status() {
  if (existsSync(PID_FILE)) {
    const pid = parseInt(readFileSync(PID_FILE, 'utf8').trim());
    try {
      process.kill(pid, 0);
      log(`Running with PID ${pid}`);
    } catch (e) {
      log(`PID file exists but process ${pid} is dead. Run "stop" first.`);
    }
  } else {
    log('Not running');
  }
}

function buildFrontend() {
  log('Building frontend...');
  try {
    // Ensure we are in the frontend directory
    process.chdir(FRONTEND_DIR);
    execSync('npm run build', { stdio: 'inherit' });
    log('Frontend build successful');
  } catch (err) {
    log('Frontend build failed', true);
    throw err;
  }
}

function startProduction(port, foreground = false) {
  const env = { ...process.env, PORT: port.toString() };
  const backendPath = path.join(BACKEND_DIR, 'index.js');
  const args = ['--experimental-specifier-resolution=node', backendPath];

  // Build frontend first (if not in dev mode)
  try {
    buildFrontend();
  } catch (err) {
    process.exit(1);
  }

  if (foreground) {
    const backend = spawn('node', args, { cwd: BACKEND_DIR, stdio: 'inherit', env });
    backend.on('close', (code) => {
      log(`Backend exited with code ${code}`);
      if (existsSync(PID_FILE)) unlinkSync(PID_FILE);
    });
  } else {
    const child = spawn('node', args, {
      cwd: BACKEND_DIR,
      detached: true,
      stdio: ['ignore', 'pipe', 'pipe'],
      env,
    });
    child.stdout.on('data', (data) => log(`[backend] ${data.toString().trim()}`));
    child.stderr.on('data', (data) => log(`[backend error] ${data.toString().trim()}`, true));
    child.unref();
    const pid = child.pid;
    writeFileSync(PID_FILE, pid.toString());
    log(`Started backend in background with PID ${pid} on port ${port}`);
  }
}

function startDev(port, foreground = false) {
  if (!foreground) {
    log('Dev mode in background not recommended. Use --fg to run in foreground.', true);
    process.exit(1);
  }

  const env = { ...process.env, PORT: port.toString() };
  const backendPath = path.join(BACKEND_DIR, 'index.js');
  const backendArgs = ['--experimental-specifier-resolution=node', backendPath];

  const backendProc = spawn('node', backendArgs, { cwd: BACKEND_DIR, stdio: 'pipe', env });
  const viteProc = spawn('npm', ['run', 'dev', '--', '--host', '--port', port], { cwd: FRONTEND_DIR, stdio: 'pipe', env });

  backendProc.stdout.on('data', d => process.stdout.write(`[backend] ${d}`));
  backendProc.stderr.on('data', d => process.stderr.write(`[backend] ${d}`));
  viteProc.stdout.on('data', d => process.stdout.write(`[vite] ${d}`));
  viteProc.stderr.on('data', d => process.stderr.write(`[vite] ${d}`));

  process.on('SIGINT', () => {
    backendProc.kill();
    viteProc.kill();
    process.exit();
  });
}

function parseArgs() {
  const args = process.argv.slice(2);
  const command = args[0];
  const options = {
    port: 8063,
    foreground: false,
    dev: false,
  };
  for (let i = 1; i < args.length; i++) {
    if (args[i] === '--port' && args[i+1]) {
      options.port = parseInt(args[i+1]);
      i++;
    } else if (args[i] === '--bg') {
      options.foreground = false;
    } else if (args[i] === '--fg') {
      options.foreground = true;
    } else if (args[i] === '--dev') {
      options.dev = true;
    }
  }
  return { command, options };
}

const { command, options } = parseArgs();

switch (command) {
  case 'start':
    if (existsSync(PID_FILE)) {
      log('Project already running. Use "stop" first.');
      process.exit(1);
    }
    if (options.dev) {
      startDev(options.port, options.foreground);
    } else {
      startProduction(options.port, options.foreground);
    }
    break;
  case 'stop':
    stop();
    break;
  case 'restart':
    stop();
    setTimeout(() => {
      if (options.dev) startDev(options.port, options.foreground);
      else startProduction(options.port, options.foreground);
    }, 1000);
    break;
  case 'status':
    status();
    break;
  case 'logs':
    if (existsSync(LOG_FILE)) {
      const logContent = readFileSync(LOG_FILE, 'utf8');
      console.log(logContent);
    } else {
      log('No log file found.');
    }
    break;
  default:
    console.log(`
Portal Management Script – Run from project root

Usage:
  node portal.js start [--dev] [--port <number>] [--fg] [--bg]
  node portal.js stop
  node portal.js restart [--dev] [--port <number>] [--fg]
  node portal.js status
  node portal.js logs

Options:
  --dev         Run in development mode (Vite dev server + backend)
  --port <num>  Set HTTP port (default 8063)
  --fg          Run in foreground (logs to console)
  --bg          Run in background (default, writes to portal.log)

Examples:
  node portal.js start                    # production, background, port 8063
  node portal.js start --dev --fg         # development, foreground
  node portal.js start --port 3000 --fg   # production on port 3000
  node portal.js stop
  node portal.js restart --dev
  node portal.js status
  node portal.js logs
`);
    break;
}