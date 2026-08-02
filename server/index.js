const express = require('express');
const cors = require('cors');
const { init, getPool } = require('./db');
const { hashPassword, verifyPassword, generateToken } = require('./auth');

const app = express();
app.use(cors());
app.use(express.json());

const SESSION_TTL_HOURS = 12;

const wrap = (fn) => (req, res, next) => fn(req, res, next).catch(next);

async function createSession(userId) {
  const token = generateToken();
  const expiresAt = new Date(Date.now() + SESSION_TTL_HOURS * 60 * 60 * 1000);
  await getPool().query('INSERT INTO sessions (token, user_id, expires_at) VALUES (?, ?, ?)', [
    token,
    userId,
    expiresAt
  ]);
  return token;
}

const authMiddleware = wrap(async (req, res, next) => {
  const authHeader = req.headers.authorization || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
  if (!token) return res.status(401).json({ error: 'Nao autenticado' });

  const pool = getPool();
  const [sessions] = await pool.query('SELECT * FROM sessions WHERE token = ?', [token]);
  const session = sessions[0];
  if (!session || new Date(session.expires_at) < new Date()) {
    return res.status(401).json({ error: 'Sessao invalida ou expirada' });
  }

  const [users] = await pool.query('SELECT id, username, name, role FROM users WHERE id = ?', [session.user_id]);
  const user = users[0];
  if (!user) return res.status(401).json({ error: 'Usuario nao encontrado' });

  req.user = user;
  req.token = token;
  next();
});

function adminOnly(req, res, next) {
  if (req.user.role !== 'admin') return res.status(403).json({ error: 'Somente administradores' });
  next();
}

// --- Autenticacao ---
app.post(
  '/api/auth/login',
  wrap(async (req, res) => {
    const { username, password } = req.body || {};
    if (!username || !password) {
      return res.status(400).json({ error: 'Usuario e senha sao obrigatorios' });
    }

    const [users] = await getPool().query('SELECT * FROM users WHERE username = ?', [username]);
    const user = users[0];
    if (!user || !verifyPassword(password, user.password_salt, user.password_hash)) {
      return res.status(401).json({ error: 'Usuario ou senha invalidos' });
    }

    const token = await createSession(user.id);
    res.json({ token, user: { id: user.id, username: user.username, name: user.name, role: user.role } });
  })
);

app.post(
  '/api/auth/logout',
  authMiddleware,
  wrap(async (req, res) => {
    await getPool().query('DELETE FROM sessions WHERE token = ?', [req.token]);
    res.json({ ok: true });
  })
);

app.get('/api/auth/me', authMiddleware, (req, res) => {
  res.json({ user: req.user });
});

app.post(
  '/api/auth/change-password',
  authMiddleware,
  wrap(async (req, res) => {
    const { currentPassword, newPassword } = req.body || {};
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: 'Senha atual e nova senha sao obrigatorias' });
    }
    if (newPassword.length < 6) {
      return res.status(400).json({ error: 'A nova senha deve ter pelo menos 6 caracteres' });
    }

    const pool = getPool();
    const [users] = await pool.query('SELECT * FROM users WHERE id = ?', [req.user.id]);
    const user = users[0];
    if (!verifyPassword(currentPassword, user.password_salt, user.password_hash)) {
      return res.status(401).json({ error: 'Senha atual incorreta' });
    }

    const { hash, salt } = hashPassword(newPassword);
    await pool.query('UPDATE users SET password_hash = ?, password_salt = ? WHERE id = ?', [
      hash,
      salt,
      req.user.id
    ]);
    res.json({ ok: true });
  })
);

// --- Usuarios (somente admin) ---
app.get(
  '/api/users',
  authMiddleware,
  adminOnly,
  wrap(async (req, res) => {
    const [users] = await getPool().query('SELECT id, username, name, role, created_at FROM users ORDER BY name');
    res.json({ users });
  })
);

