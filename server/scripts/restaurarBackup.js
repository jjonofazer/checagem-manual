const fs = require('node:fs');
const fsp = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const zlib = require('node:zlib');
const { spawn } = require('node:child_process');
const { pipeline } = require('node:stream/promises');
const dotenv = require('dotenv');

const SERVER_DIR = path.resolve(__dirname, '..');
dotenv.config({ path: path.join(SERVER_DIR, '.env') });

const args = process.argv.slice(2);
const help = args.includes('--help') || args.includes('-h');
const sourceArg = args.find((arg) => !arg.startsWith('-'));

function usage() {
  console.log('Uso: node scripts/restaurarBackup.js <arquivo-backup>');
  console.log('Formatos aceitos: .sql, .sql.gz, .sql.gz.enc, .enc');
  console.log('Descriptografa/descompacta o backup e salva um .sql ao lado do arquivo original.');
}

function resolveDecryptOutputPath(sourcePath) {
  const dir = path.dirname(sourcePath);
  let base = path.basename(sourcePath);
  if (base.toLowerCase().endsWith('.enc')) base = base.slice(0, -4);
  if (base.toLowerCase().endsWith('.gz')) base = base.slice(0, -3);
  return path.join(dir, `${base.replace(/\.sql$/i, '')}.descriptografado.sql`);
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

  const tempDir = await fsp.mkdtemp(path.join(os.tmpdir(), 'checagem-restore-'));
  try {
    const sqlPath = await prepareSqlFile(sourcePath, tempDir);
    const outPath = resolveDecryptOutputPath(sourcePath);
    await fsp.copyFile(sqlPath, outPath);
    console.log(`Backup descriptografado salvo em: ${outPath}`);
  } finally {
    await fsp.rm(tempDir, { recursive: true, force: true });
  }
}

main().catch((err) => {
  console.error('');
  console.error('Falha ao descriptografar backup:');
  console.error(err.message);
  process.exit(1);
});
