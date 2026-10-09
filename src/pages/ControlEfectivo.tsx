import { useCallback, useEffect, useMemo, useState } from 'react'
import * as XLSX from 'xlsx'

const API_URL = 'https://crm-rrhh-backend.onrender.com'

type Sede = {
  id: number
  nombre: string
}

type Corte = {
  id: number
  sede_id: number
  sede_nombre: string
  fecha_inicio: string
  fecha_fin: string
  fecha_recepcion: string
  responsable_entrega: string
  efectivo_recibido: string | number
  ventas_syscafe: string | number
  observaciones: string | null
  total_retiros: string | number
  efectivo_generado: string | number
  diferencia: string | number
}

type Retiro = {
  id: number
  corte_id: number
  fecha: string
  monto: string | number
  retirado_por: string
  motivo: string
  detalle: string | null
}

const hoy = () => new Date().toLocaleDateString('en-CA')

const dinero = (valor: string | number) =>
  Number(valor || 0).toLocaleString('es-CO', {
    style: 'currency',
    currency: 'COP',
    maximumFractionDigits: 0,
  })

const fechaCorta = (fecha: string) =>
  fecha ? String(fecha).slice(0, 10) : ''

const campo =
  'w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100'

const boton =
  'rounded-lg px-4 py-2 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-50'

const inicial = {
  sede_id: '',
  fecha_inicio: hoy(),
  fecha_fin: hoy(),
  fecha_recepcion: hoy(),
  responsable_entrega: '',
  efectivo_recibido: '',
  ventas_syscafe: '',
  observaciones: '',
}

const retiroInicial = {
  fecha: hoy(),
  monto: '',
  retirado_por: '',
  motivo: 'Retiro de efectivo',
  detalle: '',
}

