import { useState, useRef, useEffect } from 'react';
import jsPDF from 'jspdf';
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

type Props = {
  assignments: Assignment[];
  setAssignments: React.Dispatch<React.SetStateAction<Assignment[]>>;
  employees: { id: number; name: string; username: string }[];
  shiftTypes: {
    id: number;
    name: string;
    hours?: string;
    start?: string;
    end?: string;
    start2?: string;
    end2?: string;
    isSplit?: boolean;
  }[];
  selectedBranch: string;
  setSelectedBranch: React.Dispatch<React.SetStateAction<string>>;
  allowedBranches?: string[];
  readOnly?: boolean;
};

export default function Calendar({
  assignments,
  setAssignments,
  employees,
  shiftTypes,
  selectedBranch,
  setSelectedBranch,
  allowedBranches,
  readOnly = false,
}: Props) {
  const token = localStorage.getItem('token');

  const branches = [
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
  ];

  // =========================================================
  // SEDES VISIBLES SEGÚN EL USUARIO
  // =========================================================

  const visibleBranches =
    allowedBranches && allowedBranches.length > 0
      ? branches.filter((branch) =>
          allowedBranches.includes(branch)
        )
      : branches;

  const months = [
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
  ];

  const today = new Date();

  const [selectedMonth, setSelectedMonth] = useState(
    today.getMonth()
  );

  const [selectedYear, setSelectedYear] = useState(
    today.getFullYear()
  );

  const years = Array.from(
    { length: 5 },
    (_, i) => today.getFullYear() - 2 + i
  );

  // =========================================================
  // ASEGURAR QUE LA SEDE SELECCIONADA SEA PERMITIDA
  // =========================================================

  useEffect(() => {
    if (
      allowedBranches &&
      allowedBranches.length > 0 &&
      !allowedBranches.includes(selectedBranch)
    ) {
      setSelectedBranch(allowedBranches[0]);
    }
  }, [
    allowedBranches,
    selectedBranch,
    setSelectedBranch,
  ]);

  // =========================================================
  // DATOS DEL MES SELECCIONADO
  // =========================================================

  const firstDay = new Date(
    selectedYear,
    selectedMonth,
    1
  );

  const daysInMonth = new Date(
    selectedYear,
    selectedMonth + 1,
    0
  ).getDate();

  const startDay =
    (firstDay.getDay() + 6) % 7;

  // =========================================================
  // ASIGNACIONES DE LA SEDE ACTUAL
  // =========================================================

  const branchAssignments = assignments.filter(
    (a) =>
      a.branch === selectedBranch &&
      a.month === selectedMonth &&
      a.year === selectedYear
  );

  // =========================================================
  // ESTADOS
  // =========================================================

  const [showForm, setShowForm] = useState(false);
  const [quickDay, setQuickDay] = useState(1);
  const [quickEmployee, setQuickEmployee] =
    useState('');
  const [quickShift, setQuickShift] =
    useState('');

  const [editingAssignment, setEditingAssignment] =
    useState<Assignment | null>(null);

  const [editingEmployee, setEditingEmployee] =
    useState('');

  const [editingShift, setEditingShift] =
    useState('');

  const [editMode, setEditMode] = useState<
    'single' | 'toEnd' | 'range'
  >('single');

  const [rangeStart, setRangeStart] =
    useState(1);

  const [rangeEnd, setRangeEnd] =
    useState(1);

  const [showPdfMenu, setShowPdfMenu] =
    useState(false);

  const [showExcelMenu, setShowExcelMenu] =
    useState(false);

  const pdfMenuRef =
    useRef<HTMLDivElement>(null);

  const excelMenuRef =
    useRef<HTMLDivElement>(null);

  // =========================================================
  // CERRAR MENÚS AL HACER CLICK AFUERA
  // =========================================================

  useEffect(() => {
    const handleClickOutside = (
      event: MouseEvent
    ) => {
      if (
        pdfMenuRef.current &&
        !pdfMenuRef.current.contains(
          event.target as Node
        )
      ) {
        setShowPdfMenu(false);
      }

      if (
        excelMenuRef.current &&
        !excelMenuRef.current.contains(
          event.target as Node
        )
      ) {
        setShowExcelMenu(false);
      }
    };

    document.addEventListener(
      'mousedown',
      handleClickOutside
    );

    return () => {
      document.removeEventListener(
        'mousedown',
        handleClickOutside
      );
    };
  }, []);

  // =========================================================
  // ASIGNACIÓN MASIVA
  // =========================================================

  const [bulkAssignment, setBulkAssignment] =
    useState({
      employee:
        employees[0]?.name || '',
      shift:
        shiftTypes[0]?.name || '',
      startDay: 1,
      endDay: 1,
    });

  // =========================================================
  // INFORMACIÓN DEL TURNO
  // =========================================================

  const getShiftInfo = (
    shift: string
  ) => {
    const s = shift.toLowerCase();

    const turno = shiftTypes.find(
      (t) => t.name === shift
    );

    if (s.includes('desc')) {
      return {
        bg:
          'bg-green-100 border border-green-200',
        text:
          'text-green-800',
        hours:
          turno?.hours || '',
      };
    }

    if (s.includes('largo')) {
      return {
        bg:
          'bg-gray-200 border border-gray-300',
        text:
          'text-gray-800',
        hours:
          turno?.hours || '',
      };
    }

    return {
      bg:
        'bg-red-100 border border-red-200',
      text:
        'text-red-800',
      hours:
        turno?.hours || '',
    };
  };

  // =========================================================
  // OBTENER HORARIO DE UN TURNO
  // =========================================================

  const getShiftSchedule = (
    shiftName: string
  ) => {
    const turno = shiftTypes.find(
      (t) =>
        t.name === shiftName
    );

    if (
      !turno?.start ||
      !turno?.end
    ) {
      return '-';
    }

    if (
      turno.isSplit &&
      turno.start2 &&
      turno.end2
    ) {
      return `${turno.start}-${turno.end} / ${turno.start2}-${turno.end2}`;
    }

    return `${turno.start}-${turno.end}`;
  };

  // =========================================================
  // AGREGAR TURNO INDIVIDUAL
  // =========================================================

  const createQuickAssignment = async () => {
    if (readOnly) return;

    if (!quickEmployee || !quickShift) {
      return;
    }

    const alreadyExists = assignments.some(
      (a) =>
        a.day === quickDay &&
        a.month === selectedMonth &&
        a.year === selectedYear &&
        a.branch === selectedBranch &&
        a.employee === quickEmployee
    );

    if (alreadyExists) {
      alert(
        'Este empleado ya tiene un turno asignado en este día.'
      );
      return;
    }

    const employee = employees.find(
      (e) => e.name === quickEmployee
    );

    const turno = shiftTypes.find(
      (t) => t.name === quickShift
    );

    if (!employee || !turno) {
      alert(
        'No se pudo identificar el empleado o el turno.'
      );
      return;
    }

    try {
      const sedesResponse = await fetch(
        'https://crm-rrhh-backend.onrender.com/api/sedes',
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (!sedesResponse.ok) {
        throw new Error(
          'No se pudieron consultar las sedes.'
        );
      }

      const sedes = await sedesResponse.json();

      const sede = sedes.find(
        (s: any) =>
          s.nombre === selectedBranch
      );

      if (!sede) {
        throw new Error(
          `No se encontró la sede ${selectedBranch}.`
        );
      }

      const fecha = `${selectedYear}-${String(
        selectedMonth + 1
      ).padStart(2, '0')}-${String(
        quickDay
      ).padStart(2, '0')}`;

      const response = await fetch(
        'https://crm-rrhh-backend.onrender.com/api/asignaciones',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            empleado_id: employee.id,
            sede_id: sede.id,
            fecha,
            turno_id: turno.id,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.mensaje ||
          data.error ||
          'No se pudo guardar el turno.'
        );
      }

      const newAssignment: Assignment = {
        id: data.id,
        day: quickDay,
        month: selectedMonth,
        year: selectedYear,
        branch: selectedBranch,
        employee: quickEmployee,
        shift: quickShift,
      };

      setAssignments((prev) => [
        ...prev,
        newAssignment,
      ]);

      setShowForm(false);
      setQuickEmployee('');
      setQuickShift('');

    } catch (error: any) {
      console.error(
        'Error al guardar asignación:',
        error
      );

      alert(
        error.message ||
        'No se pudo guardar el turno.'
      );
    }
  };

  // =========================================================
  // ASIGNAR RANGO
  // =========================================================

  const createBulkAssignment = async () => {
    if (readOnly) return;

    if (
      !bulkAssignment.employee ||
      !bulkAssignment.shift
    ) {
      alert('Selecciona empleado y turno.');
      return;
    }

    if (
      bulkAssignment.startDay < 1 ||
      bulkAssignment.endDay > daysInMonth ||
      bulkAssignment.startDay > bulkAssignment.endDay
    ) {
      alert('El rango de días no es válido.');
      return;
    }

    const employee = employees.find(
      (e) => e.name === bulkAssignment.employee
    );

    const turno = shiftTypes.find(
      (t) => t.name === bulkAssignment.shift
    );

    if (!employee || !turno) {
      alert(
        'No se pudo identificar el empleado o el turno.'
      );
      return;
    }

    try {
      // Obtener las sedes permitidas para el usuario
      const sedesResponse = await fetch(
        'https://crm-rrhh-backend.onrender.com/api/sedes',
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (!sedesResponse.ok) {
        throw new Error(
          'No se pudieron consultar las sedes.'
        );
      }

      const sedes = await sedesResponse.json();

      const sede = sedes.find(
        (s: any) => s.nombre === selectedBranch
      );

      if (!sede) {
        throw new Error(
          `No se encontró la sede ${selectedBranch}.`
        );
      }

      const assignmentsToCreate: {
        day: number;
        fecha: string;
      }[] = [];

      for (
        let day = bulkAssignment.startDay;
        day <= bulkAssignment.endDay;
        day++
      ) {
        const alreadyExists = assignments.some(
          (a) =>
            a.day === day &&
            a.month === selectedMonth &&
            a.year === selectedYear &&
            a.branch === selectedBranch &&
            a.employee === bulkAssignment.employee
        );

        if (!alreadyExists) {
          const fecha =
            `${selectedYear}-${String(
              selectedMonth + 1
            ).padStart(2, '0')}-${String(day).padStart(
              2,
              '0'
            )}`;

          assignmentsToCreate.push({
            day,
            fecha,
          });
        }
      }

      if (assignmentsToCreate.length === 0) {
        alert(
          'El empleado ya tiene turnos asignados en todos los días seleccionados.'
        );
        return;
      }

      const createdAssignments: Assignment[] = [];

      for (const item of assignmentsToCreate) {
        const response = await fetch(
          'https://crm-rrhh-backend.onrender.com/api/asignaciones',
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({
              empleado_id: employee.id,
              sede_id: sede.id,
              fecha: item.fecha,
              turno_id: turno.id,
            }),
          }
        );

        const data = await response.json();

        if (!response.ok) {
          throw new Error(
            data.mensaje ||
              data.error ||
              `No se pudo guardar el día ${item.day}.`
          );
        }

        createdAssignments.push({
          id: data.id,
          day: item.day,
          month: selectedMonth,
          year: selectedYear,
          branch: selectedBranch,
          employee: bulkAssignment.employee,
          shift: bulkAssignment.shift,
        });
      }

      setAssignments((prev) => [
        ...prev,
        ...createdAssignments,
      ]);

      alert(
        `Se guardaron ${createdAssignments.length} turno(s) correctamente.`
      );

    } catch (error: any) {
      console.error(
        'Error al guardar asignación masiva:',
        error
      );

      alert(
        error.message ||
          'No se pudieron guardar los turnos.'
      );
    }
  };

  // =========================================================
  // EXPORTAR PDF SEDE ACTUAL
  // =========================================================

  const exportPDF = () => {
    try {
      const pdf = new jsPDF({
        orientation:
          'landscape',
        unit: 'mm',
        format: 'a4',
      });

      const pageWidth =
        pdf.internal.pageSize.getWidth();

      pdf.setFont(
        'helvetica',
        'bold'
      );

      pdf.setFontSize(20);

      pdf.setTextColor(
        185,
        28,
        28
      );

      pdf.text(
        `Sede: ${selectedBranch}`,
        pageWidth / 2,
        15,
        {
          align: 'center',
        }
      );

      pdf.setFont(
        'helvetica',
        'normal'
      );

      pdf.setFontSize(11);

      pdf.setTextColor(
        100,
        116,
        139
      );

      pdf.text(
        `${months[selectedMonth]} ${selectedYear}`,
        pageWidth / 2,
        22,
        {
          align: 'center',
        }
      );

      const weekDays = [
        'LUN',
        'MAR',
        'MIÉ',
        'JUE',
        'VIE',
        'SÁB',
        'DOM',
      ];

      const startX = 8;
      const startY = 30;
      const cellW = 40;
      const minCellH = 22;

      weekDays.forEach(
        (d, i) => {
          const x =
            startX +
            i * cellW;

          pdf.setFillColor(
            185,
            28,
            28
          );

          pdf.rect(
            x,
            startY,
            cellW,
            8,
            'F'
          );

          pdf.setTextColor(
            255,
            255,
            255
          );

          pdf.setFont(
            'helvetica',
            'bold'
          );

          pdf.setFontSize(8);

          pdf.text(
            d,
            x +
              cellW / 2,
            startY + 5,
            {
              align:
                'center',
            }
          );
        }
      );

      let x =
        startX +
        startDay * cellW;

      let y =
        startY + 8;

      let currentRowHeight =
        minCellH;

      for (
        let day = 1;
        day <= daysInMonth;
        day++
      ) {
        const dayAssignments =
          branchAssignments.filter(
            (a) =>
              a.day === day
          );

        const neededHeight =
          Math.max(
            minCellH,
            12 +
              dayAssignments.length *
                12
          );

        currentRowHeight =
          Math.max(
            currentRowHeight,
            neededHeight
          );

        pdf.setDrawColor(
          203,
          213,
          225
        );

        pdf.rect(
          x,
          y,
          cellW,
          currentRowHeight
        );

        pdf.setTextColor(
          220,
          38,
          38
        );

        pdf.setFont(
          'helvetica',
          'bold'
        );

        pdf.setFontSize(8);

        pdf.text(
          String(day),
          x + 2,
          y + 4
        );

        let lineY =
          y + 8;

        dayAssignments.forEach(
          (a) => {
            const shiftLower =
              a.shift.toLowerCase();

            if (
              shiftLower.includes(
                'desc'
              )
            ) {
              pdf.setFillColor(
                220,
                252,
                231
              );

              pdf.setTextColor(
                22,
                101,
                52
              );
            } else if (
              shiftLower.includes(
                'largo'
              )
            ) {
              pdf.setFillColor(
                229,
                231,
                235
              );

              pdf.setTextColor(
                31,
                41,
                55
              );
            } else {
              pdf.setFillColor(
                254,
                226,
                226
              );

              pdf.setTextColor(
                127,
                29,
                29
              );
            }

            pdf.roundedRect(
              x + 1.5,
              lineY - 3.5,
              cellW - 3,
              10.5,
              1.5,
              1.5,
              'F'
            );

            pdf.setFont(
              'helvetica',
              'bold'
            );

            pdf.setFontSize(
              5.8
            );

            const shortName =
              a.employee
                .split(' ')
                .slice(0, 2)
                .join(' ')
                .substring(
                  0,
                  18
                );

            pdf.text(
              shortName,
              x + 3,
              lineY - 0.5
            );

            pdf.setFont(
              'helvetica',
              'normal'
            );

            pdf.setFontSize(
              4.8
            );

            pdf.text(
              a.shift,
              x + 3,
              lineY + 1.5
            );

            pdf.text(
              getShiftSchedule(
                a.shift
              ),
              x + 3,
              lineY + 4.5
            );

            lineY += 11;
          }
        );

        if (
          (startDay + day) % 7 ===
          0
        ) {
          x = startX;

          y +=
            currentRowHeight + 2;

          currentRowHeight =
            minCellH;

          if (
            y +
              currentRowHeight >
              185 &&
            day < daysInMonth
          ) {
            pdf.addPage(
              'a4',
              'landscape'
            );

            y = 20;

            weekDays.forEach(
              (d, i) => {
                const hx =
                  startX +
                  i * cellW;

                pdf.setFillColor(
                  185,
                  28,
                  28
                );

                pdf.rect(
                  hx,
                  y,
                  cellW,
                  8,
                  'F'
                );

                pdf.setTextColor(
                  255,
                  255,
                  255
                );

                pdf.setFont(
                  'helvetica',
                  'bold'
                );

                pdf.setFontSize(8);

                pdf.text(
                  d,
                  hx +
                    cellW /
                      2,
                  y + 5,
                  {
                    align:
                      'center',
                  }
                );
              }
            );

            y += 8;
          }
        } else {
          x += cellW;
        }
      }

      pdf.save(
        `Horario_${selectedBranch}_${months[selectedMonth]}_${selectedYear}.pdf`
      );
    } catch (error) {
      console.error(error);

      alert(
        'Error al exportar PDF'
      );
    }
  };

  // =========================================================
  // EXPORTAR EXCEL SEDE ACTUAL
  // =========================================================

  const exportExcel = () => {
    const data =
      branchAssignments.map(
        (a) => {
          let inicio = '';
          let fin = '';
          let horas = 0;

          const turno =
            shiftTypes.find(
              (t) =>
                t.name ===
                a.shift
            );

          if (turno) {
            inicio =
              turno.start || '';

            fin =
              turno.end || '';

            if (
              turno.start &&
              turno.end
            ) {
              const [
                sh,
                sm,
              ] =
                turno.start
                  .split(':')
                  .map(Number);

              const [
                eh,
                em,
              ] =
                turno.end
                  .split(':')
                  .map(Number);

              let startMin =
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

              horas =
                (endMin -
                  startMin) /
                60;

              if (
                turno.isSplit &&
                turno.start2 &&
                turno.end2
              ) {
                const [
                  s2h,
                  s2m,
                ] =
                  turno.start2
                    .split(':')
                    .map(Number);

                const [
                  e2h,
                  e2m,
                ] =
                  turno.end2
                    .split(':')
                    .map(Number);

                const start2Min =
                  s2h * 60 +
                  s2m;

                const end2Min =
                  e2h * 60 +
                  e2m;

                horas +=
                  (end2Min -
                    start2Min) /
                  60;
              }
            }
          }

          const fecha =
            new Date(
              selectedYear,
              selectedMonth,
              a.day
            );

          return {
            Fecha:
              fecha.toLocaleDateString(
                'es-CO'
              ),

            Sede:
              a.branch,

            Empleado:
              a.employee,

            Usuario:
              employees.find(
                (e) =>
                  e.name ===
                  a.employee
              )?.username || '',

            'Hora inicio':
              inicio,

            'Hora fin':
              fin,

            'Horas realizadas':
              horas,
          };
        }
      );

    const ws =
      XLSX.utils.json_to_sheet(
        data
      );

    ws['!cols'] = [
      { wch: 14 },
      { wch: 15 },
      { wch: 25 },
      { wch: 12 },
      { wch: 12 },
      { wch: 12 },
      { wch: 16 },
    ];

    const wb =
      XLSX.utils.book_new();

    XLSX.utils.book_append_sheet(
      wb,
      ws,
      selectedBranch
    );

    XLSX.writeFile(
      wb,
      `Turnos_${selectedBranch}_${months[selectedMonth]}_${selectedYear}.xlsx`
    );
  };

  // =========================================================
  // EDITAR TURNO
  // =========================================================

  const openEditModal = (
    assignment: Assignment
  ) => {
    if (readOnly) return;

    setEditingAssignment(
      assignment
    );

    setEditingEmployee(
      assignment.employee
    );

    setEditingShift(
      assignment.shift
    );

    setRangeStart(
      assignment.day
    );

    setRangeEnd(
      daysInMonth
    );

    setEditMode('single');
  };

  // =========================================================
  // GUARDAR EDICIÓN
  // =========================================================
const saveEditedAssignment = async () => {
  if (!editingAssignment) return

  const employee = employees.find(
    (e) => e.name === editingEmployee
  )

  const turno = shiftTypes.find(
    (t) => t.name === editingShift
  )

  if (!employee || !turno) {
    alert(
      'No se pudo identificar el empleado o el turno.'
    )
    return
  }

  // =========================================================
  // DETERMINAR RANGO SEGÚN LA OPCIÓN SELECCIONADA
  // =========================================================

  let startDay = editingAssignment.day
  let endDay = editingAssignment.day

  if (editMode === 'toEnd') {
    startDay = editingAssignment.day
    endDay = daysInMonth
  }

  if (editMode === 'range') {
    startDay = rangeStart
    endDay = rangeEnd
  }

  if (
    startDay < 1 ||
    endDay > daysInMonth ||
    startDay > endDay
  ) {
    alert('El rango de días no es válido.')
    return
  }

  try {
    // =======================================================
    // OBTENER SEDE
    // =======================================================

    const sedesResponse = await fetch(
      'https://crm-rrhh-backend.onrender.com/api/sedes',
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    )

    if (!sedesResponse.ok) {
      throw new Error(
        'No se pudieron consultar las sedes.'
      )
    }

    const sedes = await sedesResponse.json()

    const sede = sedes.find(
      (s: any) =>
        s.nombre === editingAssignment.branch
    )

    if (!sede) {
      throw new Error(
        `No se encontró la sede ${editingAssignment.branch}.`
      )
    }

    // =======================================================
    // SOLO ESTE DÍA
    // =======================================================

    if (editMode === 'single') {
      const fecha =
        `${editingAssignment.year}-${String(
          editingAssignment.month + 1
        ).padStart(2, '0')}-${String(
          editingAssignment.day
        ).padStart(2, '0')}`

      const response = await fetch(
        `https://crm-rrhh-backend.onrender.com/api/asignaciones/${editingAssignment.id}`,
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            empleado_id: employee.id,
            sede_id: sede.id,
            fecha,
            turno_id: turno.id,
          }),
        }
      )

      const data = await response.json()

      if (!response.ok) {
        throw new Error(
          data.mensaje ||
            data.error ||
            'No se pudo actualizar el turno.'
        )
      }

      setAssignments((prev) =>
        prev.map((assignment) =>
          assignment.id === editingAssignment.id
            ? {
                ...assignment,
                employee: editingEmployee,
                shift: editingShift,
              }
            : assignment
        )
      )

      setEditingAssignment(null)

      alert(
        'Turno actualizado correctamente.'
      )

      return
    }

    // =======================================================
    // EDICIÓN HASTA FIN DE MES / RANGO
    // =======================================================

    // Se toman los turnos EXISTENTES del mismo empleado
    // y de la misma sede dentro del rango seleccionado.

    const assignmentsToUpdate =
      assignments.filter(
        (assignment) =>
          assignment.branch ===
            editingAssignment.branch &&
          assignment.year ===
            editingAssignment.year &&
          assignment.month ===
            editingAssignment.month &&
          assignment.employee ===
            editingAssignment.employee &&
          assignment.day >= startDay &&
          assignment.day <= endDay
      )

    if (assignmentsToUpdate.length === 0) {
      alert(
        'No hay turnos existentes dentro del rango seleccionado para modificar.'
      )
      return
    }

    const updatedIds: number[] = []

    // =======================================================
    // ACTUALIZAR UNO POR UNO
    // =======================================================

    for (const assignment of assignmentsToUpdate) {
      const fecha =
        `${assignment.year}-${String(
          assignment.month + 1
        ).padStart(2, '0')}-${String(
          assignment.day
        ).padStart(2, '0')}`

      const response = await fetch(
        `https://crm-rrhh-backend.onrender.com/api/asignaciones/${assignment.id}`,
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            empleado_id: employee.id,
            sede_id: sede.id,
            fecha,
            turno_id: turno.id,
          }),
        }
      )

      const data = await response.json()

      if (!response.ok) {
        throw new Error(
          data.mensaje ||
            data.error ||
            `No se pudo actualizar el día ${assignment.day}.`
        )
      }

      updatedIds.push(assignment.id)
    }

    // =======================================================
    // ACTUALIZAR CALENDARIO VISUAL
    // =======================================================

    setAssignments((prev) =>
      prev.map((assignment) => {
        if (
          updatedIds.includes(
            assignment.id
          )
        ) {
          return {
            ...assignment,
            employee: editingEmployee,
            shift: editingShift,
          }
        }

        return assignment
      })
    )

    setEditingAssignment(null)

    if (editMode === 'toEnd') {
      alert(
        `Se actualizaron ${updatedIds.length} turno(s) desde el día ${startDay} hasta el final del mes.`
      )
    } else {
      alert(
        `Se actualizaron ${updatedIds.length} turno(s) del día ${startDay} al día ${endDay}.`
      )
    }

  } catch (error: any) {
    console.error(
      'Error al actualizar asignación:',
      error
    )

    alert(
      error.message ||
        'No se pudieron actualizar los turnos.'
    )
  }
}

  // =========================================================
  // ELIMINAR TURNOS DE UN RANGO
  // =========================================================

  const deleteAssignmentRange = async () => {
    if (!editingAssignment) return

    if (
      rangeStart < 1 ||
      rangeEnd > daysInMonth ||
      rangeStart > rangeEnd
    ) {
      alert('El rango de días no es válido.')
      return
    }

    const confirmed = window.confirm(
      `¿Estás seguro de eliminar todos los turnos de ${editingEmployee} desde el día ${rangeStart} hasta el día ${rangeEnd} en ${editingAssignment.branch}?`
    )

    if (!confirmed) return

    try {
      const sedesResponse = await fetch(
        'https://crm-rrhh-backend.onrender.com/api/sedes',
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      )

      if (!sedesResponse.ok) {
        throw new Error(
          'No se pudieron consultar las sedes.'
        )
      }

      const sedes = await sedesResponse.json()

      const sede = sedes.find(
        (s: any) =>
          s.nombre === editingAssignment.branch
      )

      if (!sede) {
        throw new Error(
          `No se encontró la sede ${editingAssignment.branch}.`
        )
      }

      const employee = employees.find(
        (e) => e.name === editingEmployee
      )

      if (!employee) {
        throw new Error(
          'No se pudo identificar el empleado.'
        )
      }

      const fechaInicio =
        `${editingAssignment.year}-${String(
          editingAssignment.month + 1
        ).padStart(2, '0')}-${String(
          rangeStart
        ).padStart(2, '0')}`

      const fechaFin =
        `${editingAssignment.year}-${String(
          editingAssignment.month + 1
        ).padStart(2, '0')}-${String(
          rangeEnd
        ).padStart(2, '0')}`

      const response = await fetch(
        'https://crm-rrhh-backend.onrender.com/api/asignaciones/rango',
        {
          method: 'DELETE',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            empleado_id: employee.id,
            sede_id: sede.id,
            fecha_inicio: fechaInicio,
            fecha_fin: fechaFin,
          }),
        }
      )

      const data = await response.json()

      if (!response.ok) {
        throw new Error(
          data.mensaje ||
            data.error ||
            'No se pudieron eliminar los turnos.'
        )
      }

      const idsEliminados: number[] =
        data.ids || []

      setAssignments((prev) =>
        prev.filter(
          (assignment) =>
            !idsEliminados.includes(
              assignment.id
            )
        )
      )

      setEditingAssignment(null)

      alert(
        data.mensaje ||
          'Los turnos del rango fueron eliminados correctamente.'
      )
    } catch (error: any) {
      console.error(
        'Error al eliminar rango:',
        error
      )

      alert(
        error.message ||
          'No se pudieron eliminar los turnos del rango.'
      )
    }
  }

  // =========================================================
  // ELIMINAR TURNO
  // =========================================================

  const deleteAssignment = async () => {
    if (!editingAssignment) return

    const confirmed = window.confirm(
      '¿Estás seguro de que deseas eliminar este turno?'
    )

    if (!confirmed) return

    try {
      const response = await fetch(
        `https://crm-rrhh-backend.onrender.com/api/asignaciones/${editingAssignment.id}`,
        {
          method: 'DELETE',
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      )

      const data = await response.json()

      if (!response.ok) {
        throw new Error(
          data.mensaje ||
            data.error ||
            'No se pudo eliminar el turno.'
        )
      }

      setAssignments((prev) =>
        prev.filter(
          (assignment) =>
            assignment.id !==
            editingAssignment.id
        )
      )

      setEditingAssignment(null)

      alert(
        'Turno eliminado correctamente.'
      )
    } catch (error: any) {
      console.error(
        'Error al eliminar asignación:',
        error
      )

      alert(
        error.message ||
          'No se pudo eliminar el turno.'
      )
    }
  }

  // =========================================================
  // EXPORTAR TODAS LAS SEDES A EXCEL
  // =========================================================

  const exportAllExcel = () => {
    const wb =
      XLSX.utils.book_new();

    const consolidado: any[] =
      [];

    // SOLO SEDES PERMITIDAS
    visibleBranches.forEach(
      (branch) => {
        const bAssignments =
          assignments.filter(
            (a) =>
              a.branch ===
                branch &&
              a.month ===
                selectedMonth &&
              a.year ===
                selectedYear
          );

        const resumen =
          new Map();

        bAssignments.forEach(
          (a) => {
            const turno =
              shiftTypes.find(
                (t) =>
                  t.name ===
                  a.shift
              );

            let horas = 0;

            if (
              turno?.start &&
              turno?.end
            ) {
              const [
                sh,
                sm,
              ] =
                turno.start
                  .split(':')
                  .map(Number);

              const [
                eh,
                em,
              ] =
                turno.end
                  .split(':')
                  .map(Number);

              let inicio =
                sh * 60 + sm;

              let fin =
                eh * 60 + em;

              if (
                fin < inicio
              ) {
                fin +=
                  24 * 60;
              }

              horas =
                (fin -
                  inicio) /
                60;

              if (
                turno.isSplit &&
                turno.start2 &&
                turno.end2
              ) {
                const [
                  s2h,
                  s2m,
                ] =
                  turno.start2
                    .split(':')
                    .map(Number);

                const [
                  e2h,
                  e2m,
                ] =
                  turno.end2
                    .split(':')
                    .map(Number);

                horas +=
                  ((e2h * 60 +
                    e2m) -
                    (s2h * 60 +
                      s2m)) /
                  60;
              }
            }

            const key =
              a.employee;

            if (
              !resumen.has(key)
            ) {
              resumen.set(
                key,
                {
                  Empleado:
                    a.employee,

                  Usuario:
                    employees.find(
                      (e) =>
                        e.name ===
                        a.employee
                    )?.username ||
                    '',

                  'Horas realizadas':
                    0,
                }
              );
            }

            resumen.get(
              key
            )[
              'Horas realizadas'
            ] += horas;
          }
        );

        const data =
          Array.from(
            resumen.values()
          ).map(
            (r: any) => {
              const extras =
                Math.max(
                  0,
                  r[
                    'Horas realizadas'
                  ] - 210
                );

              const turnosRealizados =
                bAssignments.filter(
                  (a) =>
                    a.employee ===
                    r.Empleado
                ).length;

              const fila = {
                Empleado:
                  r.Empleado,

                Usuario:
                  r.Usuario,

                Sede:
                  branch,

                'Turnos realizados':
                  turnosRealizados,

                'Horas realizadas':
                  Number(
                    r[
                      'Horas realizadas'
                    ].toFixed(1)
                  ),

                'Horas extra':
                  Number(
                    extras.toFixed(1)
                  ),
              };

              consolidado.push(
                fila
              );

              return fila;
            }
          );

        const ws =
          XLSX.utils.json_to_sheet(
            data
          );

        ws['!cols'] = [
          { wch: 28 },
          { wch: 12 },
          { wch: 15 },
          { wch: 18 },
          { wch: 18 },
          { wch: 15 },
        ];

        XLSX.utils.book_append_sheet(
          wb,
          ws,
          branch.substring(0, 31)
        );
      }
    );

    const wsConsolidado =
      XLSX.utils.json_to_sheet(
        consolidado
      );

    wsConsolidado['!cols'] = [
      { wch: 28 },
      { wch: 12 },
      { wch: 15 },
      { wch: 18 },
      { wch: 18 },
      { wch: 15 },
    ];

    XLSX.utils.book_append_sheet(
      wb,
      wsConsolidado,
      'CONSOLIDADO'
    );

    XLSX.writeFile(
      wb,
      `Reporte_Horas_${months[selectedMonth]}_${selectedYear}.xlsx`
    );
  };

  // =========================================================
  // EXPORTAR TODAS LAS SEDES A PDF
  // =========================================================

  const exportAllPDF = () => {
    try {
      const pdf = new jsPDF({
        orientation:
          'landscape',
        unit: 'mm',
        format: 'a4',
      });

      const pageWidth =
        pdf.internal.pageSize.getWidth();

      const weekDays = [
        'LUN',
        'MAR',
        'MIÉ',
        'JUE',
        'VIE',
        'SÁB',
        'DOM',
      ];

      const startX = 8;
      const cellW = 40;
      const minCellH = 22;

      // SOLO SEDES PERMITIDAS
      visibleBranches.forEach(
        (
          branch,
          branchIndex
        ) => {
          if (
            branchIndex > 0
          ) {
            pdf.addPage(
              'a4',
              'landscape'
            );
          }

          const bAssignments =
            assignments.filter(
              (a) =>
                a.branch ===
                  branch &&
                a.month ===
                  selectedMonth &&
                a.year ===
                  selectedYear
            );

          const firstDayPdf =
            new Date(
              selectedYear,
              selectedMonth,
              1
            );

          const daysInMonthPdf =
            new Date(
              selectedYear,
              selectedMonth + 1,
              0
            ).getDate();

          const startDayPdf =
            (firstDayPdf.getDay() +
              6) %
            7;

          pdf.setFont(
            'helvetica',
            'bold'
          );

          pdf.setFontSize(20);

          pdf.setTextColor(
            185,
            28,
            28
          );

          pdf.text(
            `Sede: ${branch}`,
            pageWidth / 2,
            15,
            {
              align: 'center',
            }
          );

          pdf.setFont(
            'helvetica',
            'normal'
          );

          pdf.setFontSize(11);

          pdf.setTextColor(
            100,
            116,
            139
          );

          pdf.text(
            `${months[selectedMonth]} ${selectedYear}`,
            pageWidth / 2,
            22,
            {
              align: 'center',
            }
          );

          let startY = 30;

          weekDays.forEach(
            (d, i) => {
              const x =
                startX +
                i * cellW;

              pdf.setFillColor(
                185,
                28,
                28
              );

              pdf.rect(
                x,
                startY,
                cellW,
                8,
                'F'
              );

              pdf.setTextColor(
                255,
                255,
                255
              );

              pdf.setFont(
                'helvetica',
                'bold'
              );

              pdf.setFontSize(8);

              pdf.text(
                d,
                x +
                  cellW / 2,
                startY + 5,
                {
                  align:
                    'center',
                }
              );
            }
          );

          let x =
            startX +
            startDayPdf *
              cellW;

          let y =
            startY + 8;

          let currentRowHeight =
            minCellH;

          for (
            let day = 1;
            day <=
            daysInMonthPdf;
            day++
          ) {
            const dayAssignments =
              bAssignments.filter(
                (a) =>
                  a.day === day
              );

            const neededHeight =
              Math.max(
                minCellH,
                12 +
                  dayAssignments.length *
                    12
              );

            currentRowHeight =
              Math.max(
                currentRowHeight,
                neededHeight
              );

            pdf.setDrawColor(
              203,
              213,
              225
            );

            pdf.rect(
              x,
              y,
              cellW,
              currentRowHeight
            );

            pdf.setTextColor(
              220,
              38,
              38
            );

            pdf.setFont(
              'helvetica',
              'bold'
            );

            pdf.setFontSize(8);

            pdf.text(
              String(day),
              x + 2,
              y + 4
            );

            let lineY =
              y + 8;

            dayAssignments.forEach(
              (a) => {
                const shiftLower =
                  a.shift.toLowerCase();

                if (
                  shiftLower.includes(
                    'desc'
                  )
                ) {
                  pdf.setFillColor(
                    220,
                    252,
                    231
                  );

                  pdf.setTextColor(
                    22,
                    101,
                    52
                  );
                } else if (
                  shiftLower.includes(
                    'largo'
                  )
                ) {
                  pdf.setFillColor(
                    229,
                    231,
                    235
                  );

                  pdf.setTextColor(
                    31,
                    41,
                    55
                  );
                } else {
                  pdf.setFillColor(
                    254,
                    226,
                    226
                  );

                  pdf.setTextColor(
                    127,
                    29,
                    29
                  );
                }

                pdf.roundedRect(
                  x + 1.5,
                  lineY - 3.5,
                  cellW - 3,
                  10.5,
                  1.5,
                  1.5,
                  'F'
                );

                pdf.setFont(
                  'helvetica',
                  'bold'
                );

                pdf.setFontSize(
                  5.8
                );

                const shortName =
                  a.employee
                    .split(' ')
                    .slice(0, 2)
                    .join(' ')
                    .substring(
                      0,
                      18
                    );

                pdf.text(
                  shortName,
                  x + 3,
                  lineY - 0.5
                );

                pdf.setFont(
                  'helvetica',
                  'normal'
                );

                pdf.setFontSize(
                  4.8
                );

                pdf.text(
                  a.shift,
                  x + 3,
                  lineY + 1.5
                );

                pdf.text(
                  getShiftSchedule(
                    a.shift
                  ),
                  x + 3,
                  lineY + 4.5
                );

                lineY += 11;
              }
            );

            if (
              (startDayPdf +
                day) %
                7 ===
              0
            ) {
              x = startX;

              y +=
                currentRowHeight +
                2;

              currentRowHeight =
                minCellH;

              if (
                y +
                  currentRowHeight >
                  185 &&
                day <
                  daysInMonthPdf
              ) {
                pdf.addPage(
                  'a4',
                  'landscape'
                );

                y = 20;

                weekDays.forEach(
                  (d, i) => {
                    const hx =
                      startX +
                      i *
                        cellW;

                    pdf.setFillColor(
                      185,
                      28,
                      28
                    );

                    pdf.rect(
                      hx,
                      y,
                      cellW,
                      8,
                      'F'
                    );

                    pdf.setTextColor(
                      255,
                      255,
                      255
                    );

                    pdf.setFont(
                      'helvetica',
                      'bold'
                    );

                    pdf.setFontSize(
                      8
                    );

                    pdf.text(
                      d,
                      hx +
                        cellW /
                          2,
                      y + 5,
                      {
                        align:
                          'center',
                      }
                    );
                  }
                );

                y += 8;
              }
            } else {
              x += cellW;
            }
          }
        }
      );

      pdf.save(
        `Calendarios_Todas_Sedes_${months[selectedMonth]}_${selectedYear}.pdf`
      );
    } catch (error) {
      console.error(error);

      alert(
        'Error al exportar los calendarios'
      );
    }
  };

  // =========================================================
  // PDF DE COBERTURA DE SEDES
  // =========================================================

  const exportCoveragePDF =
    () => {
      const pdf = new jsPDF(
        'p',
        'mm',
        'a4'
      );

      // SOLO SEDES VISIBLES/PERMITIDAS
      const currentAssignments =
        assignments.filter(
          (a) =>
            a.month ===
              selectedMonth &&
            a.year ===
              selectedYear &&
            visibleBranches.includes(
              a.branch
            )
        );

      const empleadosSedes =
        new Map<
          string,
          Set<string>
        >();

      currentAssignments.forEach(
        (a) => {
          if (
            !empleadosSedes.has(
              a.employee
            )
          ) {
            empleadosSedes.set(
              a.employee,
              new Set()
            );
          }

          empleadosSedes
            .get(a.employee)!
            .add(a.branch);
        }
      );

      const cobertura =
        currentAssignments.filter(
          (a) => {
            const sedes =
              empleadosSedes.get(
                a.employee
              );

            return (
              sedes &&
              sedes.size > 1
            );
          }
        );

      const porEmpleado =
        new Map<
          string,
          typeof cobertura
        >();

      cobertura.forEach(
        (a) => {
          if (
            !porEmpleado.has(
              a.employee
            )
          ) {
            porEmpleado.set(
              a.employee,
              []
            );
          }

          porEmpleado
            .get(
              a.employee
            )!
            .push(a);
        }
      );

      let firstPage = true;

      porEmpleado.forEach(
        (
          turnos,
          empleado
        ) => {
          if (!firstPage) {
            pdf.addPage();
          }

          firstPage = false;

          const usuario =
            employees.find(
              (e) =>
                e.name ===
                empleado
            )?.username || '';

          pdf.setFont(
            'helvetica',
            'bold'
          );

          pdf.setFontSize(18);

          pdf.setTextColor(
            185,
            28,
            28
          );

          pdf.text(
            empleado,
            14,
            18
          );

          pdf.setFont(
            'helvetica',
            'normal'
          );

          pdf.setFontSize(11);

          pdf.setTextColor(
            71,
            85,
            105
          );

          pdf.text(
            `Usuario: ${usuario}`,
            14,
            26
          );

          pdf.text(
            `Cobertura de sedes - ${months[selectedMonth]} ${selectedYear}`,
            14,
            33
          );

          let y = 45;

          pdf.setFillColor(
            185,
            28,
            28
          );

          pdf.rect(
            14,
            y,
            182,
            8,
            'F'
          );

          pdf.setTextColor(
            255,
            255,
            255
          );

          pdf.setFont(
            'helvetica',
            'bold'
          );

          pdf.setFontSize(9);

          pdf.text(
            'Fecha',
            18,
            y + 5
          );

          pdf.text(
            'Sede',
            42,
            y + 5
          );

          pdf.text(
            'Turno',
            82,
            y + 5
          );

          pdf.text(
            'Horario',
            122,
            y + 5
          );

          y += 12;

          turnos.sort(
            (a, b) =>
              a.day - b.day
          );

          turnos.forEach(
            (a) => {
              const fecha =
                new Date(
                  selectedYear,
                  selectedMonth,
                  a.day
                ).toLocaleDateString(
                  'es-CO'
                );

              pdf.setTextColor(
                15,
                23,
                42
              );

              pdf.setFont(
                'helvetica',
                'normal'
              );

              pdf.setFontSize(9);

              pdf.text(
                fecha,
                18,
                y
              );

              pdf.text(
                a.branch,
                42,
                y
              );

              pdf.text(
                a.shift,
                82,
                y
              );

              pdf.text(
                getShiftSchedule(
                  a.shift
                ),
                122,
                y
              );

              y += 7;

              if (y > 270) {
                pdf.addPage();

                y = 20;
              }
            }
          );

          y += 8;

          const sedesUnicas =
            new Set(
              turnos.map(
                (t) =>
                  t.branch
              )
            );

          pdf.setFont(
            'helvetica',
            'bold'
          );

          pdf.text(
            `Total sedes cubiertas: ${sedesUnicas.size}`,
            14,
            y
          );

          pdf.text(
            `Total turnos: ${turnos.length}`,
            90,
            y
          );
        }
      );

      pdf.save(
        `Cobertura_Sedes_${months[selectedMonth]}_${selectedYear}.pdf`
      );
    };

  // =========================================================
  // INTERFAZ
  // =========================================================

  return (
    <div className="space-y-6">

      {/* =====================================================
          ENCABEZADO
      ===================================================== */}

      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">

        <div>
          <h2 className="text-3xl font-bold text-red-700">
            Sede: {selectedBranch}
          </h2>

          <p className="text-slate-500 mt-1">
            Calendario de Turnos -{' '}
            {months[selectedMonth]}{' '}
            {selectedYear}
          </p>

          {readOnly && (
            <p className="text-sm text-amber-600 font-medium mt-1">
              👁️ Modo solo lectura
            </p>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-3">

          {/* SEDE */}

          <select
            value={selectedBranch}
            onChange={(e) =>
              setSelectedBranch(
                e.target.value
              )
            }
            className="border rounded-xl px-4 py-2 bg-white"
          >
            {visibleBranches.map(
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

          {/* MES */}

          <select
            value={selectedMonth}
            onChange={(e) =>
              setSelectedMonth(
                Number(
                  e.target.value
                )
              )
            }
            className="border rounded-xl px-4 py-2 bg-white"
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

          {/* AÑO */}

          <select
            value={selectedYear}
            onChange={(e) =>
              setSelectedYear(
                Number(
                  e.target.value
                )
              )
            }
            className="border rounded-xl px-4 py-2 bg-white"
          >
            {years.map(
              (year) => (
                <option
                  key={year}
                  value={year}
                >
                  {year}
                </option>
              )
            )}
          </select>

          {/* =================================================
              MENÚ PDF
          ================================================= */}

          <div
            className="relative"
            ref={pdfMenuRef}
          >
            <button
              onClick={() => {
                setShowPdfMenu(
                  !showPdfMenu
                );

                setShowExcelMenu(
                  false
                );
              }}
              className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-xl font-medium flex items-center gap-2"
            >
              📄 PDF
              <span className="text-xs">
                ▼
              </span>
            </button>

            {showPdfMenu && (
              <div className="absolute right-0 mt-2 w-64 bg-white border border-slate-200 rounded-xl shadow-lg z-50 overflow-hidden">

                <button
                  onClick={() => {
                    exportPDF();

                    setShowPdfMenu(
                      false
                    );
                  }}
                  className="w-full text-left px-4 py-3 hover:bg-slate-50 text-sm"
                >
                  📄 Sede actual
                </button>

                <button
                  onClick={() => {
                    exportAllPDF();

                    setShowPdfMenu(
                      false
                    );
                  }}
                  className="w-full text-left px-4 py-3 hover:bg-slate-50 text-sm border-t"
                >
                  📚 Todas las sedes
                </button>

                <button
                  onClick={() => {
                    exportCoveragePDF();

                    setShowPdfMenu(
                      false
                    );
                  }}
                  className="w-full text-left px-4 py-3 hover:bg-slate-50 text-sm border-t"
                >
                  👥 Cobertura de sedes
                </button>

              </div>
            )}
          </div>

          {/* =================================================
              MENÚ EXCEL
          ================================================= */}

          <div
            className="relative"
            ref={excelMenuRef}
          >
            <button
              onClick={() => {
                setShowExcelMenu(
                  !showExcelMenu
                );

                setShowPdfMenu(
                  false
                );
              }}
              className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-xl font-medium flex items-center gap-2"
            >
              📊 Excel
              <span className="text-xs">
                ▼
              </span>
            </button>

            {showExcelMenu && (
              <div className="absolute right-0 mt-2 w-48 bg-white border border-slate-200 rounded-xl shadow-lg z-50 overflow-hidden">

                <button
                  onClick={() => {
                    exportExcel();

                    setShowExcelMenu(
                      false
                    );
                  }}
                  className="w-full text-left px-4 py-3 hover:bg-slate-50 text-sm"
                >
                  📊 Sede actual
                </button>

                <button
                  onClick={() => {
                    exportAllExcel();

                    setShowExcelMenu(
                      false
                    );
                  }}
                  className="w-full text-left px-4 py-3 hover:bg-slate-50 text-sm border-t"
                >
                  📚 Todas las sedes
                </button>

              </div>
            )}
          </div>

        </div>
      </div>

      {/* =====================================================
          ASIGNACIÓN MASIVA
      ===================================================== */}

      {!readOnly && (
        <div className="bg-white rounded-2xl border border-slate-200 p-4">

          <h3 className="text-lg font-semibold mb-4 text-slate-800">
            Asignación masiva
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">

            <select
              value={
                bulkAssignment.employee
              }
              onChange={(e) =>
                setBulkAssignment({
                  ...bulkAssignment,
                  employee:
                    e.target.value,
                })
              }
              className="px-4 py-3 rounded-xl border border-slate-300 bg-white"
            >
              {employees.map(
                (employee) => (
                  <option
                    key={employee.id}
                    value={
                      employee.name
                    }
                  >
                    {employee.name}
                  </option>
                )
              )}
            </select>

            <select
              value={
                bulkAssignment.shift
              }
              onChange={(e) =>
                setBulkAssignment({
                  ...bulkAssignment,
                  shift:
                    e.target.value,
                })
              }
              className="px-4 py-3 rounded-xl border border-slate-300 bg-white"
            >
              {shiftTypes.map(
                (shift) => (
                  <option
                    key={shift.id}
                    value={
                      shift.name
                    }
                  >
                    {shift.name}
                  </option>
                )
              )}
            </select>

            <input
              type="number"
              min={1}
              max={daysInMonth}
              value={
                bulkAssignment.startDay
              }
              onChange={(e) =>
                setBulkAssignment({
                  ...bulkAssignment,
                  startDay:
                    Number(
                      e.target.value
                    ),
                })
              }
              className="px-4 py-3 rounded-xl border border-slate-300"
              placeholder="Desde"
            />

            <input
              type="number"
              min={1}
              max={daysInMonth}
              value={
                bulkAssignment.endDay
              }
              onChange={(e) =>
                setBulkAssignment({
                  ...bulkAssignment,
                  endDay:
                    Number(
                      e.target.value
                    ),
                })
              }
              className="px-4 py-3 rounded-xl border border-slate-300"
              placeholder="Hasta"
            />

            <button
              onClick={
                createBulkAssignment
              }
              className="bg-blue-600 text-white px-5 py-3 rounded-xl font-medium hover:bg-blue-700 transition"
            >
              Asignar rango
            </button>

          </div>
        </div>
      )}

      {/* =====================================================
          FORMULARIO RÁPIDO
      ===================================================== */}

      {!readOnly &&
        showForm && (
          <div className="bg-white rounded-2xl border p-4 space-y-3">

            <h3 className="font-bold text-lg">
              Nuevo turno - Día{' '}
              {quickDay}
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">

              <select
                value={
                  quickEmployee
                }
                onChange={(e) =>
                  setQuickEmployee(
                    e.target.value
                  )
                }
                className="border rounded-xl px-4 py-3 bg-white"
              >
                <option value="">
                  Empleado
                </option>

                {employees.map(
                  (employee) => (
                    <option
                      key={
                        employee.id
                      }
                      value={
                        employee.name
                      }
                    >
                      {
                        employee.name
                      }
                    </option>
                  )
                )}
              </select>

              <select
                value={
                  quickShift
                }
                onChange={(e) =>
                  setQuickShift(
                    e.target.value
                  )
                }
                className="border rounded-xl px-4 py-3 bg-white"
              >
                <option value="">
                  Turno
                </option>

                {shiftTypes.map(
                  (shift) => (
                    <option
                      key={
                        shift.id
                      }
                      value={
                        shift.name
                      }
                    >
                      {
                        shift.name
                      }
                    </option>
                  )
                )}
              </select>

              <button
                onClick={
                  createQuickAssignment
                }
                className="bg-red-600 hover:bg-red-700 text-white rounded-xl px-5 py-3 font-medium"
              >
                Guardar
              </button>

            </div>
          </div>
        )}

      {/* =====================================================
          MODAL EDITAR
      ===================================================== */}

      {editingAssignment &&
        !readOnly && (
          <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">

            <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg p-6 space-y-5">

              <div className="flex items-center justify-between">

                <div>
                  <h3 className="text-2xl font-bold text-slate-800">
                    Editar turno
                  </h3>

                  <p className="text-slate-500 text-sm">
                    Modifica empleado,
                    turno o aplica
                    cambios masivos
                  </p>
                </div>

                <button
                  onClick={() =>
                    setEditingAssignment(
                      null
                    )
                  }
                  className="w-9 h-9 rounded-full hover:bg-slate-100 flex items-center justify-center text-slate-500"
                >
                  ✕
                </button>

              </div>

              {/* INFORMACIÓN */}

              <div className="bg-slate-50 rounded-2xl p-4 border space-y-3">

                <div className="flex items-center gap-3">

                  <div className="w-10 h-10 rounded-xl bg-red-100 flex items-center justify-center">
                    📅
                  </div>

                  <div>

                    <p className="text-xs text-slate-500">
                      Fecha
                    </p>

                    <p className="font-semibold text-slate-800">
                      {
                        editingAssignment.day
                      }{' '}
                      {
                        months[
                          selectedMonth
                        ]
                      }{' '}
                      {
                        selectedYear
                      }
                    </p>

                  </div>
                </div>

                <div className="flex items-center gap-3">

                  <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center">
                    🏢
                  </div>

                  <div>

                    <p className="text-xs text-slate-500">
                      Sede
                    </p>

                    <p className="font-semibold text-slate-800">
                      {
                        editingAssignment.branch
                      }
                    </p>

                  </div>
                </div>

              </div>

              {/* EMPLEADO */}

              <div className="space-y-2">

                <label className="text-sm font-semibold text-slate-700">
                  Empleado
                </label>

                <select
                  value={
                    editingEmployee
                  }
                  onChange={(e) =>
                    setEditingEmployee(
                      e.target.value
                    )
                  }
                  className="w-full border border-slate-300 rounded-2xl px-4 py-3 bg-white"
                >
                  {employees.map(
                    (employee) => (
                      <option
                        key={
                          employee.id
                        }
                        value={
                          employee.name
                        }
                      >
                        {
                          employee.name
                        }
                      </option>
                    )
                  )}
                </select>

              </div>

              {/* TURNO */}

              <div className="space-y-2">

                <label className="text-sm font-semibold text-slate-700">
                  Tipo de turno
                </label>

                <select
                  value={
                    editingShift
                  }
                  onChange={(e) =>
                    setEditingShift(
                      e.target.value
                    )
                  }
                  className="w-full border border-slate-300 rounded-2xl px-4 py-3 bg-white"
                >
                  {shiftTypes.map(
                    (shift) => (
                      <option
                        key={
                          shift.id
                        }
                        value={
                          shift.name
                        }
                      >
                        {
                          shift.name
                        }
                      </option>
                    )
                  )}
                </select>

              </div>

              {/* APLICAR CAMBIOS */}

              <div className="space-y-3">

                <label className="text-sm font-semibold text-slate-700">
                  Aplicar cambios
                </label>

                <div className="grid grid-cols-1 gap-3">

                  <button
                    onClick={() =>
                      setEditMode(
                        'single'
                      )
                    }
                    className={`p-3 rounded-2xl border text-left transition ${
                      editMode ===
                      'single'
                        ? 'border-blue-500 bg-blue-50 text-blue-700'
                        : 'border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    <div className="font-medium">
                      Solo este día
                    </div>

                    <div className="text-xs text-slate-500">
                      Cambia únicamente
                      este turno
                    </div>
                  </button>

                  <button
                    onClick={() =>
                      setEditMode(
                        'toEnd'
                      )
                    }
                    className={`p-3 rounded-2xl border text-left transition ${
                      editMode ===
                      'toEnd'
                        ? 'border-blue-500 bg-blue-50 text-blue-700'
                        : 'border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    <div className="font-medium">
                      Hasta fin de mes
                    </div>

                    <div className="text-xs text-slate-500">
                      Cambia este
                      empleado desde
                      el día actual
                      hasta el final
                      del mes
                    </div>
                  </button>

                  <button
                    onClick={() =>
                      setEditMode(
                        'range'
                      )
                    }
                    className={`p-3 rounded-2xl border text-left transition ${
                      editMode ===
                      'range'
                        ? 'border-blue-500 bg-blue-50 text-blue-700'
                        : 'border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    <div className="font-medium">
                      Rango personalizado
                    </div>

                    <div className="text-xs text-slate-500">
                      Elige desde qué
                      día hasta qué
                      día aplicar
                    </div>
                  </button>

                </div>

                {editMode ===
                  'range' && (
                  <div className="space-y-3 pt-2">

                    <div className="grid grid-cols-2 gap-3">

                      <div>

                        <label className="text-xs text-slate-500">
                          Desde
                        </label>

                        <input
                          type="number"
                          min={1}
                          max={
                            daysInMonth
                          }
                          value={
                            rangeStart
                          }
                          onChange={(e) =>
                            setRangeStart(
                              Number(
                                e.target.value
                              )
                            )
                          }
                          className="w-full mt-1 border border-slate-300 rounded-xl px-3 py-2"
                        />

                      </div>

                      <div>

                        <label className="text-xs text-slate-500">
                          Hasta
                        </label>

                        <input
                          type="number"
                          min={1}
                          max={
                            daysInMonth
                          }
                          value={
                            rangeEnd
                          }
                          onChange={(e) =>
                            setRangeEnd(
                              Number(
                                e.target.value
                              )
                            )
                          }
                          className="w-full mt-1 border border-slate-300 rounded-xl px-3 py-2"
                        />

                      </div>

                    </div>

                    <button
                      type="button"
                      onClick={
                        deleteAssignmentRange
                      }
                      className="w-full py-3 rounded-2xl bg-red-50 hover:bg-red-100 border border-red-200 text-red-600 font-semibold transition"
                    >
                      🗑️ Eliminar turnos de este rango
                    </button>

                  </div>
                )}

              </div>

              {/* BOTONES */}

              <div className="flex gap-3 pt-2">

                <button
                  onClick={
                    deleteAssignment
                  }
                  className="px-4 py-3 rounded-2xl bg-red-50 hover:bg-red-100 text-red-600 font-medium transition"
                >
                  🗑️
                </button>

                <button
                  onClick={() =>
                    setEditingAssignment(
                      null
                    )
                  }
                  className="flex-1 py-3 rounded-2xl border border-slate-300 text-slate-700 font-medium hover:bg-slate-50 transition"
                >
                  Cancelar
                </button>

                <button
                  onClick={
                    saveEditedAssignment
                  }
                  className="flex-1 py-3 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-semibold transition"
                >
                  💾 Guardar
                </button>

              </div>

            </div>
          </div>
        )}

      {/* =====================================================
          CALENDARIO
      ===================================================== */}

      <div className="bg-white rounded-2xl border p-5">

        <div className="grid grid-cols-7 gap-3 mb-3 text-center text-sm font-bold text-white">

          {[
            'LUN',
            'MAR',
            'MIÉ',
            'JUE',
            'VIE',
            'SÁB',
            'DOM',
          ].map(
            (dayName) => (
              <div
                key={dayName}
                className="bg-red-700 rounded-lg py-2"
              >
                {dayName}
              </div>
            )
          )}

        </div>

        <div className="grid grid-cols-7 gap-3 items-start auto-rows-min">

          {/* DÍAS VACÍOS */}

          {Array.from({
            length: startDay,
          }).map(
            (_, index) => (
              <div
                key={`empty-${index}`}
                className="min-h-[100px] bg-slate-50/50 rounded-xl"
              />
            )
          )}

          {/* DÍAS DEL MES */}

          {Array.from({
            length: daysInMonth,
          }).map(
            (_, index) => {
              const day =
                index + 1;

              const dayAssignments =
                branchAssignments.filter(
                  (a) =>
                    a.day === day &&
                    a.month ===
                      selectedMonth &&
                    a.year ===
                      selectedYear
                );

              return (
                <div
                  key={day}
                  className="border border-slate-200 rounded-xl p-2 min-h-[110px] flex flex-col justify-between bg-white hover:border-red-300 transition shadow-sm"
                >

                  <div>

                    <div className="flex justify-between items-center mb-1.5">

                      <span className="font-bold text-slate-700 text-sm">
                        {day}
                      </span>

                      {/* BOTÓN + SOLO PARA USUARIOS CON PERMISO */}

                      {!readOnly && (
                        <button
                          onClick={() => {
                            setQuickDay(
                              day
                            );

                            setShowForm(
                              true
                            );
                          }}
                          className="text-xs w-5 h-5 rounded-full bg-slate-100 hover:bg-red-100 text-slate-600 hover:text-red-700 flex items-center justify-center transition"
                          title="Agregar turno"
                        >
                          +
                        </button>
                      )}

                    </div>

                    <div className="space-y-1">

                      {dayAssignments.map(
                        (
                          assignment
                        ) => {
                          const info =
                            getShiftInfo(
                              assignment.shift
                            );

                          return (
                            <div
                              key={
                                assignment.id
                              }
                              onClick={() => {
                                if (
                                  !readOnly
                                ) {
                                  openEditModal(
                                    assignment
                                  );
                                }
                              }}
                              className={`p-1.5 rounded-lg border text-xs ${
                                readOnly
                                  ? 'cursor-default'
                                  : 'cursor-pointer hover:opacity-80'
                              } transition ${info.bg}`}
                            >

                              <p
                                className={`font-semibold truncate ${info.text}`}
                              >
                                {
                                  assignment.employee
                                }
                              </p>

                              <div className="mt-1 text-[10px] font-medium text-slate-700">
                                {
                                  assignment.shift
                                }
                              </div>

                              <div className="text-[10px] text-slate-500">
                                {getShiftSchedule(
                                  assignment.shift
                                )}
                              </div>

                            </div>
                          );
                        }
                      )}

                    </div>

                  </div>

                </div>
              );
            }
          )}

        </div>
      </div>

    </div>
  );
}