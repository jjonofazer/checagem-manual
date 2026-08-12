const fs = require('node:fs');
const fsp = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const zlib = require('node:zlib');
const { spawn, spawnSync } = require('node:child_process');
const { pipeline } = require('node:stream/promises');
const dotenv = require('dotenv');
const mysql = require('mysql2');
const mysqlPromise = require('mysql2/promise');

const SERVER_DIR = __dirname;
dotenv.config({ path: path.join(SERVER_DIR, '.env') });

let backupRunning = false;
let schedulerStarted = false;

function boolEnv(value, fallback = false) {
  if (value == null || value === '') return fallback;
  return ['1', 'true', 'sim', 'yes', 'on'].includes(String(value).trim().toLowerCase());
}

function numberEnv(value, fallback) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function stripQuotes(value) {
  return String(value || '').trim().replace(/^["']|["']$/g, '');
}

function resolveConfiguredPath(value, fallback) {
  const clean = stripQuotes(value);
  if (!clean) return fallback;
  return path.isAbsolute(clean) ? clean : path.resolve(SERVER_DIR, clean);
}

function getDbConfig() {
  return {
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'checagem_manual'
  };
}

function getBackupConfig() {
  return {
    enabled: boolEnv(process.env.BACKUP_ENABLED, false),
    runOnStart: boolEnv(process.env.BACKUP_RUN_ON_START, true),
    startDelaySeconds: numberEnv(process.env.BACKUP_START_DELAY_SECONDS, 30),
    time: process.env.BACKUP_TIME || '02:00',
    retentionDays: numberEnv(process.env.BACKUP_RETENTION_DAYS, 30),
    outputDir: resolveConfiguredPath(process.env.BACKUP_OUTPUT_DIR, path.join(SERVER_DIR, 'backups')),
    certPath: resolveConfiguredPath(
      process.env.BACKUP_CERT_PATH || process.env.BACKUP_PFX_PATH || process.env.BACKUP_CERT_PFX,
      path.resolve(SERVER_DIR, '..', 'backup-keys', 'backup-checagem.pfx')
    ),
    pfxPassword: process.env.BACKUP_PFX_PASSWORD || ''
  };
}

function quoteIdentifier(value) {
  return `\`${String(value).replace(/`/g, '``')}\``;
}

function sqlValue(value) {
  if (value === null || value === undefined) return 'NULL';
  if (Buffer.isBuffer(value)) return `X'${value.toString('hex')}'`;
  if (value instanceof Date) return mysql.escape(value.toISOString().slice(0, 19).replace('T', ' '));
  if (typeof value === 'number') return Number.isFinite(value) ? String(value) : 'NULL';
  if (typeof value === 'bigint') return String(value);
  if (typeof value === 'boolean') return value ? '1' : '0';
  if (typeof value === 'object') return mysql.escape(JSON.stringify(value));
  return mysql.escape(String(value));
}

function mysqlOptionValue(value) {
  return `"${String(value).replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/\r?\n/g, '')}"`;
}

function timestamp() {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  return [
    d.getFullYear(),
    pad(d.getMonth() + 1),
    pad(d.getDate()),
    '-',
    pad(d.getHours()),
    pad(d.getMinutes()),
    pad(d.getSeconds())
  ].join('');
}

function findExecutable(name) {
  const result = spawnSync('where.exe', [name], { encoding: 'utf8' });
  if (result.status === 0) {
    const first = result.stdout.split(/\r?\n/).map((line) => line.trim()).find(Boolean);
    if (first) return first;
  }

  const knownPaths = [
    `C:\\Program Files\\MySQL\\MySQL Server 8.0\\bin\\${name}`,
    `C:\\Program Files\\MySQL\\MySQL Server 8.4\\bin\\${name}`,
    `C:\\xampp\\mysql\\bin\\${name}`,
    `C:\\wamp64\\bin\\mysql\\mysql8.0.31\\bin\\${name}`
  ];

  return knownPaths.find((candidate) => fs.existsSync(candidate)) || '';
}

function run(command, args, options = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      stdio: options.stdio || 'inherit',
      env: options.env || process.env,
      cwd: options.cwd || SERVER_DIR
    });

    child.on('error', reject);
    child.on('exit', (code) => {
      if (code === 0) resolve();
      else reject(new Error(`${command} saiu com codigo ${code}`));
    });
  });
}

