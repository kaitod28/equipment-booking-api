import { Hono } from 'hono'

type Bindings = {
  DB: D1Database
}

const app = new Hono<{ Bindings: Bindings }>()

// 1. GET /api/equipment
app.get('/api/equipment', async (c) => {
  const { results } = await c.env.DB.prepare('SELECT * FROM equipment').all()
  return c.json(results)
})

// 2. POST /api/bookings
app.post('/api/bookings', async (c) => {
  const body = await c.req.json()
  const { equipmentId, title, startAt, endAt } = body

  // Validation: Missing fields
  if (!equipmentId || !title || !startAt || !endAt) {
    return c.json({ error: 'Missing required fields' }, 400)
  }

  // Validation: Chronology
  if (new Date(startAt) >= new Date(endAt)) {
    return c.json({ error: 'startAt must be strictly before endAt' }, 400)
  }

  // Check if equipment exists
  const eq = await c.env.DB.prepare('SELECT * FROM equipment WHERE id = ?').bind(equipmentId).first()
  if (!eq) {
    return c.json({ error: 'Equipment not found' }, 404)
  }

  // Validation: Overlap check
  const existing = await c.env.DB.prepare(
    'SELECT * FROM bookings WHERE equipmentId = ? AND startAt < ? AND endAt > ?'
  ).bind(equipmentId, endAt, startAt).first()

  if (existing) {
    return c.json({ error: 'Equipment is already booked for the selected time slot' }, 409)
  }

  // Insert new booking
  const id = `b-${Date.now()}`
  await c.env.DB.prepare(
    'INSERT INTO bookings (id, equipmentId, title, startAt, endAt) VALUES (?, ?, ?, ?, ?)'
  ).bind(id, equipmentId, title, startAt, endAt).run()

  return c.json({ id, equipmentId, title, startAt, endAt }, 201)
})

// 3. GET /api/bookings/:id
app.get('/api/bookings/:id', async (c) => {
  const id = c.req.param('id')
  const booking = await c.env.DB.prepare('SELECT * FROM bookings WHERE id = ?').bind(id).first()
  
  if (!booking) {
    return c.json({ error: 'Booking not found' }, 404)
  }

  return c.json(booking)
})

export default app