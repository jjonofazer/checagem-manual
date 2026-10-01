const path = require('node:path');
const fsp = require('node:fs/promises');

// Log JSON lido por outro sistema que envia um relatorio de backups por
// e-mail (ver INSTRUCOES-LOG-BACKUP.md). Formato e nome de arquivo fixos,
// definidos por esse outro sistema - nao mexer sem atualizar os dois lados.

function pad(n) {
  return String(n).padStart(2, '0');
}

function formatarData(d, sep) {
  return (
    `${pad(d.getDate())}${sep}${pad(d.getMonth() + 1)}${sep}${d.getFullYear()} ` +
    `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`
  );
}

function formatarDuracao(ms) {
  const totalSeg = Math.floor(ms / 1000);
  return `${pad(Math.floor(totalSeg / 60))}m ${pad(totalSeg % 60)}s`;
}

/**
 * Grava o log da execucao do backup. Nunca lanca erro - uma falha aqui so
 * vai pro console, nunca pode derrubar o backup nem o servidor.
 */
async function registrarLogBackup({ inicio, fim, sucesso, pastaDestino, erro, dbNome, config }) {
  const { logDir, logDispositivo, logSistema, logTipoBackup } = config;
  if (!logDir) return;

  const entrada = {
    tipoBackup: logTipoBackup,
    dispositivo: logDispositivo,
    nomePasta: dbNome,
    dataHora: formatarData(fim, '/'),
    status: sucesso ? 'Backup realizado com sucesso' : 'Falha no backup',
    pastaOrigem: dbNome,
    pastaDestino: pastaDestino || '',
    erro: erro || '',
    tempoExecucao: formatarDuracao(fim.getTime() - inicio.getTime()),
    timestamp: formatarData(fim, '-')
  };

  const arquivo = path.join(logDir, `log_Backup_${logDispositivo}_${logSistema}.json`);
  try {
    await fsp.mkdir(logDir, { recursive: true });
    const json = '﻿' + JSON.stringify([entrada], null, 4).replace(/\n/g, '\r\n');
    const tmp = `${arquivo}.${process.pid}.tmp`;
    await fsp.writeFile(tmp, json, 'utf8');
    await fsp.rename(tmp, arquivo);
    console.log(`[backup] Log gravado em ${arquivo}`);
  } catch (e) {
    console.error(`[backup] Nao foi possivel gravar o log em ${arquivo}:`, e.message);
  }
}

module.exports = { registrarLogBackup };
