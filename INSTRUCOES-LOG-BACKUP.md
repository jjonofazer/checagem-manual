# Tarefa: gerar o log JSON do backup deste sistema

## Contexto

O backup do banco MySQL deste sistema é feito pelo próprio backend: o backend agenda o backup, gera o dump e salva criptografado. Antes, um script no Agendador de Tarefas do Windows fazia o backup de todos os bancos e gravava um log JSON. Esse script vai ser desativado.

Outro sistema lê esses logs JSON e envia um relatório de backups por e-mail. Por isso, **o backend deste sistema precisa gravar o próprio log JSON** a cada execução do backup, no formato descrito abaixo.

O Sistema de Solicitação já faz isso. A implementação dele está no final deste documento, como referência.

## O que fazer

1. Encontre no backend o ponto onde o backup do banco é executado: o agendamento (cron ou node-cron) e a função que faz o dump.
2. Ao fim de **cada** execução, grave o arquivo de log. Isso vale tanto para backup com sucesso quanto para backup com falha.
3. Não altere a lógica do backup em si. Só acrescente a gravação do log.
4. Se a gravação do log falhar, o erro deve ir apenas para o console/log do app. Ela **nunca** pode quebrar o backup nem derrubar o servidor.

## Onde gravar

- **Pasta:** `G:\.shortcut-targets-by-id\1I5rxcXA115ID7UE6Zcx1yjiRObYcHfll\BACKUP - LOG`
- **Nome do arquivo:** `log_Backup_<DISPOSITIVO>_<SISTEMA>.json`
  - Exemplos: `log_Backup_SERVER-09_RECEPCAO.json`, `log_Backup_SERVER-09_PATRIMONIAL.json`, `log_Backup_SERVER-09_CHECAGEM.json`
- Cada sistema grava **somente o seu arquivo**. A cada execução, o arquivo é sobrescrito com o resultado da última execução.

## Formato do arquivo

O arquivo é um **array JSON** com **uma entrada**. Use exatamente estes campos, com estes nomes:

```json
[
    {
        "tipoBackup": "MYSQL Recepcao",
        "dispositivo": "SERVER-09",
        "nomePasta": "sistema_chamadas",
        "dataHora": "30/09/2026 01:00:03",
        "status": "Backup realizado com sucesso",
        "pastaOrigem": "sistema_chamadas",
        "pastaDestino": "C:\\Backup_SQL_Sistemas\\Backup_SQL_chamada\\sistema_chamadas_2026-09-30_01-00-03.sql.gz.enc",
        "erro": "",
        "tempoExecucao": "00m 05s",
        "timestamp": "30-09-2026 01:00:03"
    }
]
```

| Campo | Valor |
|---|---|
| `tipoBackup` | `MYSQL <Nome do sistema>`, por exemplo `MYSQL Recepcao` ou `MYSQL Patrimonial` |
| `dispositivo` | Nome do servidor onde o sistema roda, **fixo** na configuração (ex.: `SERVER-09`). **Não** use o hostname do Windows: o relatório agrupa os backups pelo valor deste campo. |
| `nomePasta` | Nome do banco de dados (ex.: `sistema_chamadas`, `inventario_ti`) |
| `dataHora` | Data/hora do **fim** do backup, no formato `dd/MM/yyyy HH:mm:ss` |
| `status` | `Backup realizado com sucesso` quando dá certo, ou `Falha no backup` quando falha. O leitor procura a palavra "sucesso". |
| `pastaOrigem` | Nome do banco de dados (o mesmo valor de `nomePasta`) |
| `pastaDestino` | Caminho completo do arquivo de backup gerado. Fica `""` quando o backup falha. |
| `erro` | `""` quando dá certo. Quando falha, recebe a mensagem do erro. |
| `tempoExecucao` | Duração no formato `MMm SSs` (ex.: `00m 05s`, `01m 15s`) |
| `timestamp` | Mesma data/hora de `dataHora`, no formato `dd-MM-yyyy HH:mm:ss` |

Detalhes de gravação:

- Codificação **UTF-8 com BOM** e quebras de linha **CRLF**, iguais às dos logs que o PowerShell gerava.
- Grave primeiro num arquivo temporário e depois renomeie para o nome final. Assim, quem estiver lendo nunca pega o JSON pela metade.
- Crie a pasta se ela não existir (`mkdir` recursivo).

