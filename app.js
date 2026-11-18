// ============================================
// app.js — el cerebro del pipeline
// ============================================


// ---------- 1. LOS DATOS ----------
// Ahora cada ficha tiene un "id": un número único, como una cédula.
// Lo necesitamos para saber CUÁL marca estamos editando o borrando.
// Esta lista solo se usa la PRIMERA vez (cuando no hay nada guardado).
// Son marcas FICTICIAS: el código es público, tus datos reales viven solo en tu navegador.

function datosDeEjemplo() {
  return [
    { id: 1, nombre: "Café La Montaña",     contacto: "María Pérez",     etapa: "enviado",   nota: "Les mandé el deck 2027",                     ultimoContacto: "2026-11-03" },
    { id: 2, nombre: "Seguros Atlántico",   contacto: "Luis Rivera",     etapa: "enviado",   nota: "",                                            ultimoContacto: "2026-11-14" },
    { id: 3, nombre: "Banco Ejemplo",       contacto: "Ana Torres",      etapa: "respondio", nota: "Lo está evaluando su equipo de mercadeo",     ultimoContacto: "2026-11-05" },
    { id: 4, nombre: "Tecnología Boricua",  contacto: "Carlos Medina",   etapa: "reunion",   nota: "Reunión pautada para la próxima semana",      ultimoContacto: "2026-11-12" },
    { id: 5, nombre: "Farmacia Modelo",     contacto: "Laura Santiago",  etapa: "propuesta", nota: "Propuesta de 4 episodios enviada",            ultimoContacto: "2026-11-10" },
    { id: 6, nombre: "Destilería Demo",     contacto: "Pedro Colón",     etapa: "cerrado",   nota: "¡Firmado! Serie de 3 episodios",             ultimoContacto: "2026-10-28" },
  ];
}


// ---------- 2. GUARDAR Y CARGAR (localStorage) ----------
// localStorage es un cajoncito que cada navegador le da a cada página.
// Solo guarda TEXTO, así que convertimos la lista a texto (JSON) al guardar
// y de texto a lista al cargar.

const LLAVE = "pipeline-patrocinios-2027"; // el nombre del cajón

function guardar() {
  try {
    localStorage.setItem(LLAVE, JSON.stringify(marcas));
  } catch (error) {
    console.warn("No se pudo guardar:", error);
  }
}

function cargar() {
  try {
    const texto = localStorage.getItem(LLAVE);
    if (texto) return JSON.parse(texto); // había algo guardado → úsalo
  } catch (error) {
    console.warn("No se pudo cargar:", error);
  }
  return datosDeEjemplo(); // primera vez (o cajón vacío) → datos de ejemplo
}

// "let" en vez de "const" porque la lista va a cambiar
let marcas = cargar();


// ---------- 3. HERRAMIENTAS PEQUEÑAS ----------

// Convierte "2026-11-03" en "3 nov".
function formatearFecha(texto) {
  const [anio, mes, dia] = texto.split("-").map(Number);
  const fecha = new Date(anio, mes - 1, dia); // en JavaScript, enero = 0
  return fecha.toLocaleDateString("es", { day: "numeric", month: "short" });
}

// Devuelve la fecha de hoy como "2026-11-18" (el formato que guardamos)
function hoyComoTexto() {
  const hoy = new Date();
  const mes = String(hoy.getMonth() + 1).padStart(2, "0");
  const dia = String(hoy.getDate()).padStart(2, "0");
  return hoy.getFullYear() + "-" + mes + "-" + dia;
}

// Cuántos días pasaron desde una fecha "2026-11-03" hasta hoy.
function diasDesde(texto) {
  const [anio, mes, dia] = texto.split("-").map(Number);
  const fecha = new Date(anio, mes - 1, dia);
  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);             // comparamos días completos, sin horas
  const UN_DIA = 1000 * 60 * 60 * 24;   // las fechas se restan en milisegundos
  return Math.round((hoy - fecha) / UN_DIA);
}


