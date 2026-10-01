import { useEffect, useMemo, useState } from "react";

type Employee = {
  id: number;
  name: string;
  document?: string;
  role?: string;
  username: string;
  status: string;
};

type ShiftType = {
  id: number;
  name: string;
  hours?: string | number;
  start?: string;
  end?: string;
  isSplit?: boolean;
  start2?: string;
  end2?: string;
  color?: string;
};

type Assignment = {
  id: number;
  day: number;
  month: number;
  year: number;
  branch: string;
  employee: string;
  shift: string;
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

type DashboardProps = {
  employees: Employee[];
  assignments: Assignment[];
  shiftTypes: ShiftType[];
  setPage?: (page: string) => void;
  selectedBranch?: string;
  setSelectedBranch?: (branch: string) => void;
};

const API_URL = (
  import.meta.env.VITE_API_URL ||
  "https://crm-rrhh-backend.onrender.com"
).replace(/\/$/, "");

const MONTHS = [
  "Enero",
  "Febrero",
  "Marzo",
  "Abril",
  "Mayo",
  "Junio",
  "Julio",
  "Agosto",
  "Septiembre",
  "Octubre",
  "Noviembre",
  "Diciembre",
];

/* =========================================================
   HORAS ENTRE DOS HORAS
========================================================= */

function hoursBetween(start?: string, end?: string) {
  if (!start || !end) return 0;

  const [sh, sm] = start.split(":").map(Number);
  const [eh, em] = end.split(":").map(Number);

  const startMin = sh * 60 + sm;
  let endMin = eh * 60 + em;

  if (endMin < startMin) {
    endMin += 24 * 60;
  }

  return (endMin - startMin) / 60;
}

/* =========================================================
   HORAS TOTALES DEL TURNO
========================================================= */

function totalShiftHours(shift: ShiftType) {
  const first = hoursBetween(shift.start, shift.end);

  if (!shift.isSplit) {
    if (first === 0 && shift.hours !== undefined) {
      return Number(shift.hours) || 0;
    }

    return first;
  }

  const second = hoursBetween(
    shift.start2,
    shift.end2
  );

  return first + second;
}

/* =========================================================
   COMPONENTE
========================================================= */

export default function Dashboard({
  employees,
  assignments,
  shiftTypes,
}: DashboardProps) {
  const today = new Date();

  const [selectedMonth, setSelectedMonth] =
    useState(today.getMonth());

  const [selectedYear, setSelectedYear] =
    useState(today.getFullYear());

  const [attendance, setAttendance] =
    useState<AttendanceRecord[]>([]);

  const [loadingAttendance, setLoadingAttendance] =
    useState(true);

  const [attendanceError, setAttendanceError] =
    useState("");

  const [expandedEmployee, setExpandedEmployee] =
    useState<string | null>(null);

  /* =========================================================
     CARGAR ASISTENCIAS
     
     IMPORTANTE:
     Usa exactamente la misma estructura
     que utiliza Attendance.tsx:
     
     record.empleado_id
     record.sede_id
     record.fecha
     record.scheduled_start
     record.real_start
     record.late_minutes
     record.discount
     record.paid_hours
  ========================================================= */

  useEffect(() => {
    const loadAttendance = async () => {
      try {
        setLoadingAttendance(true);
        setAttendanceError("");

        const token = localStorage.getItem("token");

        if (!token) {
          throw new Error("Sesión no encontrada.");
        }

        /* ---------------------------------------------
           ASISTENCIAS
        --------------------------------------------- */

        const attendanceResponse = await fetch(
          `${API_URL}/api/asistencias`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );

        if (!attendanceResponse.ok) {
          throw new Error(
            `No se pudieron cargar las asistencias. Error ${attendanceResponse.status}`
          );
        }

        const data = await attendanceResponse.json();

        /* ---------------------------------------------
           SEDES
        --------------------------------------------- */

        const sedesResponse = await fetch(
          `${API_URL}/api/sedes`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );

        if (!sedesResponse.ok) {
          throw new Error(
            "No se pudieron cargar las sedes."
          );
        }

        const sedes = await sedesResponse.json();

        const sedeMap = new Map<number, string>();

        sedes.forEach((sede: any) => {
          sedeMap.set(
            Number(sede.id),
            String(sede.nombre ?? "")
          );
        });

        /* ---------------------------------------------
           MAPEAR EXACTAMENTE COMO ASISTENCIA
        --------------------------------------------- */

        const formattedRecords: AttendanceRecord[] =
          Array.isArray(data)
            ? data.map((record: any) => {
                const employee = employees.find(
                  emp =>
                    Number(emp.id) ===
                    Number(record.empleado_id)
                );

                return {
                  id: Number(record.id),

                  employeeId:
                    Number(record.empleado_id),

                  branchId:
                    Number(record.sede_id),

                  employee:
                    employee?.name ||
                    `Empleado ${record.empleado_id}`,

                  branch:
                    sedeMap.get(
                      Number(record.sede_id)
                    ) || "",

                  date:
                    String(
                      record.fecha ?? ""
                    ).slice(0, 10),

                  scheduledStart:
                    record.scheduled_start || "",

                  realStart:
                    record.real_start ||
                    record.hora_entrada ||
                    "",

                  /* ESTE ES EL CAMPO REAL
                     DE TARDANZAS DEL BACKEND */

                  lateMinutes:
                    Number(
                      record.late_minutes
                    ) || 0,

                  discount:
                    Boolean(record.discount),

                  paidHours:
                    Number(
                      record.paid_hours
                    ) || 0,
                };
              })
            : [];

        setAttendance(formattedRecords);
      } catch (error) {
        console.error(
          "Error cargando asistencias:",
          error
        );

        setAttendanceError(
          error instanceof Error
            ? error.message
            : "No fue posible cargar las asistencias."
        );

        setAttendance([]);
      } finally {
        setLoadingAttendance(false);
      }
    };

    loadAttendance();
  }, [employees]);

  /* =========================================================
     MAPA DE TURNOS
  ========================================================= */

  const shiftHours = useMemo(() => {
    const map = new Map<string, number>();

    shiftTypes.forEach(shift => {
      map.set(
        shift.name.trim().toLowerCase(),
        totalShiftHours(shift)
      );
    });

    return map;
  }, [shiftTypes]);

  /* =========================================================
     OBTENER HORAS DEL TURNO
  ========================================================= */

  const getShiftHours = (shiftName: string) => {
    const normalized =
      shiftName.trim().toLowerCase();

    if (
      normalized === "descanso" ||
      normalized === "ausente" ||
      normalized === "incapacidad"
    ) {
      return 0;
    }

    return (
      shiftHours.get(normalized) || 0
    );
  };

  /* =========================================================
     ASIGNACIONES DEL MES
     
     IMPORTANTE:
     Las horas programadas salen del calendario.
     NO salen de asistencia.
  ========================================================= */

  const assignmentsForPeriod = useMemo(() => {
    return assignments.filter(
      assignment =>
        Number(assignment.month) ===
          selectedMonth &&
        Number(assignment.year) ===
          selectedYear
    );
  }, [
    assignments,
    selectedMonth,
    selectedYear,
  ]);

  /* =========================================================
     HORAS POR EMPLEADO
  ========================================================= */

  const employeeHours = useMemo(() => {
    const map = new Map<string, number>();

    assignmentsForPeriod.forEach(
      assignment => {
        const employeeKey =
          assignment.employee
            .trim()
            .toLowerCase();

        const hours =
          getShiftHours(
            assignment.shift
          );

        map.set(
          employeeKey,
          (map.get(employeeKey) || 0) +
            hours
        );
      }
    );

    return map;
  }, [
    assignmentsForPeriod,
    shiftHours,
  ]);

  /* =========================================================
     EMPLEADOS CON MÁS DE 210 HORAS
  ========================================================= */

  const employeesWithOvertime =
    useMemo(() => {
      return employees
        .map(employee => {
          const key =
            employee.name
              .trim()
              .toLowerCase();

          const hours =
            employeeHours.get(key) || 0;

          return {
            employee,
            hours,
            overtime: Math.max(
              0,
              hours - 210
            ),
          };
        })
        .filter(
          item =>
            item.overtime > 0
        )
        .sort(
          (a, b) =>
            b.overtime -
            a.overtime
        );
    }, [
      employees,
      employeeHours,
    ]);

  /* =========================================================
     ASISTENCIAS DEL MES SELECCIONADO
  ========================================================= */

  const attendanceForPeriod =
    useMemo(() => {
      return attendance.filter(
        record => {
          if (!record.date) {
            return false;
          }

          const parts =
            record.date.split("-");

          if (
            parts.length < 2
          ) {
            return false;
          }

          const year =
            Number(parts[0]);

          const month =
            Number(parts[1]) - 1;

          return (
            year === selectedYear &&
            month === selectedMonth
          );
        }
      );
    }, [
      attendance,
      selectedMonth,
      selectedYear,
    ]);

  /* =========================================================
     SOLO REGISTROS CON TARDANZA

     Aquí YA NO CALCULAMOS LA TARDANZA.
     Usamos directamente:
     
     record.lateMinutes
  ========================================================= */

  const lateRecords = useMemo(() => {
    return attendanceForPeriod
      .filter(
        record =>
          Number(
            record.lateMinutes
          ) > 0
      )
      .sort(
        (a, b) =>
          b.lateMinutes -
          a.lateMinutes
      );
  }, [attendanceForPeriod]);

  /* =========================================================
     AGRUPAR TARDANZAS POR EMPLEADO

     CAMBIO:
     El orden principal ahora es por CANTIDAD
     DE LLEGADAS TARDE.

     En caso de empate, se usan los minutos
     acumulados como desempate.
  ========================================================= */

  const lateEmployees = useMemo(() => {
    const grouped = new Map<
      string,
      {
        employee: string;
        lateCount: number;
        minutes: number;
        records: AttendanceRecord[];
      }
    >();

    lateRecords.forEach(record => {
      const key =
        record.employee
          .trim()
          .toLowerCase();

      const existing =
        grouped.get(key);

      if (existing) {
        existing.lateCount += 1;

        existing.minutes +=
          Number(
            record.lateMinutes
          );

        existing.records.push(
          record
        );
      } else {
        grouped.set(key, {
          employee:
            record.employee,

          lateCount: 1,

          minutes:
            Number(
              record.lateMinutes
            ),

          records: [
            record,
          ],
        });
      }
    });

    return Array.from(
      grouped.values()
    )
      .sort((a, b) => {
        /* Primero:
           cantidad de llegadas tarde */

        if (
          b.lateCount !==
          a.lateCount
        ) {
          return (
            b.lateCount -
            a.lateCount
          );
        }

        /* Desempate:
           minutos acumulados */

        return (
          b.minutes -
          a.minutes
        );
      })
      .slice(0, 5);
  }, [lateRecords]);

  /* =========================================================
     FORMATOS
  ========================================================= */

  const formatDate = (
    date: string
  ) => {
    if (!date) {
      return "-";
    }

    const parts =
      date.split("-");

    if (
      parts.length !== 3
    ) {
      return date;
    }

    return `${parts[2]}/${parts[1]}/${parts[0]}`;
  };

  const formatHours = (
    hours: number
  ) => {
    return `${hours.toFixed(1)} h`;
  };

  /* =========================================================
     RENDER
  ========================================================= */

  return (
    <div className="space-y-6">

      {/* =====================================================
          ENCABEZADO
      ===================================================== */}

      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">

        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Dashboard RRHH
          </h1>

          <p className="mt-1 text-sm text-gray-500">
            Seguimiento de tardanzas y
            horas extra del período
            seleccionado.
          </p>
        </div>

        <div className="flex items-center gap-2">

          <select
            value={selectedMonth}
            onChange={e =>
              setSelectedMonth(
                Number(e.target.value)
              )
            }
            className="rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 shadow-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
          >
            {MONTHS.map(
              (
                month,
                index
              ) => (
                <option
                  key={month}
                  value={index}
                >
                  {month}
                </option>
              )
            )}
          </select>

          <select
            value={selectedYear}
            onChange={e =>
              setSelectedYear(
                Number(e.target.value)
              )
            }
            className="rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 shadow-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
          >
            {[2025, 2026, 2027].map(
              year => (
                <option
                  key={year}
                  value={year}
                >
                  {year}
                </option>
              )
            )}
          </select>

        </div>
      </div>

      {/* =====================================================
          TARDANZAS
      ===================================================== */}

      <section className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">

        <div className="border-b border-gray-100 px-6 py-5">

          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">

            <div>

              <div className="flex items-center gap-2">

                <span className="text-xl">
                  🕐
                </span>

                <h2 className="text-lg font-bold text-gray-900">
                  Personas con más
                  tardanzas
                </h2>

              </div>

              <p className="mt-1 text-sm text-gray-500">
                Todas las sedes ·{" "}
                {MONTHS[selectedMonth]}{" "}
                {selectedYear}
              </p>

            </div>

            <div className="rounded-full bg-gray-50 px-3 py-1.5 text-xs font-semibold text-gray-600">
              Top 5
            </div>

          </div>

        </div>

        <div className="p-6">

          {loadingAttendance ? (

            <div className="flex items-center justify-center py-10">

              <div className="h-7 w-7 animate-spin rounded-full border-2 border-gray-200 border-t-blue-600" />

              <span className="ml-3 text-sm text-gray-500">
                Cargando reportes de
                asistencia...
              </span>

            </div>

          ) : attendanceError ? (

            <div className="rounded-xl border border-red-100 bg-red-50 p-4 text-sm text-red-700">
              {attendanceError}
            </div>

          ) : lateEmployees.length === 0 ? (

            <div className="flex flex-col items-center justify-center py-10 text-center">

              <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-green-50 text-2xl">
                ✅
              </div>

              <h3 className="font-semibold text-gray-900">
                No hay registros de
                tardanzas
              </h3>

              <p className="mt-1 max-w-md text-sm text-gray-500">
                Aún no existen llegadas
                tarde registradas en
                este período.
              </p>

            </div>

          ) : (

            <div className="space-y-3">

              {lateEmployees.map(
                (
                  item,
                  index
                ) => {

                  const key =
                    item.employee
                      .trim()
                      .toLowerCase();

                  const expanded =
                    expandedEmployee ===
                    key;

                  return (

                    <div
                      key={key}
                      className="overflow-hidden rounded-xl border border-gray-100 bg-gray-50 transition hover:border-gray-200 hover:bg-white"
                    >

                      <button
                        type="button"
                        onClick={() =>
                          setExpandedEmployee(
                            expanded
                              ? null
                              : key
                          )
                        }
                        className="flex w-full items-center gap-4 p-4 text-left"
                      >

                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white text-sm font-bold text-gray-700 shadow-sm">
                          {index + 1}
                        </div>

                        <div className="min-w-0 flex-1">

                          <p className="truncate font-semibold text-gray-900">
                            {item.employee}
                          </p>

                          <p className="mt-0.5 text-xs text-gray-500">
                            {item.records.length}{" "}
                            llegada
                            {item.records.length !==
                            1
                              ? "s"
                              : ""}{" "}
                            tarde
                          </p>

                        </div>

                        <div className="text-right">

                          <p className="text-lg font-bold text-red-600">
                            {item.minutes}
                          </p>

                          <p className="text-xs text-gray-500">
                            minutos tarde
                          </p>

                        </div>

                        <span
                          className={`text-gray-400 transition-transform ${
                            expanded
                              ? "rotate-180"
                              : ""
                          }`}
                        >
                          ▼
                        </span>

                      </button>

                      {expanded && (

                        <div className="border-t border-gray-200 bg-white px-4 py-4">

                          <div className="mb-3 text-xs font-semibold uppercase tracking-wide text-gray-400">
                            Detalle de llegadas
                            tarde
                          </div>

                          <div className="overflow-x-auto">

                            <table className="w-full min-w-[650px] text-sm">

                              <thead>

                                <tr className="border-b border-gray-100 text-left text-xs uppercase tracking-wide text-gray-400">

                                  <th className="pb-3 pr-4">
                                    Fecha
                                  </th>

                                  <th className="pb-3 pr-4">
                                    Sede
                                  </th>

                                  <th className="pb-3 pr-4">
                                    Programado
                                  </th>

                                  <th className="pb-3 pr-4">
                                    Entrada real
                                  </th>

                                  <th className="pb-3 text-right">
                                    Tarde
                                  </th>

                                </tr>

                              </thead>

                              <tbody>

                                {item.records.map(
                                  record => (

                                    <tr
                                      key={
                                        record.id
                                      }
                                      className="border-b border-gray-50 last:border-0"
                                    >

                                      <td className="py-3 pr-4 text-gray-700">
                                        {formatDate(
                                          record.date
                                        )}
                                      </td>

                                      <td className="py-3 pr-4 font-medium text-gray-700">
                                        {record.branch ||
                                          "-"}
                                      </td>

                                      <td className="py-3 pr-4 text-gray-600">
                                        {record.scheduledStart ||
                                          "-"}
                                      </td>

                                      <td className="py-3 pr-4 text-gray-600">
                                        {record.realStart ||
                                          "-"}
                                      </td>

                                      <td className="py-3 text-right font-semibold text-red-600">
                                        +
                                        {
                                          record.lateMinutes
                                        }{" "}
                                        min
                                      </td>

                                    </tr>

                                  )
                                )}

                              </tbody>

                            </table>

                          </div>

                        </div>

                      )}

                    </div>

                  );
                }
              )}

            </div>

          )}

        </div>

      </section>

      {/* =====================================================
          HORAS EXTRA
      ===================================================== */}

      <section className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">

        <div className="border-b border-gray-100 px-6 py-5">

          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">

            <div>

              <div className="flex items-center gap-2">

                <span className="text-xl">
                  ⏱
                </span>

                <h2 className="text-lg font-bold text-gray-900">
                  Empleados con horas
                  extra
                </h2>

              </div>

              <p className="mt-1 text-sm text-gray-500">
                Empleados que superan las
                210 horas mensuales ·{" "}
                {MONTHS[selectedMonth]}{" "}
                {selectedYear}
              </p>

            </div>

            <div className="rounded-full bg-orange-50 px-3 py-1.5 text-xs font-semibold text-orange-700">
              {
                employeesWithOvertime.length
              }{" "}
              para revisar
            </div>

          </div>

        </div>

        <div className="overflow-x-auto">

          {employeesWithOvertime.length ===
          0 ? (

            <div className="flex flex-col items-center justify-center py-12 text-center">

              <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-green-50 text-2xl">
                ✓
              </div>

              <h3 className="font-semibold text-gray-900">
                No hay horas extra
              </h3>

              <p className="mt-1 text-sm text-gray-500">
                Ningún empleado supera
                las 210 horas
                programadas en este
                período.
              </p>

            </div>

          ) : (

            <table className="w-full min-w-[700px]">

              <thead>

                <tr className="border-b border-gray-100 bg-gray-50/70">

                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-400">
                    Empleado
                  </th>

                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-400">
                    Usuario
                  </th>

                  <th className="px-6 py-3 text-right text-xs font-semibold uppercase tracking-wide text-gray-400">
                    Horas
                  </th>

                  <th className="px-6 py-3 text-right text-xs font-semibold uppercase tracking-wide text-gray-400">
                    Horas extra
                  </th>

                </tr>

              </thead>

              <tbody>

                {employeesWithOvertime.map(
                  ({
                    employee,
                    hours,
                    overtime,
                  }) => (

                    <tr
                      key={
                        employee.id
                      }
                      className="border-b border-gray-50 transition hover:bg-gray-50"
                    >

                      <td className="px-6 py-4">

                        <p className="font-semibold text-gray-900">
                          {employee.name}
                        </p>

                        {employee.role && (

                          <p className="mt-0.5 text-xs text-gray-500">
                            {employee.role}
                          </p>

                        )}

                      </td>

                      <td className="px-6 py-4 text-sm text-gray-600">
                        {employee.username ||
                          "-"}
                      </td>

                      <td className="px-6 py-4 text-right">

                        <span className="font-semibold text-gray-800">
                          {formatHours(
                            hours
                          )}
                        </span>

                      </td>

                      <td className="px-6 py-4 text-right">

                        <span className="inline-flex rounded-full bg-orange-50 px-3 py-1 text-sm font-bold text-orange-700">
                          +
                          {formatHours(
                            overtime
                          )}
                        </span>

                      </td>

                    </tr>

                  )
                )}

              </tbody>

            </table>

          )}

        </div>

      </section>

    </div>
  );
}