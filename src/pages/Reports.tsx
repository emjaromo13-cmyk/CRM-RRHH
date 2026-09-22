import {
  useEffect,
  useMemo,
  useState,
} from 'react'
import * as XLSX from 'xlsx'

type Assignment = {
  id: number
  day: number
  month: number
  year: number
  branch: string
  employee: string
  shift: string
}

type ShiftType = {
  id: number
  name: string
  start?: string
  end?: string
  isSplit?: boolean
  start2?: string
  end2?: string
}

type AttendanceRecord = {
  id: number
  employee: string
  branch: string
  date: string
  scheduledStart: string
  realStart: string
  lateMinutes: number
  discount: boolean
  paidHours: number
}
const API_URL = (
  import.meta.env.VITE_API_URL ||
  'https://crm-rrhh-backend.onrender.com'
).replace(/\/$/, '')

type ReportsProps = {
  assignments: Assignment[]
  shiftTypes: ShiftType[]
}

function calculateHours(
  start?: string,
  end?: string,
  start2?: string,
  end2?: string
) {
  if (!start || !end) return 0

  const getMinutes = (time: string) => {
    const [hours, minutes] = time.split(':').map(Number)
    return hours * 60 + minutes
  }

  let total =
    getMinutes(end) - getMinutes(start)

  if (start2 && end2) {
    total +=
      getMinutes(end2) -
      getMinutes(start2)
  }

  // Turnos que pasan de medianoche
  if (total < 0) {
    total += 24 * 60
  }

  return total / 60
}

