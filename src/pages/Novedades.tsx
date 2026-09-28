import { useEffect, useMemo, useState } from 'react'

type Employee = {
  id: number
  name: string
  document: string
  role: string
  username: string
  status: string
  sede_id?: number
}

type Novedad = {
  id: number
  empleado_id: number
  empleado_nombre: string
  documento: string
  cargo: string
  sede_id: number
  sede_nombre: string | null
  tipo_novedad: string
  fecha_inicio: string
  fecha_fin: string
  dias: number
  estado: string
  afecta_nomina: boolean
  tratamiento_nomina: string | null
  observacion: string | null
  periodo_nomina: string | null
  valor: number | null
  observacion_nomina: string | null
  soporte_url: string | null
  creado_por: number | null
  created_at: string
}

type Props = {
  employees: Employee[]
}

const TIPOS_NOVEDAD = [
  'INGRESO',
  'RETIRO',
  'INCAPACIDAD_GENERAL',
  'INCAPACIDAD_LABORAL',
  'LICENCIA_MATERNIDAD',
  'LICENCIA_PATERNIDAD',
  'LICENCIA_LUTO',
  'LICENCIA_NO_REMUNERADA',
  'VACACIONES',
  'PERMISO_REMUNERADO',
  'PERMISO_NO_REMUNERADO',
  'AUSENCIA',
  'SUSPENSION',
  'CAMBIO_SALARIO',
  'CAMBIO_CARGO',
  'CAMBIO_SEDE',
  'OTRA',
]

const TIPOS_LABEL: Record<string, string> = {
  INGRESO: 'Ingreso',
  RETIRO: 'Retiro',
  INCAPACIDAD_GENERAL: 'Incapacidad general',
  INCAPACIDAD_LABORAL: 'Incapacidad laboral',
  LICENCIA_MATERNIDAD: 'Licencia maternidad',
  LICENCIA_PATERNIDAD: 'Licencia paternidad',
  LICENCIA_LUTO: 'Licencia de luto',
  LICENCIA_NO_REMUNERADA: 'Licencia no remunerada',
  VACACIONES: 'Vacaciones',
  PERMISO_REMUNERADO: 'Permiso remunerado',
  PERMISO_NO_REMUNERADO: 'Permiso no remunerado',
  AUSENCIA: 'Ausencia',
  SUSPENSION: 'Suspensión',
  CAMBIO_SALARIO: 'Cambio de salario',
  CAMBIO_CARGO: 'Cambio de cargo',
  CAMBIO_SEDE: 'Cambio de sede',
  OTRA: 'Otra',
}

const ESTADOS = [
  'PENDIENTE',
  'APROBADA',
  'RECHAZADA',
]

const ESTADO_LABEL: Record<string, string> = {
  PENDIENTE: 'Pendiente',
  APROBADA: 'Aprobada',
  RECHAZADA: 'Rechazada',
}

const TRATAMIENTOS: Record<string, string> = {
  PAGO_COMPLETO: 'Pago completo',
  PAGO_PARCIAL: 'Pago parcial',
  NO_PAGO: 'No pago',
  DESCUENTO: 'Descuento',
  PENDIENTE_REVISION: 'Pendiente de revisión',
  NO_APLICA: 'No aplica',
}

const API_URL =
  'https://crm-rrhh-backend.onrender.com'

function obtenerToken() {
  return localStorage.getItem('token')
}

function formatearFecha(fecha: string) {
  if (!fecha) return '-'

  const partes = fecha
    .split('T')[0]
    .split('-')

  if (partes.length !== 3) return fecha

  return `${partes[2]}/${partes[1]}/${partes[0]}`
}

function calcularDias(
  inicio: string,
  fin: string
) {
  if (!inicio || !fin) return 0

  const fechaInicio = new Date(
    `${inicio}T00:00:00`
  )

  const fechaFin = new Date(
    `${fin}T00:00:00`
  )

  const diferencia =
    fechaFin.getTime() -
    fechaInicio.getTime()

  if (diferencia < 0) return 0

  return (
    Math.floor(
      diferencia /
        (1000 * 60 * 60 * 24)
    ) + 1
  )
}

function iniciales(nombre: string) {
  return nombre
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((parte) => parte[0])
    .join('')
    .toUpperCase()
}

function colorTipo(tipo: string) {
  if (tipo.includes('INCAPACIDAD')) {
    return 'bg-rose-100 text-rose-600'
  }

  if (tipo.includes('LICENCIA')) {
    return 'bg-violet-100 text-violet-600'
  }

  if (tipo === 'VACACIONES') {
    return 'bg-emerald-100 text-emerald-600'
  }

  if (tipo.includes('PERMISO')) {
    return 'bg-amber-100 text-amber-600'
  }

  if (tipo === 'RETIRO') {
    return 'bg-red-100 text-red-600'
  }

  if (tipo === 'INGRESO') {
    return 'bg-blue-100 text-blue-600'
  }

  return 'bg-slate-100 text-slate-600'
}

function colorEstado(estado: string) {
  if (estado === 'APROBADA') {
    return 'bg-emerald-100 text-emerald-700'
  }

  if (estado === 'RECHAZADA') {
    return 'bg-red-100 text-red-700'
  }

  return 'bg-amber-100 text-amber-700'
}

function colorCalendario(tipo: string) {
  if (tipo.includes('INCAPACIDAD')) {
    return 'bg-rose-400 text-white'
  }

  if (tipo === 'VACACIONES') {
    return 'bg-emerald-400 text-white'
  }

  if (tipo.includes('LICENCIA')) {
    return 'bg-violet-400 text-white'
  }

  if (tipo.includes('PERMISO')) {
    return 'bg-amber-400 text-white'
  }

  if (tipo === 'RETIRO') {
    return 'bg-red-400 text-white'
  }

  if (tipo === 'INGRESO') {
    return 'bg-blue-400 text-white'
  }

  return 'bg-slate-400 text-white'
}

function abreviaturaTipo(tipo: string) {
  if (tipo.includes('INCAPACIDAD')) return 'I'
  if (tipo === 'VACACIONES') return 'V'
  if (tipo.includes('LICENCIA')) return 'L'
  if (tipo.includes('PERMISO')) return 'P'
  if (tipo === 'RETIRO') return 'R'
  if (tipo === 'INGRESO') return 'IN'
  if (tipo === 'AUSENCIA') return 'A'
  return 'N'
}

function nombrePeriodo(periodo: string) {
  if (!periodo) return ''

  const [anio, mes] = periodo.split('-')

  const fecha = new Date(
    Number(anio),
    Number(mes) - 1,
    1
  )

  return fecha.toLocaleDateString(
    'es-CO',
    {
      month: 'long',
      year: 'numeric',
    }
  )
}

function periodoActual() {
  const fecha = new Date()

  return `${fecha.getFullYear()}-${String(
    fecha.getMonth() + 1
  ).padStart(2, '0')}`
}

function generarPeriodos() {
  const fechaActual = new Date()
  const periodos: string[] = []

  for (let i = -6; i <= 6; i++) {
    const fecha = new Date(
      fechaActual.getFullYear(),
      fechaActual.getMonth() + i,
      1
    )

    periodos.push(
      `${fecha.getFullYear()}-${String(
        fecha.getMonth() + 1
      ).padStart(2, '0')}`
    )
  }

  return periodos
}

function diasDelMes(periodo: string) {
  const [anio, mes] =
    periodo.split('-').map(Number)

  return new Date(anio, mes, 0).getDate()
}

function fechaDentroDeNovedad(
  novedad: Novedad,
  fecha: string
) {
  const inicio =
    novedad.fecha_inicio.split('T')[0]

  const fin =
    novedad.fecha_fin.split('T')[0]

  return (
    fecha >= inicio &&
    fecha <= fin
  )
}