// ---------- REGLAS DEL FOLLOW-UP ----------
// Están arriba y con nombre para que cambiarlas sea fácil (ej. 7 → 5 días).

const DIAS_PARA_FOLLOWUP = 7;
const ETAPAS_SIN_ALERTA = ["cerrado", "perdido"]; // ya terminaron: no hay que perseguirlas

function necesitaFollowup(marca) {
  if (ETAPAS_SIN_ALERTA.includes(marca.etapa)) return false;
  return diasDesde(marca.ultimoContacto) >= DIAS_PARA_FOLLOWUP;
}

// Convierte un número de días en texto humano
function textoDias(dias) {
  if (dias <= 0) return "hoy";
  if (dias === 1) return "ayer";
  return "hace " + dias + " días";
}

// Crea una línea de texto (un <h3>, un <p>...) y la mete dentro de una tarjeta.
function agregarLinea(tarjeta, etiqueta, texto, clase) {
  const linea = document.createElement(etiqueta);
  linea.textContent = texto;
  if (clase) linea.className = clase;
  tarjeta.appendChild(linea);
}


// ---------- 4. DIBUJAR ----------

function crearTarjeta(marca) {
  const tarjeta = document.createElement("article");
  tarjeta.className = "tarjeta";

  agregarLinea(tarjeta, "h3", marca.nombre);
  agregarLinea(tarjeta, "p", "Contacto: " + marca.contacto);
  if (marca.nota) {
    agregarLinea(tarjeta, "p", marca.nota);
  }
  const dias = diasDesde(marca.ultimoContacto);
  agregarLinea(tarjeta, "p", "Último contacto: " + formatearFecha(marca.ultimoContacto) + " · " + textoDias(dias), "fecha");

  // Paso 6: si toca follow-up, márcala
  if (necesitaFollowup(marca)) {
    tarjeta.classList.add("alerta");   // el CSS la pinta
    agregarLinea(tarjeta, "p", "⏰ Toca follow-up", "aviso");
  }

  // Al hacer click en la tarjeta, abre el formulario para editar ESTA marca
  tarjeta.addEventListener("click", function () {
    abrirFormulario(marca);
  });

  return tarjeta;
}

function dibujarTablero() {
  const columnas = document.querySelectorAll(".columna");

  columnas.forEach(function (columna) {
    const etapa = columna.dataset.etapa;

    columna.querySelectorAll(".tarjeta").forEach(function (t) { t.remove(); });

    const marcasDeEstaEtapa = marcas.filter(function (marca) {
      return marca.etapa === etapa;
    });

    // Ordena: la que lleva MÁS tiempo sin contacto va arriba.
    // (Las fechas "2026-11-03" se pueden comparar como texto porque van año-mes-día.)
    marcasDeEstaEtapa.sort(function (a, b) {
      return a.ultimoContacto.localeCompare(b.ultimoContacto);
    });

    marcasDeEstaEtapa.forEach(function (marca) {
      columna.appendChild(crearTarjeta(marca));
    });

    columna.querySelector(".contador").textContent = marcasDeEstaEtapa.length;
  });

  dibujarResumen();
}

// La barra de arriba: "X marcas necesitan follow-up: ..."
function dibujarResumen() {
  const resumen = document.getElementById("resumen");
  const pendientes = marcas.filter(necesitaFollowup);

  if (pendientes.length === 0) {
    resumen.textContent = "✅ Todo al día. Ninguna marca necesita follow-up.";
    resumen.className = "resumen al-dia";
    return;
  }

  // La más atrasada primero
  pendientes.sort(function (a, b) {
    return a.ultimoContacto.localeCompare(b.ultimoContacto);
  });

  const nombres = pendientes.map(function (m) {
    return m.nombre + " (" + diasDesde(m.ultimoContacto) + "d)";
  });

  const palabra = pendientes.length === 1 ? "marca necesita" : "marcas necesitan";
  resumen.textContent = "⏰ " + pendientes.length + " " + palabra + " follow-up: " + nombres.join(", ");
  resumen.className = "resumen pendiente";
}