app.post(
  '/api/users',
  authMiddleware,
  adminOnly,
  wrap(async (req, res) => {
    const { username, name, password, role } = req.body || {};
    if (!username || !name || !password) {
      return res.status(400).json({ error: 'Usuario, nome e senha sao obrigatorios' });
    }
    if (password.length < 6) {
      return res.status(400).json({ error: 'A senha deve ter pelo menos 6 caracteres' });
    }

    const pool = getPool();
    const [existing] = await pool.query('SELECT id FROM users WHERE username = ?', [username]);
    if (existing[0]) {
      return res.status(409).json({ error: 'Usuario ja existe' });
    }

    const { hash, salt } = hashPassword(password);
    const safeRole = role === 'admin' ? 'admin' : 'user';
    const [result] = await pool.query(
      'INSERT INTO users (username, name, password_hash, password_salt, role) VALUES (?, ?, ?, ?, ?)',
      [username, name, hash, salt, safeRole]
    );

    res.status(201).json({ user: { id: result.insertId, username, name, role: safeRole } });
  })
);

app.put(
  '/api/users/:id',
  authMiddleware,
  adminOnly,
  wrap(async (req, res) => {
    const targetId = Number(req.params.id);
    if (targetId === 1) {
      return res.status(403).json({ error: 'O administrador principal não pode ser editado' });
    }

    const { username, name, password, role } = req.body || {};
    if (!username || !username.trim() || !name || !name.trim()) {
      return res.status(400).json({ error: 'Usuario e nome sao obrigatorios' });
    }
    if (password && password.length < 6) {
      return res.status(400).json({ error: 'A senha deve ter pelo menos 6 caracteres' });
    }

    const pool = getPool();
    const [existing] = await pool.query('SELECT id FROM users WHERE username = ? AND id != ?', [
      username.trim(),
      targetId
    ]);
    if (existing[0]) {
      return res.status(409).json({ error: 'Usuario ja existe' });
    }

    const safeRole = role === 'admin' ? 'admin' : 'user';

    if (password) {
      const { hash, salt } = hashPassword(password);
      await pool.query(
        'UPDATE users SET username = ?, name = ?, role = ?, password_hash = ?, password_salt = ? WHERE id = ?',
        [username.trim(), name.trim(), safeRole, hash, salt, targetId]
      );
    } else {
      await pool.query('UPDATE users SET username = ?, name = ?, role = ? WHERE id = ?', [
        username.trim(),
        name.trim(),
        safeRole,
        targetId
      ]);
    }

    res.json({ ok: true });
  })
);

// --- Topicos (secoes + itens) ---
function parseInstructions(raw) {
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function sanitizeInstructions(instructions) {
  if (!Array.isArray(instructions)) return null;
  const steps = instructions.map((step) => String(step).trim()).filter(Boolean);
  return steps.length > 0 ? JSON.stringify(steps) : null;
}

app.get(
  '/api/sections',
  authMiddleware,
  wrap(async (req, res) => {
    const pool = getPool();
    const [sectionRows] = await pool.query('SELECT id, title, position FROM sections ORDER BY position, id');
    const [itemRows] = await pool.query(
      'SELECT id, section_id, label, instructions, position FROM items ORDER BY position, id'
    );

    const sections = sectionRows.map((section) => ({
      id: section.id,
      title: section.title,
      items: itemRows
        .filter((item) => item.section_id === section.id)
        .map((item) => ({
          id: item.id,
          label: item.label,
          instructions: parseInstructions(item.instructions)
        }))
    }));

    res.json({ sections });
  })
);

app.post(
  '/api/sections',
  authMiddleware,
  adminOnly,
  wrap(async (req, res) => {
    const { title } = req.body || {};
    if (!title || !title.trim()) return res.status(400).json({ error: 'Titulo e obrigatorio' });

    const pool = getPool();
    const [result] = await pool.query(
      'INSERT INTO sections (title, position) SELECT ?, COALESCE(MAX(position), -1) + 1 FROM sections',
      [title.trim()]
    );
    res.status(201).json({ section: { id: result.insertId, title: title.trim(), items: [] } });
  })
);

app.put(
  '/api/sections/:id',
  authMiddleware,
  adminOnly,
  wrap(async (req, res) => {
    const { title } = req.body || {};
    if (!title || !title.trim()) return res.status(400).json({ error: 'Titulo e obrigatorio' });

    await getPool().query('UPDATE sections SET title = ? WHERE id = ?', [title.trim(), req.params.id]);
    res.json({ ok: true });
  })
);

app.delete(
  '/api/sections/:id',
  authMiddleware,
  adminOnly,
  wrap(async (req, res) => {
    await getPool().query('DELETE FROM sections WHERE id = ?', [req.params.id]);
    res.json({ ok: true });
  })
);

app.post(
  '/api/sections/:id/move',
  authMiddleware,
  adminOnly,
  wrap(async (req, res) => {
    const { direction } = req.body || {};
    const pool = getPool();
    const [sections] = await pool.query('SELECT id, position FROM sections ORDER BY position, id');
    const index = sections.findIndex((s) => s.id === Number(req.params.id));
    if (index === -1) return res.status(404).json({ error: 'Secao nao encontrada' });

    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= sections.length) return res.json({ ok: true });

    const current = sections[index];
    const target = sections[targetIndex];
    await pool.query('UPDATE sections SET position = ? WHERE id = ?', [target.position, current.id]);
    await pool.query('UPDATE sections SET position = ? WHERE id = ?', [current.position, target.id]);
    res.json({ ok: true });
  })
);

