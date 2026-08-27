import React, { useMemo, useState } from 'react'

type Employee = {
  id: number
  name: string
  document?: string
  role?: string
  username: string
  status: string
}

type ShiftType = {
  id: number
  name: string
  start?: string
  end?: string
  isSplit?: boolean
  start2?: string
  end2?: string
  color?: string
}

type Assignment = {
  id: number
  day: number
  branch: string
  employee: string
  shift: string
}

type Page =
  | 'dashboard'
  | 'employees'
  | 'shiftTypes'
  | 'turns'
  | 'attendance'
  | 'reports'

type DashboardProps = {
  employees: Employee[]
  assignments: Assignment[]
  shiftTypes: ShiftType[]
  setPage: React.Dispatch<React.SetStateAction<Page>>
  selectedBranch?: string
  setSelectedBranch?: (branch: string) => void
}

const BRANCHES = [
  'PINOS',
  'GUALANDAY',
  'LIMONAR',
  'BAMBU',
  'MANZANARES',
  'RIVERA',
  'GIGANTE',
  'MIRA RIO',
  'CAÑA BRAVA',
  'BUGANVILES',
  'ZULUAGA',
  'IPANEMA',
]

const MONTHS = [
  'Enero',
  'Febrero',
  'Marzo',
  'Abril',
  'Mayo',
  'Junio',
  'Julio',
  'Agosto',
  'Septiembre',
  'Octubre',
  'Noviembre',
  'Diciembre',
]

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

  let total = getMinutes(end) - getMinutes(start)

  if (start2 && end2) {
    total += getMinutes(end2) - getMinutes(start2)
  }

  if (total < 0) {
    total += 24 * 60
  }

  return total / 60
}

