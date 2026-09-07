import { useState, useEffect } from 'react'
import Employees from './pages/Employees'
import ShiftTypes from './pages/ShiftTypes'
import Calendar from './pages/Calendar'
import DeliveryCalendar from './pages/DeliveryCalendar'
import Attendance from './pages/Attendance'
import Reports from './pages/Reports'
import Dashboard from './pages/Dashboard'

export type Page =
  | 'dashboard'
  | 'employees'
  | 'shiftTypes'
  | 'turns'
  | 'deliveryCalendar'
  | 'attendance'
  | 'reports'

export type Employee = {
  id: number
  name: string
  document: string
  role: string
  username: string
  status: string
}

export type ShiftType = {
  id: number
  name: string
  hours: string
  start?: string
  end?: string
  isSplit?: boolean
  start2?: string
  end2?: string
  color?: string
}

export type Assignment = {
  id: number
  day: number
  month: number
  year: number
  branch: string
  employee: string
  shift: string
}

export default function App() {
  const [page, setPage] = useState<Page>('dashboard')
  
  // Estado para la sede seleccionada
  const [selectedBranch, setSelectedBranch] = useState<string>('PINOS')

  // Empleados
  const [employees, setEmployees] = useState<Employee[]>(() => {
    const saved = localStorage.getItem('employees')
    return saved ? JSON.parse(saved) : []
  })

  useEffect(() => {
    const loadEmployees = async () => {
      try {
        // Agregamos /api/empleados al final del enlace
        const response = await fetch('https://crm-rrhh-backend.onrender.com/api/empleados')

        if (!response.ok) {
          throw new Error('No se pudieron cargar los empleados')
        }

        const data = await response.json()

        if (Array.isArray(data) && data.length > 0) {
          const formattedEmployees: Employee[] = data.map((employee: any) => ({
            id: employee.id,
            name: employee.nombre,
            document: employee.documento || '',
            role: employee.cargo || '',
            username: employee.username || '',
            status: employee.estado || 'Activo',
          }))

          setEmployees(formattedEmployees)
        }
      } catch (error) {
        console.error('Error cargando empleados:', error)
      }
    }

    loadEmployees()
  }, [])

  // Cargar asignaciones y datos relacionados desde producción
  useEffect(() => {
    const loadProductionAssignments = async () => {
      try {
        const [
          employeesResponse,
          branchesResponse,
          shiftsResponse,
          assignmentsResponse,
        ] = await Promise.all([
          fetch('https://crm-rrhh-backend.onrender.com/api/empleados'),
          fetch('https://crm-rrhh-backend.onrender.com/api/sedes'),
          fetch('https://crm-rrhh-backend.onrender.com/api/tipos-turno'),
          fetch('https://crm-rrhh-backend.onrender.com/api/asignaciones'),
        ])

        if (
          !employeesResponse.ok ||
          !branchesResponse.ok ||
          !shiftsResponse.ok ||
          !assignmentsResponse.ok
        ) {
          throw new Error(
            'No se pudieron cargar todos los datos de producción'
          )
        }

        const employeesData = await employeesResponse.json()
        const branchesData = await branchesResponse.json()
        const shiftsData = await shiftsResponse.json()
        const assignmentsData = await assignmentsResponse.json()

        console.log('EMPLEADOS PRODUCCIÓN:', employeesData)
        console.log('SEDES PRODUCCIÓN:', branchesData)
        console.log('TURNOS PRODUCCIÓN:', shiftsData)
        console.log('ASIGNACIONES PRODUCCIÓN:', assignmentsData)

        const employeeMap = new Map(
          employeesData.map((employee: any) => [
            Number(employee.id),
            employee.nombre,
          ])
        )

        const branchMap = new Map(
          branchesData.map((branch: any) => [
            Number(branch.id),
            branch.nombre,
          ])
        )

        const shiftMap = new Map(
          shiftsData.map((shift: any) => [
            Number(shift.id),
            shift.nombre,
          ])
        )

        const formattedAssignments: Assignment[] =
          assignmentsData.map((assignment: any) => {
            const date = new Date(assignment.fecha)

            return {
              id: Number(assignment.id),
              day: date.getUTCDate(),
              month: date.getUTCMonth() + 1,
              year: date.getUTCFullYear(),
              branch:
                branchMap.get(Number(assignment.sede_id)) || '',
              employee:
                employeeMap.get(Number(assignment.empleado_id)) || '',
              shift:
                shiftMap.get(Number(assignment.turno_id)) || '',
            }
          })

        console.log(
          'ASIGNACIONES CONVERTIDAS:',
          formattedAssignments
        )

        setAssignments(formattedAssignments)
      } catch (error) {
        console.error(
          'Error cargando asignaciones de producción:',
          error
        )
      }
    }

    loadProductionAssignments()
  }, [])

  // Tipos de turno
  const [shiftTypes, setShiftTypes] = useState<ShiftType[]>(() => {
    const saved = localStorage.getItem('shiftTypes')
    return saved
      ? JSON.parse(saved)
      : [
          {
            id: 1,
            name: 'Mañana',
            hours: '8',
            start: '07:00',
            end: '15:00',
            color: 'bg-red-100 text-red-700',
          },
          {
            id: 2,
            name: 'Tarde',
            hours: '7',
            start: '15:00',
            end: '22:00',
            color: 'bg-red-100 text-red-700',
          },
          {
            id: 3,
            name: 'Descanso',
            hours: '0',
            color: 'bg-green-100 text-green-700',
          },
          {
            id: 4,
            name: 'Largo',
            hours: '15',
            start: '07:00',
            end: '22:00',
            color: 'bg-gray-200 text-gray-800',
          },
          {
            id: 5,
            name: 'Partido',
            hours: '10',
            start: '08:00',
            end: '13:00',
            isSplit: true,
            start2: '17:00',
            end2: '22:00',
            color: 'bg-red-100 text-red-700',
          },
          {
            id: 6,
            name: '7 a 2',
            hours: '7',
            start: '07:00',
            end: '14:00',
            color: 'bg-red-100 text-red-700',
          },
          {
            id: 7,
            name: '2 a 10',
            hours: '8',
            start: '14:00',
            end: '22:00',
            color: 'bg-red-100 text-red-700',
          },
          {
            id: 8,
            name: 'Noche',
            hours: '9',
            start: '22:00',
            end: '07:00',
            color: 'bg-red-100 text-red-700',
          },
          {
            id: 9,
            name: '8 a 4',
            hours: '8',
            start: '08:00',
            end: '16:00',
            color: 'bg-red-100 text-red-700',
          },
          {
            id: 10,
            name: '4 a 11',
            hours: '7',
            start: '16:00',
            end: '23:00',
            color: 'bg-red-100 text-red-700',
          },
          {
            id: 11,
            name: 'Largo domingo',
            hours: '15',
            start: '08:00',
            end: '23:00',
            color: 'bg-gray-200 text-gray-800',
          },
          {
            id: 12,
            name: '3 a 9',
            hours: '6',
            start: '15:00',
            end: '21:00',
            color: 'bg-red-100 text-red-700',
          },
          {
            id: 13,
            name: '2 a 9',
            hours: '7',
            start: '14:00',
            end: '21:00',
            color: 'bg-red-100 text-red-700',
          },
          {
            id: 14,
            name: 'Largo Zuluaga',
            hours: '14',
            start: '07:00',
            end: '21:00',
            color: 'bg-gray-200 text-gray-800',
          },
        ]
  })

  // Asignaciones de turnos
  const [assignments, setAssignments] = useState<Assignment[]>(() => {
    const saved = localStorage.getItem('assignments')

    if (saved) {
      try {
        const parsed = JSON.parse(saved)

        return parsed.map((assignment: any) => ({
          ...assignment,
          month:
            typeof assignment.month === 'number'
              ? assignment.month
              : 7,

          year:
            typeof assignment.year === 'number'
              ? assignment.year
              : 2026,
        }))
      } catch (error) {
        console.error('Error leyendo asignaciones:', error)
      }
    }

    return []
  })

  // Guardado automático en localStorage
  useEffect(() => {
    localStorage.setItem('employees', JSON.stringify(employees))
  }, [employees])

  useEffect(() => {
    localStorage.setItem('shiftTypes', JSON.stringify(shiftTypes))
  }, [shiftTypes])

  useEffect(() => {
    localStorage.setItem('assignments', JSON.stringify(assignments))
  }, [assignments])

  const updateEmployees = (
    update: React.SetStateAction<Employee[]>
  ) => {
    const newEmployees =
      typeof update === 'function'
        ? update(employees)
        : update

    // Detectar cambios de nombre
    employees.forEach((oldEmployee) => {
      const newEmployee = newEmployees.find(
        (emp) => emp.id === oldEmployee.id
      )

      if (
        newEmployee &&
        newEmployee.name !== oldEmployee.name
      ) {
        const oldName = oldEmployee.name
        const newName = newEmployee.name

        // Actualizar nombres en los turnos
        setAssignments((previousAssignments) =>
          previousAssignments.map((assignment) =>
            assignment.employee.trim() === oldName.trim()
              ? {
                  ...assignment,
                  employee: newName,
                }
              : assignment
          )
        )

        // Actualizar nombres en las asistencias
        const savedAttendance =
          localStorage.getItem('attendanceRecords')

        if (savedAttendance) {
          try {
            const attendance = JSON.parse(savedAttendance)

            const updatedAttendance = attendance.map(
              (record: any) =>
                record.employee === oldName
                  ? {
                      ...record,
                      employee: newName,
                    }
                  : record
            )

            localStorage.setItem(
              'attendanceRecords',
              JSON.stringify(updatedAttendance)
            )
          } catch (error) {
            console.error(
              'Error actualizando asistencias:',
              error
            )
          }
        }
      }
    })

    setEmployees(newEmployees)
  }

  return (
    <div className="min-h-screen bg-slate-50 flex">
      {/* Sidebar */}
      <aside className="w-64 bg-white border-r border-slate-200 p-4">
        <h1 className="text-2xl font-bold text-blue-700 mb-8">
          CRM RRHH
        </h1>

        <div className="space-y-2 mb-6">
          {/* Botón para Crear Respaldo */}
          <button
            onClick={() => {
              const backup = {
                employees,
                shiftTypes,
                assignments,
                attendance: JSON.parse(localStorage.getItem('attendanceRecords') || '[]'),
              }

              const blob = new Blob([JSON.stringify(backup, null, 2)], {
                type: 'application/json',
              })

              const url = URL.createObjectURL(blob)

              const a = document.createElement('a')
              a.href = url
              a.download = `respaldo_rrhh_${new Date().toISOString().slice(0, 10)}.json`
              a.click()

              URL.revokeObjectURL(url)
            }}
            className="w-full bg-slate-100 hover:bg-slate-200 text-slate-700 px-4 py-2 rounded-xl text-sm font-medium flex items-center justify-center gap-2 transition"
          >
            💾 Crear respaldo
          </button>

          {/* Botón para Restaurar Respaldo */}
          <label className="w-full bg-slate-100 hover:bg-slate-200 text-slate-700 px-4 py-2 rounded-xl text-sm font-medium flex items-center justify-center gap-2 cursor-pointer transition">
            📂 Restaurar respaldo
            <input
              type="file"
              accept=".json"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0]
                if (!file) return

                const confirmRestore = window.confirm(
                  '⚠️ ¿Estás seguro de que deseas restaurar este respaldo?\n\nEsta acción sobrescribirá todos los datos actuales de empleados, turnos y asistencias.'
                )

                if (!confirmRestore) {
                  e.target.value = ''
                  return
                }

                const reader = new FileReader()
                reader.onload = (event) => {
                  try {
                    const data = JSON.parse(event.target?.result as string)

                    if (data.employees) {
                      setEmployees(data.employees)
                      localStorage.setItem('employees', JSON.stringify(data.employees))
                    }
                    if (data.shiftTypes) {
                      setShiftTypes(data.shiftTypes)
                      localStorage.setItem('shiftTypes', JSON.stringify(data.shiftTypes))
                    }
                    if (data.assignments) {
                      setAssignments(data.assignments)
                      localStorage.setItem('assignments', JSON.stringify(data.assignments))
                    }
                    if (data.attendance) {
                      localStorage.setItem('attendanceRecords', JSON.stringify(data.attendance))
                    }

                    alert('¡Respaldo restaurado con éxito!')
                  } catch (error) {
                    alert('Error al leer el archivo JSON. Asegúrate de que sea un respaldo válido.')
                  }
                }

                reader.readAsText(file)
                e.target.value = ''
              }}
            />
          </label>
        </div>

        <nav className="space-y-2">
          <MenuButton
            label="Dashboard"
            active={page === 'dashboard'}
            onClick={() => setPage('dashboard')}
          />

          <MenuButton
            label="Empleados"
            active={page === 'employees'}
            onClick={() => setPage('employees')}
          />

          <MenuButton
            label="Tipos de turno"
            active={page === 'shiftTypes'}
            onClick={() => setPage('shiftTypes')}
          />

          <MenuButton
            label="Turnos"
            active={page === 'turns'}
            onClick={() => setPage('turns')}
          />

          <MenuButton
            label="Calendario Domiciliarios"
            active={page === 'deliveryCalendar'}
            onClick={() => setPage('deliveryCalendar')}
          />

          <MenuButton
            label="Asistencia"
            active={page === 'attendance'}
            onClick={() => setPage('attendance')}
          />

          <MenuButton
            label="Reportes"
            active={page === 'reports'}
            onClick={() => setPage('reports')}
          />
        </nav>
      </aside>

      {/* Main */}
      <main className="flex-1 p-6 overflow-auto">
        {page === 'dashboard' && (
          <Dashboard
            employees={employees}
            shiftTypes={shiftTypes}
            assignments={assignments}
            setPage={setPage}
            selectedBranch={selectedBranch}
            setSelectedBranch={setSelectedBranch}
          />
        )}

        {page === 'employees' && (
          <Employees
            employees={employees}
            setEmployees={updateEmployees}
          />
        )}

        {page === 'shiftTypes' && (
          <ShiftTypes
            shiftTypes={shiftTypes}
            setShiftTypes={setShiftTypes}
          />
        )}

        {page === 'turns' && (
          <Calendar
            assignments={assignments}
            setAssignments={setAssignments}
            employees={employees}
            shiftTypes={shiftTypes}
            selectedBranch={selectedBranch}
            setSelectedBranch={setSelectedBranch}
          />
        )}

        {page === 'deliveryCalendar' && (
          <DeliveryCalendar
            employees={employees}
            shiftTypes={shiftTypes}
          />
        )}

        {page === 'attendance' && (
          <Attendance
            assignments={assignments}
            shiftTypes={shiftTypes}
            employees={employees}
          />
        )}

        {page === 'reports' && (
          <Reports
            assignments={assignments}
            shiftTypes={shiftTypes}
          />
        )}
      </main>
    </div>
  )
}

function MenuButton({
  label,
  active,
  onClick,
}: {
  label: string
  active: boolean
  onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      className={`w-full text-left px-4 py-3 rounded-xl transition ${
        active
          ? 'bg-blue-50 text-blue-700 font-medium'
          : 'hover:bg-slate-100 text-slate-700'
      }`}
    >
      {label}
    </button>
  )
}