import { useMemo, useState } from 'react'
import * as XLSX from 'xlsx'

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

export default function Reports() {
  const records: AttendanceRecord[] = JSON.parse(
    localStorage.getItem('attendanceRecords') || '[]'
  )

  const [selectedMonth, setSelectedMonth] = useState(
    new Date().getMonth() + 1
  )

  const [selectedYear, setSelectedYear] = useState(
    new Date().getFullYear()
  )

  const [selectedBranch, setSelectedBranch] = useState('Todas')

  const branches = Array.from(
    new Set(records.map(r => r.branch))
  )

  const filteredRecords = useMemo(() => {
    return records.filter(r => {
      // Tomamos la fecha directamente del texto para evitar
      // problemas de zona horaria con new Date("YYYY-MM-DD")
      const [year, month] = r.date.slice(0, 10).split('-')

      const monthOk =
        Number(month) === selectedMonth

      const yearOk =
        Number(year) === selectedYear

      const branchOk =
        selectedBranch === 'Todas' ||
        r.branch === selectedBranch

      return monthOk && yearOk && branchOk
    })
  }, [records, selectedMonth, selectedYear, selectedBranch])

  const summary = useMemo(() => {
    const map = new Map()

    filteredRecords.forEach(r => {
      if (!map.has(r.employee)) {
        map.set(r.employee, {
          employee: r.employee,
          branch: r.branch,
          days: 0,
          lateCount: 0,
          lateMinutes: 0,
          normalHours: 0,
          extraHours: 0,
          totalHours: 0,
        })
      }

      const item = map.get(r.employee)

      item.days += 1

      if (r.lateMinutes > 0) {
        item.lateCount += 1
        item.lateMinutes += r.lateMinutes
      }

      item.totalHours += r.paidHours
    })

    map.forEach(item => {
      item.normalHours = Math.min(item.totalHours, 210)
      item.extraHours = Math.max(item.totalHours - 210, 0)
    })

    return Array.from(map.values())
  }, [filteredRecords])

  const exportExcel = () => {
    const resumen = summary.map(r => ({
      Empleado: r.employee,
      Sede: r.branch,
      'Días trabajados': r.days,
      'Llegadas tarde': r.lateCount,
      'Minutos tarde': r.lateMinutes,
      'Horas normales': Number(r.normalHours.toFixed(2)),
      'Horas extra': Number(r.extraHours.toFixed(2)),
      'Total horas': Number(r.totalHours.toFixed(2)),
    }))

    const detalle = filteredRecords.map(r => ({
      Fecha: r.date,
      Empleado: r.employee,
      Sede: r.branch,
      Programado: r.scheduledStart,
      Real: r.realStart,
      'Min tarde': r.lateMinutes,
      Descuento: r.discount ? 'Sí' : 'No',
      'Horas pagar': r.paidHours,
    }))

    const wb = XLSX.utils.book_new()

    const wsResumen = XLSX.utils.json_to_sheet(resumen)
    const wsDetalle = XLSX.utils.json_to_sheet(detalle)

    XLSX.utils.book_append_sheet(wb, wsResumen, 'Resumen')
    XLSX.utils.book_append_sheet(wb, wsDetalle, 'Detalle')

    XLSX.writeFile(
      wb,
      `Reporte_${selectedBranch}_${selectedMonth}_${selectedYear}.xlsx`
    )
  }

  return (
    <div className="space-y-6">
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

      <div className="bg-white rounded-2xl border p-4 grid grid-cols-1 md:grid-cols-3 gap-4">
        <select
          value={selectedMonth}
          onChange={e =>
            setSelectedMonth(Number(e.target.value))
          }
          className="border rounded-xl px-4 py-3"
        >
          {Array.from({ length: 12 }, (_, i) => (
            <option key={i + 1} value={i + 1}>
              {new Date(2026, i, 1).toLocaleString(
                'es-CO',
                { month: 'long' }
              )}
            </option>
          ))}
        </select>

        <input
          type="number"
          value={selectedYear}
          onChange={e =>
            setSelectedYear(Number(e.target.value))
          }
          className="border rounded-xl px-4 py-3"
        />

        <select
          value={selectedBranch}
          onChange={e =>
            setSelectedBranch(e.target.value)
          }
          className="border rounded-xl px-4 py-3"
        >
          <option>Todas</option>
          {branches.map(branch => (
            <option key={branch} value={branch}>
              {branch}
            </option>
          ))}
        </select>
      </div>

      <div className="bg-white rounded-2xl border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-slate-600">
              <tr>
                <th className="text-left p-4">Empleado</th>
                <th className="text-left p-4">Sede</th>
                <th className="text-left p-4">Días</th>
                <th className="text-left p-4">Tardes</th>
                <th className="text-left p-4">Min tarde</th>
                <th className="text-left p-4">Normales</th>
                <th className="text-left p-4">Extras</th>
                <th className="text-left p-4">Pagar</th>
              </tr>
            </thead>

            <tbody>
              {summary.map(r => (
                <tr key={r.employee} className="border-t">
                  <td className="p-4 font-medium">
                    {r.employee}
                  </td>
                  <td className="p-4">{r.branch}</td>
                  <td className="p-4">{r.days}</td>
                  <td className="p-4">{r.lateCount}</td>
                  <td className="p-4">{r.lateMinutes}</td>
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
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}