async function dumpWithMysqldump(outputPath, dbConfig, tempDir) {
  const mysqldumpPath = findExecutable('mysqldump.exe') || findExecutable('mysqldump');
  if (!mysqldumpPath) return false;

  const defaultsPath = path.join(tempDir, 'mysql-backup.cnf');
  const defaults = [
    '[client]',
    `host=${mysqlOptionValue(dbConfig.host)}`,
    `port=${mysqlOptionValue(dbConfig.port)}`,
    `user=${mysqlOptionValue(dbConfig.user)}`,
    `password=${mysqlOptionValue(dbConfig.password)}`,
    'default-character-set=utf8mb4',
    ''
  ].join(os.EOL);

  await fsp.writeFile(defaultsPath, defaults);

  console.log(`[backup] Usando mysqldump: ${mysqldumpPath}`);
  const child = spawn(mysqldumpPath, [
    `--defaults-extra-file=${defaultsPath}`,
    '--single-transaction',
    '--routines',
    '--events',
    '--triggers',
    '--default-character-set=utf8mb4',
    dbConfig.database
  ], {
    stdio: ['ignore', 'pipe', 'inherit'],
    cwd: SERVER_DIR
  });

  const exitPromise = new Promise((resolve, reject) => {
    child.on('error', reject);
    child.on('exit', (code) => {
      if (code === 0) resolve();
      else reject(new Error(`mysqldump saiu com codigo ${code}`));
    });
  });

  await Promise.all([
    pipeline(child.stdout, fs.createWriteStream(outputPath)),
    exitPromise
  ]);

  return true;
}

async function dumpWithMysql2(outputPath, dbConfig) {
  const connection = await mysqlPromise.createConnection({
    host: dbConfig.host,
    port: dbConfig.port,
    user: dbConfig.user,
    password: dbConfig.password,
    database: dbConfig.database,
    dateStrings: true
  });

  const output = fs.createWriteStream(outputPath, { encoding: 'utf8' });
  const outputDone = new Promise((resolve, reject) => {
    output.on('finish', resolve);
    output.on('error', reject);
  });

  try {
    output.write(`-- Backup Checagem Manual gerado em ${new Date().toISOString()}${os.EOL}`);
    output.write(`CREATE DATABASE IF NOT EXISTS ${quoteIdentifier(dbConfig.database)} CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;${os.EOL}`);
    output.write(`USE ${quoteIdentifier(dbConfig.database)};${os.EOL}`);
    output.write(`SET FOREIGN_KEY_CHECKS=0;${os.EOL}${os.EOL}`);

    const [tableRows] = await connection.query('SHOW FULL TABLES WHERE Table_type = ?', ['BASE TABLE']);
    const tables = tableRows.map((row) => Object.values(row)[0]);

    for (const table of tables) {
      const tableName = quoteIdentifier(table);
      const [createRows] = await connection.query(`SHOW CREATE TABLE ${tableName}`);
      const createSql = createRows[0]['Create Table'];

      output.write(`DROP TABLE IF EXISTS ${tableName};${os.EOL}`);
      output.write(`${createSql};${os.EOL}${os.EOL}`);
    }

    for (const table of tables) {
      const tableName = quoteIdentifier(table);
      const [rows, fields] = await connection.query(`SELECT * FROM ${tableName}`);
      if (rows.length === 0) continue;

      const columns = fields.map((field) => quoteIdentifier(field.name)).join(', ');
      for (const row of rows) {
        const values = fields.map((field) => sqlValue(row[field.name])).join(', ');
        output.write(`INSERT INTO ${tableName} (${columns}) VALUES (${values});${os.EOL}`);
      }
      output.write(os.EOL);
    }

    output.write(`SET FOREIGN_KEY_CHECKS=1;${os.EOL}`);
  } finally {
    output.end();
    await connection.end();
  }

  await outputDone;
}

async function gzipFile(inputPath, outputPath) {
  await pipeline(fs.createReadStream(inputPath), zlib.createGzip({ level: 9 }), fs.createWriteStream(outputPath));
}

async function writeBase64File(inputPath, outputPath) {
  const bytes = await fsp.readFile(inputPath);
  await fsp.writeFile(outputPath, bytes.toString('base64'), 'ascii');
}

async function encryptBase64WithCertificate(base64Path, encryptedPath, backupConfig) {
  if (!fs.existsSync(backupConfig.certPath)) {
    throw new Error(`Certificado/PFX nao encontrado: ${backupConfig.certPath}`);
  }

  const ps = `
$ErrorActionPreference = 'Stop'
$ProgressPreference = 'SilentlyContinue'
$certPath = $env:BACKUP_CERT_PATH_RUNTIME
$inputPath = $env:BACKUP_BASE64_PATH_RUNTIME
$outPath = $env:BACKUP_ENC_PATH_RUNTIME
$thumbprint = $null

if ([string]::IsNullOrWhiteSpace($certPath) -or -not (Test-Path -LiteralPath $certPath)) {
  throw "Certificado/PFX nao encontrado: $certPath"
}

if ($certPath.ToLowerInvariant().EndsWith('.pfx')) {
  if ([string]::IsNullOrWhiteSpace($env:BACKUP_PFX_PASSWORD)) {
    throw 'BACKUP_PFX_PASSWORD nao configurado no server\\.env'
  }

  $securePassword = ConvertTo-SecureString $env:BACKUP_PFX_PASSWORD -AsPlainText -Force
  $cert = Import-PfxCertificate -FilePath $certPath -CertStoreLocation Cert:\\CurrentUser\\My -Password $securePassword | Select-Object -First 1
  if ($null -eq $cert) {
    throw 'Nao foi possivel importar o PFX'
  }
  $thumbprint = $cert.Thumbprint
} else {
  $cert = New-Object System.Security.Cryptography.X509Certificates.X509Certificate2($certPath)
}

try {
  $content = Get-Content -LiteralPath $inputPath -Raw -Encoding ascii
  Protect-CmsMessage -To $cert -Content $content -OutFile $outPath
} finally {
  if ($thumbprint) {
    Remove-Item -Path "Cert:\\CurrentUser\\My\\$thumbprint" -DeleteKey -ErrorAction SilentlyContinue
  }
}
`;

  await run(
    'powershell.exe',
    ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-EncodedCommand', Buffer.from(ps, 'utf16le').toString('base64')],
    {
      env: {
        ...process.env,
        BACKUP_CERT_PATH_RUNTIME: backupConfig.certPath,
        BACKUP_BASE64_PATH_RUNTIME: base64Path,
        BACKUP_ENC_PATH_RUNTIME: encryptedPath
      }
    }
  );
}

