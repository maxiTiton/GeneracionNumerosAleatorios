"use client"

import { useState, useEffect } from "react"
import { useForm } from "react-hook-form"
import axios from "axios"
import { AlertTriangle } from "lucide-react"

const TestRunner = ({ rnd, mo }) => {
  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
  } = useForm()
  const [resultado, setResultado] = useState(null)
  const [error, setError] = useState(null)
  const [test, setTest] = useState(null)
  const [loading, setLoading] = useState(false)
  const [serverStatus, setServerStatus] = useState("checking") // "checking", "online", "offline"
  const [debugInfo, setDebugInfo] = useState(null)

  // Verificar la conexión con el servidor al cargar el componente
  useEffect(() => {
    const checkServerConnection = async () => {
      try {
        // Intentar una solicitud simple para verificar si el servidor está disponible
        await axios
          .get("http://127.0.0.1:8000/health", { timeout: 3000 })
          .then(() => {
            setServerStatus("online")
            setError(null)
          })
          .catch(() => {
            // Intentar con la ruta raíz si /health no está disponible
            return axios.get("http://127.0.0.1:8000/", { timeout: 3000 })
          })
          .then(() => {
            setServerStatus("online")
            setError(null)
          })
          .catch((err) => {
            throw err
          })
      } catch (err) {
        console.error("Error al conectar con el servidor:", err)
        setServerStatus("offline")
        setError(
          "No se pudo conectar con el servidor de pruebas estadísticas. Asegúrate de que el servidor esté en ejecución en http://127.0.0.1:8000",
        )
      }
    }

    checkServerConnection()
  }, [])

  // Verificar y mostrar información sobre los números aleatorios recibidos
  useEffect(() => {
    // Mostrar información de depuración sobre los números aleatorios
    if (rnd !== undefined) {
      const info = {
        tipo: typeof rnd,
        esArray: Array.isArray(rnd),
        longitud: Array.isArray(rnd) ? rnd.length : 0,
        muestra: Array.isArray(rnd) && rnd.length > 0 ? rnd.slice(0, 5) : [],
      }
      setDebugInfo(info)
      console.log("Información de rnd:", info)
    } else {
      setDebugInfo({ mensaje: "No se recibieron números aleatorios (rnd es undefined)" })
      console.log("rnd es undefined")
    }
  }, [rnd])

  // Establecer los valores iniciales del formulario
  useEffect(() => {
    setValue("a", 0.05)
    setValue("i", 10)
    if (mo !== undefined) {
      setValue("mo", mo)
    }
  }, [mo, setValue])

  // Ejecutar la prueba directamente sin depender del estado
  const ejecutarPrueba = async (tipoTest) => {
    // Obtener los valores del formulario directamente
    const a = document.querySelector('input[name="a"]')?.value || 0.05
    const i = document.querySelector('input[name="i"]')?.value || 10
    const moValue = document.querySelector('select[name="mo"]')?.value || 0

    // Verificar y procesar los números aleatorios
    let RND = []

    // Intentar obtener los números aleatorios de diferentes formas
    if (Array.isArray(rnd) && rnd.length > 0) {
      RND = rnd
    } else if (typeof rnd === "string") {
      // Intentar convertir una cadena a un array de números
      RND = rnd
        .split(",")
        .map((n) => Number.parseFloat(n.trim()))
        .filter((n) => !isNaN(n))
    } else if (typeof rnd === "object" && rnd !== null) {
      // Si es un objeto, intentar convertirlo a array
      try {
        RND = Object.values(rnd).filter((val) => typeof val === "number" && !isNaN(val))
      } catch (e) {
        console.error("Error al procesar rnd como objeto:", e)
      }
    }

    // Si aún no hay números, crear algunos de prueba (solo para desarrollo)
    if (RND.length === 0) {
      console.warn("Generando números aleatorios de prueba ya que no se proporcionaron")
      RND = Array.from({ length: 100 }, () => Math.random())
    }

    // Si hay demasiados números, tomar una muestra
    let muestraRND = RND
    if (RND.length > 1000) {
      muestraRND = []
      const paso = RND.length / 1000
      for (let i = 0; i < 1000; i++) {
        muestraRND.push(RND[Math.floor(i * paso)])
      }
    }

    setLoading(true)
    const payload = {
      rnd: muestraRND,
      a: Number.parseFloat(a),
      i: Number.parseInt(i),
      mo: Number.parseInt(moValue),
    }

    try {
      // Construir la URL correcta para el endpoint
      const baseUrl = "http://127.0.0.1:8000" // Asegurarse de que esta es la URL correcta del backend
      const endpoint = tipoTest === "chi-cuadrado" ? `${baseUrl}/tests/chi-cuadrado` : `${baseUrl}/tests/k-s`

      console.log(`Enviando solicitud a: ${endpoint}`)
      console.log(
        "Payload:",
        JSON.stringify({
          ...payload,
          rnd: `[${payload.rnd.length} números]`, // No imprimir todos los números en la consola
        }),
      )

      // Mostrar información de depuración
      setError(`Intentando conectar a ${endpoint}...`)

      const res = await axios.post(endpoint, payload)
      setResultado(res.data)
      console.log("Respuesta:", res.data)
      setError(null)
    } catch (err) {
      setResultado(null)

      // Mejorar el manejo de errores para mostrar detalles más específicos
      let errorMessage = `Error al ejecutar ${tipoTest}: `

      if (err.response) {
        errorMessage += `${err.response.status} ${err.response.statusText}`

        // Mostrar detalles del error si están disponibles
        if (err.response.data) {
          if (typeof err.response.data === "string") {
            errorMessage += ` - ${err.response.data}`
          } else if (err.response.data.detail) {
            if (typeof err.response.data.detail === "string") {
              errorMessage += ` - ${err.response.data.detail}`
            } else {
              errorMessage += ` - ${JSON.stringify(err.response.data.detail)}`
            }
          } else {
            errorMessage += ` - ${JSON.stringify(err.response.data)}`
          }
        }
      } else {
        errorMessage += `${err.message} (posiblemente el servidor no está disponible)`
      }

      setError(errorMessage)
      console.error("Error completo:", err)
    } finally {
      setLoading(false)
    }
  }

  // Manejador para ejecutar la prueba seleccionada
  const handleTestRun = (tipoTest) => {
    // Actualizar el estado y ejecutar la prueba
    setTest(tipoTest)
    setResultado(null)
    setError(null)

    // Ejecutar la prueba directamente sin depender del estado
    ejecutarPrueba(tipoTest)
  }

  const renderResultado = () => {
    if (!resultado || !resultado.Test) return null

    const testData = resultado.Test
    const valorCalculado = testData[testData.length - 2]
    const valorTabla = testData[testData.length - 1]

    const filas = testData[0].map((_, i) => {
      return testData.slice(0, testData.length - 2).map((col) => col[i])
    })

    return (
      <div className="space-y-4 mt-6">
        <table className="w-full border-collapse border border-gray-300 text-sm">
          <thead className="bg-gray-200">
            <tr>
              <th className="border px-2 py-1"># Intervalo</th>
              {test === "chi-cuadrado" ? (
                <>
                  <th className="border px-2 py-1">Observado</th>
                  <th className="border px-2 py-1">Esperado</th>
                  <th className="border px-2 py-1">Chi-Cuadrado</th>
                </>
              ) : (
                <>
                  <th className="border px-2 py-1">Observado</th>
                  <th className="border px-2 py-1">Esperado</th>
                  <th className="border px-2 py-1">PVO</th>
                  <th className="border px-2 py-1">PFE</th>
                  <th className="border px-2 py-1">ΣPVO</th>
                  <th className="border px-2 py-1">ΣPFE</th>
                  <th className="border px-2 py-1">Diferencia</th>
                </>
              )}
            </tr>
          </thead>
          <tbody>
            {filas.map((fila, idx) => (
              <tr key={idx} className="text-center">
                <td className="border px-2 py-1">{idx + 1}</td>
                {fila.map((col, i) => (
                  <td key={i} className="border px-2 py-1">
                    {typeof col === "number" ? col.toFixed(4) : col}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>

        {/* Valores finales */}
        <div className="pt-4 text-sm">
          <p>
            <strong>{test === "chi-cuadrado" ? "Chi-Cuadrado" : "K-S"} Calculado:</strong> {valorCalculado}
          </p>
          <p>
            <strong>{test === "chi-cuadrado" ? "Chi-Cuadrado" : "K-S"} de Tabla:</strong> {valorTabla}
          </p>
          <p className="mt-2 font-medium">
            Conclusión:{" "}
            {Number.parseFloat(valorCalculado) <= Number.parseFloat(valorTabla) ? (
              <span className="text-green-600">
                No se rechaza la hipótesis de que los datos siguen la distribución teórica
              </span>
            ) : (
              <span className="text-red-600">
                Se rechaza la hipótesis de que los datos siguen la distribución teórica
              </span>
            )}
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white shadow-lg rounded-2xl p-8 max-w-4xl w-full mx-auto space-y-6">
      <h2 className="text-2xl font-bold text-center text-gray-800">Pruebas Estadísticas</h2>

      <div className="bg-blue-50 p-4 rounded-lg text-sm">
        <div className="flex items-start gap-2">
          <AlertTriangle className="text-blue-600 mt-0.5" size={18} />
          <div>
            <p className="font-medium text-blue-800">Información sobre las pruebas:</p>
            <ul className="list-disc pl-5 mt-1 text-blue-700 space-y-1">
              <li>
                <strong>Chi-Cuadrado:</strong> Evalúa si la distribución de frecuencias observadas se ajusta a la
                distribución teórica.
              </li>
              <li>
                <strong>Kolmogorov-Smirnov (K-S):</strong> Compara la distribución acumulada observada con la teórica.
              </li>
              <li>Se utilizará una muestra de hasta 1000 números para las pruebas si hay más datos disponibles.</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Información de depuración sobre los números aleatorios */}
      {debugInfo && (
        <div className="bg-yellow-50 p-4 rounded-lg text-sm">
          <p className="font-medium text-yellow-800">Información de depuración (números aleatorios):</p>
          <pre className="mt-2 text-xs overflow-auto max-h-32 bg-yellow-100 p-2 rounded">
            {JSON.stringify(debugInfo, null, 2)}
          </pre>
        </div>
      )}

      <form className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-600">Valor de α (nivel de significancia):</label>
            <input
              type="number"
              step="any"
              {...register("a", { required: "Este campo es obligatorio" })}
              className="mt-1 w-full rounded border border-gray-300 p-2"
              placeholder="0.05"
            />
            {errors.a && <p className="text-red-500 text-sm">{errors.a.message}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-600">Cantidad de intervalos (i):</label>
            <input
              type="number"
              {...register("i")}
              className="mt-1 w-full rounded border border-gray-300 p-2"
              placeholder="Ej. 10"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-600">Tipo de distribución (mo):</label>
          <select {...register("mo")} className="mt-1 w-full rounded border border-gray-300 p-2">
            <option value="0">Uniforme (0)</option>
            <option value="1">Exponencial (1)</option>
            <option value="2">Normal (2)</option>
            <option value="3">Poisson (3)</option>
            <option value="4">Empírica (4)</option>
            <option value="5">Otra (5)</option>
          </select>
          <p className="text-xs text-gray-500 mt-1">
            El valor seleccionado debe corresponder con la distribución de los datos generados.
          </p>
        </div>

        <div className="flex justify-center space-x-4 pt-2">
          <button
            type="button"
            onClick={() => handleTestRun("chi-cuadrado")}
            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 transition disabled:opacity-50"
            disabled={loading || serverStatus !== "online"}
          >
            {loading && test === "chi-cuadrado" ? "Ejecutando..." : "Ejecutar Chi-Cuadrado"}
          </button>
          <button
            type="button"
            onClick={() => handleTestRun("K-S")}
            className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 transition disabled:opacity-50"
            disabled={loading || serverStatus !== "online"}
          >
            {loading && test === "K-S" ? "Ejecutando..." : "Ejecutar K-S"}
          </button>
        </div>
      </form>

      {error && (
        <div className="text-red-600 text-sm p-3 bg-red-50 rounded whitespace-pre-wrap break-words">{error}</div>
      )}

      {loading ? <div className="text-center text-gray-500">Ejecutando test...</div> : renderResultado()}
    </div>
  )
}

export default TestRunner
