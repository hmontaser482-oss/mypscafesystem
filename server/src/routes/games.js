const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const db = require('../db/database');
const { authenticate, authorize } = require('../middleware/auth');

// GET /api/games
router.get('/', (req, res, next) => {
  try {
    const { platform } = req.query;
    let query = "SELECT * FROM games WHERE 1=1";
    const params = [];

    if (platform) {
      query += " AND (platform = ? OR platform = 'Cross-Gen')";
      params.push(platform);
    }

    query += " ORDER BY name ASC";
    const games = db.prepare(query).all(...params);
    res.json({ success: true, games });
  } catch (err) {
    next(err);
  }
});

// POST /api/games
router.post('/', authenticate, authorize('admin', 'manager'), (req, res, next) => {
  try {
    const { name, platform, category, multiplayer_support, max_players, notes } = req.body;
    if (!name) return res.status(400).json({ success: false, message: 'يرجى إدخال اسم اللعبة' });

    const id = 'gm_' + uuidv4().slice(0, 8);
    db.prepare(`
      INSERT INTO games (id, name, platform, category, multiplayer_support, max_players, notes)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(id, name, platform || 'PS5', category || 'Sports', multiplayer_support ? 1 : 0, max_players || 4, notes || null);

    res.json({ success: true, message: 'تمت إضافة اللعبة بنجاح', gameId: id });
  } catch (err) {
    next(err);
  }
});

// PUT /api/games/:id
router.put('/:id', authenticate, authorize('admin', 'manager'), (req, res, next) => {
  try {
    const { id } = req.params;
    const { name, platform, category, multiplayer_support, max_players, notes } = req.body;

    db.prepare(`
      UPDATE games
      SET name = ?, platform = ?, category = ?, multiplayer_support = ?, max_players = ?, notes = ?
      WHERE id = ?
    `).run(name, platform, category, multiplayer_support ? 1 : 0, max_players, notes, id);

    res.json({ success: true, message: 'تم تحديث بيانات اللعبة بنجاح' });
  } catch (err) {
    next(err);
  }
});

// DELETE /api/games/:id
router.delete('/:id', authenticate, authorize('admin'), (req, res, next) => {
  try {
    const { id } = req.params;
    db.prepare('DELETE FROM games WHERE id = ?').run(id);
    res.json({ success: true, message: 'تم حذف اللعبة بنجاح' });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
