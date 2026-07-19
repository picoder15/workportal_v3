import express from 'express';
import cors from 'cors';
import fs from 'fs/promises';
import fsSync from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import cron from 'node-cron';
import writeFileAtomic from 'write-file-atomic';
import config from './config.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.PORT || 8064;

// ---------- Configuration ----------
const {
  BACKUP_DIR,
  BACKUP_COUNT,
  APPEND_DIR,
  APPEND_LOG_NAME,
  MAX_APPEND_SIZE,
  MAX_APPEND_FILES,
  DELETE_OLD_APPEND,
  TEMP_FILE,
  ENABLE_LOCAL_BACKUP,
  LOCAL_BACKUP_DEST,
  LOCAL_BACKUP_RETENTION,
  ENABLE_GITHUB_BACKUP,
  GITHUB_REPO,
  GITHUB_BACKUP_CRON,
} = config;

const STATE_FILE = path.join(__dirname, 'state.json');
const TEMP_PATH = path.join(__dirname, TEMP_FILE);
const BACKUP_PATH = path.join(__dirname, BACKUP_DIR);
const APPEND_PATH = path.join(__dirname, APPEND_DIR);
const APPEND_LOG_PATH = path.join(APPEND_PATH, APPEND_LOG_NAME);

// Ensure required directories exist
async function ensureDirectories() {
  for (const dir of [BACKUP_PATH, APPEND_PATH]) {
    if (!fsSync.existsSync(dir)) {
      await fs.mkdir(dir, { recursive: true });
    }
  }
}
await ensureDirectories();

// ---------- Helper: read state ----------
async function readState() {
  try {
    const data = await fs.readFile(STATE_FILE, 'utf-8');
    return JSON.parse(data);
  } catch (err) {
    // Return default state if file missing or corrupted
    return {
      pages: [],
      sidebarTitle: 'My Workspace',
      sidebarTitleLocked: false,
      activePageId: null,
      activeSubPageId: null,
      theme: 'light',
      currentView: 'editor',
      recentPages: [],
      shortcuts: [],
      pinnedPages: [],
      _updatedAt: 0,
    };
  }
}

// ---------- Helper: atomic write of state (with snapshot & append) ----------
async function writeStateWithProtection(newState) {
  // 1. Validate
  if (typeof newState !== 'object' || newState === null) {
    throw new Error('Invalid state object');
  }

  // 2. Create snapshot backup of current state (if it exists)
  try {
    const currentContent = await fs.readFile(STATE_FILE, 'utf-8');
    const currentState = JSON.parse(currentContent);
    // only backup if it's valid and not empty
    if (Object.keys(currentState).length > 0) {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const backupFile = path.join(BACKUP_PATH, `state_${timestamp}.json`);
      await fs.writeFile(backupFile, JSON.stringify(currentState, null, 2));
      // Rotate snapshots: keep only latest BACKUP_COUNT
      const files = await fs.readdir(BACKUP_PATH);
      const snapshots = files
        .filter(f => f.startsWith('state_') && f.endsWith('.json'))
        .sort();
      while (snapshots.length > BACKUP_COUNT) {
        const oldest = snapshots.shift();
        await fs.unlink(path.join(BACKUP_PATH, oldest));
      }
    }
  } catch (err) {
    // if state.json doesn't exist or is corrupted, skip backup
    console.log('Snapshot backup skipped (no valid current state)');
  }

  // 3. Atomic write to state.json using write-file-atomic
  const dataToStore = {
    ...newState,
    _updatedAt: Date.now(),
  };
  await writeFileAtomic(STATE_FILE, JSON.stringify(dataToStore, null, 2));

  // 4. Append to log
  await appendToLog(newState);
}

