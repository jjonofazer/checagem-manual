# Checagem Manual

Sistema para registro diário de rondas/checagens de infraestrutura (TVs, câmeras,
backups, sistemas de recepção, etc.), com login por usuário, status **online/offline**
(com observação obrigatória quando algo está offline), tópicos e itens totalmente
configuráveis pelo administrador, e relatórios exportáveis para Excel.

## Como funciona

- **Usuários "comuns"** são os operadores: fazem login, abrem cada tópico (HBASE,
  HRSM, etc.) e marcam cada item como **ONLINE** ou **OFFLINE**. Marcar como offline
  exige uma observação explicando o problema. A checagem é diária — vira de dia e os
  registros resetam.
- **Administradores** não operam a checklist. O painel deles tem:
  - **Dashboard** com gráficos (status de hoje e tendência dos últimos 7 dias).
  - **Usuários**: criar e editar quem pode logar (o admin principal, criado
    automaticamente na primeira execução, não pode ser editado nem excluído).
  - **Tópicos**: criar, renomear, reordenar e excluir tópicos e itens — incluindo
    itens com um checklist de instruções extra (ex: câmeras) que aparece antes de
    poder marcar como online.
  - **Relatório**: status de qualquer data, por tópico, com exportação para Excel
    (uma aba "Geral" com tudo, mais uma aba por tópico).

## Arquitetura

Duas partes que rodam separadas:

```
checagem-manual/
├── src/            # Front-end (React / Create React App)
├── public/
└── server/         # Back-end (Node + Express + MySQL)
    ├── index.js     # rotas da API
    ├── db.js        # conexão MySQL, criação/seed das tabelas
    ├── auth.js       # hash de senha (scrypt) e geração de token de sessão
    └── .env          # configuração local (não versionado)
```

O front-end conversa com o back-end via chamadas a `/api/...`, que em desenvolvimento
são redirecionadas para `http://localhost:4001` pelo campo `"proxy"` do `package.json`
raiz.

**Autenticação**: login por usuário/senha, senha guardada como hash `scrypt` (nunca em
texto puro), sessão via token simples guardado no `localStorage` do navegador.

**Banco de dados**: MySQL. Tabelas principais: `users`, `sessions`, `sections`,
`items`, `registros`. O back-end cria o banco e as tabelas sozinho na primeira
execução (não precisa rodar SQL manualmente).

## Pré-requisitos

- [Node.js](https://nodejs.org) instalado (`node -v` pra conferir).
- Um servidor MySQL rodando localmente (ex: instalado direto no Windows, XAMPP, etc.).

No Windows, se `npm` der erro de política de execução do PowerShell, use `npm.cmd`
no lugar de `npm`.

## Como rodar

### 1. Backend

```
cd server
npm.cmd install
```

Copie `server/.env.example` para `server/.env` e ajuste as credenciais do seu MySQL:

```
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=sua_senha
DB_NAME=checagem_manual
PORT=4001
```

Depois:

```
npm.cmd start
```

Na primeira execução, ele cria o banco, as tabelas, os tópicos padrão e um usuário
administrador:

```
usuário: admin
senha: admin123
```

**Troque essa senha assim que logar** (botão "Alterar senha").

### 2. Frontend

Em outro terminal, na raiz do projeto:

```
npm.cmd install
npm.cmd start
```

Abre automaticamente em `http://localhost:8080` (porta configurada em `.env` na raiz).

## Scripts disponíveis

No diretório raiz (front-end):

- `npm start` — roda o front-end em modo desenvolvimento.
- `npm test` — roda os testes.
- `npm run build` — gera a build de produção na pasta `build/`.

Em `server/` (back-end):

- `npm start` — sobe a API em `http://localhost:4001`.

## Segurança

- `server/.env` (senha do banco) e `.env` da raiz nunca devem ser commitados — já
  estão no `.gitignore`.
- Senhas de usuário são armazenadas com hash `scrypt` + salt por usuário, nunca em
  texto puro.
- Troque a senha do admin padrão (`admin`/`admin123`) assim que possível.
