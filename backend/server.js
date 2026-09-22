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
// AUTENTICACIÓN JWT
// =====================================================

function verificarToken(req, res, next) {
  const authHeader = req.headers.authorization

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      mensaje: 'Token no proporcionado',
    })
  }

  const token = authHeader.split(' ')[1]

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET)

    req.usuario = decoded

    next()
  } catch (error) {
    return res.status(401).json({
      mensaje: 'Token inválido o expirado',
    })
  }
}

// =====================================================
// AUTORIZACIÓN POR ROL
// =====================================================

function permitirRoles(...rolesPermitidos) {
  return (req, res, next) => {
    if (!req.usuario) {
      return res.status(401).json({
        mensaje: 'No autenticado',
      })
    }

    if (!rolesPermitidos.includes(req.usuario.rol)) {
      return res.status(403).json({
        mensaje: 'No tienes permisos para realizar esta acción',
      })
    }

    next()
  }
}

// =====================================================
// AUTORIZACIÓN POR SEDE
// =====================================================

const sedesPorRol = {
  LIDER_ZONA_1: [1, 2, 3, 4, 5],
  LIDER_ZONA_2: [6, 7, 8, 9, 10],
  LIDER_GIGANTE: [11],
  LIDER_ZULUAGA: [12],
}

function verificarSede(req, res, next) {
  // ADMIN puede trabajar con cualquier sede
  if (req.usuario.rol === 'ADMIN') {
    return next()
  }

  // JEFE no puede modificar
  if (req.usuario.rol === 'JEFE') {
    return res.status(403).json({
      mensaje: 'El rol JEFE solo tiene permisos de visualización',
    })
  }

  const sedesPermitidas = sedesPorRol[req.usuario.rol]

  if (!sedesPermitidas) {
    return res.status(403).json({
      mensaje: 'Rol sin sedes asignadas',
    })
  }

  const sedeId = Number(req.body.sede_id)

  if (!sedesPermitidas.includes(sedeId)) {
    return res.status(403).json({
      mensaje: 'No tienes permisos para modificar esta sede',
    })
  }

  next()
}

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

app.get(
  '/api/empleados',
  verificarToken,
  permitirRoles(
    'ADMIN',
    'JEFE',
    'LIDER_ZONA_1',
    'LIDER_ZONA_2',
    'LIDER_GIGANTE',
    'LIDER_ZULUAGA'
  ),
  async (req, res) => {
    try {
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
      console.error('Error obteniendo empleados:', error)

      res.status(500).json({
        mensaje: 'Error obteniendo empleados',
        error: error.message,
      })
    }
  }
)

// =====================================================
// CREAR EMPLEADO
// =====================================================

app.post(
  '/api/empleados',
  verificarToken,
  permitirRoles('ADMIN'),
  async (req, res) => {
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
  }
)
// =====================================================
// EDITAR EMPLEADO
// =====================================================