// ---------- Helper: append to log ----------
async function appendToLog(stateData) {
  // Prepare log entry
  const entry = {
    timestamp: new Date().toISOString(),
    data: stateData,
  };
  const line = JSON.stringify(entry) + '\n';

  // Ensure append directory exists
  if (!fsSync.existsSync(APPEND_PATH)) {
    await fs.mkdir(APPEND_PATH, { recursive: true });
  }

  // Check active log file for corruption and size
  let activeLogPath = APPEND_LOG_PATH;
  let logExists = false;
  try {
    await fs.access(activeLogPath);
    logExists = true;
  } catch {
    logExists = false;
  }

  if (logExists) {
    // Check corruption: try to parse each line
    try {
      const content = await fs.readFile(activeLogPath, 'utf-8');
      const lines = content.split('\n').filter(l => l.trim() !== '');
      for (const line of lines) {
        JSON.parse(line); // will throw if invalid
      }
    } catch (err) {
      // Corrupted – rename to .corrupted.log
      const corruptedName = `append_${new Date().toISOString().replace(/[:.]/g, '-')}.corrupted.log`;
      const corruptedPath = path.join(APPEND_PATH, corruptedName);
      await fs.rename(activeLogPath, corruptedPath);
      // Start fresh
      logExists = false;
    }

    // Check size
    if (logExists) {
      const stats = await fs.stat(activeLogPath);
      if (stats.size >= MAX_APPEND_SIZE) {
        // Rotate: rename to timestamped log
        const rotatedName = `append_${new Date().toISOString().replace(/[:.]/g, '-')}.log`;
        const rotatedPath = path.join(APPEND_PATH, rotatedName);
        await fs.rename(activeLogPath, rotatedPath);
        logExists = false;

        // Rotate old log files (keep only MAX_APPEND_FILES, exclude .corrupted)
        if (DELETE_OLD_APPEND) {
          const allFiles = await fs.readdir(APPEND_PATH);
          const logFiles = allFiles
            .filter(f => f.startsWith('append_') && f.endsWith('.log') && !f.includes('.corrupted.'))
            .sort();
          while (logFiles.length > MAX_APPEND_FILES) {
            const oldest = logFiles.shift();
            await fs.unlink(path.join(APPEND_PATH, oldest));
          }
        }
      }
    }
  }

  // Now append the new line atomically (write to temp, then rename)
  if (!logExists) {
    // Create new empty log file
    await fs.writeFile(activeLogPath, '');
  }

  // Atomic append: write to .tmp then rename
  const tempAppendPath = activeLogPath + '.tmp';
  // Read existing content (if any) and append new line
  let existingContent = '';
  try {
    existingContent = await fs.readFile(activeLogPath, 'utf-8');
  } catch {
    existingContent = '';
  }
  const newContent = existingContent + line;
  await writeFileAtomic(activeLogPath, newContent);
}

// ---------- Server Startup: recover from temp file ----------
async function recoverFromTemp() {
  try {
    await fs.access(TEMP_PATH);
    // Temp exists – rename to state.json
    console.log('Recovering from previous crash: state_tmp.json found.');
    await fs.rename(TEMP_PATH, STATE_FILE);
    console.log('Recovery successful.');
  } catch (err) {
    // No temp file, normal start
  }
}
await recoverFromTemp();

// ---------- Express Middleware ----------
app.use(cors());
app.use(express.json({ limit: '10mb' }));

// ---------- Routes ----------

// GET current state (without internal fields)
app.get('/api/state', async (req, res) => {
  try {
    const state = await readState();
    const { _updatedAt, ...cleanState } = state;
    res.json(cleanState);
  } catch (err) {
    res.status(500).json({ error: 'Failed to read state' });
  }
});

// PUT update state (with full protection)
app.put('/api/state', async (req, res) => {
  try {
    await writeStateWithProtection(req.body);
    res.json({ ok: true });
  } catch (err) {
    console.error('Save error:', err);
    res.status(500).json({ error: err.message });
  }
});

// GET timestamp (for polling)
app.get('/api/state/timestamp', async (req, res) => {
  try {
    const state = await readState();
    res.json({ updatedAt: state._updatedAt || 0 });
  } catch {
    res.json({ updatedAt: 0 });
  }
});

// ---------- Admin Endpoints ----------

