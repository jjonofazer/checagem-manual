const path = require('node:path');
const dotenv = require('dotenv');

const SERVER_DIR = path.resolve(__dirname, '..');
dotenv.config({ path: path.join(SERVER_DIR, '.env') });

const { hashPassword } = require('../auth');
const { init, getPool } = require('../db');

function usage() {
  console.log('Uso: node scripts/resetPassword.js <username> <nova-senha>');
}

async function main() {
  const [username, newPassword] = process.argv.slice(2);
  if (!username || !newPassword) {
    usage();
    process.exit(1);
  }
  if (newPassword.length < 6) {
    console.error('A nova senha deve ter pelo menos 6 caracteres.');
    process.exit(1);
  }

  await init();
  const pool = getPool();

  const [users] = await pool.query('SELECT id, username FROM users WHERE username = ?', [username]);
  if (!users[0]) {
    console.error(`Usuario "${username}" nao encontrado.`);
    process.exit(1);
  }

  const { hash, salt } = hashPassword(newPassword);
  await pool.query('UPDATE users SET password_hash = ?, password_salt = ? WHERE id = ?', [hash, salt, users[0].id]);
  await pool.query('DELETE FROM sessions WHERE user_id = ?', [users[0].id]);

  console.log(`Senha do usuario "${username}" (id ${users[0].id}) redefinida. Sessoes antigas encerradas.`);
  process.exit(0);
}

main().catch((err) => {
  console.error('Falha ao redefinir senha:', err.message);
  process.exit(1);
});
