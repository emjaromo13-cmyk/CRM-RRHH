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
   NORMALIZAR TEXTO
========================================================= */

const normalizeText = (value: unknown): string =>
  String(value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .toUpperCase();

/* =========================================================
   EQUIVALENCIAS PC → SEDE
========================================================= */

const PC_TO_BRANCH: Record<string, string> = {
  'DM BAMBU': 'BAMBU',
  'DM BUGANVILES': 'BUGANVILES',
  'DM CANA BRAVA': 'CAÑA BRAVA',
  'DM GIGANTE': 'GIGANTE',
  'DM GUALANDAY': 'GUALANDAY',
  'DM LIMONAR': 'LIMONAR',
  'DM MANZANAREZ': 'MANZANARES',
  'DM MANZANARES': 'MANZANARES',
  'DM RIVERA': 'RIVERA',
  'DM ZULUAGA': 'ZULUAGA',
  'DM IPANEMA': 'IPANEMA',
  'DM MIRA RIO': 'MIRA RIO',
  'DM PINOS': 'PINOS',

  BAMBU: 'BAMBU',
  BUGANVILES: 'BUGANVILES',
  'CANA BRAVA': 'CAÑA BRAVA',
  'CAÑA BRAVA': 'CAÑA BRAVA',
  GIGANTE: 'GIGANTE',
  GUALANDAY: 'GUALANDAY',
  LIMONAR: 'LIMONAR',
  MANZANAREZ: 'MANZANARES',
  MANZANARES: 'MANZANARES',
  RIVERA: 'RIVERA',
  ZULUAGA: 'ZULUAGA',
  IPANEMA: 'IPANEMA',
  'MIRA RIO': 'MIRA RIO',
  PINOS: 'PINOS',
};

/* =========================================================
   RESOLVER SEDE
========================================================= */

const resolveBranch = (value: unknown): string => {
  const normalized = normalizeText(value);

  if (!normalized) {
    return '';
  }

  const directMatch = PC_TO_BRANCH[normalized];

  if (directMatch) {
    return directMatch;
  }

  const compact = normalized.replace(/[^A-Z0-9]/g, '');

  if (compact.includes('PINOS')) {
    return 'PINOS';
  }

  if (compact.includes('GUALANDAY')) {
    return 'GUALANDAY';
  }

  if (compact.includes('LIMONAR')) {
    return 'LIMONAR';
  }

  if (compact.includes('BAMBU')) {
    return 'BAMBU';
  }

  if (
    compact.includes('MANZANAREZ') ||
    compact.includes('MANZANARES')
  ) {
    return 'MANZANARES';
  }

  if (compact.includes('RIVERA')) {
    return 'RIVERA';
  }

  if (compact.includes('GIGANTE')) {
    return 'GIGANTE';
  }

  if (compact.includes('MIRARIO')) {
    return 'MIRA RIO';
  }

  if (compact.includes('CANABRAVA')) {
    return 'CAÑA BRAVA';
  }

  if (compact.includes('BUGANVILES')) {
    return 'BUGANVILES';
  }

  if (compact.includes('ZULUAGA')) {
    return 'ZULUAGA';
  }

  if (compact.includes('IPANEMA')) {
    return 'IPANEMA';
  }

  return '';
};

/* =========================================================
   FECHA EXCEL → YYYY-MM-DD
========================================================= */

const excelDateToISO = (value: unknown): string => {
  if (
    value instanceof Date &&
    !isNaN(value.getTime())
  ) {
    return [
      value.getFullYear(),
      String(value.getMonth() + 1).padStart(2, '0'),
      String(value.getDate()).padStart(2, '0'),
    ].join('-');
  }

  if (typeof value === 'number') {
    const date = XLSX.SSF.parse_date_code(value);

    if (date) {
      return [
        date.y,
        String(date.m).padStart(2, '0'),
        String(date.d).padStart(2, '0'),
      ].join('-');
    }
  }

  let text = String(value ?? '').trim();

  if (!text) {
    return '';
  }

  text = normalizeText(text);

  const months: Record<string, number> = {
    ENE: 1,
    ENERO: 1,
    FEB: 2,
    FEBRERO: 2,
    MAR: 3,
    MARZO: 3,
    ABR: 4,
    ABRIL: 4,
    MAY: 5,
    MAYO: 5,
    JUN: 6,
    JUNIO: 6,
    JUL: 7,
    JULIO: 7,
    AGO: 8,
    AGOSTO: 8,
    SEP: 9,
    SEPT: 9,
    SEPTIEMBRE: 9,
    OCT: 10,
    OCTUBRE: 10,
    NOV: 11,
    NOVIEMBRE: 11,
    DIC: 12,
    DICIEMBRE: 12,
  };

  /* DD/MM/YYYY */
  let match = text.match(
    /^(\d{1,2})[\/.-](\d{1,2})[\/.-](\d{4})/
  );

  if (match) {
    const day = Number(match[1]);
    const month = Number(match[2]);
    const year = Number(match[3]);

    if (
      day >= 1 &&
      day <= 31 &&
      month >= 1 &&
      month <= 12
    ) {
      return [
        year,
        String(month).padStart(2, '0'),
        String(day).padStart(2, '0'),
      ].join('-');
    }
  }

  /* YYYY-MM-DD */
  match = text.match(
    /^(\d{4})[\/.-](\d{1,2})[\/.-](\d{1,2})/
  );

  if (match) {
    const year = Number(match[1]);
    const month = Number(match[2]);
    const day = Number(match[3]);

    if (
      month >= 1 &&
      month <= 12 &&
      day >= 1 &&
      day <= 31
    ) {
      return [
        year,
        String(month).padStart(2, '0'),
        String(day).padStart(2, '0'),
      ].join('-');
    }
  }

  /* MES-DÍA-AÑO */
  match = text.match(
    /^([A-Z]+)[-\/ ](\d{1,2})[-\/ ](\d{4})/
  );

  if (match) {
    const month =
      months[match[1].substring(0, 3)] ??
      months[match[1]];

    const day = Number(match[2]);
    const year = Number(match[3]);

    if (
      month &&
      day >= 1 &&
      day <= 31
    ) {
      return [
        year,
        String(month).padStart(2, '0'),
        String(day).padStart(2, '0'),
      ].join('-');
    }
  }

  const parsed = new Date(text);

  if (!isNaN(parsed.getTime())) {
    return [
      parsed.getFullYear(),
      String(parsed.getMonth() + 1).padStart(2, '0'),
      String(parsed.getDate()).padStart(2, '0'),
    ].join('-');
  }

  return '';
};

/* =========================================================
   HORA EXCEL → HH:MM
========================================================= */

const excelTimeToHHMM = (value: unknown): string => {
  if (
    value instanceof Date &&
    !isNaN(value.getTime())
  ) {
    return `${String(value.getHours()).padStart(2, '0')}:${String(
      value.getMinutes()
    ).padStart(2, '0')}`;
  }

  if (typeof value === 'number') {
    const totalMinutes = Math.round(
      value * 24 * 60
    );

    const hours =
      Math.floor(totalMinutes / 60) % 24;

    const minutes =
      totalMinutes % 60;

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
  const [selectedDate, setSelectedDate] =
    useState(
      new Date()
        .toISOString()
        .slice(0, 10)
    );

  const [selectedBranch, setSelectedBranch] =
    useState('Todas');

  const [selectedEmployee, setSelectedEmployee] =
    useState('Todos');

  /* =======================================================
     ASISTENCIAS
  ======================================================= */

  const [records, setRecords] =
    useState<AttendanceRecord[]>([]);

  const [loadingRecords, setLoadingRecords] =
    useState(false);

  /* =======================================================
     SELECCIÓN MASIVA
  ======================================================= */

  const [selectedRecords, setSelectedRecords] =
    useState<number[]>([]);

  const [deletingSelected, setDeletingSelected] =
    useState(false);

  /* =======================================================
     CARGAR ASISTENCIAS DESDE BACKEND
  ======================================================= */

  useEffect(() => {
    const loadAttendance = async () => {
      const token =
        localStorage.getItem('token');

      if (!token) {
        setRecords([]);
        setLoadingRecords(false);
        return;
      }

      try {
        setLoadingRecords(true);

        const headers = {
          Authorization:
            `Bearer ${token}`,
        };

        const [
          attendanceResponse,
          sedesResponse,
        ] = await Promise.all([
          fetch(
            `${API_URL}/api/asistencias`,
            { headers }
          ),

          fetch(
            `${API_URL}/api/sedes`,
            { headers }
          ),
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

        const data =
          await attendanceResponse.json();

        const sedes =
          await sedesResponse.json();

        const sedeMap =
          new Map<number, string>();

        sedes.forEach((sede: any) => {
          sedeMap.set(
            Number(sede.id),
            String(
              sede.nombre ?? ''
            )
          );
        });

        const formattedRecords:
          AttendanceRecord[] =
          data.map((record: any) => {
            const employee =
              employees.find(
                emp =>
                  Number(emp.id) ===
                  Number(
                    record.empleado_id
                  )
              );

            return {
              id: Number(record.id),

              employeeId:
                Number(
                  record.empleado_id
                ),

              branchId:
                Number(
                  record.sede_id
                ),

              employee:
                employee?.name ||
                `Empleado ${record.empleado_id}`,

              branch:
                sedeMap.get(
                  Number(
                    record.sede_id
                  )
                ) || '',

              date:
                String(
                  record.fecha ?? ''
                ).slice(0, 10),

              scheduledStart:
                record.scheduled_start ||
                '',

              realStart:
                record.real_start ||
                record.hora_entrada ||
                '',

              lateMinutes:
                Number(
                  record.late_minutes
                ) || 0,

              discount:
                Boolean(
                  record.discount
                ),

              paidHours:
                Number(
                  record.paid_hours
                ) || 0,
            };
          });

        setRecords(
          formattedRecords
        );
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
     LIMPIAR SELECCIÓN CUANDO CAMBIA EL FILTRO
  ========================================================= */

  useEffect(() => {
    setSelectedRecords([]);
  }, [
    selectedDate,
    selectedBranch,
    selectedEmployee,
  ]);

  /* =========================================================
     FECHA SELECCIONADA
  ========================================================= */

  const selectedYear =
    Number(
      selectedDate.split('-')[0]
    );

  const selectedMonth =
    Number(
      selectedDate.split('-')[1]
    ) - 1;

  const todayDay =
    Number(
      selectedDate.split('-')[2]
    );

  /* =========================================================
     TURNOS DEL DÍA
  ========================================================= */

  const todayAssignments =
    useMemo(() => {
      return assignments.filter(
        a => {
          const dayOk =
            a.day === todayDay;

          const monthOk =
            a.month ===
            selectedMonth;

          const yearOk =
            a.year ===
            selectedYear;

          const branchOk =
            selectedBranch ===
              'Todas' ||
            a.branch ===
              selectedBranch;

          const employeeOk =
            selectedEmployee ===
              'Todos' ||
            a.employee ===
              selectedEmployee;

          return (
            dayOk &&
            monthOk &&
            yearOk &&
            branchOk &&
            employeeOk
          );
        }
      );
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

  const branches =
    Array.from(
      new Set(
        assignments
          .map(a => a.branch)
          .filter(Boolean)
      )
    );

  const employeesList =
    Array.from(
      new Set(
        assignments
          .filter(
            a =>
              selectedBranch ===
                'Todas' ||
              a.branch ===
                selectedBranch
          )
          .map(a => a.employee)
          .filter(Boolean)
      )
    );

  /* =========================================================
     REGISTROS FILTRADOS
  ========================================================= */

  const filteredRecords =
    records.filter(r => {
      const dateOk =
        r.date ===
        selectedDate;

      const branchOk =
        selectedBranch ===
          'Todas' ||
        r.branch ===
          selectedBranch;

      const employeeOk =
        selectedEmployee ===
          'Todos' ||
        r.employee ===
          selectedEmployee;

      return (
        dateOk &&
        branchOk &&
        employeeOk
      );
    });

  /* =========================================================
     SELECCIÓN DE REGISTROS
  ========================================================= */

  const allFilteredSelected =
    filteredRecords.length > 0 &&
    filteredRecords.every(
      record =>
        selectedRecords.includes(
          record.id
        )
    );

  const toggleSelectAll = () => {
    if (allFilteredSelected) {
      setSelectedRecords(
        prev =>
          prev.filter(
            id =>
              !filteredRecords.some(
                record =>
                  record.id === id
              )
          )
      );
    } else {
      setSelectedRecords(
        prev => [
          ...prev,

          ...filteredRecords
            .map(
              record =>
                record.id
            )
            .filter(
              id =>
                !prev.includes(id)
            ),
        ]
      );
    }
  };

  const toggleSelectRecord = (
    id: number
  ) => {
    setSelectedRecords(
      prev =>
        prev.includes(id)
          ? prev.filter(
              recordId =>
                recordId !== id
            )
          : [...prev, id]
    );
  };

  /* =========================================================
     ELIMINAR SELECCIONADOS
  ========================================================= */

  const deleteSelectedRecords =
    async () => {
      if (
        selectedRecords.length ===
        0
      ) {
        alert(
          'Selecciona al menos una asistencia.'
        );
        return;
      }

      const confirmed =
        window.confirm(
          `¿Eliminar ${selectedRecords.length} registro(s) de asistencia del día ${selectedDate}?`
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

        setDeletingSelected(true);

        const response =
          await fetch(
            `${API_URL}/api/asistencias/eliminar-masivo`,
            {
              method: 'DELETE',

              headers: {
                'Content-Type':
                  'application/json',

                Authorization:
                  `Bearer ${token}`,
              },

              body: JSON.stringify({
                ids:
                  selectedRecords,

                fecha:
                  selectedDate,
              }),
            }
          );

        const data =
          await response.json();

        if (!response.ok) {
          throw new Error(
            data.mensaje ||
              'No se pudieron eliminar las asistencias.'
          );
        }

        setRecords(
          prev =>
            prev.filter(
              record =>
                !selectedRecords.includes(
                  record.id
                )
            )
        );

        setSelectedRecords([]);

        alert(
          data.mensaje ||
            'Asistencias eliminadas correctamente.'
        );
      } catch (error) {
        console.error(
          'Error eliminando asistencias:',
          error
        );

        alert(
          error instanceof Error
            ? error.message
            : 'No se pudieron eliminar las asistencias.'
        );
      } finally {
        setDeletingSelected(false);
      }
    };

  /* =========================================================
     INFORMACIÓN DEL TURNO
  ========================================================= */

  const getShiftInfo = (
    shift: string
  ) => {
    const turno =
      shiftTypes.find(
        t =>
          t.name
            .trim()
            .toLowerCase() ===
          shift
            .trim()
            .toLowerCase()
      );

    if (!turno) {
      return {
        start: '',
        end: '',
        hours: 0,
      };
    }

    let hours = 0;

    if (
      turno.start &&
      turno.end
    ) {
      const [sh, sm] =
        turno.start
          .split(':')
          .map(Number);

      const [eh, em] =
        turno.end
          .split(':')
          .map(Number);

      const startMin =
        sh * 60 + sm;

      let endMin =
        eh * 60 + em;

      if (
        endMin <
        startMin
      ) {
        endMin +=
          24 * 60;
      }

      hours =
        (endMin - startMin) /
        60;

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

        if (
          end2Min <
          start2Min
        ) {
          end2Min +=
            24 * 60;
        }

        hours +=
          (end2Min -
            start2Min) /
          60;
      }
    } else if (
      turno.hours
    ) {
      hours =
        Number(
          turno.hours
        );
    }

    return {
      start:
        turno.start || '',

      end:
        turno.end || '',

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
    if (
      !scheduled ||
      !real
    ) {
      return 0;
    }

    const [sh, sm] =
      scheduled
        .split(':')
        .map(Number);

    const [rh, rm] =
      real
        .split(':')
        .map(Number);

    const scheduledMin =
      sh * 60 + sm;

    const realMin =
      rh * 60 + rm;

    const diff =
      realMin -
      scheduledMin;

    return diff > 10
      ? diff - 10
      : 0;
  };

  /* =========================================================
     GUARDAR ASISTENCIA MANUAL
  ========================================================= */

  const saveAttendance =
    async (
      assignment: Assignment,
      realStart: string,
      discount: boolean
    ) => {
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
            'Debes ingresar la hora real de entrada.'
          );
          return;
        }

        const employee =
          employees.find(
            emp =>
              normalizeText(
                emp.name
              ) ===
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

        const assignmentBranch =
          resolveBranch(
            assignment.branch
          );

        const sede =
          sedes.find(
            (sede: any) =>
              resolveBranch(
                sede.nombre
              ) ===
              assignmentBranch
          );

        if (!sede) {
          alert(
            `No se encontró la sede ${assignment.branch}.`
          );
          return;
        }

        const alreadyExists =
          records.some(
            record =>
              record.date ===
                selectedDate &&
              Number(
                record.employeeId
              ) ===
                Number(
                  employee.id
                ) &&
              Number(
                record.branchId
              ) ===
                Number(sede.id)
          );

        if (alreadyExists) {
          alert(
            'Ya existe una asistencia registrada para este empleado, sede y fecha.'
          );
          return;
        }

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

        const paidHours =
          discount
            ? Math.max(
                info.hours -
                  lateMinutes / 60,
                0
              )
            : info.hours;

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
                  Number(
                    employee.id
                  ),

                sede_id:
                  Number(
                    sede.id
                  ),

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
                    paidHours.toFixed(
                      2
                    )
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

        const newRecord:
          AttendanceRecord = {
          id:
            Number(data.id),

          employeeId:
            Number(
              data.empleado_id
            ),

          branchId:
            Number(
              data.sede_id
            ),

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

        setRecords(
          prev => [
            ...prev,
            newRecord,
          ]
        );

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
            raw: false,
          });

        if (
          !workbook.SheetNames ||
          workbook.SheetNames.length === 0
        ) {
          alert(
            'El archivo no contiene hojas.'
          );
          return;
        }

        /* =====================================================
           LEER TODAS LAS HOJAS
        ===================================================== */

        const rows:
          Record<string, unknown>[] = [];

        workbook.SheetNames.forEach(
          sheetName => {
            const worksheet =
              workbook.Sheets[
                sheetName
              ];

            if (!worksheet) {
              return;
            }

            const sheetRows =
              XLSX.utils.sheet_to_json<
                Record<string, unknown>
              >(worksheet, {
                defval: '',
                raw: false,
              });

            rows.push(
              ...sheetRows
            );
          }
        );

        if (
          rows.length === 0
        ) {
          alert(
            'El archivo no contiene registros.'
          );
          return;
        }

        /* =====================================================
           DETECTAR COLUMNAS
        ===================================================== */

        const allKeys =
          Array.from(
            new Set(
              rows.flatMap(row =>
                Object.keys(row)
              )
            )
          );

        const findColumn = (
          possibleNames: string[]
        ): string | undefined => {
          const normalizedPossibleNames =
            possibleNames.map(
              normalizeText
            );

          const exact =
            allKeys.find(key =>
              normalizedPossibleNames.includes(
                normalizeText(key)
              )
            );

          if (exact) {
            return exact;
          }

          return allKeys.find(
            key => {
              const normalizedKey =
                normalizeText(
                  key
                ).replace(
                  /[^A-Z0-9]/g,
                  ''
                );

              return normalizedPossibleNames.some(
                possible => {
                  const normalizedPossible =
                    possible.replace(
                      /[^A-Z0-9]/g,
                      ''
                    );

                  return (
                    normalizedKey ===
                      normalizedPossible ||
                    normalizedKey.includes(
                      normalizedPossible
                    )
                  );
                }
              );
            }
          );
        };

        const dateColumn =
          findColumn([
            'FECHA',
            'FECHA REGISTRO',
            'FECHAHORA',
            'FECHA HORA',
            'FECHA Y HORA',
            'FECHA/HORA',
            'DATE',
          ]);

        const timeColumn =
          findColumn([
            'HORA',
            'HORA DE ENTRADA',
            'HORA ENTRADA',
            'HORA REGISTRO',
            'HORA DEL REGISTRO',
            'TIME',
          ]);

        const usernameColumn =
          findColumn([
            'USUARIO',
            'USER',
            'USERNAME',
            'USUARIO RED',
            'ID USUARIO',
            'LOGIN',
          ]);

        const nameColumn =
          findColumn([
            'NOMBRE',
            'NOMBRE USUARIO',
            'NOMBRE DEL USUARIO',
            'EMPLEADO',
            'NOMBRE EMPLEADO',
          ]);

        const pcColumn =
          findColumn([
            'PC',
            'EQUIPO',
            'COMPUTADOR',
            'COMPUTADORA',
            'NOMBRE PC',
            'NOMBRE EQUIPO',
            'EQUIPO PC',
            'TERMINAL',
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

${allKeys.join(', ')}`
          );

          return;
        }

        /* =====================================================
           PROCESAR LOG
        ===================================================== */

        type LogRecord = {
          date: string;
          time: string;
          username: string;
          name: string;
          pc: string;
          branch: string;
        };

        const logRecords:
          LogRecord[] = [];

        const unknownBranches =
          new Set<string>();

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
              row[usernameColumn] ??
                ''
            ).trim();

          const name =
            nameColumn
              ? String(
                  row[nameColumn] ??
                    ''
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
            resolveBranch(pc);

          if (!branch) {
            unknownBranches.add(
              pc
            );

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
          logRecords.length ===
          0
        ) {
          let message =
            'No se encontraron registros válidos en el archivo.';

          if (
            unknownBranches.size >
            0
          ) {
            message +=
              `\n\nSedes/PC no reconocidos:\n${Array.from(
                unknownBranches
              ).join('\n')}`;
          }

          alert(message);
          return;
        }

        /* =====================================================
           AGRUPAR POR FECHA + USUARIO + SEDE
        ===================================================== */

        const grouped =
          new Map<
            string,
            LogRecord[]
          >();

        logRecords.forEach(
          log => {
            const key =
              `${log.date}|${normalizeText(
                log.username
              )}|${resolveBranch(
                log.branch
              )}`;

            if (
              !grouped.has(key)
            ) {
              grouped.set(
                key,
                []
              );
            }

            grouped
              .get(key)!
              .push(log);
          }
        );

        /* =====================================================
           VALIDAR SESIÓN
        ===================================================== */

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

        /* =====================================================
           CARGAR SEDES
        ===================================================== */

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

        /* =====================================================
           MAPA DE SEDES
        ===================================================== */

        const sedeMap =
          new Map<string, any>();

        sedes.forEach(
          (sede: any) => {
            const branch =
              resolveBranch(
                sede.nombre
              );

            if (branch) {
              sedeMap.set(
                branch,
                sede
              );
            }
          }
        );

        /* =====================================================
           PREPARAR REGISTROS
        ===================================================== */

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

        const noAssignment:
          string[] = [];

        grouped.forEach(
          group => {
            group.sort(
              (a, b) =>
                a.time.localeCompare(
                  b.time
                )
            );

            const first =
              group[0];

            /* ===============================================
               BUSCAR EMPLEADO
            =============================================== */

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

            /* ===============================================
               BUSCAR SEDE
            =============================================== */

            const branch =
              resolveBranch(
                first.branch
              );

            if (!branch) {
              noAssignment.push(
                `${first.date} | ${employee.name} | ${first.pc} | Sede no reconocida`
              );

              return;
            }

            const sede =
              sedeMap.get(
                branch
              );

            if (!sede) {
              noAssignment.push(
                `${first.date} | ${employee.name} | ${branch} | Sede no encontrada`
              );

              return;
            }

            /* ===============================================
               FECHA
            =============================================== */

            const dateParts =
              first.date.split(
                '-'
              );

            if (
              dateParts.length !==
              3
            ) {
              noAssignment.push(
                `${first.date} | ${employee.name} | ${branch} | Fecha inválida`
              );

              return;
            }

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

            /* ===============================================
               BUSCAR ASIGNACIÓN
            =============================================== */

            const assignment =
              assignments.find(
                a =>
                  Number(
                    a.day
                  ) === day &&
                  Number(
                    a.month
                  ) === month &&
                  Number(
                    a.year
                  ) === year &&
                  resolveBranch(
                    a.branch
                  ) ===
                    branch &&
                  normalizeText(
                    a.employee
                  ) ===
                    normalizeText(
                      employee.name
                    )
              );

            if (!assignment) {
              noAssignment.push(
                `${first.date} | ${employee.name} | ${branch}`
              );

              return;
            }

            /* ===============================================
               INFORMACIÓN DEL TURNO
            =============================================== */

            const info =
              getShiftInfo(
                assignment.shift
              );

            if (!info.start) {
              noAssignment.push(
                `${first.date} | ${employee.name} | ${branch} | Turno sin hora`
              );

              return;
            }

            /* ===============================================
               TARDANZA
            =============================================== */

            const lateMinutes =
              calculateLate(
                info.start,
                first.time
              );

            const paidHours =
              info.hours;

            /* ===============================================
               EVITAR DUPLICADOS
            =============================================== */

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

            if (
              alreadyExists
            ) {
              return;
            }

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

            if (
              alreadyPending
            ) {
              return;
            }

            pendingRecords.push({
              employeeId:
                Number(
                  employee.id
                ),

              branchId:
                Number(
                  sede.id
                ),

              employee:
                employee.name,

              branch,

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
                  paidHours.toFixed(
                    2
                  )
                ),
            });
          }
        );

        /* =====================================================
           GUARDAR EN BACKEND
        ===================================================== */

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
              id:
                Number(
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
                ).slice(
                  0,
                  10
                ),

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

        /* =====================================================
           ACTUALIZAR VISTA
        ===================================================== */

        if (
          createdRecords.length >
          0
        ) {
          setRecords(
            prev => [
              ...prev,
              ...createdRecords,
            ]
          );
        }

        /* =====================================================
           MENSAJE FINAL
        ===================================================== */

        let message =
          `Importación terminada.\n\n` +
          `Filas leídas del Excel: ${rows.length}\n` +
          `Registros válidos del log: ${logRecords.length}\n` +
          `Asistencias guardadas: ${createdRecords.length}\n` +
          `Registros con error: ${failedRecords}`;

        if (
          unknownBranches.size >
          0
        ) {
          message +=
            `\n\nPC/Sedes no reconocidos:\n` +
            Array.from(
              unknownBranches
            )
              .slice(0, 20)
              .join('\n');
        }

        if (
          unknownUsers.size >
          0
        ) {
          message +=
            `\n\nUsuarios no encontrados:\n` +
            Array.from(
              unknownUsers
            )
              .slice(0, 20)
              .join(', ');
        }

        if (
          noAssignment.length >
          0
        ) {
          message +=
            `\n\nSin turno o sede asignada:\n` +
            noAssignment
              .slice(0, 20)
              .join('\n');

          if (
            noAssignment.length >
            20
          ) {
            message +=
              `\n... y ${
                noAssignment.length -
                20
              } más.`;
          }
        }

        alert(message);

        if (
          createdRecords.length >
          0
        ) {
          setSelectedDate(
            createdRecords[0]
              .date
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

    reader.readAsArrayBuffer(
      file
    );
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
        Fecha: r.date,

        Sede: r.branch,

        Empleado: r.employee,

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

    const resumenMap =
      new Map<
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
      if (
        !resumenMap.has(
          r.employee
        )
      ) {
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

      item[
        'Días trabajados'
      ] += 1;

      if (
        r.lateMinutes > 0
      ) {
        item[
          'Llegadas tarde'
        ] += 1;

        item[
          'Minutos tarde'
        ] +=
          r.lateMinutes;
      }

      item[
        'Horas a pagar'
      ] += r.paidHours;
    });

    resumenMap.forEach(
      item => {
        item[
          'Horas normales'
        ] = Math.min(
          item['Horas a pagar'],
          210
        );

        item[
          'Horas extra'
        ] = Math.max(
          item['Horas a pagar'] -
            210,
          0
        );
      }
    );

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
            onClick={
              exportExcel
            }
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
              value={
                selectedBranch
              }
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

              {branches.map(
                branch => (
                  <option
                    key={branch}
                    value={
                      branch
                    }
                  >
                    {branch}
                  </option>
                )
              )}

            </select>

          </div>

          <div>

            <label className="text-sm font-medium text-slate-600 mb-2 block">
              Filtrar por empleado
            </label>

            <select
              value={
                selectedEmployee
              }
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

              {employeesList.map(
                emp => (
                  <option
                    key={emp}
                    value={emp}
                  >
                    {emp}
                  </option>
                )
              )}

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

          {todayAssignments.length ===
            0 && (
            <p className="text-slate-500">
              No hay turnos programados para esta fecha.
            </p>
          )}

          {todayAssignments.map(
            a => {
              const info =
                getShiftInfo(
                  a.shift
                );

              return (
                <AttendanceCard
                  key={a.id}
                  assignment={a}
                  start={
                    info.start
                  }
                  hours={
                    info.hours
                  }
                  onSave={
                    saveAttendance
                  }
                />
              );
            }
          )}

        </div>

      </div>

      {/* REGISTROS */}

      <div className="bg-white rounded-2xl border overflow-hidden">

        {/* CABECERA */}

        <div className="p-5 border-b flex flex-col md:flex-row md:items-center md:justify-between gap-4">

          <div>

            <h3 className="text-lg font-bold">
              Registros del día —{' '}
              {selectedDate} —{' '}
              {selectedBranch}
            </h3>

            {selectedRecords.length >
              0 && (
              <p className="text-sm text-slate-500 mt-1">
                {
                  selectedRecords.length
                }{' '}
                registro(s) seleccionado(s)
              </p>
            )}

          </div>

          {selectedRecords.length >
            0 && (
            <button
              onClick={
                deleteSelectedRecords
              }
              disabled={
                deletingSelected
              }
              className="bg-red-600 hover:bg-red-700 disabled:bg-red-300 text-white px-4 py-2 rounded-xl font-medium shadow-sm transition-colors"
            >
              {deletingSelected
                ? 'Eliminando...'
                : `Eliminar seleccionados (${selectedRecords.length})`}
            </button>
          )}

        </div>

        <div className="overflow-x-auto">

          <table className="w-full text-sm">

            <thead className="bg-slate-50 text-slate-600">

              <tr>

                <th className="p-4 w-12 text-center">

                  <input
                    type="checkbox"
                    checked={
                      allFilteredSelected
                    }
                    onChange={
                      toggleSelectAll
                    }
                    disabled={
                      filteredRecords.length ===
                      0
                    }
                    className="h-4 w-4"
                    title="Seleccionar todos"
                  />

                </th>

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
                    colSpan={10}
                    className="p-6 text-center text-slate-400"
                  >
                    Cargando asistencias...
                  </td>

                </tr>

              ) : filteredRecords.length ===
                0 ? (

                <tr>

                  <td
                    colSpan={10}
                    className="p-6 text-center text-slate-400"
                  >
                    Aún no se han guardado registros de asistencia hoy.
                  </td>

                </tr>

              ) : (

                filteredRecords.map(
                  r => (
                    <EditableRow
                      key={r.id}
                      record={r}
                      setRecords={
                        setRecords
                      }
                      apiUrl={
                        API_URL
                      }
                      selected={
                        selectedRecords.includes(
                          r.id
                        )
                      }
                      onToggleSelect={
                        toggleSelectRecord
                      }
                    />
                  )
                )

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
  ) =>
    | void
    | Promise<void>;
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
              value={
                realStart
              }
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
              checked={
                discount
              }
              onChange={e =>
                setDiscount(
                  e.target
                    .checked
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
  selected,
  onToggleSelect,
}: {
  record: AttendanceRecord;

  setRecords: Dispatch<
    SetStateAction<
      AttendanceRecord[]
    >
  >;

  apiUrl: string;

  selected: boolean;

  onToggleSelect: (
    id: number
  ) => void;
}) {
  const [realStart, setRealStart] =
    useState(
      record.realStart
    );

  const [discount, setDiscount] =
    useState(
      record.discount
    );

  /* =======================================================
     CALCULAR TARDANZA
  ======================================================= */

  const lateMinutes =
    (() => {
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
        realMin -
        scheduledMin;

      return diff > 10
        ? diff - 10
        : 0;
    })();

  /* =======================================================
     CALCULAR HORAS A PAGAR
  ======================================================= */

  const baseHours =
    record.discount
      ? record.paidHours +
        record.lateMinutes /
          60
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
    calculatedPaidHours.toFixed(
      2
    );

  /* =======================================================
     GUARDAR CAMBIOS
  ======================================================= */

  const saveChanges =
    async () => {
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

        setRecords(
          prev =>
            prev.map(
              r =>
                r.id ===
                record.id
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

  const deleteRow =
    async () => {
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

        setRecords(
          prev =>
            prev.filter(
              r =>
                r.id !==
                record.id
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

      <td className="p-4 w-12 text-center">

        <input
          type="checkbox"
          checked={selected}
          onChange={() =>
            onToggleSelect(
              record.id
            )
          }
          className="h-4 w-4"
          title="Seleccionar asistencia"
        />

      </td>

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
          value={
            realStart
          }
          onChange={e =>
            setRealStart(
              e.target.value
            )
          }
          className="border rounded-lg px-2 py-1 text-sm bg-white"
        />

      </td>

      <td className="p-4">

        {lateMinutes ===
        0 ? (

          <span className="text-green-600 font-medium">
            A tiempo
          </span>

        ) : (

          <span className="text-red-600 font-medium">
            {lateMinutes}{' '}
            min
          </span>

        )}

      </td>

      <td className="p-4">

        <input
          type="checkbox"
          checked={
            discount
          }
          onChange={e =>
            setDiscount(
              e.target
                .checked
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
            onClick={
              saveChanges
            }
            className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded-lg text-sm"
          >
            Guardar
          </button>

          <button
            onClick={
              deleteRow
            }
            className="bg-red-600 hover:bg-red-700 text-white px-3 py-1 rounded-lg text-sm"
          >
            Eliminar
          </button>

        </div>

      </td>

    </tr>
  );
}