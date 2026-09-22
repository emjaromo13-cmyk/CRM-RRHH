import { useEffect, useMemo, useState } from 'react'

type Employee = {
  id: number
  name: string
  document: string
  role: string
  username: string
  status: string
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
  INCAPACIDAD_GENERAL: 'Incapacidad general (EG)',
  INCAPACIDAD_LABORAL: 'Incapacidad laboral (ATEP)',
  LICENCIA_MATERNIDAD: 'Licencia de maternidad',
  LICENCIA_PATERNIDAD: 'Licencia de paternidad',
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

const ESTADOS = ['PENDIENTE', 'APROBADA', 'RECHAZADA']

const ESTADO_LABEL: Record<string, string> = {
  PENDIENTE: 'Pendiente',
  APROBADA: 'Aprobada',
  RECHAZADA: 'Rechazada',
}

const API_URL = 'http://localhost:3000'

function obtenerToken() {
  return localStorage.getItem('token')
}

function formatearFecha(fecha: string) {
  if (!fecha) return '-'

  const partes = fecha.split('T')[0].split('-')

  if (partes.length !== 3) return fecha

  return `${partes[2]}/${partes[1]}/${partes[0]}`
}

function calcularDias(inicio: string, fin: string) {
  if (!inicio || !fin) return 0

  const fechaInicio = new Date(`${inicio}T00:00:00`)
  const fechaFin = new Date(`${fin}T00:00:00`)

  const diferencia = fechaFin.getTime() - fechaInicio.getTime()

  if (diferencia < 0) return 0

  return Math.floor(diferencia / (1000 * 60 * 60 * 24)) + 1
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
    return 'bg-amber-50 text-amber-700 border-amber-200'
  }

  if (tipo.includes('LICENCIA')) {
    return 'bg-purple-50 text-purple-700 border-purple-200'
  }

  if (tipo === 'VACACIONES') {
    return 'bg-blue-50 text-blue-700 border-blue-200'
  }

  if (tipo.includes('PERMISO')) {
    return 'bg-cyan-50 text-cyan-700 border-cyan-200'
  }

  if (tipo === 'RETIRO') {
    return 'bg-red-50 text-red-700 border-red-200'
  }

  if (tipo === 'INGRESO') {
    return 'bg-emerald-50 text-emerald-700 border-emerald-200'
  }

  return 'bg-slate-50 text-slate-600 border-slate-200'
}

function colorEstado(estado: string) {
  if (estado === 'APROBADA') {
    return 'bg-emerald-50 text-emerald-700 border-emerald-200'
  }

  if (estado === 'RECHAZADA') {
    return 'bg-red-50 text-red-700 border-red-200'
  }

  return 'bg-amber-50 text-amber-700 border-amber-200'
}

