import { serve } from '@hono/node-server';
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import sqlite3 from 'sqlite3';
const app = new Hono();
app.use('*', cors());
// 1. เชื่อมต่อฐานข้อมูล SQLite
const db = new sqlite3.Database('./campus.db');
// 2. สร้างตารางและข้อมูลตั้งต้น (Seed Data)
db.serialize(() => {
    db.run(`
    CREATE TABLE IF NOT EXISTS equipment (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      location TEXT NOT NULL
    )
  `);
    db.run(`
    CREATE TABLE IF NOT EXISTS bookings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      equipmentId TEXT NOT NULL,
      borrowerName TEXT NOT NULL,
      startAt TEXT NOT NULL,
      endAt TEXT NOT NULL,
      purpose TEXT NOT NULL,
      FOREIGN KEY (equipmentId) REFERENCES equipment(id)
    )
  `);
    // เพิ่มข้อมูลอุปกรณ์จำลอง 2 ชิ้นตามโจทย์
    db.run(`INSERT OR IGNORE INTO equipment (id, name, location) VALUES ('eq-1', 'Projector A', 'Building 1')`);
    db.run(`INSERT OR IGNORE INTO equipment (id, name, location) VALUES ('eq-2', 'Camera B', 'Building 2')`);
});
// Helper Functions สำหรับ SQL Parameter Binding
const dbGet = (sql, params) => {
    return new Promise((resolve, reject) => {
        db.get(sql, params, (err, row) => (err ? reject(err) : resolve(row)));
    });
};
const dbAll = (sql, params) => {
    return new Promise((resolve, reject) => {
        db.all(sql, params, (err, rows) => (err ? reject(err) : resolve(rows)));
    });
};
const dbRun = (sql, params) => {
    return new Promise((resolve, reject) => {
        db.run(sql, params, function (err) {
            if (err)
                reject(err);
            else
                resolve({ lastID: this.lastID, changes: this.changes });
        });
    });
};
const isValidDate = (dStr) => !isNaN(Date.parse(dStr));
// --- API ENDPOINTS ---
// GET /api/equipment
app.get('/api/equipment', async (c) => {
    const rows = await dbAll('SELECT id, name, location FROM equipment', []);
    return c.json(rows, 200);
});
// GET /api/bookings
app.get('/api/bookings', async (c) => {
    const rows = await dbAll('SELECT id, equipmentId, borrowerName, startAt, endAt, purpose FROM bookings', []);
    return c.json(rows, 200);
});
// GET /api/bookings/:id
app.get('/api/bookings/:id', async (c) => {
    const id = c.req.param('id');
    const row = await dbGet('SELECT id, equipmentId, borrowerName, startAt, endAt, purpose FROM bookings WHERE id = ?', [id]);
    if (!row) {
        return c.json({ error: 'Booking not found' }, 404);
    }
    return c.json(row, 200);
});
// POST /api/bookings (สร้างการจองใหม่)
app.post('/api/bookings', async (c) => {
    let body;
    try {
        body = await c.req.json();
    }
    catch {
        return c.json({ error: 'Invalid JSON body' }, 400);
    }
    const { equipmentId, borrowerName, startAt, endAt, purpose } = body;
    // Validation 1: ตรวจสอบข้อมูลจำเป็น
    if (!equipmentId || !borrowerName || !startAt || !endAt || !purpose) {
        return c.json({ error: 'Missing required fields' }, 400);
    }
    // Validation 2: ตรวจสอบรูปแบบเวลา และ startAt ต้องก่อน endAt
    if (!isValidDate(startAt) || !isValidDate(endAt)) {
        return c.json({ error: 'Invalid date format' }, 400);
    }
    if (new Date(startAt) >= new Date(endAt)) {
        return c.json({ error: 'startAt must be before endAt' }, 400);
    }
    // Validation 3: เช็กว่ามี equipmentId นี้จริงไหม
    const eq = await dbGet('SELECT id FROM equipment WHERE id = ?', [equipmentId]);
    if (!eq) {
        return c.json({ error: 'Equipment not found' }, 404);
    }
    // Validation 4: เช็กการจองเวลาทับซ้อน (Overlap Logic)
    const overlap = await dbGet('SELECT id FROM bookings WHERE equipmentId = ? AND startAt < ? AND endAt > ?', [equipmentId, endAt, startAt]);
    if (overlap) {
        return c.json({ error: 'Booking time conflicts with an existing booking' }, 409);
    }
    // บันทึกลง DB ด้วย Parameter Binding
    const result = await dbRun('INSERT INTO bookings (equipmentId, borrowerName, startAt, endAt, purpose) VALUES (?, ?, ?, ?, ?)', [equipmentId, borrowerName, startAt, endAt, purpose]);
    return c.json({ id: result.lastID, equipmentId, borrowerName, startAt, endAt, purpose }, 201);
});
// PATCH /api/bookings/:id (แก้ไขการจอง)
app.patch('/api/bookings/:id', async (c) => {
    const id = c.req.param('id');
    const existing = await dbGet('SELECT * FROM bookings WHERE id = ?', [id]);
    if (!existing) {
        return c.json({ error: 'Booking not found' }, 404);
    }
    let body;
    try {
        body = await c.req.json();
    }
    catch {
        return c.json({ error: 'Invalid JSON body' }, 400);
    }
    const equipmentId = body.equipmentId ?? existing.equipmentId;
    const borrowerName = body.borrowerName ?? existing.borrowerName;
    const startAt = body.startAt ?? existing.startAt;
    const endAt = body.endAt ?? existing.endAt;
    const purpose = body.purpose ?? existing.purpose;
    if (!isValidDate(startAt) || !isValidDate(endAt)) {
        return c.json({ error: 'Invalid date format' }, 400);
    }
    if (new Date(startAt) >= new Date(endAt)) {
        return c.json({ error: 'startAt must be before endAt' }, 400);
    }
    const eq = await dbGet('SELECT id FROM equipment WHERE id = ?', [equipmentId]);
    if (!eq) {
        return c.json({ error: 'Equipment not found' }, 404);
    }
    // Overlap Check (ยกเว้น ID ของตัวเอง)
    const overlap = await dbGet('SELECT id FROM bookings WHERE equipmentId = ? AND id != ? AND startAt < ? AND endAt > ?', [equipmentId, id, endAt, startAt]);
    if (overlap) {
        return c.json({ error: 'Booking time conflicts with an existing booking' }, 409);
    }
    await dbRun('UPDATE bookings SET equipmentId = ?, borrowerName = ?, startAt = ?, endAt = ?, purpose = ? WHERE id = ?', [equipmentId, borrowerName, startAt, endAt, purpose, id]);
    return c.json({ id: Number(id), equipmentId, borrowerName, startAt, endAt, purpose }, 200);
});
// DELETE /api/bookings/:id (ลบการจอง)
app.delete('/api/bookings/:id', async (c) => {
    const id = c.req.param('id');
    const existing = await dbGet('SELECT id FROM bookings WHERE id = ?', [id]);
    if (!existing) {
        return c.json({ error: 'Booking not found' }, 404);
    }
    await dbRun('DELETE FROM bookings WHERE id = ?', [id]);
    return c.body(null, 204);
});
const port = 3000;
console.log(`Server is running on port ${port}`);
serve({
    fetch: app.fetch,
    port
});
