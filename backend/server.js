const express = require('express')
const cors = require('cors')
const { Pool } = require('pg')
const bcrypt = require('bcryptjs')
const jwt = require('jsonwebtoken')
require('dotenv').config()

const app = express()

// =====================================================
// CONEXIÓN CON POSTGRESQL
// =====================================================

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false,
  },
})

// =====================================================
// CONFIGURACIÓN DEL SERVIDOR
// =====================================================

app.use(cors())
app.use(express.json())

// =====================================================
// RUTA PRINCIPAL
// =====================================================

app.get('/', (req, res) => {
  res.json({
    mensaje: 'Backend CRM-RRHH funcionando correctamente',
  })
})

// =====================================================
// PRUEBA DE CONEXIÓN CON POSTGRESQL
// =====================================================

app.get('/api/test-db', async (req, res) => {
  try {
    const result = await pool.query('SELECT NOW()')

    res.json({
      conectado: true,
      mensaje: 'Conexión con PostgreSQL funcionando',
      fecha: result.rows[0].now,
    })
  } catch (error) {
    console.error('Error de conexión a PostgreSQL:', error)

    res.status(500).json({
      conectado: false,
      mensaje: 'No se pudo conectar con PostgreSQL',
      error: error.message,
    })
  }
})

// =====================================================
// OBTENER EMPLEADOS
// =====================================================

app.get('/api/empleados', async (req, res) => {
  try {
    console.log('🔎 Ejecutando /api/empleados')

    const result = await pool.query(`
      SELECT
        id,
        nombre,
        documento,
        cargo,
        sede_id,
        username,
        estado
      FROM empleados
      ORDER BY id
    `)

    res.json(result.rows)
  } catch (error) {
    console.error('Error al obtener empleados:', error)

    res.status(500).json({
      mensaje: 'Error al obtener empleados',
      error: error.message,
    })
  }
})

// =====================================================
// CREAR EMPLEADO
// =====================================================

app.post('/api/empleados', async (req, res) => {
  try {
    const {
      nombre,
      documento,
      cargo,
      username,
      estado,
    } = req.body

    const result = await pool.query(
      `
      INSERT INTO empleados
        (nombre, documento, cargo, username, estado)
      VALUES
        ($1, $2, $3, $4, $5)
      RETURNING
        id,
        nombre,
        documento,
        cargo,
        username,
        estado
      `,
      [
        nombre,
        documento,
        cargo,
        username,
        estado || 'Activo',
      ]
    )

    res.status(201).json(result.rows[0])
  } catch (error) {
    console.error('Error al crear empleado:', error)

    res.status(500).json({
      mensaje: 'Error al crear empleado',
      error: error.message,
    })
  }
})

// =====================================================
// OBTENER TIPOS DE TURNO
// =====================================================

app.get('/api/tipos-turno', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT
        id,
        nombre,
        hora_inicio,
        hora_fin
      FROM tipos_turno
      ORDER BY id
    `)

    res.json(result.rows)
  } catch (error) {
    console.error('Error al obtener tipos de turno:', error)

    res.status(500).json({
      mensaje: 'Error al obtener tipos de turno',
      error: error.message,
    })
  }
})

// =====================================================
// OBTENER ASIGNACIONES
// =====================================================

app.get('/api/asignaciones', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT *
      FROM asignaciones
      ORDER BY id
    `)

    res.json(result.rows)
  } catch (error) {
    console.error('Error al obtener asignaciones:', error)

    res.status(500).json({
      mensaje: 'Error al obtener asignaciones',
      error: error.message,
    })
  }
})

// =====================================================
// OBTENER ASISTENCIAS
// =====================================================

app.get('/api/asistencias', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT *
      FROM asistencias
      ORDER BY id
    `)

    res.json(result.rows)
  } catch (error) {
    console.error('Error al obtener asistencias:', error)

    res.status(500).json({
      mensaje: 'Error al obtener asistencias',
      error: error.message,
    })
  }
})

// =====================================================
// OBTENER SEDES
// =====================================================

app.get('/api/sedes', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT *
      FROM sedes
      ORDER BY id
    `)

    res.json(result.rows)
  } catch (error) {
    console.error('Error al obtener sedes:', error)

    res.status(500).json({
      mensaje: 'Error al obtener sedes',
      error: error.message,
    })
  }
})

// =====================================================
// CREAR ASIGNACIÓN
// =====================================================

