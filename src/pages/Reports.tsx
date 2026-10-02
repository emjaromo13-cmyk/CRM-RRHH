import React, { useEffect, useMemo, useState } from "react";
import * as XLSX from "xlsx";

type Assignment = {
  id: number;
  day: number;
  month: number;
  year: number;
  branch: string;
  employee: string;
  shift: string;
};

type ShiftType = {
  id: number;
  name: string;
  hours?: string | number;
  start?: string;
  end?: string;
  start2?: string;
  end2?: string;
  isSplit?: boolean;
};

type AttendanceRecord = {
  id: number;
  employeeId?: number;
  branchId?: number;
  employee: string;
  branch: string;
  date: string;
  scheduledStart?: string;
  realStart?: string;
  lateMinutes: number;
  discount: boolean;
  paidHours: number;
};

type Novedad = {
  id: number;
  empleado_id: number;
  empleado_nombre?: string;
  documento?: string;
  cargo?: string;
  sede_id?: number;
  sede_nombre?: string;
  tipo_novedad: string;
  fecha_inicio: string;
  fecha_fin?: string | null;
  dias?: number;
  estado?: string;
  afecta_nomina?: boolean;
  tratamiento_nomina?: string;
  observacion?: string;
  periodo_nomina?: string;
  valor?: number | string;
  observacion_nomina?: string;
  soporte_url?: string;
  creado_por?: string;
  created_at?: string;
};

type EmployeeData = {
  id: number;
  nombre: string;
  documento?: string;
  cargo?: string;
  sede_id?: number;
  username?: string;
  estado?: string;
};

type BranchData = {
  id: number;
  nombre: string;
  zona?: string;
  lider?: string;
  activo?: boolean;
};

type ReportsProps = {
  assignments: Assignment[];
  shiftTypes: ShiftType[];
};

const API_URL = (
  import.meta.env.VITE_API_URL ||
  "https://crm-rrhh-backend.onrender.com"
).replace(/\/api\/?$/, "");

const HORAS_NORMALES_MES = 210;

/* =========================================================
   FECHAS
   ========================================================= */

const getDateParts = (
  value?: string | Date | null
): { year: number; month: number; day: number } | null => {
  if (!value) return null;

  if (value instanceof Date) {
    if (Number.isNaN(value.getTime())) return null;

    return {
      year: value.getFullYear(),
      month: value.getMonth() + 1,
      day: value.getDate(),
    };
  }

  const text = String(value).trim();

  const match = text.match(/^(\d{4})-(\d{2})-(\d{2})/);

  if (match) {
    return {
      year: Number(match[1]),
      month: Number(match[2]),
      day: Number(match[3]),
    };
  }

  const slash = text.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);

  if (slash) {
    return {
      year: Number(slash[3]),
      month: Number(slash[2]),
      day: Number(slash[1]),
    };
  }

  return null;
};

const dateToNumber = (
  year: number,
  month: number,
  day: number
): number => {
  return year * 10000 + month * 100 + day;
};

const formatDate = (value?: string | null): string => {
  const parts = getDateParts(value);

  if (!parts) return "";

  return `${String(parts.day).padStart(2, "0")}/${String(
    parts.month
  ).padStart(2, "0")}/${parts.year}`;
};

const getDaysInMonth = (
  year: number,
  month: number
): number => {
  return new Date(year, month, 0).getDate();
};

/* =========================================================
   NORMALIZACIÓN
   ========================================================= */

const normalizeText = (
  value?: string | null
): string => {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toUpperCase();
};

/* =========================================================
   NOVEDADES
   ========================================================= */

const getNoveltyDaysInSelectedMonth = (
  novelty: Novedad,
  selectedYear: number,
  selectedMonth: number
): number => {
  const startParts = getDateParts(
    novelty.fecha_inicio
  );

  if (!startParts) return 0;

  const endParts =
    getDateParts(
      novelty.fecha_fin ||
        novelty.fecha_inicio
    ) || startParts;

  const selectedStart = dateToNumber(
    selectedYear,
    selectedMonth + 1,
    1
  );

  const selectedEnd = dateToNumber(
    selectedYear,
    selectedMonth + 1,
    getDaysInMonth(
      selectedYear,
      selectedMonth + 1
    )
  );

  const noveltyStart = dateToNumber(
    startParts.year,
    startParts.month,
    startParts.day
  );

  const noveltyEnd = dateToNumber(
    endParts.year,
    endParts.month,
    endParts.day
  );

  if (
    noveltyEnd < selectedStart ||
    noveltyStart > selectedEnd
  ) {
    return 0;
  }

  const effectiveStart = Math.max(
    noveltyStart,
    selectedStart
  );

  const effectiveEnd = Math.min(
    noveltyEnd,
    selectedEnd
  );

  const startYear = Math.floor(
    effectiveStart / 10000
  );

  const startMonth = Math.floor(
    (effectiveStart % 10000) / 100
  );

  const startDay = effectiveStart % 100;

  const endYear = Math.floor(
    effectiveEnd / 10000
  );

  const endMonth = Math.floor(
    (effectiveEnd % 10000) / 100
  );

  const endDay = effectiveEnd % 100;

  const startDate = new Date(
    startYear,
    startMonth - 1,
    startDay
  );

  const endDate = new Date(
    endYear,
    endMonth - 1,
    endDay
  );

  const difference =
    Math.floor(
      (endDate.getTime() -
        startDate.getTime()) /
        (1000 * 60 * 60 * 24)
    ) + 1;

  return Math.max(0, difference);
};

/* =========================================================
   COMPONENTE
   ========================================================= */

