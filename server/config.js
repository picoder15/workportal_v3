export default {
  // ----- Layer 1: Snapshots -----
  BACKUP_DIR: './backup',
  BACKUP_COUNT: 60,

  // ----- Layer 2: Append Log -----
  APPEND_DIR: './append_data',
  APPEND_LOG_NAME: 'append.log',
  MAX_APPEND_SIZE: 50 * 1024 * 1024, // 50 MB
  MAX_APPEND_FILES: 50,
  DELETE_OLD_APPEND: true, // false = keep all rotated files forever

  // ----- Layer 0: Crash Recovery -----
  TEMP_FILE: './state_tmp.json',

  // ----- Layer 3: Off‑Site Backups -----
  ENABLE_LOCAL_BACKUP: true,
  LOCAL_BACKUP_DEST: '/storage/emulated/0/WorkPortalBackup',
  LOCAL_BACKUP_RETENTION: 7, // days

  ENABLE_GITHUB_BACKUP: true,
  GITHUB_REPO: 'git@github.com:yourname/yourrepo.git',
  GITHUB_BACKUP_CRON: '0 0 * * *', // daily at midnight
};