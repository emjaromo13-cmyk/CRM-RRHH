import { useState, useRef, useEffect } from 'react'
import jsPDF from 'jspdf'
import * as XLSX from 'xlsx'

type Employee = {
  id: number
  name: string
  document?: string
  role?: string
  username?: string
  status?: string
}

type ShiftType = {
  id: number
  name: string
  hours?: string
  start?: string
  end?: string
  isSplit?: boolean
  start2?: string
  end2?: string
  color?: string
}

type Zone = 'Zona 1' | 'Zona 2'

type DeliveryAssignment = {
  id: number
  day: number
  month: number
  year: number
  zone: Zone
  deliveryPerson: string
  shift: string
}

type Props = {
  employees: Employee[]
  shiftTypes: ShiftType[]
}

const MONTHS = [
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
]

const WEEK_DAYS = [
  'LUN',
  'MAR',
  'MIÉ',
  'JUE',
  'VIE',
  'SÁB',
  'DOM',
]

const ZONES: Zone[] = ['Zona 1', 'Zona 2']

export default function DeliveryCalendar({
  employees,
  shiftTypes,
}: Props) {
  const today = new Date()

  const [selectedZone, setSelectedZone] =
    useState<Zone>('Zona 1')

  const [selectedMonth, setSelectedMonth] = useState(
    today.getMonth()
  )

  const [selectedYear, setSelectedYear] = useState(
    today.getFullYear()
  )

  const years = Array.from(
    { length: 5 },
    (_, i) => today.getFullYear() - 2 + i
  )

  // =========================================================
  // ZONAS DE LOS DOMICILIARIOS
  // =========================================================

  const [deliveryZones, setDeliveryZones] = useState<
    Record<string, Zone>
  >(() => {
    const saved = localStorage.getItem('deliveryZones')

    if (!saved) return {}

    try {
      return JSON.parse(saved)
    } catch {
      return {}
    }
  })

  useEffect(() => {
    localStorage.setItem(
      'deliveryZones',
      JSON.stringify(deliveryZones)
    )
  }, [deliveryZones])

  // =========================================================
  // ASIGNACIONES
  // =========================================================

  const [assignments, setAssignments] = useState<
    DeliveryAssignment[]
  >(() => {
    const saved = localStorage.getItem(
      'deliveryAssignments'
    )

    if (!saved) return []

    try {
      const parsed = JSON.parse(saved)

      if (!Array.isArray(parsed)) return []

      // Compatibilidad con asignaciones antiguas
      return parsed.map((item: any) => ({
        ...item,
        zone: item.zone || 'Zona 1',
      }))
    } catch {
      return []
    }
  })

  const saveAssignments = (
    newAssignments: DeliveryAssignment[]
  ) => {
    setAssignments(newAssignments)

    localStorage.setItem(
      'deliveryAssignments',
      JSON.stringify(newAssignments)
    )
  }

  // =========================================================
  // DOMICILIARIOS ACTIVOS
  // =========================================================

  const activeDeliveryPeople = employees.filter(
    (employee) =>
      employee.role?.trim().toLowerCase() ===
        'domiciliario' &&
      employee.status?.trim().toLowerCase() ===
        'activo'
  )

  // =========================================================
  // DOMICILIARIOS DE LA ZONA SELECCIONADA
  // =========================================================

  const zoneDeliveryPeople =
    activeDeliveryPeople.filter(
      (employee) =>
        deliveryZones[employee.name] ===
        selectedZone
    )

  // =========================================================
  // ESTADOS
  // =========================================================

  const [showForm, setShowForm] = useState(false)

  const [quickDay, setQuickDay] = useState(1)

  const [quickDeliveryPerson, setQuickDeliveryPerson] =
    useState('')

  const [quickShift, setQuickShift] =
    useState('')

  const [editingAssignment, setEditingAssignment] =
    useState<DeliveryAssignment | null>(null)

  const [editingDeliveryPerson, setEditingDeliveryPerson] =
    useState('')

  const [editingShift, setEditingShift] =
    useState('')

  const [editMode, setEditMode] = useState<
    'single' | 'toEnd' | 'range'
  >('single')

  const [rangeStart, setRangeStart] = useState(1)

  const [rangeEnd, setRangeEnd] = useState(1)

  const [showPdfMenu, setShowPdfMenu] =
    useState(false)

  const [showExcelMenu, setShowExcelMenu] =
    useState(false)

  const [showZoneManager, setShowZoneManager] =
    useState(false)

  const pdfMenuRef =
    useRef<HTMLDivElement>(null)

  const excelMenuRef =
    useRef<HTMLDivElement>(null)

  // =========================================================
  // CERRAR MENÚS
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
        setShowPdfMenu(false)
      }

      if (
        excelMenuRef.current &&
        !excelMenuRef.current.contains(
          event.target as Node
        )
      ) {
        setShowExcelMenu(false)
      }
    }

    document.addEventListener(
      'mousedown',
      handleClickOutside
    )

    return () => {
      document.removeEventListener(
        'mousedown',
        handleClickOutside
      )
    }
  }, [])

  // =========================================================
  // DÍAS DEL MES
  // =========================================================

  const firstDay = new Date(
    selectedYear,
    selectedMonth,
    1
  )

  const daysInMonth = new Date(
    selectedYear,
    selectedMonth + 1,
    0
  ).getDate()

  const startDay =
    (firstDay.getDay() + 6) % 7

  // =========================================================
  // INFORMACIÓN DEL TURNO
  // =========================================================

  const getShiftInfo = (
    shiftName: string
  ) => {
    const turno = shiftTypes.find(
      (t) => t.name === shiftName
    )

    const lower = shiftName.toLowerCase()

    if (lower.includes('desc')) {
      return {
        bg: 'bg-green-100 border-green-200',
        text: 'text-green-800',
        hours: turno?.hours || '',
      }
    }

    if (lower.includes('largo')) {
      return {
        bg: 'bg-gray-200 border-gray-300',
        text: 'text-gray-800',
        hours: turno?.hours || '',
      }
    }

    return {
      bg: 'bg-red-100 border-red-200',
      text: 'text-red-800',
      hours: turno?.hours || '',
    }
  }

  // =========================================================
  // HORARIO DEL TURNO
  // =========================================================

  const getShiftSchedule = (
    shiftName: string
  ) => {
    const turno = shiftTypes.find(
      (t) => t.name === shiftName
    )

    if (!turno?.start || !turno?.end) {
      return '-'
    }

    if (
      turno.isSplit &&
      turno.start2 &&
      turno.end2
    ) {
      return `${turno.start}-${turno.end} / ${turno.start2}-${turno.end2}`
    }

    return `${turno.start}-${turno.end}`
  }

  // =========================================================
  // HORAS DEL TURNO
  // =========================================================

  const getShiftHours = (
    shiftName: string
  ) => {
    const turno = shiftTypes.find(
      (t) => t.name === shiftName
    )

    if (!turno) return 0

    if (turno.hours) {
      const parsed = Number(
        String(turno.hours).replace(',', '.')
      )

      if (!isNaN(parsed)) {
        return parsed
      }
    }

    if (
      !turno.start ||
      !turno.end
    ) {
      return 0
    }

    const getMinutes = (
      time: string
    ) => {
      const [h, m] = time
        .split(':')
        .map(Number)

      return h * 60 + m
    }

    let start = getMinutes(turno.start)
    let end = getMinutes(turno.end)

    if (end < start) {
      end += 24 * 60
    }

    let total =
      (end - start) / 60

    if (
      turno.isSplit &&
      turno.start2 &&
      turno.end2
    ) {
      let start2 =
        getMinutes(turno.start2)

      let end2 =
        getMinutes(turno.end2)

      if (end2 < start2) {
        end2 += 24 * 60
      }

      total +=
        (end2 - start2) / 60
    }

    return total
  }

  // =========================================================
  // ASIGNACIONES DEL DÍA
  // =========================================================

  const getDayAssignments = (
    day: number
  ) => {
    return assignments.filter(
      (a) =>
        a.day === day &&
        a.month === selectedMonth &&
        a.year === selectedYear &&
        a.zone === selectedZone
    )
  }

  // =========================================================
  // ASIGNAR ZONA
  // =========================================================

  const changeDeliveryZone = (
    name: string,
    zone: Zone
  ) => {
    setDeliveryZones((prev) => ({
      ...prev,
      [name]: zone,
    }))
  }

  // =========================================================
  // ASIGNACIÓN RÁPIDA
  // =========================================================

  const createQuickAssignment = () => {
    if (
      !quickDeliveryPerson ||
      !quickShift
    ) {
      alert(
        'Selecciona el domiciliario y el turno.'
      )

      return
    }

    const belongsToZone =
      deliveryZones[
        quickDeliveryPerson
      ] === selectedZone

    if (!belongsToZone) {
      alert(
        'El domiciliario seleccionado no pertenece a esta zona.'
      )

      return
    }

    const alreadyExists =
      assignments.some(
        (a) =>
          a.day === quickDay &&
          a.month === selectedMonth &&
          a.year === selectedYear &&
          a.zone === selectedZone &&
          a.deliveryPerson ===
            quickDeliveryPerson
      )

    if (alreadyExists) {
      alert(
        'Este domiciliario ya tiene un turno asignado en este día.'
      )

      return
    }

    const newAssignment: DeliveryAssignment = {
      id:
        Date.now() +
        Math.random(),

      day: quickDay,

      month: selectedMonth,

      year: selectedYear,

      zone: selectedZone,

      deliveryPerson:
        quickDeliveryPerson,

      shift: quickShift,
    }

    saveAssignments([
      ...assignments,
      newAssignment,
    ])

    setShowForm(false)
    setQuickDeliveryPerson('')
    setQuickShift('')
  }

  // =========================================================
  // ASIGNACIÓN MASIVA
  // =========================================================

  const [bulkAssignment, setBulkAssignment] =
    useState({
      deliveryPerson: '',
      shift:
        shiftTypes[0]?.name || '',
      startDay: 1,
      endDay: daysInMonth,
    })

  useEffect(() => {
    if (
      zoneDeliveryPeople.length > 0 &&
      !zoneDeliveryPeople.some(
        (e) =>
          e.name ===
          bulkAssignment.deliveryPerson
      )
    ) {
      setBulkAssignment(
        (prev) => ({
          ...prev,
          deliveryPerson:
            zoneDeliveryPeople[0]
              .name,
        })
      )
    }

    if (
      zoneDeliveryPeople.length === 0
    ) {
      setBulkAssignment(
        (prev) => ({
          ...prev,
          deliveryPerson: '',
        })
      )
    }
  }, [
    selectedZone,
    zoneDeliveryPeople,
  ])

  const createBulkAssignment = () => {
    if (
      !bulkAssignment.deliveryPerson ||
      !bulkAssignment.shift
    ) {
      alert(
        'Selecciona el domiciliario y el turno.'
      )

      return
    }

    if (
      bulkAssignment.startDay < 1 ||
      bulkAssignment.endDay >
        daysInMonth ||
      bulkAssignment.startDay >
        bulkAssignment.endDay
    ) {
      alert(
        'El rango de días no es válido.'
      )

      return
    }

    if (
      deliveryZones[
        bulkAssignment.deliveryPerson
      ] !== selectedZone
    ) {
      alert(
        'El domiciliario seleccionado no pertenece a esta zona.'
      )

      return
    }

    const newAssignments: DeliveryAssignment[] =
      []

    for (
      let day =
        bulkAssignment.startDay;
      day <=
        bulkAssignment.endDay;
      day++
    ) {
      const alreadyExists =
        assignments.some(
          (a) =>
            a.day === day &&
            a.month === selectedMonth &&
            a.year === selectedYear &&
            a.zone === selectedZone &&
            a.deliveryPerson ===
              bulkAssignment.deliveryPerson
        )

      if (!alreadyExists) {
        newAssignments.push({
          id:
            Date.now() +
            day +
            Math.random(),

          day,

          month: selectedMonth,

          year: selectedYear,

          zone: selectedZone,

          deliveryPerson:
            bulkAssignment.deliveryPerson,

          shift:
            bulkAssignment.shift,
        })
      }
    }

    if (
      newAssignments.length === 0
    ) {
      alert(
        'El domiciliario ya tiene turnos asignados en todos los días seleccionados.'
      )

      return
    }

    saveAssignments([
      ...assignments,
      ...newAssignments,
    ])

    alert(
      `Se crearon ${newAssignments.length} asignaciones.`
    )
  }

  // =========================================================
  // EDITAR
  // =========================================================

  const openEditModal = (
    assignment: DeliveryAssignment
  ) => {
    setEditingAssignment(
      assignment
    )

    setEditingDeliveryPerson(
      assignment.deliveryPerson
    )

    setEditingShift(
      assignment.shift
    )

    setRangeStart(
      assignment.day
    )

    setRangeEnd(
      daysInMonth
    )

    setEditMode('single')
  }

  // =========================================================
  // GUARDAR EDICIÓN
  // =========================================================

  const saveEditedAssignment = () => {
    if (!editingAssignment) {
      return
    }

    const currentDay =
      editingAssignment.day

    let updatedAssignments =
      [...assignments]

    if (
      deliveryZones[
        editingDeliveryPerson
      ] !== selectedZone
    ) {
      alert(
        'El domiciliario seleccionado no pertenece a esta zona.'
      )

      return
    }

    if (
      editMode === 'single'
    ) {
      updatedAssignments =
        assignments.map(
          (item) =>
            item.id ===
            editingAssignment.id
              ? {
                  ...item,
                  zone: selectedZone,
                  deliveryPerson:
                    editingDeliveryPerson,
                  shift:
                    editingShift,
                }
              : item
        )
    }

    if (
      editMode === 'toEnd'
    ) {
      updatedAssignments =
        assignments.map(
          (item) =>
            item.month ===
              selectedMonth &&
            item.year ===
              selectedYear &&
            item.zone ===
              selectedZone &&
            item.deliveryPerson ===
              editingAssignment.deliveryPerson &&
            item.day >= currentDay
              ? {
                  ...item,
                  deliveryPerson:
                    editingDeliveryPerson,
                  shift:
                    editingShift,
                }
              : item
        )
    }

    if (
      editMode === 'range'
    ) {
      if (
        rangeStart < 1 ||
        rangeEnd > daysInMonth ||
        rangeStart > rangeEnd
      ) {
        alert(
          'El rango seleccionado no es válido.'
        )

        return
      }

      updatedAssignments =
        assignments.map(
          (item) =>
            item.month ===
              selectedMonth &&
            item.year ===
              selectedYear &&
            item.zone ===
              selectedZone &&
            item.deliveryPerson ===
              editingAssignment.deliveryPerson &&
            item.day >= rangeStart &&
            item.day <= rangeEnd
              ? {
                  ...item,
                  deliveryPerson:
                    editingDeliveryPerson,
                  shift:
                    editingShift,
                }
              : item
        )
    }

    saveAssignments(
      updatedAssignments
    )

    setEditingAssignment(null)
  }

  // =========================================================
  // ELIMINAR
  // =========================================================

  const deleteAssignment = () => {
    if (!editingAssignment) {
      return
    }

    const confirmDelete =
      window.confirm(
        `¿Eliminar la asignación de ${editingAssignment.deliveryPerson} del día ${editingAssignment.day}?`
      )

    if (!confirmDelete) {
      return
    }

    saveAssignments(
      assignments.filter(
        (a) =>
          a.id !==
          editingAssignment.id
      )
    )

    setEditingAssignment(null)
  }

  // =========================================================
  // NAVEGACIÓN
  // =========================================================

  const previousMonth = () => {
    if (selectedMonth === 0) {
      setSelectedMonth(11)
      setSelectedYear(
        selectedYear - 1
      )
    } else {
      setSelectedMonth(
        selectedMonth - 1
      )
    }
  }

  const nextMonth = () => {
    if (selectedMonth === 11) {
      setSelectedMonth(0)
      setSelectedYear(
        selectedYear + 1
      )
    } else {
      setSelectedMonth(
        selectedMonth + 1
      )
    }
  }

  const goToToday = () => {
    const currentDate =
      new Date()

    setSelectedMonth(
      currentDate.getMonth()
    )

    setSelectedYear(
      currentDate.getFullYear()
    )
  }

  // =========================================================
  // EXPORTAR EXCEL
  // =========================================================

  const exportExcel = () => {
    const currentAssignments =
      assignments.filter(
        (a) =>
          a.month === selectedMonth &&
          a.year === selectedYear &&
          a.zone === selectedZone
      )

    const data =
      currentAssignments.map(
        (a) => {
          const turno =
            shiftTypes.find(
              (t) =>
                t.name === a.shift
            )

          const fecha =
            new Date(
              selectedYear,
              selectedMonth,
              a.day
            )

          return {
            Fecha:
              fecha.toLocaleDateString(
                'es-CO'
              ),

            Zona:
              a.zone,

            Domiciliario:
              a.deliveryPerson,

            Turno:
              a.shift,

            Horario:
              getShiftSchedule(
                a.shift
              ),

            Horas:
              getShiftHours(
                a.shift
              ),

            Usuario:
              employees.find(
                (e) =>
                  e.name ===
                  a.deliveryPerson
              )?.username || '',

            'Hora inicio':
              turno?.start || '',

            'Hora fin':
              turno?.end || '',
          }
        }
      )

    const ws =
      XLSX.utils.json_to_sheet(
        data
      )

    ws['!cols'] = [
      { wch: 14 },
      { wch: 12 },
      { wch: 30 },
      { wch: 20 },
      { wch: 25 },
      { wch: 10 },
      { wch: 15 },
      { wch: 14 },
      { wch: 14 },
    ]

    const wb =
      XLSX.utils.book_new()

    XLSX.utils.book_append_sheet(
      wb,
      ws,
      'Domiciliarios'
    )

    XLSX.writeFile(
      wb,
      `Turnos_Domiciliarios_${selectedZone}_${MONTHS[selectedMonth]}_${selectedYear}.xlsx`
    )
  }

  // =========================================================
  // EXCEL CONSOLIDADO
  // =========================================================

  const exportAllExcel = () => {
    const currentAssignments =
      assignments.filter(
        (a) =>
          a.month === selectedMonth &&
          a.year === selectedYear &&
          a.zone === selectedZone
      )

    const resumen =
      new Map<
        string,
        {
          Zona: string
          Domiciliario: string
          Usuario: string
          'Turnos realizados': number
          'Horas realizadas': number
        }
      >()

    currentAssignments.forEach(
      (a) => {
        if (
          !resumen.has(
            a.deliveryPerson
          )
        ) {
          resumen.set(
            a.deliveryPerson,
            {
              Zona:
                selectedZone,

              Domiciliario:
                a.deliveryPerson,

              Usuario:
                employees.find(
                  (e) =>
                    e.name ===
                    a.deliveryPerson
                )?.username || '',

              'Turnos realizados':
                0,

              'Horas realizadas':
                0,
            }
          )
        }

        const row =
          resumen.get(
            a.deliveryPerson
          )!

        row[
          'Turnos realizados'
        ] += 1

        row[
          'Horas realizadas'
        ] += getShiftHours(
          a.shift
        )
      }
    )

    const data =
      Array.from(
        resumen.values()
      ).map((r) => ({
        ...r,

        'Horas realizadas':
          Number(
            r[
              'Horas realizadas'
            ].toFixed(1)
          ),
      }))

    const ws =
      XLSX.utils.json_to_sheet(
        data
      )

    ws['!cols'] = [
      { wch: 12 },
      { wch: 30 },
      { wch: 15 },
      { wch: 20 },
      { wch: 20 },
    ]

    const wb =
      XLSX.utils.book_new()

    XLSX.utils.book_append_sheet(
      wb,
      ws,
      'CONSOLIDADO'
    )

    XLSX.writeFile(
      wb,
      `Resumen_Domiciliarios_${selectedZone}_${MONTHS[selectedMonth]}_${selectedYear}.xlsx`
    )
  }

  // =========================================================
  // PDF
  // =========================================================

  const exportPDF = () => {
    try {
      const pdf =
        new jsPDF({
          orientation:
            'landscape',
          unit: 'mm',
          format: 'a4',
        })

      const pageWidth =
        pdf.internal.pageSize.getWidth()

      pdf.setFont(
        'helvetica',
        'bold'
      )

      pdf.setFontSize(20)

      pdf.setTextColor(
        185,
        28,
        28
      )

      pdf.text(
        `Calendario Domiciliarios - ${selectedZone}`,
        pageWidth / 2,
        15,
        {
          align: 'center',
        }
      )

      pdf.setFont(
        'helvetica',
        'normal'
      )

      pdf.setFontSize(11)

      pdf.setTextColor(
        100,
        116,
        139
      )

      pdf.text(
        `${MONTHS[selectedMonth]} ${selectedYear}`,
        pageWidth / 2,
        22,
        {
          align: 'center',
        }
      )

      const startX = 8
      const startY = 30
      const cellW = 40
      const cellH = 27

      WEEK_DAYS.forEach(
        (dayName, index) => {
          const x =
            startX +
            index * cellW

          pdf.setFillColor(
            185,
            28,
            28
          )

          pdf.rect(
            x,
            startY,
            cellW,
            8,
            'F'
          )

          pdf.setTextColor(
            255,
            255,
            255
          )

          pdf.setFontSize(8)

          pdf.text(
            dayName,
            x + cellW / 2,
            startY + 5,
            {
              align: 'center',
            }
          )
        }
      )

      for (
        let day = 1;
        day <= daysInMonth;
        day++
      ) {
        const position =
          startDay + day - 1

        const row =
          Math.floor(
            position / 7
          )

        const col =
          position % 7

        const x =
          startX +
          col * cellW

        const y =
          startY +
          8 +
          row * cellH

        pdf.setDrawColor(
          220,
          220,
          220
        )

        pdf.rect(
          x,
          y,
          cellW,
          cellH
        )

        pdf.setTextColor(
          30,
          41,
          59
        )

        pdf.setFontSize(8)

        pdf.setFont(
          'helvetica',
          'bold'
        )

        pdf.text(
          String(day),
          x + 2,
          y + 5
        )

        const dayAssignments =
          getDayAssignments(
            day
          )

        pdf.setFont(
          'helvetica',
          'normal'
        )

        dayAssignments
          .slice(0, 3)
          .forEach(
            (
              assignment,
              index
            ) => {
              pdf.setFontSize(6.5)

              const name =
                assignment.deliveryPerson.length >
                20
                  ? assignment.deliveryPerson.slice(
                      0,
                      19
                    ) + '…'
                  : assignment.deliveryPerson

              pdf.text(
                name,
                x + 2,
                y +
                  10 +
                  index * 5
              )

              pdf.setFontSize(5.5)

              pdf.text(
                assignment.shift,
                x + 2,
                y +
                  13 +
                  index * 5
              )
            }
          )
      }

      pdf.save(
        `Calendario_Domiciliarios_${selectedZone}_${MONTHS[selectedMonth]}_${selectedYear}.pdf`
      )
    } catch (error) {
      console.error(
        'Error generando PDF:',
        error
      )

      alert(
        'No se pudo generar el PDF.'
      )
    }
  }

  // =========================================================
  // RENDER
  // =========================================================

  return (
    <div className="space-y-6">

      {/* =====================================================
          ENCABEZADO
      ====================================================== */}

      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold text-red-700">
            Zona: {selectedZone}
          </h2>

          <p className="text-slate-500 mt-1">
            Calendario de Turnos -{' '}
            {MONTHS[selectedMonth]}{' '}
            {selectedYear}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">

          {/* ZONA */}

          <select
            value={selectedZone}
            onChange={(e) => {
              setSelectedZone(
                e.target.value as Zone
              )

              setQuickDeliveryPerson('')
            }}
            className="border border-slate-300 rounded-lg px-3 py-2 bg-white text-sm"
          >
            {ZONES.map((zone) => (
              <option
                key={zone}
                value={zone}
              >
                {zone}
              </option>
            ))}
          </select>

          {/* MES */}

          <select
            value={selectedMonth}
            onChange={(e) =>
              setSelectedMonth(
                Number(e.target.value)
              )
            }
            className="border border-slate-300 rounded-lg px-3 py-2 bg-white text-sm"
          >
            {MONTHS.map(
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
                Number(e.target.value)
              )
            }
            className="border border-slate-300 rounded-lg px-3 py-2 bg-white text-sm"
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

          {/* HOY */}

          <button
            onClick={goToToday}
            className="px-3 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-sm font-medium"
          >
            Hoy
          </button>

          {/* PDF */}

          <div
            ref={pdfMenuRef}
            className="relative"
          >
            <button
              onClick={() =>
                setShowPdfMenu(
                  !showPdfMenu
                )
              }
              className="px-3 py-2 rounded-lg bg-red-700 text-white text-sm font-medium"
            >
              PDF ▾
            </button>

            {showPdfMenu && (
              <div className="absolute right-0 mt-2 w-52 bg-white border border-slate-200 rounded-xl shadow-lg z-30 overflow-hidden">
                <button
                  onClick={() => {
                    exportPDF()
                    setShowPdfMenu(false)
                  }}
                  className="w-full text-left px-4 py-3 hover:bg-slate-50 text-sm"
                >
                  Calendario PDF
                </button>
              </div>
            )}
          </div>

          {/* EXCEL */}

          <div
            ref={excelMenuRef}
            className="relative"
          >
            <button
              onClick={() =>
                setShowExcelMenu(
                  !showExcelMenu
                )
              }
              className="px-3 py-2 rounded-lg bg-green-600 text-white text-sm font-medium"
            >
              Excel ▾
            </button>

            {showExcelMenu && (
              <div className="absolute right-0 mt-2 w-64 bg-white border border-slate-200 rounded-xl shadow-lg z-30 overflow-hidden">
                <button
                  onClick={() => {
                    exportExcel()
                    setShowExcelMenu(false)
                  }}
                  className="w-full text-left px-4 py-3 hover:bg-slate-50 text-sm"
                >
                  Detalle de turnos
                </button>

                <button
                  onClick={() => {
                    exportAllExcel()
                    setShowExcelMenu(false)
                  }}
                  className="w-full text-left px-4 py-3 hover:bg-slate-50 text-sm"
                >
                  Consolidado
                </button>
              </div>
            )}
          </div>

          {/* CONFIGURAR ZONAS */}

          <button
            onClick={() =>
              setShowZoneManager(
                !showZoneManager
              )
            }
            className="px-3 py-2 rounded-lg bg-slate-700 text-white text-sm font-medium"
          >
            Configurar zonas
          </button>
        </div>
      </div>

      {/* =====================================================
          CONFIGURACIÓN DE DOMICILIARIOS POR ZONA
      ====================================================== */}

      {showZoneManager && (
        <div className="bg-white rounded-2xl border border-slate-200 p-4">

          <h3 className="text-lg font-semibold mb-2 text-slate-800">
            Domiciliarios por zona
          </h3>

          <p className="text-sm text-slate-500 mb-4">
            Selecciona la zona correspondiente a cada domiciliario.
            Esta configuración se guarda automáticamente.
          </p>

          {activeDeliveryPeople.length ===
          0 ? (
            <div className="p-4 bg-slate-50 rounded-xl text-sm text-slate-500">
              No hay domiciliarios activos registrados.
            </div>
          ) : (
            <div className="space-y-2">
              {activeDeliveryPeople.map(
                (employee) => (
                  <div
                    key={employee.id}
                    className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 p-3 border border-slate-200 rounded-xl"
                  >
                    <div>
                      <p className="font-semibold text-slate-800">
                        {employee.name}
                      </p>

                      <p className="text-xs text-slate-500">
                        {employee.username ||
                          'Sin usuario'}
                      </p>
                    </div>

                    <select
                      value={
                        deliveryZones[
                          employee.name
                        ] || ''
                      }
                      onChange={(e) =>
                        changeDeliveryZone(
                          employee.name,
                          e.target
                            .value as Zone
                        )
                      }
                      className="border border-slate-300 rounded-lg px-3 py-2 bg-white text-sm"
                    >
                      <option value="">
                        Seleccionar zona
                      </option>

                      {ZONES.map(
                        (zone) => (
                          <option
                            key={zone}
                            value={zone}
                          >
                            {zone}
                          </option>
                        )
                      )}
                    </select>
                  </div>
                )
              )}
            </div>
          )}
        </div>
      )}

      {/* =====================================================
          RESUMEN DE LA ZONA
      ====================================================== */}

      <div className="bg-white rounded-2xl border border-slate-200 p-4">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">

          <div>
            <h3 className="text-lg font-semibold text-slate-800">
              {selectedZone}
            </h3>

            <p className="text-sm text-slate-500">
              Domiciliarios asignados a esta zona:{' '}
              <span className="font-semibold text-slate-700">
                {zoneDeliveryPeople.length}
              </span>
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            {zoneDeliveryPeople.map(
              (employee) => (
                <span
                  key={employee.id}
                  className="px-3 py-1.5 rounded-full bg-red-100 text-red-800 text-xs font-medium"
                >
                  {employee.name}
                </span>
              )
            )}
          </div>
        </div>
      </div>

      {/* =====================================================
          ASIGNACIÓN MASIVA
      ====================================================== */}

      <div className="bg-white rounded-2xl border border-slate-200 p-4">

        <h3 className="text-lg font-semibold mb-4 text-slate-800">
          Asignación masiva
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">

          <select
            value={
              bulkAssignment.deliveryPerson
            }
            onChange={(e) =>
              setBulkAssignment(
                (prev) => ({
                  ...prev,
                  deliveryPerson:
                    e.target.value,
                })
              )
            }
            className="border border-slate-300 rounded-lg px-3 py-2 bg-white text-sm"
          >
            <option value="">
              Seleccionar domiciliario
            </option>

            {zoneDeliveryPeople.map(
              (employee) => (
                <option
                  key={employee.id}
                  value={employee.name}
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
              setBulkAssignment(
                (prev) => ({
                  ...prev,
                  shift:
                    e.target.value,
                })
              )
            }
            className="border border-slate-300 rounded-lg px-3 py-2 bg-white text-sm"
          >
            <option value="">
              Seleccionar turno
            </option>

            {shiftTypes.map(
              (shift) => (
                <option
                  key={shift.id}
                  value={shift.name}
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
              setBulkAssignment(
                (prev) => ({
                  ...prev,
                  startDay:
                    Number(
                      e.target.value
                    ),
                })
              )
            }
            className="border border-slate-300 rounded-lg px-3 py-2 text-sm"
            placeholder="Día inicio"
          />

          <input
            type="number"
            min={1}
            max={daysInMonth}
            value={
              bulkAssignment.endDay
            }
            onChange={(e) =>
              setBulkAssignment(
                (prev) => ({
                  ...prev,
                  endDay:
                    Number(
                      e.target.value
                    ),
                })
              )
            }
            className="border border-slate-300 rounded-lg px-3 py-2 text-sm"
            placeholder="Día fin"
          />

          <button
            onClick={
              createBulkAssignment
            }
            disabled={
              zoneDeliveryPeople.length ===
              0
            }
            className="bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 text-white rounded-lg px-4 py-2 text-sm font-medium"
          >
            Asignar rango
          </button>
        </div>
      </div>

      {/* =====================================================
          FORMULARIO RÁPIDO
      ====================================================== */}

      {showForm && (
        <div className="bg-white rounded-2xl border border-slate-200 p-4 space-y-3">

          <h3 className="font-bold text-lg">
            Nuevo turno - Día {quickDay}
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">

            <select
              value={
                quickDeliveryPerson
              }
              onChange={(e) =>
                setQuickDeliveryPerson(
                  e.target.value
                )
              }
              className="border border-slate-300 rounded-lg px-3 py-2 bg-white text-sm"
            >
              <option value="">
                Seleccionar domiciliario
              </option>

              {zoneDeliveryPeople.map(
                (employee) => (
                  <option
                    key={employee.id}
                    value={employee.name}
                  >
                    {employee.name}
                  </option>
                )
              )}
            </select>

            <select
              value={quickShift}
              onChange={(e) =>
                setQuickShift(
                  e.target.value
                )
              }
              className="border border-slate-300 rounded-lg px-3 py-2 bg-white text-sm"
            >
              <option value="">
                Seleccionar turno
              </option>

              {shiftTypes.map(
                (shift) => (
                  <option
                    key={shift.id}
                    value={shift.name}
                  >
                    {shift.name}
                  </option>
                )
              )}
            </select>

            <button
              onClick={
                createQuickAssignment
              }
              className="bg-red-700 hover:bg-red-800 text-white rounded-lg px-4 py-2 font-medium"
            >
              Guardar
            </button>
          </div>
        </div>
      )}

      {/* =====================================================
          CALENDARIO
      ====================================================== */}

      <div className="bg-white rounded-2xl border p-5">

        <div className="flex justify-between items-center mb-4">
          <button
            onClick={previousMonth}
            className="px-3 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-sm"
          >
            ← Anterior
          </button>

          <button
            onClick={nextMonth}
            className="px-3 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-sm"
          >
            Siguiente →
          </button>
        </div>

        <div className="grid grid-cols-7 gap-3 mb-3 text-center text-sm font-bold text-white">

          {WEEK_DAYS.map(
            (day) => (
              <div
                key={day}
                className="bg-red-700 rounded-lg py-2"
              >
                {day}
              </div>
            )
          )}

        </div>

        <div className="grid grid-cols-7 gap-3 items-start auto-rows-min">

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

          {Array.from({
            length: daysInMonth,
          }).map(
            (_, index) => {
              const day =
                index + 1

              const dayAssignments =
                getDayAssignments(
                  day
                )

              return (
                <div
                  key={day}
                  className="border border-slate-200 rounded-xl p-2 min-h-[110px] flex flex-col justify-between bg-white hover:border-red-300 transition shadow-sm"
                >

                  <div className="flex justify-between items-center mb-1.5">

                    <span className="font-bold text-slate-700 text-sm">
                      {day}
                    </span>

                    <button
                      onClick={() => {
                        setQuickDay(day)
                        setShowForm(true)
                        setQuickDeliveryPerson(
                          ''
                        )
                        setQuickShift('')
                      }}
                      className="text-xs w-5 h-5 rounded-full bg-slate-100 hover:bg-red-100 text-slate-600 hover:text-red-700 transition"
                    >
                      +
                    </button>
                  </div>

                  <div className="space-y-1">

                    {dayAssignments.map(
                      (assignment) => {
                        const info =
                          getShiftInfo(
                            assignment.shift
                          )

                        return (
                          <div
                            key={
                              assignment.id
                            }
                            onClick={() =>
                              openEditModal(
                                assignment
                              )
                            }
                            className={`p-1.5 rounded-lg border text-xs cursor-pointer transition hover:opacity-80 ${info.bg}`}
                          >

                            <div
                              className={`font-semibold truncate ${info.text}`}
                            >
                              {
                                assignment.deliveryPerson
                              }
                            </div>

                            <div className="mt-1 text-[10px] font-medium text-slate-700">
                              {
                                assignment.shift
                              }
                            </div>

                            <div className="text-[10px] text-slate-500">
                              {
                                getShiftSchedule(
                                  assignment.shift
                                )
                              }
                            </div>
                          </div>
                        )
                      }
                    )}

                  </div>
                </div>
              )
            }
          )}

        </div>
      </div>

      {/* =====================================================
          MODAL EDITAR
      ====================================================== */}

      {editingAssignment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">

          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg p-6 space-y-5">

            <div className="flex items-center justify-between">

              <div>
                <h3 className="text-2xl font-bold text-slate-800">
                  Editar turno
                </h3>

                <p className="text-sm text-slate-500 mt-1">
                  Modifica la asignación seleccionada.
                </p>
              </div>

              <button
                onClick={() =>
                  setEditingAssignment(
                    null
                  )
                }
                className="w-9 h-9 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600"
              >
                ✕
              </button>
            </div>

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
                    {editingAssignment.day}{' '}
                    de{' '}
                    {MONTHS[
                      selectedMonth
                    ]}{' '}
                    {selectedYear}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3">

                <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center">
                  📍
                </div>

                <div>
                  <p className="text-xs text-slate-500">
                    Zona
                  </p>

                  <p className="font-semibold text-slate-800">
                    {selectedZone}
                  </p>
                </div>
              </div>

            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">
                Domiciliario
              </label>

              <select
                value={
                  editingDeliveryPerson
                }
                onChange={(e) =>
                  setEditingDeliveryPerson(
                    e.target.value
                  )
                }
                className="w-full border border-slate-300 rounded-lg px-3 py-2 bg-white"
              >
                {zoneDeliveryPeople.map(
                  (employee) => (
                    <option
                      key={employee.id}
                      value={employee.name}
                    >
                      {employee.name}
                    </option>
                  )
                )}
              </select>
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">
                Turno
              </label>

              <select
                value={editingShift}
                onChange={(e) =>
                  setEditingShift(
                    e.target.value
                  )
                }
                className="w-full border border-slate-300 rounded-lg px-3 py-2 bg-white"
              >
                {shiftTypes.map(
                  (shift) => (
                    <option
                      key={shift.id}
                      value={shift.name}
                    >
                      {shift.name}
                    </option>
                  )
                )}
              </select>
            </div>

            <div>

              <label className="block text-sm font-semibold text-slate-700 mb-2">
                Aplicar cambio
              </label>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-2">

                <button
                  onClick={() =>
                    setEditMode(
                      'single'
                    )
                  }
                  className={`px-3 py-2 rounded-lg text-sm border ${
                    editMode ===
                    'single'
                      ? 'bg-red-700 text-white border-red-700'
                      : 'bg-white text-slate-700 border-slate-300'
                  }`}
                >
                  Solo este día
                </button>

                <button
                  onClick={() =>
                    setEditMode(
                      'toEnd'
                    )
                  }
                  className={`px-3 py-2 rounded-lg text-sm border ${
                    editMode ===
                    'toEnd'
                      ? 'bg-red-700 text-white border-red-700'
                      : 'bg-white text-slate-700 border-slate-300'
                  }`}
                >
                  Hasta fin de mes
                </button>

                <button
                  onClick={() =>
                    setEditMode(
                      'range'
                    )
                  }
                  className={`px-3 py-2 rounded-lg text-sm border ${
                    editMode ===
                    'range'
                      ? 'bg-red-700 text-white border-red-700'
                      : 'bg-white text-slate-700 border-slate-300'
                  }`}
                >
                  Rango
                </button>

              </div>
            </div>

            {editMode ===
              'range' && (
              <div className="grid grid-cols-2 gap-3">

                <div>
                  <label className="block text-xs text-slate-500 mb-1">
                    Día inicial
                  </label>

                  <input
                    type="number"
                    min={1}
                    max={daysInMonth}
                    value={rangeStart}
                    onChange={(e) =>
                      setRangeStart(
                        Number(
                          e.target
                            .value
                        )
                      )
                    }
                    className="w-full border border-slate-300 rounded-lg px-3 py-2"
                  />
                </div>

                <div>
                  <label className="block text-xs text-slate-500 mb-1">
                    Día final
                  </label>

                  <input
                    type="number"
                    min={1}
                    max={daysInMonth}
                    value={rangeEnd}
                    onChange={(e) =>
                      setRangeEnd(
                        Number(
                          e.target
                            .value
                        )
                      )
                    }
                    className="w-full border border-slate-300 rounded-lg px-3 py-2"
                  />
                </div>

              </div>
            )}

            <div className="flex flex-col md:flex-row justify-between gap-3 pt-2">

              <button
                onClick={
                  deleteAssignment
                }
                className="px-4 py-2 rounded-lg bg-red-100 text-red-700 hover:bg-red-200 font-medium"
              >
                Eliminar
              </button>

              <div className="flex gap-2">

                <button
                  onClick={() =>
                    setEditingAssignment(
                      null
                    )
                  }
                  className="px-4 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium"
                >
                  Cancelar
                </button>

                <button
                  onClick={
                    saveEditedAssignment
                  }
                  className="px-4 py-2 rounded-lg bg-red-700 hover:bg-red-800 text-white font-medium"
                >
                  Guardar cambios
                </button>

              </div>
            </div>

          </div>
        </div>
      )}

    </div>
  )
}