const Reports: React.FC<ReportsProps> = ({
  assignments,
  shiftTypes,
}) => {
  const today = new Date();

  const [selectedMonth, setSelectedMonth] =
    useState(today.getMonth());

  const [selectedYear, setSelectedYear] =
    useState(today.getFullYear());

  const [selectedBranch, setSelectedBranch] =
    useState("TODAS");

  const [employees, setEmployees] =
    useState<EmployeeData[]>([]);

  const [attendance, setAttendance] =
    useState<AttendanceRecord[]>([]);

  const [novedades, setNovedades] =
    useState<Novedad[]>([]);

  const [branchesData, setBranchesData] =
    useState<BranchData[]>([]);

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState("");

  /* =======================================================
     CARGAR INFORMACIÓN
     ======================================================= */

  useEffect(() => {
    cargarDatos();
  }, []);

  const cargarDatos = async () => {
    setLoading(true);
    setError("");

    try {
      const token =
        localStorage.getItem("token");

      const headers: HeadersInit = {
        "Content-Type": "application/json",
      };

      if (token) {
        headers.Authorization =
          `Bearer ${token}`;
      }

      const [
        attendanceResponse,
        novedadesResponse,
        employeesResponse,
        branchesResponse,
      ] = await Promise.all([
        fetch(
          `${API_URL}/api/asistencias`,
          { headers }
        ),
        fetch(
          `${API_URL}/api/novedades-nomina`,
          { headers }
        ),
        fetch(
          `${API_URL}/api/empleados`,
          { headers }
        ),
        fetch(
          `${API_URL}/api/sedes`,
          { headers }
        ),
      ]);

      if (!attendanceResponse.ok) {
        throw new Error(
          `Error cargando asistencias: ${attendanceResponse.status}`
        );
      }

      if (!employeesResponse.ok) {
        throw new Error(
          `Error cargando empleados: ${employeesResponse.status}`
        );
      }

      const attendanceData =
        await attendanceResponse.json();

      /* =====================================================
         NOVEDADES
         ===================================================== */

      let novedadesData: Novedad[] = [];

      if (novedadesResponse.ok) {
        const parsed =
          await novedadesResponse.json();

        if (Array.isArray(parsed)) {
          novedadesData = parsed;
        } else if (
          Array.isArray(parsed?.data)
        ) {
          novedadesData = parsed.data;
        } else if (
          Array.isArray(parsed?.novedades)
        ) {
          novedadesData =
            parsed.novedades;
        }
      }

      /* =====================================================
         EMPLEADOS
         ===================================================== */

      let employeesData: EmployeeData[] =
        [];

      const parsedEmployees =
        await employeesResponse.json();

      let rawEmployees: any[] = [];

      if (Array.isArray(parsedEmployees)) {
        rawEmployees =
          parsedEmployees;
      } else if (
        Array.isArray(
          parsedEmployees?.data
        )
      ) {
        rawEmployees =
          parsedEmployees.data;
      } else if (
        Array.isArray(
          parsedEmployees?.empleados
        )
      ) {
        rawEmployees =
          parsedEmployees.empleados;
      }

      employeesData =
        rawEmployees.map(
          (employee: any) => ({
            id: Number(
              employee.id
            ),

            nombre:
              employee.nombre ||
              employee.name ||
              "",

            documento:
              employee.documento ||
              employee.cedula ||
              "",

            cargo:
              employee.cargo ||
              "",

            sede_id:
              employee.sede_id !==
              undefined
                ? Number(
                    employee.sede_id
                  )
                : undefined,

            username:
              employee.username ||
              "",

            estado:
              employee.estado ||
              "ACTIVO",
          })
        );

      /* =====================================================
         SEDES
         ===================================================== */

      let branchesDataResponse: BranchData[] =
        [];

      if (branchesResponse.ok) {
        const parsedBranches =
          await branchesResponse.json();

        if (Array.isArray(parsedBranches)) {
          branchesDataResponse =
            parsedBranches;
        } else if (
          Array.isArray(
            parsedBranches?.data
          )
        ) {
          branchesDataResponse =
            parsedBranches.data;
        } else if (
          Array.isArray(
            parsedBranches?.sedes
          )
        ) {
          branchesDataResponse =
            parsedBranches.sedes;
        }
      }

      /* =====================================================
         ASISTENCIAS
         ===================================================== */

      const attendanceArray =
        Array.isArray(attendanceData)
          ? attendanceData
          : Array.isArray(
              attendanceData?.data
            )
          ? attendanceData.data
          : [];

      /* =====================================================
         MAPAS
         ===================================================== */

      const employeeMap =
        new Map<number, EmployeeData>();

      employeesData.forEach(
        (employee) => {
          const id =
            Number(employee.id);

          if (
            !Number.isNaN(id)
          ) {
            employeeMap.set(
              id,
              employee
            );
          }
        }
      );

      const branchMap =
        new Map<number, BranchData>();

      branchesDataResponse.forEach(
        (branch) => {
          const id =
            Number(branch.id);

          if (
            !Number.isNaN(id)
          ) {
            branchMap.set(
              id,
              branch
            );
          }
        }
      );

      /* =====================================================
         MAPEAR ASISTENCIAS

         IMPORTANTE:

         lateMinutes y paidHours salen directamente
         desde /api/asistencias.
         ===================================================== */

      const mappedAttendance:
        AttendanceRecord[] =
        attendanceArray.map(
          (record: any) => {
            const employeeId =
              record.empleado_id !==
              undefined
                ? Number(
                    record.empleado_id
                  )
                : undefined;

            const branchId =
              record.sede_id !==
              undefined
                ? Number(
                    record.sede_id
                  )
                : undefined;

            const employeeData =
              employeeId !==
              undefined
                ? employeeMap.get(
                    employeeId
                  )
                : undefined;

            const branchData =
              branchId !==
              undefined
                ? branchMap.get(
                    branchId
                  )
                : undefined;

            return {
              id: Number(
                record.id
              ),

              employeeId,

              branchId,

              employee:
                record.empleado_nombre ||
                record.employee ||
                record.nombre ||
                employeeData?.nombre ||
                "",

              branch:
                record.sede_nombre ||
                record.branch ||
                record.sede ||
                branchData?.nombre ||
                "",

              date:
                record.fecha ||
                record.date ||
                "",

              scheduledStart:
                record.scheduled_start ||
                record.hora_programada ||
                "",

              realStart:
                record.real_start ||
                record.hora_entrada ||
                "",

              lateMinutes:
                Number(
                  record.late_minutes ??
                    record.minutos_tarde ??
                    0
                ),

              discount: Boolean(
                record.discount ??
                  record.descuento ??
                  false
              ),

              paidHours:
                Number(
                  record.paid_hours ??
                    record.horas_pagadas ??
                    0
                ) || 0,
            };
          }
        );

      /* =====================================================
         GUARDAR DATOS
         ===================================================== */

      setEmployees(
        employeesData
      );

      setBranchesData(
        branchesDataResponse
      );

      setAttendance(
        mappedAttendance
      );

      setNovedades(
        novedadesData
      );

    } catch (err: any) {
      console.error(err);

      setError(
        err?.message ||
          "No fue posible cargar la información del reporte."
      );

      setEmployees([]);
      setAttendance([]);
      setNovedades([]);
      setBranchesData([]);

    } finally {
      setLoading(false);
    }
  };

  /* =======================================================
     MESES
     ======================================================= */

  const months = [
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

  const years = useMemo(() => {
    const currentYear =
      new Date().getFullYear();

    const result: number[] = [];

    for (
      let year = currentYear - 2;
      year <= currentYear + 2;
      year++
    ) {
      result.push(year);
    }

    if (
      !result.includes(
        selectedYear
      )
    ) {
      result.push(
        selectedYear
      );
    }

    return result.sort();
  }, [selectedYear]);

  /* =======================================================
     SEDES
     ======================================================= */

  const branches = useMemo(() => {
    const values =
      new Set<string>();

    assignments.forEach(
      (assignment) => {
        if (
          assignment.branch
        ) {
          values.add(
            assignment.branch
          );
        }
      }
    );

    attendance.forEach(
      (record) => {
        if (record.branch) {
          values.add(
            record.branch
          );
        }
      }
    );

    novedades.forEach(
      (novelty) => {
        if (
          novelty.sede_nombre
        ) {
          values.add(
            novelty.sede_nombre
          );
        }
      }
    );

    branchesData.forEach(
      (branch) => {
        if (branch.nombre) {
          values.add(
            branch.nombre
          );
        }
      }
    );

    return Array.from(
      values
    ).sort((a, b) =>
      a.localeCompare(
        b,
        "es"
      )
    );
  }, [
    assignments,
    attendance,
    novedades,
    branchesData,
  ]);

  /* =======================================================
     FILTRO DE ASIGNACIONES
     ======================================================= */

  const filteredAssignments =
    useMemo(() => {
      return assignments.filter(
        (assignment) => {
          const correctMonth =
            Number(
              assignment.month
            ) === selectedMonth;

          const correctYear =
            Number(
              assignment.year
            ) === selectedYear;

          const correctBranch =
            selectedBranch ===
              "TODAS" ||
            normalizeText(
              assignment.branch
            ) ===
              normalizeText(
                selectedBranch
              );

          return (
            correctMonth &&
            correctYear &&
            correctBranch
          );
        }
      );
    }, [
      assignments,
      selectedMonth,
      selectedYear,
      selectedBranch,
    ]);

  /* =======================================================
     FILTRO ASISTENCIAS
     ======================================================= */

  const filteredAttendance =
    useMemo(() => {
      return attendance.filter(
        (record) => {
          const parts =
            getDateParts(
              record.date
            );

          if (!parts) {
            return false;
          }

          const correctDate =
            parts.month ===
              selectedMonth + 1 &&
            parts.year ===
              selectedYear;

          const correctBranch =
            selectedBranch ===
              "TODAS" ||
            normalizeText(
              record.branch
            ) ===
              normalizeText(
                selectedBranch
              );

          return (
            correctDate &&
            correctBranch
          );
        }
      );
    }, [
      attendance,
      selectedMonth,
      selectedYear,
      selectedBranch,
    ]);

  /* =======================================================
     FILTRO NOVEDADES
     ======================================================= */

  const filteredNovedades =
    useMemo(() => {
      return novedades.filter(
        (novelty) => {
          const days =
            getNoveltyDaysInSelectedMonth(
              novelty,
              selectedYear,
              selectedMonth
            );

          const correctBranch =
            selectedBranch ===
              "TODAS" ||
            normalizeText(
              novelty.sede_nombre
            ) ===
              normalizeText(
                selectedBranch
              );

          return (
            days > 0 &&
            correctBranch
          );
        }
      );
    }, [
      novedades,
      selectedYear,
      selectedMonth,
      selectedBranch,
    ]);

  /* =======================================================
     BUSCAR TURNO
     ======================================================= */

  const findShift = (
    shiftName: string
  ): ShiftType | undefined => {
    const normalized =
      normalizeText(
        shiftName
      );

    return shiftTypes.find(
      (shift) =>
        normalizeText(
          shift.name
        ) === normalized
    );
  };

  /* =======================================================
     HORAS DE ASISTENCIAS

     IMPORTANTE:
     Las horas salen exclusivamente
     de /api/asistencias.
     ======================================================= */

  const attendanceWithHours =
    useMemo(() => {
      return filteredAttendance.map(
        (record) => {
          const hours =
            Number(
              record.paidHours
            ) || 0;

          return {
            ...record,

            calculatedHours:
              Number(
                hours.toFixed(2)
              ),
          };
        }
      );
    }, [
      filteredAttendance,
    ]);

  /* =======================================================
     RESUMEN POR EMPLEADO
     ======================================================= */

  type EmployeeSummary = {
    employee: string;
    branches: string[];
    daysWorked: number;
    lateCount: number;
    lateMinutes: number;
    normalHours: number;
    extraHours: number;
    paidHours: number;
    noveltyCount: number;
    noveltyDays: number;
    noveltyTypes: string[];
  };

  const summary =
    useMemo<EmployeeSummary[]>(
      () => {
        const map =
          new Map<
            string,
            EmployeeSummary
          >();

        /* =================================================
           BUSCAR SEDE POR ID
           ================================================= */

        const getBranchNameById =
          (
            branchId?: number
          ): string => {
            if (
              branchId ===
                undefined ||
              branchId === null
            ) {
              return "";
            }

            const branch =
              branchesData.find(
                (item) =>
                  Number(
                    item.id
                  ) ===
                  Number(
                    branchId
                  )
              );

            return (
              branch?.nombre ||
              ""
            );
          };

        /* =================================================
           CREAR / BUSCAR EMPLEADO

           IMPORTANTE:
           LA CLAVE ES SOLAMENTE EL EMPLEADO.

           NO SE USA LA SEDE COMO CLAVE.

           Esto permite acumular:
           PINOS + GUALANDAY + cualquier otra sede
           en un solo registro del empleado.
           ================================================= */

        const ensureEmployee =
          (
            employeeName: string,
            branchName?: string
          ) => {
            const cleanEmployee =
              employeeName?.trim() ||
              "Empleado sin nombre";

            const key =
              normalizeText(
                cleanEmployee
              );

            if (
              !map.has(key)
            ) {
              map.set(key, {
                employee:
                  cleanEmployee,

                branches: [],

                daysWorked: 0,

                lateCount: 0,

                lateMinutes: 0,

                normalHours: 0,

                extraHours: 0,

                paidHours: 0,

                noveltyCount: 0,

                noveltyDays: 0,

                noveltyTypes: [],
              });
            }

            const item =
              map.get(key)!;

            const cleanBranch =
              branchName?.trim() ||
              "";

            if (
              cleanBranch &&
              !item.branches.some(
                (
                  existingBranch
                ) =>
                  normalizeText(
                    existingBranch
                  ) ===
                  normalizeText(
                    cleanBranch
                  )
              )
            ) {
              item.branches.push(
                cleanBranch
              );
            }

            return item;
          };

        /* =================================================
           1. TODOS LOS EMPLEADOS
           ================================================= */

        employees.forEach(
          (employee) => {
            const branchName =
              getBranchNameById(
                employee.sede_id
              );

            if (
              selectedBranch !==
              "TODAS"
            ) {
              const employeeBranch =
                normalizeText(
                  branchName
                );

              const selected =
                normalizeText(
                  selectedBranch
                );

              if (
                employeeBranch !==
                selected
              ) {
                return;
              }
            }

            ensureEmployee(
              employee.nombre,
              branchName ||
                "SIN SEDE"
            );
          }
        );

        /* =================================================
           2. ASISTENCIAS

           AQUÍ SE ACUMULAN TODAS LAS HORAS
           POR EMPLEADO, SIN IMPORTAR LA SEDE.

           Ejemplo:

           PINOS       120
           GUALANDAY    98
           ----------------
           TOTAL       218

           Luego se aplican las 210 horas.

           NO se hace:
           PINOS -> 120 - 210
           GUALANDAY -> 98 - 210
           ================================================= */

        attendanceWithHours.forEach(
          (record) => {
            const item =
              ensureEmployee(
                record.employee,
                record.branch
              );

            item.daysWorked += 1;

            const lateMinutes =
              Number(
                record.lateMinutes
              ) || 0;

            item.lateMinutes +=
              lateMinutes;

            if (
              lateMinutes > 0
            ) {
              item.lateCount += 1;
            }

            const paidHours =
              Number(
                record.calculatedHours
              ) || 0;

            /*
             * IMPORTANTE:
             * Esta suma es por EMPLEADO.
             * La sede solamente se guarda
             * como información.
             */
            item.paidHours +=
              paidHours;
          }
        );

        /* =================================================
           3. ASIGNACIONES

           SOLO INFORMACIÓN DE TURNOS.

           NO SUMAN HORAS.
           ================================================= */

        filteredAssignments.forEach(
          (assignment) => {
            ensureEmployee(
              assignment.employee,
              assignment.branch
            );
          }
        );

        /* =================================================
           4. NOVEDADES
           ================================================= */

        filteredNovedades.forEach(
          (novelty) => {
            const employeeName =
              novelty.empleado_nombre ||
              `Empleado ${novelty.empleado_id}`;

            const branch =
              novelty.sede_nombre ||
              "SIN SEDE";

            const item =
              ensureEmployee(
                employeeName,
                branch
              );

            item.noveltyCount +=
              1;

            const days =
              getNoveltyDaysInSelectedMonth(
                novelty,
                selectedYear,
                selectedMonth
              );

            item.noveltyDays +=
              days;

            if (
              novelty.tipo_novedad &&
              !item.noveltyTypes.includes(
                novelty.tipo_novedad
              )
            ) {
              item.noveltyTypes.push(
                novelty.tipo_novedad
              );
            }
          }
        );

        /* =================================================
           5. CALCULAR HORAS NORMALES Y EXTRA

           ESTE CÁLCULO SE HACE DESPUÉS
           DE HABER SUMADO TODAS LAS HORAS
           DEL EMPLEADO.

           218 -> 210 normales + 8 extra
           205 -> 205 normales + 0 extra
           230 -> 210 normales + 20 extra
           ================================================= */

        map.forEach(
          (item) => {
            /*
             * Primero se consolida el total
             * del empleado.
             */
            item.paidHours =
              Number(
                item.paidHours.toFixed(
                  2
                )
              );

            /*
             * Después se compara UNA SOLA VEZ
             * contra las 210 horas mensuales.
             */
            item.normalHours =
              Number(
                Math.min(
                  item.paidHours,
                  HORAS_NORMALES_MES
                ).toFixed(2)
              );

            item.extraHours =
              Number(
                Math.max(
                  item.paidHours -
                    HORAS_NORMALES_MES,
                  0
                ).toFixed(2)
              );

            item.noveltyDays =
              Number(
                item.noveltyDays.toFixed(
                  2
                )
              );

            item.branches.sort(
              (a, b) =>
                a.localeCompare(
                  b,
                  "es"
                )
            );
          }
        );

        return Array.from(
          map.values()
        ).sort((a, b) =>
          normalizeText(
            a.employee
          ).localeCompare(
            normalizeText(
              b.employee
            ),
            "es"
          )
        );
      },
      [
        employees,
        branchesData,
        attendanceWithHours,
        filteredAssignments,
        filteredNovedades,
        selectedYear,
        selectedMonth,
        selectedBranch,
      ]
    );

  /* =======================================================
     KPIs
     ======================================================= */

  const kpis = useMemo(() => {
    const collaborators =
      summary.length;

    const totalHours =
      summary.reduce(
        (total, item) =>
          total +
          item.paidHours,
        0
      );

    const extraHours =
      summary.reduce(
        (total, item) =>
          total +
          item.extraHours,
        0
      );

    const lateCount =
      summary.reduce(
        (total, item) =>
          total +
          item.lateCount,
        0
      );

    const noveltyCount =
      filteredNovedades.length;

    const noveltyDays =
      filteredNovedades.reduce(
        (total, novelty) =>
          total +
          getNoveltyDaysInSelectedMonth(
            novelty,
            selectedYear,
            selectedMonth
          ),
        0
      );

    return {
      collaborators,

      totalHours:
        Number(
          totalHours.toFixed(2)
        ),

      extraHours:
        Number(
          extraHours.toFixed(2)
        ),

      lateCount,

      noveltyCount,

      noveltyDays,
    };
  }, [
    summary,
    filteredNovedades,
    selectedYear,
    selectedMonth,
  ]);

  /* =======================================================
     EXPORTAR EXCEL
     ======================================================= */

  const exportExcel = () => {
    const workbook =
      XLSX.utils.book_new();

    /* =====================================================
       HOJA 1 - RESUMEN
       ===================================================== */

    const summaryData =
      summary.map(
        (item) => ({
          Empleado:
            item.employee,

          Sedes:
            item.branches.join(
              ", "
            ),

          "Días trabajados":
            item.daysWorked,

          "Llegadas tarde":
            item.lateCount,

          "Minutos tarde":
            item.lateMinutes,

          "Horas normales":
            item.normalHours,

          "Horas extra":
            item.extraHours,

          "Horas pagadas":
            item.paidHours,

          Novedades:
            item.noveltyCount,

          "Días de novedad":
            item.noveltyDays,

          "Tipos de novedad":
            item.noveltyTypes.join(
              ", "
            ),
        })
      );

    const summarySheet =
      XLSX.utils.json_to_sheet(
        summaryData
      );

    XLSX.utils.book_append_sheet(
      workbook,
      summarySheet,
      "Resumen"
    );

    /* =====================================================
       HOJA 2 - ASISTENCIAS
       ===================================================== */

    const attendanceData =
      attendanceWithHours.map(
        (record) => ({
          ID:
            record.id,

          Fecha:
            formatDate(
              record.date
            ),

          Sede:
            record.branch,

          Empleado:
            record.employee,

          "Hora programada":
            record.scheduledStart ||
            "",

          "Hora entrada":
            record.realStart ||
            "",

          "Minutos tarde":
            record.lateMinutes,

          Descuento:
            record.discount
              ? "Sí"
              : "No",

          "Horas pagadas":
            record.calculatedHours,
        })
      );

    const attendanceSheet =
      XLSX.utils.json_to_sheet(
        attendanceData
      );

    XLSX.utils.book_append_sheet(
      workbook,
      attendanceSheet,
      "Asistencias"
    );

    /* =====================================================
       HOJA 3 - HORAS EXTRA
       ===================================================== */

    const extraHoursData =
      summary.map(
        (item) => ({
          Empleado:
            item.employee,

          Sedes:
            item.branches.join(
              ", "
            ),

          "Horas pagadas":
            item.paidHours,

          "Horas normales":
            item.normalHours,

          "Horas extra":
            item.extraHours,

          "Tope horas normales":
            HORAS_NORMALES_MES,

          "Cálculo":
            `${item.paidHours} - ${HORAS_NORMALES_MES} = ${item.extraHours}`,
        })
      );

    const extraHoursSheet =
      XLSX.utils.json_to_sheet(
        extraHoursData
      );

    XLSX.utils.book_append_sheet(
      workbook,
      extraHoursSheet,
      "Horas Extra"
    );

    /* =====================================================
       HOJA 4 - LLEGADAS TARDE
       ===================================================== */

    const lateData =
      attendanceWithHours
        .filter(
          (record) =>
            Number(
              record.lateMinutes
            ) > 0
        )
        .map(
          (record) => ({
            Fecha:
              formatDate(
                record.date
              ),

            Sede:
              record.branch,

            Empleado:
              record.employee,

            "Hora programada":
              record.scheduledStart ||
              "",

            "Hora entrada":
              record.realStart ||
              "",

            "Minutos tarde":
              record.lateMinutes,

            Descuento:
              record.discount
                ? "Sí"
                : "No",
          })
        );

    const lateSheet =
      XLSX.utils.json_to_sheet(
        lateData
      );

    XLSX.utils.book_append_sheet(
      workbook,
      lateSheet,
      "Llegadas Tarde"
    );

    /* =====================================================
       HOJA 5 - NOVEDADES
       ===================================================== */

    const noveltyData =
      filteredNovedades.map(
        (novelty) => ({
          ID:
            novelty.id,

          Empleado:
            novelty.empleado_nombre ||
            "",

          "ID empleado":
            novelty.empleado_id,

          Documento:
            novelty.documento ||
            "",

          Cargo:
            novelty.cargo ||
            "",

          Sede:
            novelty.sede_nombre ||
            "",

          "Tipo de novedad":
            novelty.tipo_novedad ||
            "",

          "Fecha inicio":
            formatDate(
              novelty.fecha_inicio
            ),

          "Fecha fin":
            formatDate(
              novelty.fecha_fin ||
                novelty.fecha_inicio
            ),

          "Días originales":
            novelty.dias ??
            "",

          "Días en periodo":
            getNoveltyDaysInSelectedMonth(
              novelty,
              selectedYear,
              selectedMonth
            ),

          Estado:
            novelty.estado ||
            "",

          "Afecta nómina":
            novelty.afecta_nomina
              ? "Sí"
              : "No",

          "Tratamiento nómina":
            novelty.tratamiento_nomina ||
            "",

          "Periodo nómina":
            novelty.periodo_nomina ||
            "",

          Valor:
            Number(
              novelty.valor
            ) || 0,

          Observación:
            novelty.observacion ||
            "",

          "Observación nómina":
            novelty.observacion_nomina ||
            "",

          Soporte:
            novelty.soporte_url ||
            "",

          "Creado por":
            novelty.creado_por ||
            "",

          "Fecha creación":
            novelty.created_at
              ? String(
                  novelty.created_at
                )
              : "",
        })
      );

    const noveltySheet =
      XLSX.utils.json_to_sheet(
        noveltyData
      );

    XLSX.utils.book_append_sheet(
      workbook,
      noveltySheet,
      "Novedades"
    );

    /* =====================================================
       HOJA 6 - TURNOS
       ===================================================== */

    const shiftData =
      filteredAssignments.map(
        (assignment) => {
          const shift =
            findShift(
              assignment.shift
            );

          return {
            Fecha:
              `${String(
                assignment.day
              ).padStart(
                2,
                "0"
              )}/${String(
                assignment.month + 1
              ).padStart(
                2,
                "0"
              )}/${assignment.year}`,

            Sede:
              assignment.branch,

            Empleado:
              assignment.employee,

            Turno:
              assignment.shift,

            Horas:
              Number(
                shift?.hours
              ) || 0,

            Inicio:
              shift?.start ||
              "",

            Fin:
              shift?.end ||
              "",

            "Inicio 2":
              shift?.start2 ||
              "",

            "Fin 2":
              shift?.end2 ||
              "",
          };
        }
      );

    const shiftSheet =
      XLSX.utils.json_to_sheet(
        shiftData
      );

    XLSX.utils.book_append_sheet(
      workbook,
      shiftSheet,
      "Turnos"
    );

    /* =====================================================
       AJUSTAR ANCHO DE COLUMNAS
       ===================================================== */

    const sheets = [
      "Resumen",
      "Asistencias",
      "Horas Extra",
      "Llegadas Tarde",
      "Novedades",
      "Turnos",
    ];

    sheets.forEach(
      (sheetName) => {
        const sheet =
          workbook.Sheets[
            sheetName
          ];

        if (!sheet) return;

        const range =
          XLSX.utils.decode_range(
            sheet["!ref"] ||
              "A1"
          );

        const widths: number[] =
          [];

        for (
          let column =
            range.s.c;
          column <=
          range.e.c;
          column++
        ) {
          let maxLength = 12;

          for (
            let row =
              range.s.r;
            row <=
            range.e.r;
            row++
          ) {
            const cell =
              sheet[
                XLSX.utils.encode_cell(
                  {
                    r: row,
                    c: column,
                  }
                )
              ];

            if (
              cell &&
              cell.v !==
                undefined &&
              cell.v !==
                null
            ) {
              const length =
                String(
                  cell.v
                ).length;

              if (
                length >
                maxLength
              ) {
                maxLength =
                  length;
              }
            }
          }

          widths[column] =
            Math.min(
              Math.max(
                maxLength + 2,
                12
              ),
              45
            );
        }

        sheet["!cols"] =
          widths.map(
            (width) => ({
              wch: width,
            })
          );
      }
    );

    /* =====================================================
       NOMBRE DEL ARCHIVO
       ===================================================== */

    const fileName =
      `Reporte_Nomina_${months[selectedMonth]}_${selectedYear}.xlsx`;

    XLSX.writeFile(
      workbook,
      fileName
    );
  };

  /* =======================================================
     ESTILOS
     ======================================================= */

  const styles = {
    page: {
      minHeight: "100vh",
      background: "#f5f6f8",
      padding: "24px",
      boxSizing:
        "border-box" as const,
      fontFamily:
        "Inter, Arial, sans-serif",
    },

    header: {
      background: "#C8102E",
      color: "#fff",
      borderRadius: "14px",
      padding: "22px 26px",
      marginBottom: "20px",
      display: "flex",
      justifyContent:
        "space-between",
      alignItems: "center",
      gap: "20px",
      flexWrap:
        "wrap" as const,
      boxShadow:
        "0 8px 24px rgba(0,0,0,0.10)",
    },

    headerTitle: {
      margin: 0,
      fontSize: "24px",
      fontWeight: 700,
    },

    headerSubtitle: {
      margin:
        "6px 0 0 0",
      opacity: 0.9,
      fontSize: "14px",
    },

    exportButton: {
      border: "none",
      background: "#fff",
      color: "#333",
      borderRadius: "8px",
      padding:
        "11px 17px",
      fontWeight: 700,
      cursor: "pointer",
    },

    filtersCard: {
      background: "#fff",
      borderRadius: "12px",
      padding: "18px",
      marginBottom: "20px",
      border:
        "1px solid #e5e7eb",
      display: "flex",
      gap: "16px",
      alignItems: "end",
      flexWrap:
        "wrap" as const,
    },

    field: {
      display: "flex",
      flexDirection:
        "column" as const,
      gap: "7px",
      minWidth: "170px",
    },

    label: {
      fontSize: "12px",
      fontWeight: 700,
      color: "#6b7280",
      textTransform:
        "uppercase" as const,
    },

    select: {
      border:
        "1px solid #d1d5db",
      borderRadius: "8px",
      padding:
        "10px 12px",
      background: "#fff",
      color: "#111827",
      fontSize: "14px",
      outline: "none",
    },

    kpiGrid: {
      display: "grid",
      gridTemplateColumns:
        "repeat(auto-fit, minmax(190px, 1fr))",
      gap: "14px",
      marginBottom: "20px",
    },

    kpiCard: {
      background: "#fff",
      borderRadius: "12px",
      padding: "18px",
      border:
        "1px solid #e5e7eb",
    },

    kpiLabel: {
      fontSize: "12px",
      color: "#6b7280",
      fontWeight: 700,
      textTransform:
        "uppercase" as const,
    },

    kpiValue: {
      marginTop: "7px",
      fontSize: "27px",
      fontWeight: 800,
      color: "#111827",
    },

    section: {
      background: "#fff",
      borderRadius: "12px",
      border:
        "1px solid #e5e7eb",
      marginBottom: "20px",
      overflow: "hidden",
    },

    sectionHeader: {
      padding:
        "16px 18px",
      borderBottom:
        "1px solid #e5e7eb",
      display: "flex",
      justifyContent:
        "space-between",
      alignItems: "center",
    },

    sectionTitle: {
      margin: 0,
      fontSize: "16px",
      fontWeight: 750,
      color: "#111827",
    },

    tableContainer: {
      width: "100%",
      overflowX:
        "auto" as const,
    },

    table: {
      width: "100%",
      borderCollapse:
        "collapse" as const,
      fontSize: "13px",
    },

    th: {
      textAlign:
        "left" as const,
      padding:
        "12px 14px",
      background: "#f3f4f6",
      color: "#4b5563",
      fontWeight: 700,
      borderBottom:
        "1px solid #e5e7eb",
      whiteSpace:
        "nowrap" as const,
    },

    td: {
      padding:
        "12px 14px",
      borderBottom:
        "1px solid #f0f0f0",
      color: "#374151",
      whiteSpace:
        "nowrap" as const,
    },

    empty: {
      padding: "35px",
      textAlign:
        "center" as const,
      color: "#6b7280",
    },

    error: {
      background: "#fff",
      border:
        "1px solid #fecaca",
      color: "#991b1b",
      padding:
        "14px 16px",
      borderRadius: "10px",
      marginBottom: "20px",
    },

    badge: {
      display: "inline-block",
      padding:
        "4px 8px",
      borderRadius: "999px",
      fontSize: "11px",
      fontWeight: 700,
      background: "#f3f4f6",
      color: "#374151",
    },
  };

  /* =======================================================
     RENDER
     ======================================================= */

  return (
    <div style={styles.page}>

      {/* HEADER */}

      <div style={styles.header}>
        <div>
          <h1
            style={
              styles.headerTitle
            }
          >
            Reporte de Nómina
          </h1>

          <p
            style={
              styles.headerSubtitle
            }
          >
            {months[selectedMonth]}{" "}
            {selectedYear} · Resumen de
            asistencia, horas y
            novedades
          </p>
        </div>

        <button
          type="button"
          style={
            styles.exportButton
          }
          onClick={exportExcel}
        >
          Exportar Excel
        </button>
      </div>

      {/* FILTROS */}

      <div
        style={
          styles.filtersCard
        }
      >
        <div style={styles.field}>
          <label
            style={styles.label}
          >
            Mes
          </label>

          <select
            style={styles.select}
            value={selectedMonth}
            onChange={(e) =>
              setSelectedMonth(
                Number(
                  e.target.value
                )
              )
            }
          >
            {months.map(
              (month, index) => (
                <option
                  key={month}
                  value={index}
                >
                  {month}
                </option>
              )
            )}
          </select>
        </div>

        <div style={styles.field}>
          <label
            style={styles.label}
          >
            Año
          </label>

          <select
            style={styles.select}
            value={selectedYear}
            onChange={(e) =>
              setSelectedYear(
                Number(
                  e.target.value
                )
              )
            }
          >
            {years.map((year) => (
              <option
                key={year}
                value={year}
              >
                {year}
              </option>
            ))}
          </select>
        </div>

        <div style={styles.field}>
          <label
            style={styles.label}
          >
            Sede
          </label>

          <select
            style={styles.select}
            value={selectedBranch}
            onChange={(e) =>
              setSelectedBranch(
                e.target.value
              )
            }
          >
            <option value="TODAS">
              Todas las sedes
            </option>

            {branches.map(
              (branch) => (
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
      </div>

      {/* ERROR */}

      {error && (
        <div
          style={styles.error}
        >
          {error}
        </div>
      )}

      {/* LOADING */}

      {loading ? (
        <div
          style={styles.section}
        >
          <div
            style={styles.empty}
          >
            Cargando información...
          </div>
        </div>
      ) : (
        <>
          {/* KPIs */}

          <div
            style={styles.kpiGrid}
          >
            <div
              style={
                styles.kpiCard
              }
            >
              <div
                style={
                  styles.kpiLabel
                }
              >
                Colaboradores
              </div>

              <div
                style={
                  styles.kpiValue
                }
              >
                {kpis.collaborators}
              </div>
            </div>

            <div
              style={
                styles.kpiCard
              }
            >
              <div
                style={
                  styles.kpiLabel
                }
              >
                Horas pagadas
              </div>

              <div
                style={
                  styles.kpiValue
                }
              >
                {kpis.totalHours.toFixed(
                  2
                )}
              </div>
            </div>

            <div
              style={
                styles.kpiCard
              }
            >
              <div
                style={
                  styles.kpiLabel
                }
              >
                Horas extra
              </div>

              <div
                style={
                  styles.kpiValue
                }
              >
                {kpis.extraHours.toFixed(
                  2
                )}
              </div>
            </div>

            <div
              style={
                styles.kpiCard
              }
            >
              <div
                style={
                  styles.kpiLabel
                }
              >
                Llegadas tarde
              </div>

              <div
                style={
                  styles.kpiValue
                }
              >
                {kpis.lateCount}
              </div>
            </div>

            <div
              style={
                styles.kpiCard
              }
            >
              <div
                style={
                  styles.kpiLabel
                }
              >
                Novedades
              </div>

              <div
                style={
                  styles.kpiValue
                }
              >
                {kpis.noveltyCount}
              </div>
            </div>

            <div
              style={
                styles.kpiCard
              }
            >
              <div
                style={
                  styles.kpiLabel
                }
              >
                Días de novedad
              </div>

              <div
                style={
                  styles.kpiValue
                }
              >
                {kpis.noveltyDays}
              </div>
            </div>
          </div>

          {/* RESUMEN */}

          <div
            style={styles.section}
          >
            <div
              style={
                styles.sectionHeader
              }
            >
              <h2
                style={
                  styles.sectionTitle
                }
              >
                Resumen por
                colaborador
              </h2>

              <span
                style={styles.badge}
              >
                {summary.length}{" "}
                registros
              </span>
            </div>

            <div
              style={
                styles.tableContainer
              }
            >
              {summary.length ===
              0 ? (
                <div
                  style={
                    styles.empty
                  }
                >
                  No hay información
                  disponible para el
                  periodo
                  seleccionado.
                </div>
              ) : (
                <table
                  style={
                    styles.table
                  }
                >
                  <thead>
                    <tr>
                      <th
                        style={
                          styles.th
                        }
                      >
                        Empleado
                      </th>

                      <th
                        style={
                          styles.th
                        }
                      >
                        Sedes
                      </th>

                      <th
                        style={
                          styles.th
                        }
                      >
                        Días
                      </th>

                      <th
                        style={
                          styles.th
                        }
                      >
                        Tarde
                      </th>

                      <th
                        style={
                          styles.th
                        }
                      >
                        Minutos
                      </th>

                      <th
                        style={
                          styles.th
                        }
                      >
                        Horas normales
                      </th>

                      <th
                        style={
                          styles.th
                        }
                      >
                        Horas extra
                      </th>

                      <th
                        style={
                          styles.th
                        }
                      >
                        Horas pagadas
                      </th>

                      <th
                        style={
                          styles.th
                        }
                      >
                        Novedades
                      </th>

                      <th
                        style={
                          styles.th
                        }
                      >
                        Días novedad
                      </th>
                    </tr>
                  </thead>

                  <tbody>
                    {summary.map(
                      (
                        item,
                        index
                      ) => (
                        <tr
                          key={`${item.employee}-${index}`}
                        >
                          <td
                            style={
                              styles.td
                            }
                          >
                            <strong>
                              {
                                item.employee
                              }
                            </strong>
                          </td>

                          <td
                            style={
                              styles.td
                            }
                          >
                            {item.branches.join(
                              ", "
                            )}
                          </td>

                          <td
                            style={
                              styles.td
                            }
                          >
                            {
                              item.daysWorked
                            }
                          </td>

                          <td
                            style={
                              styles.td
                            }
                          >
                            {
                              item.lateCount
                            }
                          </td>

                          <td
                            style={
                              styles.td
                            }
                          >
                            {
                              item.lateMinutes
                            }
                          </td>

                          <td
                            style={
                              styles.td
                            }
                          >
                            {item.normalHours.toFixed(
                              2
                            )}
                          </td>

                          <td
                            style={
                              styles.td
                            }
                          >
                            {item.extraHours.toFixed(
                              2
                            )}
                          </td>

                          <td
                            style={
                              styles.td
                            }
                          >
                            {item.paidHours.toFixed(
                              2
                            )}
                          </td>

                          <td
                            style={
                              styles.td
                            }
                          >
                            {
                              item.noveltyCount
                            }
                          </td>

                          <td
                            style={
                              styles.td
                            }
                          >
                            {
                              item.noveltyDays
                            }
                          </td>
                        </tr>
                      )
                    )}
                  </tbody>
                </table>
              )}
            </div>
          </div>

          {/* NOVEDADES */}

          <div
            style={styles.section}
          >
            <div
              style={
                styles.sectionHeader
              }
            >
              <h2
                style={
                  styles.sectionTitle
                }
              >
                Novedades de nómina
              </h2>

              <span
                style={styles.badge}
              >
                {
                  filteredNovedades.length
                }{" "}
                novedades
              </span>
            </div>

            <div
              style={
                styles.tableContainer
              }
            >
              {filteredNovedades.length ===
              0 ? (
                <div
                  style={
                    styles.empty
                  }
                >
                  No hay novedades para
                  el periodo
                  seleccionado.
                </div>
              ) : (
                <table
                  style={
                    styles.table
                  }
                >
                  <thead>
                    <tr>
                      <th
                        style={
                          styles.th
                        }
                      >
                        Empleado
                      </th>

                      <th
                        style={
                          styles.th
                        }
                      >
                        Sede
                      </th>

                      <th
                        style={
                          styles.th
                        }
                      >
                        Tipo
                      </th>

                      <th
                        style={
                          styles.th
                        }
                      >
                        Inicio
                      </th>

                      <th
                        style={
                          styles.th
                        }
                      >
                        Fin
                      </th>

                      <th
                        style={
                          styles.th
                        }
                      >
                        Días periodo
                      </th>

                      <th
                        style={
                          styles.th
                        }
                      >
                        Estado
                      </th>

                      <th
                        style={
                          styles.th
                        }
                      >
                        Tratamiento
                      </th>

                      <th
                        style={
                          styles.th
                        }
                      >
                        Valor
                      </th>
                    </tr>
                  </thead>

                  <tbody>
                    {filteredNovedades.map(
                      (novelty) => {
                        const days =
                          getNoveltyDaysInSelectedMonth(
                            novelty,
                            selectedYear,
                            selectedMonth
                          );

                        return (
                          <tr
                            key={
                              novelty.id
                            }
                          >
                            <td
                              style={
                                styles.td
                              }
                            >
                              <strong>
                                {novelty.empleado_nombre ||
                                  `Empleado ${novelty.empleado_id}`}
                              </strong>
                            </td>

                            <td
                              style={
                                styles.td
                              }
                            >
                              {novelty.sede_nombre ||
                                "SIN SEDE"}
                            </td>

                            <td
                              style={
                                styles.td
                              }
                            >
                              {
                                novelty.tipo_novedad
                              }
                            </td>

                            <td
                              style={
                                styles.td
                              }
                            >
                              {formatDate(
                                novelty.fecha_inicio
                              )}
                            </td>

                            <td
                              style={
                                styles.td
                              }
                            >
                              {formatDate(
                                novelty.fecha_fin ||
                                  novelty.fecha_inicio
                              )}
                            </td>

                            <td
                              style={
                                styles.td
                              }
                            >
                              {days}
                            </td>

                            <td
                              style={
                                styles.td
                              }
                            >
                              {
                                novelty.estado
                              }
                            </td>

                            <td
                              style={
                                styles.td
                              }
                            >
                              {
                                novelty.tratamiento_nomina
                              }
                            </td>

                            <td
                              style={
                                styles.td
                              }
                            >
                              $
                              {(
                                Number(
                                  novelty.valor
                                ) || 0
                              ).toLocaleString(
                                "es-CO"
                              )}
                            </td>
                          </tr>
                        );
                      }
                    )}
                  </tbody>
                </table>
              )}
            </div>
          </div>

          {/* ASISTENCIAS */}

          <div
            style={styles.section}
          >
            <div
              style={
                styles.sectionHeader
              }
            >
              <h2
                style={
                  styles.sectionTitle
                }
              >
                Detalle de asistencias
              </h2>

              <span
                style={styles.badge}
              >
                {
                  attendanceWithHours.length
                }{" "}
                registros
              </span>
            </div>

            <div
              style={
                styles.tableContainer
              }
            >
              {attendanceWithHours.length ===
              0 ? (
                <div
                  style={
                    styles.empty
                  }
                >
                  No hay asistencias para
                  el periodo
                  seleccionado.
                </div>
              ) : (
                <table
                  style={
                    styles.table
                  }
                >
                  <thead>
                    <tr>
                      <th
                        style={
                          styles.th
                        }
                      >
                        Fecha
                      </th>

                      <th
                        style={
                          styles.th
                        }
                      >
                        Sede
                      </th>

                      <th
                        style={
                          styles.th
                        }
                      >
                        Empleado
                      </th>

                      <th
                        style={
                          styles.th
                        }
                      >
                        Programada
                      </th>

                      <th
                        style={
                          styles.th
                        }
                      >
                        Entrada
                      </th>

                      <th
                        style={
                          styles.th
                        }
                      >
                        Min. tarde
                      </th>

                      <th
                        style={
                          styles.th
                        }
                      >
                        Descuento
                      </th>

                      <th
                        style={
                          styles.th
                        }
                      >
                        Horas
                      </th>
                    </tr>
                  </thead>

                  <tbody>
                    {attendanceWithHours.map(
                      (record) => (
                        <tr
                          key={
                            record.id
                          }
                        >
                          <td
                            style={
                              styles.td
                            }
                          >
                            {formatDate(
                              record.date
                            )}
                          </td>

                          <td
                            style={
                              styles.td
                            }
                          >
                            {
                              record.branch
                            }
                          </td>

                          <td
                            style={
                              styles.td
                            }
                          >
                            <strong>
                              {
                                record.employee
                              }
                            </strong>
                          </td>

                          <td
                            style={
                              styles.td
                            }
                          >
                            {
                              record.scheduledStart
                            }
                          </td>

                          <td
                            style={
                              styles.td
                            }
                          >
                            {
                              record.realStart
                            }
                          </td>

                          <td
                            style={
                              styles.td
                            }
                          >
                            {
                              record.lateMinutes
                            }
                          </td>

                          <td
                            style={
                              styles.td
                            }
                          >
                            {record.discount
                              ? "Sí"
                              : "No"}
                          </td>

                          <td
                            style={
                              styles.td
                            }
                          >
                            {record.calculatedHours.toFixed(
                              2
                            )}
                          </td>
                        </tr>
                      )
                    )}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default Reports;