## Configuração

Coloque os valores na configuração do backup, lidos de variáveis de ambiente e com valor padrão:

| Variável | Padrão |
|---|---|
| `BACKUP_LOG_DIR` | a pasta do Drive acima (se ficar vazio, o log é desativado) |
| `BACKUP_LOG_DISPOSITIVO` | `SERVER-09` |
| `BACKUP_LOG_SISTEMA` | sufixo do arquivo (ex.: `RECEPCAO`) |
| `BACKUP_LOG_TIPO` | ex.: `MYSQL Recepcao` |

## Regras

- **Não** altere o banco de dados (nenhum INSERT, UPDATE, DELETE ou migration). Para testar, **não** rode o backup real. Chame a função de log com dados fictícios e aponte `BACKUP_LOG_DIR` para uma pasta temporária.
- **Não** leia nem edite o `.env`. Se precisar de algum valor dele, pergunte ao usuário.
- Siga as regras do `CLAUDE.md` (ou equivalente) do projeto, se ele existir.
- Ao terminar, rode o typecheck/build e lembre o usuário de recompilar e reiniciar o serviço.
- Ao terminar, passe ao usuário a seção **Configuração do serviço do Windows** abaixo. Sem esse ajuste, o log não é gravado.

## Configuração do serviço do Windows (obrigatória)

O disco `G:` do Google Drive só existe para o usuário **Administrator**, que é quem tem o Drive conectado. Se o serviço do sistema (NSSM) roda com a conta **LocalSystem**, que é o padrão, ele não enxerga o `G:`. Nesse caso, o backup funciona, mas a gravação do log falha e aparece no `error.log` uma mensagem como esta:

```
[Backup] Não foi possível gravar o log em G:\...\BACKUP - LOG\log_Backup_SERVER-09_<SISTEMA>.json:
EPERM: operation not permitted, mkdir 'G:\...\BACKUP - LOG'
```

Isso já aconteceu no Sistema de Solicitação. Para corrigir, o serviço precisa rodar com o usuário Administrator.

**Como verificar qual conta o serviço usa** (substitua `<NOME_DO_SERVICO>` pelo nome do serviço):

```
sc qc <NOME_DO_SERVICO>
```

Se o campo `SERVICE_START_NAME` (ou `NOME_DO_INICIO_DO_SERVIÇO`) mostrar `LocalSystem`, ajuste com uma das opções abaixo.

**Opção 1: pela tela**
1. Abra `services.msc` e localize o serviço do sistema.
2. Clique com o botão direito, vá em **Propriedades** e abra a aba **Logon**.
3. Marque **Esta conta**, preencha `.\Administrator` e digite a senha duas vezes.
4. Clique em OK e reinicie o serviço.

**Opção 2: pela linha de comando** (como administrador)

```
nssm set <NOME_DO_SERVICO> ObjectName .\Administrator SENHA_DO_ADMINISTRATOR
nssm restart <NOME_DO_SERVICO>
```

**Como testar**
1. Recompile o backend (`npm run build`) e reinicie o serviço.
2. Ajuste o horário do backup no `.env` (`BACKUP_CRON`, por exemplo `20 8 * * *`) para alguns minutos à frente e reinicie o serviço.
3. Depois do horário, confira se o arquivo `log_Backup_SERVER-09_<SISTEMA>.json` apareceu na pasta `BACKUP - LOG` do Drive.
4. Se o arquivo não aparecer, veja o `error.log` do sistema.
5. Volte o `BACKUP_CRON` para o horário normal e reinicie o serviço.

**Se o arquivo continuar sem aparecer mesmo com o serviço rodando como Administrator**

O Google Drive pode mostrar o `G:` só para a sessão em que o usuário está logado, e não para um serviço em segundo plano. Nesse caso:
- aponte `BACKUP_LOG_DIR` para uma pasta local (ex.: `C:\Backup_SQL_Sistemas\BACKUP-LOG`);
- crie uma tarefa no Agendador de Tarefas, rodando como Administrator, que copie os `log_Backup_*.json` dessa pasta para a pasta `BACKUP - LOG` do Drive antes do horário do `scriptEmail.ps1`.

