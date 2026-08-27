import { useState, useEffect } from 'react'
import Employees from './pages/Employees'
import ShiftTypes from './pages/ShiftTypes'
import Calendar from './pages/Calendar'
import Attendance from './pages/Attendance'
import Reports from './pages/Reports'
import Dashboard from './pages/Dashboard'

export type Page =
  | 'dashboard'
  | 'employees'
  | 'shiftTypes'
  | 'turns'
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
  branch: string
  employee: string
  shift: string
}

export default function App() {
  const [page, setPage] = useState<Page>('dashboard')
  
  // Estado para la sede seleccionada
  const [selectedBranch, setSelectedBranch] = useState<string>('PINOS')

  // Empleados (Inicialización con localStorage)
  const [employees, setEmployees] = useState<Employee[]>(() => {
    const saved = localStorage.getItem('employees')
    return saved
      ? JSON.parse(saved)
      : [
          {
            id: 1,
            name: 'María Paula',
            document: '1075123456',
            role: 'Auxiliar',
            username: 'M42',
            status: 'Activo',
          },
          {
            id: 2,
            name: 'Juan Carlos',
            document: '1088123456',
            role: 'Cajero',
            username: 'M42',
            status: 'Activo',
          },
        ]
  })

  // Tipos de turno (Inicialización con la estructura detallada)
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

  // Asignaciones de turnos (Inicialización con localStorage)
  const [assignments, setAssignments] = useState<Assignment[]>(() => {
    const saved = localStorage.getItem('assignments')
    return saved
      ? JSON.parse(saved)
      : [
          {
            id: 1,
            day: 4,
            branch: 'PINOS',
            employee: 'María Paula',
            shift: 'Mañana',
          },
          {
            id: 2,
            day: 4,
            branch: 'PINOS',
            employee: 'Juan Carlos',
            shift: 'Tarde',
          },
        ]
  })

  // Guardado automático en localStorage cuando cambia el estado
  useEffect(() => {
    localStorage.setItem('employees', JSON.stringify(employees))
  }, [employees])

  useEffect(() => {
    localStorage.setItem('shiftTypes', JSON.stringify(shiftTypes))
  }, [shiftTypes])

  useEffect(() => {
    localStorage.setItem('assignments', JSON.stringify(assignments))
  }, [assignments])

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

          {/* Botón e Input para Restaurar Respaldo con Confirmación */}
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
            setEmployees={setEmployees}
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

        {page === 'attendance' && (
  <Attendance
    assignments={assignments}
    shiftTypes={shiftTypes}
  />
)}

        {page === 'reports' && <Reports />}
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