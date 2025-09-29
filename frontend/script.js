let chart; 

function mostrarParametros() {
    const dist = document.getElementById("dist").value;
    const container = document.getElementById("parametros");
    container.innerHTML = "";
  
    if (dist === "uniforme") {
      container.innerHTML = `
        <label for="a">Valor mínimo (a):</label>
        <input type="number" id="a" value="1" /><br/>
        <label for="b">Valor máximo (b):</label>
        <input type="number" id="b" value="10" /><br/>
      `;
    } else if (dist === "exponencial") {
      container.innerHTML = `
        <label for="param">Parámetro λ:</label>
        <input type="number" id="param" value="1" step="0.1" /><br/>
      `;
    } else if (dist === "normal_box") {
      container.innerHTML = `
        <label for="media">Media:</label>
        <input type="number" id="media" value="0" /><br/>
        <label for="des">Desviación:</label>
        <input type="number" id="des" value="1" /><br/>
      `;
    } else if (dist === "normal_conv") {
      container.innerHTML = `
        <label for="media">Media:</label>
        <input type="number" id="media" value="0" /><br/>
        <label for="des">Desviación:</label>
        <input type="number" id="des" value="1" /><br/>
        <label for="n">Valor n (suma aleatorios):</label>
        <input type="number" id="n" value="12" /><br/>
      `;
    } else if (dist === "poisson") {
      container.innerHTML = `
        <label for="lambda">Lambda:</label>
        <input type="number" id="lambda" value="5" /><br/>
      `;
    }
  }
  function descargarCSV() {
    if (!window.ultimosNumeros || ultimosNumeros.length === 0) {
      alert("Primero generá los números.");
      return;
    }
  
    const encabezado = "valor\n";
    const filas = ultimosNumeros.sort((a, b) => a - b)
                            .map(num => `${num}\n`)
                            .join("");

    const contenido = encabezado + filas;
  
    const blob = new Blob([contenido], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.setAttribute("href", URL.createObjectURL(blob));
    link.setAttribute("download", "datos_generados.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
  
async function generar() {
    const dist = document.getElementById("dist").value;
    const cant = document.getElementById("cant").value;
    const intervalos = document.getElementById("intervalos").value;
  
    let url = "http://127.0.0.1:8000";
  
    if (dist === "uniforme") {
      const a = document.getElementById("a").value;
      const b = document.getElementById("b").value;
      url += `/generar/uniforme?a=${a}&b=${b}&cant=${cant}`;
    } else if (dist === "exponencial") {
      const param = document.getElementById("param").value;
      url += `/generar/exponencial?param=${param}&cant=${cant}`;
    } else if (dist === "normal_box") {
      const media = document.getElementById("media").value;
      const des = document.getElementById("des").value;
      url += `/generar/normal/boxmuller?media=${media}&des=${des}&cant=${cant}`;
    } else if (dist === "normal_conv") {
      const media = document.getElementById("media").value;
      const des = document.getElementById("des").value;
      const n = document.getElementById("n").value;
      url += `/generar/normal/convolucion?media=${media}&des=${des}&n=${n}&cant=${cant}`;
    } else if (dist === "poisson") {
      const lambda = document.getElementById("lambda").value;
      url += `/generar/poisson?lambd=${lambda}&cant=${cant}`;
    }
  
    try {
      const response = await fetch(url);
      const data = await response.json();
  
      const numeros = Array.isArray(data.Numeros)
        ? data.Numeros.flat ? data.Numeros.flat() : data.Numeros
        : [];
  
      // ✅ Guardamos los números para luego exportar a CSV
      window.ultimosNumeros = numeros;
  
      document.getElementById("resultado").textContent = JSON.stringify(numeros, null, 2);
  
      // Gráfico
      const ctx = document.getElementById("grafico").getContext("2d");
  
      if (chart) chart.destroy();
  
      const min = Math.min(...numeros);
      const max = Math.max(...numeros);
      const rango = max - min;
      const bins = parseInt(intervalos);
      const tamaño = rango / bins;
      const etiquetas = [];
      const valores = Array(bins).fill(0);
  
      numeros.forEach(num => {
        const i = Math.min(Math.floor((num - min) / tamaño), bins - 1);
        valores[i]++;
      });
  
      for (let i = 0; i < bins; i++) {
        const desde = (min + i * tamaño).toFixed(2);
        const hasta = (min + (i + 1) * tamaño).toFixed(2);
        etiquetas.push(`${desde} - ${hasta}`);
      }
  
      chart = new Chart(ctx, {
        type: "bar",
        data: {
          labels: etiquetas,
          datasets: [{
            label: "Frecuencia",
            data: valores,
            borderWidth: 1
          }]
        },
        options: {
          responsive: true,
          scales: {
            y: {
              beginAtZero: true
            }
          }
        }
      });
  
    } catch (error) {
      console.error("Error al generar:", error);
      document.getElementById("resultado").textContent = "Error al generar los números.";
    }
  }
  mostrarParametros(); // Cargar campos según la distribución seleccionada