export default function ControlEfectivo() {
  const [sedes, setSedes] = useState<Sede[]>([])
  const [cortes, setCortes] = useState<Corte[]>([])
  const [form, setForm] = useState(inicial)
  const [filtroSede, setFiltroSede] = useState('')
  const [desde, setDesde] = useState('')
  const [hasta, setHasta] = useState('')
  const [busqueda, setBusqueda] = useState('')
  const [editando, setEditando] = useState<number | null>(null)
  const [corteActivo, setCorteActivo] = useState<Corte | null>(null)
  const [retiros, setRetiros] = useState<Retiro[]>([])
  const [retiroForm, setRetiroForm] = useState(retiroInicial)
  const [mostrarFormulario, setMostrarFormulario] = useState(false)
  const [cargando, setCargando] = useState(true)
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState('')
  const [mensaje, setMensaje] = useState('')

  const token = () => localStorage.getItem('token')

  const peticion = useCallback(async (ruta: string, opciones: RequestInit = {}) => {
    const jwt = token()
    if (!jwt) throw new Error('Tu sesión no está disponible. Inicia sesión nuevamente.')

    const respuesta = await fetch(`${API_URL}${ruta}`, {
      ...opciones,
      headers: {
        Authorization: `Bearer ${jwt}`,
        'Content-Type': 'application/json',
        ...opciones.headers,
      },
    })

    const datos = await respuesta.json().catch(() => ({}))

    if (!respuesta.ok) {
      throw new Error(datos.mensaje || 'No se pudo completar la operación.')
    }

    return datos
  }, [])

  const cargarSedes = useCallback(async () => {
    const datos = await peticion('/api/sedes')
    setSedes(datos)
  }, [peticion])

  const cargarCortes = useCallback(async () => {
    const parametros = new URLSearchParams()
    if (filtroSede) parametros.set('sede_id', filtroSede)
    if (desde) parametros.set('fecha_inicio', desde)
    if (hasta) parametros.set('fecha_fin', hasta)

    const sufijo = parametros.toString()
    const datos = await peticion(`/api/control-efectivo${sufijo ? `?${sufijo}` : ''}`)
    setCortes(datos)
  }, [peticion, filtroSede, desde, hasta])

  const inicializar = useCallback(async () => {
    setCargando(true)
    setError('')
    try {
      await Promise.all([cargarSedes(), cargarCortes()])
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No fue posible cargar la información.')
    } finally {
      setCargando(false)
    }
  }, [cargarSedes, cargarCortes])

  useEffect(() => {
    void inicializar()
  }, [inicializar])

  const limpiarFormulario = () => {
    setForm({ ...inicial, sede_id: '' })
    setEditando(null)
    setMostrarFormulario(false)
  }

  const guardarCorte = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setGuardando(true)
    setError('')
    setMensaje('')

    try {
      const payload = {
        ...form,
        sede_id: Number(form.sede_id),
        efectivo_recibido: Number(form.efectivo_recibido),
        ventas_syscafe: Number(form.ventas_syscafe),
        fecha_recepcion: form.fecha_recepcion || null,
      }

      await peticion(
        editando
          ? `/api/control-efectivo/${editando}`
          : '/api/control-efectivo',
        {
          method: editando ? 'PUT' : 'POST',
          body: JSON.stringify(payload),
        },
      )

      setMensaje(editando ? 'Corte actualizado correctamente.' : 'Corte registrado correctamente.')
      limpiarFormulario()
      await cargarCortes()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No fue posible guardar el corte.')
    } finally {
      setGuardando(false)
    }
  }

  const editarCorte = (corte: Corte) => {
    setForm({
      sede_id: String(corte.sede_id),
      fecha_inicio: fechaCorta(corte.fecha_inicio),
      fecha_fin: fechaCorta(corte.fecha_fin),
      fecha_recepcion: fechaCorta(corte.fecha_recepcion),
      responsable_entrega: corte.responsable_entrega,
      efectivo_recibido: String(corte.efectivo_recibido),
      ventas_syscafe: String(corte.ventas_syscafe),
      observaciones: corte.observaciones || '',
    })
    setEditando(corte.id)
    setMostrarFormulario(true)
    setCorteActivo(null)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const abrirRetiros = async (corte: Corte) => {
    setCorteActivo(corte)
    setError('')
    try {
      const datos = await peticion(`/api/control-efectivo/${corte.id}/retiros`)
      setRetiros(datos)
      setRetiroForm(retiroInicial)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No fue posible consultar los retiros.')
    }
  }

  const guardarRetiro = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!corteActivo) return

    setGuardando(true)
    setError('')
    setMensaje('')

    try {
      await peticion(`/api/control-efectivo/${corteActivo.id}/retiros`, {
        method: 'POST',
        body: JSON.stringify({
          ...retiroForm,
          monto: Number(retiroForm.monto),
        }),
      })

      const datos = await peticion(`/api/control-efectivo/${corteActivo.id}/retiros`)
      setRetiros(datos)
      setRetiroForm(retiroInicial)
      setMensaje('Retiro registrado correctamente.')
      await cargarCortes()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No fue posible guardar el retiro.')
    } finally {
      setGuardando(false)
    }
  }

  const eliminarRetiro = async (retiro: Retiro) => {
    if (!window.confirm(`¿Eliminar el retiro de ${dinero(retiro.monto)}?`)) return

    setError('')
    setMensaje('')
    try {
      await peticion(`/api/control-efectivo/retiros/${retiro.id}`, {
        method: 'DELETE',
      })

      if (corteActivo) {
        const datos = await peticion(`/api/control-efectivo/${corteActivo.id}/retiros`)
        setRetiros(datos)
      }

      await cargarCortes()
      setMensaje('Retiro eliminado correctamente.')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No fue posible eliminar el retiro.')
    }
  }

  const resumen = useMemo(() => {
    return cortes.reduce(
      (total, corte) => ({
        ventas: total.ventas + Number(corte.ventas_syscafe || 0),
        recibido: total.recibido + Number(corte.efectivo_recibido || 0),
        retiros: total.retiros + Number(corte.total_retiros || 0),
        diferencia: total.diferencia + Number(corte.diferencia || 0),
      }),
      { ventas: 0, recibido: 0, retiros: 0, diferencia: 0 },
    )
  }, [cortes])

  const cortesFiltrados = cortes.filter((corte) => {
    const texto = `${corte.sede_nombre} ${corte.responsable_entrega}`.toLowerCase()
    return texto.includes(busqueda.toLowerCase())
  })

  const descargarExcel = async () => {
    try {
      setError('')
      setMensaje('')

      const filasCortes = cortesFiltrados.map((corte) => {
        const ventas = Number(corte.ventas_syscafe || 0)
        const recibido = Number(corte.efectivo_recibido || 0)
        const retirosTotal = Number(corte.total_retiros || 0)
        const diferencia = recibido + retirosTotal - ventas

        return {
          'ID del corte': corte.id,
          'Sede': corte.sede_nombre,
          'Responsable de entrega': corte.responsable_entrega,
          'Fecha inicial': fechaCorta(corte.fecha_inicio),
          'Fecha final': fechaCorta(corte.fecha_fin),
          'Fecha de recepción': fechaCorta(corte.fecha_recepcion),
          'Ventas SysCafé (COP)': ventas,
          'Efectivo recibido (COP)': recibido,
          'Total retiros (COP)': retirosTotal,
          'Diferencia (COP)': diferencia,
          'Estado': diferencia === 0 ? 'Cuadra' : diferencia > 0 ? 'Sobrante' : 'Faltante',
          'Observaciones': corte.observaciones || '',
        }
      })

      const filasRetiros: Record<string, string | number>[] = []

      for (const corte of cortesFiltrados) {
        const datos = await peticion(`/api/control-efectivo/${corte.id}/retiros`)

        for (const retiro of datos as Retiro[]) {
          filasRetiros.push({
            'ID del corte': corte.id,
            'Sede': corte.sede_nombre,
            'Periodo': `${fechaCorta(corte.fecha_inicio)} al ${fechaCorta(corte.fecha_fin)}`,
            'Fecha del retiro': fechaCorta(retiro.fecha),
            'Monto (COP)': Number(retiro.monto || 0),
            'Retirado por': retiro.retirado_por || '',
            'Motivo': retiro.motivo || '',
            'Detalle': retiro.detalle || '',
          })
        }
      }

      const libro = XLSX.utils.book_new()
      const hojaCortes = XLSX.utils.json_to_sheet(filasCortes)
      const hojaRetiros = XLSX.utils.json_to_sheet(filasRetiros)

      hojaCortes['!cols'] = [
        { wch: 12 }, { wch: 20 }, { wch: 26 }, { wch: 14 },
        { wch: 14 }, { wch: 18 }, { wch: 20 }, { wch: 22 },
        { wch: 20 }, { wch: 18 }, { wch: 14 }, { wch: 40 },
      ]

      hojaRetiros['!cols'] = [
        { wch: 12 }, { wch: 20 }, { wch: 26 }, { wch: 18 },
        { wch: 18 }, { wch: 25 }, { wch: 25 }, { wch: 40 },
      ]

      XLSX.utils.book_append_sheet(libro, hojaCortes, 'Consolidado')
      XLSX.utils.book_append_sheet(libro, hojaRetiros, 'Detalle de retiros')

      const fechaArchivo = new Date().toISOString().slice(0, 10)
      XLSX.writeFile(libro, `Control_Efectivo_${fechaArchivo}.xlsx`)

      setMensaje('Excel descargado correctamente.')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No fue posible generar el Excel.')
    }
  }

  const actualizar = (campoForm: keyof typeof inicial, valor: string) => {
    setForm((anterior) => ({ ...anterior, [campoForm]: valor }))
  }

  const diferenciaPrevia =
    Number(form.efectivo_recibido || 0) -
    Number(form.ventas_syscafe || 0)

  return (
    <div className="space-y-6">
      <header className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Control de Efectivo</h1>
          <p className="mt-1 text-sm text-slate-500">
            Registro, conciliación y seguimiento del efectivo recibido por Tesorería.
          </p>
        </div>
        <button
          type="button"
          className={`${boton} bg-blue-600 text-white hover:bg-blue-700`}
          onClick={() => {
            limpiarFormulario()
            setMostrarFormulario((actual) => !actual)
            setError('')
            setMensaje('')
          }}
        >
          {mostrarFormulario ? 'Cerrar formulario' : '+ Registrar corte'}
        </button>
      </header>

      {error && (
        <div role="alert" className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {error}
        </div>
      )}
      {mensaje && (
        <div className="rounded-lg border border-green-200 bg-green-50 p-3 text-sm text-green-700">
          {mensaje}
        </div>
      )}

      {mostrarFormulario && (
        <form onSubmit={guardarCorte} className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-800">
            {editando ? 'Editar corte de efectivo' : 'Nuevo corte de efectivo'}
          </h2>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <label className="space-y-1 text-sm font-medium text-slate-700">
              Sede *
              <select className={campo} value={form.sede_id} onChange={(e) => actualizar('sede_id', e.target.value)} required>
                <option value="">Seleccionar sede</option>
                {sedes.map((sede) => (
                  <option key={sede.id} value={sede.id}>{sede.nombre}</option>
                ))}
              </select>
            </label>

            <label className="space-y-1 text-sm font-medium text-slate-700">
              Fecha inicial del corte *
              <input className={campo} type="date" value={form.fecha_inicio} onChange={(e) => actualizar('fecha_inicio', e.target.value)} required />
            </label>

            <label className="space-y-1 text-sm font-medium text-slate-700">
              Fecha final del corte *
              <input className={campo} type="date" min={form.fecha_inicio} value={form.fecha_fin} onChange={(e) => actualizar('fecha_fin', e.target.value)} required />
            </label>

            <label className="space-y-1 text-sm font-medium text-slate-700">
              Fecha de recepción
              <input className={campo} type="date" value={form.fecha_recepcion} onChange={(e) => actualizar('fecha_recepcion', e.target.value)} />
            </label>

            <label className="space-y-1 text-sm font-medium text-slate-700">
              Responsable de la entrega *
              <input className={campo} value={form.responsable_entrega} onChange={(e) => actualizar('responsable_entrega', e.target.value)} required maxLength={150} placeholder="Nombre del responsable" />
            </label>

            <label className="space-y-1 text-sm font-medium text-slate-700">
              Efectivo recibido (COP) *
              <input className={campo} type="number" min="0" step="1" value={form.efectivo_recibido} onChange={(e) => actualizar('efectivo_recibido', e.target.value)} required />
            </label>

            <label className="space-y-1 text-sm font-medium text-slate-700">
              Ventas en efectivo SysCafé (COP) *
              <input className={campo} type="number" min="0" step="1" value={form.ventas_syscafe} onChange={(e) => actualizar('ventas_syscafe', e.target.value)} required />
            </label>

            <label className="space-y-1 text-sm font-medium text-slate-700 sm:col-span-2 lg:col-span-3">
              Observaciones
              <textarea className={campo} rows={2} value={form.observaciones} onChange={(e) => actualizar('observaciones', e.target.value)} placeholder="Novedades o aclaraciones del corte" />
            </label>
          </div>

          <div className="rounded-xl bg-slate-50 p-4">
            <p className="text-sm text-slate-600">Diferencia preliminar, antes de registrar retiros</p>
            <p className={`mt-1 text-xl font-bold ${diferenciaPrevia === 0 ? 'text-green-700' : diferenciaPrevia > 0 ? 'text-amber-700' : 'text-red-700'}`}>
              {dinero(diferenciaPrevia)}
            </p>
            <p className="mt-1 text-xs text-slate-500">
              El resultado final se actualizará al sumar los retiros del corte.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <button disabled={guardando} className={`${boton} bg-blue-600 text-white hover:bg-blue-700`}>
              {guardando ? 'Guardando...' : editando ? 'Guardar cambios' : 'Guardar corte'}
            </button>
            <button type="button" className={`${boton} border border-slate-300 text-slate-700 hover:bg-slate-50`} onClick={limpiarFormulario}>
              Cancelar
            </button>
          </div>
        </form>
      )}

      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[
          { titulo: 'Ventas en efectivo', valor: resumen.ventas },
          { titulo: 'Efectivo recibido', valor: resumen.recibido },
          { titulo: 'Total de retiros', valor: resumen.retiros },
          { titulo: 'Diferencia acumulada', valor: resumen.diferencia },
        ].map((item) => (
          <div key={item.titulo} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <p className="text-sm text-slate-500">{item.titulo}</p>
            <p className="mt-2 text-xl font-bold text-slate-800">{dinero(item.valor)}</p>
          </div>
        ))}
      </section>

      <section className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div>
          <h2 className="text-lg font-semibold text-slate-800">Historial de cortes</h2>
          <p className="text-sm text-slate-500">Consulta los registros y revisa sus diferencias.</p>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <label className="space-y-1 text-sm text-slate-600">
            Buscar sede o responsable
            <input className={campo} value={busqueda} onChange={(e) => setBusqueda(e.target.value)} placeholder="Escribe para buscar" />
          </label>
          <label className="space-y-1 text-sm text-slate-600">
            Sede
            <select className={campo} value={filtroSede} onChange={(e) => setFiltroSede(e.target.value)}>
              <option value="">Todas las sedes</option>
              {sedes.map((sede) => <option key={sede.id} value={sede.id}>{sede.nombre}</option>)}
            </select>
          </label>
          <label className="space-y-1 text-sm text-slate-600">
            Desde
            <input className={campo} type="date" value={desde} onChange={(e) => setDesde(e.target.value)} />
          </label>
          <label className="space-y-1 text-sm text-slate-600">
            Hasta
            <input className={campo} type="date" value={hasta} onChange={(e) => setHasta(e.target.value)} />
          </label>
        </div>

        <div className="flex flex-wrap gap-2">
          <button type="button" className={`${boton} bg-slate-800 text-white hover:bg-slate-700`} onClick={() => void inicializar()}>
            Actualizar historial
          </button>
          <button type="button" className={`${boton} border border-slate-300 text-slate-700 hover:bg-slate-50`} onClick={() => { setFiltroSede(''); setDesde(''); setHasta(''); setBusqueda('') }}>
            Limpiar filtros
          </button>
          <button
            type="button"
            className={`${boton} bg-green-700 text-white hover:bg-green-800`}
            onClick={() => void descargarExcel()}
            disabled={cargando || cortesFiltrados.length === 0}
          >
            Descargar Excel
          </button>
        </div>

        {cargando ? (
          <p className="py-8 text-center text-sm text-slate-500">Cargando información...</p>
        ) : cortesFiltrados.length === 0 ? (
          <p className="py-8 text-center text-sm text-slate-500">No hay cortes para los filtros seleccionados.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1000px] border-collapse text-left text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-slate-600">
                  <th className="p-3">Sede / responsable</th>
                  <th className="p-3">Periodo</th>
                  <th className="p-3 text-right">Ventas SysCafé</th>
                  <th className="p-3 text-right">Recibido</th>
                  <th className="p-3 text-right">Retiros</th>
                  <th className="p-3 text-right">Diferencia</th>
                  <th className="p-3">Estado</th>
                  <th className="p-3">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {cortesFiltrados.map((corte) => {
                  const diferencia = Number(corte.diferencia || 0)
                  return (
                    <tr key={corte.id} className="border-b border-slate-100 hover:bg-slate-50">
                      <td className="p-3">
                        <p className="font-semibold text-slate-800">{corte.sede_nombre}</p>
                        <p className="text-xs text-slate-500">{corte.responsable_entrega}</p>
                      </td>
                      <td className="p-3 whitespace-nowrap">
                        {fechaCorta(corte.fecha_inicio)} – {fechaCorta(corte.fecha_fin)}
                      </td>
                      <td className="p-3 text-right">{dinero(corte.ventas_syscafe)}</td>
                      <td className="p-3 text-right">{dinero(corte.efectivo_recibido)}</td>
                      <td className="p-3 text-right">{dinero(corte.total_retiros)}</td>
                      <td className={`p-3 text-right font-semibold ${diferencia === 0 ? 'text-green-700' : diferencia > 0 ? 'text-amber-700' : 'text-red-700'}`}>
                        {dinero(diferencia)}
                      </td>
                      <td className="p-3">
                        <span className={`whitespace-nowrap rounded-full px-2 py-1 text-xs font-semibold ${diferencia === 0 ? 'bg-green-100 text-green-800' : diferencia > 0 ? 'bg-amber-100 text-amber-800' : 'bg-red-100 text-red-800'}`}>
                          {diferencia === 0 ? 'Cuadra' : diferencia > 0 ? 'Sobrante' : 'Faltante'}
                        </span>
                      </td>
                      <td className="p-3">
                        <div className="flex flex-wrap gap-2">
                          <button
                            type="button"
                            className="font-semibold text-blue-700 hover:underline"
                            onClick={() => void abrirRetiros(corte)}
                          >
                            Retiros
                          </button>

                          <button
                            type="button"
                            className="font-semibold text-slate-700 hover:underline"
                            onClick={() => editarCorte(corte)}
                          >
                            Editar
                          </button>

                          <button
                            type="button"
                            className="font-semibold text-red-700 hover:underline"
                            onClick={async () => {
                              if (!window.confirm(
                                `¿Eliminar el corte de ${corte.sede_nombre} del periodo ${fechaCorta(corte.fecha_inicio)} al ${fechaCorta(corte.fecha_fin)}?`
                              )) return

                              try {
                                setError('')
                                setMensaje('')

                                await peticion(`/api/control-efectivo/${corte.id}`, {
                                  method: 'DELETE',
                                })

                                if (corteActivo?.id === corte.id) {
                                  setCorteActivo(null)
                                  setRetiros([])
                                }

                                await cargarCortes()
                                setMensaje('Corte eliminado correctamente.')
                              } catch (e) {
                                setError(
                                  e instanceof Error
                                    ? e.message
                                    : 'No fue posible eliminar el corte.'
                                )
                              }
                            }}
                          >
                            Eliminar
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
        <p className="text-xs text-slate-500">
          Los totales corresponden a los cortes mostrados por los filtros de sede y fecha.
        </p>
      </section>

      {corteActivo && (
        <section className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold text-slate-800">Retiros de efectivo</h2>
              <p className="text-sm text-slate-500">
                {corteActivo.sede_nombre} · {fechaCorta(corteActivo.fecha_inicio)} – {fechaCorta(corteActivo.fecha_fin)}
              </p>
            </div>
            <button type="button" className={`${boton} border border-slate-300 text-slate-700`} onClick={() => setCorteActivo(null)}>
              Cerrar
            </button>
          </div>

          <form onSubmit={guardarRetiro} className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <label className="space-y-1 text-sm text-slate-600">
              Fecha *
              <input className={campo} type="date" value={retiroForm.fecha} onChange={(e) => setRetiroForm({ ...retiroForm, fecha: e.target.value })} required />
            </label>
            <label className="space-y-1 text-sm text-slate-600">
              Monto (COP) *
              <input className={campo} type="number" min="1" step="1" value={retiroForm.monto} onChange={(e) => setRetiroForm({ ...retiroForm, monto: e.target.value })} required />
            </label>
            <label className="space-y-1 text-sm text-slate-600">
              Retirado por *
              <input className={campo} value={retiroForm.retirado_por} onChange={(e) => setRetiroForm({ ...retiroForm, retirado_por: e.target.value })} required />
            </label>
            <label className="space-y-1 text-sm text-slate-600">
              Motivo *
              <input className={campo} value={retiroForm.motivo} onChange={(e) => setRetiroForm({ ...retiroForm, motivo: e.target.value })} required />
            </label>
            <label className="space-y-1 text-sm text-slate-600 sm:col-span-2">
              Detalle opcional
              <input className={campo} value={retiroForm.detalle} onChange={(e) => setRetiroForm({ ...retiroForm, detalle: e.target.value })} />
            </label>
            <div className="flex items-end">
              <button disabled={guardando} className={`${boton} bg-blue-600 text-white hover:bg-blue-700`}>
                {guardando ? 'Guardando...' : 'Registrar retiro'}
              </button>
            </div>
          </form>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[600px] border-collapse text-left text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-slate-600">
                  <th className="p-3">Fecha</th>
                  <th className="p-3">Monto</th>
                  <th className="p-3">Retirado por</th>
                  <th className="p-3">Motivo / detalle</th>
                  <th className="p-3">Acción</th>
                </tr>
              </thead>
              <tbody>
                {retiros.map((retiro) => (
                  <tr key={retiro.id} className="border-b border-slate-100">
                    <td className="p-3">{fechaCorta(retiro.fecha)}</td>
                    <td className="p-3 font-semibold">{dinero(retiro.monto)}</td>
                    <td className="p-3">{retiro.retirado_por}</td>
                    <td className="p-3">{retiro.motivo}{retiro.detalle ? ` · ${retiro.detalle}` : ''}</td>
                    <td className="p-3">
                      <button type="button" className="font-semibold text-red-700 hover:underline" onClick={() => void eliminarRetiro(retiro)}>Eliminar</button>
                    </td>
                  </tr>
                ))}
                {retiros.length === 0 && (
                  <tr><td colSpan={5} className="p-4 text-center text-slate-500">Este corte todavía no tiene retiros.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  )
}