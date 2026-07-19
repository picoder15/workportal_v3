#!/usr/bin/env node

import { spawn, exec } from 'child_process';
import { readFileSync, writeFileSync, existsSync, unlinkSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PID_FILE = path.join(__dirname, '.portal.pid');
const LOG_FILE = path.join(__dirname, 'portal.log');
const BACKEND_DIR = path.join(__dirname, 'server');
const FRONTEND_DIR = __dirname;

let currentProc = null;

function log(message) {
  const timestamp = new Date().toISOString();
  const line = `[${timestamp}] ${message}\n`;
  console.log(line.trim());
  // Also append to log file if in background mode (optional)
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
      process.kill(pid, 0); // check existence
      log(`Running with PID ${pid}`);
    } catch (e) {
      log(`PID file exists but process ${pid} is dead. Run "stop" first.`);
    }
  } else {
    log('Not running');
  }
}

function startProduction(port, foreground = false) {
  const env = { ...process.env, PORT: port.toString() };
  const backendPath = path.join(BACKEND_DIR, 'index.js');
  const args = ['--experimental-specifier-resolution=node', backendPath];
  
  // Build frontend first
  log('Building frontend...');
  const build = spawn('npm', ['run', 'build'], { cwd: FRONTEND_DIR, stdio: 'inherit' });
  build.on('close', (code) => {
    if (code !== 0) {
      log('Frontend build failed');
      process.exit(1);
    }
    log('Build complete. Starting backend.');
    if (foreground) {
      // Run in foreground
      currentProc = spawn('node', args, { cwd: BACKEND_DIR, stdio: 'inherit', env });
      currentProc.on('close', (code) => {
        log(`Backend exited with code ${code}`);
        if (existsSync(PID_FILE)) unlinkSync(PID_FILE);
      });
    } else {
      // Run in background
      const child = spawn('node', args, {
        cwd: BACKEND_DIR,
        detached: true,
        stdio: ['ignore', 'pipe', 'pipe'],
        env,
      });
      child.stdout.on('data', (data) => log(`[backend] ${data.toString().trim()}`));
      child.stderr.on('data', (data) => log(`[backend error] ${data.toString().trim()}`));
      child.unref();
      const pid = child.pid;
      writeFileSync(PID_FILE, pid.toString());
      log(`Started backend in background with PID ${pid} on port ${port}`);
    }
  });
}

function startDev(port, foreground = false) {
  const env = { ...process.env, PORT: port.toString() };
  const backendPath = path.join(BACKEND_DIR, 'index.js');
  const backendArgs = ['--experimental-specifier-resolution=node', backendPath];
  
  if (foreground) {
    // Run both in same terminal using concurrently style – simpler: run backend then run vite, but they block.
    // Use a simple approach: spawn both and keep parent alive.
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
  } else {
    // Background mode: start both but we only track backend PID? Vite also needs to run.
    // Simpler: run backend and vite in background, but we'll just start backend and then separately run vite.
    // For background, we can start only backend in background and use a separate process for Vite? Not ideal.
    log('Dev mode in background not recommended. Use foreground (omit --bg) or run in separate terminal.');
    process.exit(1);
  }
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
    // Wait a bit
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
Portal Management Script

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