export default function Dashboard({
  employees,
  assignments,
  shiftTypes,
  setPage,
  selectedBranch: externalSelectedBranch,
  setSelectedBranch: externalSetSelectedBranch,
}: DashboardProps) {
  const [internalSelectedBranch, setInternalSelectedBranch] = useState('RIVERA')

  const selectedBranch = externalSelectedBranch ?? internalSelectedBranch
  const handleSelectBranch = externalSetSelectedBranch ?? setInternalSelectedBranch

  const [selectedDate] = useState(new Date())

  const selectedMonth = selectedDate.getMonth()
  const selectedYear = selectedDate.getFullYear()
  const currentMonth = MONTHS[selectedMonth]

  const activeEmployees = useMemo(
    () => employees.filter((e) => e.status?.toLowerCase() === 'activo'),
    [employees]
  )

  // Mapa de horas por tipo de turno
  const shiftHours = useMemo(() => {
    const hoursMap: Record<string, number> = {}

    shiftTypes.forEach((shift) => {
      if (shift.start && shift.end) {
        hoursMap[shift.name] = calculateHours(
          shift.start,
          shift.end,
          shift.start2,
          shift.end2
        )
      }
    })

    return hoursMap
  }, [shiftTypes])

  // Estimación de contingencia
  const getShiftHoursFallback = (shiftName: string) => {
    if (shiftHours[shiftName] !== undefined) return shiftHours[shiftName]
    const shift = shiftName.toLowerCase()
    if (shift === 'descanso') return 0
    if (shift.includes('mañ')) return 8
    if (shift.includes('tarde')) return 7
    if (shift.includes('largo')) return 15
    return 0
  }

  // Horas por empleado
  const employeeHours = useMemo(() => {
    const result: Record<string, number> = {}

    assignments.forEach((a) => {
      const hours = getShiftHoursFallback(a.shift)
      result[a.employee] = (result[a.employee] || 0) + hours
    })

    return result
  }, [assignments, shiftHours])

  const totalHours = useMemo(
    () => Object.values(employeeHours).reduce((sum, h) => sum + h, 0),
    [employeeHours]
  )

  const totalOvertime = useMemo(
    () =>
      Object.values(employeeHours).reduce(
        (sum, h) => sum + Math.max(0, h - 210),
        0
      ),
    [employeeHours]
  )

  const employeesWithOvertime = useMemo(
    () =>
      activeEmployees
        .map((employee) => {
          const hours = employeeHours[employee.name] || 0
          return {
            ...employee,
            hours,
            overtime: Math.max(0, hours - 210),
          }
        })
        .filter((emp) => emp.overtime > 0)
        .sort((a, b) => b.overtime - a.overtime),
    [activeEmployees, employeeHours]
  )

  // Funciones de consulta por sede
  const getHoursByBranch = (branch: string) => {
    return assignments
      .filter((a) => a.branch === branch)
      .reduce((total, a) => total + getShiftHoursFallback(a.shift), 0)
  }

  const getTurnsByBranch = (branch: string) =>
    assignments.filter((a) => a.branch === branch).length

  const getEmployeesByBranchCount = (branch: string) => {
    const names = assignments
      .filter((a) => a.branch === branch)
      .map((a) => a.employee)
    return new Set(names).size
  }

  const getExtraHoursByBranch = (branch: string) => {
    const branchAssignments = assignments.filter((a) => a.branch === branch)
    const empHours: Record<string, number> = {}

    branchAssignments.forEach((a) => {
      const hours = getShiftHoursFallback(a.shift)
      empHours[a.employee] = (empHours[a.employee] || 0) + hours
    })

    return Object.values(empHours).reduce((total, h) => {
      return total + Math.max(0, h - 210)
    }, 0)
  }

  const getBranchEmployees = (branch: string) => {
    const branchAssignments = assignments.filter((a) => a.branch === branch)
    const uniqueNames = Array.from(
      new Set(branchAssignments.map((a) => a.employee))
    )

    return uniqueNames.map((name) => {
      const emp = employees.find((e) => e.name === name)
      const lastAssignment = [...branchAssignments]
        .reverse()
        .find((a) => a.employee === name)

      return {
        name,
        username: emp?.username || 'N/A',
        shift: lastAssignment?.shift || 'N/A',
      }
    })
  }

  return (
    <div className="space-y-6">
      {/* Encabezado */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-800">Dashboard RRHH</h1>
          <p className="text-slate-500 mt-1">
            Resumen general del personal y turnos
          </p>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl px-4 py-3">
          <p className="text-xs text-slate-400 uppercase font-semibold">
            Periodo
          </p>
          <p className="text-lg font-bold text-slate-700 capitalize">
            {currentMonth} {selectedYear}
          </p>
        </div>
      </div>

      {/* Tarjetas Principales */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <DashboardCard
          title="Empleados activos"
          value={activeEmployees.length.toString()}
          subtitle={`De ${employees.length} registrados`}
          icon="👥"
        />
        <DashboardCard
          title="Horas programadas"
          value={`${totalHours.toFixed(1)} h`}
          subtitle={`${assignments.length} turnos`}
          icon="⏱️"
        />
        <DashboardCard
          title="Horas extra"
          value={`${totalOvertime.toFixed(1)} h`}
          subtitle="Sobre 210 horas"
          icon="⚡"
          highlight={totalOvertime > 0}
        />
        <DashboardCard
          title="Tardanzas"
          value="0"
          subtitle="Registros del periodo"
          icon="🕐"
        />
        <DashboardCard
          title="Sedes"
          value={BRANCHES.length.toString()}
          subtitle="Sedes configuradas"
          icon="🏢"
        />
      </div>

      {/* Horas por Sede y Detalle */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Lista de sedes */}
        <div className="bg-white rounded-3xl border border-slate-200 p-4 space-y-3 max-h-[600px] overflow-y-auto">
          <div className="flex items-center justify-between mb-2 px-2">
            <h3 className="text-lg font-bold text-slate-800">Sedes</h3>
            <span className="text-xs font-semibold text-slate-400 bg-slate-100 px-2.5 py-1 rounded-full">
              {BRANCHES.length}
            </span>
          </div>

          {BRANCHES.map((branch) => {
            const isSelected = selectedBranch === branch
            const empCount = getEmployeesByBranchCount(branch)
            const branchHrs = getHoursByBranch(branch)

            return (
              <button
                key={branch}
                onClick={() => handleSelectBranch(branch)}
                className={`w-full text-left p-4 rounded-2xl border transition-all ${
                  isSelected
                    ? 'border-blue-500 bg-blue-50 shadow-sm'
                    : 'border-slate-200 hover:bg-slate-50'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-semibold text-slate-800">{branch}</div>
                    <div className="text-sm text-slate-500">
                      {empCount} empleados
                    </div>
                  </div>
                  <div className="font-bold text-slate-700">{branchHrs} h</div>
                </div>
              </button>
            )
          })}
        </div>

        {/* Detalle de la sede seleccionada */}
        <div className="lg:col-span-2 bg-white rounded-3xl border border-slate-200 p-6 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-2xl font-bold text-slate-800">
                  {selectedBranch}
                </h3>
                <p className="text-slate-500">Resumen de la sede</p>
              </div>

              <div className="text-right">
                <div className="text-xs text-slate-400 uppercase font-semibold">
                  Período
                </div>
                <div className="font-semibold text-slate-700 capitalize">
                  {currentMonth} {selectedYear}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <div className="rounded-2xl border border-slate-200 p-4 bg-slate-50">
                <div className="text-xs text-slate-500 uppercase font-semibold">
                  Horas
                </div>
                <div className="text-3xl font-bold text-slate-800 mt-1">
                  {getHoursByBranch(selectedBranch)} h
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 p-4 bg-slate-50">
                <div className="text-xs text-slate-500 uppercase font-semibold">
                  Turnos
                </div>
                <div className="text-3xl font-bold text-slate-800 mt-1">
                  {getTurnsByBranch(selectedBranch)}
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 p-4 bg-slate-50">
                <div className="text-xs text-slate-500 uppercase font-semibold">
                  Horas extra
                </div>
                <div className="text-3xl font-bold text-orange-600 mt-1">
                  {getExtraHoursByBranch(selectedBranch)} h
                </div>
              </div>
            </div>

            <div className="space-y-3 mb-6 max-h-64 overflow-y-auto pr-1">
              {getBranchEmployees(selectedBranch).map((emp) => (
                <div
                  key={emp.name}
                  className="flex items-center justify-between p-4 rounded-2xl border border-slate-100 bg-slate-50"
                >
                  <div>
                    <div className="font-semibold text-slate-800">
                      {emp.name}
                    </div>
                    <div className="text-xs text-slate-400">
                      @{emp.username}
                    </div>
                  </div>
                </div>
              ))}

              {getBranchEmployees(selectedBranch).length === 0 && (
                <div className="text-center py-12 text-slate-400 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                  No hay empleados asignados a esta sede.
                </div>
              )}
            </div>
          </div>

          {/* 👇 PASO 3: BOTÓN DE TURNOS ÚNICO */}
          <div className="flex gap-3">
            <button
              onClick={() => setPage('turns')}
              className="bg-blue-600 text-white px-4 py-2 rounded-xl"
            >
              🗓️ Ver turnos
            </button>
          </div>
        </div>
      </div>

      {/* Empleados con horas extra */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5">
        <div className="flex items-center justify-between mb-5">
          <div>
            <h2 className="text-lg font-bold text-slate-800">
              Empleados con horas extra
            </h2>
            <p className="text-sm text-slate-400">
              Empleados que superan las 210 horas mensuales
            </p>
          </div>

          <span className="bg-orange-50 text-orange-600 px-3 py-1 rounded-full text-xs font-semibold">
            {employeesWithOvertime.length} para revisar
          </span>
        </div>

        {employeesWithOvertime.length === 0 ? (
          <div className="text-center py-10">
            <div className="text-4xl mb-3">✅</div>
            <p className="font-semibold text-slate-700">No hay horas extra</p>
            <p className="text-sm text-slate-400">
              Ningún empleado supera las 210 horas.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-100 text-left">
                  <th className="pb-3 text-xs uppercase text-slate-400 font-semibold">
                    Empleado
                  </th>
                  <th className="pb-3 text-xs uppercase text-slate-400 font-semibold">
                    Usuario
                  </th>
                  <th className="pb-3 text-xs uppercase text-slate-400 font-semibold">
                    Horas
                  </th>
                  <th className="pb-3 text-xs uppercase text-slate-400 font-semibold">
                    Horas extra
                  </th>
                </tr>
              </thead>
              <tbody>
                {employeesWithOvertime.map((employee) => (
                  <tr
                    key={employee.id}
                    className="border-b border-slate-50 last:border-0"
                  >
                    <td className="py-4">
                      <div className="font-semibold text-slate-700">
                        {employee.name}
                      </div>
                      {employee.role && (
                        <div className="text-xs text-slate-400">
                          {employee.role}
                        </div>
                      )}
                    </td>
                    <td className="py-4">
                      <span className="bg-slate-100 px-2.5 py-1 rounded-lg text-sm font-medium text-slate-600">
                        {employee.username}
                      </span>
                    </td>
                    <td className="py-4 font-semibold text-slate-700">
                      {employee.hours.toFixed(1)} h
                    </td>
                    <td className="py-4">
                      <span className="bg-orange-50 text-orange-600 px-3 py-1 rounded-lg font-bold text-sm">
                        +{employee.overtime.toFixed(1)} h
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Tarjetas de Información */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <InfoCard
          title="Control de horas"
          description="Las horas extra se calculan automáticamente después de superar las 210 horas mensuales."
          icon="⏱️"
        />
        <InfoCard
          title="Control por sede"
          description="Consulta rápidamente qué sedes tienen mayor cantidad de horas programadas."
          icon="🏢"
        />
        <InfoCard
          title="Seguimiento"
          description="El Dashboard se actualiza automáticamente cuando modificas empleados o turnos."
          icon="📊"
        />
      </div>
    </div>
  )
}

function DashboardCard({
  title,
  value,
  subtitle,
  icon,
  highlight = false,
}: {
  title: string
  value: string
  subtitle: string
  icon: string
  highlight?: boolean
}) {
  return (
    <div
      className={`bg-white border rounded-2xl p-5 ${
        highlight ? 'border-orange-200' : 'border-slate-200'
      }`}
    >
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-slate-500">{title}</p>
          <p className="text-2xl font-bold text-slate-800 mt-2">{value}</p>
          <p className="text-xs text-slate-400 mt-1">{subtitle}</p>
        </div>

        <div
          className={`w-11 h-11 rounded-xl flex items-center justify-center text-xl ${
            highlight ? 'bg-orange-50' : 'bg-blue-50'
          }`}
        >
          {icon}
        </div>
      </div>
    </div>
  )
}

function InfoCard({
  title,
  description,
  icon,
}: {
  title: string
  description: string
  icon: string
}) {
  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-5">
      <div className="flex items-center gap-3 mb-3">
        <div className="w-10 h-10 bg-slate-100 rounded-xl flex items-center justify-center">
          {icon}
        </div>
        <h3 className="font-bold text-slate-700">{title}</h3>
      </div>
      <p className="text-sm text-slate-500 leading-relaxed">{description}</p>
    </div>
  )
}