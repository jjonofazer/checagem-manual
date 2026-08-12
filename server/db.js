require('dotenv').config();
const mysql = require('mysql2/promise');
const { hashPassword } = require('./auth');

const {
  DB_HOST = 'localhost',
  DB_PORT = '3306',
  DB_USER = 'root',
  DB_PASSWORD = '',
  DB_NAME = 'checagem_manual'
} = process.env;

let pool;

const CAMERA_INSTRUCTIONS = [
  'Verificar se a câmera está gravando (indicador/luz ativo).',
  'Conferir se a imagem está nítida, sem falhas ou tela preta.',
  'Confirmar se a data e hora exibidas na imagem estão corretas.',
  'Verificar se o ângulo/enquadramento não foi alterado.',
  'Só registrar depois de confirmar todos os itens acima.'
];

const DEFAULT_SECTIONS = [
  {
    title: 'HBASE',
    items: [{ label: 'TV CARDAPIO' }, { label: 'CAMERA', instructions: CAMERA_INSTRUCTIONS }]
  },
  {
    title: 'HRSM',
    items: [{ label: 'TV CARDAPIO' }, { label: 'CAMERA', instructions: CAMERA_INSTRUCTIONS }]
  },
  { title: 'SALA DE ESPERA', items: [{ label: 'SISTEMA ATIVO' }] },
  { title: 'ECO HOSPITALAR', items: [{ label: 'SISTEMA ATIVO' }] },
  {
    title: 'BACKUP EMAIL',
    items: [
      { label: 'HBASE' },
      { label: 'HRSM' },
      { label: '09_RECEPÇÃO' },
      { label: '09_SOLICITAÇÃO' },
      { label: '09_PATRIMONIO' },
      { label: '09_CHECAGEM' }
    ]
  }
];

async function init() {
  // Conecta sem selecionar banco para poder cria-lo se ainda nao existir
  const bootstrapConnection = await mysql.createConnection({
    host: DB_HOST,
    port: Number(DB_PORT),
    user: DB_USER,
    password: DB_PASSWORD
  });
  await bootstrapConnection.query(
    `CREATE DATABASE IF NOT EXISTS \`${DB_NAME}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`
  );
  await bootstrapConnection.end();

  pool = mysql.createPool({
    host: DB_HOST,
    port: Number(DB_PORT),
    user: DB_USER,
    password: DB_PASSWORD,
    database: DB_NAME,
    waitForConnections: true,
    connectionLimit: 10,
    dateStrings: true
  });

  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id INT AUTO_INCREMENT PRIMARY KEY,
      username VARCHAR(100) UNIQUE NOT NULL,
      name VARCHAR(150) NOT NULL,
      password_hash VARCHAR(255) NOT NULL,
      password_salt VARCHAR(255) NOT NULL,
      role VARCHAR(20) NOT NULL DEFAULT 'user',
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS sessions (
      token VARCHAR(64) PRIMARY KEY,
      user_id INT NOT NULL,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      expires_at DATETIME NOT NULL,
      FOREIGN KEY (user_id) REFERENCES users(id)
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS sections (
      id INT AUTO_INCREMENT PRIMARY KEY,
      title VARCHAR(150) NOT NULL,
      position INT NOT NULL DEFAULT 0
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS items (
      id INT AUTO_INCREMENT PRIMARY KEY,
      section_id INT NOT NULL,
      parent_id INT NULL,
      label VARCHAR(150) NOT NULL,
      instructions TEXT NULL,
      position INT NOT NULL DEFAULT 0,
      FOREIGN KEY (section_id) REFERENCES sections(id) ON DELETE CASCADE,
      FOREIGN KEY (parent_id) REFERENCES items(id) ON DELETE CASCADE
    )
  `);

  // Bancos criados antes de sub-itens existirem precisam do ALTER abaixo
  const [parentCol] = await pool.query(
    `SELECT COLUMN_NAME FROM information_schema.COLUMNS
     WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'items' AND COLUMN_NAME = 'parent_id'`,
    [DB_NAME]
  );
  if (parentCol.length === 0) {
    await pool.query(
      'ALTER TABLE items ADD COLUMN parent_id INT NULL, ADD FOREIGN KEY (parent_id) REFERENCES items(id) ON DELETE CASCADE'
    );
  }

  // Esquema antigo de registros usava item_id como texto fixo; a partir de agora
  // itens sao dinamicos (tabela items com id numerico), entao recriamos a tabela.
  const [existingCols] = await pool.query(
    `SELECT COLUMN_NAME, DATA_TYPE FROM information_schema.COLUMNS
     WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'registros' AND COLUMN_NAME = 'item_id'`,
    [DB_NAME]
  );
  if (existingCols.length > 0 && existingCols[0].DATA_TYPE !== 'int') {
    await pool.query('DROP TABLE IF EXISTS registros');
  }

  await pool.query(`
    CREATE TABLE IF NOT EXISTS registros (
      id INT AUTO_INCREMENT PRIMARY KEY,
      item_id INT NOT NULL,
      date DATE NOT NULL,
      user_id INT NOT NULL,
      status VARCHAR(10) NOT NULL DEFAULT 'online',
      obs TEXT NULL,
      registered_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      UNIQUE KEY unique_item_date (item_id, date),
      FOREIGN KEY (item_id) REFERENCES items(id) ON DELETE CASCADE,
      FOREIGN KEY (user_id) REFERENCES users(id)
    )
  `);

  // Bancos criados antes do status online/offline existir precisam do ALTER abaixo
  const [statusCol] = await pool.query(
    `SELECT COLUMN_NAME FROM information_schema.COLUMNS
     WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'registros' AND COLUMN_NAME = 'status'`,
    [DB_NAME]
  );
  if (statusCol.length === 0) {
    await pool.query("ALTER TABLE registros ADD COLUMN status VARCHAR(10) NOT NULL DEFAULT 'online'");
    await pool.query('ALTER TABLE registros ADD COLUMN obs TEXT NULL');
  }

  const [userRows] = await pool.query('SELECT COUNT(*) AS count FROM users');
  if (userRows[0].count === 0) {
    const { hash, salt } = hashPassword('admin123');
    await pool.query(
      'INSERT INTO users (username, name, password_hash, password_salt, role) VALUES (?, ?, ?, ?, ?)',
      ['admin', 'Administrador', hash, salt, 'admin']
    );
    console.log('Usuario padrao criado -> usuario: admin | senha: admin123 (troque assim que possivel)');
  }

  const [sectionRows] = await pool.query('SELECT COUNT(*) AS count FROM sections');
  if (sectionRows[0].count === 0) {
    for (let s = 0; s < DEFAULT_SECTIONS.length; s++) {
      const section = DEFAULT_SECTIONS[s];
      const [result] = await pool.query('INSERT INTO sections (title, position) VALUES (?, ?)', [section.title, s]);
      const sectionId = result.insertId;
      for (let i = 0; i < section.items.length; i++) {
        const item = section.items[i];
        await pool.query('INSERT INTO items (section_id, label, instructions, position) VALUES (?, ?, ?, ?)', [
          sectionId,
          item.label,
          item.instructions ? JSON.stringify(item.instructions) : null,
          i
        ]);
      }
    }
    console.log('Topicos padrao criados (HBASE, HRSM, SALA DE ESPERA, ECO HOSPITALAR, BACKUP EMAIL)');
  }

  return pool;
}

function getPool() {
  if (!pool) throw new Error('Banco de dados ainda nao foi inicializado');
  return pool;
}

module.exports = { init, getPool };
