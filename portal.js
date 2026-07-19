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

function log(message) {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] ${message}`);
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

function startProduction(port, foreground = false, forceRebuild = false) {
  const env = { ...process.env, PORT: port.toString() };
  const backendPath = path.join(BACKEND_DIR, 'index.js');
  const distPath = path.join(FRONTEND_DIR, 'dist', 'index.html');
  const needsBuild = forceRebuild || !existsSync(distPath);

  if (needsBuild) {
    log('Building frontend...');
    const build = spawn('npm', ['run', 'build'], { cwd: FRONTEND_DIR, stdio: 'inherit' });
    build.on('close', (code) => {
      if (code !== 0) {
        log('Frontend build failed');
        process.exit(1);
      }
      log('Build complete. Starting backend.');
      startBackend(backendPath, port, foreground, env);
    });
  } else {
    log('Using existing build (dist/). Start backend immediately.');
    startBackend(backendPath, port, foreground, env);
  }
}

function startBackend(backendPath, port, foreground, env) {
  const args = ['--experimental-specifier-resolution=node', backendPath];
  if (foreground) {
    const child = spawn('node', args, { cwd: BACKEND_DIR, stdio: 'inherit', env });
    child.on('close', (code) => {
      log(`Backend exited with code ${code}`);
      if (existsSync(PID_FILE)) unlinkSync(PID_FILE);
    });
  } else {
    const child = spawn('node', args, {
      cwd: BACKEND_DIR,
      detached: true,
      stdio: 'ignore',
      env,
    });
    child.unref();
    const pid = child.pid;
    writeFileSync(PID_FILE, pid.toString());
    log(`Started backend in background with PID ${pid} on port ${port}`);
    process.exit(0);
  }
}

function startDev(port, foreground = false) {
  if (!foreground) {
    log('Dev mode in background not supported. Use --fg.');
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
    port: 8064,
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
    // Inside parseArgs()
    else if (args[i] === '--rebuild') {
      options.rebuild = true;
    }
  }
  return { command, options };
}

const { command, options } = parseArgs();

switch (command) {
  case 'start':
    if (existsSync(PID_FILE) && !options.foreground) {
      log('Project already running in background. Use "stop" first.');
      process.exit(1);
    }
    if (options.dev) {
      startDev(options.port, options.foreground);
    } else {
      startProduction(options.port, options.foreground, options.rebuild);
    }
    break;
  case 'stop':
    stop();
    break;
  case 'restart':
    stop();
    setTimeout(() => {
      if (options.dev) startDev(options.port, options.foreground);
      else startProduction(options.port, options.foreground, options.rebuild);
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
  --bg          Run in background (default, parent exits immediately)

Examples:
  node portal.js start                    # production, background
  node portal.js start --fg               # production, foreground
  node portal.js start --dev --fg         # development, foreground
  node portal.js stop
  node portal.js restart
  node portal.js status
`);
    break;
}