---

## Implementação de referência (Sistema de Solicitação, Node.js + TypeScript)

Adapte nomes, imports e estrutura ao projeto. Se o backend for de outra linguagem, implemente a mesma lógica.

### `src/config/backup.ts` (campos acrescentados)

```ts
  // Log JSON lido pelo sistema de monitoramento de backups
  logDir: process.env.BACKUP_LOG_DIR ?? 'G:\\.shortcut-targets-by-id\\1I5rxcXA115ID7UE6Zcx1yjiRObYcHfll\\BACKUP - LOG',
  logDispositivo: process.env.BACKUP_LOG_DISPOSITIVO ?? 'SERVER-09',
  logSistema: process.env.BACKUP_LOG_SISTEMA ?? 'SOLICITACAO',
  logTipoBackup: process.env.BACKUP_LOG_TIPO ?? 'MYSQL Solicitacao',
```

### `src/services/backup.log.ts`

```ts
import path from 'path';
import fs from 'fs/promises';
import { backupConfig } from '../config/backup';

export interface EntradaLogBackup {
  tipoBackup: string;
  dispositivo: string;
  nomePasta: string;
  dataHora: string;       // dd/MM/yyyy HH:mm:ss
  status: string;
  pastaOrigem: string;
  pastaDestino: string;
  erro: string;
  tempoExecucao: string;  // 00m 00s
  timestamp: string;      // dd-MM-yyyy HH:mm:ss
}

const p = (n: number) => String(n).padStart(2, '0');

function formatarData(d: Date, sep: string): string {
  return `${p(d.getDate())}${sep}${p(d.getMonth() + 1)}${sep}${d.getFullYear()} ` +
    `${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`;
}

function formatarDuracao(ms: number): string {
  const totalSeg = Math.floor(ms / 1000);
  return `${p(Math.floor(totalSeg / 60))}m ${p(totalSeg % 60)}s`;
}

/** Grava o log da execução do backup. Nunca lança erro. */
export async function registrarLogBackup(params: {
  inicio: Date;
  fim: Date;
  sucesso: boolean;
  pastaDestino?: string;
  erro?: string;
}): Promise<void> {
  const { logDir, logDispositivo, logSistema, logTipoBackup, dbNome } = backupConfig;
  if (!logDir) return;

  const entrada: EntradaLogBackup = {
    tipoBackup: logTipoBackup,
    dispositivo: logDispositivo,
    nomePasta: dbNome,
    dataHora: formatarData(params.fim, '/'),
    status: params.sucesso ? 'Backup realizado com sucesso' : 'Falha no backup',
    pastaOrigem: dbNome,
    pastaDestino: params.pastaDestino ?? '',
    erro: params.erro ?? '',
    tempoExecucao: formatarDuracao(params.fim.getTime() - params.inicio.getTime()),
    timestamp: formatarData(params.fim, '-'),
  };

  const arquivo = path.join(logDir, `log_Backup_${logDispositivo}_${logSistema}.json`);
  try {
    await fs.mkdir(logDir, { recursive: true });
    const json = '\uFEFF' + JSON.stringify([entrada], null, 4).replace(/\n/g, '\r\n');
    const tmp = `${arquivo}.${process.pid}.tmp`;
    await fs.writeFile(tmp, json, 'utf8');
    await fs.rename(tmp, arquivo);
    console.log(`[Backup] Log gravado em ${arquivo}`);
  } catch (e) {
    console.error(`[Backup] Não foi possível gravar o log em ${arquivo}:`, e instanceof Error ? e.message : e);
  }
}
```

### Chamada no agendamento do backup

```ts
cron.schedule(backupConfig.cron, async () => {
  const inicio = new Date();
  let info: BackupInfo;
  try {
    info = await executarBackup();   // retorna { caminho, nome, tamanho }
  } catch (e) {
    const erro = e instanceof Error ? e.message : String(e);
    console.error('[Backup] FALHA:', erro);
    await registrarLogBackup({ inicio, fim: new Date(), sucesso: false, erro });
    return;
  }

  await registrarLogBackup({ inicio, fim: new Date(), sucesso: true, pastaDestino: info.caminho });

  // ... limpeza de backups antigos etc. (em try/catch próprio)
});
```