app.put(
  '/api/empleados/:id',
  verificarToken,
  permitirRoles('ADMIN'),
  async (req, res) => {
    try {
      const { id } = req.params

      const {
        nombre,
        documento,
        cargo,
        username,
        estado,
      } = req.body

      const result = await pool.query(
        `
        UPDATE empleados
        SET
          nombre = $1,
          documento = $2,
          cargo = $3,
          username = $4,
          estado = $5
        WHERE id = $6
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
          id,
        ]
      )

      if (result.rows.length === 0) {
        return res.status(404).json({
          mensaje: 'Empleado no encontrado',
        })
      }

      res.json(result.rows[0])
    } catch (error) {
      console.error('Error al editar empleado:', error)

      res.status(500).json({
        mensaje: 'Error al editar empleado',
        error: error.message,
      })
    }
  }
)

// =====================================================
// ELIMINAR EMPLEADO
// =====================================================

app.delete(
  '/api/empleados/:id',
  verificarToken,
  permitirRoles('ADMIN'),
  async (req, res) => {
    try {
      const { id } = req.params

      const result = await pool.query(
        `
        DELETE FROM empleados
        WHERE id = $1
        RETURNING id
        `,
        [id]
      )

      if (result.rows.length === 0) {
        return res.status(404).json({
          mensaje: 'Empleado no encontrado',
        })
      }

      res.json({
        mensaje: 'Empleado eliminado correctamente',
        id: result.rows[0].id,
      })
    } catch (error) {
      console.error('Error al eliminar empleado:', error)

      res.status(500).json({
        mensaje: 'Error al eliminar empleado',
        error: error.message,
      })
    }
  }
)
// =====================================================
// OBTENER TIPOS DE TURNO
// =====================================================

app.get(
  '/api/tipos-turno',
  verificarToken,
  permitirRoles(
    'ADMIN',
    'JEFE',
    'LIDER_ZONA_1',
    'LIDER_ZONA_2',
    'LIDER_GIGANTE',
    'LIDER_ZULUAGA'
  ),
  async (req, res) => {
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
  }
)

// =====================================================
// OBTENER ASIGNACIONES
// =====================================================

app.get(
  '/api/asignaciones',
  verificarToken,
  permitirRoles(
    'ADMIN',
    'JEFE',
    'LIDER_ZONA_1',
    'LIDER_ZONA_2',
    'LIDER_GIGANTE',
    'LIDER_ZULUAGA'
  ),
  async (req, res) => {
    try {
      let query = `
        SELECT *
        FROM asignaciones
      `

      let params = []

      // ADMIN y JEFE pueden visualizar todas las asignaciones
      if (
        req.usuario.rol !== 'ADMIN' &&
        req.usuario.rol !== 'JEFE'
      ) {
        const sedesPermitidas = sedesPorRol[req.usuario.rol]

        if (!sedesPermitidas) {
          return res.status(403).json({
            mensaje: 'Rol sin sedes asignadas',
          })
        }

        query += `
          WHERE sede_id = ANY($1::int[])
        `

        params = [sedesPermitidas]
      }

      query += `
        ORDER BY id
      `

      const result = await pool.query(query, params)

      res.json(result.rows)
    } catch (error) {
      console.error('Error al obtener asignaciones:', error)

      res.status(500).json({
        mensaje: 'Error al obtener asignaciones',
        error: error.message,
      })
    }
  }
)

// =====================================================
// OBTENER ASISTENCIAS (FILTRADAS POR SEDE)
// =====================================================

app.get(
  '/api/asistencias',
  verificarToken,
  permitirRoles(
    'ADMIN',
    'JEFE',
    'LIDER_ZONA_1',
    'LIDER_ZONA_2',
    'LIDER_GIGANTE',
    'LIDER_ZULUAGA'
  ),
  async (req, res) => {
    try {
      let query = `
        SELECT *
        FROM asistencias
      `

      const params = []

      // ADMIN y JEFE pueden visualizar todas las asistencias
      if (
        req.usuario.rol !== 'ADMIN' &&
        req.usuario.rol !== 'JEFE'
      ) {
        const sedesPermitidas = sedesPorRol[req.usuario.rol]

        if (!sedesPermitidas) {
          return res.status(403).json({
            mensaje: 'Rol sin sedes asignadas',
          })
        }

        query += `
          WHERE sede_id = ANY($1::int[])
        `

        params.push(sedesPermitidas)
      }

      query += `
        ORDER BY id
      `

      const result = await pool.query(query, params)

      res.json(result.rows)
    } catch (error) {
      console.error('Error al obtener asistencias:', error)

      res.status(500).json({
        mensaje: 'Error al obtener asistencias',
        error: error.message,
      })
    }
  }
)
// =====================================================
// CREAR ASISTENCIA
// =====================================================

app.post(
  '/api/asistencias',
  verificarToken,
  permitirRoles(
    'ADMIN',
    'LIDER_ZONA_1',
    'LIDER_ZONA_2',
    'LIDER_GIGANTE',
    'LIDER_ZULUAGA'
  ),
  verificarSede,
  async (req, res) => {
    try {
      const {
        empleado_id,
        sede_id,
        fecha,
        scheduled_start,
        real_start,
        late_minutes,
        discount,
        paid_hours,
        hora_entrada,
        hora_salida,
        estado,
        observacion,
      } = req.body

      const result = await pool.query(
        `
        INSERT INTO asistencias
          (
            empleado_id,
            sede_id,
            fecha,
            hora_entrada,
            hora_salida,
            estado,
            observacion,
            scheduled_start,
            real_start,
            late_minutes,
            discount,
            paid_hours
          )
        VALUES
          ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
        RETURNING
          id,
          empleado_id,
          sede_id,
          fecha,
          hora_entrada,
          hora_salida,
          estado,
          observacion,
          scheduled_start,
          real_start,
          late_minutes,
          discount,
          paid_hours
        `,
        [
          empleado_id,
          sede_id,
          fecha,
          hora_entrada ?? real_start,
          hora_salida ?? null,
          estado || 'Registrada',
          observacion ?? null,
          scheduled_start,
          real_start,
          late_minutes ?? 0,
          discount ?? false,
          paid_hours ?? 0,
        ]
      )

      res.status(201).json(result.rows[0])
    } catch (error) {
      console.error('Error al crear asistencia:', error)

      res.status(500).json({
        mensaje: 'Error al crear asistencia',
        error: error.message,
      })
    }
  }
)
// =====================================================
// EDITAR ASISTENCIA
// =====================================================

app.put(
  '/api/asistencias/:id',
  verificarToken,
  permitirRoles(
    'ADMIN',
    'LIDER_ZONA_1',
    'LIDER_ZONA_2',
    'LIDER_GIGANTE',
    'LIDER_ZULUAGA'
  ),
  async (req, res) => {
    try {
      const { id } = req.params

      const {
        real_start,
        late_minutes,
        discount,
        paid_hours,
        hora_entrada,
        hora_salida,
        estado,
        observacion,
      } = req.body

      const asistenciaActual = await pool.query(
        `
        SELECT sede_id
        FROM asistencias
        WHERE id = $1
        `,
        [id]
      )

      if (asistenciaActual.rows.length === 0) {
        return res.status(404).json({
          mensaje: 'Asistencia no encontrada',
        })
      }

      const sedeId = asistenciaActual.rows[0].sede_id

      if (
        req.usuario.rol !== 'ADMIN' &&
        req.usuario.rol !== 'JEFE'
      ) {
        const sedesPermitidas =
          sedesPorRol[req.usuario.rol]

        if (
          !sedesPermitidas ||
          !sedesPermitidas.includes(Number(sedeId))
        ) {
          return res.status(403).json({
            mensaje:
              'No tienes permiso para modificar esta asistencia',
          })
        }
      }

      const result = await pool.query(
        `
        UPDATE asistencias
        SET
          hora_entrada = COALESCE($1, hora_entrada),
          hora_salida = $2,
          estado = COALESCE($3, estado),
          observacion = $4,
          real_start = COALESCE($5, real_start),
          late_minutes = COALESCE($6, late_minutes),
          discount = COALESCE($7, discount),
          paid_hours = COALESCE($8, paid_hours)
        WHERE id = $9
        RETURNING
          id,
          empleado_id,
          sede_id,
          fecha,
          hora_entrada,
          hora_salida,
          estado,
          observacion,
          scheduled_start,
          real_start,
          late_minutes,
          discount,
          paid_hours
        `,
        [
          hora_entrada ?? real_start,
          hora_salida ?? null,
          estado,
          observacion ?? null,
          real_start,
          late_minutes,
          discount,
          paid_hours,
          id,
        ]
      )

      res.json(result.rows[0])
    } catch (error) {
      console.error('Error al editar asistencia:', error)

      res.status(500).json({
        mensaje: 'Error al editar asistencia',
        error: error.message,
      })
    }
  }
)
// =====================================================
// ELIMINAR ASISTENCIAS MASIVAMENTE
// =====================================================

app.delete(
  '/api/asistencias/eliminar-masivo',
  verificarToken,
  permitirRoles(
    'ADMIN',
    'LIDER_ZONA_1',
    'LIDER_ZONA_2',
    'LIDER_GIGANTE',
    'LIDER_ZULUAGA'
  ),
  async (req, res) => {
    try {
      const { ids, fecha } = req.body

      if (!Array.isArray(ids) || ids.length === 0) {
        return res.status(400).json({
          mensaje: 'Debes seleccionar al menos una asistencia',
        })
      }

      if (!fecha) {
        return res.status(400).json({
          mensaje:
            'La fecha es obligatoria para eliminar las asistencias',
        })
      }

      const idsNumericos = ids
        .map(Number)
        .filter(
          (id) => Number.isInteger(id) && id > 0
        )

      if (idsNumericos.length !== ids.length) {
        return res.status(400).json({
          mensaje: 'Los IDs de las asistencias no son válidos',
        })
      }

      // Buscar las asistencias seleccionadas
      const asistencias = await pool.query(
        `
        SELECT
          id,
          sede_id,
          fecha
        FROM asistencias
        WHERE id = ANY($1::int[])
        `,
        [idsNumericos]
      )

      // Verificar que todas existan
      if (
        asistencias.rows.length !==
        idsNumericos.length
      ) {
        return res.status(404).json({
          mensaje:
            'Una o más asistencias seleccionadas no fueron encontradas',
        })
      }

      // =====================================================
      // VERIFICAR FECHA
      // =====================================================
const fechaSeleccionada = String(fecha).slice(0, 10)

const registrosOtraFecha = await pool.query(
  `
  SELECT id
  FROM asistencias
  WHERE id = ANY($1::int[])
    AND fecha::date <> $2::date
  `,
  [idsNumericos, fechaSeleccionada]
)

if (registrosOtraFecha.rows.length > 0) {
  return res.status(403).json({
    mensaje:
      'Solo puedes eliminar asistencias correspondientes al día seleccionado',
  })
}
      // =====================================================
      // VERIFICAR PERMISOS POR SEDE
      // =====================================================

      if (req.usuario.rol !== 'ADMIN') {
        const sedesPermitidas =
          sedesPorRol[req.usuario.rol]

        if (!sedesPermitidas) {
          return res.status(403).json({
            mensaje: 'Rol sin sedes asignadas',
          })
        }

        const tieneSedeNoPermitida =
          asistencias.some(
            (asistencia) =>
              !sedesPermitidas.includes(
                Number(asistencia.sede_id)
              )
          )

        if (tieneSedeNoPermitida) {
          return res.status(403).json({
            mensaje:
              'No tienes permisos para eliminar una o más asistencias seleccionadas',
          })
        }
      }

      // =====================================================
      // ELIMINAR
      // =====================================================

      const result = await pool.query(
        `
        DELETE FROM asistencias
        WHERE id = ANY($1::int[])
        RETURNING id
        `,
        [idsNumericos]
      )

      res.json({
        mensaje: `Se eliminaron ${result.rows.length} asistencia(s) correctamente.`,
        eliminadas: result.rows.length,
        ids: result.rows.map(
          (asistencia) => asistencia.id
        ),
      })
    } catch (error) {
      console.error(
        'Error al eliminar asistencias masivamente:',
        error
      )

      res.status(500).json({
        mensaje:
          'Error al eliminar las asistencias seleccionadas',
        error: error.message,
      })
    }
  }
)
// =====================================================
// ELIMINAR ASISTENCIA
// =====================================================

app.delete(
  '/api/asistencias/:id',
  verificarToken,
  permitirRoles(
    'ADMIN',
    'LIDER_ZONA_1',
    'LIDER_ZONA_2',
    'LIDER_GIGANTE',
    'LIDER_ZULUAGA'
  ),
  async (req, res) => {
    try {
      const { id } = req.params

      const asistenciaActual = await pool.query(
        `
        SELECT sede_id
        FROM asistencias
        WHERE id = $1
        `,
        [id]
      )

      if (asistenciaActual.rows.length === 0) {
        return res.status(404).json({
          mensaje: 'Asistencia no encontrada',
        })
      }

      const sedeId = asistenciaActual.rows[0].sede_id

      if (
        req.usuario.rol !== 'ADMIN' &&
        req.usuario.rol !== 'JEFE'
      ) {
        const sedesPermitidas =
          sedesPorRol[req.usuario.rol]

        if (
          !sedesPermitidas ||
          !sedesPermitidas.includes(Number(sedeId))
        ) {
          return res.status(403).json({
            mensaje:
              'No tienes permiso para eliminar esta asistencia',
          })
        }
      }

      await pool.query(
        `
        DELETE FROM asistencias
        WHERE id = $1
        `,
        [id]
      )

      res.json({
        mensaje: 'Asistencia eliminada correctamente',
      })
    } catch (error) {
      console.error('Error al eliminar asistencia:', error)

      res.status(500).json({
        mensaje: 'Error al eliminar asistencia',
        error: error.message,
      })
    }
  }
)
// =====================================================
// ELIMINAR ASISTENCIA
// =====================================================

app.delete(
  '/api/asistencias/:id',
  verificarToken,
  permitirRoles(
    'ADMIN',
    'LIDER_ZONA_1',
    'LIDER_ZONA_2',
    'LIDER_GIGANTE',
    'LIDER_ZULUAGA'
  ),
  async (req, res) => {
    try {
      const { id } = req.params

      const asistenciaActual = await pool.query(
        `
        SELECT sede_id
        FROM asistencias
        WHERE id = $1
        `,
        [id]
      )

      if (asistenciaActual.rows.length === 0) {
        return res.status(404).json({
          mensaje: 'Asistencia no encontrada',
        })
      }

      const sedeId = asistenciaActual.rows[0].sede_id

      if (
        req.usuario.rol !== 'ADMIN' &&
        req.usuario.rol !== 'JEFE'
      ) {
        const sedesPermitidas =
          sedesPorRol[req.usuario.rol]

        if (
          !sedesPermitidas ||
          !sedesPermitidas.includes(Number(sedeId))
        ) {
          return res.status(403).json({
            mensaje:
              'No tienes permiso para eliminar esta asistencia',
          })
        }
      }

      await pool.query(
        `
        DELETE FROM asistencias
        WHERE id = $1
        `,
        [id]
      )

      res.json({
        mensaje: 'Asistencia eliminada correctamente',
      })
    } catch (error) {
      console.error('Error al eliminar asistencia:', error)

      res.status(500).json({
        mensaje: 'Error al eliminar asistencia',
        error: error.message,
      })
    }
  }
)
// =====================================================
// OBTENER SEDES (FILTRADAS POR LÍDER)
// =====================================================

app.get(
  '/api/sedes',
  verificarToken,
  permitirRoles(
    'ADMIN',
    'JEFE',
    'LIDER_ZONA_1',
    'LIDER_ZONA_2',
    'LIDER_GIGANTE',
    'LIDER_ZULUAGA'
  ),
  async (req, res) => {
    try {
      let query = `
        SELECT id, nombre, zona, lider, activo
        FROM sedes
      `

      const params = []

      if (
        req.usuario.rol !== 'ADMIN' &&
        req.usuario.rol !== 'JEFE'
      ) {
        const sedesPermitidas = sedesPorRol[req.usuario.rol]

        query += ` WHERE id = ANY($1::int[])`
        params.push(sedesPermitidas)
      }

      query += ` ORDER BY id`

      const result = await pool.query(query, params)

      res.json(result.rows)
    } catch (error) {
      console.error('Error obteniendo sedes:', error)
      res.status(500).json({
        mensaje: 'Error obteniendo sedes',
        error: error.message,
      })
    }
  }
)

// =====================================================
// CREAR ASIGNACIÓN
// =====================================================

app.post(
  '/api/asignaciones',
  verificarToken,
  permitirRoles(
    'ADMIN',
    'LIDER_ZONA_1',
    'LIDER_ZONA_2',
    'LIDER_GIGANTE',
    'LIDER_ZULUAGA'
  ),
  verificarSede,
  async (req, res) => {
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
  }
)

// =====================================================
// EDITAR ASIGNACIÓN
// =====================================================

app.put(
  '/api/asignaciones/:id',
  verificarToken,
  permitirRoles(
    'ADMIN',
    'LIDER_ZONA_1',
    'LIDER_ZONA_2',
    'LIDER_GIGANTE',
    'LIDER_ZULUAGA'
  ),
  async (req, res) => {
    try {
      const { id } = req.params

      const {
        empleado_id,
        sede_id,
        fecha,
        turno_id,
      } = req.body

      // ADMIN puede modificar cualquier asignación
      if (req.usuario.rol !== 'ADMIN') {
        // Buscar la asignación actual
        const asignacionActual = await pool.query(
          `
          SELECT sede_id
          FROM asignaciones
          WHERE id = $1
          `,
          [id]
        )

        if (asignacionActual.rows.length === 0) {
          return res.status(404).json({
            mensaje: 'Asignación no encontrada',
          })
        }

        const sedeActual = Number(
          asignacionActual.rows[0].sede_id
        )

        const sedesPermitidas = sedesPorRol[req.usuario.rol]

        if (
          !sedesPermitidas ||
          !sedesPermitidas.includes(sedeActual)
        ) {
          return res.status(403).json({
            mensaje: 'No tienes permisos para modificar esta sede',
          })
        }

        // También verificamos la nueva sede
        const nuevaSede = Number(sede_id)

        if (!sedesPermitidas.includes(nuevaSede)) {
          return res.status(403).json({
            mensaje: 'No tienes permisos para mover la asignación a esta sede',
          })
        }
      }

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
  }
)
// =====================================================
// ELIMINAR ASIGNACIONES POR RANGO
// =====================================================

app.delete(
  '/api/asignaciones/rango',
  verificarToken,
  permitirRoles(
    'ADMIN',
    'LIDER_ZONA_1',
    'LIDER_ZONA_2',
    'LIDER_GIGANTE',
    'LIDER_ZULUAGA'
  ),
  verificarSede,
  async (req, res) => {
    try {
      const {
        empleado_id,
        sede_id,
        fecha_inicio,
        fecha_fin,
      } = req.body

      if (
        !empleado_id ||
        !sede_id ||
        !fecha_inicio ||
        !fecha_fin
      ) {
        return res.status(400).json({
          mensaje:
            'empleado_id, sede_id, fecha_inicio y fecha_fin son obligatorios',
        })
      }

      if (fecha_inicio > fecha_fin) {
        return res.status(400).json({
          mensaje:
            'La fecha de inicio no puede ser posterior a la fecha final',
        })
      }

      const result = await pool.query(
        `
        DELETE FROM asignaciones
        WHERE empleado_id = $1
          AND sede_id = $2
          AND fecha BETWEEN $3 AND $4
        RETURNING id
        `,
        [
          empleado_id,
          sede_id,
          fecha_inicio,
          fecha_fin,
        ]
      )

      res.json({
        mensaje: `Se eliminaron ${result.rows.length} turno(s) correctamente.`,
        eliminadas: result.rows.length,
        ids: result.rows.map(
          (asignacion) => asignacion.id
        ),
      })
    } catch (error) {
      console.error(
        'Error al eliminar asignaciones por rango:',
        error
      )

      res.status(500).json({
        mensaje:
          'Error al eliminar las asignaciones del rango',
        error: error.message,
      })
    }
  }
)
// =====================================================
// ELIMINAR ASIGNACIÓN
// =====================================================

app.delete(
  '/api/asignaciones/:id',
  verificarToken,
  permitirRoles(
    'ADMIN',
    'LIDER_ZONA_1',
    'LIDER_ZONA_2',
    'LIDER_GIGANTE',
    'LIDER_ZULUAGA'
  ),
  async (req, res) => {
    try {
      const { id } = req.params

      // ADMIN puede eliminar cualquier asignación
      if (req.usuario.rol !== 'ADMIN') {
        // Buscar primero la sede de la asignación
        const asignacion = await pool.query(
          `
          SELECT sede_id
          FROM asignaciones
          WHERE id = $1
          `,
          [id]
        )

        if (asignacion.rows.length === 0) {
          return res.status(404).json({
            mensaje: 'Asignación no encontrada',
          })
        }

        const sedeId = Number(
          asignacion.rows[0].sede_id
        )

        const sedesPermitidas = sedesPorRol[req.usuario.rol]

        if (
          !sedesPermitidas ||
          !sedesPermitidas.includes(sedeId)
        ) {
          return res.status(403).json({
            mensaje: 'No tienes permisos para eliminar esta asignación',
          })
        }
      }

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
  }
)

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
        expiresIn: '30d',
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