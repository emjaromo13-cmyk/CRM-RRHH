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

type Usuario = {
  id: number
  username: string
  nombre: string
  rol: string
}

/*
=========================================================
USUARIOS DEL SISTEMA
=========================================================
*/

const usuariosLogin = [
  {
    username: 'admin',
    nombre: 'Administrador',
    etiqueta: 'Administrador',
  },
  {
    username: 'yilver',
    nombre: 'Yilver Medina',
    etiqueta: 'Líder Zona 1',
  },
  {
    username: 'jhon',
    nombre: 'Jhon Flor',
    etiqueta: 'Líder Zona 2',
  },
  {
    username: 'sergio',
    nombre: 'Sergio',
    etiqueta: 'Líder Gigante',
  },
  {
    username: 'jhoan',
    nombre: 'Jhoan Sosa',
    etiqueta: 'Líder Zuluaga',
  },
  {
    username: 'jefe',
    nombre: 'Jefe',
    etiqueta: 'Jefe',
  },
]

/*
=========================================================
SEDES PERMITIDAS POR USUARIO
=========================================================
*/

const branchesByRole: Record<string, string[]> = {
  LIDER_ZONA_1: [
    'PINOS',
    'CAÑA BRAVA',
    'GUALANDAY',
    'BUGANVILES',
    'RIVERA',
  ],

  LIDER_ZONA_2: [
    'LIMONAR',
    'BAMBU',
    'MANZANARES',
    'MIRA RIO',
    'IPANEMA',
  ],

  LIDER_GIGANTE: [
    'GIGANTE',
  ],

  LIDER_ZULUAGA: [
    'ZULUAGA',
  ],
}

/*
=========================================================
FUNCIÓN PARA OBTENER LAS SEDES PERMITIDAS
=========================================================
*/

function getAllowedBranches(rol: string): string[] | undefined {
  if (rol === 'ADMIN' || rol === 'JEFE') {
    return undefined
  }

  return branchesByRole[rol] || []
}

/*
=========================================================
APP
=========================================================
*/

export default function App() {
  const [page, setPage] = useState<Page>('dashboard')

  const [usuario, setUsuario] = useState<Usuario | null>(() => {
    const saved = localStorage.getItem('usuario')

    return saved ? JSON.parse(saved) : null
  })

  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [loginError, setLoginError] = useState('')
  const [loadingLogin, setLoadingLogin] = useState(false)

  /*
  ========================================================
  LOGIN
  ========================================================
  */

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()

    setLoginError('')
    setLoadingLogin(true)

    console.log('LOGIN FRONTEND:', {
      username,
      passwordLength: password.length,
    })

    try {
      const response = await fetch(
        'https://crm-rrhh-backend.onrender.com/api/login',
        {
          method: 'POST',

          headers: {
            'Content-Type': 'application/json',
          },

          body: JSON.stringify({
            username,
            password,
          }),
        }
      )

      const data = await response.json()

      if (!response.ok) {
        throw new Error(
          data.mensaje || 'Error al iniciar sesión'
        )
      }

      localStorage.setItem(
        'token',
        data.token
      )

      localStorage.setItem(
        'usuario',
        JSON.stringify(data.usuario)
      )

      setUsuario(data.usuario)

      setUsername('')
      setPassword('')

      /*
      Al iniciar sesión dejamos la página
      de turnos como punto de entrada para
      los líderes.
      */
      setPage('turns')

    } catch (error: any) {
      setLoginError(
        error.message ||
          'No se pudo iniciar sesión'
      )
    } finally {
      setLoadingLogin(false)
    }
  }

  /*
  ========================================================
  LOGOUT
  ========================================================
  */

  const handleLogout = () => {
    localStorage.removeItem('usuario')
    localStorage.removeItem('token')

    setUsuario(null)

    setUsername('')
    setPassword('')
    setLoginError('')

    setPage('dashboard')
  }

  /*
  ========================================================
  SEDE SELECCIONADA
  ========================================================
  */

  const [selectedBranch, setSelectedBranch] =
    useState<string>('PINOS')

  /*
  ========================================================
  EMPLEADOS
  ========================================================
  */

  const [employees, setEmployees] =
    useState<Employee[]>(() => {
      const saved =
        localStorage.getItem('employees')

      return saved
        ? JSON.parse(saved)
        : []
    })

  useEffect(() => {
    const loadEmployees = async () => {
      try {
        const token =
          localStorage.getItem('token')

        const response = await fetch(
          'https://crm-rrhh-backend.onrender.com/api/empleados',
          {
            headers: {
              Authorization:
                `Bearer ${token}`,
            },
          }
        )

        if (!response.ok) {
          throw new Error(
            'No se pudieron cargar los empleados'
          )
        }

        const data =
          await response.json()

        if (
          Array.isArray(data) &&
          data.length > 0
        ) {
          const formattedEmployees: Employee[] =
            data.map(
              (employee: any) => ({
                id: employee.id,

                name:
                  employee.nombre,

                document:
                  employee.documento ||
                  '',

                role:
                  employee.cargo ||
                  '',

                username:
                  employee.username ||
                  '',

                status:
                  employee.estado ||
                  'Activo',
              })
            )

          setEmployees(
            formattedEmployees
          )
        }
      } catch (error) {
        console.error(
          'Error cargando empleados:',
          error
        )
      }
    }

    if (usuario) {
      loadEmployees()
    }
  }, [usuario])

  /*
  ========================================================
  CARGAR ASIGNACIONES DE PRODUCCIÓN
  ========================================================
  */