function novedadCruzaPeriodo(
  novedad: Novedad,
  periodo: string
) {
  const [anio, mes] =
    periodo.split('-').map(Number)

  const primerDia = `${anio}-${String(
    mes
  ).padStart(2, '0')}-01`

  const ultimoDia = `${anio}-${String(
    mes
  ).padStart(2, '0')}-${String(
    new Date(anio, mes, 0).getDate()
  ).padStart(2, '0')}`

  const inicio =
    novedad.fecha_inicio.split('T')[0]

  const fin =
    novedad.fecha_fin.split('T')[0]

  return inicio <= ultimoDia && fin >= primerDia
}

export default function Novedades({
  employees,
}: Props) {
  const [novedades, setNovedades] =
    useState<Novedad[]>([])

  const [cargando, setCargando] =
    useState(true)

  const [error, setError] =
    useState('')

  const [mostrarModal, setMostrarModal] =
    useState(false)

  const [editando, setEditando] =
    useState<Novedad | null>(null)

  const [vista, setVista] =
    useState<'lista' | 'mensual'>(
      'lista'
    )

  const [periodo, setPeriodo] =
    useState(periodoActual())

  const [busqueda, setBusqueda] =
    useState('')

  const [filtroSede, setFiltroSede] =
    useState('TODAS')

  const [filtroTipo, setFiltroTipo] =
    useState('TODAS')

  const [filtroEstado, setFiltroEstado] =
    useState('TODAS')

  const [empleadoId, setEmpleadoId] =
    useState('')

  const [tipoNovedad, setTipoNovedad] =
    useState('')

  const [fechaInicio, setFechaInicio] =
    useState('')

  const [fechaFin, setFechaFin] =
    useState('')

  const [estado, setEstado] =
    useState('PENDIENTE')

  const [afectaNomina, setAfectaNomina] =
    useState(true)

  const [tratamientoNomina, setTratamientoNomina] =
    useState('')

  const [valor, setValor] =
    useState('')

  const [observacion, setObservacion] =
    useState('')

  const [observacionNomina, setObservacionNomina] =
    useState('')

  const [soporteUrl, setSoporteUrl] =
    useState('')

  const [guardando, setGuardando] =
    useState(false)

  const [seleccionada, setSeleccionada] =
    useState<Novedad | null>(null)

  const [pagina, setPagina] =
    useState(1)

  const POR_PAGINA = 5

  const diasCalculados = useMemo(
    () =>
      calcularDias(
        fechaInicio,
        fechaFin
      ),
    [fechaInicio, fechaFin]
  )

  async function cargarNovedades() {
    try {
      setCargando(true)
      setError('')

      const token = obtenerToken()

      if (!token) {
        throw new Error(
          'No se encontró la sesión. Vuelve a iniciar sesión.'
        )
      }

      const respuesta = await fetch(
        `${API_URL}/api/novedades-nomina`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      )

      const texto = await respuesta.text()

      let datos: any = {}

      try {
        datos = texto
          ? JSON.parse(texto)
          : {}
      } catch {
        datos = {}
      }

      if (!respuesta.ok) {
        throw new Error(
          datos.mensaje ||
            datos.message ||
            `Error ${respuesta.status}: ${respuesta.statusText}`
        )
      }

      setNovedades(
        Array.isArray(datos)
          ? datos
          : datos.novedades || []
      )
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Ocurrió un error al cargar las novedades'
      )
    } finally {
      setCargando(false)
    }
  }

  useEffect(() => {
    cargarNovedades()
  }, [])

  function limpiarFormulario() {
    setEmpleadoId('')
    setTipoNovedad('')
    setFechaInicio('')
    setFechaFin('')
    setEstado('PENDIENTE')
    setAfectaNomina(true)
    setTratamientoNomina('')
    setValor('')
    setObservacion('')
    setObservacionNomina('')
    setSoporteUrl('')
    setEditando(null)
  }

  function abrirNueva() {
    limpiarFormulario()
    setError('')
    setMostrarModal(true)
  }

  function abrirEditar(
    novedad: Novedad
  ) {
    setError('')
    setEditando(novedad)

    setEmpleadoId(
      String(novedad.empleado_id)
    )

    setTipoNovedad(
      novedad.tipo_novedad
    )

    setFechaInicio(
      novedad.fecha_inicio?.split(
        'T'
      )[0] || ''
    )

    setFechaFin(
      novedad.fecha_fin?.split(
        'T'
      )[0] || ''
    )

    setEstado(novedad.estado)

    setAfectaNomina(
      Boolean(novedad.afecta_nomina)
    )

    setTratamientoNomina(
      novedad.afecta_nomina
        ? novedad.tratamiento_nomina ||
            ''
        : 'NO_APLICA'
    )

    setValor(
      novedad.valor !== null &&
        novedad.valor !== undefined
        ? String(novedad.valor)
        : ''
    )

    setObservacion(
      novedad.observacion || ''
    )

    setObservacionNomina(
      novedad.observacion_nomina ||
        ''
    )

    setSoporteUrl(
      novedad.soporte_url || ''
    )

    if (novedad.periodo_nomina) {
      setPeriodo(
        novedad.periodo_nomina
      )
    }

    setMostrarModal(true)
  }

  function cerrarModal() {
    if (guardando) return

    setMostrarModal(false)
    limpiarFormulario()
  }

  function cambiarAfectaNomina(
    valorNuevo: boolean
  ) {
    setAfectaNomina(valorNuevo)

    if (!valorNuevo) {
      setTratamientoNomina(
        'NO_APLICA'
      )
    } else {
      setTratamientoNomina('')
    }
  }

  async function guardarNovedad(
    e: React.FormEvent
  ) {
    e.preventDefault()

    setError('')

    if (
      !empleadoId ||
      !tipoNovedad ||
      !fechaInicio ||
      !fechaFin
    ) {
      setError(
        'Completa todos los campos obligatorios.'
      )
      return
    }

    if (fechaFin < fechaInicio) {
      setError(
        'La fecha final no puede ser anterior a la fecha inicial.'
      )
      return
    }

    if (diasCalculados <= 0) {
      setError(
        'El rango de fechas no es válido.'
      )
      return
    }

    if (
      valor !== '' &&
      (
        Number.isNaN(Number(valor)) ||
        Number(valor) < 0
      )
    ) {
      setError(
        'El valor debe ser un número válido mayor o igual a 0.'
      )
      return
    }

    if (
      afectaNomina &&
      !tratamientoNomina
    ) {
      setError(
        'Selecciona el tratamiento de nómina porque esta novedad afecta la nómina.'
      )
      return
    }

    try {
      setGuardando(true)

      const token = obtenerToken()

      if (!token) {
        throw new Error(
          'La sesión ha expirado. Vuelve a iniciar sesión.'
        )
      }

      const cuerpo = {
        empleado_id: Number(
          empleadoId
        ),

        tipo_novedad:
          tipoNovedad,

        fecha_inicio:
          fechaInicio,

        fecha_fin:
          fechaFin,

        estado,

        afecta_nomina:
          afectaNomina,

        tratamiento_nomina:
          afectaNomina
            ? tratamientoNomina
            : 'NO_APLICA',

        observacion:
          observacion.trim() ||
          null,

        periodo_nomina:
          periodo,

        valor:
          valor !== ''
            ? Number(valor)
            : null,

        observacion_nomina:
          observacionNomina.trim() ||
          null,

        soporte_url:
          soporteUrl.trim() ||
          null,
      }

      const url = editando
        ? `${API_URL}/api/novedades-nomina/${editando.id}`
        : `${API_URL}/api/novedades-nomina`

      const respuesta =
        await fetch(url, {
          method: editando
            ? 'PUT'
            : 'POST',

          headers: {
            'Content-Type':
              'application/json',

            Authorization: `Bearer ${token}`,
          },

          body: JSON.stringify(
            cuerpo
          ),
        })

      const texto =
        await respuesta.text()

      let datos: any = {}

      try {
        datos = texto
          ? JSON.parse(texto)
          : {}
      } catch {
        datos = {}
      }

      if (!respuesta.ok) {
        throw new Error(
          datos.mensaje ||
            datos.message ||
            datos.error ||
            `Error ${respuesta.status}: ${respuesta.statusText}`
        )
      }

      setMostrarModal(false)
      limpiarFormulario()

      await cargarNovedades()
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Ocurrió un error al guardar la novedad'
      )
    } finally {
      setGuardando(false)
    }
  }

  async function eliminarNovedad(
    novedad: Novedad
  ) {
    const confirmar =
      window.confirm(
        `¿Seguro que deseas eliminar la novedad de ${novedad.empleado_nombre}?`
      )

    if (!confirmar) return

    try {
      setError('')

      const token =
        obtenerToken()

      if (!token) {
        throw new Error(
          'La sesión ha expirado. Vuelve a iniciar sesión.'
        )
      }

      const respuesta =
        await fetch(
          `${API_URL}/api/novedades-nomina/${novedad.id}`,
          {
            method: 'DELETE',
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        )

      const texto =
        await respuesta.text()

      let datos: any = {}

      try {
        datos = texto
          ? JSON.parse(texto)
          : {}
      } catch {
        datos = {}
      }

      if (!respuesta.ok) {
        throw new Error(
          datos.mensaje ||
            datos.message ||
            datos.error ||
            `Error ${respuesta.status}: ${respuesta.statusText}`
        )
      }

      if (
        seleccionada?.id ===
        novedad.id
      ) {
        setSeleccionada(null)
      }

      await cargarNovedades()
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Ocurrió un error al eliminar la novedad'
      )
    }
  }

  const sedes = useMemo(() => {
    const mapa = new Map<
      number,
      string
    >()

    novedades.forEach(
      (novedad) => {
        if (novedad.sede_id) {
          mapa.set(
            novedad.sede_id,
            novedad.sede_nombre ||
              `Sede ${novedad.sede_id}`
          )
        }
      }
    )

    return Array.from(
      mapa.entries()
    ).sort((a, b) =>
      a[1].localeCompare(b[1])
    )
  }, [novedades])

  const novedadesFiltradas =
    useMemo(() => {
      const texto =
        busqueda
          .trim()
          .toLowerCase()

      return novedades.filter(
        (novedad) => {
          const coincideBusqueda =
            !texto ||
            novedad.empleado_nombre
              .toLowerCase()
              .includes(texto) ||
            novedad.documento
              ?.toLowerCase()
              .includes(texto)

          const coincideSede =
            filtroSede ===
              'TODAS' ||
            String(
              novedad.sede_id
            ) === filtroSede

          const coincideTipo =
            filtroTipo ===
              'TODAS' ||
            novedad.tipo_novedad ===
              filtroTipo

          const coincideEstado =
            filtroEstado ===
              'TODAS' ||
            novedad.estado ===
              filtroEstado

          const coincidePeriodo =
            novedad.periodo_nomina ===
              periodo ||
            (
              !novedad.periodo_nomina &&
              novedadCruzaPeriodo(
                novedad,
                periodo
              )
            )

          return (
            coincideBusqueda &&
            coincideSede &&
            coincideTipo &&
            coincideEstado &&
            coincidePeriodo
          )
        }
      )
    }, [
      novedades,
      busqueda,
      filtroSede,
      filtroTipo,
      filtroEstado,
      periodo,
    ])

  useEffect(() => {
    setPagina(1)
  }, [
    busqueda,
    filtroSede,
    filtroTipo,
    filtroEstado,
    periodo,
  ])

  const totalPaginas =
    Math.max(
      1,
      Math.ceil(
        novedadesFiltradas.length /
          POR_PAGINA
      )
    )

  const novedadesPagina =
    novedadesFiltradas.slice(
      (pagina - 1) *
        POR_PAGINA,
      pagina * POR_PAGINA
    )

  const novedadesPeriodo =
    novedades.filter(
      (novedad) =>
        novedad.periodo_nomina ===
          periodo ||
        (
          !novedad.periodo_nomina &&
          novedadCruzaPeriodo(
            novedad,
            periodo
          )
        )
    )

  const totalIncapacidades =
    novedadesPeriodo.filter(
      (novedad) =>
        novedad.tipo_novedad.includes(
          'INCAPACIDAD'
        )
    ).length

  const totalVacaciones =
    novedadesPeriodo.filter(
      (novedad) =>
        novedad.tipo_novedad ===
        'VACACIONES'
    ).length

  const totalRetiros =
    novedadesPeriodo.filter(
      (novedad) =>
        novedad.tipo_novedad ===
        'RETIRO'
    ).length

  const totalIngresos =
    novedadesPeriodo.filter(
      (novedad) =>
        novedad.tipo_novedad ===
        'INGRESO'
    ).length

  const diasMes =
    diasDelMes(periodo)

  const empleadosMensual =
    useMemo(() => {
      const mapa = new Map<
        number,
        {
          empleado_id: number
          nombre: string
          documento: string
          sede: string
          novedades: Novedad[]
        }
      >()

      
      employees.forEach(
        (employee) => {
          mapa.set(employee.id, {
            empleado_id:
              employee.id,
            nombre:
              employee.name,
            documento:
              employee.document,
            sede:
              employee.sede_id
                ? `Sede ${employee.sede_id}`
                : '-',
            novedades: [],
          })
        }
      )

      /*
       * Después agregamos las novedades
       * correspondientes al período.
       */
      novedadesPeriodo.forEach(
        (novedad) => {
          if (
            !mapa.has(
              novedad.empleado_id
            )
          ) {
            mapa.set(
              novedad.empleado_id,
              {
                empleado_id:
                  novedad.empleado_id,
                nombre:
                  novedad.empleado_nombre,
                documento:
                  novedad.documento,
                sede:
                  novedad.sede_nombre ||
                  `Sede ${novedad.sede_id}`,
                novedades: [],
              }
            )
          }

          mapa
            .get(
              novedad.empleado_id
            )!
            .novedades.push(
              novedad
            )
        }
      )

      return Array.from(
        mapa.values()
      ).sort((a, b) =>
        a.nombre.localeCompare(
          b.nombre
        )
      )
    }, [
      employees,
      novedadesPeriodo,
    ])

  const periodos =
    generarPeriodos()

  function fechaDelDia(
    dia: number
  ) {
    return `${periodo}-${String(
      dia
    ).padStart(2, '0')}`
  }

  function obtenerNovedadDia(
    novedadesEmpleado: Novedad[],
    dia: number
  ) {
    const fecha =
      fechaDelDia(dia)

    return novedadesEmpleado.find(
      (novedad) =>
        fechaDentroDeNovedad(
          novedad,
          fecha
        )
    )
  }

  const empleadoSeleccionado =
    employees.find(
      (employee) =>
        String(employee.id) ===
        empleadoId
    )

  return (
    <div className="min-h-full bg-slate-50/40 p-1">
      {/* BREADCRUMB */}
      <div className="mb-4 flex items-center gap-2 text-sm">
        <span className="font-medium text-slate-500">
          Nómina
        </span>

        <span className="text-slate-300">
          /
        </span>

        <span className="font-semibold text-slate-800">
          Novedades de Nómina
        </span>
      </div>

      {/* ENCABEZADO */}
      <div className="mb-5 flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
        <div className="flex items-center gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-blue-600 text-white shadow-sm">
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
            >
              <rect
                x="5"
                y="3"
                width="14"
                height="18"
                rx="2"
              />
              <path d="M9 7h6M9 11h6M9 15h3" />
            </svg>
          </div>

          <div>
            <h1 className="text-2xl font-bold text-slate-900">
              Novedades de Nómina
            </h1>

            <p className="mt-1 text-sm text-slate-500">
              Gestiona y da seguimiento a
              las novedades de nómina de
              tus empleados.
            </p>
          </div>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-slate-500">
              Período:
            </span>

            <select
              value={periodo}
              onChange={(e) =>
                setPeriodo(
                  e.target.value
                )
              }
              className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
            >
              {periodos.map(
                (item) => (
                  <option
                    key={item}
                    value={item}
                  >
                    {nombrePeriodo(
                      item
                    )}
                  </option>
                )
              )}
            </select>
          </div>

          <button
            onClick={abrirNueva}
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700"
          >
            <span className="text-lg leading-none">
              +
            </span>

            Nueva novedad
          </button>
        </div>
      </div>

      {/* ERROR */}
      {error && (
        <div className="mb-5 flex items-start justify-between gap-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          <span>{error}</span>

          <button
            onClick={() =>
              setError('')
            }
            className="font-bold text-red-500"
          >
            ×
          </button>
        </div>
      )}

      {/* TARJETAS */}
      <div className="mb-5 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-5">
        <div className="rounded-lg border border-slate-200 bg-white px-4 py-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-50 text-blue-600">
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
              >
                <rect
                  x="5"
                  y="4"
                  width="14"
                  height="16"
                  rx="2"
                />
                <path d="M8 9h8M8 13h8M8 17h5" />
              </svg>
            </div>

            <div>
              <p className="text-xs text-slate-500">
                Total novedades
              </p>

              <p className="mt-1 text-2xl font-bold text-slate-800">
                {
                  novedadesPeriodo.length
                }
              </p>
            </div>
          </div>
        </div>

        <div className="rounded-lg border border-slate-200 bg-white px-4 py-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-rose-50 text-rose-500">
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
              >
                <path d="M8 3h8v4H8z" />
                <rect
                  x="5"
                  y="7"
                  width="14"
                  height="14"
                  rx="2"
                />
                <path d="M12 11v5M10 14h4" />
              </svg>
            </div>

            <div>
              <p className="text-xs text-slate-500">
                Incapacidades
              </p>

              <p className="mt-1 text-2xl font-bold text-slate-800">
                {totalIncapacidades}
              </p>
            </div>
          </div>
        </div>

        <div className="rounded-lg border border-slate-200 bg-white px-4 py-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-50 text-emerald-500">
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
              >
                <rect
                  x="4"
                  y="5"
                  width="16"
                  height="15"
                  rx="2"
                />
                <path d="M8 3v4M16 3v4M4 9h16" />
              </svg>
            </div>

            <div>
              <p className="text-xs text-slate-500">
                Vacaciones
              </p>

              <p className="mt-1 text-2xl font-bold text-slate-800">
                {totalVacaciones}
              </p>
            </div>
          </div>
        </div>

        <div className="rounded-lg border border-slate-200 bg-white px-4 py-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-orange-50 text-orange-500">
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
              >
                <rect
                  x="5"
                  y="4"
                  width="14"
                  height="16"
                  rx="2"
                />
                <path d="M9 8h6M9 12h6M9 16h3" />
              </svg>
            </div>

            <div>
              <p className="text-xs text-slate-500">
                Retiros
              </p>

              <p className="mt-1 text-2xl font-bold text-slate-800">
                {totalRetiros}
              </p>
            </div>
          </div>
        </div>

        <div className="rounded-lg border border-slate-200 bg-white px-4 py-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-violet-50 text-violet-500">
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
              >
                <path d="M12 4v16M7 8h6a3 3 0 0 1 0 6H9a3 3 0 0 0 0 6h8" />
              </svg>
            </div>

            <div>
              <p className="text-xs text-slate-500">
                Ingresos
              </p>

              <p className="mt-1 text-2xl font-bold text-slate-800">
                {totalIngresos}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* FILTROS */}
      <div className="mb-4 rounded-lg border border-slate-200 bg-white p-3 shadow-sm">
        <div className="grid grid-cols-1 gap-3 lg:grid-cols-4">
          <div className="relative">
            <svg
              className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
              width="17"
              height="17"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <circle
                cx="11"
                cy="11"
                r="7"
              />
              <path d="m20 20-4-4" />
            </svg>

            <input
              value={busqueda}
              onChange={(e) =>
                setBusqueda(
                  e.target.value
                )
              }
              placeholder="Buscar empleado..."
              className="w-full rounded-lg border border-slate-200 bg-white py-2.5 pl-10 pr-3 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
            />
          </div>

          <select
            value={filtroSede}
            onChange={(e) =>
              setFiltroSede(
                e.target.value
              )
            }
            className="rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
          >
            <option value="TODAS">
              Todas las sedes
            </option>

            {sedes.map(
              ([id, nombre]) => (
                <option
                  key={id}
                  value={id}
                >
                  {nombre}
                </option>
              )
            )}
          </select>

          <select
            value={filtroTipo}
            onChange={(e) =>
              setFiltroTipo(
                e.target.value
              )
            }
            className="rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
          >
            <option value="TODAS">
              Todos los tipos
            </option>

            {TIPOS_NOVEDAD.map(
              (tipo) => (
                <option
                  key={tipo}
                  value={tipo}
                >
                  {TIPOS_LABEL[
                    tipo
                  ]}
                </option>
              )
            )}
          </select>

          <select
            value={filtroEstado}
            onChange={(e) =>
              setFiltroEstado(
                e.target.value
              )
            }
            className="rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
          >
            <option value="TODAS">
              Todos los estados
            </option>

            {ESTADOS.map(
              (item) => (
                <option
                  key={item}
                  value={item}
                >
                  {
                    ESTADO_LABEL[
                      item
                    ]
                  }
                </option>
              )
            )}
          </select>
        </div>

        <div className="mt-3 flex items-center justify-end gap-2">
          <button
            onClick={() =>
              setVista('lista')
            }
            className={`inline-flex items-center gap-2 rounded-lg border px-4 py-2 text-sm font-medium ${
              vista === 'lista'
                ? 'border-blue-200 bg-blue-50 text-blue-700'
                : 'border-slate-200 bg-white text-slate-500'
            }`}
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="M8 6h13M8 12h13M8 18h13" />
              <path d="M3 6h.01M3 12h.01M3 18h.01" />
            </svg>

            Vista lista
          </button>

          <button
            onClick={() =>
              setVista('mensual')
            }
            className={`inline-flex items-center gap-2 rounded-lg border px-4 py-2 text-sm font-medium ${
              vista === 'mensual'
                ? 'border-blue-200 bg-blue-50 text-blue-700'
                : 'border-slate-200 bg-white text-slate-500'
            }`}
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <rect
                x="3"
                y="4"
                width="18"
                height="17"
                rx="2"
              />
              <path d="M3 9h18M8 2v4M16 2v4" />
            </svg>

            Vista mensual
          </button>
        </div>
      </div>

      {/* VISTA LISTA */}
      {vista === 'lista' && (
        <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
          {cargando ? (
            <div className="flex min-h-[300px] items-center justify-center">
              <div className="text-center">
                <div className="mx-auto h-8 w-8 animate-spin rounded-full border-4 border-slate-200 border-t-blue-600" />

                <p className="mt-3 text-sm text-slate-500">
                  Cargando novedades...
                </p>
              </div>
            </div>
          ) : novedadesPagina.length ===
            0 ? (
            <div className="flex min-h-[300px] flex-col items-center justify-center px-6 text-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-slate-100 text-slate-400">
                <svg
                  width="26"
                  height="26"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.7"
                >
                  <rect
                    x="4"
                    y="4"
                    width="16"
                    height="16"
                    rx="3"
                  />
                  <path d="M8 9h8M8 13h5" />
                </svg>
              </div>

              <h3 className="mt-4 font-semibold text-slate-700">
                No hay novedades
                registradas
              </h3>

              <p className="mt-1 text-sm text-slate-500">
                No encontramos
                novedades para los
                filtros seleccionados.
              </p>

              <button
                onClick={abrirNueva}
                className="mt-5 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700"
              >
                Registrar novedad
              </button>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[1100px]">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50 text-left text-xs font-semibold text-slate-600">
                      <th className="px-4 py-3">
                        Empleado
                      </th>

                      <th className="px-4 py-3">
                        Sede
                      </th>

                      <th className="px-4 py-3">
                        Tipo de novedad
                      </th>

                      <th className="px-4 py-3">
                        Fechas
                      </th>

                      <th className="px-4 py-3">
                        Período nómina
                      </th>

                      <th className="px-4 py-3 text-center">
                        Días
                      </th>

                      <th className="px-4 py-3">
                        Estado
                      </th>

                      <th className="px-4 py-3">
                        Afecta nómina
                      </th>

                      <th className="px-4 py-3">
                        Tratamiento
                      </th>

                      <th className="px-4 py-3 text-center">
                        Acciones
                      </th>
                    </tr>
                  </thead>

                  <tbody>
                    {novedadesPagina.map(
                      (novedad) => (
                        <tr
                          key={
                            novedad.id
                          }
                          className="border-b border-slate-100 last:border-0 hover:bg-slate-50/60"
                        >
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-3">
                              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-blue-100 text-xs font-bold text-blue-600">
                                {iniciales(
                                  novedad.empleado_nombre
                                )}
                              </div>

                              <div>
                                <p className="text-sm font-semibold text-slate-700">
                                  {
                                    novedad.empleado_nombre
                                  }
                                </p>

                                <p className="text-[11px] text-slate-400">
                                  CC.{' '}
                                  {
                                    novedad.documento
                                  }
                                </p>
                              </div>
                            </div>
                          </td>

                          <td className="px-4 py-3 text-xs font-medium text-slate-600">
                            {novedad.sede_nombre ||
                              `Sede ${novedad.sede_id}`}
                          </td>

                          <td className="px-4 py-3">
                            <span
                              className={`inline-flex rounded-full px-3 py-1 text-[11px] font-semibold ${colorTipo(
                                novedad.tipo_novedad
                              )}`}
                            >
                              {TIPOS_LABEL[
                                novedad
                                  .tipo_novedad
                              ] ||
                                novedad.tipo_novedad}
                            </span>
                          </td>

                          <td className="px-4 py-3">
                            <p className="text-xs font-medium text-slate-600">
                              {formatearFecha(
                                novedad.fecha_inicio
                              )}{' '}
                              -{' '}
                              {formatearFecha(
                                novedad.fecha_fin
                              )}
                            </p>
                          </td>

                          <td className="px-4 py-3">
                            <p className="text-xs font-medium capitalize text-slate-600">
                              {novedad.periodo_nomina
                                ? nombrePeriodo(
                                    novedad.periodo_nomina
                                  )
                                : '-'}
                            </p>
                          </td>

                          <td className="px-4 py-3 text-center text-sm font-semibold text-slate-700">
                            {novedad.dias}
                          </td>

                          <td className="px-4 py-3">
                            <span
                              className={`inline-flex rounded-full px-3 py-1 text-[11px] font-semibold ${colorEstado(
                                novedad.estado
                              )}`}
                            >
                              {ESTADO_LABEL[
                                novedad
                                  .estado
                              ] ||
                                novedad.estado}
                            </span>
                          </td>

                          <td className="px-4 py-3">
                            <span
                              className={`inline-flex rounded-full px-3 py-1 text-[11px] font-semibold ${
                                novedad.afecta_nomina
                                  ? 'bg-emerald-100 text-emerald-700'
                                  : 'bg-slate-100 text-slate-500'
                              }`}
                            >
                              {novedad.afecta_nomina
                                ? 'Sí'
                                : 'No'}
                            </span>
                          </td>

                          <td className="px-4 py-3 text-xs text-slate-600">
                            {novedad.tratamiento_nomina
                              ? TRATAMIENTOS[
                                  novedad
                                    .tratamiento_nomina
                                ] ||
                                novedad.tratamiento_nomina
                              : '-'}
                          </td>

                          <td className="px-4 py-3">
                            <div className="flex items-center justify-center gap-1">
                              <button
                                onClick={() =>
                                  setSeleccionada(
                                    novedad
                                  )
                                }
                                title="Ver detalle"
                                className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 text-slate-500 hover:bg-blue-50 hover:text-blue-600"
                              >
                                <svg
                                  width="16"
                                  height="16"
                                  viewBox="0 0 24 24"
                                  fill="none"
                                  stroke="currentColor"
                                  strokeWidth="1.8"
                                >
                                  <path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6S2 12 2 12Z" />
                                  <circle
                                    cx="12"
                                    cy="12"
                                    r="2.5"
                                  />
                                </svg>
                              </button>

                              <button
                                onClick={() =>
                                  abrirEditar(
                                    novedad
                                  )
                                }
                                title="Editar"
                                className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 text-slate-500 hover:bg-blue-50 hover:text-blue-600"
                              >
                                <svg
                                  width="15"
                                  height="15"
                                  viewBox="0 0 24 24"
                                  fill="none"
                                  stroke="currentColor"
                                  strokeWidth="1.8"
                                >
                                  <path d="M12 20h9" />
                                  <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L8 18l-4 1 1-4Z" />
                                </svg>
                              </button>

                              <button
                                onClick={() =>
                                  eliminarNovedad(
                                    novedad
                                  )
                                }
                                title="Eliminar"
                                className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 text-slate-500 hover:bg-red-50 hover:text-red-600"
                              >
                                <svg
                                  width="15"
                                  height="15"
                                  viewBox="0 0 24 24"
                                  fill="none"
                                  stroke="currentColor"
                                  strokeWidth="1.8"
                                >
                                  <path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3" />
                                </svg>
                              </button>
                            </div>
                          </td>
                        </tr>
                      )
                    )}
                  </tbody>
                </table>
              </div>

              {/* PAGINACIÓN */}
              <div className="flex items-center justify-between border-t border-slate-100 px-4 py-3">
                <p className="text-xs text-slate-500">
                  Mostrando{' '}
                  {
                    novedadesPagina.length
                  }{' '}
                  de{' '}
                  {
                    novedadesFiltradas.length
                  }{' '}
                  novedades
                </p>

                <div className="flex items-center gap-1">
                  <button
                    disabled={
                      pagina === 1
                    }
                    onClick={() =>
                      setPagina(
                        (p) =>
                          Math.max(
                            1,
                            p - 1
                          )
                      )
                    }
                    className="flex h-8 w-8 items-center justify-center rounded-md border border-slate-200 text-slate-500 disabled:opacity-40"
                  >
                    ‹
                  </button>

                  {Array.from(
                    {
                      length:
                        totalPaginas,
                    },
                    (_, i) => i + 1
                  ).map(
                    (item) => (
                      <button
                        key={item}
                        onClick={() =>
                          setPagina(
                            item
                          )
                        }
                        className={`h-8 min-w-8 rounded-md border px-2 text-xs font-medium ${
                          pagina ===
                          item
                            ? 'border-blue-600 bg-blue-600 text-white'
                            : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                        }`}
                      >
                        {item}
                      </button>
                    )
                  )}

                  <button
                    disabled={
                      pagina ===
                      totalPaginas
                    }
                    onClick={() =>
                      setPagina(
                        (p) =>
                          Math.min(
                            totalPaginas,
                            p + 1
                          )
                      )
                    }
                    className="flex h-8 w-8 items-center justify-center rounded-md border border-slate-200 text-slate-500 disabled:opacity-40"
                  >
                    ›
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {/* VISTA MENSUAL */}
      {vista === 'mensual' && (
        <div className="rounded-lg border border-slate-200 bg-white shadow-sm">
          <div className="flex flex-col gap-3 border-b border-slate-200 px-5 py-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h2 className="font-semibold text-slate-800">
                Vista mensual -{' '}
                {nombrePeriodo(
                  periodo
                )}
              </h2>

              <p className="mt-1 text-xs text-slate-500">
                Visualiza las novedades
                por empleado y por día
                del mes.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500">
              <span className="flex items-center gap-1">
                <span className="h-3 w-3 rounded bg-rose-400" />
                Incapacidad
              </span>

              <span className="flex items-center gap-1">
                <span className="h-3 w-3 rounded bg-emerald-400" />
                Vacaciones
              </span>

              <span className="flex items-center gap-1">
                <span className="h-3 w-3 rounded bg-violet-400" />
                Licencia
              </span>

              <span className="flex items-center gap-1">
                <span className="h-3 w-3 rounded bg-amber-400" />
                Permiso
              </span>

              <span className="flex items-center gap-1">
                <span className="h-3 w-3 rounded bg-red-400" />
                Retiro
              </span>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[1100px] border-collapse">
              <thead>
                <tr className="bg-slate-50">
                  <th className="sticky left-0 z-10 min-w-[180px] border-r border-slate-200 px-3 py-3 text-left text-xs font-semibold text-slate-600">
                    C.C. / Nombre
                  </th>

                  

                  {Array.from(
                    {
                      length:
                        diasMes,
                    },
                    (_, i) =>
                      i + 1
                  ).map(
                    (dia) => (
                      <th
                        key={dia}
                        className="min-w-[32px] border-r border-slate-100 px-1 py-3 text-center text-[10px] font-semibold text-slate-500"
                      >
                        {dia}
                      </th>
                    )
                  )}
                </tr>
              </thead>

              <tbody>
                {empleadosMensual.length ===
                0 ? (
                  <tr>
                    <td
                      colSpan={
                        diasMes + 1
                      }
                      className="py-16 text-center text-sm text-slate-500"
                    >
                      No hay empleados
                      registrados.
                    </td>
                  </tr>
                ) : (
                  empleadosMensual.map(
                    (empleado) => (
                      <tr
                        key={
                          empleado.empleado_id
                        }
                        className="border-t border-slate-100"
                      >
                        <td className="sticky left-0 z-10 border-r border-slate-200 bg-white px-3 py-2">
                          <p className="text-xs font-semibold text-slate-700">
                            {
                              empleado.nombre
                            }
                          </p>

                          <p className="text-[10px] text-slate-400">
                            {
                              empleado.documento
                            }
                          </p>
                        </td>

                       

                        {Array.from(
                          {
                            length:
                              diasMes,
                          },
                          (_, i) =>
                            i + 1
                        ).map(
                          (dia) => {
                            const novedad =
                              obtenerNovedadDia(
                                empleado.novedades,
                                dia
                              )

                            return (
                              <td
                                key={
                                  dia
                                }
                                className="border-r border-slate-100 p-1 text-center"
                              >
                                {novedad ? (
                                  <button
                                    onClick={() =>
                                      setSeleccionada(
                                        novedad
                                      )
                                    }
                                    title={
                                      TIPOS_LABEL[
                                        novedad
                                          .tipo_novedad
                                      ] ||
                                      novedad.tipo_novedad
                                    }
                                    className={`flex h-6 w-full items-center justify-center rounded text-[9px] font-bold ${colorCalendario(
                                      novedad.tipo_novedad
                                    )}`}
                                  >
                                    {abreviaturaTipo(
                                      novedad.tipo_novedad
                                    )}
                                  </button>
                                ) : (
                                  <span className="block h-6" />
                                )}
                              </td>
                            )
                          }
                        )}
                      </tr>
                    )
                  )
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* MODAL NUEVA / EDITAR */}
      {mostrarModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-sm">
          <div className="max-h-[94vh] w-full max-w-5xl overflow-y-auto rounded-2xl bg-white shadow-2xl">
            <div className="sticky top-0 z-20 flex items-center justify-between border-b border-slate-200 bg-white px-6 py-4">
              <div>
                <h2 className="text-lg font-bold text-slate-800">
                  {editando
                    ? 'Editar novedad de nómina'
                    : 'Nueva novedad de nómina'}
                </h2>

                <p className="mt-1 text-xs text-slate-500">
                  Registra la información
                  correspondiente a la
                  novedad.
                </p>
              </div>

              <button
                onClick={
                  cerrarModal
                }
                className="flex h-8 w-8 items-center justify-center rounded-lg text-xl text-slate-400 hover:bg-slate-100"
              >
                ×
              </button>
            </div>

            <form
              onSubmit={
                guardarNovedad
              }
              className="p-5"
            >
              <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
                {/* COLUMNA IZQUIERDA */}
                <div className="space-y-4">
                  {/* EMPLEADO */}
                  <div className="rounded-xl border border-slate-200 p-4">
                    <div className="mb-3 flex items-center gap-2">
                      <span className="flex h-6 w-6 items-center justify-center rounded-md bg-blue-50 text-xs font-bold text-blue-600">
                        1
                      </span>

                      <h3 className="text-sm font-semibold text-slate-700">
                        Empleado
                      </h3>
                    </div>

                    <select
                      value={
                        empleadoId
                      }
                      onChange={(e) =>
                        setEmpleadoId(
                          e.target.value
                        )
                      }
                      className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                      required
                    >
                      <option value="">
                        Seleccionar empleado...
                      </option>

                      {employees.map(
                        (
                          employee
                        ) => (
                          <option
                            key={
                              employee.id
                            }
                            value={
                              employee.id
                            }
                          >
                            {
                              employee.name
                            }{' '}
                            —{' '}
                            {
                              employee.document
                            }
                          </option>
                        )
                      )}
                    </select>

                    {empleadoSeleccionado && (
                      <div className="mt-3 rounded-lg border border-slate-100 bg-slate-50 p-3">
                        <div className="flex items-center gap-3">
                          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-100 text-xs font-bold text-blue-600">
                            {iniciales(
                              empleadoSeleccionado.name
                            )}
                          </div>

                          <div>
                            <p className="text-sm font-semibold text-slate-700">
                              {
                                empleadoSeleccionado.name
                              }
                            </p>

                            <p className="text-[11px] text-slate-400">
                              CC.{' '}
                              {
                                empleadoSeleccionado.document
                              }
                            </p>
                          </div>
                        </div>

                        <div className="mt-3 grid grid-cols-2 gap-3 text-xs">
                          <div>
                            <p className="text-slate-400">
                              Cargo
                            </p>

                            <p className="mt-1 font-medium text-slate-600">
                              {
                                empleadoSeleccionado.role
                              }
                            </p>
                          </div>

                          <div>
                            <p className="text-slate-400">
                              Estado
                            </p>

                            <p className="mt-1 font-medium text-slate-600">
                              {
                                empleadoSeleccionado.status
                              }
                            </p>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* INFORMACIÓN NOVEDAD */}
                  <div className="rounded-xl border border-slate-200 p-4">
                    <div className="mb-3 flex items-center gap-2">
                      <span className="flex h-6 w-6 items-center justify-center rounded-md bg-blue-50 text-xs font-bold text-blue-600">
                        2
                      </span>

                      <h3 className="text-sm font-semibold text-slate-700">
                        Información de
                        la novedad
                      </h3>
                    </div>

                    <div className="space-y-3">
                      <div>
                        <label className="mb-1.5 block text-xs font-semibold text-slate-600">
                          Tipo de novedad *
                        </label>

                        <select
                          value={
                            tipoNovedad
                          }
                          onChange={(e) =>
                            setTipoNovedad(
                              e.target.value
                            )
                          }
                          className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                          required
                        >
                          <option value="">
                            Selecciona el tipo
                          </option>

                          {TIPOS_NOVEDAD.map(
                            (
                              tipo
                            ) => (
                              <option
                                key={
                                  tipo
                                }
                                value={
                                  tipo
                                }
                              >
                                {
                                  TIPOS_LABEL[
                                    tipo
                                  ]
                                }
                              </option>
                            )
                          )}
                        </select>
                      </div>

                      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                        <div>
                          <label className="mb-1.5 block text-xs font-semibold text-slate-600">
                            Fecha inicio *
                          </label>

                          <input
                            type="date"
                            value={
                              fechaInicio
                            }
                            onChange={(
                              e
                            ) =>
                              setFechaInicio(
                                e
                                  .target
                                  .value
                              )
                            }
                            className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-xs outline-none focus:border-blue-400"
                            required
                          />
                        </div>

                        <div>
                          <label className="mb-1.5 block text-xs font-semibold text-slate-600">
                            Fecha fin *
                          </label>

                          <input
                            type="date"
                            value={
                              fechaFin
                            }
                            min={
                              fechaInicio ||
                              undefined
                            }
                            onChange={(
                              e
                            ) =>
                              setFechaFin(
                                e
                                  .target
                                  .value
                              )
                            }
                            className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-xs outline-none focus:border-blue-400"
                            required
                          />
                        </div>

                        <div>
                          <label className="mb-1.5 block text-xs font-semibold text-slate-600">
                            Días
                          </label>

                          <div className="flex h-[38px] items-center rounded-lg bg-blue-50 px-3">
                            <span className="font-bold text-blue-600">
                              {
                                diasCalculados
                              }
                            </span>

                            <span className="ml-1 text-xs text-blue-500">
                              {diasCalculados ===
                              1
                                ? 'día'
                                : 'días'}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div>
                        <label className="mb-1.5 block text-xs font-semibold text-slate-600">
                          Estado
                        </label>

                        <select
                          value={
                            estado
                          }
                          onChange={(
                            e
                          ) =>
                            setEstado(
                              e
                                .target
                                .value
                            )
                          }
                          className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-blue-400"
                        >
                          {ESTADOS.map(
                            (
                              item
                            ) => (
                              <option
                                key={
                                  item
                                }
                                value={
                                  item
                                }
                              >
                                {
                                  ESTADO_LABEL[
                                    item
                                  ]
                                }
                              </option>
                            )
                          )}
                        </select>
                      </div>
                    </div>
                  </div>
                </div>

                {/* COLUMNA DERECHA */}
                <div className="space-y-4">
                  {/* NÓMINA */}
                  <div className="rounded-xl border border-slate-200 p-4">
                    <div className="mb-3 flex items-center gap-2">
                      <span className="flex h-6 w-6 items-center justify-center rounded-md bg-blue-50 text-xs font-bold text-blue-600">
                        3
                      </span>

                      <h3 className="text-sm font-semibold text-slate-700">
                        Nómina
                      </h3>
                    </div>

                    <div className="space-y-3">
                      <div>
                        <label className="mb-1.5 block text-xs font-semibold text-slate-600">
                          Período de nómina
                        </label>

                        <select
                          value={
                            periodo
                          }
                          onChange={(e) =>
                            setPeriodo(
                              e.target.value
                            )
                          }
                          className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-blue-400"
                        >
                          {periodos.map(
                            (
                              item
                            ) => (
                              <option
                                key={
                                  item
                                }
                                value={
                                  item
                                }
                              >
                                {nombrePeriodo(
                                  item
                                )}
                              </option>
                            )
                          )}
                        </select>
                      </div>

                      <div>
                        <div className="mb-1.5 flex items-center justify-between">
                          <label className="text-xs font-semibold text-slate-600">
                            ¿Afecta nómina?
                          </label>

                          <button
                            type="button"
                            onClick={() =>
                              cambiarAfectaNomina(
                                !afectaNomina
                              )
                            }
                            className={`relative h-6 w-11 rounded-full transition ${
                              afectaNomina
                                ? 'bg-blue-600'
                                : 'bg-slate-300'
                            }`}
                          >
                            <span
                              className={`absolute top-1 h-4 w-4 rounded-full bg-white transition ${
                                afectaNomina
                                  ? 'left-6'
                                  : 'left-1'
                              }`}
                            />
                          </button>
                        </div>

                        <p className="text-xs text-slate-400">
                          {afectaNomina
                            ? 'Sí, esta novedad afecta la nómina'
                            : 'No afecta la nómina'}
                        </p>
                      </div>

                      <div>
                        <label className="mb-1.5 block text-xs font-semibold text-slate-600">
                          Tratamiento de
                          nómina
                        </label>

                        <select
                          value={
                            tratamientoNomina
                          }
                          disabled={
                            !afectaNomina
                          }
                          onChange={(e) =>
                            setTratamientoNomina(
                              e.target.value
                            )
                          }
                          className={`w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-blue-400 ${
                            !afectaNomina
                              ? 'cursor-not-allowed bg-slate-100 text-slate-400'
                              : 'bg-white'
                          }`}
                        >
                          <option value="">
                            Selecciona un
                            tratamiento
                          </option>

                          {Object.entries(
                            TRATAMIENTOS
                          )
                            .filter(
                              ([
                                clave,
                              ]) =>
                                clave !==
                                  'NO_APLICA' ||
                                !afectaNomina
                            )
                            .map(
                              ([
                                valorTratamiento,
                                label,
                              ]) => (
                                <option
                                  key={
                                    valorTratamiento
                                  }
                                  value={
                                    valorTratamiento
                                  }
                                >
                                  {
                                    label
                                  }
                                </option>
                              )
                            )}
                        </select>

                        {!afectaNomina && (
                          <p className="mt-1 text-xs text-slate-400">
                            Se establece
                            automáticamente
                            como "No
                            aplica".
                          </p>
                        )}
                      </div>

                      <div>
                        <label className="mb-1.5 block text-xs font-semibold text-slate-600">
                          Valor (opcional)
                        </label>

                        <div className="flex">
                          <span className="flex items-center rounded-l-lg border border-r-0 border-slate-200 bg-slate-50 px-3 text-xs text-slate-500">
                            $
                          </span>

                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            value={
                              valor
                            }
                            onChange={(e) =>
                              setValor(
                                e
                                  .target
                                  .value
                              )
                            }
                            placeholder="0.00"
                            className="w-full rounded-r-lg border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-blue-400"
                          />
                        </div>

                        <p className="mt-1 text-xs text-slate-400">
                          Ingresa un
                          valor monetario
                          si aplica.
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* SOPORTE */}
                  <div className="rounded-xl border border-slate-200 p-4">
                    <div className="mb-3 flex items-center gap-2">
                      <span className="flex h-6 w-6 items-center justify-center rounded-md bg-blue-50 text-xs font-bold text-blue-600">
                        4
                      </span>

                      <h3 className="text-sm font-semibold text-slate-700">
                        Soporte
                      </h3>
                    </div>

                    <div className="space-y-3">
                      <div>
                        <label className="mb-1.5 block text-xs font-semibold text-slate-600">
                          Observación
                        </label>

                        <textarea
                          value={
                            observacion
                          }
                          onChange={(e) =>
                            setObservacion(
                              e.target
                                .value
                            )
                          }
                          rows={3}
                          placeholder="Escribe una observación..."
                          className="w-full resize-none rounded-lg border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-blue-400"
                        />
                      </div>

                      <div>
                        <label className="mb-1.5 block text-xs font-semibold text-slate-600">
                          Observación para
                          nómina
                        </label>

                        <textarea
                          value={
                            observacionNomina
                          }
                          onChange={(e) =>
                            setObservacionNomina(
                              e.target
                                .value
                            )
                          }
                          rows={3}
                          placeholder="Escribe una observación para nómina..."
                          className="w-full resize-none rounded-lg border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-blue-400"
                        />
                      </div>

                      <div>
                        <label className="mb-1.5 block text-xs font-semibold text-slate-600">
                          Soporte
                        </label>

                        <input
                          type="url"
                          value={
                            soporteUrl
                          }
                          onChange={(e) =>
                            setSoporteUrl(
                              e.target
                                .value
                            )
                          }
                          placeholder="https://..."
                          className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-blue-400"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-5 flex justify-end gap-3 border-t border-slate-100 pt-4">
                <button
                  type="button"
                  onClick={
                    cerrarModal
                  }
                  disabled={
                    guardando
                  }
                  className="rounded-lg border border-slate-200 px-5 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50"
                >
                  Cancelar
                </button>

                <button
                  type="submit"
                  disabled={
                    guardando
                  }
                  className="rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
                >
                  {guardando
                    ? 'Guardando...'
                    : editando
                      ? 'Guardar cambios'
                      : 'Guardar novedad'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* PANEL DETALLE */}
      {seleccionada && (
        <div className="fixed inset-0 z-[60] flex items-center justify-end bg-slate-900/20">
          <div className="h-full w-full max-w-sm overflow-y-auto border-l border-slate-200 bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
              <h2 className="font-bold text-slate-800">
                Detalle de novedad
              </h2>

              <button
                onClick={() =>
                  setSeleccionada(
                    null
                  )
                }
                className="flex h-8 w-8 items-center justify-center rounded-lg text-xl text-slate-400 hover:bg-slate-100"
              >
                ×
              </button>
            </div>

            <div className="p-5">
              <span
                className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${colorTipo(
                  seleccionada.tipo_novedad
                )}`}
              >
                {TIPOS_LABEL[
                  seleccionada
                    .tipo_novedad
                ] ||
                  seleccionada.tipo_novedad}
              </span>

              <div className="mt-4 flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-100 font-bold text-blue-600">
                  {iniciales(
                    seleccionada.empleado_nombre
                  )}
                </div>

                <div>
                  <p className="font-semibold text-slate-800">
                    {
                      seleccionada.empleado_nombre
                    }
                  </p>

                  <p className="text-xs text-slate-400">
                    CC.{' '}
                    {
                      seleccionada.documento
                    }
                  </p>
                </div>
              </div>

              <div className="mt-5 space-y-4">
                <div>
                  <p className="text-xs text-slate-400">
                    Sede
                  </p>

                  <p className="mt-1 text-sm font-medium text-slate-700">
                    {seleccionada.sede_nombre ||
                      `Sede ${seleccionada.sede_id}`}
                  </p>
                </div>

                <div>
                  <p className="text-xs text-slate-400">
                    Fechas
                  </p>

                  <p className="mt-1 text-sm font-medium text-slate-700">
                    {formatearFecha(
                      seleccionada.fecha_inicio
                    )}{' '}
                    -{' '}
                    {formatearFecha(
                      seleccionada.fecha_fin
                    )}
                  </p>
                </div>

                <div>
                  <p className="text-xs text-slate-400">
                    Período de nómina
                  </p>

                  <p className="mt-1 text-sm font-medium capitalize text-slate-700">
                    {seleccionada.periodo_nomina
                      ? nombrePeriodo(
                          seleccionada.periodo_nomina
                        )
                      : '-'}
                  </p>
                </div>

                <div>
                  <p className="text-xs text-slate-400">
                    Días
                  </p>

                  <p className="mt-1 text-sm font-medium text-slate-700">
                    {
                      seleccionada.dias
                    }
                  </p>
                </div>

                <div>
                  <p className="text-xs text-slate-400">
                    Estado
                  </p>

                  <span
                    className={`mt-1 inline-flex rounded-full px-3 py-1 text-xs font-semibold ${colorEstado(
                      seleccionada.estado
                    )}`}
                  >
                    {
                      ESTADO_LABEL[
                        seleccionada
                          .estado
                      ]
                    }
                  </span>
                </div>

                <div>
                  <p className="text-xs text-slate-400">
                    Afecta nómina
                  </p>

                  <span
                    className={`mt-1 inline-flex rounded-full px-3 py-1 text-xs font-semibold ${
                      seleccionada.afecta_nomina
                        ? 'bg-emerald-100 text-emerald-700'
                        : 'bg-slate-100 text-slate-500'
                    }`}
                  >
                    {seleccionada.afecta_nomina
                      ? 'Sí'
                      : 'No'}
                  </span>
                </div>

                <div>
                  <p className="text-xs text-slate-400">
                    Tratamiento
                  </p>

                  <p className="mt-1 text-sm font-medium text-slate-700">
                    {seleccionada.tratamiento_nomina
                      ? TRATAMIENTOS[
                          seleccionada
                            .tratamiento_nomina
                        ] ||
                        seleccionada.tratamiento_nomina
                      : '-'}
                  </p>
                </div>

                {seleccionada.valor !==
                  null &&
                  seleccionada.valor !==
                    undefined && (
                    <div>
                      <p className="text-xs text-slate-400">
                        Valor
                      </p>

                      <p className="mt-1 text-sm font-semibold text-slate-700">
                        $
                        {Number(
                          seleccionada.valor
                        ).toLocaleString(
                          'es-CO'
                        )}
                      </p>
                    </div>
                  )}

                {seleccionada.observacion && (
                  <div>
                    <p className="text-xs text-slate-400">
                      Observación
                    </p>

                    <p className="mt-1 rounded-lg bg-slate-50 p-3 text-sm text-slate-600">
                      {
                        seleccionada.observacion
                      }
                    </p>
                  </div>
                )}

                {seleccionada.observacion_nomina && (
                  <div>
                    <p className="text-xs text-slate-400">
                      Observación para
                      nómina
                    </p>

                    <p className="mt-1 rounded-lg bg-blue-50 p-3 text-sm text-slate-600">
                      {
                        seleccionada.observacion_nomina
                      }
                    </p>
                  </div>
                )}

                {seleccionada.soporte_url && (
                  <a
                    href={
                      seleccionada.soporte_url
                    }
                    target="_blank"
                    rel="noreferrer"
                    className="block rounded-lg border border-slate-200 px-4 py-3 text-center text-sm font-semibold text-blue-600 hover:bg-blue-50"
                  >
                    Ver soporte
                  </a>
                )}
              </div>

              <div className="mt-6 flex gap-2">
                <button
                  onClick={() => {
                    abrirEditar(
                      seleccionada
                    )

                    setSeleccionada(
                      null
                    )
                  }}
                  className="flex-1 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700"
                >
                  Editar
                </button>

                <button
                  onClick={async () => {
                    await eliminarNovedad(
                      seleccionada
                    )
                  }}
                  className="rounded-lg border border-red-200 px-4 py-2.5 text-sm font-semibold text-red-600 hover:bg-red-50"
                >
                  Eliminar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}