// GET list of snapshots (backups)
app.get('/api/backups', async (req, res) => {
  try {
    const files = await fs.readdir(BACKUP_PATH);
    const backups = files
      .filter(f => f.startsWith('state_') && f.endsWith('.json'))
      .map(f => {
        const stat = fsSync.statSync(path.join(BACKUP_PATH, f));
        return {
          name: f,
          size: stat.size,
          timestamp: f.replace('state_', '').replace('.json', ''),
        };
      })
      .sort((a, b) => b.timestamp.localeCompare(a.timestamp));
    res.json(backups);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST restore from a snapshot
app.post('/api/restore', async (req, res) => {
  try {
    const { backupName } = req.body;
    if (!backupName) return res.status(400).json({ error: 'Missing backupName' });
    const backupPath = path.join(BACKUP_PATH, backupName);
    if (!fsSync.existsSync(backupPath)) {
      return res.status(404).json({ error: 'Backup not found' });
    }
    const content = await fs.readFile(backupPath, 'utf-8');
    const state = JSON.parse(content);
    // Write with protection (this will create a snapshot of current state first)
    await writeStateWithProtection(state);
    res.json({ ok: true, message: `Restored from ${backupName}` });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET export current state
app.get('/api/export', async (req, res) => {
  try {
    const content = await fs.readFile(STATE_FILE, 'utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="workportal_state.json"');
    res.setHeader('Content-Type', 'application/json');
    res.send(content);
  } catch (err) {
    res.status(500).json({ error: 'Export failed' });
  }
});

// POST import state (upload JSON)
app.post('/api/import', async (req, res) => {
  try {
    const newState = req.body;
    if (typeof newState !== 'object') {
      return res.status(400).json({ error: 'Invalid JSON object' });
    }
    await writeStateWithProtection(newState);
    res.json({ ok: true, message: 'Import successful' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET list of append log files (for admin)
app.get('/api/append-logs', async (req, res) => {
  try {
    const files = await fs.readdir(APPEND_PATH);
    const logs = files
      .filter(f => f.endsWith('.log'))
      .map(f => {
        const stat = fsSync.statSync(path.join(APPEND_PATH, f));
        return {
          name: f,
          size: stat.size,
          isActive: f === APPEND_LOG_NAME,
          isCorrupted: f.includes('.corrupted.'),
        };
      })
      .sort((a, b) => a.name.localeCompare(b.name));
    res.json(logs);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Serve admin panel
app.get('/admin', (req, res) => {
  res.sendFile(path.join(__dirname, 'admin.html'));
});


// ---------- Static files for frontend (production) ----------
const distPath = path.join(__dirname, '..', 'dist');
app.use(express.static(distPath));
app.get('*', (req, res) => {
  res.sendFile(path.join(distPath, 'index.html'));
});

// ---------- Start server ----------
const server = app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`State file: ${STATE_FILE}`);
  console.log(`Backup dir: ${BACKUP_PATH}`);
  console.log(`Append log dir: ${APPEND_PATH}`);
});

// ---------- Cron Jobs (if enabled) ----------

// Local backup (phone/SD)
if (ENABLE_LOCAL_BACKUP) {
  // Run every hour
  cron.schedule('0 * * * *', async () => {
    try {
      console.log('Running local backup...');
      const dest = LOCAL_BACKUP_DEST;
      if (!dest) return;
      const destDir = path.join(dest, `backup_${new Date().toISOString().slice(0,10)}`);
      await fs.mkdir(destDir, { recursive: true });
      // Copy state.json
      await fs.copyFile(STATE_FILE, path.join(destDir, 'state.json'));
      // Copy backup folder (snapshots)
      // We'll just copy the entire backup folder (could be large; we limit to latest day)
      // For simplicity, we'll copy the last BACKUP_COUNT snapshots
      const snapshots = await fs.readdir(BACKUP_PATH);
      const latest = snapshots.filter(f => f.startsWith('state_')).sort().slice(-BACKUP_COUNT);
      for (const file of latest) {
        await fs.copyFile(path.join(BACKUP_PATH, file), path.join(destDir, file));
      }
      // Copy append logs (latest MAX_APPEND_FILES)
      const appendFiles = await fs.readdir(APPEND_PATH);
      const appendLatest = appendFiles.filter(f => f.endsWith('.log')).sort().slice(-MAX_APPEND_FILES);
      for (const file of appendLatest) {
        await fs.copyFile(path.join(APPEND_PATH, file), path.join(destDir, file));
      }
      // Rotate local backups: keep only LOCAL_BACKUP_RETENTION days
      const allDirs = await fs.readdir(path.dirname(dest));
      const backupDirs = allDirs.filter(d => d.startsWith('backup_')).sort();
      while (backupDirs.length > LOCAL_BACKUP_RETENTION) {
        const oldest = backupDirs.shift();
        await fs.rm(path.join(path.dirname(dest), oldest), { recursive: true, force: true });
      }
      console.log('Local backup completed.');
    } catch (err) {
      console.error('Local backup failed:', err);
    }
  });
}

// GitHub backup
if (ENABLE_GITHUB_BACKUP) {
  // Run daily (or custom cron)
  cron.schedule(GITHUB_BACKUP_CRON, async () => {
    try {
      console.log('Running GitHub backup...');
      // We'll use simple git commands via exec
      const { exec } = await import('child_process');
      const repoDir = path.join(__dirname, '..', '.git_backup_repo');
      // Clone if not exists
      if (!fsSync.existsSync(repoDir)) {
        await new Promise((resolve, reject) => {
          exec(`git clone ${GITHUB_REPO} ${repoDir}`, (err) => {
            if (err) reject(err);
            else resolve();
          });
        });
      }
      // Copy current state and snapshots to repo
      await fs.copyFile(STATE_FILE, path.join(repoDir, 'state.json'));
      // We'll also copy the latest 10 snapshots and latest append log
      const snapshots = await fs.readdir(BACKUP_PATH);
      const latestSnapshots = snapshots.filter(f => f.startsWith('state_')).sort().slice(-10);
      for (const f of latestSnapshots) {
        await fs.copyFile(path.join(BACKUP_PATH, f), path.join(repoDir, f));
      }
      // Copy append logs (latest 5)
      const appendFiles = await fs.readdir(APPEND_PATH);
      const latestAppend = appendFiles.filter(f => f.endsWith('.log')).sort().slice(-5);
      for (const f of latestAppend) {
        await fs.copyFile(path.join(APPEND_PATH, f), path.join(repoDir, f));
      }
      // Git add, commit, push
      await new Promise((resolve, reject) => {
        exec(`cd ${repoDir} && git add . && git commit -m "Auto backup ${new Date().toISOString()}" && git push`, (err) => {
          if (err) reject(err);
          else resolve();
        });
      });
      console.log('GitHub backup completed.');
    } catch (err) {
      console.error('GitHub backup failed:', err);
    }
  });
}

// ---------- Graceful shutdown ----------
process.on('SIGINT', async () => {
  console.log('Shutting down gracefully...');
  // Optionally, we could do a final backup, but it's not necessary as we have auto-backup on each save.
  server.close(() => {
    console.log('Server closed.');
    process.exit(0);
  });
});