const [assignments, setAssignments] =
  useState<Assignment[]>([])

  useEffect(() => {
    const loadProductionAssignments =
      async () => {
        try {
          const token =
            localStorage.getItem(
              'token'
            )

          const headers = {
            Authorization:
              `Bearer ${token}`,
          }

          const [
            employeesResponse,
            branchesResponse,
            shiftsResponse,
            assignmentsResponse,
          ] = await Promise.all([
            fetch(
              'https://crm-rrhh-backend.onrender.com/api/empleados',
              { headers }
            ),

            fetch(
              'https://crm-rrhh-backend.onrender.com/api/sedes',
              { headers }
            ),

            fetch(
              'https://crm-rrhh-backend.onrender.com/api/tipos-turno',
              { headers }
            ),

            fetch(
              'https://crm-rrhh-backend.onrender.com/api/asignaciones',
              { headers }
            ),
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

          const employeesData =
            await employeesResponse.json()

          const branchesData =
            await branchesResponse.json()

          const shiftsData =
            await shiftsResponse.json()

          const assignmentsData =
            await assignmentsResponse.json()

          console.log(
            'EMPLEADOS PRODUCCIÓN:',
            employeesData
          )

          console.log(
            'SEDES PRODUCCIÓN:',
            branchesData
          )

          console.log(
            'TURNOS PRODUCCIÓN:',
            shiftsData
          )

          console.log(
            'ASIGNACIONES PRODUCCIÓN:',
            assignmentsData
          )

          const employeeMap =
            new Map(
              employeesData.map(
                (employee: any) => [
                  Number(
                    employee.id
                  ),
                  employee.nombre,
                ]
              )
            )

          const branchMap =
            new Map(
              branchesData.map(
                (branch: any) => [
                  Number(
                    branch.id
                  ),
                  branch.nombre,
                ]
              )
            )

          const shiftMap =
            new Map(
              shiftsData.map(
                (shift: any) => [
                  Number(
                    shift.id
                  ),
                  shift.nombre,
                ]
              )
            )

          const formattedAssignments: Assignment[] =
            assignmentsData.map(
              (assignment: any) => {
                const date =
                  new Date(
                    assignment.fecha
                  )

                return {
                  id: Number(
                    assignment.id
                  ),

                  day:
                    date.getUTCDate(),

                  /*
                  IMPORTANTE:
                  Se conserva el mismo criterio
                  que ya tienes en tu código.
                  */
                 month:
  date.getUTCMonth(),

                  year:
                    date.getUTCFullYear(),

                  branch:
                    branchMap.get(
                      Number(
                        assignment.sede_id
                      )
                    ) || '',

                  employee:
                    employeeMap.get(
                      Number(
                        assignment.empleado_id
                      )
                    ) || '',

                  shift:
                    shiftMap.get(
                      Number(
                        assignment.turno_id
                      )
                    ) || '',
                }
              }
            )

          console.log(
            'ASIGNACIONES CONVERTIDAS:',
            formattedAssignments
          )

          setAssignments(
            formattedAssignments
          )
        } catch (error) {
          console.error(
            'Error cargando asignaciones de producción:',
            error
          )
        }
      }

    if (usuario) {
      loadProductionAssignments()
    }
  }, [usuario])

  /*
  ========================================================
  TIPOS DE TURNO
  ========================================================
  */

  const [shiftTypes, setShiftTypes] =
    useState<ShiftType[]>(() => {
      const saved =
        localStorage.getItem(
          'shiftTypes'
        )

      return saved
        ? JSON.parse(saved)
        : [
            {
              id: 1,
              name: 'Mañana',
              hours: '8',
              start: '07:00',
              end: '15:00',
              color:
                'bg-red-100 text-red-700',
            },

            {
              id: 2,
              name: 'Tarde',
              hours: '7',
              start: '15:00',
              end: '22:00',
              color:
                'bg-red-100 text-red-700',
            },

            {
              id: 3,
              name: 'Descanso',
              hours: '0',
              color:
                'bg-green-100 text-green-700',
            },

            {
              id: 4,
              name: 'Largo',
              hours: '15',
              start: '07:00',
              end: '22:00',
              color:
                'bg-gray-200 text-gray-800',
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
              color:
                'bg-red-100 text-red-700',
            },

            {
              id: 6,
              name: '7 a 2',
              hours: '7',
              start: '07:00',
              end: '14:00',
              color:
                'bg-red-100 text-red-700',
            },

            {
              id: 7,
              name: '2 a 10',
              hours: '8',
              start: '14:00',
              end: '22:00',
              color:
                'bg-red-100 text-red-700',
            },

            {
              id: 8,
              name: 'Noche',
              hours: '9',
              start: '22:00',
              end: '07:00',
              color:
                'bg-red-100 text-red-700',
            },

            {
              id: 9,
              name: '8 a 4',
              hours: '8',
              start: '08:00',
              end: '16:00',
              color:
                'bg-red-100 text-red-700',
            },

            {
              id: 10,
              name: '4 a 11',
              hours: '7',
              start: '16:00',
              end: '23:00',
              color:
                'bg-red-100 text-red-700',
            },

            {
              id: 11,
              name: 'Largo domingo',
              hours: '15',
              start: '08:00',
              end: '23:00',
              color:
                'bg-gray-200 text-gray-800',
            },

            {
              id: 12,
              name: '3 a 9',
              hours: '6',
              start: '15:00',
              end: '21:00',
              color:
                'bg-red-100 text-red-700',
            },

            {
              id: 13,
              name: '2 a 9',
              hours: '7',
              start: '14:00',
              end: '21:00',
              color:
                'bg-red-100 text-red-700',
            },

            {
              id: 14,
              name: 'Largo Zuluaga',
              hours: '14',
              start: '07:00',
              end: '21:00',
              color:
                'bg-gray-200 text-gray-800',
            },
          ]
    })

  /*
  ========================================================
  GUARDADO LOCAL
  ========================================================
  */

  useEffect(() => {
    localStorage.setItem(
      'employees',
      JSON.stringify(employees)
    )
  }, [employees])

  useEffect(() => {
    localStorage.setItem(
      'shiftTypes',
      JSON.stringify(shiftTypes)
    )
  }, [shiftTypes])

  useEffect(() => {
    localStorage.setItem(
      'assignments',
      JSON.stringify(assignments)
    )
  }, [assignments])

  /*
  ========================================================
  ACTUALIZAR EMPLEADOS
  ========================================================
  */

  const updateEmployees = (
    update: React.SetStateAction<Employee[]>
  ) => {
    const newEmployees =
      typeof update === 'function'
        ? update(employees)
        : update

    employees.forEach(
      (oldEmployee) => {
        const newEmployee =
          newEmployees.find(
            (emp) =>
              emp.id ===
              oldEmployee.id
          )

        if (
          newEmployee &&
          newEmployee.name !==
            oldEmployee.name
        ) {
          const oldName =
            oldEmployee.name

          const newName =
            newEmployee.name

          setAssignments(
            (previousAssignments) =>
              previousAssignments.map(
                (assignment) =>
                  assignment.employee.trim() ===
                  oldName.trim()
                    ? {
                        ...assignment,
                        employee:
                          newName,
                      }
                    : assignment
              )
          )

          const savedAttendance =
            localStorage.getItem(
              'attendanceRecords'
            )

          if (savedAttendance) {
            try {
              const attendance =
                JSON.parse(
                  savedAttendance
                )

              const updatedAttendance =
                attendance.map(
                  (record: any) =>
                    record.employee ===
                    oldName
                      ? {
                          ...record,
                          employee:
                            newName,
                        }
                      : record
                )

              localStorage.setItem(
                'attendanceRecords',
                JSON.stringify(
                  updatedAttendance
                )
              )
            } catch (error) {
              console.error(
                'Error actualizando asistencias:',
                error
              )
            }
          }
        }
      }
    )

    setEmployees(
      newEmployees
    )
  }

  /*
  ========================================================
  SI NO HAY SESIÓN → LOGIN
  ========================================================
  */

  if (!usuario) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">

        <form
          onSubmit={handleLogin}
          className="w-full max-w-md bg-white rounded-2xl shadow-lg border border-slate-200 p-8"
        >

          <div className="text-center mb-8">

            <h1 className="text-3xl md:text-4xl font-extrabold text-red-600 text-center tracking-tight">
              DROGUERIA MICROFARMA
            </h1>

            <p className="text-slate-500 mt-2">
              Inicia sesión para continuar
            </p>

          </div>

          <div className="space-y-5">

            <div>

              <label className="block text-sm font-medium text-slate-700 mb-2">
                Usuario
              </label>

              <select
                value={username}
                onChange={(e) =>
                  setUsername(
                    e.target.value
                  )
                }
                className="w-full border border-slate-300 rounded-xl px-4 py-3 bg-white outline-none focus:ring-2 focus:ring-red-500"
                required
              >

                <option value="">
                  Selecciona tu usuario
                </option>

                {usuariosLogin.map(
                  (usuario) => (
                    <option
                      key={
                        usuario.username
                      }
                      value={
                        usuario.username
                      }
                    >
                      {
                        usuario.etiqueta
                      }
                    </option>
                  )
                )}

              </select>

            </div>

            <div>

              <label className="block text-sm font-medium text-slate-700 mb-2">
                Contraseña
              </label>

              <input
                type="password"
                value={password}
                onChange={(e) =>
                  setPassword(
                    e.target.value
                  )
                }
                placeholder="Ingresa tu contraseña"
                className="w-full border border-slate-300 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-red-500"
                required
              />

            </div>

            {loginError && (
              <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-sm">
                {loginError}
              </div>
            )}

            <button
              type="submit"
              disabled={loadingLogin}
              className="w-full bg-red-600 hover:bg-red-700 text-white font-semibold py-3 rounded-xl transition-colors"
            >
              {loadingLogin
                ? 'Iniciando sesión...'
                : 'Iniciar sesión'}
            </button>

          </div>

        </form>

      </div>
    )
  }

  /*
  ========================================================
  PERMISOS DEL USUARIO ACTUAL
  ========================================================
  */

  const allowedBranches =
    getAllowedBranches(
      usuario.rol
    )

  const isAdmin =
    usuario.rol === 'ADMIN'

  const isJefe =
    usuario.rol === 'JEFE'

  const isReadOnly =
    isJefe

  /*
  ========================================================
  SIDEBAR
  ========================================================
  */

  return (
    <div className="min-h-screen bg-slate-50 flex">

      <aside className="w-64 bg-white border-r border-slate-200 p-4">

        <h1 className="text-2xl font-bold text-red-600 mb-8">
          MICROFARMA
        </h1>

        <div className="mb-6">

          <p className="text-sm text-slate-500">
            Sesión iniciada como
          </p>

          <p className="font-semibold text-slate-800">
            {usuario.nombre}
          </p>

          <p className="text-xs text-slate-500 mt-1">
            {usuario.rol}
          </p>

          <button
            onClick={handleLogout}
            className="mt-3 w-full bg-red-50 hover:bg-red-100 text-red-700 px-4 py-2 rounded-xl text-sm font-medium transition"
          >
            Cerrar sesión
          </button>

        </div>

        {/* =================================================
            RESPALDOS
        ================================================= */}

        {isAdmin && (
          <div className="space-y-2 mb-6">

            <button
              onClick={() => {

                const backup = {
                  employees,
                  shiftTypes,
                  assignments,

                  attendance:
                    JSON.parse(
                      localStorage.getItem(
                        'attendanceRecords'
                      ) || '[]'
                    ),
                }

                const blob =
                  new Blob(
                    [
                      JSON.stringify(
                        backup,
                        null,
                        2
                      ),
                    ],
                    {
                      type:
                        'application/json',
                    }
                  )

                const url =
                  URL.createObjectURL(
                    blob
                  )

                const a =
                  document.createElement(
                    'a'
                  )

                a.href = url

                a.download =
                  `respaldo_rrhh_${new Date()
                    .toISOString()
                    .slice(
                      0,
                      10
                    )}.json`

                a.click()

                URL.revokeObjectURL(
                  url
                )
              }}
              className="w-full bg-slate-100 hover:bg-slate-200 text-slate-700 px-4 py-2 rounded-xl text-sm font-medium flex items-center justify-center gap-2 transition"
            >
              💾 Crear respaldo
            </button>

            <label className="w-full bg-slate-100 hover:bg-slate-200 text-slate-700 px-4 py-2 rounded-xl text-sm font-medium flex items-center justify-center gap-2 cursor-pointer transition">

              📂 Restaurar respaldo

              <input
                type="file"
                accept=".json"
                className="hidden"
                onChange={(e) => {

                  const file =
                    e.target.files?.[0]

                  if (!file) return

                  const confirmRestore =
                    window.confirm(
                      '⚠️ ¿Estás seguro de que deseas restaurar este respaldo?\n\nEsta acción sobrescribirá todos los datos actuales de empleados, turnos y asistencias.'
                    )

                  if (
                    !confirmRestore
                  ) {
                    e.target.value =
                      ''

                    return
                  }

                  const reader =
                    new FileReader()

                  reader.onload = (
                    event
                  ) => {

                    try {

                      const data =
                        JSON.parse(
                          event.target
                            ?.result as string
                        )

                      if (
                        data.employees
                      ) {
                        setEmployees(
                          data.employees
                        )

                        localStorage.setItem(
                          'employees',
                          JSON.stringify(
                            data.employees
                          )
                        )
                      }

                      if (
                        data.shiftTypes
                      ) {
                        setShiftTypes(
                          data.shiftTypes
                        )

                        localStorage.setItem(
                          'shiftTypes',
                          JSON.stringify(
                            data.shiftTypes
                          )
                        )
                      }

                      if (
                        data.assignments
                      ) {
                        setAssignments(
                          data.assignments
                        )

                        localStorage.setItem(
                          'assignments',
                          JSON.stringify(
                            data.assignments
                          )
                        )
                      }

                      if (
                        data.attendance
                      ) {
                        localStorage.setItem(
                          'attendanceRecords',
                          JSON.stringify(
                            data.attendance
                          )
                        )
                      }

                      alert(
                        '¡Respaldo restaurado con éxito!'
                      )

                    } catch (
                      error
                    ) {

                      alert(
                        'Error al leer el archivo JSON. Asegúrate de que sea un respaldo válido.'
                      )

                    }

                  }

                  reader.readAsText(
                    file
                  )

                  e.target.value =
                    ''

                }}
              />

            </label>

          </div>
        )}

        {/* =================================================
            MENÚ
        ================================================= */}

        <nav className="space-y-2">

          {/* ADMIN */}

          {isAdmin && (
            <>
              <MenuButton
                label="Dashboard"
                active={
                  page ===
                  'dashboard'
                }
                onClick={() =>
                  setPage(
                    'dashboard'
                  )
                }
              />

              <MenuButton
                label="Empleados"
                active={
                  page ===
                  'employees'
                }
                onClick={() =>
                  setPage(
                    'employees'
                  )
                }
              />

              <MenuButton
                label="Tipos de turno"
                active={
                  page ===
                  'shiftTypes'
                }
                onClick={() =>
                  setPage(
                    'shiftTypes'
                  )
                }
              />

              <MenuButton
                label="Turnos"
                active={
                  page === 'turns'
                }
                onClick={() =>
                  setPage('turns')
                }
              />

              <MenuButton
                label="Calendario Domiciliarios"
                active={
                  page ===
                  'deliveryCalendar'
                }
                onClick={() =>
                  setPage(
                    'deliveryCalendar'
                  )
                }
              />

              <MenuButton
                label="Asistencia"
                active={
                  page ===
                  'attendance'
                }
                onClick={() =>
                  setPage(
                    'attendance'
                  )
                }
              />

              <MenuButton
                label="Reportes"
                active={
                  page ===
                  'reports'
                }
                onClick={() =>
                  setPage(
                    'reports'
                  )
                }
              />
            </>
          )}

          {/* JEFE */}

          {isJefe && (
            <>
              <MenuButton
                label="Dashboard"
                active={
                  page ===
                  'dashboard'
                }
                onClick={() =>
                  setPage(
                    'dashboard'
                  )
                }
              />

              <MenuButton
                label="Empleados"
                active={
                  page ===
                  'employees'
                }
                onClick={() =>
                  setPage(
                    'employees'
                  )
                }
              />

              <MenuButton
                label="Tipos de turno"
                active={
                  page ===
                  'shiftTypes'
                }
                onClick={() =>
                  setPage(
                    'shiftTypes'
                  )
                }
              />

              <MenuButton
                label="Turnos"
                active={
                  page === 'turns'
                }
                onClick={() =>
                  setPage('turns')
                }
              />

              <MenuButton
                label="Calendario Domiciliarios"
                active={
                  page ===
                  'deliveryCalendar'
                }
                onClick={() =>
                  setPage(
                    'deliveryCalendar'
                  )
                }
              />

              <MenuButton
                label="Asistencia"
                active={
                  page ===
                  'attendance'
                }
                onClick={() =>
                  setPage(
                    'attendance'
                  )
                }
              />

              {/* NO REPORTES PARA JEFE */}
            </>
          )}

          {/* LÍDERES */}

          {!isAdmin &&
            !isJefe && (
              <>
                <MenuButton
                  label="Tipos de turno"
                  active={
                    page ===
                    'shiftTypes'
                  }
                  onClick={() =>
                    setPage(
                      'shiftTypes'
                    )
                  }
                />

                <MenuButton
                  label="Turnos"
                  active={
                    page === 'turns'
                  }
                  onClick={() =>
                    setPage('turns')
                  }
                />

                <MenuButton
                  label="Calendario Domiciliarios"
                  active={
                    page ===
                    'deliveryCalendar'
                  }
                  onClick={() =>
                    setPage(
                      'deliveryCalendar'
                    )
                  }
                />
              </>
            )}

        </nav>

      </aside>

      {/* =================================================
          CONTENIDO PRINCIPAL
      ================================================= */}

      <main className="flex-1 p-6 overflow-auto">

        {/* DASHBOARD */}

        {page ===
          'dashboard' &&
          (isAdmin ||
            isJefe) && (
            <Dashboard
              employees={
                employees
              }

              shiftTypes={
                shiftTypes
              }

              assignments={
                assignments
              }

              setPage={
                setPage
              }

              selectedBranch={
                selectedBranch
              }

              setSelectedBranch={
                setSelectedBranch
              }
            />
          )}

        {/* EMPLEADOS */}

        {page ===
          'employees' &&
          (isAdmin ||
            isJefe) && (
            <Employees
              employees={
                employees
              }

              setEmployees={
                updateEmployees
              }
            />
          )}

        {/* TIPOS DE TURNO */}

        {page ===
          'shiftTypes' && (
            <ShiftTypes
              shiftTypes={
                shiftTypes
              }

              setShiftTypes={
                setShiftTypes
              }

              readOnly={
                !isAdmin
              }
            />
          )}

        {/* =================================================
            CALENDARIO DE TURNOS
        ================================================= */}

        {page === 'turns' && (
          <Calendar

            assignments={
              assignments
            }

            setAssignments={
              setAssignments
            }

            employees={
              employees
            }

            shiftTypes={
              shiftTypes
            }

            selectedBranch={
              selectedBranch
            }

            setSelectedBranch={
              setSelectedBranch
            }

            /*
            Aquí enviamos las sedes
            permitidas según el usuario.
            */

            allowedBranches={
              allowedBranches
            }

            /*
            Jefe = solo lectura.
            Los líderes y Admin pueden modificar.
            */

            readOnly={
              isReadOnly
            }

          />
        )}

        {/* CALENDARIO DOMICILIARIOS */}

        {page ===
          'deliveryCalendar' && (
            <DeliveryCalendar
              employees={
                employees
              }

              shiftTypes={
                shiftTypes
              }
            />
          )}

        {/* ASISTENCIA */}

        {page ===
          'attendance' &&
          (isAdmin ||
            isJefe) && (
            <Attendance
              assignments={
                assignments
              }

              shiftTypes={
                shiftTypes
              }

              employees={
                employees
              }
            />
          )}

        {/* REPORTES SOLO ADMIN */}

        {page ===
          'reports' &&
          isAdmin && (
            <Reports
              assignments={
                assignments
              }

              shiftTypes={
                shiftTypes
              }
            />
          )}

      </main>

    </div>
  )
}

/*
=========================================================
BOTÓN DEL MENÚ
=========================================================
*/

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
          ? 'bg-red-50 text-red-700 font-medium'
          : 'hover:bg-slate-100 text-slate-700'
      }`}
    >
      {label}
    </button>
  )
}