import { useState } from "react";

type Employee = {
  id: number;
  name: string;
  document: string;
  role: string;
  username: string;
  status: string;
};

type Props = {
  employees: Employee[];
  setEmployees: React.Dispatch<React.SetStateAction<Employee[]>>;
};

export default function Employees({
  employees,
  setEmployees
}: Props) {

  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [search, setSearch] = useState("");

  const [form, setForm] = useState({
    name: "",
    document: "",
    role: "",
    username: "",
    status: "Activo"
  });

  // =====================================================
  // FILTRAR EMPLEADOS
  // =====================================================

  const filteredEmployees = employees.filter((employee) => {
    const text = search.toLowerCase();

    return (
      employee.name.toLowerCase().includes(text) ||
      employee.document.toLowerCase().includes(text) ||
      employee.username.toLowerCase().includes(text) ||
      (employee.role || "").toLowerCase().includes(text)
    );
  });

  // =====================================================
  // ELIMINAR EMPLEADO
  // =====================================================

  const deleteEmployee = async (id: number) => {

    const confirmar = window.confirm(
      "¿Estás seguro de que deseas eliminar este empleado?"
    );

    if (!confirmar) return;

    try {

      const token = localStorage.getItem("token");

      if (!token) {
        alert("Sesión no encontrada. Inicia sesión nuevamente.");
        return;
      }

      const response = await fetch(
        `https://crm-rrhh-backend.onrender.com/api/empleados/${id}`,
        {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.mensaje || "No se pudo eliminar el empleado"
        );
      }

      setEmployees(
        employees.filter((emp) => emp.id !== id)
      );

      alert("Empleado eliminado correctamente.");

    } catch (error: any) {

      console.error(
        "Error eliminando empleado:",
        error
      );

      alert(
        error.message ||
        "No se pudo eliminar el empleado"
      );
    }
  };

  // =====================================================
  // GUARDAR / EDITAR EMPLEADO
  // =====================================================

  const saveEmployee = async () => {

    if (!form.name || !form.document) {
      alert("Nombre y documento son obligatorios.");
      return;
    }

    try {

      const token = localStorage.getItem("token");

      if (!token) {
        alert("Sesión no encontrada. Inicia sesión nuevamente.");
        return;
      }

      // =================================================
      // EDITAR EMPLEADO
      // =================================================

      if (editingId) {

        const response = await fetch(
          `https://crm-rrhh-backend.onrender.com/api/empleados/${editingId}`,
          {
            method: "PUT",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`
            },
            body: JSON.stringify({
              nombre: form.name,
              documento: form.document,
              cargo: form.role,
              username: form.username,
              estado: form.status
            })
          }
        );

        const data = await response.json();

        if (!response.ok) {
          throw new Error(
            data.mensaje || "No se pudo editar el empleado"
          );
        }

        const updatedEmployee: Employee = {
          id: Number(data.id),
          name: data.nombre || "",
          document: data.documento || "",
          role: data.cargo || "",
          username: data.username || "",
          status: data.estado || "Activo"
        };

        setEmployees(
          employees.map((emp) =>
            emp.id === editingId
              ? updatedEmployee
              : emp
          )
        );

        alert("Empleado actualizado correctamente.");

      }

      // =================================================
      // CREAR EMPLEADO
      // =================================================

      else {

        const response = await fetch(
          "https://crm-rrhh-backend.onrender.com/api/empleados",
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`
            },
            body: JSON.stringify({
              nombre: form.name,
              documento: form.document,
              cargo: form.role,
              username: form.username,
              estado: form.status
            })
          }
        );

        const data = await response.json();

        if (!response.ok) {
          throw new Error(
            data.mensaje || "No se pudo crear el empleado"
          );
        }

        const newEmployee: Employee = {
          id: Number(data.id),
          name: data.nombre || "",
          document: data.documento || "",
          role: data.cargo || "",
          username: data.username || "",
          status: data.estado || "Activo"
        };

        setEmployees([
          ...employees,
          newEmployee
        ]);

        alert("Empleado creado correctamente.");
      }

      // =================================================
      // LIMPIAR FORMULARIO
      // =================================================

      setForm({
        name: "",
        document: "",
        role: "",
        username: "",
        status: "Activo"
      });

      setEditingId(null);
      setShowForm(false);

    } catch (error: any) {

      console.error(
        "Error guardando empleado:",
        error
      );

      alert(
        error.message ||
        "No se pudo guardar el empleado"
      );
    }
  };

  // =====================================================
  // PREPARAR EDICIÓN
  // =====================================================

  const editEmployee = (emp: Employee) => {

    setForm({
      name: emp.name,
      document: emp.document,
      role: emp.role || "",
      username: emp.username,
      status: emp.status
    });

    setEditingId(emp.id);
    setShowForm(true);
  };

  // =====================================================
  // INTERFAZ
  // =====================================================

  return (
    <div>

      <h2 className="text-3xl font-bold mb-2">
        Empleados
      </h2>

      <p className="text-slate-500 mb-6">
        Gestión del personal
      </p>

      {/* BOTÓN NUEVO + BÚSQUEDA */}

      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">

        <button
          onClick={() => {
            setEditingId(null);

            setForm({
              name: "",
              document: "",
              role: "",
              username: "",
              status: "Activo"
            });

            setShowForm(true);
          }}
          className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-3 rounded-2xl font-medium transition-colors"
        >
          + Nuevo empleado
        </button>

        <div className="relative w-full md:w-80">

          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
            🔍
          </span>

          <input
            type="text"
            placeholder="Buscar por nombre, documento o usuario"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-11 pr-4 py-3 rounded-2xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
          />

        </div>

      </div>

      {/* FORMULARIO */}

      {showForm && (

        <div className="bg-white border rounded-2xl p-5 mb-6 shadow-sm">

          <h3 className="font-bold text-lg mb-4">
            {editingId ? "Editar empleado" : "Nuevo empleado"}
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">

            <input
              placeholder="Nombre"
              value={form.name}
              onChange={(e) =>
                setForm({
                  ...form,
                  name: e.target.value
                })
              }
              className="border rounded-xl px-4 py-3"
            />

            <input
              placeholder="Documento"
              value={form.document}
              onChange={(e) =>
                setForm({
                  ...form,
                  document: e.target.value
                })
              }
              className="border rounded-xl px-4 py-3"
            />

            <input
              placeholder="Cargo"
              value={form.role}
              onChange={(e) =>
                setForm({
                  ...form,
                  role: e.target.value
                })
              }
              className="border rounded-xl px-4 py-3"
            />

            <input
              placeholder="Usuario POS"
              value={form.username}
              onChange={(e) =>
                setForm({
                  ...form,
                  username: e.target.value
                })
              }
              className="border rounded-xl px-4 py-3"
            />

            <select
              value={form.status}
              onChange={(e) =>
                setForm({
                  ...form,
                  status: e.target.value
                })
              }
              className="border rounded-xl px-4 py-3 bg-white"
            >
              <option value="Activo">Activo</option>
              <option value="Vacaciones">Vacaciones</option>
              <option value="Incapacidad">Incapacidad</option>
            </select>

            <button
              onClick={saveEmployee}
              className="bg-green-600 text-white rounded-xl py-3 hover:bg-green-700 transition-colors"
            >
              Guardar
            </button>

          </div>

        </div>
      )}

      {/* RESULTADOS */}

      <div className="flex justify-between items-center mb-4">

        <p className="text-sm text-slate-500">

          Mostrando{" "}
          <span className="font-semibold">
            {filteredEmployees.length}
          </span>{" "}
          de{" "}
          <span className="font-semibold">
            {employees.length}
          </span>{" "}
          empleados

        </p>

        {search && (

          <button
            onClick={() => setSearch("")}
            className="text-sm text-blue-600 hover:text-blue-700 font-medium"
          >
            Limpiar
          </button>

        )}

      </div>

      {/* TABLA */}

      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">

        <table className="w-full">

          <thead className="bg-slate-50">

            <tr className="text-left">

              <th className="p-4">
                Empleado
              </th>

              <th className="p-4">
                Documento
              </th>

              <th className="p-4">
                Cargo
              </th>

              <th className="p-4">
                Usuario
              </th>

              <th className="p-4">
                Estado
              </th>

              <th className="p-4">
                Acciones
              </th>

            </tr>

          </thead>

          <tbody>

            {filteredEmployees.map((employee) => (

              <tr
                key={employee.id}
                className="border-t"
              >

                <td className="p-4 font-medium">
                  {employee.name}
                </td>

                <td className="p-4">
                  {employee.document}
                </td>

                <td className="p-4">
                  {employee.role}
                </td>

                <td className="p-4">
                  {employee.username}
                </td>

                <td className="p-4">
                  {employee.status}
                </td>

                <td className="p-4">

                  <div className="flex gap-2">

                    <button
                      onClick={() =>
                        editEmployee(employee)
                      }
                      className="bg-yellow-400 text-white px-3 py-1 rounded-lg text-xs hover:bg-yellow-500 transition-colors"
                    >
                      ✏️ Editar
                    </button>

                    <button
                      onClick={() =>
                        deleteEmployee(employee.id)
                      }
                      className="bg-red-500 text-white px-3 py-1 rounded-lg text-xs hover:bg-red-600 transition-colors"
                    >
                      🗑️ Eliminar
                    </button>

                  </div>

                </td>

              </tr>

            ))}

          </tbody>

        </table>

      </div>

    </div>
  );
}