import { useState, useRef, useEffect } from 'react';
import jsPDF from 'jspdf';
import * as XLSX from 'xlsx';

type Assignment = {
  id: number;
  day: number;
  branch: string;
  employee: string;
  shift: string;
};

type Props = {
  assignments: Assignment[];
  setAssignments: React.Dispatch<React.SetStateAction<Assignment[]>>;
  employees: {
    id: number;
    name: string;
    username: string;
  }[];
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
};

export default function Calendar({
  assignments,
  setAssignments,
  employees,
  shiftTypes,
  selectedBranch,
  setSelectedBranch,
}: Props) {
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

  const today = new Date();

  const [selectedMonth, setSelectedMonth] = useState(today.getMonth());
  const [selectedYear, setSelectedYear] = useState(today.getFullYear());

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

  const years = Array.from({ length: 5 }, (_, i) => 2024 + i);

  const firstDay = new Date(selectedYear, selectedMonth, 1);
  const daysInMonth = new Date(selectedYear, selectedMonth + 1, 0).getDate();
  const startDay = (firstDay.getDay() + 6) % 7;

  const [showForm, setShowForm] = useState(false);
  const [quickDay, setQuickDay] = useState(1);
  const [quickEmployee, setQuickEmployee] = useState('');
  const [quickShift, setQuickShift] = useState('');

  // Modal edición profesional
  const [editingAssignment, setEditingAssignment] = useState<Assignment | null>(null);
  const [editingEmployee, setEditingEmployee] = useState('');
  const [editingShift, setEditingShift] = useState('');
  const [editMode, setEditMode] = useState<'single' | 'toEnd' | 'range'>('single');
  const [rangeStart, setRangeStart] = useState(1);
  const [rangeEnd, setRangeEnd] = useState(1);

  const [showPdfMenu, setShowPdfMenu] = useState(false);
  const [showExcelMenu, setShowExcelMenu] = useState(false);

  const pdfMenuRef = useRef<HTMLDivElement>(null);
  const excelMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        pdfMenuRef.current &&
        !pdfMenuRef.current.contains(event.target as Node)
      ) {
        setShowPdfMenu(false);
      }

      if (
        excelMenuRef.current &&
        !excelMenuRef.current.contains(event.target as Node)
      ) {
        setShowExcelMenu(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Estado para la asignación masiva de turnos por rango
  const [bulkAssignment, setBulkAssignment] = useState({
    employee: employees[0]?.name || '',
    shift: shiftTypes[0]?.name || '',
    startDay: 1,
    endDay: 1,
  });

  const branchAssignments = assignments.filter(
    (a) => a.branch === selectedBranch
  );

  const createQuickAssignment = () => {
    if (!quickEmployee || !quickShift) return;

    setAssignments([
      ...assignments,
      {
        id: Date.now() + Math.random(),
        day: quickDay,
        branch: selectedBranch,
        employee: quickEmployee,
        shift: quickShift,
      },
    ]);

    setShowForm(false);
    setQuickEmployee('');
    setQuickShift('');
  };

  const getShiftInfo = (shift: string) => {
    const s = shift.toLowerCase();

    const turno = shiftTypes.find((t) => t.name === shift);

    // 🟢 Descanso
    if (s.includes('desc')) {
      return {
        bg: 'bg-green-100 border border-green-200',
        text: 'text-green-800',
        hours: turno?.hours || '',
      };
    }

    // ⚫ Turnos largos
    if (s.includes('largo')) {
      return {
        bg: 'bg-gray-200 border border-gray-300',
        text: 'text-gray-800',
        hours: turno?.hours || '',
      };
    }

    // 🔴 Demás turnos
    return {
      bg: 'bg-red-100 border border-red-200',
      text: 'text-red-800',
      hours: turno?.hours || '',
    };
  };

  const exportPDF = () => {
    try {
      const pdf = new jsPDF({
        orientation: 'landscape',
        unit: 'mm',
        format: 'a4',
      });

      const pageWidth = pdf.internal.pageSize.getWidth();

      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(20);
      pdf.setTextColor(185, 28, 28);

      pdf.text(`Sede: ${selectedBranch}`, pageWidth / 2, 15, {
        align: 'center',
      });

      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(11);
      pdf.setTextColor(100, 116, 139);

      pdf.text(
        `${months[selectedMonth]} ${selectedYear}`,
        pageWidth / 2,
        22,
        { align: 'center' }
      );

      const weekDays = ['LUN', 'MAR', 'MIÉ', 'JUE', 'VIE', 'SÁB', 'DOM'];

      const startX = 8;
      const startY = 30;
      const cellW = 40;
      const minCellH = 22;

      weekDays.forEach((d, i) => {
        const x = startX + i * cellW;

        pdf.setFillColor(185, 28, 28);
        pdf.rect(x, startY, cellW, 8, 'F');

        pdf.setTextColor(255, 255, 255);
        pdf.setFont('helvetica', 'bold');
        pdf.setFontSize(8);

        pdf.text(d, x + cellW / 2, startY + 5, {
          align: 'center',
        });
      });

      let x = startX + startDay * cellW;
      let y = startY + 8;

      let currentRowHeight = minCellH;

      for (let day = 1; day <= daysInMonth; day++) {
        const dayAssignments = branchAssignments.filter(
          (a) => a.day === day
        );

        // altura necesaria para este día
        const neededHeight = Math.max(
          minCellH,
          12 + dayAssignments.length * 12
        );

        // la fila toma la altura del día con más contenido
        currentRowHeight = Math.max(currentRowHeight, neededHeight);

        pdf.setDrawColor(203, 213, 225);
        pdf.rect(x, y, cellW, currentRowHeight);

        pdf.setTextColor(220, 38, 38);
        pdf.setFont('helvetica', 'bold');
        pdf.setFontSize(8);

        pdf.text(String(day), x + 2, y + 4);

        let lineY = y + 8;

        dayAssignments.forEach((a) => {
          if (a.shift.toLowerCase().includes('desc')) {
            pdf.setFillColor(220, 252, 231);
            pdf.setTextColor(22, 101, 52);
          } else if (a.shift.toLowerCase().includes('largo')) {
            pdf.setFillColor(229, 231, 235);
            pdf.setTextColor(31, 41, 55);
          } else {
            pdf.setFillColor(254, 226, 226);
            pdf.setTextColor(127, 29, 29);
          }

          pdf.roundedRect(x + 1.5, lineY - 3.5, cellW - 3, 10.5, 1.5, 1.5, 'F');

          pdf.setFont('helvetica', 'bold');
          pdf.setFontSize(5.8);

          const shortName = a.employee
            .split(' ')
            .slice(0, 2)
            .join(' ')
            .substring(0, 18);

          pdf.text(shortName, x + 3, lineY - 0.5);

          pdf.setFont('helvetica', 'normal');
          pdf.setFontSize(4.8);

          pdf.text(a.shift, x + 3, lineY + 1.5);

          const turnoPdf = shiftTypes.find((t) => t.name === a.shift);

          const horarioPdf =
            turnoPdf?.start && turnoPdf?.end
              ? turnoPdf.isSplit
                ? `${turnoPdf.start}-${turnoPdf.end} / ${turnoPdf.start2}-${turnoPdf.end2}`
                : `${turnoPdf.start}-${turnoPdf.end}`
              : '-';

          pdf.text(horarioPdf, x + 3, lineY + 4.5);

          lineY += 11;
        });

        if ((startDay + day) % 7 === 0) {
          x = startX;
          y += currentRowHeight + 2;

          // reiniciar altura para la nueva semana
          currentRowHeight = minCellH;

          if (y + currentRowHeight > 185 && day < daysInMonth) {
            pdf.addPage('a4', 'landscape');
            y = 20;

            weekDays.forEach((d, i) => {
              const hx = startX + i * cellW;

              pdf.setFillColor(185, 28, 28);
              pdf.rect(hx, y, cellW, 8, 'F');

              pdf.setTextColor(255, 255, 255);
              pdf.setFont('helvetica', 'bold');
              pdf.setFontSize(8);

              pdf.text(d, hx + cellW / 2, y + 5, {
                align: 'center',
              });
            });

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
      alert('Error al exportar PDF');
    }
  };

  const exportExcel = () => {
    const data = branchAssignments.map((a) => {
      let inicio = '';
      let fin = '';
      let horas = 0;

      const turno = shiftTypes.find((t) => t.name === a.shift);

      if (turno) {
        inicio = turno.start || '';
        fin = turno.end || '';

        // Calcular horas automáticamente
        if (turno.start && turno.end) {
          const [sh, sm] = turno.start.split(':').map(Number);
          const [eh, em] = turno.end.split(':').map(Number);

          let startMin = sh * 60 + sm;
          let endMin = eh * 60 + em;

          // Turno nocturno
          if (endMin < startMin) {
            endMin += 24 * 60;
          }

          horas = (endMin - startMin) / 60;

          // Si es turno partido
          if (turno.isSplit && turno.start2 && turno.end2) {
            const [s2h, s2m] = turno.start2.split(':').map(Number);
            const [e2h, e2m] = turno.end2.split(':').map(Number);

            const start2Min = s2h * 60 + s2m;
            const end2Min = e2h * 60 + e2m;

            horas += (end2Min - start2Min) / 60;
          }
        }
      }

      const fecha = new Date(selectedYear, selectedMonth, a.day);

      return {
        Fecha: fecha.toLocaleDateString('es-CO'),
        Sede: a.branch,
        Empleado: a.employee,
        Usuario:
          employees.find((e) => e.name === a.employee)?.username || '',
        'Hora inicio': inicio,
        'Hora fin': fin,
        'Horas realizadas': horas,
      };
    });

    const ws = XLSX.utils.json_to_sheet(data);

    ws['!cols'] = [
      { wch: 14 },
      { wch: 15 },
      { wch: 25 },
      { wch: 12 },
      { wch: 12 },
      { wch: 12 },
      { wch: 16 },
    ];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, selectedBranch);

    XLSX.writeFile(
      wb,
      `Turnos_${selectedBranch}_${months[selectedMonth]}_${selectedYear}.xlsx`
    );
  };

  const saveEditedAssignment = () => {
    if (!editingAssignment) return;

    const currentDay = editingAssignment.day;

    setAssignments(
      assignments.map((item) => {
        if (
          editMode === 'single' &&
          item.id === editingAssignment.id
        ) {
          return {
            ...item,
            employee: editingEmployee,
            shift: editingShift,
          };
        }

        if (
          editMode === 'toEnd' &&
          item.branch === editingAssignment.branch &&
          item.employee === editingAssignment.employee &&
          item.day >= currentDay
        ) {
          return {
            ...item,
            employee: editingEmployee,
            shift: editingShift,
          };
        }

        if (
          editMode === 'range' &&
          item.branch === editingAssignment.branch &&
          item.employee === editingAssignment.employee &&
          item.day >= rangeStart &&
          item.day <= rangeEnd
        ) {
          return {
            ...item,
            employee: editingEmployee,
            shift: editingShift,
          };
        }

        return item;
      })
    );

    setEditingAssignment(null);
  };

  const deleteAssignment = () => {
    if (!editingAssignment) return;
    setAssignments(assignments.filter((a) => a.id !== editingAssignment.id));
    setEditingAssignment(null);
  };

  const exportAllExcel = () => {
    const wb = XLSX.utils.book_new();

    // Hoja consolidada
    const consolidado: any[] = [];

    branches.forEach((branch) => {
      const bAssignments = assignments.filter((a) => a.branch === branch);

      // Agrupar por empleado
      const resumen = new Map();

      bAssignments.forEach((a) => {
        const turno = shiftTypes.find((t) => t.name === a.shift);

        let horas = 0;

        if (turno?.start && turno?.end) {
          const [sh, sm] = turno.start.split(':').map(Number);
          const [eh, em] = turno.end.split(':').map(Number);

          let inicio = sh * 60 + sm;
          let fin = eh * 60 + em;

          // Turno nocturno
          if (fin < inicio) fin += 24 * 60;

          horas = (fin - inicio) / 60;

          // Turno partido
          if (turno.isSplit && turno.start2 && turno.end2) {
            const [s2h, s2m] = turno.start2.split(':').map(Number);
            const [e2h, e2m] = turno.end2.split(':').map(Number);

            horas += ((e2h * 60 + e2m) - (s2h * 60 + s2m)) / 60;
          }
        }

        const key = a.employee;

        if (!resumen.has(key)) {
          resumen.set(key, {
            Empleado: a.employee,
            Usuario:
              employees.find((e) => e.name === a.employee)?.username || '',
            'Horas realizadas': 0,
          });
        }

        resumen.get(key)['Horas realizadas'] += horas;
      });

      const data = Array.from(resumen.values()).map((r: any) => {
        const extras = Math.max(0, r['Horas realizadas'] - 210);

        // contar cuántos turnos tiene el empleado
        const turnosRealizados = bAssignments.filter(
          (a) => a.employee === r.Empleado
        ).length;

        const fila = {
          Empleado: r.Empleado,
          Usuario: r.Usuario,
          Sede: branch,
          'Turnos realizados': turnosRealizados,
          'Horas realizadas': Number(r['Horas realizadas'].toFixed(1)),
          'Horas extra': Number(extras.toFixed(1)),
        };

        consolidado.push(fila);

        return fila;
      });

      // Crear hoja de la sede
      const ws = XLSX.utils.json_to_sheet(data);

      ws['!cols'] = [
        { wch: 28 }, // Empleado
        { wch: 12 }, // Usuario
        { wch: 15 }, // Sede
        { wch: 18 }, // Turnos
        { wch: 18 }, // Horas
        { wch: 15 }, // Extras
      ];

      XLSX.utils.book_append_sheet(wb, ws, branch.substring(0, 31));
    });

    // Hoja consolidada general
    const wsConsolidado = XLSX.utils.json_to_sheet(consolidado);

    wsConsolidado['!cols'] = [
      { wch: 15 }, // Sede
      { wch: 28 }, // Empleado
      { wch: 12 }, // Usuario
      { wch: 18 }, // Turnos
      { wch: 18 }, // Horas
      { wch: 15 }, // Extras
    ];

    XLSX.utils.book_append_sheet(wb, wsConsolidado, 'CONSOLIDADO');

    // Descargar
    XLSX.writeFile(
      wb,
      `Reporte_Horas_${months[selectedMonth]}_${selectedYear}.xlsx`
    );
  };

  const exportAllPDF = () => {
    const pdf = new jsPDF('p', 'mm', 'a4');

    branches.forEach((branch, index) => {
      if (index > 0) pdf.addPage();

      const bAssignments = assignments.filter((a) => a.branch === branch);

      pdf.setFontSize(18);
      pdf.setTextColor(185, 28, 28);
      pdf.text(branch, 14, 20);

      pdf.setFontSize(11);
      pdf.setTextColor(100, 116, 139);
      pdf.text(`${months[selectedMonth]} ${selectedYear}`, 14, 28);

      let y = 40;

      pdf.setFillColor(185, 28, 28);
      pdf.rect(14, y, 182, 8, 'F');

      pdf.setTextColor(255, 255, 255);
      pdf.setFontSize(9);
      pdf.text('Fecha', 18, y + 5);
      pdf.text('Empleado', 45, y + 5);
      pdf.text('Turno', 115, y + 5);
      pdf.text('Horas', 160, y + 5);

      y += 12;

      bAssignments.forEach((a) => {
        const shift = a.shift.toLowerCase();

        let horas = 0;

        if (shift.includes('mañ')) horas = 8;
        else if (shift.includes('tarde')) horas = 7;
        else if (shift.includes('largo')) horas = 15;

        const fecha = new Date(selectedYear, selectedMonth, a.day);

        pdf.setTextColor(30, 41, 59);
        pdf.setFontSize(9);

        pdf.text(fecha.toLocaleDateString('es-CO'), 18, y);
        pdf.text(a.employee.substring(0, 32), 45, y);
        pdf.text(a.shift, 115, y);
        pdf.text(String(horas), 165, y);

        y += 7;

        if (y > 270) {
          pdf.addPage();
          y = 20;
        }
      });

      y += 6;

      const totalHoras = bAssignments.reduce((acc, a) => {
        const shift = a.shift.toLowerCase();

        if (shift.includes('mañ')) return acc + 8;
        if (shift.includes('tarde')) return acc + 7;
        if (shift.includes('largo')) return acc + 15;

        return acc;
      }, 0);

      pdf.setFont('helvetica', 'bold');
      pdf.text(`Total horas: ${totalHoras}`, 14, y);
      pdf.text(`Total turnos: ${bAssignments.length}`, 80, y);
    });

    pdf.save(
      `Horarios_Todas_Sedes_${months[selectedMonth]}_${selectedYear}.pdf`
    );
  };

  // PDF SOLO PARA EMPLEADOS EN VARIAS SEDES
  const exportCoveragePDF = () => {
    const pdf = new jsPDF('p', 'mm', 'a4');

    // Detectar empleados que aparecen en más de una sede
    const empleadosSedes = new Map<string, Set<string>>();

    assignments.forEach((a) => {
      if (!empleadosSedes.has(a.employee)) {
        empleadosSedes.set(a.employee, new Set());
      }
      empleadosSedes.get(a.employee)!.add(a.branch);
    });

    // Filtrar solo empleados con más de una sede
    const cobertura = assignments.filter((a) => {
      const sedes = empleadosSedes.get(a.employee);
      return sedes && sedes.size > 1;
    });

    // Agrupar por empleado
    const porEmpleado = new Map<string, typeof cobertura>();

    cobertura.forEach((a) => {
      if (!porEmpleado.has(a.employee)) {
        porEmpleado.set(a.employee, []);
      }
      porEmpleado.get(a.employee)!.push(a);
    });

    let firstPage = true;

    porEmpleado.forEach((turnos, empleado) => {
      if (!firstPage) pdf.addPage();
      firstPage = false;

      const usuario =
        employees.find((e) => e.name === empleado)?.username || '';

      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(18);
      pdf.setTextColor(185, 28, 28);
      pdf.text(empleado, 14, 18);

      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(11);
      pdf.setTextColor(71, 85, 105);
      pdf.text(`Usuario: ${usuario}`, 14, 26);

      pdf.text(
        `Cobertura de sedes - ${months[selectedMonth]} ${selectedYear}`,
        14,
        33
      );

      let y = 45;

      // Encabezado tabla
      pdf.setFillColor(185, 28, 28);
      pdf.rect(14, y, 182, 8, 'F');

      pdf.setTextColor(255, 255, 255);
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(9);

      pdf.text('Fecha', 18, y + 5);
      pdf.text('Sede', 42, y + 5);
      pdf.text('Turno', 82, y + 5);
      pdf.text('Horario', 122, y + 5);

      y += 12;

      // Ordenar por día
      turnos.sort((a, b) => a.day - b.day);

      turnos.forEach((a) => {
        const turno = shiftTypes.find((t) => t.name === a.shift);

        const horario =
          turno?.start && turno?.end
            ? turno.isSplit
              ? `${turno.start}-${turno.end} / ${turno.start2}-${turno.end2}`
              : `${turno.start}-${turno.end}`
            : '-';

        const fecha = new Date(
          selectedYear,
          selectedMonth,
          a.day
        ).toLocaleDateString('es-CO');

        pdf.setTextColor(15, 23, 42);
        pdf.setFont('helvetica', 'normal');
        pdf.setFontSize(9);

        pdf.text(fecha, 18, y);
        pdf.text(a.branch, 42, y);
        pdf.text(a.shift, 82, y);
        pdf.text(horario, 122, y);

        y += 7;

        // Nueva página si se llena
        if (y > 270) {
          pdf.addPage();
          y = 20;
        }
      });

      // Resumen
      y += 8;

      const sedesUnicas = new Set(turnos.map((t) => t.branch));

      pdf.setFont('helvetica', 'bold');
      pdf.text(`Total sedes cubiertas: ${sedesUnicas.size}`, 14, y);

      pdf.text(`Total turnos: ${turnos.length}`, 90, y);
    });

    pdf.save(
      `Cobertura_Sedes_${months[selectedMonth]}_${selectedYear}.pdf`
    );
  };

  const openEditModal = (a: Assignment) => {
    setEditingAssignment(a);
    setEditingEmployee(a.employee);
    setEditingShift(a.shift);
    setRangeStart(a.day);
    setRangeEnd(daysInMonth);
    setEditMode('single');
  };

  return (
    <div className="space-y-6">
      {/* Encabezado */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold text-red-700">
            Sede: {selectedBranch}
          </h2>

          <p className="text-slate-500 mt-1">
            Calendario de Turnos - {months[selectedMonth]} {selectedYear}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <select
            value={selectedBranch}
            onChange={(e) => setSelectedBranch(e.target.value)}
            className="border rounded-xl px-4 py-2 bg-white"
          >
            {branches.map((b) => (
              <option key={b} value={b}>
                {b}
              </option>
            ))}
          </select>

          <select
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(Number(e.target.value))}
            className="border rounded-xl px-4 py-2 bg-white"
          >
            {months.map((m, i) => (
              <option key={m} value={i}>
                {m}
              </option>
            ))}
          </select>

          <select
            value={selectedYear}
            onChange={(e) => setSelectedYear(Number(e.target.value))}
            className="border rounded-xl px-4 py-2 bg-white"
          >
            {years.map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>

          <div className="flex gap-3">
            {/* PDF Menu */}
            <div className="relative" ref={pdfMenuRef}>
              <button
                onClick={() => {
                  setShowPdfMenu(!showPdfMenu);
                  setShowExcelMenu(false);
                }}
                className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-xl font-medium flex items-center gap-2"
              >
                📄 PDF
                <span className="text-xs">▼</span>
              </button>

              {showPdfMenu && (
                <div className="absolute right-0 mt-2 w-64 bg-white border border-slate-200 rounded-xl shadow-lg z-50 overflow-hidden">
                  <button
                    onClick={() => {
                      exportPDF();
                      setShowPdfMenu(false);
                    }}
                    className="w-full text-left px-4 py-3 hover:bg-slate-50 text-sm"
                  >
                    📄 Sede actual
                  </button>

                  <button
                    onClick={() => {
                      exportAllPDF();
                      setShowPdfMenu(false);
                    }}
                    className="w-full text-left px-4 py-3 hover:bg-slate-50 text-sm border-t"
                  >
                    📚 Todas las sedes
                  </button>

                  {/* NUEVO BOTÓN */}
                  <button
                    onClick={() => {
                      exportCoveragePDF();
                      setShowPdfMenu(false);
                    }}
                    className="w-full text-left px-4 py-3 hover:bg-slate-50 text-sm border-t"
                  >
                    👥 Cobertura de sedes
                  </button>
                </div>
              )}
            </div>

            {/* EXCEL Menu */}
            <div className="relative" ref={excelMenuRef}>
              <button
                onClick={() => {
                  setShowExcelMenu(!showExcelMenu);
                  setShowPdfMenu(false);
                }}
                className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-xl font-medium flex items-center gap-2"
              >
                📊 Excel
                <span className="text-xs">▼</span>
              </button>

              {showExcelMenu && (
                <div className="absolute right-0 mt-2 w-48 bg-white border border-slate-200 rounded-xl shadow-lg z-50 overflow-hidden">
                  <button
                    onClick={() => {
                      exportExcel();
                      setShowExcelMenu(false);
                    }}
                    className="w-full text-left px-4 py-3 hover:bg-slate-50 text-sm"
                  >
                    📊 Sede actual
                  </button>

                  <button
                    onClick={() => {
                      exportAllExcel();
                      setShowExcelMenu(false);
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
      </div>

      {/* Asignación masiva por rango de días */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4">
        <h3 className="text-lg font-semibold mb-4 text-slate-800">
          Asignación masiva
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <select
            value={bulkAssignment.employee}
            onChange={(e) =>
              setBulkAssignment({
                ...bulkAssignment,
                employee: e.target.value,
              })
            }
            className="px-4 py-3 rounded-xl border border-slate-300 bg-white"
          >
            {employees.map((e) => (
              <option key={e.id} value={e.name}>
                {e.name}
              </option>
            ))}
          </select>

          <select
            value={bulkAssignment.shift}
            onChange={(e) =>
              setBulkAssignment({
                ...bulkAssignment,
                shift: e.target.value,
              })
            }
            className="px-4 py-3 rounded-xl border border-slate-300 bg-white"
          >
            {shiftTypes.map((s) => (
              <option key={s.id} value={s.name}>
                {s.name}
              </option>
            ))}
          </select>

          <input
            type="number"
            min={1}
            max={daysInMonth}
            value={bulkAssignment.startDay}
            onChange={(e) =>
              setBulkAssignment({
                ...bulkAssignment,
                startDay: Number(e.target.value),
              })
            }
            className="px-4 py-3 rounded-xl border border-slate-300"
            placeholder="Desde"
          />

          <input
            type="number"
            min={1}
            max={daysInMonth}
            value={bulkAssignment.endDay}
            onChange={(e) =>
              setBulkAssignment({
                ...bulkAssignment,
                endDay: Number(e.target.value),
              })
            }
            className="px-4 py-3 rounded-xl border border-slate-300"
            placeholder="Hasta"
          />

          <button
            onClick={() => {
              if (!bulkAssignment.employee || !bulkAssignment.shift) return;

              const newAssignments: Assignment[] = [];

              for (
                let day = bulkAssignment.startDay;
                day <= bulkAssignment.endDay;
                day++
              ) {
                newAssignments.push({
                  id: Date.now() + day + Math.random(),
                  day,
                  branch: selectedBranch,
                  employee: bulkAssignment.employee,
                  shift: bulkAssignment.shift,
                });
              }

              setAssignments([...assignments, ...newAssignments]);
            }}
            className="bg-blue-600 text-white px-5 py-3 rounded-xl font-medium hover:bg-blue-700 transition"
          >
            Asignar rango
          </button>
        </div>
      </div>

      {/* Formulario rápido individual */}
      {showForm && (
        <div className="bg-white rounded-2xl border p-4 space-y-3">
          <h3 className="font-bold text-lg">Nuevo turno - Día {quickDay}</h3>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <select
              value={quickEmployee}
              onChange={(e) => setQuickEmployee(e.target.value)}
              className="border rounded-xl px-4 py-3 bg-white"
            >
              <option value="">Empleado</option>
              {employees.map((e) => (
                <option key={e.id} value={e.name}>
                  {e.name}
                </option>
              ))}
            </select>

            <select
              value={quickShift}
              onChange={(e) => setQuickShift(e.target.value)}
              className="border rounded-xl px-4 py-3 bg-white"
            >
              <option value="">Turno</option>
              {shiftTypes.map((s) => (
                <option key={s.id} value={s.name}>
                  {s.name}
                </option>
              ))}
            </select>

            <button
              onClick={createQuickAssignment}
              className="bg-red-600 hover:bg-red-700 text-white rounded-xl px-5 py-3 font-medium"
            >
              Guardar
            </button>
          </div>
        </div>
      )}

      {/* Modal de edición completo */}
      {editingAssignment && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg p-6 space-y-5">
            {/* Encabezado */}
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-2xl font-bold text-slate-800">
                  Editar turno
                </h3>
                <p className="text-slate-500 text-sm">
                  Modifica empleado, turno o aplica cambios masivos
                </p>
              </div>

              <button
                onClick={() => setEditingAssignment(null)}
                className="w-9 h-9 rounded-full hover:bg-slate-100 flex items-center justify-center text-slate-500"
              >
                ✕
              </button>
            </div>

            {/* Información */}
            <div className="bg-slate-50 rounded-2xl p-4 border space-y-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-red-100 flex items-center justify-center">
                  📅
                </div>
                <div>
                  <p className="text-xs text-slate-500">Fecha</p>
                  <p className="font-semibold text-slate-800">
                    {editingAssignment.day} {months[selectedMonth]} {selectedYear}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center">
                  🏢
                </div>
                <div>
                  <p className="text-xs text-slate-500">Sede</p>
                  <p className="font-semibold text-slate-800">
                    {editingAssignment.branch}
                  </p>
                </div>
              </div>
            </div>

            {/* Empleado */}
            <div className="space-y-2">
              <label className="text-sm font-semibold text-slate-700">
                Empleado
              </label>

              <select
                value={editingEmployee}
                onChange={(e) => setEditingEmployee(e.target.value)}
                className="w-full border border-slate-300 rounded-2xl px-4 py-3 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {employees.map((emp) => (
                  <option key={emp.id} value={emp.name}>
                    {emp.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Turno */}
            <div className="space-y-2">
              <label className="text-sm font-semibold text-slate-700">
                Tipo de turno
              </label>

              <select
                value={editingShift}
                onChange={(e) => setEditingShift(e.target.value)}
                className="w-full border border-slate-300 rounded-2xl px-4 py-3 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {shiftTypes.map((s) => (
                  <option key={s.id} value={s.name}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Aplicar cambios */}
            <div className="space-y-3">
              <label className="text-sm font-semibold text-slate-700">
                Aplicar cambios
              </label>

              <div className="grid grid-cols-1 gap-3">
                <button
                  onClick={() => setEditMode('single')}
                  className={`p-3 rounded-2xl border text-left transition ${
                    editMode === 'single'
                      ? 'border-blue-500 bg-blue-50 text-blue-700'
                      : 'border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  <div className="font-medium">Solo este día</div>
                  <div className="text-xs text-slate-500">
                    Cambia únicamente este turno
                  </div>
                </button>

                <button
                  onClick={() => setEditMode('toEnd')}
                  className={`p-3 rounded-2xl border text-left transition ${
                    editMode === 'toEnd'
                      ? 'border-blue-500 bg-blue-50 text-blue-700'
                      : 'border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  <div className="font-medium">Hasta fin de mes</div>
                  <div className="text-xs text-slate-500">
                    Cambia este empleado desde el día actual hasta el final del mes
                  </div>
                </button>

                <button
                  onClick={() => setEditMode('range')}
                  className={`p-3 rounded-2xl border text-left transition ${
                    editMode === 'range'
                      ? 'border-blue-500 bg-blue-50 text-blue-700'
                      : 'border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  <div className="font-medium">Rango personalizado</div>
                  <div className="text-xs text-slate-500">
                    Elige desde qué día hasta qué día aplicar
                  </div>
                </button>
              </div>

              {editMode === 'range' && (
                <div className="grid grid-cols-2 gap-3 pt-2">
                  <div>
                    <label className="text-xs text-slate-500">Desde</label>
                    <input
                      type="number"
                      min={1}
                      max={daysInMonth}
                      value={rangeStart}
                      onChange={(e) => setRangeStart(Number(e.target.value))}
                      className="w-full mt-1 border border-slate-300 rounded-xl px-3 py-2"
                    />
                  </div>

                  <div>
                    <label className="text-xs text-slate-500">Hasta</label>
                    <input
                      type="number"
                      min={1}
                      max={daysInMonth}
                      value={rangeEnd}
                      onChange={(e) => setRangeEnd(Number(e.target.value))}
                      className="w-full mt-1 border border-slate-300 rounded-xl px-3 py-2"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Botones */}
            <div className="flex gap-3 pt-2">
              <button
                onClick={deleteAssignment}
                className="px-4 py-3 rounded-2xl bg-red-50 hover:bg-red-100 text-red-600 font-medium transition"
              >
                🗑️
              </button>

              <button
                onClick={() => setEditingAssignment(null)}
                className="flex-1 py-3 rounded-2xl border border-slate-300 text-slate-700 font-medium hover:bg-slate-50 transition"
              >
                Cancelar
              </button>

              <button
                onClick={saveEditedAssignment}
                className="flex-1 py-3 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-semibold transition"
              >
                💾 Guardar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Calendario */}
      <div className="bg-white rounded-2xl border p-5">
        <div className="grid grid-cols-7 gap-3 mb-3 text-center text-sm font-bold text-white">
          {['LUN', 'MAR', 'MIÉ', 'JUE', 'VIE', 'SÁB', 'DOM'].map((d) => (
            <div key={d} className="bg-red-700 rounded-lg py-2">
              {d}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-3 items-start auto-rows-min">
          {Array.from({ length: startDay }).map((_, i) => (
            <div
              key={`empty-${i}`}
              className="min-h-[100px] bg-slate-50/50 rounded-xl"
            />
          ))}

          {Array.from({ length: daysInMonth }).map((_, i) => {
            const day = i + 1;

            const dayAssignments = branchAssignments.filter(
              (a) => a.day === day
            );

            return (
              <div
                key={day}
                className="border border-slate-200 rounded-xl p-2 min-h-[110px] flex flex-col justify-between bg-white hover:border-red-300 transition shadow-sm"
              >
                <div>
                  <div className="flex justify-between items-center mb-1.5">
                    <span className="font-bold text-slate-700 text-sm">{day}</span>
                    <button
                      onClick={() => {
                        setQuickDay(day);
                        setShowForm(true);
                      }}
                      className="text-xs w-5 h-5 rounded-full bg-slate-100 hover:bg-red-100 text-slate-600 hover:text-red-700 flex items-center justify-center transition"
                      title="Agregar turno"
                    >
                      +
                    </button>
                  </div>

                  <div className="space-y-1">
                    {dayAssignments.map((a) => {
                      const info = getShiftInfo(a.shift);
                      return (
                        <div
                          key={a.id}
                          onClick={() => openEditModal(a)}
                          className={`p-1.5 rounded-lg border text-xs cursor-pointer transition hover:opacity-80 ${info.bg}`}
                        >
                          <p className={`font-semibold truncate ${info.text}`}>
                            {a.employee}
                          </p>
                          <div className="mt-1 text-[10px] font-medium text-slate-700">
                            {a.shift}
                          </div>

                          <div className="text-[10px] text-slate-500">
                            {shiftTypes.find((t) => t.name === a.shift)?.start &&
                            shiftTypes.find((t) => t.name === a.shift)?.end
                              ? shiftTypes.find((t) => t.name === a.shift)?.isSplit
                                ? `${shiftTypes.find((t) => t.name === a.shift)?.start}-${shiftTypes.find((t) => t.name === a.shift)?.end} / ${shiftTypes.find((t) => t.name === a.shift)?.start2}-${shiftTypes.find((t) => t.name === a.shift)?.end2}`
                                : `${shiftTypes.find((t) => t.name === a.shift)?.start}-${shiftTypes.find((t) => t.name === a.shift)?.end}`
                              : '-'}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}