const express = require('express')
const cors = require('cors')
const { Pool } = require('pg')

const app = express()

// =====================================================
// CONEXIÓN CON POSTGRESQL
// =====================================================

const pool = new Pool({
  host: 'localhost',
  port: 5432,
  database: 'crm_rrhh',
  user: 'postgres',
  password: 'Emjaromo13'
})

// =====================================================
// CONFIGURACIÓN DEL SERVIDOR
// =====================================================

app.use(cors())
app.use(express.json())

// =====================================================
// RUTA DE PRUEBA DEL BACKEND
// =====================================================

app.get('/', (req, res) => {
  res.json({
    mensaje: 'Backend CRM-RRHH funcionando correctamente',
  })
})

// =====================================================
// RUTA DE PRUEBA DE POSTGRESQL
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
// INICIAR SERVIDOR
// =====================================================

const PORT = process.env.PORT || 3000

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Servidor CRM-RRHH ejecutándose en http://localhost:${PORT}`)
})