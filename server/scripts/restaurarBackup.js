const fs = require('node:fs');
const fsp = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const zlib = require('node:zlib');
const { spawn, spawnSync } = require('node:child_process');
const { pipeline } = require('node:stream/promises');
const readline = require('node:readline/promises');
const dotenv = require('dotenv');

const SERVER_DIR = path.resolve(__dirname, '..');
dotenv.config({ path: path.join(SERVER_DIR, '.env') });

const args = process.argv.slice(2);
const yes = args.includes('--yes') || args.includes('-y');
const help = args.includes('--help') || args.includes('-h');
const sourceArg = args.find((arg) => !arg.startsWith('-'));

function usage() {
  console.log('Uso: node scripts/restaurarBackup.js <arquivo-backup> [--yes]');
  console.log('Formatos aceitos: .sql, .sql.gz, .sql.gz.enc, .enc');
}

function stripQuotes(value) {
  return String(value || '').trim().replace(/^["']|["']$/g, '');
}

function resolveConfiguredPath(value, fallback) {
  const clean = stripQuotes(value);
  if (!clean) return fallback;
  return path.isAbsolute(clean) ? clean : path.resolve(SERVER_DIR, clean);
}

function getBackupDir() {
  return resolveConfiguredPath(process.env.BACKUP_OUTPUT_DIR, path.join(SERVER_DIR, 'backups'));
}

function getPfxPath() {
  const configured = resolveConfiguredPath(process.env.BACKUP_PFX_PATH || process.env.BACKUP_CERT_PFX, '');
  const candidates = [
    configured,
    path.resolve(SERVER_DIR, '..', 'backup-keys', 'backup-checagem.pfx'),
    path.join(SERVER_DIR, 'backup-keys', 'backup-checagem.pfx'),
    path.resolve(SERVER_DIR, '..', 'backup-keys', 'backup.pfx'),
    path.join(SERVER_DIR, 'backup-keys', 'backup.pfx')
  ].filter(Boolean);

  return candidates.find((candidate) => fs.existsSync(candidate)) || '';
}

function resolveBackupFile(fileName) {
  const clean = stripQuotes(fileName);
  if (path.isAbsolute(clean)) return clean;
  return path.resolve(getBackupDir(), clean);
}

function quoteIdentifier(value) {
  return `\`${String(value).replace(/`/g, '``')}\``;
}