app.post(
  '/api/items',
  authMiddleware,
  adminOnly,
  wrap(async (req, res) => {
    const { sectionId, label, instructions } = req.body || {};
    if (!sectionId || !label || !label.trim()) {
      return res.status(400).json({ error: 'Secao e nome do item sao obrigatorios' });
    }

    const pool = getPool();
    const [result] = await pool.query(
      `INSERT INTO items (section_id, label, instructions, position)
       SELECT ?, ?, ?, COALESCE(MAX(position), -1) + 1 FROM items WHERE section_id = ?`,
      [sectionId, label.trim(), sanitizeInstructions(instructions), sectionId]
    );
    res.status(201).json({
      item: { id: result.insertId, label: label.trim(), instructions: sanitizeInstructions(instructions) ? instructions : null }
    });
  })
);

app.put(
  '/api/items/:id',
  authMiddleware,
  adminOnly,
  wrap(async (req, res) => {
    const { label, instructions } = req.body || {};
    if (!label || !label.trim()) return res.status(400).json({ error: 'Nome do item e obrigatorio' });

    await getPool().query('UPDATE items SET label = ?, instructions = ? WHERE id = ?', [
      label.trim(),
      sanitizeInstructions(instructions),
      req.params.id
    ]);
    res.json({ ok: true });
  })
);

app.delete(
  '/api/items/:id',
  authMiddleware,
  adminOnly,
  wrap(async (req, res) => {
    await getPool().query('DELETE FROM items WHERE id = ?', [req.params.id]);
    res.json({ ok: true });
  })
);

app.post(
  '/api/items/:id/move',
  authMiddleware,
  adminOnly,
  wrap(async (req, res) => {
    const { direction } = req.body || {};
    const pool = getPool();
    const [[item]] = await pool.query('SELECT id, section_id, position FROM items WHERE id = ?', [req.params.id]);
    if (!item) return res.status(404).json({ error: 'Item nao encontrado' });

    const [siblings] = await pool.query('SELECT id, position FROM items WHERE section_id = ? ORDER BY position, id', [
      item.section_id
    ]);
    const index = siblings.findIndex((s) => s.id === item.id);
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= siblings.length) return res.json({ ok: true });

    const target = siblings[targetIndex];
    await pool.query('UPDATE items SET position = ? WHERE id = ?', [target.position, item.id]);
    await pool.query('UPDATE items SET position = ? WHERE id = ?', [item.position, target.id]);
    res.json({ ok: true });
  })
);

// --- Registros ---
app.get(
  '/api/registros',
  authMiddleware,
  wrap(async (req, res) => {
    const { date } = req.query;
    if (!date) return res.status(400).json({ error: 'Parametro date e obrigatorio' });

    const [rows] = await getPool().query(
      `SELECT r.item_id, r.status, r.obs, r.registered_at, u.id AS user_id, u.name AS user_name, u.username
       FROM registros r JOIN users u ON u.id = r.user_id
       WHERE r.date = ?`,
      [date]
    );

    res.json({ registros: rows });
  })
);