// Guardar + redibujar siempre van juntos: cada vez que los datos cambian,
// se guardan Y se vuelven a mostrar. Una sola función para no olvidar ninguno.
function actualizar() {
  guardar();
  dibujarTablero();
}


// ---------- 5. EL FORMULARIO: CREAR, EDITAR Y BORRAR ----------
// El MISMO formulario sirve para crear y para editar.
// La variable idEditando nos dice en qué modo estamos:
//   null      → estamos creando una marca nueva
//   un número → estamos editando la marca con ese id

const ventana = document.getElementById("ventana-nueva");
const formulario = document.getElementById("formulario-nueva");
const titulo = document.getElementById("titulo-ventana");
const botonBorrar = document.getElementById("boton-borrar");

let idEditando = null;

// Abre el formulario. Si le pasas una marca → modo editar. Si no → modo crear.
function abrirFormulario(marca) {
  formulario.reset();

  if (marca) {
    // Modo EDITAR: llena los campos con los datos actuales de la marca
    idEditando = marca.id;
    titulo.textContent = "Editar marca";
    botonBorrar.hidden = false;
    formulario.nombre.value = marca.nombre;
    formulario.contacto.value = marca.contacto;
    formulario.etapa.value = marca.etapa;
    formulario.nota.value = marca.nota;
    formulario.ultimoContacto.value = marca.ultimoContacto;
  } else {
    // Modo CREAR: formulario vacío con la fecha de hoy
    idEditando = null;
    titulo.textContent = "Nueva marca";
    botonBorrar.hidden = true;
    formulario.ultimoContacto.value = hoyComoTexto();
  }

  ventana.showModal();
}

// Botón "+ Nueva marca" → abre en modo crear
document.getElementById("boton-nueva").addEventListener("click", function () {
  abrirFormulario();
});

// Botón "Cancelar" → cierra sin hacer nada
document.getElementById("boton-cancelar").addEventListener("click", function () {
  ventana.close();
});

// Botón "Guardar"
formulario.addEventListener("submit", function (evento) {
  evento.preventDefault();

  const datos = {
    nombre: formulario.nombre.value.trim(),
    contacto: formulario.contacto.value.trim(),
    etapa: formulario.etapa.value,
    nota: formulario.nota.value.trim(),
    ultimoContacto: formulario.ultimoContacto.value,
  };

  if (idEditando === null) {
    // CREAR: dale un id nuevo (la hora exacta en milisegundos: nunca se repite)
    datos.id = Date.now();
    marcas.push(datos);
  } else {
    // EDITAR: busca la marca con ese id y reemplaza sus datos
    const marca = marcas.find(function (m) { return m.id === idEditando; });

    // Regla A: si cambió de etapa y NO tocaste la fecha → la fecha pasa a ser hoy
    const cambioDeEtapa = datos.etapa !== marca.etapa;
    const fechaIntacta = datos.ultimoContacto === marca.ultimoContacto;
    if (cambioDeEtapa && fechaIntacta) {
      datos.ultimoContacto = hoyComoTexto();
    }

    Object.assign(marca, datos); // "copia todos los campos de datos encima de marca"
  }

  actualizar();
  ventana.close();
});

// Botón "Borrar"
botonBorrar.addEventListener("click", function () {
  const marca = marcas.find(function (m) { return m.id === idEditando; });
  const seguro = confirm("¿Borrar " + marca.nombre + "? Esto no se puede deshacer.");
  if (!seguro) return;

  // Quédate con todas las marcas MENOS esta
  marcas = marcas.filter(function (m) { return m.id !== idEditando; });

  actualizar();
  ventana.close();
});


// ---------- 6. ¡ARRANCA! ----------
dibujarTablero();