export default function Reports({
  assignments,
  shiftTypes,
}: ReportsProps) {

    const [records, setRecords] =
    useState<AttendanceRecord[]>([])

  useEffect(() => {
    const cargarAsistencias = async () => {
      try {
        const token = localStorage.getItem('token')

        if (!token) {
          console.error('Sesión no encontrada.')
          return
        }

        const response = await fetch(
          `${API_URL}/api/asistencias`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        )

        if (!response.ok) {
          throw new Error(
            'No se pudieron cargar las asistencias.'
          )
        }

        const data = await response.json()

        const mappedRecords: AttendanceRecord[] =
          data.map((record: any) => ({
            id: Number(record.id),
            employee:
              record.empleado ||
              record.employee ||
              '',
            branch:
              record.sede ||
              record.branch ||
              '',
            date: String(
              record.fecha ||
              record.date ||
              ''
            ).slice(0, 10),
            scheduledStart:
              record.hora_programada ||
              record.scheduledStart ||
              '',
            realStart:
              record.hora_entrada ||
              record.realStart ||
              '',
            lateMinutes: Number(
              record.minutos_tarde ||
              record.lateMinutes ||
              0
            ),
            discount:
              Boolean(
                record.descuento ??
                record.discount ??
                false
              ),
            paidHours: Number(
              record.horas_pagadas ||
              record.paidHours ||
              0
            ),
          }))

        setRecords(mappedRecords)
      } catch (error) {
        console.error(
          'Error cargando asistencias:',
          error
        )
      }
    }

    cargarAsistencias()
  }, [])

  const [selectedMonth, setSelectedMonth] =
    useState(
      new Date().getMonth()
    )

  const [selectedYear, setSelectedYear] =
    useState(
      new Date().getFullYear()
    )

  const [selectedBranch, setSelectedBranch] =
    useState('Todas')

  // ============================================================
  // MAPA DE HORAS POR TIPO DE TURNO
  // ============================================================

  const shiftHours = useMemo(() => {

    const hoursMap: Record<string, number> = {}

    shiftTypes.forEach(shift => {

      if (shift.start && shift.end) {

        hoursMap[shift.name] =
          calculateHours(
            shift.start,
            shift.end,
            shift.start2,
            shift.end2
          )
      }
    })

    return hoursMap

  }, [shiftTypes])

  // ============================================================
  // HORAS DE RESPALDO
  // ============================================================

  const getShiftHoursFallback = (
    shiftName: string
  ) => {

    if (
      shiftHours[shiftName] !== undefined
    ) {
      return shiftHours[shiftName]
    }

    const shift =
      shiftName.toLowerCase()

    if (shift === 'descanso') return 0

    if (shift.includes('mañ')) return 8

    if (shift.includes('tarde')) return 7

    if (shift.includes('largo')) return 15

    return 0
  }

  // ============================================================
  // SEDES
  // ============================================================

  const branches = Array.from(
    new Set(
      assignments.map(a => a.branch)
    )
  )

  // ============================================================
  // ASIGNACIONES DEL MES Y AÑO
  // ============================================================

  const assignmentsForSelectedPeriod =
    useMemo(() => {

      return assignments.filter(
        a =>
          a.month === selectedMonth &&
          a.year === selectedYear
      )

    }, [
      assignments,
      selectedMonth,
      selectedYear,
    ])

  // ============================================================
  // REGISTROS DE ASISTENCIA DEL MES
  // ============================================================

  const filteredAttendanceRecords =
    useMemo(() => {

      return records.filter(r => {

        if (!r.date) return false

        const parts =
          r.date
            .slice(0, 10)
            .split('-')

        if (parts.length !== 3) {
          return false
        }

        const year =
          Number(parts[0])

        const month =
          Number(parts[1]) - 1

        const monthOk =
          month === selectedMonth

        const yearOk =
          year === selectedYear

        const branchOk =
          selectedBranch === 'Todas' ||
          r.branch === selectedBranch

        return (
          monthOk &&
          yearOk &&
          branchOk
        )
      })

    }, [
      records,
      selectedMonth,
      selectedYear,
      selectedBranch,
    ])

  // ============================================================
  // ASIGNACIONES FILTRADAS POR SEDE
  // ============================================================

  const filteredAssignments =
    useMemo(() => {

      return assignmentsForSelectedPeriod.filter(
        a =>
          selectedBranch === 'Todas' ||
          a.branch === selectedBranch
      )

    }, [
      assignmentsForSelectedPeriod,
      selectedBranch,
    ])

  // ============================================================
  // RESUMEN POR EMPLEADO
  // ============================================================

  const summary = useMemo(() => {

    const map = new Map<
      string,
      {
        employee: string
        branches: Set<string>
        days: Set<string>
        lateCount: number
        lateMinutes: number
        normalHours: number
        extraHours: number
        totalHours: number
      }
    >()

    // ==========================================================
    // 1. SUMAR HORAS DESDE LAS ASIGNACIONES
    // ==========================================================

    filteredAssignments.forEach(a => {

      if (!map.has(a.employee)) {

        map.set(a.employee, {
          employee: a.employee,
          branches: new Set<string>(),
          days: new Set<string>(),
          lateCount: 0,
          lateMinutes: 0,
          normalHours: 0,
          extraHours: 0,
          totalHours: 0,
        })
      }

      const item =
        map.get(a.employee)!

      // Registrar sede
      item.branches.add(a.branch)

      // Contar días trabajados únicos
      if (
        a.shift.toLowerCase() !==
        'descanso'
      ) {

        const dateKey =
          `${a.year}-${a.month}-${a.day}`

        item.days.add(dateKey)
      }

      // Obtener horas del turno
      const hours =
        getShiftHoursFallback(
          a.shift
        )

      // Sumar horas
      item.totalHours += hours
    })

    // ==========================================================
    // 2. SUMAR TARDANZAS DESDE ASISTENCIA
    // ==========================================================

    filteredAttendanceRecords.forEach(r => {

      const item =
        map.get(r.employee)

      if (!item) return

      const lateMinutes =
        Number(
          r.lateMinutes || 0
        )

      if (lateMinutes > 0) {

        item.lateCount += 1

        item.lateMinutes +=
          lateMinutes
      }
    })

    // ==========================================================
    // 3. CALCULAR HORAS NORMALES Y EXTRAS
    // ==========================================================

    map.forEach(item => {

      item.normalHours =
        Math.min(
          item.totalHours,
          210
        )

      item.extraHours =
        Math.max(
          item.totalHours - 210,
          0
        )
    })

    return Array.from(
      map.values()
    ).map(item => ({

      ...item,

      days:
        item.days.size,

      branch:
        Array.from(
          item.branches
        ).join(' + '),

    }))

  }, [
    filteredAssignments,
    filteredAttendanceRecords,
    shiftHours,
  ])

  // ============================================================
  // EXPORTAR EXCEL
  // ============================================================

  const exportExcel = () => {

    // ==========================================================
    // RESUMEN
    // ==========================================================

    const resumen =
      summary.map(r => ({

        Empleado:
          r.employee,

        Sede:
          r.branch,

        'Días trabajados':
          r.days,

        'Llegadas tarde':
          r.lateCount,

        'Minutos tarde':
          r.lateMinutes,

        'Horas normales':
          Number(
            r.normalHours.toFixed(2)
          ),

        'Horas extra':
          Number(
            r.extraHours.toFixed(2)
          ),

        'Total horas':
          Number(
            r.totalHours.toFixed(2)
          ),

      }))

    // ==========================================================
    // DETALLE DE ASIGNACIONES
    // ==========================================================

    const detalle =
      filteredAssignments.map(a => {

        const shift =
          shiftTypes.find(
            s =>
              s.name === a.shift
          )

        const hours =
          getShiftHoursFallback(
            a.shift
          )

        const fecha =
          `${a.year}-${String(
            a.month + 1
          ).padStart(2, '0')}-${String(
            a.day
          ).padStart(2, '0')}`

        // ======================================================
        // BUSCAR ASISTENCIA CORRESPONDIENTE
        // ======================================================

        const attendance =
          filteredAttendanceRecords.find(r => {

            if (
              r.employee !==
              a.employee
            ) {
              return false
            }

            if (
              r.branch !==
              a.branch
            ) {
              return false
            }

            const attendanceDate =
              r.date.slice(0, 10)

            return (
              attendanceDate ===
              fecha
            )
          })

        // ======================================================
        // DETERMINAR SI LLEGÓ TARDE
        // ======================================================

        const llegada =
          attendance &&
          Number(
            attendance.lateMinutes || 0
          ) > 0
            ? 'Llegada tarde'
            : 'Puntual'

        // ======================================================
        // FILA DEL DETALLE
        // ======================================================

        return {

          Fecha:
            fecha,

          Empleado:
            a.employee,

          Sede:
            a.branch,

          Turno:
            a.shift,

          'Hora inicio':
            shift?.start || '',

          'Hora fin':
            shift?.end || '',

          'Horas programadas':
            Number(
              hours.toFixed(2)
            ),

          Llegada:
            llegada,

        }
      })

    // ==========================================================
    // LIBRO EXCEL
    // ==========================================================

    const wb =
      XLSX.utils.book_new()

    const wsResumen =
      XLSX.utils.json_to_sheet(
        resumen
      )

    const wsDetalle =
      XLSX.utils.json_to_sheet(
        detalle
      )

    // ==========================================================
    // COLUMNAS RESUMEN
    // ==========================================================

    wsResumen['!cols'] = [

      { wch: 30 },

      { wch: 40 },

      { wch: 18 },

      { wch: 18 },

      { wch: 18 },

      { wch: 18 },

      { wch: 16 },

      { wch: 16 },

    ]

    // ==========================================================
    // COLUMNAS DETALLE
    // ==========================================================

    wsDetalle['!cols'] = [

      { wch: 15 },

      { wch: 30 },

      { wch: 20 },

      { wch: 25 },

      { wch: 20 },

      { wch: 20 },

      { wch: 20 },

      { wch: 20 },

    ]

    // ==========================================================
    // AGREGAR HOJAS
    // ==========================================================

    XLSX.utils.book_append_sheet(
      wb,
      wsResumen,
      'Resumen'
    )

    XLSX.utils.book_append_sheet(
      wb,
      wsDetalle,
      'Detalle'
    )

    // ==========================================================
    // DESCARGAR EXCEL
    // ==========================================================

    XLSX.writeFile(
      wb,
      `Reporte_${selectedBranch}_${selectedMonth + 1}_${selectedYear}.xlsx`
    )
  }

  // ============================================================
  // INTERFAZ
  // ============================================================

  return (

    <div className="space-y-6">

      {/* ENCABEZADO */}

      <div className="flex items-center justify-between">

        <div>

          <h2 className="text-3xl font-bold">
            Reporte mensual
          </h2>

          <p className="text-slate-500">
            Resumen de asistencia y horas para nómina
          </p>

        </div>

        <button
          onClick={exportExcel}
          className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-xl font-medium"
        >
          📥 Excel Nómina
        </button>

      </div>

      {/* FILTROS */}

      <div className="bg-white rounded-2xl border p-4 grid grid-cols-1 md:grid-cols-3 gap-4">

        {/* MES */}

        <select
          value={selectedMonth}
          onChange={e =>
            setSelectedMonth(
              Number(
                e.target.value
              )
            )
          }
          className="border rounded-xl px-4 py-3"
        >

          {Array.from(
            { length: 12 },
            (_, i) => (

              <option
                key={i}
                value={i}
              >

                {new Date(
                  2026,
                  i,
                  1
                ).toLocaleString(
                  'es-CO',
                  {
                    month: 'long',
                  }
                )}

              </option>

            )
          )}

        </select>

        {/* AÑO */}

        <input
          type="number"
          value={selectedYear}
          onChange={e =>
            setSelectedYear(
              Number(
                e.target.value
              )
            )
          }
          className="border rounded-xl px-4 py-3"
        />

        {/* SEDE */}

        <select
          value={selectedBranch}
          onChange={e =>
            setSelectedBranch(
              e.target.value
            )
          }
          className="border rounded-xl px-4 py-3"
        >

          <option value="Todas">
            Todas
          </option>

          {branches.map(
            branch => (

              <option
                key={branch}
                value={branch}
              >
                {branch}
              </option>

            )
          )}

        </select>

      </div>

      {/* TABLA */}

      <div className="bg-white rounded-2xl border overflow-hidden">

        <div className="overflow-x-auto">

          <table className="w-full text-sm">

            <thead className="bg-slate-50 text-slate-600">

              <tr>

                <th className="text-left p-4">
                  Empleado
                </th>

                <th className="text-left p-4">
                  Sede(s)
                </th>

                <th className="text-left p-4">
                  Días
                </th>

                <th className="text-left p-4">
                  Tardanzas
                </th>

                <th className="text-left p-4">
                  Min tarde
                </th>

                <th className="text-left p-4">
                  Normales
                </th>

                <th className="text-left p-4">
                  Extras
                </th>

                <th className="text-left p-4">
                  Total horas
                </th>

              </tr>

            </thead>

            <tbody>

              {summary.map(
                r => (

                  <tr
                    key={r.employee}
                    className="border-t"
                  >

                    <td className="p-4 font-medium">
                      {r.employee}
                    </td>

                    <td className="p-4">
                      {r.branch}
                    </td>

                    <td className="p-4">
                      {r.days}
                    </td>

                    <td className="p-4">
                      {r.lateCount}
                    </td>

                    <td className="p-4">
                      {r.lateMinutes}
                    </td>

                    <td className="p-4">
                      {r.normalHours.toFixed(2)}
                    </td>

                    <td className="p-4">
                      {r.extraHours.toFixed(2)}
                    </td>

                    <td className="p-4 font-semibold">
                      {r.totalHours.toFixed(2)}
                    </td>

                  </tr>

                )
              )}

            </tbody>

          </table>

        </div>

      </div>

    </div>
  )
}