export default function Novedades({ employees }: Props) {
  const [novedades, setNovedades] = useState<Novedad[]>([])
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState('')

  const [mostrarModal, setMostrarModal] = useState(false)
  const [editando, setEditando] = useState<Novedad | null>(null)

  const [busqueda, setBusqueda] = useState('')
  const [filtroEstado, setFiltroEstado] = useState('TODAS')

  const [empleadoId, setEmpleadoId] = useState('')
  const [tipoNovedad, setTipoNovedad] = useState('')
  const [fechaInicio, setFechaInicio] = useState('')
  const [fechaFin, setFechaFin] = useState('')
  const [estado, setEstado] = useState('PENDIENTE')
  const [afectaNomina, setAfectaNomina] = useState(true)
  const [tratamientoNomina, setTratamientoNomina] = useState('')
  const [observacion, setObservacion] = useState('')

  const [guardando, setGuardando] = useState(false)

  const diasCalculados = useMemo(
    () => calcularDias(fechaInicio, fechaFin),
    [fechaInicio, fechaFin]
  )

  async function cargarNovedades() {
    try {
      setCargando(true)
      setError('')

      const token = obtenerToken()

      const respuesta = await fetch(`${API_URL}/api/novedades-nomina`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      const datos = await respuesta.json()

      if (!respuesta.ok) {
        throw new Error(datos.mensaje || 'No se pudieron cargar las novedades')
      }

      setNovedades(datos)
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
    setObservacion('')
    setEditando(null)
  }

  function abrirNueva() {
    limpiarFormulario()
    setMostrarModal(true)
  }

  function abrirEditar(novedad: Novedad) {
    setEditando(novedad)
    setEmpleadoId(String(novedad.empleado_id))
    setTipoNovedad(novedad.tipo_novedad)
    setFechaInicio(novedad.fecha_inicio?.split('T')[0] || '')
    setFechaFin(novedad.fecha_fin?.split('T')[0] || '')
    setEstado(novedad.estado)
    setAfectaNomina(novedad.afecta_nomina)
    setTratamientoNomina(novedad.tratamiento_nomina || '')
    setObservacion(novedad.observacion || '')
    setMostrarModal(true)
  }

  function cerrarModal() {
    if (guardando) return

    setMostrarModal(false)
    limpiarFormulario()
  }

  async function guardarNovedad(e: React.FormEvent) {
    e.preventDefault()

    if (!empleadoId || !tipoNovedad || !fechaInicio || !fechaFin) {
      setError('Completa los campos obligatorios.')
      return
    }

    if (diasCalculados <= 0) {
      setError('La fecha final debe ser igual o posterior a la fecha inicial.')
      return
    }

    try {
      setGuardando(true)
      setError('')

      const token = obtenerToken()

      const cuerpo = {
        empleado_id: Number(empleadoId),
        tipo_novedad: tipoNovedad,
        fecha_inicio: fechaInicio,
        fecha_fin: fechaFin,
        estado,
        afecta_nomina: afectaNomina,
        tratamiento_nomina: tratamientoNomina || null,
        observacion: observacion || null,
      }

      const url = editando
        ? `${API_URL}/api/novedades-nomina/${editando.id}`
        : `${API_URL}/api/novedades-nomina`

      const respuesta = await fetch(url, {
        method: editando ? 'PUT' : 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(cuerpo),
      })

      const datos = await respuesta.json()

      if (!respuesta.ok) {
        throw new Error(datos.mensaje || 'No se pudo guardar la novedad')
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

  async function eliminarNovedad(novedad: Novedad) {
    const confirmar = window.confirm(
      `¿Seguro que deseas eliminar la novedad de ${novedad.empleado_nombre}?`
    )

    if (!confirmar) return

    try {
      setError('')

      const token = obtenerToken()

      const respuesta = await fetch(
        `${API_URL}/api/novedades-nomina/${novedad.id}`,
        {
          method: 'DELETE',
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      )

      const datos = await respuesta.json()

      if (!respuesta.ok) {
        throw new Error(datos.mensaje || 'No se pudo eliminar la novedad')
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

  const novedadesFiltradas = useMemo(() => {
    const texto = busqueda.trim().toLowerCase()

    return novedades.filter((novedad) => {
      const coincideBusqueda =
        !texto ||
        novedad.empleado_nombre.toLowerCase().includes(texto) ||
        novedad.documento?.toLowerCase().includes(texto) ||
        TIPOS_LABEL[novedad.tipo_novedad]
          ?.toLowerCase()
          .includes(texto)

      const coincideEstado =
        filtroEstado === 'TODAS' || novedad.estado === filtroEstado

      return coincideBusqueda && coincideEstado
    })
  }, [novedades, busqueda, filtroEstado])

  const totalPendientes = novedades.filter(
    (novedad) => novedad.estado === 'PENDIENTE'
  ).length

  const totalAfectanNomina = novedades.filter(
    (novedad) => novedad.afecta_nomina
  ).length

  return (
    <div className="space-y-6">
      {/* ENCABEZADO */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-600 text-white shadow-sm">
              <svg
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
              >
                <path d="M12 3v18M3 12h18" />
                <rect x="4" y="4" width="16" height="16" rx="4" />
              </svg>
            </div>

            <div>
              <h1 className="text-3xl font-bold tracking-tight text-slate-800">
                Novedades
              </h1>
              <p className="mt-1 text-sm text-slate-500">
                Gestión de novedades de nómina
              </p>
            </div>
          </div>
        </div>

        <button
          onClick={abrirNueva}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-5 py-3 font-semibold text-white shadow-sm transition hover:bg-indigo-700 hover:shadow-md"
        >
          <span className="text-xl leading-none">+</span>
          Nueva novedad
        </button>
      </div>

      {/* ERROR */}
      {error && (
        <div className="flex items-start justify-between gap-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          <span>{error}</span>

          <button
            onClick={() => setError('')}
            className="font-bold text-red-500 hover:text-red-700"
          >
            ×
          </button>
        </div>
      )}

      {/* TARJETAS RESUMEN */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-500">
                Total novedades
              </p>
              <p className="mt-2 text-3xl font-bold text-slate-800">
                {novedades.length}
              </p>
            </div>

            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
              <svg
                width="22"
                height="22"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
              >
                <rect x="4" y="4" width="16" height="16" rx="3" />
                <path d="M8 9h8M8 13h8M8 17h5" />
              </svg>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-500">
                Pendientes
              </p>
              <p className="mt-2 text-3xl font-bold text-slate-800">
                {totalPendientes}
              </p>
            </div>

            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-amber-50 text-amber-600">
              <svg
                width="22"
                height="22"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
              >
                <circle cx="12" cy="12" r="8" />
                <path d="M12 8v4l2.5 2" />
              </svg>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-500">
                Afectan nómina
              </p>
              <p className="mt-2 text-3xl font-bold text-slate-800">
                {totalAfectanNomina}
              </p>
            </div>

            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
              <svg
                width="22"
                height="22"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
              >
                <path d="M12 3v18M7 7h7a3 3 0 0 1 0 6H8a3 3 0 0 0 0 6h9" />
              </svg>
            </div>
          </div>
        </div>
      </div>

      {/* CONTROLES */}
      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex flex-col gap-3 lg:flex-row">
          <div className="relative flex-1">
            <svg
              className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
              width="19"
              height="19"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <circle cx="11" cy="11" r="7" />
              <path d="m20 20-4-4" />
            </svg>

            <input
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              placeholder="Buscar empleado, documento o novedad..."
              className="w-full rounded-xl border border-slate-200 bg-slate-50 py-3 pl-11 pr-4 text-sm outline-none transition focus:border-indigo-400 focus:bg-white focus:ring-2 focus:ring-indigo-100"
            />
          </div>

          <select
            value={filtroEstado}
            onChange={(e) => setFiltroEstado(e.target.value)}
            className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:border-indigo-400 focus:bg-white focus:ring-2 focus:ring-indigo-100"
          >
            <option value="TODAS">Todos los estados</option>
            {ESTADOS.map((item) => (
              <option key={item} value={item}>
                {ESTADO_LABEL[item]}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* TABLA */}
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-100 px-5 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-semibold text-slate-800">
                Registro de novedades
              </h2>
              <p className="mt-1 text-xs text-slate-500">
                {novedadesFiltradas.length} registro
                {novedadesFiltradas.length !== 1 ? 's' : ''}
              </p>
            </div>
          </div>
        </div>

        {cargando ? (
          <div className="flex min-h-[260px] items-center justify-center">
            <div className="text-center">
              <div className="mx-auto h-8 w-8 animate-spin rounded-full border-4 border-slate-200 border-t-indigo-600" />
              <p className="mt-3 text-sm text-slate-500">
                Cargando novedades...
              </p>
            </div>
          </div>
        ) : novedadesFiltradas.length === 0 ? (
          <div className="flex min-h-[300px] flex-col items-center justify-center px-6 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">
              <svg
                width="30"
                height="30"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.6"
              >
                <rect x="4" y="4" width="16" height="16" rx="3" />
                <path d="M8 9h8M8 13h5" />
              </svg>
            </div>

            <h3 className="mt-4 font-semibold text-slate-700">
              No hay novedades registradas
            </h3>

            <p className="mt-1 max-w-md text-sm text-slate-500">
              Cuando registres una novedad de nómina, aparecerá aquí.
            </p>

            <button
              onClick={abrirNueva}
              className="mt-5 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700"
            >
              Registrar primera novedad
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[950px]">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/70 text-left text-xs uppercase tracking-wide text-slate-500">
                  <th className="px-5 py-4 font-semibold">Empleado</th>
                  <th className="px-4 py-4 font-semibold">Novedad</th>
                  <th className="px-4 py-4 font-semibold">Periodo</th>
                  <th className="px-4 py-4 text-center font-semibold">
                    Días
                  </th>
                  <th className="px-4 py-4 font-semibold">Estado</th>
                  <th className="px-4 py-4 font-semibold">Nómina</th>
                  <th className="px-5 py-4 text-right font-semibold">
                    Acciones
                  </th>
                </tr>
              </thead>

              <tbody>
                {novedadesFiltradas.map((novedad) => (
                  <tr
                    key={novedad.id}
                    className="border-b border-slate-100 last:border-b-0 hover:bg-slate-50/60"
                  >
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-50 text-sm font-bold text-indigo-600">
                          {iniciales(novedad.empleado_nombre)}
                        </div>

                        <div>
                          <p className="font-semibold text-slate-700">
                            {novedad.empleado_nombre}
                          </p>
                          <p className="mt-0.5 text-xs text-slate-500">
                            {novedad.documento || 'Sin documento'}
                          </p>
                        </div>
                      </div>
                    </td>

                    <td className="px-4 py-4">
                      <span
                        className={`inline-flex rounded-lg border px-2.5 py-1 text-xs font-medium ${colorTipo(
                          novedad.tipo_novedad
                        )}`}
                      >
                        {TIPOS_LABEL[novedad.tipo_novedad] ||
                          novedad.tipo_novedad}
                      </span>
                    </td>

                    <td className="px-4 py-4">
                      <p className="text-sm font-medium text-slate-700">
                        {formatearFecha(novedad.fecha_inicio)}
                      </p>
                      <p className="mt-0.5 text-xs text-slate-400">
                        hasta {formatearFecha(novedad.fecha_fin)}
                      </p>
                    </td>

                    <td className="px-4 py-4 text-center">
                      <span className="font-bold text-slate-700">
                        {novedad.dias}
                      </span>
                    </td>

                    <td className="px-4 py-4">
                      <span
                        className={`inline-flex rounded-lg border px-2.5 py-1 text-xs font-semibold ${colorEstado(
                          novedad.estado
                        )}`}
                      >
                        {ESTADO_LABEL[novedad.estado] || novedad.estado}
                      </span>
                    </td>

                    <td className="px-4 py-4">
                      {novedad.afecta_nomina ? (
                        <div>
                          <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-600">
                            <span className="h-2 w-2 rounded-full bg-emerald-500" />
                            Sí afecta
                          </span>

                          {novedad.tratamiento_nomina && (
                            <p className="mt-1 text-xs text-slate-400">
                              {novedad.tratamiento_nomina}
                            </p>
                          )}
                        </div>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-400">
                          <span className="h-2 w-2 rounded-full bg-slate-300" />
                          No afecta
                        </span>
                      )}
                    </td>

                    <td className="px-5 py-4">
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() => abrirEditar(novedad)}
                          title="Editar"
                          className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 text-slate-500 transition hover:border-indigo-200 hover:bg-indigo-50 hover:text-indigo-600"
                        >
                          <svg
                            width="17"
                            height="17"
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
                          onClick={() => eliminarNovedad(novedad)}
                          title="Eliminar"
                          className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 text-slate-500 transition hover:border-red-200 hover:bg-red-50 hover:text-red-600"
                        >
                          <svg
                            width="17"
                            height="17"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="1.8"
                          >
                            <path d="M4 7h16" />
                            <path d="M10 11v6M14 11v6" />
                            <path d="M6 7l1 13h10l1-13" />
                            <path d="M9 7V4h6v3" />
                          </svg>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* MODAL */}
      {mostrarModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-sm">
          <div className="max-h-[92vh] w-full max-w-3xl overflow-y-auto rounded-3xl bg-white shadow-2xl">
            {/* CABECERA MODAL */}
            <div className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-100 bg-white px-6 py-5">
              <div>
                <h2 className="text-xl font-bold text-slate-800">
                  {editando ? 'Editar novedad' : 'Nueva novedad'}
                </h2>

                <p className="mt-1 text-sm text-slate-500">
                  Registra la información correspondiente a la novedad.
                </p>
              </div>

              <button
                onClick={cerrarModal}
                className="flex h-9 w-9 items-center justify-center rounded-xl text-2xl text-slate-400 hover:bg-slate-100 hover:text-slate-600"
              >
                ×
              </button>
            </div>

            <form onSubmit={guardarNovedad} className="p-6">
              <div className="space-y-6">
                {/* EMPLEADO */}
                <div>
                  <label className="mb-2 block text-sm font-semibold text-slate-700">
                    Empleado <span className="text-red-500">*</span>
                  </label>

                  <select
                    value={empleadoId}
                    onChange={(e) => setEmpleadoId(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:border-indigo-400 focus:bg-white focus:ring-2 focus:ring-indigo-100"
                    required
                  >
                    <option value="">Selecciona un empleado</option>

                    {employees.map((employee) => (
                      <option key={employee.id} value={employee.id}>
                        {employee.name} — {employee.document}
                      </option>
                    ))}
                  </select>
                </div>

                {/* TIPO */}
                <div>
                  <label className="mb-2 block text-sm font-semibold text-slate-700">
                    Tipo de novedad <span className="text-red-500">*</span>
                  </label>

                  <select
                    value={tipoNovedad}
                    onChange={(e) => setTipoNovedad(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:border-indigo-400 focus:bg-white focus:ring-2 focus:ring-indigo-100"
                    required
                  >
                    <option value="">Selecciona el tipo</option>

                    {TIPOS_NOVEDAD.map((tipo) => (
                      <option key={tipo} value={tipo}>
                        {TIPOS_LABEL[tipo]}
                      </option>
                    ))}
                  </select>
                </div>

                {/* FECHAS */}
                <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                  <div>
                    <label className="mb-2 block text-sm font-semibold text-slate-700">
                      Fecha inicio <span className="text-red-500">*</span>
                    </label>

                    <input
                      type="date"
                      value={fechaInicio}
                      onChange={(e) => setFechaInicio(e.target.value)}
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:border-indigo-400 focus:bg-white focus:ring-2 focus:ring-indigo-100"
                      required
                    />
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-semibold text-slate-700">
                      Fecha fin <span className="text-red-500">*</span>
                    </label>

                    <input
                      type="date"
                      value={fechaFin}
                      min={fechaInicio || undefined}
                      onChange={(e) => setFechaFin(e.target.value)}
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:border-indigo-400 focus:bg-white focus:ring-2 focus:ring-indigo-100"
                      required
                    />
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-semibold text-slate-700">
                      Días
                    </label>

                    <div className="flex h-[46px] items-center rounded-xl border border-indigo-100 bg-indigo-50 px-4">
                      <span className="text-lg font-bold text-indigo-600">
                        {diasCalculados}
                      </span>

                      <span className="ml-2 text-sm text-indigo-500">
                        {diasCalculados === 1 ? 'día' : 'días'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* ESTADO */}
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div>
                    <label className="mb-2 block text-sm font-semibold text-slate-700">
                      Estado
                    </label>

                    <select
                      value={estado}
                      onChange={(e) => setEstado(e.target.value)}
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:border-indigo-400 focus:bg-white focus:ring-2 focus:ring-indigo-100"
                    >
                      {ESTADOS.map((item) => (
                        <option key={item} value={item}>
                          {ESTADO_LABEL[item]}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* AFECTA NOMINA */}
                  <div>
                    <label className="mb-2 block text-sm font-semibold text-slate-700">
                      ¿Afecta la nómina?
                    </label>

                    <button
                      type="button"
                      onClick={() => setAfectaNomina(!afectaNomina)}
                      className={`flex w-full items-center justify-between rounded-xl border px-4 py-3 transition ${
                        afectaNomina
                          ? 'border-emerald-200 bg-emerald-50'
                          : 'border-slate-200 bg-slate-50'
                      }`}
                    >
                      <span
                        className={`text-sm font-semibold ${
                          afectaNomina
                            ? 'text-emerald-700'
                            : 'text-slate-500'
                        }`}
                      >
                        {afectaNomina ? 'Sí, afecta nómina' : 'No afecta nómina'}
                      </span>

                      <span
                        className={`relative h-6 w-11 rounded-full transition ${
                          afectaNomina ? 'bg-emerald-500' : 'bg-slate-300'
                        }`}
                      >
                        <span
                          className={`absolute top-1 h-4 w-4 rounded-full bg-white shadow-sm transition ${
                            afectaNomina ? 'left-6' : 'left-1'
                          }`}
                        />
                      </span>
                    </button>
                  </div>
                </div>

                {/* TRATAMIENTO */}
                <div>
                  <label className="mb-2 block text-sm font-semibold text-slate-700">
                    Tratamiento de nómina
                  </label>

                  <select
                    value={tratamientoNomina}
                    onChange={(e) => setTratamientoNomina(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:border-indigo-400 focus:bg-white focus:ring-2 focus:ring-indigo-100"
                  >
                    <option value="">Selecciona un tratamiento</option>
                    <option value="PAGO_COMPLETO">Pago completo</option>
                    <option value="PAGO_PARCIAL">Pago parcial</option>
                    <option value="NO_PAGO">No pago</option>
                    <option value="DESCUENTO">Descuento</option>
                    <option value="PENDIENTE_REVISION">
                      Pendiente de revisión
                    </option>
                    <option value="NO_APLICA">No aplica</option>
                  </select>
                </div>

                {/* OBSERVACION */}
                <div>
                  <label className="mb-2 block text-sm font-semibold text-slate-700">
                    Observación
                  </label>

                  <textarea
                    value={observacion}
                    onChange={(e) => setObservacion(e.target.value)}
                    rows={4}
                    placeholder="Agrega información adicional sobre la novedad..."
                    className="w-full resize-none rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:border-indigo-400 focus:bg-white focus:ring-2 focus:ring-indigo-100"
                  />
                </div>
              </div>

              {/* BOTONES */}
              <div className="mt-8 flex flex-col-reverse gap-3 border-t border-slate-100 pt-5 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={cerrarModal}
                  disabled={guardando}
                  className="rounded-xl border border-slate-200 px-5 py-3 text-sm font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-50"
                >
                  Cancelar
                </button>

                <button
                  type="submit"
                  disabled={guardando}
                  className="rounded-xl bg-indigo-600 px-6 py-3 text-sm font-semibold text-white shadow-sm hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {guardando
                    ? 'Guardando...'
                    : editando
                      ? 'Guardar cambios'
                      : 'Registrar novedad'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}