import { useMemo, useState, useEffect } from 'react';
import * as XLSX from 'xlsx';

type Assignment = {
  id: number;
  day: number;
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
  employee: string;
  branch: string;
  date: string;
  scheduledStart: string;
  realStart: string;
  lateMinutes: number;
  discount: boolean;
  paidHours: number;
};

type Props = {
  assignments: Assignment[];
  employees: Employee[];
  shiftTypes?: {
    id: number;
    name: string;
    hours?: string;
    start?: string;
    end?: string;
    start2?: string;
    end2?: string;
    isSplit?: boolean;
  }[];
};

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
  'IPANEMA': 'IPANEMA',
  'MIRA RIO': 'MIRA RIO',
  'PINOS': 'PINOS',
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

  if (!text) return '';

  /*
   * Intentamos convertir fechas como:
   * Ago-01-2026
   * Ago-26-2026
   */

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

  /*
   * Formato dd/mm/yyyy
   */

  const slashMatch = text.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);

  if (slashMatch) {
    const day = Number(slashMatch[1]);
    const month = Number(slashMatch[2]);
    const year = Number(slashMatch[3]);

    return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(
      2,
      '0'
    )}`;
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

    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(
      2,
      '0'
    )}`;
  }

  const text = String(value ?? '').trim();

  if (!text) return '';

  /*
   * Puede venir como:
   * 6:57:00
   * 06:57
   */

  const match = text.match(/^(\d{1,2}):(\d{1,2})(?::(\d{1,2}))?/);

  if (match) {
    const hours = Number(match[1]);
    const minutes = Number(match[2]);

    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(
      2,
      '0'
    )}`;
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
  const [selectedEmployee, setSelectedEmployee] = useState('Todos');

  const [records, setRecords] = useState<AttendanceRecord[]>(() => {
    const saved = localStorage.getItem('attendanceRecords');
    return saved ? JSON.parse(saved) : [];
  });

  useEffect(() => {
    localStorage.setItem('attendanceRecords', JSON.stringify(records));
  }, [records]);

  const todayDay = Number(selectedDate.split('-')[2]);

  /* =========================================================
     TURNOS DEL DÍA
  ========================================================= */

  const todayAssignments = useMemo(() => {
    return assignments.filter(a => {
      const dayOk = a.day === todayDay;

      const branchOk =
        selectedBranch === 'Todas' || a.branch === selectedBranch;

      const employeeOk =
        selectedEmployee === 'Todos' || a.employee === selectedEmployee;

      return dayOk && branchOk && employeeOk;
    });
  }, [
    assignments,
    todayDay,
    selectedBranch,
    selectedEmployee,
  ]);

  /* =========================================================
     LISTAS
  ========================================================= */

  const branches = Array.from(
    new Set(assignments.map(a => a.branch))
  );

  const employeesList = Array.from(
    new Set(
      assignments
        .filter(a =>
          selectedBranch === 'Todas' || a.branch === selectedBranch
        )
        .map(a => a.employee)
    )
  );

  /* =========================================================
     REGISTROS FILTRADOS
  ========================================================= */

  const filteredRecords = records.filter(r => {
    const dateOk = r.date === selectedDate;

    const branchOk =
      selectedBranch === 'Todas' || r.branch === selectedBranch;

    const employeeOk =
      selectedEmployee === 'Todos' || r.employee === selectedEmployee;

    return dateOk && branchOk && employeeOk;
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
      const [sh, sm] = turno.start.split(':').map(Number);
      const [eh, em] = turno.end.split(':').map(Number);

      let startMin = sh * 60 + sm;
      let endMin = eh * 60 + em;

      if (endMin < startMin) {
        endMin += 24 * 60;
      }

      hours = (endMin - startMin) / 60;

      if (turno.isSplit && turno.start2 && turno.end2) {
        const [s2h, s2m] = turno.start2.split(':').map(Number);
        const [e2h, e2m] = turno.end2.split(':').map(Number);

        hours +=
          (e2h * 60 + e2m - (s2h * 60 + s2m)) / 60;
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
  ========================================================= */

  const calculateLate = (
    scheduled: string,
    real: string
  ) => {
    if (!scheduled || !real) return 0;

    const [sh, sm] = scheduled.split(':').map(Number);
    const [rh, rm] = real.split(':').map(Number);

    const scheduledMin = sh * 60 + sm;
    const realMin = rh * 60 + rm;

    const diff = realMin - scheduledMin;

    return diff > 10 ? diff - 10 : 0;
  };

  /* =========================================================
     GUARDAR ASISTENCIA MANUAL
  ========================================================= */

  const saveAttendance = (
    assignment: Assignment,
    realStart: string,
    discount: boolean
  ) => {
    const info = getShiftInfo(assignment.shift);

    const lateMinutes = calculateLate(
      info.start,
      realStart
    );

    const paidHours = discount
      ? Math.max(
          info.hours - lateMinutes / 60,
          0
        )
      : info.hours;

    setRecords(prev => [
      ...prev,
      {
        id: Date.now(),
        employee: assignment.employee,
        branch: assignment.branch,
        date: selectedDate,
        scheduledStart: info.start,
        realStart,
        lateMinutes,
        discount,
        paidHours: Number(paidHours.toFixed(2)),
      },
    ]);
  };

  /* =========================================================
     IMPORTAR LOG
  ========================================================= */

  const importLog = (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];

    if (!file) return;

    const reader = new FileReader();

    reader.onload = e => {
      try {
        const data = new Uint8Array(
          e.target?.result as ArrayBuffer
        );

        const workbook = XLSX.read(data, {
          type: 'array',
          cellDates: true,
        });

        const firstSheetName = workbook.SheetNames[0];

        if (!firstSheetName) {
          alert('El archivo no contiene hojas.');
          return;
        }

        const worksheet =
          workbook.Sheets[firstSheetName];

        const rows = XLSX.utils.sheet_to_json<
          Record<string, unknown>
        >(worksheet, {
          defval: '',
        });

        if (rows.length === 0) {
          alert('El archivo no contiene registros.');
          return;
        }

        /* ================================================
           DETECTAR COLUMNAS
        ================================================= */

        const firstRow = rows[0];

        const keys = Object.keys(firstRow);

        const findColumn = (
          possibleNames: string[]
        ) => {
          return keys.find(key =>
            possibleNames.includes(
              normalizeText(key)
            )
          );
        };

        const dateColumn = findColumn([
          'FECHA',
          'FECHAHORA',
          'FECHA HORA',
        ]);

        const timeColumn = findColumn([
          'HORA',
          'HORA DE ENTRADA',
        ]);

        const usernameColumn = findColumn([
          'USUARIO',
          'USER',
          'USERNAME',
        ]);

        const nameColumn = findColumn([
          'NOMBRE',
          'NOMBRE USUARIO',
        ]);

        const pcColumn = findColumn([
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

        /* ================================================
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

        const logRecords: LogRecord[] = [];

        rows.forEach(row => {
          const date = excelDateToISO(
            row[dateColumn]
          );

          const time = excelTimeToHHMM(
            row[timeColumn]
          );

          const username = String(
            row[usernameColumn] ?? ''
          ).trim();

          const name = nameColumn
            ? String(row[nameColumn] ?? '').trim()
            : '';

          const pc = normalizeText(
            row[pcColumn]
          );

          if (!date || !time || !username || !pc) {
            return;
          }

          const branch = PC_TO_BRANCH[pc];

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

        if (logRecords.length === 0) {
          alert(
            'No se encontraron registros válidos en el archivo.'
          );

          return;
        }

        /* ================================================
           AGRUPAR:
           FECHA + USUARIO + SEDE
        ================================================= */

        const grouped = new Map<
          string,
          LogRecord[]
        >();

        logRecords.forEach(log => {
          const key = `${log.date}|${normalizeText(
            log.username
          )}|${normalizeText(log.branch)}`;

          if (!grouped.has(key)) {
            grouped.set(key, []);
          }

          grouped.get(key)!.push(log);
        });

        const newRecords: AttendanceRecord[] = [];

        const unknownUsers = new Set<string>();

        const noAssignment: string[] = [];

        grouped.forEach(group => {
          group.sort((a, b) =>
            a.time.localeCompare(b.time)
          );

          const first = group[0];

          /* ==============================================
             BUSCAR EMPLEADO POR USUARIO
          ============================================== */

          const employee = employees.find(
            emp =>
              normalizeText(emp.username) ===
              normalizeText(first.username)
          );

          if (!employee) {
            unknownUsers.add(first.username);
            return;
          }

          /* ==============================================
             BUSCAR ASIGNACIÓN DEL DÍA
          ============================================== */

          const dateParts = first.date.split('-');

          const day = Number(dateParts[2]);

          const assignment = assignments.find(a => {
            return (
              a.day === day &&
              normalizeText(a.branch) ===
                normalizeText(first.branch) &&
              normalizeText(a.employee) ===
                normalizeText(employee.name)
            );
          });

          if (!assignment) {
            noAssignment.push(
              `${first.date} | ${employee.name} | ${first.branch}`
            );

            return;
          }

          const info = getShiftInfo(
            assignment.shift
          );

          const lateMinutes = calculateLate(
            info.start,
            first.time
          );

          const paidHours = info.hours;

          /*
           * Evitar duplicados:
           * Fecha + empleado + sede
           */

          const alreadyExists = records.some(
            record =>
              record.date === first.date &&
              normalizeText(record.employee) ===
                normalizeText(employee.name) &&
              normalizeText(record.branch) ===
                normalizeText(first.branch)
          );

          if (alreadyExists) {
            return;
          }

          newRecords.push({
            id:
              Date.now() +
              Math.floor(Math.random() * 1000000),

            employee: employee.name,

            branch: first.branch,

            date: first.date,

            scheduledStart: info.start,

            realStart: first.time,

            lateMinutes,

            discount: false,

            paidHours: Number(
              paidHours.toFixed(2)
            ),
          });
        });

        /* ================================================
           GUARDAR
        ================================================= */

        if (newRecords.length > 0) {
          setRecords(prev => [
            ...prev,
            ...newRecords,
          ]);
        }

        /* ================================================
           MENSAJE FINAL
        ================================================= */

        let message =
          `Importación terminada.\n\n` +
          `Registros del log: ${logRecords.length}\n` +
          `Asistencias agregadas: ${newRecords.length}`;

        if (unknownUsers.size > 0) {
          message +=
            `\n\nUsuarios no encontrados:\n` +
            Array.from(unknownUsers).join(', ');
        }

        if (noAssignment.length > 0) {
          message +=
            `\n\nSin turno asignado:\n` +
            noAssignment.slice(0, 20).join('\n');

          if (noAssignment.length > 20) {
            message +=
              `\n... y ${
                noAssignment.length - 20
              } más.`;
          }
        }

        alert(message);

        /*
         * Cambiar automáticamente la fecha al primer
         * registro importado si es necesario.
         */

        if (newRecords.length > 0) {
          setSelectedDate(
            newRecords[0].date
          );
        }
      } catch (error) {
        console.error(error);

        alert(
          'Ocurrió un error al leer el archivo Excel.'
        );
      }
    };

    reader.readAsArrayBuffer(file);

    /*
     * Permite volver a seleccionar el mismo archivo
     */

    event.target.value = '';
  };

  /* =========================================================
     EXPORTAR EXCEL
  ========================================================= */

  const exportExcel = () => {
    if (records.length === 0) {
      alert('No hay registros para exportar');
      return;
    }

    const asistenciaData = records.map(r => ({
      Fecha: r.date,
      Sede: r.branch,
      Empleado: r.employee,
      'Hora programada': r.scheduledStart,
      'Hora real': r.realStart,
      'Minutos tarde': r.lateMinutes,
      Descuento: r.discount ? 'Sí' : 'No',
      'Horas a pagar': r.paidHours,
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
        resumenMap.set(r.employee, {
          Empleado: r.employee,
          Sede: r.branch,
          'Días trabajados': 0,
          'Llegadas tarde': 0,
          'Minutos tarde': 0,
          'Horas normales': 0,
          'Horas extra': 0,
          'Horas a pagar': 0,
        });
      }

      const item =
        resumenMap.get(r.employee)!;

      item['Días trabajados'] += 1;

      if (r.lateMinutes > 0) {
        item['Llegadas tarde'] += 1;
        item['Minutos tarde'] +=
          r.lateMinutes;
      }

      item['Horas a pagar'] += r.paidHours;
    });

    resumenMap.forEach(item => {
      item['Horas normales'] = Math.min(
        item['Horas a pagar'],
        210
      );

      item['Horas extra'] = Math.max(
        item['Horas a pagar'] - 210,
        0
      );
    });

    const resumenData =
      Array.from(resumenMap.values());

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

    const wb = XLSX.utils.book_new();

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

          {/* IMPORTAR LOG */}

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

              <option>
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

              <option>
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
              getShiftInfo(a.shift);

            return (
              <AttendanceCard
                key={a.id}
                assignment={a}
                start={info.start}
                hours={info.hours}
                onSave={saveAttendance}
              />
            );

          })}

        </div>

      </div>

      {/* REGISTROS */}

      <div className="bg-white rounded-2xl border overflow-hidden">

        <div className="p-5 border-b">

          <h3 className="text-lg font-bold">
            Registros del día — {selectedDate} —{' '}
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

              {filteredRecords.length === 0 ? (

                <tr>

                  <td
                    colSpan={9}
                    className="p-6 text-center text-slate-400"
                  >
                    Aún no se han guardado registros de
                    asistencia hoy.
                  </td>

                </tr>

              ) : (

                filteredRecords.map(r => (

                  <EditableRow
                    key={r.id}
                    record={r}
                    setRecords={setRecords}
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
  ) => void;
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
            Programado: {start} · {hours} h
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
}: {
  record: AttendanceRecord;
  setRecords: React.Dispatch<
    React.SetStateAction<AttendanceRecord[]>
  >;
}) {
  const [realStart, setRealStart] =
    useState(record.realStart);

  const [discount, setDiscount] =
    useState(record.discount);

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

  const paidHours = discount
    ? Math.max(
        record.paidHours -
          lateMinutes / 60,
        0
      ).toFixed(2)
    : record.paidHours.toFixed(2);

  const saveChanges = () => {
    setRecords(prev =>
      prev.map(r =>
        r.id === record.id
          ? {
              ...r,
              realStart,
              discount,
              lateMinutes,
              paidHours:
                Number(paidHours),
            }
          : r
      )
    );
  };

  const deleteRow = () => {
    if (
      confirm(
        '¿Eliminar este registro?'
      )
    ) {
      setRecords(prev =>
        prev.filter(
          r => r.id !== record.id
        )
      );
    }
  };

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