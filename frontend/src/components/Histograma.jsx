"use client"

import { useState, useEffect, useMemo, useRef } from "react"
import Plotly from "plotly.js-dist"
import { ChevronDown, ChevronUp, Download, AlertTriangle } from "lucide-react"
import TestRunner from "./TestRunner"

const Histograma = () => {
  const plotRef = useRef(null)
  const [cantidad, setCantidad] = useState(10)
  const [distribucion, setDistribucion] = useState("uniforme")
  const [parametros, setParametros] = useState({
    media: 0,
    des: 1,
    a: 0,
    b: 1,
    param: 4,
    lambd: 1,
    n: 12,
  })
  const [numeros, setNumeros] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [advertencia, setAdvertencia] = useState(null)
  const [estadisticas, setEstadisticas] = useState({
    min: 0,
    max: 0,
    media: 0,
    desviacion: 0,
    mediana: 0,
  })
  const [intervalos, setIntervalos] = useState(10)
  const [mostrarNumeros, setMostrarNumeros] = useState(false)
  const [intervaloSeleccionado, setIntervaloSeleccionado] = useState(null)
  const [paginaActual, setPaginaActual] = useState(1)
  const [activeTab, setActiveTab] = useState("generator")
  const numerosPorPagina = 1000
  const [respuestaDebug, setRespuestaDebug] = useState(null)

  // Validar la cantidad de números antes de generar
  const validarCantidad = () => {
    if (cantidad > 5000000) {
      setAdvertencia(
        "Generar más de 5 millones de números puede causar problemas de rendimiento. Se recomienda reducir la cantidad.",
      )
      return false
    } else if (cantidad > 1000000) {
      setAdvertencia("Generar más de 1 millón de números puede tardar bastante tiempo y consumir muchos recursos.")
    } else {
      setAdvertencia(null)
    }
    return true
  }

  // Generar números desde la API
  const generarNumeros = async () => {
    if (!validarCantidad()) return

    setLoading(true)
    setError(null)
    setPaginaActual(1)
    setRespuestaDebug(null)

    try {
      const baseUrl = "http://localhost:8000"
      let endpoint = ""

      // Validar parámetros específicos para cada distribución
      if (distribucion === "normal/boxmuller" || distribucion === "normal/convolucion") {
        if (parametros.des <= 0) {
          throw new Error("La desviación estándar debe ser mayor que 0 para la distribución normal")
        }
      }

      switch (distribucion) {
        case "uniforme":
          if (parametros.a >= parametros.b) {
            throw new Error("El valor mínimo (a) debe ser menor que el valor máximo (b)")
          }
          endpoint = `/generar/uniforme?a=${parametros.a}&b=${parametros.b}&cant=${cantidad}`
          break
        case "exponencial":
          if (parametros.param <= 0) {
            throw new Error("Lambda debe ser mayor que 0 para la distribución exponencial")
          }
          endpoint = `/generar/exponencial?param=${parametros.param}&cant=${cantidad}`
          break
        case "normal/boxmuller":
          endpoint = `/generar/normal/boxmuller?media=${parametros.media}&des=${parametros.des}&cant=${cantidad}`
          break
        case "normal/convolucion":
          if (parametros.n < 1) {
            throw new Error("El valor de n debe ser al menos 1 para la distribución normal por convolución")
          }
          endpoint = `/generar/normal/convolucion?media=${parametros.media}&des=${parametros.des}&n=${parametros.n}&cant=${cantidad}`
          break
        case "poisson":
          if (parametros.lambd <= 0) {
            throw new Error("Lambda debe ser mayor que 0 para la distribución Poisson")
          }
          endpoint = `/generar/poisson?lambd=${parametros.lambd}&cant=${cantidad}`
          break
        default:
          endpoint = `/generar/normal/boxmuller?media=${parametros.media}&des=${parametros.des}&cant=${cantidad}`
      }

      const url = `${baseUrl}${endpoint}`
      console.log("Fetching from URL:", url)

      // Implementar un timeout para la solicitud
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 60000) // 60 segundos de timeout

      try {
        const response = await fetch(url, { signal: controller.signal })
        clearTimeout(timeoutId)

        if (!response.ok) {
          throw new Error(`Error HTTP: ${response.status} ${response.statusText}`)
        }

        const contentType = response.headers.get("content-type")
        if (!contentType || !contentType.includes("application/json")) {
          throw new Error(`Respuesta no válida: esperaba JSON pero recibió ${contentType}`)
        }

        const data = await response.json()
        setRespuestaDebug(data) // Guardar la respuesta completa para diagnóstico

        if (data.error) {
          throw new Error(data.error)
        }

        if (!data.Numeros || !Array.isArray(data.Numeros)) {
          console.warn("Formato de respuesta inesperado:", data)
          throw new Error("La respuesta no contiene un array de números válido")
        }

        // Validar que los números sean realmente números
        const numerosValidos = data.Numeros.filter((num) => typeof num === "number" && !isNaN(num))
        if (numerosValidos.length === 0) {
          throw new Error("No se recibieron números válidos")
        }
        if (numerosValidos.length < data.Numeros.length) {
          console.warn(`Se filtraron ${data.Numeros.length - numerosValidos.length} valores no numéricos`)
        }

        setNumeros(numerosValidos)
        setIntervaloSeleccionado(null)
      } catch (err) {
        if (err.name === "AbortError") {
          throw new Error("La solicitud tardó demasiado tiempo. Intenta con menos números o contacta al administrador.")
        }
        throw err
      }
    } catch (err) {
      setError(err.message)
      console.error("Error al generar números:", err)
    } finally {
      setLoading(false)
    }
  }

  // Implementación alternativa de Box-Muller para generar números normales
  const generarNormalBoxMuller = () => {
    if (!validarCantidad()) return

    setLoading(true)
    setError(null)
    setPaginaActual(1)

    try {
      const numerosGenerados = []
      const media = parametros.media
      const desviacion = parametros.des

      if (desviacion <= 0) {
        throw new Error("La desviación estándar debe ser mayor que 0")
      }

      // Generar números usando el algoritmo Box-Muller
      for (let i = 0; i < cantidad; i += 2) {
        // Generar dos números aleatorios uniformes entre 0 y 1
        const u1 = Math.random()
        const u2 = Math.random()

        // Transformar a distribución normal usando Box-Muller
        const z0 = Math.sqrt(-2.0 * Math.log(u1)) * Math.cos(2.0 * Math.PI * u2)
        const z1 = Math.sqrt(-2.0 * Math.log(u1)) * Math.sin(2.0 * Math.PI * u2)

        // Aplicar media y desviación
        numerosGenerados.push(z0 * desviacion + media)

        // Asegurarse de no exceder la cantidad solicitada
        if (i + 1 < cantidad) {
          numerosGenerados.push(z1 * desviacion + media)
        }
      }

      setNumeros(numerosGenerados)
      setIntervaloSeleccionado(null)
    } catch (err) {
      setError(err.message)
      console.error("Error al generar números:", err)
    } finally {
      setLoading(false)
    }
  }

  // Calcular estadísticas básicas de manera optimizada
  const calcularEstadisticas = (numeros) => {
    if (!numeros || numeros.length === 0) return

    let min = numeros[0]
    let max = numeros[0]
    let suma = 0

    // Usar un solo bucle para calcular min, max y suma
    for (let i = 0; i < numeros.length; i++) {
      const num = numeros[i]
      if (num < min) min = num
      if (num > max) max = num
      suma += num
    }

    const media = suma / numeros.length

    // Calcular desviación estándar
    let sumaCuadrados = 0
    // Limitar el cálculo de desviación a un máximo de 100,000 números para mejorar rendimiento
    const muestraSize = Math.min(numeros.length, 100000)
    const paso = numeros.length / muestraSize

    for (let i = 0; i < muestraSize; i++) {
      const idx = Math.floor(i * paso)
      sumaCuadrados += Math.pow(numeros[idx] - media, 2)
    }

    const desviacion = Math.sqrt(sumaCuadrados / muestraSize)

    // Calcular mediana (aproximada para grandes conjuntos)
    let mediana
    if (numeros.length <= 100000) {
      const ordenados = [...numeros].sort((a, b) => a - b)
      const mitad = Math.floor(ordenados.length / 2)
      mediana = ordenados.length % 2 === 0 ? (ordenados[mitad - 1] + ordenados[mitad]) / 2 : ordenados[mitad]
    } else {
      // Para conjuntos muy grandes, usar una aproximación
      const muestra = []
      const paso = numeros.length / 10000
      for (let i = 0; i < 10000; i++) {
        muestra.push(numeros[Math.floor(i * paso)])
      }
      const ordenados = [...muestra].sort((a, b) => a - b)
      const mitad = Math.floor(ordenados.length / 2)
      mediana = ordenados.length % 2 === 0 ? (ordenados[mitad - 1] + ordenados[mitad]) / 2 : ordenados[mitad]
    }

    setEstadisticas({
      min,
      max,
      media,
      desviacion,
      mediana,
    })
  }

  // Calcular los intervalos del histograma de manera optimizada
  const calcularIntervalos = () => {
    if (!numeros || numeros.length === 0) return []

    // Calcular min y max de forma iterativa en lugar de usar spread operator
    let min = numeros[0]
    let max = numeros[0]
    for (let i = 1; i < numeros.length; i++) {
      if (numeros[i] < min) min = numeros[i]
      if (numeros[i] > max) max = numeros[i]
    }

    const rango = max - min
    const anchoIntervalo = rango / intervalos

    // Inicializar contadores para cada intervalo
    const contadores = Array(intervalos).fill(0)
    const numerosEnIntervalos = Array(intervalos)
      .fill()
      .map(() => [])

    // Contar cuántos números caen en cada intervalo
    for (let i = 0; i < numeros.length; i++) {
      const num = numeros[i]
      // Calcular a qué intervalo pertenece este número
      let indiceIntervalo = Math.floor((num - min) / anchoIntervalo)

      // Ajustar para el caso del valor máximo
      if (indiceIntervalo === intervalos) {
        indiceIntervalo = intervalos - 1
      }

      contadores[indiceIntervalo]++

      // Solo guardar los números en el intervalo si está seleccionado o si hay pocos números
      if (intervaloSeleccionado === indiceIntervalo || numeros.length <= 10000) {
        numerosEnIntervalos[indiceIntervalo].push(num)
      }
    }

    // Construir el resultado
    const resultado = []
    for (let i = 0; i < intervalos; i++) {
      const limiteInferior = min + i * anchoIntervalo
      const limiteSuperior = min + (i + 1) * anchoIntervalo

      resultado.push({
        id: i,
        limiteInferior,
        limiteSuperior,
        cantidad: contadores[i],
        porcentaje: (contadores[i] / numeros.length) * 100,
        numeros: numerosEnIntervalos[i],
      })
    }

    return resultado
  }

  // Seleccionar un intervalo específico
  const seleccionarIntervalo = (intervalo) => {
    if (intervaloSeleccionado === intervalo.id) {
      setIntervaloSeleccionado(null) // Deseleccionar si ya estaba seleccionado
    } else {
      setIntervaloSeleccionado(intervalo.id)
    }
  }

  // Crear histograma cuando cambian los números o intervalos
  useEffect(() => {
    if (numeros.length > 0 && plotRef.current) {
      // Calcular estadísticas
      calcularEstadisticas(numeros)

      // Para conjuntos muy grandes, usar una muestra para el histograma
      let datosHistograma = numeros
      if (numeros.length > 100000) {
        // Tomar una muestra representativa para el histograma
        datosHistograma = []
        const paso = numeros.length / 100000
        for (let i = 0; i < 100000; i++) {
          datosHistograma.push(numeros[Math.floor(i * paso)])
        }
      }

      // Crear datos para Plotly
      const data = [
        {
          x: datosHistograma,
          type: "histogram",
          nbinsx: intervalos,
          marker: {
            color:
              intervaloSeleccionado !== null
                ? Array(intervalos)
                    .fill("rgba(200, 200, 200, 0.7)")
                    .map((color, i) => (i === intervaloSeleccionado ? "rgba(65, 105, 225, 0.7)" : color))
                : "rgba(65, 105, 225, 0.7)",
            line: {
              color: "rgba(25, 55, 165, 1)",
              width: 1,
            },
          },
          histnorm: "probability density",
          name: "Distribución",
        },
      ]

      // Configuración del layout de Plotly
      const layout = {
        title: {
          text: `Histograma de Distribución ${distribucion} (${numeros.length.toLocaleString()} números)`,
          font: {
            family: "Arial, sans-serif",
            size: 18,
          },
        },
        xaxis: {
          title: {
            text: "Valores",
            font: {
              family: "Arial, sans-serif",
              size: 14,
            },
          },
          zeroline: true,
          gridwidth: 1,
        },
        yaxis: {
          title: {
            text: "Densidad",
            font: {
              family: "Arial, sans-serif",
              size: 14,
            },
          },
          zeroline: true,
          gridwidth: 1,
        },
        bargap: 0.05,
        paper_bgcolor: "white",
        plot_bgcolor: "white",
        margin: {
          l: 50,
          r: 50,
          b: 50,
          t: 80,
          pad: 4,
        },
      }

      // Configuración de Plotly
      const config = {
        displayModeBar: true,
        responsive: true,
        displaylogo: false,
        modeBarButtonsToRemove: ["lasso2d", "select2d"],
      }

      // Renderizar el gráfico
      Plotly.newPlot(plotRef.current, data, layout, config)

      // Añadir evento de clic para seleccionar intervalos
      plotRef.current.on("plotly_click", (data) => {
        const pointIndex = data.points[0].pointIndex
        if (intervaloSeleccionado === pointIndex) {
          setIntervaloSeleccionado(null)
        } else {
          setIntervaloSeleccionado(pointIndex)
        }
      })
    }
  }, [numeros, distribucion, intervalos, intervaloSeleccionado])

  // Manejar cambios en los parámetros
  const handleParametroChange = (e) => {
    const { name, value } = e.target
    setParametros({
      ...parametros,
      [name]: Number.parseFloat(value),
    })
  }

  // Descargar números como CSV
  const descargarCSV = () => {
    if (!numeros || numeros.length === 0) return

    // Para conjuntos muy grandes, advertir al usuario
    if (numeros.length > 100000) {
      if (
        !confirm(
          `Estás a punto de descargar un archivo CSV con ${numeros.length.toLocaleString()} números. Esto puede tardar un tiempo y consumir memoria. ¿Deseas continuar?`,
        )
      ) {
        return
      }
    }

    try {
      let contenido = "Valor\n"

      // Procesar en lotes para evitar bloquear el navegador
      const procesarLote = (inicio, fin) => {
        for (let i = inicio; i < fin && i < numeros.length; i++) {
          contenido += `${numeros[i]}\n`
        }
      }

      const tamanoLote = 10000
      let i = 0

      const procesarSiguienteLote = () => {
        if (i >= numeros.length) {
          // Todos los lotes procesados, crear y descargar el archivo
          const blob = new Blob([contenido], { type: "text/csv;charset=utf-8;" })
          const url = URL.createObjectURL(blob)
          const link = document.createElement("a")
          link.setAttribute("href", url)
          link.setAttribute("download", `numeros_${distribucion}_${new Date().toISOString().slice(0, 10)}.csv`)
          document.body.appendChild(link)
          link.click()
          document.body.removeChild(link)
          return
        }

        const fin = Math.min(i + tamanoLote, numeros.length)
        procesarLote(i, fin)
        i = fin

        // Usar setTimeout para evitar bloquear el navegador
        setTimeout(procesarSiguienteLote, 0)
      }

      procesarSiguienteLote()
    } catch (err) {
      console.error("Error al generar CSV:", err)
      alert("Ocurrió un error al generar el archivo CSV. Intenta con una cantidad menor de números.")
    }
  }

  // Calcular números paginados para mostrar
  const numerosPaginados = useMemo(() => {
    if (!mostrarNumeros) return []

    const inicio = (paginaActual - 1) * numerosPorPagina
    const fin = Math.min(inicio + numerosPorPagina, numeros.length)
    return numeros.slice(inicio, fin)
  }, [numeros, paginaActual, mostrarNumeros, numerosPorPagina])

  // Calcular total de páginas
  const totalPaginas = useMemo(() => {
    return Math.ceil(numeros.length / numerosPorPagina)
  }, [numeros.length, numerosPorPagina])

  // Cambiar a la página siguiente
  const siguientePagina = () => {
    if (paginaActual < totalPaginas) {
      setPaginaActual(paginaActual + 1)
    }
  }

  // Cambiar a la página anterior
  const anteriorPagina = () => {
    if (paginaActual > 1) {
      setPaginaActual(paginaActual - 1)
    }
  }

  // Calcular los intervalos para mostrar
  const intervalosVisibles = useMemo(() => calcularIntervalos(), [numeros, intervalos, intervaloSeleccionado])

  // Función para ejecutar pruebas estadísticas
  const handleRunTests = () => {
    // Verificar si hay números generados
    if (!numeros || numeros.length === 0) {
      setError("No hay números generados para ejecutar pruebas.")
      return
    }

    // Verificar la conexión con el backend antes de cambiar a la pestaña de pruebas
    fetch("http://127.0.0.1:8000/health", { method: "GET" })
      .then((response) => {
        if (response.ok) {
          console.log("Conexión con el backend establecida correctamente")
        } else {
          console.warn("El endpoint de salud no está disponible, pero intentaremos ejecutar las pruebas de todos modos")
        }
        // Cambiar a la pestaña de pruebas incluso si la verificación falla
        setActiveTab("tests")
      })
      .catch((err) => {
        console.error("Error al verificar la conexión con el backend:", err)
        // Mostrar una advertencia pero permitir cambiar a la pestaña de pruebas
        alert(
          "Advertencia: No se pudo conectar con el servidor de pruebas estadísticas. Asegúrate de que el servidor esté en ejecución en http://127.0.0.1:8000",
        )
        setActiveTab("tests")
      })
  }

  return (
    <div className="p-4 max-w-6xl mx-auto">
      <h2 className="text-2xl font-bold mb-4 text-center">Análisis de Números Aleatorios</h2>

      {/* Pestañas de navegación */}
      <div className="flex border-b mb-6">
        <button
          className={`px-4 py-2 ${
            activeTab === "generator" ? "border-b-2 border-blue-600 font-medium" : "text-gray-500"
          }`}
          onClick={() => setActiveTab("generator")}
        >
          Generador
        </button>
        <button
          className={`px-4 py-2 ${activeTab === "tests" ? "border-b-2 border-blue-600 font-medium" : "text-gray-500"}`}
          onClick={() => setActiveTab("tests")}
          disabled={numeros.length === 0}
        >
          Pruebas Estadísticas
        </button>
      </div>

      {activeTab === "generator" ? (
        <>
          <div className="mb-6 grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block mb-2 font-medium">
                Distribución:
                <select
                  className="w-full p-2 border rounded mt-1"
                  value={distribucion}
                  onChange={(e) => setDistribucion(e.target.value)}
                >
                  <option value="uniforme">Uniforme</option>
                  <option value="exponencial">Exponencial</option>
                  <option value="normal/boxmuller">Normal (Box-Muller)</option>
                  <option value="normal/convolucion">Normal (Convolución)</option>
                  <option value="poisson">Poisson</option>
                </select>
              </label>
            </div>

            <div>
              <label className="block mb-2 font-medium">
                Cantidad de números:
                <input
                  type="number"
                  className="w-full p-2 border rounded mt-1"
                  value={cantidad}
                  onChange={(e) => {
                    const valor = Number.parseInt(e.target.value)
                    setCantidad(valor)
                    // Validar y mostrar advertencias
                    if (valor > 5000000) {
                      setAdvertencia("Generar más de 5 millones de números puede causar problemas de rendimiento.")
                    } else if (valor > 1000000) {
                      setAdvertencia("Generar más de 1 millón de números puede tardar bastante tiempo.")
                    } else {
                      setAdvertencia(null)
                    }
                  }}
                  min="10"
                  max="10000000"
                />
              </label>
              {advertencia && (
                <div className="mt-1 text-amber-600 text-sm flex items-center gap-1">
                  <AlertTriangle size={16} />
                  <span>{advertencia}</span>
                </div>
              )}
            </div>
          </div>

          <div className="mb-6 grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Parámetros específicos según la distribución seleccionada */}
            {distribucion === "uniforme" && (
              <>
                <div>
                  <label className="block mb-2 font-medium">
                    Valor mínimo (a):
                    <input
                      type="number"
                      className="w-full p-2 border rounded mt-1"
                      name="a"
                      value={parametros.a}
                      onChange={handleParametroChange}
                    />
                  </label>
                </div>
                <div>
                  <label className="block mb-2 font-medium">
                    Valor máximo (b):
                    <input
                      type="number"
                      className="w-full p-2 border rounded mt-1"
                      name="b"
                      value={parametros.b}
                      onChange={handleParametroChange}
                    />
                  </label>
                </div>
              </>
            )}

            {distribucion === "exponencial" && (
              <div>
                <label className="block mb-2 font-medium">
                  Lambda:
                  <input
                    type="number"
                    className="w-full p-2 border rounded mt-1"
                    name="param"
                    value={parametros.param}
                    onChange={handleParametroChange}
                    step="0.1"
                    min="0.1"
                  />
                </label>
              </div>
            )}

            {(distribucion === "normal/boxmuller" || distribucion === "normal/convolucion") && (
              <>
                <div>
                  <label className="block mb-2 font-medium">
                    Media:
                    <input
                      type="number"
                      className="w-full p-2 border rounded mt-1"
                      name="media"
                      value={parametros.media}
                      onChange={handleParametroChange}
                      step="0.1"
                    />
                  </label>
                </div>
                <div>
                  <label className="block mb-2 font-medium">
                    Desviación estándar:
                    <input
                      type="number"
                      className="w-full p-2 border rounded mt-1"
                      name="des"
                      value={parametros.des}
                      onChange={handleParametroChange}
                      step="0.1"
                      min="0.1"
                    />
                  </label>
                </div>
                {distribucion === "normal/convolucion" && (
                  <div>
                    <label className="block mb-2 font-medium">
                      Valor de n:
                      <input
                        type="number"
                        className="w-full p-2 border rounded mt-1"
                        name="n"
                        value={parametros.n}
                        onChange={handleParametroChange}
                        min="1"
                      />
                    </label>
                  </div>
                )}
              </>
            )}

            {distribucion === "poisson" && (
              <div>
                <label className="block mb-2 font-medium">
                  Lambda:
                  <input
                    type="number"
                    className="w-full p-2 border rounded mt-1"
                    name="lambd"
                    value={parametros.lambd}
                    onChange={handleParametroChange}
                    step="0.1"
                    min="0.1"
                  />
                </label>
              </div>
            )}

            <div>
              <label className="block mb-2 font-medium">
                Cantidad de intervalos (para graficar):
                <input
                  type="number"
                  className="w-full p-2 border rounded mt-1"
                  value={intervalos}
                  onChange={(e) => setIntervalos(Number.parseInt(e.target.value))}
                  min="2"
                  max="100"
                />
              </label>
            </div>
          </div>

          <div className="flex flex-wrap gap-2 mb-6">
            <button
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
              onClick={distribucion === "normal/boxmuller" ? generarNormalBoxMuller : generarNumeros}
              disabled={loading}
            >
              {loading ? "Procesando..." : "Generar y graficar"}
            </button>

            <button
              className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 flex items-center justify-center gap-2"
              onClick={descargarCSV}
              disabled={numeros.length === 0}
            >
              <Download size={16} />
              <span>Descargar CSV</span>
            </button>

            {numeros.length > 0 && (
              <button
                className="px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700"
                onClick={handleRunTests}
              >
                Ejecutar pruebas
              </button>
            )}
          </div>

          {error && (
            <div className="mb-4 p-3 bg-red-100 text-red-700 rounded">
              <div className="font-bold">Error:</div>
              <div>{error}</div>
              {respuestaDebug && (
                <details className="mt-2">
                  <summary className="cursor-pointer text-sm">Ver detalles técnicos</summary>
                  <pre className="mt-2 text-xs overflow-auto max-h-40 p-2 bg-red-50">
                    {JSON.stringify(respuestaDebug, null, 2)}
                  </pre>
                </details>
              )}
            </div>
          )}

          <div className="bg-white p-4 rounded shadow-md mb-6">
            {loading ? (
              <div className="text-center py-10 text-gray-500">
                <div className="mb-2">Generando histograma...</div>
                <div className="text-sm text-gray-400">
                  Esto puede tardar más tiempo para grandes cantidades de números
                </div>
              </div>
            ) : (
              <div
                ref={plotRef}
                style={{ width: "100%", height: "500px" }}
                className={numeros.length === 0 ? "flex items-center justify-center" : ""}
              >
                {numeros.length === 0 && (
                  <div className="text-center py-10 text-gray-500">Genera números para visualizar el histograma</div>
                )}
              </div>
            )}
          </div>

          {numeros.length > 0 && (
            <>
              <div className="mt-6">
                <h3 className="text-lg font-semibold mb-2">Estadísticas Básicas:</h3>
                <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                  <div className="bg-gray-100 p-3 rounded">
                    <p className="font-medium">Total:</p>
                    <p>{numeros.length.toLocaleString()}</p>
                  </div>
                  <div className="bg-gray-100 p-3 rounded">
                    <p className="font-medium">Mínimo:</p>
                    <p>{estadisticas.min.toFixed(4)}</p>
                  </div>
                  <div className="bg-gray-100 p-3 rounded">
                    <p className="font-medium">Máximo:</p>
                    <p>{estadisticas.max.toFixed(4)}</p>
                  </div>
                  <div className="bg-gray-100 p-3 rounded">
                    <p className="font-medium">Media:</p>
                    <p>{estadisticas.media.toFixed(4)}</p>
                  </div>
                  <div className="bg-gray-100 p-3 rounded">
                    <p className="font-medium">Desv. Est.:</p>
                    <p>{estadisticas.desviacion.toFixed(4)}</p>
                  </div>
                </div>
              </div>

              <div className="mt-6">
                <button
                  className="flex items-center justify-between w-full p-3 bg-gray-100 rounded font-medium"
                  onClick={() => setMostrarNumeros(!mostrarNumeros)}
                >
                  <span>Resultado: {numeros.length.toLocaleString()} números generados</span>
                  {mostrarNumeros ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                </button>

                {mostrarNumeros && (
                  <div className="mt-2">
                    <div className="p-3 bg-gray-50 rounded max-h-60 overflow-y-auto font-mono text-sm">
                      {numerosPaginados.map((num, index) => (
                        <div key={index} className="mb-1">
                          {num.toFixed(4)}
                          {index < numerosPaginados.length - 1 ? "," : ""}
                        </div>
                      ))}
                    </div>

                    {totalPaginas > 1 && (
                      <div className="mt-2 flex items-center justify-between">
                        <button
                          className="px-3 py-1 bg-gray-200 rounded disabled:opacity-50"
                          onClick={anteriorPagina}
                          disabled={paginaActual === 1}
                        >
                          Anterior
                        </button>

                        <span className="text-sm">
                          Página {paginaActual} de {totalPaginas}
                          {numeros.length > numerosPorPagina &&
                            ` (mostrando ${numerosPorPagina} de ${numeros.length.toLocaleString()} números)`}
                        </span>

                        <button
                          className="px-3 py-1 bg-gray-200 rounded disabled:opacity-50"
                          onClick={siguientePagina}
                          disabled={paginaActual === totalPaginas}
                        >
                          Siguiente
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div className="mt-6">
                <h3 className="text-lg font-semibold mb-2">Intervalos del Histograma:</h3>
                <div className="grid gap-2">
                  {intervalosVisibles.map((intervalo) => (
                    <div
                      key={intervalo.id}
                      className={`p-3 rounded cursor-pointer transition-colors ${
                        intervaloSeleccionado === intervalo.id
                          ? "bg-blue-100 border border-blue-300"
                          : "bg-gray-100 hover:bg-gray-200"
                      }`}
                      onClick={() => seleccionarIntervalo(intervalo)}
                    >
                      <div className="flex justify-between items-center">
                        <div>
                          <span className="font-medium">
                            Intervalo {intervalo.id + 1}: [{intervalo.limiteInferior.toFixed(2)},{" "}
                            {intervalo.limiteSuperior.toFixed(2)}]
                          </span>
                        </div>
                        <div className="text-sm">
                          <span className="font-medium">{intervalo.cantidad.toLocaleString()} números</span>
                          <span className="ml-2 text-gray-500">({intervalo.porcentaje.toFixed(1)}%)</span>
                        </div>
                      </div>

                      {intervaloSeleccionado === intervalo.id && intervalo.numeros.length > 0 && (
                        <div className="mt-2 pt-2 border-t border-blue-200">
                          {intervalo.numeros.length > 1000 ? (
                            <div className="text-sm text-amber-600 mb-2 flex items-center gap-1">
                              <AlertTriangle size={16} />
                              <span>
                                Este intervalo contiene {intervalo.numeros.length.toLocaleString()} números. Se muestran
                                solo los primeros 1000.
                              </span>
                            </div>
                          ) : (
                            <div className="font-mono text-xs grid grid-cols-4 gap-2">
                              {intervalo.numeros.slice(0, 1000).map((num, idx) => (
                                <div key={idx} className="overflow-hidden text-ellipsis">
                                  {num.toFixed(4)}
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
        </>
      ) : (
        <div className="mt-4">
          {numeros.length > 0 ? (
            <TestRunner
              rnd={numeros.join(",")}
              mo={
                distribucion === "uniforme"
                  ? 0
                  : distribucion === "exponencial"
                    ? 1
                    : distribucion === "normal/boxmuller" || distribucion === "normal/convolucion"
                      ? 2
                      : distribucion === "poisson"
                        ? 3
                        : 0
              }
            />
          ) : (
            <div className="text-center py-10 text-gray-500">
              Primero debes generar números para ejecutar pruebas estadísticas
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default Histograma

