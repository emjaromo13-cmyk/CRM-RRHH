import { useState } from "react";
import type { Dispatch, SetStateAction } from "react";

type ShiftType = {
  id: number;
  name: string;
  hours: string;
  start?: string;
  end?: string;
  isSplit?: boolean;
  start2?: string;
  end2?: string;
  color?: string;
};

type Props = {
  shiftTypes: ShiftType[];
  setShiftTypes: Dispatch<SetStateAction<ShiftType[]>>;
  readOnly?: boolean;
};

function hoursBetween(start?: string, end?: string) {
  if (!start || !end) return 0;

  const [sh, sm] = start.split(":").map(Number);
  const [eh, em] = end.split(":").map(Number);

  let startMin = sh * 60 + sm;
  let endMin = eh * 60 + em;

  if (endMin < startMin) endMin += 24 * 60;

  return (endMin - startMin) / 60;
}

function totalHours(shift: Partial<ShiftType>) {
  if (shift.hours) return shift.hours;

  const first = hoursBetween(shift.start, shift.end);

  if (!shift.isSplit) return first.toString();

  const total = first + hoursBetween(shift.start2, shift.end2);
  return total.toString();
}

export default function ShiftTypes({
  shiftTypes,
  setShiftTypes,
  readOnly = false,
}: Props) {
  const [editingId, setEditingId] = useState<number | null>(null);

  const [form, setForm] = useState<{
    name: string;
    hours: string;
    start: string;
    end: string;
    isSplit: boolean;
    start2: string;
    end2: string;
    color: string;
  }>({
    name: "",
    hours: "",
    start: "",
    end: "",
    isSplit: false,
    start2: "",
    end2: "",
    color: "bg-green-100 text-green-700",
  });

  const saveShift = () => {
    if (!form.name) return;

    // Calcular las horas automáticamente si no se introdujeron manualmente
    const computedHours = form.hours || totalHours(form);

    const shiftData: ShiftType = {
      id: editingId ?? Date.now(),
      name: form.name,
      hours: computedHours,
      start: form.start || undefined,
      end: form.end || undefined,
      isSplit: form.isSplit,
      start2: form.start2 || undefined,
      end2: form.end2 || undefined,
      color: form.color,
    };

    if (editingId) {
      setShiftTypes(
        shiftTypes.map((s) => (s.id === editingId ? shiftData : s))
      );
    } else {
      setShiftTypes([...shiftTypes, shiftData]);
    }

    setForm({
      name: "",
      hours: "",
      start: "",
      end: "",
      isSplit: false,
      start2: "",
      end2: "",
      color: "bg-green-100 text-green-700",
    });

    setEditingId(null);
  };

  const editShift = (shift: ShiftType) => {
    setForm({
      name: shift.name,
      hours: shift.hours || "",
      start: shift.start || "",
      end: shift.end || "",
      isSplit: Boolean(shift.isSplit),
      start2: shift.start2 || "",
      end2: shift.end2 || "",
      color: shift.color || "bg-green-100 text-green-700",
    });

    setEditingId(shift.id);
  };

  const deleteShift = (id: number) => {
    setShiftTypes(shiftTypes.filter((s) => s.id !== id));
  };

  return (
    <div>
      <h2 className="text-3xl font-bold mb-2">Tipos de turno</h2>

      <p className="text-slate-500 mb-6">Configuración de horarios</p>

      {!readOnly && (
        <div className="bg-white rounded-2xl border p-5 mb-6">
          <h3 className="font-bold text-lg mb-4">
            {editingId ? "Editar turno" : "Crear turno"}
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <input
              placeholder="Nombre turno"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="border rounded-xl px-4 py-3"
            />

            <input
              type="time"
              value={form.start}
              onChange={(e) => setForm({ ...form, start: e.target.value })}
              className="border rounded-xl px-4 py-3"
            />

            <input
              type="time"
              value={form.end}
              onChange={(e) => setForm({ ...form, end: e.target.value })}
              className="border rounded-xl px-4 py-3"
            />

            <button
              onClick={saveShift}
              className="bg-blue-600 text-white rounded-xl py-3 font-semibold hover:bg-blue-700 transition"
            >
              Guardar
            </button>
          </div>

          <label className="flex gap-3 mt-4 items-center cursor-pointer">
            <input
              type="checkbox"
              checked={form.isSplit}
              onChange={(e) => setForm({ ...form, isSplit: e.target.checked })}
            />
            Turno partido
          </label>

          {form.isSplit && (
            <div className="grid grid-cols-2 gap-4 mt-4">
              <input
                type="time"
                value={form.start2}
                onChange={(e) => setForm({ ...form, start2: e.target.value })}
                className="border rounded-xl px-4 py-3"
              />

              <input
                type="time"
                value={form.end2}
                onChange={(e) => setForm({ ...form, end2: e.target.value })}
                className="border rounded-xl px-4 py-3"
              />
            </div>
          )}

          <div className="mt-4 font-bold">
            Horas estimadas: {totalHours(form)} h
          </div>
        </div>
      )}

      <div className="bg-white rounded-2xl border overflow-hidden">
        <table className="w-full">
          <thead className="bg-slate-50 border-b">
            <tr>
              <th className="p-4 text-left">Turno</th>
              <th className="p-4 text-left">Horario</th>
              <th className="p-4 text-center">Horas</th>
              <th className="p-4 text-center">Acciones</th>
            </tr>
          </thead>

          <tbody>
            {shiftTypes.map((s) => (
              <tr key={s.id} className="border-t">
                <td className="p-4 font-medium">{s.name}</td>

                <td className="p-4">
                  {s.start && s.end
                    ? s.isSplit
                      ? `${s.start}-${s.end} / ${s.start2 || ""}-${s.end2 || ""}`
                      : `${s.start}-${s.end}`
                    : "No especificado"}
                </td>

                <td className="p-4 text-center">{s.hours || totalHours(s)} h</td>

                <td className="p-4 text-center">
                  {!readOnly ? (
                    <>
                      <button
                        onClick={() => editShift(s)}
                        className="bg-yellow-400 text-white px-3 py-1 rounded mr-2 hover:bg-yellow-500 transition"
                      >
                        ✏️
                      </button>

                      <button
                        onClick={() => deleteShift(s.id)}
                        className="bg-red-500 text-white px-3 py-1 rounded hover:bg-red-600 transition"
                      >
                        🗑️
                      </button>
                    </>
                  ) : (
                    <span className="text-sm text-slate-400 italic">
                      Solo lectura
                    </span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}