app.post(
  '/api/registros',
  authMiddleware,
  wrap(async (req, res) => {
    const { itemId, date, status, obs } = req.body || {};
    if (!itemId || !date) {
      return res.status(400).json({ error: 'Dados incompletos' });
    }
    const safeStatus = status === 'offline' ? 'offline' : 'online';
    if (safeStatus === 'offline' && (!obs || !obs.trim())) {
      return res.status(400).json({ error: 'Explique o motivo do item estar offline' });
    }
    const safeObs = safeStatus === 'offline' ? obs.trim() : null;

    const pool = getPool();
    try {
      await pool.query(
        `INSERT INTO registros (item_id, date, user_id, status, obs)
         VALUES (?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE user_id = VALUES(user_id), status = VALUES(status), obs = VALUES(obs), registered_at = CURRENT_TIMESTAMP`,
        [itemId, date, req.user.id, safeStatus, safeObs]
      );
    } catch (err) {
      if (err.code === 'ER_NO_REFERENCED_ROW_2' || err.code === 'ER_NO_REFERENCED_ROW') {
        return res.status(400).json({ error: 'Item nao encontrado' });
      }
      throw err;
    }

    const [rows] = await pool.query(
      `SELECT r.item_id, r.status, r.obs, r.registered_at, u.id AS user_id, u.name AS user_name, u.username
       FROM registros r JOIN users u ON u.id = r.user_id
       WHERE r.item_id = ? AND r.date = ?`,
      [itemId, date]
    );

    res.status(201).json({ registro: rows[0] });
  })
);

app.delete(
  '/api/registros/:itemId',
  authMiddleware,
  wrap(async (req, res) => {
    const { itemId } = req.params;
    const { date } = req.query;
    if (!date) return res.status(400).json({ error: 'Parametro date e obrigatorio' });

    await getPool().query('DELETE FROM registros WHERE item_id = ? AND date = ?', [itemId, date]);
    res.json({ ok: true });
  })
);

app.delete(
  '/api/registros',
  authMiddleware,
  wrap(async (req, res) => {
    const { date } = req.query;
    if (!date) return res.status(400).json({ error: 'Parametro date e obrigatorio' });

    await getPool().query('DELETE FROM registros WHERE date = ?', [date]);
    res.json({ ok: true });
  })
);

// --- Estatisticas (somente admin) ---
app.get(
  '/api/stats/daily',
  authMiddleware,
  adminOnly,
  wrap(async (req, res) => {
    const days = Math.min(Math.max(Number(req.query.days) || 7, 1), 90);
    const pool = getPool();

    const [totalRows] = await pool.query('SELECT COUNT(*) AS count FROM items');
    const totalItems = totalRows[0].count;

    const [rows] = await pool.query(
      `SELECT date, status, COUNT(*) AS count
       FROM registros
       WHERE date >= DATE_SUB(CURDATE(), INTERVAL ? DAY)
       GROUP BY date, status`,
      [days - 1]
    );

    const byDate = {};
    rows.forEach((r) => {
      if (!byDate[r.date]) byDate[r.date] = { online: 0, offline: 0 };
      byDate[r.date][r.status] = r.count;
    });

    const daily = [];
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split('T')[0];
      const entry = byDate[dateStr] || { online: 0, offline: 0 };
      daily.push({
        date: dateStr,
        online: entry.online,
        offline: entry.offline,
        pending: Math.max(totalItems - entry.online - entry.offline, 0),
        total: totalItems
      });
    }

    res.json({ daily, totalItems });
  })
);

app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: 'Erro interno do servidor' });
});

const PORT = process.env.PORT || 4001;

init()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`API Checagem Manual rodando em http://localhost:${PORT}`);
    });
  })
  .catch((err) => {
    console.error('Falha ao conectar/inicializar o banco de dados MySQL:', err.message);
    process.exit(1);
  });