function mysqlOptionValue(value) {
  return `"${String(value).replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/\r?\n/g, '')}"`;
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

async function confirmRestore(filePath, dbConfig) {
  if (yes) return;

  console.log('');
  console.log('ATENCAO: a restauracao pode substituir dados do banco atual.');
  console.log(`Banco: ${dbConfig.database} em ${dbConfig.host}:${dbConfig.port}`);
  console.log(`Arquivo: ${filePath}`);
  console.log('');

  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  const answer = await rl.question('Digite RESTAURAR para continuar: ');
  rl.close();

  if (answer.trim() !== 'RESTAURAR') {
    console.log('Restauracao cancelada.');
    process.exit(0);
  }
}

async function isGzipFile(filePath) {
  const handle = await fsp.open(filePath, 'r');
  try {
    const buffer = Buffer.alloc(2);
    const { bytesRead } = await handle.read(buffer, 0, 2, 0);
    return bytesRead === 2 && buffer[0] === 0x1f && buffer[1] === 0x8b;
  } finally {
    await handle.close();
  }
}

async function gunzipFile(inputPath, outputPath) {
  await pipeline(fs.createReadStream(inputPath), zlib.createGunzip(), fs.createWriteStream(outputPath));
}

function looksLikeBase64(text) {
  const clean = text.replace(/\s+/g, '');
  return clean.length > 64 && clean.length % 4 === 0 && /^[A-Za-z0-9+/=]+$/.test(clean);
}

async function normalizeCmsOutput(filePath, tempDir) {
  const raw = await fsp.readFile(filePath);
  const text = raw.toString('utf8');

  if (!looksLikeBase64(text)) return filePath;

  const decoded = Buffer.from(text.replace(/\s+/g, ''), 'base64');
  if (decoded.length === 0) return filePath;

  const decodedPath = path.join(tempDir, 'backup.cms.decoded');
  await fsp.writeFile(decodedPath, decoded);
  return decodedPath;
}

async function decryptCmsFile(inputPath, outputPath) {
  const pfxPath = getPfxPath();

  const ps = `
$ErrorActionPreference = 'Stop'
$ProgressPreference = 'SilentlyContinue'
$encPath = $env:RESTORE_ENC_PATH
$outPath = $env:RESTORE_OUT_PATH
$pfxPath = $env:RESTORE_PFX_PATH
$thumbprint = $null

if ($pfxPath -and (Test-Path -LiteralPath $pfxPath)) {
  if ($env:BACKUP_PFX_PASSWORD) {
    $securePassword = ConvertTo-SecureString $env:BACKUP_PFX_PASSWORD -AsPlainText -Force
  } else {
    $securePassword = Read-Host 'Senha do PFX' -AsSecureString
  }

  $imported = Import-PfxCertificate -FilePath $pfxPath -CertStoreLocation Cert:\\CurrentUser\\My -Password $securePassword | Select-Object -First 1
  if ($imported) {
    $thumbprint = $imported.Thumbprint
  }
}

try {
  $plain = Unprotect-CmsMessage -LiteralPath $encPath
  [System.IO.File]::WriteAllText($outPath, $plain, [System.Text.Encoding]::UTF8)
} finally {
  if ($thumbprint) {
    Remove-Item -Path "Cert:\\CurrentUser\\My\\$thumbprint" -DeleteKey -ErrorAction SilentlyContinue
  }
}
`;

  const env = {
    ...process.env,
    RESTORE_ENC_PATH: inputPath,
    RESTORE_OUT_PATH: outputPath,
    RESTORE_PFX_PATH: pfxPath
  };

  await run(
    'powershell.exe',
    ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-EncodedCommand', Buffer.from(ps, 'utf16le').toString('base64')],
    { env }
  );
}

async function prepareSqlFile(sourcePath, tempDir) {
  let workingPath = sourcePath;
  const lower = sourcePath.toLowerCase();

  if (lower.endsWith('.enc')) {
    const decryptedPath = path.join(tempDir, path.basename(sourcePath, '.enc'));
    console.log('Descriptografando backup...');
    await decryptCmsFile(sourcePath, decryptedPath);
    workingPath = await normalizeCmsOutput(decryptedPath, tempDir);
  }

  const isGzip = workingPath.toLowerCase().endsWith('.gz') || (await isGzipFile(workingPath));
  if (isGzip) {
    const sqlPath = path.join(tempDir, 'backup.sql');
    console.log('Descompactando backup...');
    await gunzipFile(workingPath, sqlPath);
    return sqlPath;
  }

  return workingPath;
}

async function importWithMysqlCli(sqlPath, dbConfig, tempDir) {
  const mysqlPath = findExecutable('mysql.exe') || findExecutable('mysql');
  if (!mysqlPath) return false;

  const defaultsPath = path.join(tempDir, 'mysql-restore.cnf');
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

  console.log(`Usando mysql.exe: ${mysqlPath}`);
  await run(mysqlPath, [
    `--defaults-extra-file=${defaultsPath}`,
    '-e',
    `CREATE DATABASE IF NOT EXISTS ${quoteIdentifier(dbConfig.database)} CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;`
  ]);

  await new Promise((resolve, reject) => {
    const child = spawn(mysqlPath, [
      `--defaults-extra-file=${defaultsPath}`,
      '--default-character-set=utf8mb4',
      dbConfig.database
    ], {
      stdio: ['pipe', 'inherit', 'inherit'],
      cwd: SERVER_DIR
    });

    fs.createReadStream(sqlPath).on('error', reject).pipe(child.stdin);
    child.on('error', reject);
    child.on('exit', (code) => {
      if (code === 0) resolve();
      else reject(new Error(`mysql.exe saiu com codigo ${code}`));
    });
  });

  return true;
}

async function importWithMysql2(sqlPath, dbConfig) {
  const mysql = require('mysql2/promise');
  const sql = await fsp.readFile(sqlPath, 'utf8');
  const connection = await mysql.createConnection({
    host: dbConfig.host,
    port: dbConfig.port,
    user: dbConfig.user,
    password: dbConfig.password,
    multipleStatements: true
  });

  try {
    await connection.query(
      `CREATE DATABASE IF NOT EXISTS ${quoteIdentifier(dbConfig.database)} CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`
    );
    await connection.query(`USE ${quoteIdentifier(dbConfig.database)}`);
    await connection.query('SET FOREIGN_KEY_CHECKS=0');
    await connection.query(sql);
    await connection.query('SET FOREIGN_KEY_CHECKS=1');
  } finally {
    await connection.end();
  }
}

async function writeRestoreMarker(sourcePath) {
  const stamp = new Date().toISOString().replace(/[-:]/g, '').replace(/\..+/, '').replace('T', '-');
  const markerPath = `${sourcePath}.restaurado.${stamp}.txt`;
  await fsp.writeFile(markerPath, `Restaurado em ${new Date().toISOString()}${os.EOL}`);
}

async function main() {
  if (help || !sourceArg) {
    usage();
    process.exit(help ? 0 : 1);
  }

  const sourcePath = resolveBackupFile(sourceArg);
  if (!fs.existsSync(sourcePath)) {
    console.error(`Arquivo nao encontrado: ${sourcePath}`);
    process.exit(1);
  }

  const dbConfig = getDbConfig();
  await confirmRestore(sourcePath, dbConfig);

  const tempDir = await fsp.mkdtemp(path.join(os.tmpdir(), 'checagem-restore-'));
  try {
    const sqlPath = await prepareSqlFile(sourcePath, tempDir);

    console.log('Restaurando banco de dados...');
    const usedCli = await importWithMysqlCli(sqlPath, dbConfig, tempDir);
    if (!usedCli) {
      console.log('mysql.exe nao encontrado; usando importacao via mysql2.');
      await importWithMysql2(sqlPath, dbConfig);
    }

    await writeRestoreMarker(sourcePath);
    console.log('Restauracao concluida com sucesso.');
  } finally {
    await fsp.rm(tempDir, { recursive: true, force: true });
  }
}

main().catch((err) => {
  console.error('');
  console.error('Falha ao restaurar backup:');
  console.error(err.message);
  process.exit(1);
});
