import {
  useEffect,
  useMemo,
  useState,
  type ChangeEvent,
  type Dispatch,
  type SetStateAction,
} from 'react';
import * as XLSX from 'xlsx';

type Assignment = {
  id: number;
  day: number;
  month: number;
  year: number;
  branch: string;
  employee: string;
  shift: string;
};

type Employee = {
  id: number;
  name: string;
  document: string;
  role: string;
  username: string;
  status: string;
};

type AttendanceRecord = {
  id: number;
  employeeId: number;
  branchId: number;
  employee: string;
  branch: string;
  date: string;
  scheduledStart: string;
  realStart: string;
  lateMinutes: number;
  discount: boolean;
  paidHours: number;
};

type ShiftType = {
  id: number;
  name: string;
  hours?: string;
  start?: string;
  end?: string;
  start2?: string;
  end2?: string;
  isSplit?: boolean;
};

type Props = {
  assignments: Assignment[];
  employees: Employee[];
  shiftTypes?: ShiftType[];
};

/* =========================================================
   CONFIGURACIÓN
========================================================= */

const API_URL = (
  import.meta.env.VITE_API_URL ||
  'https://crm-rrhh-backend.onrender.com'
).replace(/\/$/, '');

/* =========================================================
   EQUIVALENCIAS PC → SEDE
========================================================= */

const PC_TO_BRANCH: Record<string, string> = {
  'DM-BAMBU': 'BAMBU',
  'DM-BUGANVILES': 'BUGANVILES',
  'DM-CANA-BRAVA': 'CAÑA BRAVA',
  'DM-GIGANTE': 'GIGANTE',
  'DM-GUALANDAY': 'GUALANDAY',
  'DM-LIMONAR': 'LIMONAR',
  'DM-MANZANAREZ': 'MANZANARES',
  'DM-RIVERA': 'RIVERA',
  'DM-ZULUAGA': 'ZULUAGA',
  IPANEMA: 'IPANEMA',
  'MIRA RIO': 'MIRA RIO',
  PINOS: 'PINOS',
};

/* =========================================================
   FUNCIONES AUXILIARES
========================================================= */

const normalizeText = (value: unknown) =>
  String(value ?? '')
    .trim()
    .toUpperCase();

const excelDateToISO = (value: unknown): string => {
  if (value instanceof Date && !isNaN(value.getTime())) {
    const year = value.getFullYear();
    const month = String(value.getMonth() + 1).padStart(2, '0');
    const day = String(value.getDate()).padStart(2, '0');

    return `${year}-${month}-${day}`;
  }

  if (typeof value === 'number') {
    const date = XLSX.SSF.parse_date_code(value);

    if (date) {
      return `${date.y}-${String(date.m).padStart(2, '0')}-${String(
        date.d
      ).padStart(2, '0')}`;
    }
  }

  const text = String(value ?? '').trim();

  if (!text) {
    return '';
  }

  const months: Record<string, number> = {
    ENE: 1,
    FEB: 2,
    MAR: 3,
    ABR: 4,
    MAY: 5,
    JUN: 6,
    JUL: 7,
    AGO: 8,
    SEP: 9,
    OCT: 10,
    NOV: 11,
    DIC: 12,
  };

  const match = text
    .toUpperCase()
    .match(/^([A-ZÁÉÍÓÚÑ]+)-(\d{1,2})-(\d{4})$/);

  if (match) {
    const monthText = match[1].substring(0, 3);
    const day = Number(match[2]);
    const year = Number(match[3]);
    const month = months[monthText];

    if (month) {
      return `${year}-${String(month).padStart(2, '0')}-${String(
        day
      ).padStart(2, '0')}`;
    }
  }

  const slashMatch = text.match(
    /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/
  );

  if (slashMatch) {
    const day = Number(slashMatch[1]);
    const month = Number(slashMatch[2]);
    const year = Number(slashMatch[3]);

    return `${year}-${String(month).padStart(2, '0')}-${String(
      day
    ).padStart(2, '0')}`;
  }

  return text;
};

const excelTimeToHHMM = (value: unknown): string => {
  if (value instanceof Date && !isNaN(value.getTime())) {
    return `${String(value.getHours()).padStart(2, '0')}:${String(
      value.getMinutes()
    ).padStart(2, '0')}`;
  }

  if (typeof value === 'number') {
    const totalMinutes = Math.round(value * 24 * 60);
    const hours = Math.floor(totalMinutes / 60) % 24;
    const minutes = totalMinutes % 60;

    return `${String(hours).padStart(2, '0')}:${String(
      minutes
    ).padStart(2, '0')}`;
  }

  const text = String(value ?? '').trim();

  if (!text) {
    return '';
  }

  const match = text.match(
    /^(\d{1,2}):(\d{1,2})(?::(\d{1,2}))?/
  );

  if (match) {
    const hours = Number(match[1]);
    const minutes = Number(match[2]);

    return `${String(hours).padStart(2, '0')}:${String(
      minutes
    ).padStart(2, '0')}`;
  }

  return text;
};

/* =========================================================
   COMPONENTE PRINCIPAL
========================================================= */