app.post('/api/asignaciones', async (req, res) => {
  try {
    const {
      empleado_id,
      sede_id,
      fecha,
      turno_id,
    } = req.body

    const result = await pool.query(
      `
      INSERT INTO asignaciones
        (empleado_id, sede_id, fecha, turno_id)
      VALUES
        ($1, $2, $3, $4)
      RETURNING
        id,
        empleado_id,
        sede_id,
        fecha,
        turno_id
      `,
      [
        empleado_id,
        sede_id,
        fecha,
        turno_id,
      ]
    )

    res.status(201).json(result.rows[0])
  } catch (error) {
    console.error('Error al crear asignación:', error)

    res.status(500).json({
      mensaje: 'Error al crear asignación',
      error: error.message,
    })
  }
})

// =====================================================
// EDITAR ASIGNACIÓN
// =====================================================

app.put('/api/asignaciones/:id', async (req, res) => {
  try {
    const { id } = req.params

    const {
      empleado_id,
      sede_id,
      fecha,
      turno_id,
    } = req.body

    const result = await pool.query(
      `
      UPDATE asignaciones
      SET
        empleado_id = $1,
        sede_id = $2,
        fecha = $3,
        turno_id = $4
      WHERE id = $5
      RETURNING
        id,
        empleado_id,
        sede_id,
        fecha,
        turno_id
      `,
      [
        empleado_id,
        sede_id,
        fecha,
        turno_id,
        id,
      ]
    )

    if (result.rows.length === 0) {
      return res.status(404).json({
        mensaje: 'Asignación no encontrada',
      })
    }

    res.json(result.rows[0])
  } catch (error) {
    console.error('Error al editar asignación:', error)

    res.status(500).json({
      mensaje: 'Error al editar asignación',
      error: error.message,
    })
  }
})

// =====================================================
// ELIMINAR ASIGNACIÓN
// =====================================================

app.delete('/api/asignaciones/:id', async (req, res) => {
  try {
    const { id } = req.params

    const result = await pool.query(
      `
      DELETE FROM asignaciones
      WHERE id = $1
      RETURNING id
      `,
      [id]
    )

    if (result.rows.length === 0) {
      return res.status(404).json({
        mensaje: 'Asignación no encontrada',
      })
    }

    res.json({
      mensaje: 'Asignación eliminada correctamente',
      id: result.rows[0].id,
    })
  } catch (error) {
    console.error('Error al eliminar asignación:', error)

    res.status(500).json({
      mensaje: 'Error al eliminar asignación',
      error: error.message,
    })
  }
})

// =====================================================
// LOGIN
// =====================================================

app.post('/api/login', async (req, res) => {
  try {
    const { username, password } = req.body

    if (!username || !password) {
      return res.status(400).json({
        mensaje: 'Usuario y contraseña son obligatorios',
      })
    }

    const result = await pool.query(
      `
      SELECT id, username, password_hash, nombre, rol, activo
      FROM usuarios
      WHERE username = $1
      `,
      [username]
    )

    if (result.rows.length === 0) {
      return res.status(401).json({
        mensaje: 'Usuario o contraseña incorrectos',
      })
    }

    const usuario = result.rows[0]

    if (!usuario.activo) {
      return res.status(403).json({
        mensaje: 'El usuario está inactivo',
      })
    }

    const passwordCorrecta = await bcrypt.compare(
      password,
      usuario.password_hash
    )

    if (!passwordCorrecta) {
      return res.status(401).json({
        mensaje: 'Usuario o contraseña incorrectos',
      })
    }

    const token = jwt.sign(
      {
        id: usuario.id,
        username: usuario.username,
        nombre: usuario.nombre,
        rol: usuario.rol,
      },
      process.env.JWT_SECRET,
      {
        expiresIn: '8h',
      }
    )

    res.json({
      mensaje: 'Login correcto',
      token,
      usuario: {
        id: usuario.id,
        username: usuario.username,
        nombre: usuario.nombre,
        rol: usuario.rol,
      },
    })
  } catch (error) {
    console.error('Error en login:', error)

    res.status(500).json({
      mensaje: 'Error al iniciar sesión',
      error: error.message,
    })
  }
})

// =====================================================
// INICIAR SERVIDOR
// =====================================================

const PORT = process.env.PORT || 3000

app.listen(PORT, '0.0.0.0', () => {
  console.log(
    `Servidor CRM-RRHH ejecutándose en http://localhost:${PORT}`
  )
})