async function cleanupOldBackups(outputDir, retentionDays) {
  if (!retentionDays) return;

  const cutoff = Date.now() - retentionDays * 24 * 60 * 60 * 1000;
  const entries = await fsp.readdir(outputDir, { withFileTypes: true }).catch(() => []);

  await Promise.all(entries
    .filter((entry) => entry.isFile() && /^backup-.*\.enc$/i.test(entry.name))
    .map(async (entry) => {
      const filePath = path.join(outputDir, entry.name);
      const stat = await fsp.stat(filePath);
      if (stat.mtimeMs < cutoff) {
        await fsp.rm(filePath, { force: true });
        console.log(`[backup] Backup antigo removido: ${filePath}`);
      }
    }));
}

async function createEncryptedBackup(reason = 'manual') {
  if (backupRunning) {
    console.log('[backup] Backup ja esta em andamento; pulando nova execucao.');
    return null;
  }

  backupRunning = true;
  const backupConfig = getBackupConfig();
  const dbConfig = getDbConfig();
  const tempDir = await fsp.mkdtemp(path.join(os.tmpdir(), 'checagem-backup-'));

  try {
    await fsp.mkdir(backupConfig.outputDir, { recursive: true });

    const stamp = timestamp();
    const sqlPath = path.join(tempDir, 'backup.sql');
    const gzPath = path.join(tempDir, 'backup.sql.gz');
    const base64Path = path.join(tempDir, 'backup.sql.gz.base64');
    const encryptedTempPath = path.join(tempDir, `backup-${stamp}.sql.gz.enc`);
    const finalPath = path.join(backupConfig.outputDir, `backup-${stamp}.sql.gz.enc`);

    console.log(`[backup] Iniciando backup (${reason}) do banco ${dbConfig.database}.`);

    const usedDump = await dumpWithMysqldump(sqlPath, dbConfig, tempDir);
    if (!usedDump) {
      console.log('[backup] mysqldump nao encontrado; usando exportacao via mysql2.');
      await dumpWithMysql2(sqlPath, dbConfig);
    }

    await gzipFile(sqlPath, gzPath);
    await writeBase64File(gzPath, base64Path);
    await encryptBase64WithCertificate(base64Path, encryptedTempPath, backupConfig);
    await fsp.copyFile(encryptedTempPath, finalPath);
    await cleanupOldBackups(backupConfig.outputDir, backupConfig.retentionDays);

    console.log(`[backup] Backup criptografado criado: ${finalPath}`);
    return finalPath;
  } finally {
    backupRunning = false;
    await fsp.rm(tempDir, { recursive: true, force: true });
  }
}

function msUntilNextBackup(timeValue) {
  const match = /^([01]?\d|2[0-3]):([0-5]\d)$/.exec(String(timeValue || '').trim());
  const hour = match ? Number(match[1]) : 2;
  const minute = match ? Number(match[2]) : 0;

  const now = new Date();
  const next = new Date(now);
  next.setHours(hour, minute, 0, 0);
  if (next <= now) next.setDate(next.getDate() + 1);
  return next.getTime() - now.getTime();
}

function scheduleNextDailyBackup(config) {
  const delay = msUntilNextBackup(config.time);
  const nextAt = new Date(Date.now() + delay);
  console.log(`[backup] Proximo backup automatico: ${nextAt.toLocaleString('pt-BR')}`);

  const timer = setTimeout(async () => {
    try {
      await createEncryptedBackup('agendado');
    } catch (err) {
      console.error('[backup] Falha no backup agendado:', err.message);
    } finally {
      scheduleNextDailyBackup(getBackupConfig());
    }
  }, delay);

  timer.unref?.();
}

function startBackupScheduler() {
  const config = getBackupConfig();
  if (schedulerStarted) return;
  schedulerStarted = true;

  if (!config.enabled) {
    console.log('[backup] Backup automatico desativado. Configure BACKUP_ENABLED=true para ativar.');
    return;
  }

  if (config.runOnStart) {
    const startupTimer = setTimeout(() => {
      createEncryptedBackup('inicializacao').catch((err) => {
        console.error('[backup] Falha no backup de inicializacao:', err.message);
      });
    }, config.startDelaySeconds * 1000);
    startupTimer.unref?.();
  }

  scheduleNextDailyBackup(config);
}

module.exports = {
  createEncryptedBackup,
  startBackupScheduler
};