export default function Attendance({
  assignments,
  employees,
  shiftTypes = [],
}: Props) {
  const [selectedDate, setSelectedDate] = useState(
    new Date().toISOString().slice(0, 10)
  );

  const [selectedBranch, setSelectedBranch] = useState('Todas');

  const [selectedEmployee, setSelectedEmployee] =
    useState('Todos');

  /* =======================================================
     ASISTENCIAS
  ======================================================= */

  const [records, setRecords] = useState<AttendanceRecord[]>([]);

  const [loadingRecords, setLoadingRecords] = useState(false);

  /* =======================================================
     CARGAR ASISTENCIAS DESDE EL BACKEND
  ======================================================= */

  useEffect(() => {
    const loadAttendance = async () => {
      const token = localStorage.getItem('token');

      if (!token) {
        setRecords([]);
        setLoadingRecords(false);
        return;
      }

      try {
        setLoadingRecords(true);

        const headers = {
          Authorization: `Bearer ${token}`,
        };

        const [attendanceResponse, sedesResponse] =
          await Promise.all([
            fetch(`${API_URL}/api/asistencias`, {
              headers,
            }),
            fetch(`${API_URL}/api/sedes`, {
              headers,
            }),
          ]);

        if (!attendanceResponse.ok) {
          throw new Error(
            'No se pudieron cargar las asistencias.'
          );
        }

        if (!sedesResponse.ok) {
          throw new Error(
            'No se pudieron cargar las sedes.'
          );
        }

        const data = await attendanceResponse.json();
        const sedes = await sedesResponse.json();

        const sedeMap = new Map<number, string>();

        sedes.forEach((sede: any) => {
          sedeMap.set(
            Number(sede.id),
            String(sede.nombre ?? '')
          );
        });

        const formattedRecords: AttendanceRecord[] =
          data.map((record: any) => {
            const employee = employees.find(
              emp =>
                Number(emp.id) ===
                Number(record.empleado_id)
            );

            return {
              id: Number(record.id),

              employeeId: Number(
                record.empleado_id
              ),

              branchId: Number(
                record.sede_id
              ),

              employee:
                employee?.name ||
                `Empleado ${record.empleado_id}`,

              branch:
                sedeMap.get(
                  Number(record.sede_id)
                ) || '',

              date: String(
                record.fecha ?? ''
              ).slice(0, 10),

              scheduledStart:
                record.scheduled_start || '',

              realStart:
                record.real_start ||
                record.hora_entrada ||
                '',

              lateMinutes:
                Number(record.late_minutes) || 0,

              discount:
                Boolean(record.discount),

              paidHours:
                Number(record.paid_hours) || 0,
            };
          });

        setRecords(formattedRecords);
      } catch (error) {
        console.error(
          'Error cargando asistencias:',
          error
        );

        alert(
          error instanceof Error
            ? error.message
            : 'No se pudieron cargar las asistencias desde el servidor.'
        );
      } finally {
        setLoadingRecords(false);
      }
    };

    loadAttendance();
  }, [employees]);

  /* =========================================================
     FECHA SELECCIONADA
  ========================================================= */

  const selectedYear = Number(
    selectedDate.split('-')[0]
  );

  const selectedMonth =
    Number(selectedDate.split('-')[1]) - 1;

  const todayDay = Number(
    selectedDate.split('-')[2]
  );

  /* =========================================================
     TURNOS DEL DÍA
  ========================================================= */

  const todayAssignments = useMemo(() => {
    return assignments.filter(a => {
      const dayOk = a.day === todayDay;
      const monthOk = a.month === selectedMonth;
      const yearOk = a.year === selectedYear;

      const branchOk =
        selectedBranch === 'Todas' ||
        a.branch === selectedBranch;

      const employeeOk =
        selectedEmployee === 'Todos' ||
        a.employee === selectedEmployee;

      return (
        dayOk &&
        monthOk &&
        yearOk &&
        branchOk &&
        employeeOk
      );
    });
  }, [
    assignments,
    todayDay,
    selectedMonth,
    selectedYear,
    selectedBranch,
    selectedEmployee,
  ]);

  /* =========================================================
     LISTAS
  ========================================================= */

  const branches = Array.from(
    new Set(
      assignments
        .map(a => a.branch)
        .filter(Boolean)
    )
  );

  const employeesList = Array.from(
    new Set(
      assignments
        .filter(
          a =>
            selectedBranch === 'Todas' ||
            a.branch === selectedBranch
        )
        .map(a => a.employee)
        .filter(Boolean)
    )
  );

  /* =========================================================
     REGISTROS FILTRADOS
  ========================================================= */

  const filteredRecords = records.filter(r => {
    const dateOk = r.date === selectedDate;

    const branchOk =
      selectedBranch === 'Todas' ||
      r.branch === selectedBranch;

    const employeeOk =
      selectedEmployee === 'Todos' ||
      r.employee === selectedEmployee;

    return (
      dateOk &&
      branchOk &&
      employeeOk
    );
  });

  /* =========================================================
     INFORMACIÓN DEL TURNO
  ========================================================= */

  const getShiftInfo = (shift: string) => {
    const turno = shiftTypes.find(
      t =>
        t.name.trim().toLowerCase() ===
        shift.trim().toLowerCase()
    );

    if (!turno) {
      return {
        start: '',
        end: '',
        hours: 0,
      };
    }

    let hours = 0;

    if (turno.start && turno.end) {
      const [sh, sm] = turno.start
        .split(':')
        .map(Number);

      const [eh, em] = turno.end
        .split(':')
        .map(Number);

      const startMin =
        sh * 60 + sm;

      let endMin =
        eh * 60 + em;

      if (endMin < startMin) {
        endMin += 24 * 60;
      }

      hours =
        (endMin - startMin) / 60;

      if (
        turno.isSplit &&
        turno.start2 &&
        turno.end2
      ) {
        const [s2h, s2m] =
          turno.start2
            .split(':')
            .map(Number);

        const [e2h, e2m] =
          turno.end2
            .split(':')
            .map(Number);

        const start2Min =
          s2h * 60 + s2m;

        let end2Min =
          e2h * 60 + e2m;

        if (end2Min < start2Min) {
          end2Min += 24 * 60;
        }

        hours +=
          (end2Min - start2Min) / 60;
      }
    } else if (turno.hours) {
      hours = Number(turno.hours);
    }

    return {
      start: turno.start || '',
      end: turno.end || '',
      hours,
    };
  };

  /* =========================================================
     TARDANZA
     GRACIA: 10 MINUTOS
  ========================================================= */

  const calculateLate = (
    scheduled: string,
    real: string
  ) => {
    if (!scheduled || !real) {
      return 0;
    }

    const [sh, sm] = scheduled
      .split(':')
      .map(Number);

    const [rh, rm] = real
      .split(':')
      .map(Number);

    const scheduledMin =
      sh * 60 + sm;

    const realMin =
      rh * 60 + rm;

    const diff =
      realMin - scheduledMin;

    return diff > 10
      ? diff - 10
      : 0;
  };

  /* =========================================================
     GUARDAR ASISTENCIA MANUAL
  ========================================================= */

  const saveAttendance = async (
    assignment: Assignment,
    realStart: string,
    discount: boolean
  ) => {
    try {
      const token =
        localStorage.getItem('token');

      if (!token) {
        alert('Sesión no encontrada.');
        return;
      }

      if (!realStart) {
        alert(
          'Debes ingresar la hora real de entrada.'
        );
        return;
      }

      /* -----------------------------------------------------
         BUSCAR EMPLEADO
      ----------------------------------------------------- */

      const employee = employees.find(
        emp =>
          normalizeText(emp.name) ===
          normalizeText(
            assignment.employee
          )
      );

      if (!employee) {
        alert(
          'No se encontró el empleado en el sistema.'
        );
        return;
      }

      /* -----------------------------------------------------
         BUSCAR SEDE
      ----------------------------------------------------- */

      const sedesResponse =
        await fetch(
          `${API_URL}/api/sedes`,
          {
            headers: {
              Authorization:
                `Bearer ${token}`,
            },
          }
        );

      if (!sedesResponse.ok) {
        throw new Error(
          'No se pudieron obtener las sedes.'
        );
      }

      const sedes =
        await sedesResponse.json();

      const sede = sedes.find(
        (sede: any) =>
          normalizeText(
            sede.nombre
          ) ===
          normalizeText(
            assignment.branch
          )
      );

      if (!sede) {
        alert(
          `No se encontró la sede ${assignment.branch}.`
        );
        return;
      }

      /* -----------------------------------------------------
         EVITAR DUPLICADOS
      ----------------------------------------------------- */

      const alreadyExists =
        records.some(
          record =>
            record.date === selectedDate &&
            Number(record.employeeId) ===
              Number(employee.id) &&
            Number(record.branchId) ===
              Number(sede.id)
        );

      if (alreadyExists) {
        alert(
          'Ya existe una asistencia registrada para este empleado, sede y fecha.'
        );
        return;
      }

      /* -----------------------------------------------------
         CALCULAR TURNO
      ----------------------------------------------------- */

      const info =
        getShiftInfo(
          assignment.shift
        );

      if (!info.start) {
        alert(
          `No se encontró la hora de inicio del turno "${assignment.shift}".`
        );
        return;
      }

      const lateMinutes =
        calculateLate(
          info.start,
          realStart
        );

      const paidHours = discount
        ? Math.max(
            info.hours -
              lateMinutes / 60,
            0
          )
        : info.hours;

      /* -----------------------------------------------------
         GUARDAR EN BACKEND / NEON
      ----------------------------------------------------- */

      const response =
        await fetch(
          `${API_URL}/api/asistencias`,
          {
            method: 'POST',

            headers: {
              'Content-Type':
                'application/json',

              Authorization:
                `Bearer ${token}`,
            },

            body: JSON.stringify({
              empleado_id:
                Number(employee.id),

              sede_id:
                Number(sede.id),

              fecha:
                selectedDate,

              scheduled_start:
                info.start,

              real_start:
                realStart,

              late_minutes:
                lateMinutes,

              discount,

              paid_hours:
                Number(
                  paidHours.toFixed(2)
                ),

              hora_entrada:
                realStart,

              hora_salida:
                null,

              estado:
                'Registrada',

              observacion:
                null,
            }),
          }
        );

      const data =
        await response.json();

      if (!response.ok) {
        throw new Error(
          data.mensaje ||
            'No se pudo guardar la asistencia.'
        );
      }

      /* -----------------------------------------------------
         ACTUALIZAR SOLAMENTE LA VISTA
         EL DATO REAL YA QUEDÓ EN NEON
      ----------------------------------------------------- */

      const newRecord: AttendanceRecord = {
        id: Number(data.id),

        employeeId:
          Number(data.empleado_id),

        branchId:
          Number(data.sede_id),

        employee:
          assignment.employee,

        branch:
          assignment.branch,

        date:
          String(
            data.fecha ||
              selectedDate
          ).slice(0, 10),

        scheduledStart:
          data.scheduled_start ||
          info.start,

        realStart:
          data.real_start ||
          realStart,

        lateMinutes:
          Number(
            data.late_minutes
          ) || 0,

        discount:
          Boolean(
            data.discount
          ),

        paidHours:
          Number(
            data.paid_hours
          ) || 0,
      };

      setRecords(prev => [
        ...prev,
        newRecord,
      ]);

      alert(
        'Asistencia guardada correctamente.'
      );
    } catch (error) {
      console.error(
        'Error guardando asistencia:',
        error
      );

      alert(
        error instanceof Error
          ? error.message
          : 'No se pudo guardar la asistencia.'
      );
    }
  };

  /* =========================================================
     IMPORTAR LOG
  ========================================================= */

  const importLog = (
    event: ChangeEvent<HTMLInputElement>
  ) => {
    const file =
      event.target.files?.[0];

    if (!file) {
      return;
    }

    const reader =
      new FileReader();

    reader.onload = async e => {
      try {
        const result =
          e.target?.result;

        if (!result) {
          alert(
            'No se pudo leer el archivo.'
          );
          return;
        }

        const data =
          new Uint8Array(
            result as ArrayBuffer
          );

        const workbook =
          XLSX.read(data, {
            type: 'array',
            cellDates: true,
          });

        const firstSheetName =
          workbook.SheetNames[0];

        if (!firstSheetName) {
          alert(
            'El archivo no contiene hojas.'
          );
          return;
        }

        const worksheet =
          workbook.Sheets[
            firstSheetName
          ];

        const rows =
          XLSX.utils.sheet_to_json<
            Record<string, unknown>
          >(worksheet, {
            defval: '',
          });

        if (rows.length === 0) {
          alert(
            'El archivo no contiene registros.'
          );
          return;
        }

        /* =================================================
           DETECTAR COLUMNAS
        ================================================= */

        const firstRow =
          rows[0];

        const keys =
          Object.keys(firstRow);

        const findColumn = (
          possibleNames: string[]
        ) => {
          return keys.find(
            key =>
              possibleNames.includes(
                normalizeText(key)
              )
          );
        };

        const dateColumn =
          findColumn([
            'FECHA',
            'FECHAHORA',
            'FECHA HORA',
          ]);

        const timeColumn =
          findColumn([
            'HORA',
            'HORA DE ENTRADA',
          ]);

        const usernameColumn =
          findColumn([
            'USUARIO',
            'USER',
            'USERNAME',
          ]);

        const nameColumn =
          findColumn([
            'NOMBRE',
            'NOMBRE USUARIO',
          ]);

        const pcColumn =
          findColumn([
            'PC',
            'EQUIPO',
            'COMPUTADOR',
          ]);

        if (
          !dateColumn ||
          !timeColumn ||
          !usernameColumn ||
          !pcColumn
        ) {
          alert(
            `No pude identificar las columnas necesarias.

Se necesitan:

Fecha
Hora
Usuario
PC

Columnas encontradas:

${keys.join(', ')}`
          );

          return;
        }

        /* =================================================
           PROCESAR LOG
        ================================================= */

        type LogRecord = {
          date: string;
          time: string;
          username: string;
          name: string;
          pc: string;
          branch: string;
        };

        const logRecords: LogRecord[] =
          [];

        rows.forEach(row => {
          const date =
            excelDateToISO(
              row[dateColumn]
            );

          const time =
            excelTimeToHHMM(
              row[timeColumn]
            );

          const username =
            String(
              row[usernameColumn] ?? ''
            ).trim();

          const name =
            nameColumn
              ? String(
                  row[nameColumn] ?? ''
                ).trim()
              : '';

          const pc =
            normalizeText(
              row[pcColumn]
            );

          if (
            !date ||
            !time ||
            !username ||
            !pc
          ) {
            return;
          }

          const branch =
            PC_TO_BRANCH[pc];

          if (!branch) {
            return;
          }

          logRecords.push({
            date,
            time,
            username,
            name,
            pc,
            branch,
          });
        });

        if (
          logRecords.length === 0
        ) {
          alert(
            'No se encontraron registros válidos en el archivo.'
          );

          return;
        }

        /* =================================================
           AGRUPAR POR FECHA + USUARIO + SEDE
        ================================================= */

        const grouped =
          new Map<
            string,
            LogRecord[]
          >();

        logRecords.forEach(log => {
          const key =
            `${log.date}|${normalizeText(
              log.username
            )}|${normalizeText(
              log.branch
            )}`;

          if (!grouped.has(key)) {
            grouped.set(
              key,
              []
            );
          }

          grouped
            .get(key)!
            .push(log);
        });

        /* =================================================
           VALIDAR SESIÓN
        ================================================= */

        const token =
          localStorage.getItem(
            'token'
          );

        if (!token) {
          alert(
            'Sesión no encontrada.'
          );

          return;
        }

        /* =================================================
           CARGAR SEDES
        ================================================= */

        const sedesResponse =
          await fetch(
            `${API_URL}/api/sedes`,
            {
              headers: {
                Authorization:
                  `Bearer ${token}`,
              },
            }
          );

        if (!sedesResponse.ok) {
          throw new Error(
            'No se pudieron cargar las sedes.'
          );
        }

        const sedes =
          await sedesResponse.json();

        /* =================================================
           PREPARAR REGISTROS
        ================================================= */

        type PendingAttendance = {
          employeeId: number;
          branchId: number;
          employee: string;
          branch: string;
          date: string;
          scheduledStart: string;
          realStart: string;
          lateMinutes: number;
          discount: boolean;
          paidHours: number;
        };

        const pendingRecords:
          PendingAttendance[] = [];

        const unknownUsers =
          new Set<string>();

        const noAssignment: string[] =
          [];

        grouped.forEach(group => {
          group.sort((a, b) =>
            a.time.localeCompare(
              b.time
            )
          );

          const first =
            group[0];

          /* -----------------------------------------------
             BUSCAR EMPLEADO
          ----------------------------------------------- */

          const employee =
            employees.find(
              emp =>
                normalizeText(
                  emp.username
                ) ===
                normalizeText(
                  first.username
                )
            );

          if (!employee) {
            unknownUsers.add(
              first.username
            );

            return;
          }

          /* -----------------------------------------------
             BUSCAR SEDE
          ----------------------------------------------- */

          const sede =
            sedes.find(
              (sede: any) =>
                normalizeText(
                  sede.nombre
                ) ===
                normalizeText(
                  first.branch
                )
            );

          if (!sede) {
            noAssignment.push(
              `${first.date} | ${employee.name} | ${first.branch} | Sede no encontrada`
            );

            return;
          }

          /* -----------------------------------------------
             BUSCAR ASIGNACIÓN
          ----------------------------------------------- */

          const dateParts =
            first.date.split('-');

          const year =
            Number(
              dateParts[0]
            );

          const month =
            Number(
              dateParts[1]
            ) - 1;

          const day =
            Number(
              dateParts[2]
            );

          const assignment =
            assignments.find(a => {
              return (
                a.day === day &&
                a.month === month &&
                a.year === year &&
                normalizeText(
                  a.branch
                ) ===
                  normalizeText(
                    first.branch
                  ) &&
                normalizeText(
                  a.employee
                ) ===
                  normalizeText(
                    employee.name
                  )
              );
            });

          if (!assignment) {
            noAssignment.push(
              `${first.date} | ${employee.name} | ${first.branch}`
            );

            return;
          }

          /* -----------------------------------------------
             INFORMACIÓN DEL TURNO
          ----------------------------------------------- */

          const info =
            getShiftInfo(
              assignment.shift
            );

          if (!info.start) {
            noAssignment.push(
              `${first.date} | ${employee.name} | ${first.branch} | Turno sin hora`
            );

            return;
          }

          const lateMinutes =
            calculateLate(
              info.start,
              first.time
            );

          const paidHours =
            info.hours;

          /* -----------------------------------------------
             EVITAR DUPLICADOS EN BASE A LOS CARGADOS
          ----------------------------------------------- */

          const alreadyExists =
            records.some(
              record =>
                record.date ===
                  first.date &&
                Number(
                  record.employeeId
                ) ===
                  Number(
                    employee.id
                  ) &&
                Number(
                  record.branchId
                ) ===
                  Number(
                    sede.id
                  )
            );

          if (alreadyExists) {
            return;
          }

          /* -----------------------------------------------
             EVITAR DUPLICADOS DENTRO DEL ARCHIVO
          ----------------------------------------------- */

          const alreadyPending =
            pendingRecords.some(
              record =>
                record.date ===
                  first.date &&
                Number(
                  record.employeeId
                ) ===
                  Number(
                    employee.id
                  ) &&
                Number(
                  record.branchId
                ) ===
                  Number(
                    sede.id
                  )
            );

          if (alreadyPending) {
            return;
          }

          pendingRecords.push({
            employeeId:
              Number(employee.id),

            branchId:
              Number(sede.id),

            employee:
              employee.name,

            branch:
              first.branch,

            date:
              first.date,

            scheduledStart:
              info.start,

            realStart:
              first.time,

            lateMinutes,

            discount:
              false,

            paidHours:
              Number(
                paidHours.toFixed(2)
              ),
          });
        });

        /* =================================================
           GUARDAR CADA REGISTRO EN BACKEND
        ================================================= */

        const createdRecords:
          AttendanceRecord[] = [];

        let failedRecords = 0;

        for (
          const record of pendingRecords
        ) {
          try {
            const response =
              await fetch(
                `${API_URL}/api/asistencias`,
                {
                  method: 'POST',

                  headers: {
                    'Content-Type':
                      'application/json',

                    Authorization:
                      `Bearer ${token}`,
                  },

                  body: JSON.stringify({
                    empleado_id:
                      record.employeeId,

                    sede_id:
                      record.branchId,

                    fecha:
                      record.date,

                    scheduled_start:
                      record.scheduledStart,

                    real_start:
                      record.realStart,

                    late_minutes:
                      record.lateMinutes,

                    discount:
                      record.discount,

                    paid_hours:
                      record.paidHours,

                    hora_entrada:
                      record.realStart,

                    hora_salida:
                      null,

                    estado:
                      'Registrada',

                    observacion:
                      null,
                  }),
                }
              );

            const responseData =
              await response.json();

            if (!response.ok) {
              console.error(
                'Error creando asistencia importada:',
                responseData
              );

              failedRecords++;

              continue;
            }

            createdRecords.push({
              id: Number(
                responseData.id
              ),

              employeeId:
                Number(
                  responseData.empleado_id
                ),

              branchId:
                Number(
                  responseData.sede_id
                ),

              employee:
                record.employee,

              branch:
                record.branch,

              date:
                String(
                  responseData.fecha ||
                    record.date
                ).slice(0, 10),

              scheduledStart:
                responseData.scheduled_start ||
                record.scheduledStart,

              realStart:
                responseData.real_start ||
                record.realStart,

              lateMinutes:
                Number(
                  responseData.late_minutes
                ) || 0,

              discount:
                Boolean(
                  responseData.discount
                ),

              paidHours:
                Number(
                  responseData.paid_hours
                ) || 0,
            });
          } catch (error) {
            console.error(
              'Error enviando asistencia:',
              error
            );

            failedRecords++;
          }
        }

        /* =================================================
           ACTUALIZAR VISTA
        ================================================= */

        if (
          createdRecords.length > 0
        ) {
          setRecords(prev => [
            ...prev,
            ...createdRecords,
          ]);
        }

        /* =================================================
           MENSAJE FINAL
        ================================================= */

        let message =
          `Importación terminada.\n\n` +
          `Registros del log: ${logRecords.length}\n` +
          `Asistencias guardadas en la base de datos: ${createdRecords.length}\n` +
          `Registros con error: ${failedRecords}`;

        if (
          unknownUsers.size > 0
        ) {
          message +=
            `\n\nUsuarios no encontrados:\n` +
            Array.from(
              unknownUsers
            ).join(', ');
        }

        if (
          noAssignment.length > 0
        ) {
          message +=
            `\n\nSin turno o sede asignada:\n` +
            noAssignment
              .slice(0, 20)
              .join('\n');

          if (
            noAssignment.length > 20
          ) {
            message +=
              `\n... y ${
                noAssignment.length - 20
              } más.`;
          }
        }

        alert(message);

        if (
          createdRecords.length > 0
        ) {
          setSelectedDate(
            createdRecords[0].date
          );
        }
      } catch (error) {
        console.error(
          'Error importando archivo:',
          error
        );

        alert(
          error instanceof Error
            ? error.message
            : 'Ocurrió un error al leer o importar el archivo Excel.'
        );
      } finally {
        event.target.value = '';
      }
    };

    reader.readAsArrayBuffer(file);
  };

  /* =========================================================
     EXPORTAR EXCEL
  ========================================================= */

  const exportExcel = () => {
    if (records.length === 0) {
      alert(
        'No hay registros para exportar.'
      );

      return;
    }

    const asistenciaData =
      records.map(r => ({
        Fecha:
          r.date,

        Sede:
          r.branch,

        Empleado:
          r.employee,

        'Hora programada':
          r.scheduledStart,

        'Hora real':
          r.realStart,

        'Minutos tarde':
          r.lateMinutes,

        Descuento:
          r.discount
            ? 'Sí'
            : 'No',

        'Horas a pagar':
          r.paidHours,
      }));

    const wsAsistencia =
      XLSX.utils.json_to_sheet(
        asistenciaData
      );

    wsAsistencia['!cols'] = [
      { wch: 14 },
      { wch: 15 },
      { wch: 28 },
      { wch: 16 },
      { wch: 14 },
      { wch: 14 },
      { wch: 12 },
      { wch: 14 },
    ];

    /* =======================================================
       RESUMEN
    ======================================================= */

    const resumenMap = new Map<
      string,
      {
        Empleado: string;
        Sede: string;
        'Días trabajados': number;
        'Llegadas tarde': number;
        'Minutos tarde': number;
        'Horas normales': number;
        'Horas extra': number;
        'Horas a pagar': number;
      }
    >();

    records.forEach(r => {
      if (!resumenMap.has(r.employee)) {
        resumenMap.set(
          r.employee,
          {
            Empleado:
              r.employee,

            Sede:
              r.branch,

            'Días trabajados':
              0,

            'Llegadas tarde':
              0,

            'Minutos tarde':
              0,

            'Horas normales':
              0,

            'Horas extra':
              0,

            'Horas a pagar':
              0,
          }
        );
      }

      const item =
        resumenMap.get(
          r.employee
        )!;

      item['Días trabajados'] +=
        1;

      if (r.lateMinutes > 0) {
        item['Llegadas tarde'] +=
          1;

        item['Minutos tarde'] +=
          r.lateMinutes;
      }

      item['Horas a pagar'] +=
        r.paidHours;
    });

    resumenMap.forEach(item => {
      item['Horas normales'] =
        Math.min(
          item['Horas a pagar'],
          210
        );

      item['Horas extra'] =
        Math.max(
          item['Horas a pagar'] -
            210,
          0
        );
    });

    const resumenData =
      Array.from(
        resumenMap.values()
      );

    const wsResumen =
      XLSX.utils.json_to_sheet(
        resumenData
      );

    wsResumen['!cols'] = [
      { wch: 28 },
      { wch: 15 },
      { wch: 15 },
      { wch: 15 },
      { wch: 15 },
      { wch: 15 },
      { wch: 15 },
      { wch: 15 },
    ];

    const wb =
      XLSX.utils.book_new();

    XLSX.utils.book_append_sheet(
      wb,
      wsAsistencia,
      'Asistencia'
    );

    XLSX.utils.book_append_sheet(
      wb,
      wsResumen,
      'Resumen Nómina'
    );

    XLSX.writeFile(
      wb,
      `Nomina_Asistencia_${selectedDate}.xlsx`
    );
  };

  /* =========================================================
     INTERFAZ
  ========================================================= */

  return (
    <div className="space-y-6">
      {/* HEADER */}

      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold">
            Asistencia
          </h2>

          <p className="text-slate-500">
            Registro de entradas y tardanzas
          </p>
        </div>

        <div className="flex gap-3 items-center">
          <input
            type="date"
            value={selectedDate}
            onChange={e =>
              setSelectedDate(
                e.target.value
              )
            }
            className="border rounded-xl px-4 py-2 bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />

          {/* IMPORTAR */}

          <label className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-xl font-medium shadow-sm flex items-center gap-2 transition-colors cursor-pointer">
            Importar Log

            <input
              type="file"
              accept=".xlsx,.xls,.csv"
              className="hidden"
              onChange={importLog}
            />
          </label>

          {/* EXPORTAR */}

          <button
            onClick={exportExcel}
            className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-xl font-medium shadow-sm flex items-center gap-2 transition-colors"
          >
            Excel
          </button>
        </div>
      </div>

      {/* FILTROS */}

      <div className="bg-white rounded-2xl border p-4 shadow-sm">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="text-sm font-medium text-slate-600 mb-2 block">
              Filtrar por sede
            </label>

            <select
              value={selectedBranch}
              onChange={e =>
                setSelectedBranch(
                  e.target.value
                )
              }
              className="w-full border rounded-xl px-4 py-2 bg-white"
            >
              <option value="Todas">
                Todas
              </option>

              {branches.map(branch => (
                <option
                  key={branch}
                  value={branch}
                >
                  {branch}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-sm font-medium text-slate-600 mb-2 block">
              Filtrar por empleado
            </label>

            <select
              value={selectedEmployee}
              onChange={e =>
                setSelectedEmployee(
                  e.target.value
                )
              }
              className="w-full border rounded-xl px-4 py-2 bg-white"
            >
              <option value="Todos">
                Todos
              </option>

              {employeesList.map(emp => (
                <option
                  key={emp}
                  value={emp}
                >
                  {emp}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* TURNOS PROGRAMADOS */}

      <div className="bg-white rounded-2xl border p-5">
        <h3 className="text-lg font-bold mb-4">
          Turnos programados
        </h3>

        <div className="space-y-4">
          {todayAssignments.length === 0 && (
            <p className="text-slate-500">
              No hay turnos programados para esta fecha.
            </p>
          )}

          {todayAssignments.map(a => {
            const info =
              getShiftInfo(
                a.shift
              );

            return (
              <AttendanceCard
                key={a.id}
                assignment={a}
                start={info.start}
                hours={info.hours}
                onSave={
                  saveAttendance
                }
              />
            );
          })}
        </div>
      </div>

      {/* REGISTROS */}

      <div className="bg-white rounded-2xl border overflow-hidden">
        <div className="p-5 border-b">
          <h3 className="text-lg font-bold">
            Registros del día —{' '}
            {selectedDate} —{' '}
            {selectedBranch}
          </h3>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-slate-600">
              <tr>
                <th className="text-left p-4">
                  Fecha
                </th>

                <th className="text-left p-4">
                  Empleado
                </th>

                <th className="text-left p-4">
                  Sede
                </th>

                <th className="text-left p-4">
                  Programado
                </th>

                <th className="text-left p-4">
                  Entrada real
                </th>

                <th className="text-left p-4">
                  Tarde
                </th>

                <th className="text-left p-4">
                  Descontar
                </th>

                <th className="text-left p-4 font-semibold">
                  Horas a pagar
                </th>

                <th className="text-left p-4 font-semibold">
                  Acciones
                </th>
              </tr>
            </thead>

            <tbody className="divide-y">
              {loadingRecords ? (
                <tr>
                  <td
                    colSpan={9}
                    className="p-6 text-center text-slate-400"
                  >
                    Cargando asistencias...
                  </td>
                </tr>
              ) : filteredRecords.length === 0 ? (
                <tr>
                  <td
                    colSpan={9}
                    className="p-6 text-center text-slate-400"
                  >
                    Aún no se han guardado registros de asistencia hoy.
                  </td>
                </tr>
              ) : (
                filteredRecords.map(r => (
                  <EditableRow
                    key={r.id}
                    record={r}
                    setRecords={
                      setRecords
                    }
                    apiUrl={API_URL}
                  />
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

/* =========================================================
   TARJETA DE ASISTENCIA
========================================================= */

function AttendanceCard({
  assignment,
  start,
  hours,
  onSave,
}: {
  assignment: Assignment;
  start: string;
  hours: number;
  onSave: (
    assignment: Assignment,
    realStart: string,
    discount: boolean
  ) => void | Promise<void>;
}) {
  const [realStart, setRealStart] =
    useState(start);

  const [discount, setDiscount] =
    useState(false);

  return (
    <div className="border rounded-2xl p-4 bg-slate-50">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div className="font-semibold text-lg">
            {assignment.employee}
          </div>

          <div className="text-slate-500">
            {assignment.branch} ·{' '}
            {assignment.shift}
          </div>

          <div className="text-sm text-slate-400 mt-1">
            Programado: {start} ·{' '}
            {hours} h
          </div>
        </div>

        <div className="flex flex-col md:flex-row gap-3 items-start md:items-center">
          <div>
            <label className="text-xs text-slate-500 block mb-1">
              Entrada real
            </label>

            <input
              type="time"
              value={realStart}
              onChange={e =>
                setRealStart(
                  e.target.value
                )
              }
              className="border rounded-xl px-3 py-2 bg-white"
            />
          </div>

          <label className="flex items-center gap-2 text-sm mt-5 md:mt-0">
            <input
              type="checkbox"
              checked={discount}
              onChange={e =>
                setDiscount(
                  e.target.checked
                )
              }
            />

            Descontar
          </label>

          <button
            onClick={() =>
              onSave(
                assignment,
                realStart,
                discount
              )
            }
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl font-medium mt-5 md:mt-0"
          >
            Guardar
          </button>
        </div>
      </div>
    </div>
  );
}

/* =========================================================
   FILA EDITABLE
========================================================= */

function EditableRow({
  record,
  setRecords,
  apiUrl,
}: {
  record: AttendanceRecord;

  setRecords: Dispatch<
    SetStateAction<
      AttendanceRecord[]
    >
  >;

  apiUrl: string;
}) {
  const [realStart, setRealStart] =
    useState(record.realStart);

  const [discount, setDiscount] =
    useState(record.discount);

  /* =======================================================
     CALCULAR TARDANZA
  ======================================================= */

  const lateMinutes = (() => {
    if (
      !record.scheduledStart ||
      !realStart
    ) {
      return 0;
    }

    const [sh, sm] =
      record.scheduledStart
        .split(':')
        .map(Number);

    const [rh, rm] =
      realStart
        .split(':')
        .map(Number);

    const scheduledMin =
      sh * 60 + sm;

    const realMin =
      rh * 60 + rm;

    const diff =
      realMin - scheduledMin;

    return diff > 10
      ? diff - 10
      : 0;
  })();

  /* =======================================================
     CALCULAR HORAS A PAGAR

     Recuperamos las horas base para evitar descontar
     dos veces si se edita y guarda nuevamente.
  ======================================================= */

  const baseHours =
    record.discount
      ? record.paidHours +
        record.lateMinutes / 60
      : record.paidHours;

  const calculatedPaidHours =
    discount
      ? Math.max(
          baseHours -
            lateMinutes / 60,
          0
        )
      : baseHours;

  const paidHours =
    calculatedPaidHours.toFixed(2);

  /* =======================================================
     GUARDAR CAMBIOS
  ======================================================= */

  const saveChanges = async () => {
    try {
      const token =
        localStorage.getItem(
          'token'
        );

      if (!token) {
        alert(
          'Sesión no encontrada.'
        );

        return;
      }

      if (!realStart) {
        alert(
          'Debes ingresar la hora real.'
        );

        return;
      }

      const response =
        await fetch(
          `${apiUrl}/api/asistencias/${record.id}`,
          {
            method: 'PUT',

            headers: {
              'Content-Type':
                'application/json',

              Authorization:
                `Bearer ${token}`,
            },

            body: JSON.stringify({
              empleado_id:
                record.employeeId,

              sede_id:
                record.branchId,

              fecha:
                record.date,

              scheduled_start:
                record.scheduledStart,

              real_start:
                realStart,

              late_minutes:
                lateMinutes,

              discount,

              paid_hours:
                Number(
                  paidHours
                ),

              hora_entrada:
                realStart,

              hora_salida:
                null,

              estado:
                'Registrada',

              observacion:
                null,
            }),
          }
        );

      const data =
        await response.json();

      if (!response.ok) {
        throw new Error(
          data.mensaje ||
            'No se pudo actualizar la asistencia.'
        );
      }

      setRecords(prev =>
        prev.map(r =>
          r.id === record.id
            ? {
                ...r,

                employeeId:
                  Number(
                    data.empleado_id ??
                      record.employeeId
                  ),

                branchId:
                  Number(
                    data.sede_id ??
                      record.branchId
                  ),

                realStart:
                  data.real_start ||
                  data.hora_entrada ||
                  realStart,

                lateMinutes:
                  Number(
                    data.late_minutes
                  ) || 0,

                discount:
                  Boolean(
                    data.discount
                  ),

                paidHours:
                  Number(
                    data.paid_hours
                  ) || 0,
              }
            : r
        )
      );

      alert(
        'Asistencia actualizada correctamente.'
      );
    } catch (error) {
      console.error(
        'Error actualizando asistencia:',
        error
      );

      alert(
        error instanceof Error
          ? error.message
          : 'No se pudo actualizar la asistencia.'
      );
    }
  };

  /* =======================================================
     ELIMINAR
  ======================================================= */

  const deleteRow = async () => {
    const confirmed =
      window.confirm(
        '¿Eliminar este registro de asistencia?'
      );

    if (!confirmed) {
      return;
    }

    try {
      const token =
        localStorage.getItem(
          'token'
        );

      if (!token) {
        alert(
          'Sesión no encontrada.'
        );

        return;
      }

      const response =
        await fetch(
          `${apiUrl}/api/asistencias/${record.id}`,
          {
            method: 'DELETE',

            headers: {
              Authorization:
                `Bearer ${token}`,
            },
          }
        );

      const data =
        await response.json();

      if (!response.ok) {
        throw new Error(
          data.mensaje ||
            'No se pudo eliminar la asistencia.'
        );
      }

      setRecords(prev =>
        prev.filter(
          r =>
            r.id !== record.id
        )
      );

      alert(
        'Asistencia eliminada correctamente.'
      );
    } catch (error) {
      console.error(
        'Error eliminando asistencia:',
        error
      );

      alert(
        error instanceof Error
          ? error.message
          : 'No se pudo eliminar la asistencia.'
      );
    }
  };

  /* =======================================================
     FILA
  ======================================================= */

  return (
    <tr className="hover:bg-slate-50 transition-colors">
      <td className="p-4">
        {record.date}
      </td>

      <td className="p-4 font-medium">
        {record.employee}
      </td>

      <td className="p-4">
        {record.branch}
      </td>

      <td className="p-4">
        {record.scheduledStart}
      </td>

      <td className="p-4">
        <input
          type="time"
          value={realStart}
          onChange={e =>
            setRealStart(
              e.target.value
            )
          }
          className="border rounded-lg px-2 py-1 text-sm bg-white"
        />
      </td>

      <td className="p-4">
        {lateMinutes === 0 ? (
          <span className="text-green-600 font-medium">
            A tiempo
          </span>
        ) : (
          <span className="text-red-600 font-medium">
            {lateMinutes} min
          </span>
        )}
      </td>

      <td className="p-4">
        <input
          type="checkbox"
          checked={discount}
          onChange={e =>
            setDiscount(
              e.target.checked
            )
          }
          className="h-4 w-4"
        />
      </td>

      <td className="p-4 font-semibold">
        {paidHours} h
      </td>

      <td className="p-4">
        <div className="flex gap-2">
          <button
            onClick={saveChanges}
            className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded-lg text-sm"
          >
            Guardar
          </button>

          <button
            onClick={deleteRow}
            className="bg-red-600 hover:bg-red-700 text-white px-3 py-1 rounded-lg text-sm"
          >
            Eliminar
          </button>
        </div>
      </td>
    </tr>
  );
}