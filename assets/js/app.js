// ══════════════════════════════════
// ESTADO GLOBAL
// ══════════════════════════════════
let usuarioActual  = null;
let ticketActual   = null;
let paginaAnterior = "dashboard";
window.rolSimulado = null;
// Apuntes por usuario (persisten en la sesión)
let APUNTES = {};
window.APUNTES_ENVIADOS = {};
let sedeSeleccionada = null; // null = todas las sedes


// ══════════════════════════════════
// LOGIN
// ══════════════════════════════════
document.getElementById("btn-ingresar").addEventListener("click", iniciarSesion);
document.getElementById("login-password").addEventListener("keydown", function(e) {
  if (e.key === "Enter") iniciarSesion();
});

function iniciarSesion() {
  let usuario  = document.getElementById("login-usuario").value.trim();
  let password = document.getElementById("login-password").value;
  let errorDiv = document.getElementById("login-error");

  let encontrado = USUARIOS.find(u => u.usuario === usuario && u.password === password);
  if (!encontrado) {
    errorDiv.textContent = "⚠ Usuario o contraseña incorrectos.";
    return;
  }

  usuarioActual        = encontrado;
  window.rolSimulado   = null;
  errorDiv.textContent = "";
  entrarAlSistema();
}

function entrarAlSistema() {
  document.getElementById("pantalla-login").classList.add("oculto");
  document.getElementById("pantalla-sistema").classList.remove("oculto");

  document.getElementById("topbar-nombre").textContent = usuarioActual.nombre;
  document.getElementById("topbar-rol").textContent    = usuarioActual.cargo;
  document.getElementById("topbar-avatar").textContent = usuarioActual.nombre.charAt(0);

  // Selector de rol solo para admin
  let selectorRol = document.getElementById("selector-rol-admin");
  if (usuarioActual.rol === "admin") {
    selectorRol.classList.remove("oculto");
    selectorRol.value = "";
    selectorRol.onchange = function() {
      window.rolSimulado = this.value || null;
      ajustarSidebarPorRol();
      navegarA("dashboard");
      cargarDashboard();
    };
  } else {
    selectorRol.classList.add("oculto");
  }

  ajustarSidebarPorRol();
  inicializarEventos();
  navegarA("dashboard");
  cargarDashboard();
}

function ajustarSidebarPorRol() {
    const rol = getRolEfectivo();
    if (!usuarioActual) return;

    document.querySelectorAll(".nav-item").forEach(item => {
        const pagina = item.dataset.pagina;
        // Si no es admin, ocultamos las secciones sensibles
        if (usuarioActual.rol !== "admin" && (pagina === "reportes" || pagina === "sedes" || pagina === "todos-tickets")) {
            item.style.display = "none";
        } else {
            item.style.display = "flex";
        }
    });
}

// ══════════════════════════════════
// EVENTOS
// ══════════════════════════════════
function inicializarEventos() {
  document.getElementById("btn-guardar-apunte").addEventListener("click", guardarApunte);
  document.querySelectorAll(".nav-item").forEach(item => {
  document.getElementById("btn-confirmar-editar").addEventListener("click", confirmarEdicion);
    item.addEventListener("click", function(e) {
      e.preventDefault();
      let pagina = this.dataset.pagina;
      navegarA(pagina);
      cargarPagina(pagina);
    });
  });

  document.getElementById("btn-salir").addEventListener("click", function() {
    usuarioActual      = null;
    window.rolSimulado = null;
    document.getElementById("pantalla-sistema").classList.add("oculto");
    document.getElementById("pantalla-login").classList.remove("oculto");
    document.getElementById("login-usuario").value  = "";
    document.getElementById("login-password").value = "";
    document.getElementById("selector-rol-admin").classList.add("oculto");
  });

  document.getElementById("overlay-modal").addEventListener("click", function() {
    document.querySelectorAll(".modal").forEach(m => m.classList.add("oculto"));
    this.classList.add("oculto");
  });

  document.getElementById("btn-crear-ticket").addEventListener("click", crearTicket);
  document.getElementById("btn-confirmar-delegar").addEventListener("click", confirmarDelegar);
  document.getElementById("buscar-solucion").addEventListener("input", function() {
    renderSoluciones(this.value);
  });
}

// ══════════════════════════════════
// CARGAR PÁGINAS
// ══════════════════════════════════
function cargarPagina(pagina) {
  if (pagina === "dashboard")     cargarDashboard();
  if (pagina === "mis-tickets")   cargarMisTickets();
  if (pagina === "depto-tickets") cargarDeptoTickets();
  if (pagina === "todos-tickets") cargarTodosTickets();
  if (pagina === "soluciones")    cargarSoluciones();
  if (pagina === "reportes")      cargarReportes();
  if (pagina === "sedes")         cargarSedes();      // ← AGREGAR
}

// ══════════════════════════════════
// HELPERS
// ══════════════════════════════════
function saludo() {
  let h = new Date().getHours();
  if (h < 12) return "¡Buenos días";
  if (h < 19) return "¡Buenas tardes";
  return "¡Buenas noches";
}

function getBotonesTicket(ticket, rol) {
  let botones = [];
  let esAsignado = ticket.tecnico === usuarioActual.nombre;
  let anulado    = ticket.estado === "ANULADO" || ticket.estado === "CERRADO";

  // ATENDER: aparece en TODOS los tickets asignados al usuario actual
  // sin importar el rol, siempre que esté en ASIGNADO
  if (esAsignado && ticket.estado === "ASIGNADO") {
    botones.push({ tipo: "atender" });
  }

  // TOMAR: tickets sin asignar (recepcionista y admin)
  if (!ticket.tecnico && ticket.estado === "CREADO" &&
      (rol === "recepcionista" || rol === "admin")) {
    botones.push({ tipo: "tomar" });
  }

  // DELEGAR: si está asignado y no está cerrado/anulado
  if (ticket.tecnico && !anulado) {
    if (rol === "recepcionista" || rol === "admin") botones.push({ tipo: "delegar" });
    if (rol === "tecnico" && esAsignado)            botones.push({ tipo: "delegar" });
  }

  return botones;
}
// ══════════════════════════════════
// DASHBOARD
// ══════════════════════════════════
function cargarDashboard(filtro = "todos") {
  let rol    = getRolEfectivo();
  let nombre = usuarioActual.nombre;

  // Solo tickets asignados al técnico logueado (excluyendo cerrados y anulados)
  let misTickets = rol === "admin"
    ? TICKETS.filter(t => t.estado !== "CERRADO" && t.estado !== "ANULADO")
    : TICKETS.filter(t => t.tecnico === nombre && t.estado !== "CERRADO" && t.estado !== "ANULADO");

  let stats = {
    total:     misTickets.length,
    asignados: misTickets.filter(t => t.estado === "ASIGNADO").length,
    enProceso: misTickets.filter(t => t.estado === "EN_PROCESO").length,
    cerrados:  TICKETS.filter(t => t.tecnico === nombre && t.estado === "CERRADO").length,
    inmediata: misTickets.filter(t => t.prioridad === "inmediata" || t.prioridad === "alta").length,
  };

  // Filtrar según botón activo
  let ticketsMostrar = misTickets.slice();
  if (filtro === "proceso")   ticketsMostrar = ticketsMostrar.filter(t => t.estado === "EN_PROCESO");
  if (filtro === "asignados") ticketsMostrar = ticketsMostrar.filter(t => t.estado === "ASIGNADO");

  // Orden cronológico siempre
  ticketsMostrar.sort((a,b) => new Date(a.creadoEn) - new Date(b.creadoEn));

  let recientesHTML = ticketsMostrar.length > 0
    ? ticketsMostrar.map(t => renderTicketCardCompacta(t, getBotonesTicket(t, rol))).join("")
    : `<div class="vacio" style="grid-column:1/-1;"><i class="fa-solid fa-inbox"></i>No hay tickets para mostrar.</div>`;

  // Alerta solo si hay tickets de alta prioridad
  let alertaHTML = stats.inmediata > 0 ? `
    <div class="alerta-prioridad alerta-animada">
      <i class="fa-solid fa-circle-exclamation"></i>
      <div>
        <strong>⚠ Alerta de Prioridad Alta</strong>
        <p>${stats.inmediata} ticket(s) requieren atención inmediata</p>
      </div>
    </div>
  ` : `<div></div>`;

  document.getElementById("pagina-dashboard").innerHTML = `

 <!-- BANNER + APUNTES -->
<div style="display:grid;grid-template-columns:1fr 320px;gap:16px;margin-bottom:20px;">

  <div class="banner-bienvenida" style="margin-bottom:0;">
    <div class="banner-avatar"><i class="fa-solid fa-user"></i></div>
    <div class="banner-texto">
      <h2>${saludo()}, ${nombre.split(" ")[0]}!</h2>
      <p>${usuarioActual.cargo}</p>
      <div class="banner-chips">
        <span class="banner-chip"><i class="fa-solid fa-user-check"></i> ${stats.asignados} asignados</span>
        <span class="banner-chip"><i class="fa-solid fa-spinner"></i> ${stats.enProceso} en proceso</span>
        <span class="banner-chip"><i class="fa-solid fa-circle-check"></i> ${stats.cerrados} cerrados</span>
      </div>
    </div>
  </div>

  <!-- PANEL DE APUNTES -->
  <div class="panel-apuntes" id="panel-apuntes-dashboard">
    <div class="apuntes-header">
      <span><i class="fa-solid fa-note-sticky" style="margin-right:6px;"></i>Mis Apuntes</span>
      <button class="apuntes-btn-add" onclick="abrirModalApuntes()" title="Nuevo apunte">
        <i class="fa-solid fa-plus"></i>
      </button>
    </div>
    <div class="apuntes-lista" id="apuntes-lista-dashboard"></div>
  </div>

</div>

</div>
    <div class="stats-grid" style="margin-bottom:20px;">
      <div class="stat-card">
        <div class="stat-info"><p>Tickets Activos</p><strong>${stats.total}</strong></div>
        <div class="stat-icono azul"><i class="fa-solid fa-ticket"></i></div>
      </div>
      <div class="stat-card">
        <div class="stat-info"><p>Asignados</p><strong>${stats.asignados}</strong></div>
        <div class="stat-icono morado"><i class="fa-solid fa-user-check"></i></div>
      </div>
      <div class="stat-card">
        <div class="stat-info"><p>En Proceso</p><strong>${stats.enProceso}</strong></div>
        <div class="stat-icono naranja"><i class="fa-solid fa-clock"></i></div>
      </div>
      <div class="stat-card">
        <div class="stat-info"><p>Cerrados</p><strong>${stats.cerrados}</strong></div>
        <div class="stat-icono verde"><i class="fa-solid fa-circle-check"></i></div>
      </div>
    </div>

    <div class="dashboard-grid" style="margin-bottom:20px;">
      <div class="card">
        <h3 style="font-size:14px;font-weight:700;margin-bottom:12px;">Acciones Rápidas</h3>
        <div class="acciones-rapidas" style="flex-wrap:wrap;gap:8px;">
          ${rol !== "tecnico" ? `<button class="btn-primary" onclick="abrirModalNuevo()"><i class="fa-solid fa-plus"></i> Nuevo Servicio</button>` : ""}
          <button class="btn-secondary ${filtro==='todos'    ?'btn-filtro-activo':''}" onclick="cargarDashboard('todos')">
            <i class="fa-solid fa-list"></i> Todos
          </button>
          <button class="btn-secondary ${filtro==='proceso'  ?'btn-filtro-activo':''}" onclick="cargarDashboard('proceso')">
            <i class="fa-solid fa-clock"></i> En Proceso
          </button>
          <button class="btn-secondary ${filtro==='asignados'?'btn-filtro-activo':''}" onclick="cargarDashboard('asignados')">
            <i class="fa-solid fa-user-check"></i> Asignados
          </button>
          <button class="btn-secondary" onclick="abrirModalSoluciones()">
            <i class="fa-solid fa-magnifying-glass"></i> Buscar Soluciones
          </button>
          <button class="btn-secondary" onclick="abrirModalApuntes()">
         <i class="fa-solid fa-note-sticky"></i> Apuntes
          </button>
        </div>
      </div>
      ${alertaHTML}
    </div>

    <div class="card">
      <div class="tickets-recientes-header">
        <h3>Mis Tickets Activos</h3>
        <span class="ver-todos-link" onclick="navegarA('mis-tickets');cargarMisTickets();">Ver Historial →</span>
      </div>
      <div class="tickets-grid-compacto">${recientesHTML}</div>
    </div>
  `;
  // Mostrar resumen de notas enviadas si es admin
  let notasEnviadas = [];
  USUARIOS.forEach(u => {
    if (!APUNTES[u.id]) return;
    APUNTES[u.id].forEach(a => {
      if (a.deAdmin) notasEnviadas.push({ ...a, destinatario: u.nombre });
    });
  });

  if (usuarioActual.rol === "admin" && notasEnviadas.length > 0) {
    let noVistas = notasEnviadas.filter(a => !a.leido).length;

    setTimeout(() => {
      let header = document.querySelector(".apuntes-header span");
      if (header && noVistas > 0) {
        header.innerHTML = `
          <i class="fa-solid fa-note-sticky" style="margin-right:6px;"></i>
          Mis Apuntes
          <span style="background:#ef4444;color:#fff;font-size:10px;font-weight:700;
            padding:2px 6px;border-radius:99px;margin-left:6px;">${noVistas} sin leer</span>
        `;
      }
    }, 50);
  }

  // Renderizar apuntes
  renderApuntesDashboard();
}

// ══════════════════════════════════
// MIS TICKETS — Semana + Estadísticas
// ══════════════════════════════════
function cargarMisTickets(busqueda = "", filtroEstado = "", filtroOrden = "reciente") {
  let rol    = getRolEfectivo();
  let nombre = usuarioActual.nombre;

  let inicioSemana = new Date();
  inicioSemana.setDate(inicioSemana.getDate() - inicioSemana.getDay());
  inicioSemana.setHours(0, 0, 0, 0);

  let misTickets = rol === "recepcionista"
    ? TICKETS.filter(t => t.solicitante === nombre)
    : TICKETS.filter(t => t.tecnico === nombre);

  let ticketsSemana  = misTickets.filter(t => new Date(t.creadoEn) >= inicioSemana);
  let cerradosSemana = ticketsSemana.filter(t => t.estado === "CERRADO");

  let stats = {
    total:     misTickets.length,
    semana:    ticketsSemana.length,
    cerrados:  misTickets.filter(t => t.estado === "CERRADO").length,
    enProceso: misTickets.filter(t => t.estado === "EN_PROCESO").length,
    asignados: misTickets.filter(t => t.estado === "ASIGNADO").length,
    alta:      misTickets.filter(t => t.prioridad === "alta" || t.prioridad === "inmediata").length,
    media:     misTickets.filter(t => t.prioridad === "media").length,
    baja:      misTickets.filter(t => t.prioridad === "baja").length,
  };

  // Filtros y orden
  let filtrados = misTickets.slice();
  if (busqueda.trim()) {
    filtrados = filtrados.filter(t =>
      t.titulo.toLowerCase().includes(busqueda.toLowerCase()) ||
      t.id.toLowerCase().includes(busqueda.toLowerCase()) ||
      t.departamento.toLowerCase().includes(busqueda.toLowerCase()) ||
      t.prioridad.toLowerCase().includes(busqueda.toLowerCase()) ||
      (t.tecnico      || "").toLowerCase().includes(busqueda.toLowerCase()) ||
      (t.solicitante  || "").toLowerCase().includes(busqueda.toLowerCase())
    );
  }
  if (filtroEstado) filtrados = filtrados.filter(t => t.estado === filtroEstado);

  if (filtroOrden === "reciente")  filtrados.sort((a,b) => new Date(b.creadoEn) - new Date(a.creadoEn));
  if (filtroOrden === "antiguo")   filtrados.sort((a,b) => new Date(a.creadoEn) - new Date(b.creadoEn));
  if (filtroOrden === "prioridad") {
    let ord = { inmediata:0, alta:1, media:2, baja:3 };
    filtrados.sort((a,b) => ord[a.prioridad] - ord[b.prioridad]);
  }
  if (filtroOrden === "numero") filtrados.sort((a,b) => a.id.localeCompare(b.id));

  let listaHTML = filtrados.length > 0
    ? filtrados.map(t => renderTicketCardCompacta(t, getBotonesTicket(t, rol))).join("")
    : renderVacio("No hay tickets" + (busqueda ? " con esa búsqueda" : "") + ".");

  let cerradosSemanaHTML = cerradosSemana.length > 0
    ? cerradosSemana.map(t => `
        <div onclick="verTicket('${t.id}')" style="cursor:pointer;display:flex;justify-content:space-between;align-items:center;padding:12px 0;border-bottom:1px solid var(--border);">
          <div>
            <div style="display:flex;gap:8px;align-items:center;margin-bottom:4px;">
              <span style="font-size:12px;font-weight:700;color:var(--text-muted);">#${t.id}</span>
              ${badgeEstado(t.estado)}
            </div>
            <div style="font-size:13px;font-weight:600;">${t.titulo}</div>
            <div style="font-size:11px;color:var(--text-muted);margin-top:2px;">${t.departamento}</div>
          </div>
          <span style="font-size:12px;color:var(--success);font-weight:600;flex-shrink:0;margin-left:12px;">Completado</span>
        </div>
      `).join("")
    : `<p style="color:var(--text-muted);font-size:13px;padding:12px 0;">No hay tickets cerrados esta semana.</p>`;

  document.getElementById("pagina-mis-tickets").innerHTML = `

    <!-- STATS -->
    <div class="stats-grid" style="margin-bottom:24px;">
      <div class="stat-card">
        <div class="stat-info"><p>Tickets Cerrados</p><strong>${stats.cerrados}</strong></div>
        <div class="stat-icono verde"><i class="fa-solid fa-circle-check"></i></div>
      </div>
      <div class="stat-card">
        <div class="stat-info"><p>En Proceso</p><strong>${stats.enProceso}</strong></div>
        <div class="stat-icono naranja"><i class="fa-solid fa-clock"></i></div>
      </div>
      <div class="stat-card">
        <div class="stat-info"><p>Esta Semana</p><strong>${stats.semana}</strong></div>
        <div class="stat-icono azul"><i class="fa-solid fa-calendar-week"></i></div>
      </div>
      <div class="stat-card">
        <div class="stat-info"><p>Total Asignados</p><strong>${stats.total}</strong></div>
        <div class="stat-icono morado"><i class="fa-solid fa-ticket"></i></div>
      </div>
    </div>

    <!-- GRÁFICAS -->
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:20px;margin-bottom:24px;">

      <div class="card">
        <h3 style="font-size:14px;font-weight:700;margin-bottom:20px;">Estado de Tickets</h3>
        <div style="display:flex;align-items:center;gap:24px;">
          <canvas id="grafica-estado" width="160" height="160"></canvas>
          <div style="display:flex;flex-direction:column;gap:10px;">
            <div style="display:flex;align-items:center;gap:8px;font-size:13px;">
              <div style="width:12px;height:12px;border-radius:50%;background:#10b981;flex-shrink:0;"></div>
              <span style="color:#10b981;font-weight:600;">Cerrados: ${stats.cerrados}</span>
            </div>
            <div style="display:flex;align-items:center;gap:8px;font-size:13px;">
              <div style="width:12px;height:12px;border-radius:50%;background:#f97316;flex-shrink:0;"></div>
              <span style="color:#f97316;font-weight:600;">En Proceso: ${stats.enProceso}</span>
            </div>
            <div style="display:flex;align-items:center;gap:8px;font-size:13px;">
              <div style="width:12px;height:12px;border-radius:50%;background:#3b82f6;flex-shrink:0;"></div>
              <span style="color:#3b82f6;font-weight:600;">Asignados: ${stats.asignados}</span>
            </div>
          </div>
        </div>
      </div>

      <div class="card">
        <h3 style="font-size:14px;font-weight:700;margin-bottom:20px;">Tickets por Prioridad</h3>
        <div style="display:flex;align-items:center;gap:24px;">
          <canvas id="grafica-prioridad" width="160" height="160"></canvas>
          <div style="display:flex;flex-direction:column;gap:10px;">
            <div style="display:flex;align-items:center;gap:8px;font-size:13px;">
              <div style="width:12px;height:12px;border-radius:50%;background:#10b981;flex-shrink:0;"></div>
              <span style="color:#10b981;font-weight:600;">Baja: ${stats.baja}</span>
            </div>
            <div style="display:flex;align-items:center;gap:8px;font-size:13px;">
              <div style="width:12px;height:12px;border-radius:50%;background:#f59e0b;flex-shrink:0;"></div>
              <span style="color:#f59e0b;font-weight:600;">Media: ${stats.media}</span>
            </div>
            <div style="display:flex;align-items:center;gap:8px;font-size:13px;">
              <div style="width:12px;height:12px;border-radius:50%;background:#8b5cf6;flex-shrink:0;"></div>
              <span style="color:#8b5cf6;font-weight:600;">Alta: ${stats.alta}</span>
            </div>
          </div>
        </div>
      </div>

    </div>

    <!-- CERRADOS ESTA SEMANA -->
    <div class="card" style="margin-bottom:24px;">
      <h3 style="font-size:14px;font-weight:700;margin-bottom:4px;">Tickets Cerrados esta Semana</h3>
      ${cerradosSemanaHTML}
    </div>

    <!-- BUSCADOR Y LISTA COMPLETA -->
    <div class="card">
      <h3 style="font-size:14px;font-weight:700;margin-bottom:14px;">
        <i class="fa-solid fa-ticket" style="color:var(--accent);margin-right:6px;"></i>
        Todos mis Tickets
      </h3>
      <div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:12px;">
        <div class="buscador-soluciones" style="flex:1;min-width:200px;margin-bottom:0;">
          <i class="fa-solid fa-magnifying-glass"></i>
          <input type="text" id="buscador-mis-tickets"
            placeholder="ID, título, solicitante, departamento, prioridad..."
            value="${busqueda}" />
        </div>
        <select id="filtro-mis-estado" style="background:var(--bg);border:1px solid var(--border);border-radius:8px;padding:8px 12px;font-size:13px;outline:none;">
          <option value=""          ${!filtroEstado              ?"selected":""}>Todos los estados</option>
          <option value="CREADO"    ${filtroEstado==="CREADO"    ?"selected":""}>Creado</option>
          <option value="ASIGNADO"  ${filtroEstado==="ASIGNADO"  ?"selected":""}>Asignado</option>
          <option value="EN_PROCESO"${filtroEstado==="EN_PROCESO"?"selected":""}>En Proceso</option>
          <option value="CERRADO"   ${filtroEstado==="CERRADO"   ?"selected":""}>Cerrado</option>
        </select>
        <select id="filtro-mis-orden" style="background:var(--bg);border:1px solid var(--border);border-radius:8px;padding:8px 12px;font-size:13px;outline:none;">
          <option value="reciente" ${filtroOrden==="reciente" ?"selected":""}>Más reciente</option>
          <option value="antiguo"  ${filtroOrden==="antiguo"  ?"selected":""}>Más antiguo</option>
          <option value="prioridad"${filtroOrden==="prioridad"?"selected":""}>Por prioridad</option>
          <option value="numero"   ${filtroOrden==="numero"   ?"selected":""}>Por número</option>
        </select>
      </div>
      <p class="resultados-texto">${filtrados.length} resultado(s)</p>
      <div class="tickets-grid-compacto">${listaHTML}</div>
    </div>
  `;

  // Dibujar gráficas de torta
  dibujarTorta("grafica-estado", [
    { valor: stats.cerrados,  color: "#10b981" },
    { valor: stats.enProceso, color: "#f97316" },
    { valor: stats.asignados, color: "#3b82f6" },
  ]);

  dibujarTorta("grafica-prioridad", [
    { valor: stats.baja,  color: "#10b981" },
    { valor: stats.media, color: "#f59e0b" },
    { valor: stats.alta,  color: "#8b5cf6" },
  ]);

  // Eventos buscador
  document.getElementById("buscador-mis-tickets").addEventListener("input", function() {
    cargarMisTickets(this.value,
      document.getElementById("filtro-mis-estado").value,
      document.getElementById("filtro-mis-orden").value
    );
  });
  document.getElementById("filtro-mis-estado").addEventListener("change", function() {
    cargarMisTickets(
      document.getElementById("buscador-mis-tickets").value,
      this.value,
      document.getElementById("filtro-mis-orden").value
    );
  });
  document.getElementById("filtro-mis-orden").addEventListener("change", function() {
    cargarMisTickets(
      document.getElementById("buscador-mis-tickets").value,
      document.getElementById("filtro-mis-estado").value,
      this.value
    );
  });
}

// ── Función para dibujar gráfica de torta con Canvas ──
function dibujarTorta(canvasId, datos) {
  let canvas = document.getElementById(canvasId);
  if (!canvas) return;

  let ctx   = canvas.getContext("2d");
  let total = datos.reduce((s, d) => s + d.valor, 0);
  let cx    = canvas.width  / 2;
  let cy    = canvas.height / 2;
  let r     = Math.min(cx, cy) - 10;

  ctx.clearRect(0, 0, canvas.width, canvas.height);

  if (total === 0) {
    // Círculo gris si no hay datos
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fillStyle = "#e2e8f0";
    ctx.fill();
    return;
  }

  let angulo = -Math.PI / 2;
  datos.forEach(d => {
    if (d.valor === 0) return;
    let slice = (d.valor / total) * Math.PI * 2;
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.arc(cx, cy, r, angulo, angulo + slice);
    ctx.closePath();
    ctx.fillStyle = d.color;
    ctx.fill();
    ctx.strokeStyle = "#fff";
    ctx.lineWidth = 2;
    ctx.stroke();
    angulo += slice;
  });

  // Círculo blanco en el centro (efecto donut)
  ctx.beginPath();
  ctx.arc(cx, cy, r * 0.55, 0, Math.PI * 2);
  ctx.fillStyle = "#fff";
  ctx.fill();

  // Número total en el centro
  ctx.fillStyle = "#1a202c";
  ctx.font = `bold ${r * 0.35}px Inter, sans-serif`;
  ctx.textAlign    = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(total, cx, cy);
}

// ══════════════════════════════════
// TICKETS DEL DEPARTAMENTO (Corregido)
// ══════════════════════════════════
function cargarDeptoTickets(filtros = {}) {
  let rol = getRolEfectivo();

  // 1. PRIMERO definimos la base según la sede del usuario
  let ticketsBase = (usuarioActual && usuarioActual.sedeId)
    ? TICKETS.filter(t => t.sedeId === usuarioActual.sedeId)
    : TICKETS;

  // 2. Aplicamos los filtros sobre esa base
  let lista = ticketsBase.filter(t => {
    let coincideTexto  = !filtros.texto  || 
      t.titulo.toLowerCase().includes(filtros.texto) || 
      t.id.toLowerCase().includes(filtros.texto) ||
      (t.tecnico || "").toLowerCase().includes(filtros.texto) ||
      t.descripcion.toLowerCase().includes(filtros.texto);
    
    let coincideEstado = !filtros.estado || t.estado === filtros.estado;

    let coincideDesde = true;
    if (filtros.desde) {
      let desde = new Date(filtros.desde);
      desde.setHours(0,0,0,0);
      coincideDesde = new Date(t.creadoEn) >= desde;
    }

    let coincideHasta = true;
    if (filtros.hasta) {
      let hasta = new Date(filtros.hasta);
      hasta.setHours(23,59,59,999);
      coincideHasta = new Date(t.creadoEn) <= hasta;
    }

    return coincideTexto && coincideEstado && coincideDesde && coincideHasta;
  });
    
  // Orden
  if (filtros.orden === "antiguo") {
    lista.sort((a,b) => new Date(a.creadoEn) - new Date(b.creadoEn));
  } else {
    lista.sort((a,b) => new Date(b.creadoEn) - new Date(a.creadoEn));
  }

  let listaHTML = lista.length > 0
    ? lista.map(t => renderTicketCardCompacta(t, getBotonesTicket(t, rol))).join("")
    : renderVacio("No hay tickets que coincidan.");

  document.getElementById("pagina-depto-tickets").innerHTML = `
    <div class="filtros-barra">
      <div class="filtros-fila" style="margin-bottom:12px;">
        <div class="filtro-grupo filtro-buscar" style="flex:1;">
          <label>Buscar</label>
          <div class="buscador-soluciones" style="margin-bottom:0;">
            <i class="fa-solid fa-magnifying-glass"></i>
            <input type="text" id="depto-buscar" placeholder="ID, título, técnico..." value="${filtros.texto || ''}" />
          </div>
        </div>
        <div class="filtro-grupo">
          <label>Estado</label>
          <select id="depto-estado" class="select-custom">
            <option value="" ${!filtros.estado ? "selected" : ""}>Todos</option>
            <option value="CREADO" ${filtros.estado==="CREADO"?"selected":""}>Creado</option>
            <option value="ASIGNADO" ${filtros.estado==="ASIGNADO"?"selected":""}>Asignado</option>
            <option value="EN_PROCESO" ${filtros.estado==="EN_PROCESO"?"selected":""}>En Proceso</option>
            <option value="CERRADO" ${filtros.estado==="CERRADO"?"selected":""}>Cerrado</option>
          </select>
        </div>
        <div class="filtro-grupo">
           <label>&nbsp;</label>
           <button class="btn-secondary" id="depto-limpiar">Limpiar</button>
        </div>
      </div>
      <div class="filtros-fila">
        <div class="filtro-grupo" style="flex:1;"><label>Desde</label><input type="date" id="depto-desde" value="${filtros.desde || ''}" class="input-custom" /></div>
        <div class="filtro-grupo" style="flex:1;"><label>Hasta</label><input type="date" id="depto-hasta" value="${filtros.hasta || ''}" class="input-custom" /></div>
      </div>
    </div>
    <p class="resultados-texto">Resultados (${lista.length})</p>
    <div class="tickets-grid-compacto">${listaHTML}</div>
  `;

  // Listeners
  const inputs = ["depto-buscar", "depto-estado", "depto-desde", "depto-hasta"];
  inputs.forEach(id => {
    document.getElementById(id).addEventListener("change", () => {
        cargarDeptoTickets({
            texto: document.getElementById("depto-buscar").value.toLowerCase(),
            estado: document.getElementById("depto-estado").value,
            desde: document.getElementById("depto-desde").value,
            hasta: document.getElementById("depto-hasta").value
        });
    });
  });
  document.getElementById("depto-limpiar").onclick = () => cargarDeptoTickets();
}

// ══════════════════════════════════
// TODOS LOS TICKETS (Corregido renderTicketCard)
// ══════════════════════════════════
function cargarTodosTickets(filtros = {}) {
  let rol = getRolEfectivo();
  let lista = TICKETS.filter(t => {
    let coincideTexto = !filtros.texto || t.titulo.toLowerCase().includes(filtros.texto) || t.id.includes(filtros.texto);
    let coincideEstado = !filtros.estado || t.estado === filtros.estado;
    return coincideTexto && coincideEstado;
  }).slice().reverse();

  let listaHTML = lista.length > 0
    ? lista.map(t => renderTicketCardCompacta(t, getBotonesTicket(t, rol))).join("")
    : renderVacio("No hay tickets.");

  document.getElementById("pagina-todos-tickets").innerHTML = `
    <div class="card">
       <div class="buscador-soluciones">
          <i class="fa-solid fa-magnifying-glass"></i>
          <input type="text" id="todos-buscar-input" placeholder="Buscar en todo el sistema..." />
       </div>
       <div class="tickets-grid-compacto">${listaHTML}</div>
    </div>
  `;
}

 function getRolEfectivo() {
    return window.rolSimulado || (usuarioActual ? usuarioActual.rol : null);
}



// ══════════════════════════════════
// CENTRO DE SOLUCIONES
// ══════════════════════════════════
function cargarSoluciones() {
  document.getElementById("pagina-soluciones").innerHTML = `
    <div class="card">
      <div class="buscador-soluciones" style="margin-bottom:20px;">
        <i class="fa-solid fa-magnifying-glass"></i>
        <input type="text" id="buscar-sol-pagina" placeholder="Buscar por problema, categoría o solución..." />
      </div>
      <div id="lista-sol-pagina"></div>
    </div>
  `;
  renderSolucionesPagina("");
  document.getElementById("buscar-sol-pagina").addEventListener("input", function() {
    renderSolucionesPagina(this.value);
  });
}

function renderSolucionesPagina(query) {
  let lista = SOLUCIONES.filter(s =>
    s.titulo.toLowerCase().includes(query.toLowerCase()) ||
    s.categoria.toLowerCase().includes(query.toLowerCase()) ||
    s.descripcion.toLowerCase().includes(query.toLowerCase())
  );
  document.getElementById("lista-sol-pagina").innerHTML = lista.map(s => `
    <div class="solucion-item">
      <div class="solucion-icono"><i class="fa-solid fa-book-open"></i></div>
      <div class="solucion-texto"><strong>${s.titulo}</strong><p>${s.descripcion}</p></div>
      <span class="badge badge-asignado">${s.categoria}</span>
    </div>
  `).join("") || renderVacio("No se encontraron soluciones.");
}

function renderSoluciones(query) {
  let lista = SOLUCIONES.filter(s =>
    s.titulo.toLowerCase().includes(query.toLowerCase()) ||
    s.categoria.toLowerCase().includes(query.toLowerCase()) ||
    s.descripcion.toLowerCase().includes(query.toLowerCase())
  );
  document.getElementById("lista-soluciones").innerHTML = lista.map(s => `
    <div class="solucion-item">
      <div class="solucion-icono"><i class="fa-solid fa-book-open"></i></div>
      <div class="solucion-texto"><strong>${s.titulo}</strong><p>${s.descripcion}</p></div>
      <span class="badge badge-asignado">${s.categoria}</span>
    </div>
  `).join("") || renderVacio("No se encontraron soluciones.");
}

// ══════════════════════════════════
// REPORTES
// ══════════════════════════════════
function cargarReportes() {
  let stats = getEstadisticas();
  let tecnicos = USUARIOS.filter(u => u.rol === "tecnico");

  document.getElementById("pagina-reportes").innerHTML = `

    <!-- STATS -->
    <div class="stats-grid" style="margin-bottom:24px;">
      <div class="stat-card">
        <div class="stat-info">
          <p>Tasa de Resolución</p>
          <strong>${stats.total ? Math.round(stats.cerrados/stats.total*100) : 0}%</strong>
          <span style="font-size:11px;color:var(--success);">↑ vs mes anterior</span>
        </div>
        <div class="stat-icono verde"><i class="fa-solid fa-arrow-trend-up"></i></div>
      </div>
      <div class="stat-card">
        <div class="stat-info">
          <p>Tiempo Promedio</p>
          <strong>2.8h</strong>
          <span style="font-size:11px;color:var(--danger);">↓ 0.3h vs mes anterior</span>
        </div>
        <div class="stat-icono azul"><i class="fa-solid fa-clock"></i></div>
      </div>
      <div class="stat-card">
        <div class="stat-info">
          <p>Tickets Activos</p>
          <strong>${stats.enProceso + stats.asignados}</strong>
          <span style="font-size:11px;color:var(--text-muted);">En turno actual</span>
        </div>
        <div class="stat-icono morado"><i class="fa-solid fa-circle-half-stroke"></i></div>
      </div>
      <div class="stat-card">
        <div class="stat-info">
          <p>Técnicos Activos</p>
          <strong>${tecnicos.length}</strong>
          <span style="font-size:11px;color:var(--text-muted);">En turno actual</span>
        </div>
        <div class="stat-icono naranja"><i class="fa-solid fa-users"></i></div>
      </div>
    </div>

    <!-- GRÁFICAS FILA 1 -->
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:20px;margin-bottom:20px;">

      <div class="card">
        <h3 style="font-size:14px;font-weight:700;margin-bottom:16px;">Tickets por Día de la Semana</h3>
        <canvas id="grafica-semana" width="420" height="200"></canvas>
        <div style="display:flex;justify-content:center;gap:20px;margin-top:12px;font-size:12px;">
          <span style="display:flex;align-items:center;gap:5px;"><span style="width:20px;height:2px;background:#3b82f6;display:inline-block;border-radius:2px;"></span>Creados</span>
          <span style="display:flex;align-items:center;gap:5px;"><span style="width:20px;height:2px;background:#10b981;display:inline-block;border-radius:2px;"></span>Cerrados</span>
          <span style="display:flex;align-items:center;gap:5px;"><span style="width:20px;height:2px;background:#f59e0b;display:inline-block;border-radius:2px;"></span>En Proceso</span>
        </div>
      </div>

      <div class="card">
        <h3 style="font-size:14px;font-weight:700;margin-bottom:16px;">Distribución por Prioridad</h3>
        <div style="display:flex;align-items:center;justify-content:center;gap:32px;">
          <canvas id="grafica-prioridad-rep" width="180" height="180"></canvas>
          <div style="display:flex;flex-direction:column;gap:10px;font-size:12px;">
            <div style="display:flex;align-items:center;gap:8px;">
              <div style="width:12px;height:12px;border-radius:50%;background:#10b981;"></div>
              <span style="color:#10b981;font-weight:600;">Baja: ${TICKETS.filter(t=>t.prioridad==="baja").length} (${Math.round(TICKETS.filter(t=>t.prioridad==="baja").length/TICKETS.length*100)}%)</span>
            </div>
            <div style="display:flex;align-items:center;gap:8px;">
              <div style="width:12px;height:12px;border-radius:50%;background:#f59e0b;"></div>
              <span style="color:#f59e0b;font-weight:600;">Media: ${TICKETS.filter(t=>t.prioridad==="media").length} (${Math.round(TICKETS.filter(t=>t.prioridad==="media").length/TICKETS.length*100)}%)</span>
            </div>
            <div style="display:flex;align-items:center;gap:8px;">
              <div style="width:12px;height:12px;border-radius:50%;background:#8b5cf6;"></div>
              <span style="color:#8b5cf6;font-weight:600;">Alta: ${TICKETS.filter(t=>t.prioridad==="alta").length} (${Math.round(TICKETS.filter(t=>t.prioridad==="alta").length/TICKETS.length*100)}%)</span>
            </div>
            <div style="display:flex;align-items:center;gap:8px;">
              <div style="width:12px;height:12px;border-radius:50%;background:#ef4444;"></div>
              <span style="color:#ef4444;font-weight:600;">Inmediata: ${TICKETS.filter(t=>t.prioridad==="inmediata").length} (${Math.round(TICKETS.filter(t=>t.prioridad==="inmediata").length/TICKETS.length*100)}%)</span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- DESEMPEÑO TÉCNICOS -->
    <div class="card" style="margin-bottom:20px;">
      <h3 style="font-size:14px;font-weight:700;margin-bottom:16px;">Desempeño de Técnicos (Mes Actual)</h3>
      <canvas id="grafica-tecnicos" width="860" height="200"></canvas>
    </div>

    <!-- GRÁFICAS FILA 2 -->
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:20px;">

      <div class="card">
        <h3 style="font-size:14px;font-weight:700;margin-bottom:16px;">Tickets por Departamento</h3>
        <canvas id="grafica-deptos" width="380" height="220"></canvas>
      </div>

      <div class="card">
        <h3 style="font-size:14px;font-weight:700;margin-bottom:16px;">Tiempo de Resolución</h3>
        <canvas id="grafica-tiempo" width="380" height="220"></canvas>
      </div>

    </div>
  `;

  // Dibujar todas las gráficas
  dibujarLineas();
  dibujarTorta("grafica-prioridad-rep", [
    { valor: TICKETS.filter(t=>t.prioridad==="baja").length,      color: "#10b981" },
    { valor: TICKETS.filter(t=>t.prioridad==="media").length,     color: "#f59e0b" },
    { valor: TICKETS.filter(t=>t.prioridad==="alta").length,      color: "#8b5cf6" },
    { valor: TICKETS.filter(t=>t.prioridad==="inmediata").length, color: "#ef4444" },
  ]);
  dibujarBarrasTecnicos();
  dibujarBarrasDeptos();
  dibujarBarrasTiempo();
}

// ── Gráfica de líneas: tickets por día de la semana ──
function dibujarLineas() {
  let canvas = document.getElementById("grafica-semana");
  if (!canvas) return;
  let ctx = canvas.getContext("2d");
  let W = canvas.width, H = canvas.height;
  let dias = ["Lun","Mar","Mié","Jue","Vie","Sáb","Dom"];

  // Datos simulados basados en tickets reales + variación visual
  let base = Math.max(1, Math.floor(TICKETS.length / 7));
  let creados   = [base+3, base+4, base+3, base+5, base+2, base+1, base];
  let cerrados  = [base+2, base+3, base+2, base+4, base+2, base,   base];
  let enProceso = [base,   base+1, base+1, base+2, base+1, base,   base];

  let padL=40, padR=20, padT=20, padB=40;
  let gW = W-padL-padR, gH = H-padT-padB;
  let maxVal = Math.max(...creados,...cerrados,...enProceso) + 2;
  let stepX = gW/(dias.length-1);

  ctx.clearRect(0,0,W,H);

  // Grid lines
  ctx.strokeStyle = "#e2e8f0";
  ctx.lineWidth = 1;
  for (let i=0; i<=4; i++) {
    let y = padT + (gH/4)*i;
    ctx.beginPath();
    ctx.moveTo(padL, y);
    ctx.lineTo(W-padR, y);
    ctx.stroke();
    ctx.fillStyle = "#8b949e";
    ctx.font = "10px Inter, sans-serif";
    ctx.textAlign = "right";
    ctx.fillText(Math.round(maxVal - (maxVal/4)*i), padL-6, y+4);
  }

  // Etiquetas X
  ctx.fillStyle = "#8b949e";
  ctx.font = "11px Inter, sans-serif";
  ctx.textAlign = "center";
  dias.forEach((d,i) => {
    ctx.fillText(d, padL + i*stepX, H-padB+16);
  });

  // Función para dibujar línea con puntos
  function dibujarLinea(datos, color) {
    let puntos = datos.map((v,i) => ({
      x: padL + i*stepX,
      y: padT + gH - (v/maxVal)*gH
    }));

    // Línea
    ctx.beginPath();
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.lineJoin = "round";
    puntos.forEach((p,i) => i===0 ? ctx.moveTo(p.x,p.y) : ctx.lineTo(p.x,p.y));
    ctx.stroke();

    // Puntos
    puntos.forEach(p => {
      ctx.beginPath();
      ctx.arc(p.x, p.y, 4, 0, Math.PI*2);
      ctx.fillStyle = color;
      ctx.fill();
      ctx.strokeStyle = "#fff";
      ctx.lineWidth = 2;
      ctx.stroke();
    });
  }

  dibujarLinea(creados,   "#3b82f6");
  dibujarLinea(cerrados,  "#10b981");
  dibujarLinea(enProceso, "#f59e0b");
}

// ── Barras verticales: desempeño técnicos ──
function dibujarBarrasTecnicos() {
  let canvas = document.getElementById("grafica-tecnicos");
  if (!canvas) return;
  let ctx = canvas.getContext("2d");
  let W = canvas.width, H = canvas.height;
  let tecnicos = USUARIOS.filter(u => u.rol === "tecnico");

  let datos = tecnicos.map(u => ({
    nombre: u.nombre.split(" ")[0] + " " + (u.nombre.split(" ")[1]?.[0]||"") + ".",
    valor:  TICKETS.filter(t => t.tecnico === u.nombre && t.estado === "CERRADO").length || Math.floor(Math.random()*15)+10
  }));

  let padL=40, padR=20, padT=20, padB=40;
  let gW = W-padL-padR, gH = H-padT-padB;
  let maxVal = Math.max(...datos.map(d=>d.valor)) + 4;
  let barW = (gW/datos.length) * 0.5;
  let stepX = gW/datos.length;

  ctx.clearRect(0,0,W,H);

  // Grid
  ctx.strokeStyle = "#e2e8f0";
  ctx.lineWidth = 1;
  for (let i=0; i<=4; i++) {
    let y = padT + (gH/4)*i;
    ctx.beginPath();
    ctx.moveTo(padL, y);
    ctx.lineTo(W-padR, y);
    ctx.stroke();
    ctx.fillStyle = "#8b949e";
    ctx.font = "10px Inter, sans-serif";
    ctx.textAlign = "right";
    ctx.fillText(Math.round(maxVal - (maxVal/4)*i), padL-4, y+4);
  }

  // Barras
  datos.forEach((d, i) => {
    let x    = padL + i*stepX + (stepX-barW)/2;
    let barH = (d.valor/maxVal)*gH;
    let y    = padT + gH - barH;

    // Barra con esquinas redondeadas arriba
    ctx.fillStyle = "#10b981";
    ctx.beginPath();
    ctx.roundRect(x, y, barW, barH, [4, 4, 0, 0]);
    ctx.fill();

    // Nombre
    ctx.fillStyle = "#8b949e";
    ctx.font = "11px Inter, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(d.nombre, x + barW/2, H-padB+16);
  });

  // Leyenda
  ctx.fillStyle = "#10b981";
  ctx.fillRect(padL, H-8, 12, 4);
  ctx.fillStyle = "#8b949e";
  ctx.font = "11px Inter, sans-serif";
  ctx.textAlign = "left";
  ctx.fillText("Tickets Cerrados", padL+16, H-4);
}

// ── Barras horizontales: tickets por departamento ──
function dibujarBarrasDeptos() {
  let canvas = document.getElementById("grafica-deptos");
  if (!canvas) return;
  let ctx = canvas.getContext("2d");
  let W = canvas.width, H = canvas.height;

  let deptos = [
    "Operaciones de Red","Servicios de Email","Despliegue de Software",
    "Soporte de Hardware","Seguridad de Red","Gestión de Cuentas"
  ];
  let etiquetas = ["Op. Red","Email","Software","Hardware","Seguridad","Cuentas"];
  let datos = deptos.map(d => TICKETS.filter(t=>t.departamento===d).length);

  let padL=70, padR=20, padT=10, padB=20;
  let gW = W-padL-padR, gH = H-padT-padB;
  let maxVal = Math.max(...datos) + 2;
  let barH   = (gH/datos.length)*0.55;
  let stepY  = gH/datos.length;

  ctx.clearRect(0,0,W,H);

  // Grid vertical
  ctx.strokeStyle = "#e2e8f0";
  ctx.lineWidth = 1;
  for (let i=0; i<=4; i++) {
    let x = padL + (gW/4)*i;
    ctx.beginPath();
    ctx.moveTo(x, padT);
    ctx.lineTo(x, H-padB);
    ctx.stroke();
    ctx.fillStyle = "#8b949e";
    ctx.font = "10px Inter, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(Math.round((maxVal/4)*i), x, H-padB+14);
  }

  datos.forEach((v, i) => {
    let y    = padT + i*stepY + (stepY-barH)/2;
    let barW = (v/maxVal)*gW;

    ctx.fillStyle = "#3b82f6";
    ctx.beginPath();
    ctx.roundRect(padL, y, barW, barH, [0, 4, 4, 0]);
    ctx.fill();

    // Etiqueta
    ctx.fillStyle = "#1a202c";
    ctx.font = "11px Inter, sans-serif";
    ctx.textAlign = "right";
    ctx.fillText(etiquetas[i], padL-6, y+barH/2+4);
  });
}

// ── Barras verticales: tiempo de resolución ──
function dibujarBarrasTiempo() {
  let canvas = document.getElementById("grafica-tiempo");
  if (!canvas) return;
  let ctx = canvas.getContext("2d");
  let W = canvas.width, H = canvas.height;

  let rangos = ["< 1h","1-2h","2-4h","4-8h","> 8h"];
  let datos  = [18, 24, 14, 12, 7]; // datos representativos

  let padL=40, padR=20, padT=20, padB=40;
  let gW = W-padL-padR, gH = H-padT-padB;
  let maxVal = Math.max(...datos) + 4;
  let barW   = (gW/rangos.length)*0.55;
  let stepX  = gW/rangos.length;

  ctx.clearRect(0,0,W,H);

  // Grid
  ctx.strokeStyle = "#e2e8f0";
  ctx.lineWidth = 1;
  for (let i=0; i<=4; i++) {
    let y = padT + (gH/4)*i;
    ctx.beginPath();
    ctx.moveTo(padL, y);
    ctx.lineTo(W-padR, y);
    ctx.stroke();
    ctx.fillStyle = "#8b949e";
    ctx.font = "10px Inter, sans-serif";
    ctx.textAlign = "right";
    ctx.fillText(Math.round(maxVal-(maxVal/4)*i), padL-4, y+4);
  }

  datos.forEach((v, i) => {
    let x    = padL + i*stepX + (stepX-barW)/2;
    let barH = (v/maxVal)*gH;
    let y    = padT + gH - barH;

    ctx.fillStyle = "#8b5cf6";
    ctx.beginPath();
    ctx.roundRect(x, y, barW, barH, [4, 4, 0, 0]);
    ctx.fill();

    ctx.fillStyle = "#8b949e";
    ctx.font = "11px Inter, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(rangos[i], x+barW/2, H-padB+16);
  });
}
// ══════════════════════════════════
// DETALLE DEL TICKET
// ══════════════════════════════════
function verTicket(id) {
  ticketActual   = TICKETS.find(t => t.id === id);
  paginaAnterior = document.querySelector(".nav-item.activo")?.dataset.pagina || "dashboard";
  if (!ticketActual) return;

  navegarA("detalle");

  let rol        = getRolEfectivo();
  let esAsignado = ticketActual.tecnico === usuarioActual.nombre;

  document.getElementById("pagina-detalle").innerHTML = `
    <div class="detalle-volver" onclick="volverDesdeDetalle()">
      <i class="fa-solid fa-arrow-left"></i> Volver
    </div>
    <div class="detalle-titulo-area">
      <h2>Ticket #${ticketActual.id} ${badgePrioridad(ticketActual.prioridad)}</h2>
      <p style="color:var(--text-muted);font-size:14px;">${ticketActual.titulo}</p>
    </div>
    <div class="card" style="margin-bottom:20px;">
      <h3 style="font-size:14px;font-weight:700;margin-bottom:16px;">Estado del Ticket</h3>
      ${renderProgreso(ticketActual.estado)}
    </div>
    <div class="detalle-layout">
      <div>
        <div class="card" style="margin-bottom:16px;">
          <h3 style="font-size:14px;font-weight:700;margin-bottom:16px;">Información del Ticket</h3>
          <div class="detalle-info-grid" style="margin-bottom:16px;">
            <div class="detalle-info-item">
              <label><i class="fa-solid fa-building"></i> Departamento</label>
              <span>${ticketActual.departamento}</span>
            </div>
            <div class="detalle-info-item">
              <label><i class="fa-solid fa-user"></i> Técnico Asignado</label>
              <span>${ticketActual.tecnico || "Sin asignar"}</span>
            </div>
            <div class="detalle-info-item">
              <label><i class="fa-solid fa-calendar"></i> Fecha de Creación</label>
              <span>${formatearFecha(ticketActual.creadoEn)}</span>
            </div>
            <div class="detalle-info-item">
              <label><i class="fa-solid fa-clock"></i> Tiempo Transcurrido</label>
              <span>${tiempoTranscurrido(ticketActual.creadoEn)}</span>
            </div>
          </div>
          <label style="font-size:12px;font-weight:600;color:var(--text-muted);display:block;margin-bottom:6px;">DESCRIPCIÓN</label>
          <p style="font-size:14px;line-height:1.6;">${ticketActual.descripcion}</p>
        </div>
        <div class="card">
          <h3 style="font-size:14px;font-weight:700;margin-bottom:16px;">Historial de Acciones</h3>
          ${ticketActual.historial.map(h=>`
            <div class="historial-item">
              <div class="historial-punto"></div>
              <div class="historial-contenido">
                <strong>${h.accion}</strong>
                <span>${h.usuario} · ${formatearFecha(h.fecha)}</span>
                <p>${h.detalle}</p>
              </div>
            </div>
          `).join("")}
        </div>
      </div>
      <div>${renderAccionesPorRol(ticketActual, rol, esAsignado)}</div>
    </div>
  `;
}

function volverDesdeDetalle() {
  navegarA(paginaAnterior);
  cargarPagina(paginaAnterior);
}

  // ── ADMIN: asignar + anular ──
// ── ADMIN: asignar + editar + anular ──
function renderAccionesPorRol(ticket, rol, esAsignado) {
  let html = "";

  // Ticket anulado
  if (ticket.estado === "ANULADO") {
    return `<div class="card" style="background:#fff1f2;border-color:#fecdd3;text-align:center;padding:24px;">
      <i class="fa-solid fa-ban" style="font-size:28px;color:#ef4444;margin-bottom:8px;display:block;"></i>
      <h3 style="color:#991b1b;font-size:14px;font-weight:700;">Ticket Anulado</h3>
      <p style="font-size:12px;color:#9f1239;margin-top:6px;">Este ticket fue anulado y no puede modificarse.</p>
    </div>`;
  }

  // ── ADMIN: asignar + editar + anular ──
  if (usuarioActual.rol === "admin") {

    if (ticket.estado === "CREADO") {
      html += `
        <div class="card" style="margin-bottom:16px;">
          <h3 style="font-size:14px;font-weight:700;margin-bottom:14px;">Asignar Técnico</h3>
          <div class="campo">
            <select id="select-asignar">
              <option value="">Seleccionar técnico...</option>
              ${USUARIOS.filter(u => u.rol === "tecnico" || u.rol === "recepcionista")
                .map(u => `<option value="${u.nombre}">${u.nombre} — ${u.cargo}</option>`).join("")}
            </select>
          </div>
          <button class="btn-primary" onclick="asignarTecnico()">
            <i class="fa-solid fa-user-check"></i> Asignar
          </button>
        </div>
      `;
    }

    if (ticket.estado !== "CERRADO" && ticket.estado !== "ANULADO") {
      html += `
        <div class="card" style="margin-bottom:16px;background:#eff6ff;border-color:#bfdbfe;">
          <h3 style="font-size:14px;font-weight:700;margin-bottom:10px;color:#1e40af;">
            <i class="fa-solid fa-pen-to-square" style="margin-right:6px;"></i>Editar Ticket
          </h3>
          <p style="font-size:12px;color:#3b82f6;margin-bottom:12px;">
            Corrige errores sin necesidad de anular el ticket.
          </p>
          <button class="btn-primary" style="width:100%;" onclick="abrirModalEditarTicket('${ticket.id}')">
            <i class="fa-solid fa-pen"></i> Editar Ticket
          </button>
        </div>

        <div class="card" style="background:#fff1f2;border-color:#fecdd3;">
          <h3 style="font-size:14px;font-weight:700;margin-bottom:10px;color:#991b1b;">
            <i class="fa-solid fa-ban" style="margin-right:6px;"></i>Zona de Administrador
          </h3>
          <button class="btn-danger" style="width:100%;" onclick="anularTicket()">
            <i class="fa-solid fa-ban"></i> Anular Ticket
          </button>
        </div>
      `;
    }
  }

  // ── RECEPCIONISTA: asignar si está creado ──
  if (rol === "recepcionista" && ticket.estado === "CREADO") {
    html += `
      <div class="card" style="margin-bottom:16px;">
        <h3 style="font-size:14px;font-weight:700;margin-bottom:14px;">Asignar Técnico</h3>
        <div class="campo">
          <select id="select-asignar">
            <option value="">Seleccionar...</option>
            <option value="${usuarioActual.nombre}">👤 Yo mismo (${usuarioActual.nombre})</option>
            ${USUARIOS.filter(u => u.rol === "tecnico")
              .map(u => `<option value="${u.nombre}">${u.nombre} — ${u.cargo}</option>`).join("")}
          </select>
        </div>
        <button class="btn-primary" onclick="asignarTecnico()">
          <i class="fa-solid fa-user-check"></i> Asignar
        </button>
      </div>
    `;
  }

  // ── USUARIO ASIGNADO: iniciar proceso ──
  if (esAsignado && ticket.estado === "ASIGNADO") {
    html += `
      <div class="card" style="margin-bottom:16px;">
        <button class="btn-primary" style="width:100%;" onclick="iniciarProceso()">
          <i class="fa-solid fa-play"></i> Iniciar Proceso
        </button>
      </div>
    `;
  }

  // ── USUARIO ASIGNADO: cerrar ticket ──
  if (esAsignado && ticket.estado === "EN_PROCESO") {
    html += `
      <div class="card">
        <h3 style="font-size:14px;font-weight:700;margin-bottom:12px;">Cerrar Ticket</h3>

        <button class="btn-secondary" style="width:100%;margin-bottom:12px;" onclick="abrirModalSoluciones()">
          <i class="fa-solid fa-magnifying-glass"></i> Buscar Soluciones
        </button>

        <div class="campo">
          <label>Informe del Técnico <span class="requerido">*</span></label>
          <textarea id="input-informe"
            placeholder="Describa las acciones realizadas y la solución aplicada..."
            style="min-height:120px;"></textarea>
        </div>

        <div class="campo">
          <label>Adjuntar PDF Firmado</label>
          <input type="file" id="input-pdf" accept=".pdf"
            style="display:none;"
            onchange="mostrarPdfSeleccionado(this)" />

          <div class="upload-area" onclick="document.getElementById('input-pdf').click()">
            <i class="fa-solid fa-upload"></i>
            <p>Click para seleccionar PDF</p>
            <small>Solo archivos .pdf</small>
          </div>

          <div id="pdf-seleccionado" style="display:none; margin-top:8px; padding:8px 12px; background:#d1fae5; border-radius:8px; font-size:12px; color:#065f46; display:flex; align-items:center; gap:8px;">
            <i class="fa-solid fa-file-pdf" style="color:#10b981;"></i>
            <span id="pdf-nombre"></span>
            <button onclick="quitarPdf()" style="margin-left:auto;background:none;border:none;color:#065f46;cursor:pointer;font-size:14px;">✕</button>
          </div>
        </div>

        <div id="error-cierre" style="color:var(--danger);font-size:12px;margin-bottom:8px;"></div>

        <button class="btn-success" style="width:100%;" onclick="cerrarTicket()">
          <i class="fa-solid fa-circle-check"></i> Cerrar Ticket
        </button>
      </div>
    `;
  }

  // ── TÉCNICO NO ASIGNADO ──
  if (rol === "tecnico" && !esAsignado && ticket.tecnico && ticket.estado !== "CERRADO") {
    html += renderAccesoRestringido(ticket);
  }

  // ── RECEPCIONISTA (solo vista) ──
  if (rol === "recepcionista" && !esAsignado && ticket.tecnico &&
      ticket.estado !== "CERRADO" && ticket.estado !== "CREADO") {
    html += `
      <div class="card" style="background:#fffbeb;border-color:#fde68a;text-align:center;padding:24px;">
        <div style="width:48px;height:48px;background:#fef3c7;border-radius:50%;display:flex;align-items:center;justify-content:center;margin:0 auto 12px;">
          <i class="fa-solid fa-eye" style="color:#d97706;font-size:20px;"></i>
        </div>
        <h3 style="font-size:14px;font-weight:700;color:#92400e;margin-bottom:6px;">Solo Vista</h3>
        <p style="font-size:12px;color:#b45309;">
          Este ticket está siendo atendido por <strong>${ticket.tecnico}</strong>.
        </p>
      </div>
    `;
  }

  // ── Ticket cerrado ──
  if (ticket.estado === "CERRADO" && ticket.informe) {
    html += `
      <div class="card">
        <h3 style="font-size:14px;font-weight:700;margin-bottom:12px;">
          <i class="fa-solid fa-file-lines" style="color:var(--success);margin-right:6px;"></i>
          Informe Técnico
        </h3>
        <p style="font-size:13px;line-height:1.6;color:var(--text-muted);">${ticket.informe}</p>
      </div>
    `;
  }

  return html || `<div class="card"><p style="color:var(--text-muted);font-size:13px;">No hay acciones disponibles.</p></div>`;
}

// ══════════════════════════════════
// ACCIONES
// ══════════════════════════════════
function tomarTicket(id) {
  let ticket = TICKETS.find(t => t.id === id);
  if (!ticket) return;
  ticket.tecnico = usuarioActual.nombre;
  ticket.estado  = "ASIGNADO";
  registrarHistorial(ticket, "Ticket tomado", "Tomado por " + usuarioActual.nombre, usuarioActual.nombre);
  toast("exito", "Ticket Tomado", `#${ticket.id} fue asignado a ti.`);
  cargarDashboard();
}

function atenderTicket(id) {
  let ticket = TICKETS.find(t => t.id === id);
  if (!ticket) return;
  ticket.estado = "EN_PROCESO";
  registrarHistorial(ticket, "Estado → EN PROCESO", "El técnico inició la atención", usuarioActual.nombre);
  toast("info", "Ticket en Proceso", `#${ticket.id} está siendo atendido.`);
  cargarDashboard();
}

function asignarTecnico() {
  let tecnico = document.getElementById("select-asignar").value;
  if (!tecnico) { alert("Selecciona un técnico."); return; }
  ticketActual.tecnico = tecnico;
  ticketActual.estado  = "ASIGNADO";
  registrarHistorial(ticketActual, "Ticket asignado", "Asignado a " + tecnico, usuarioActual.nombre);
  toast("exito", "Técnico Asignado", `Ticket asignado a ${tecnico} exitosamente.`);
  verTicket(ticketActual.id);
}

function iniciarProceso() {
  ticketActual.estado = "EN_PROCESO";
  registrarHistorial(ticketActual, "Estado → EN PROCESO", "El técnico inició el proceso", usuarioActual.nombre);
  toast("info", "En Proceso", `El ticket #${ticketActual.id} está en proceso.`);
  verTicket(ticketActual.id);
}

function cerrarTicket() {
  let informe = document.getElementById("input-informe").value;
  if (informe.trim().length < 10) {
    document.getElementById("error-cierre").textContent = "⚠ El informe es obligatorio.";
    return;
  }
  ticketActual.estado  = "CERRADO";
  ticketActual.informe = informe;
  registrarHistorial(ticketActual, "Ticket cerrado", "Informe técnico registrado", usuarioActual.nombre);
  toast("exito", "Ticket Cerrado", `#${ticketActual.id} cerrado con informe exitosamente.`);
  verTicket(ticketActual.id);
}

function anularTicket() {
  if (!confirm("¿Seguro que deseas anular este ticket? Esta acción no se puede deshacer.")) return;
  ticketActual.estado = "ANULADO";
  registrarHistorial(ticketActual, "Ticket anulado", "Anulado por el administrador", usuarioActual.nombre);
  toast("alerta", "Ticket Anulado", `#${ticketActual.id} fue anulado por el administrador.`);
  verTicket(ticketActual.id);
}

// ══════════════════════════════════
// MODALES
// ══════════════════════════════════
function abrirModalNuevo() {
  llenarSelectTecnicosConYoMismo("nuevo-tecnico");
  document.getElementById("nuevo-error").textContent = "";
  abrirModal("modal-nuevo");
}

function llenarSelectTecnicosConYoMismo(selectId) {
  let select = document.getElementById(selectId);
  if (!select) return;
  let rol = getRolEfectivo();
  select.innerHTML = '<option value="">Seleccione un técnico</option>';
  // Recepcionista puede asignarse a sí mismo
  if (rol === "recepcionista") {
    select.innerHTML += `<option value="${usuarioActual.nombre}">👤 Yo mismo (${usuarioActual.nombre})</option>`;
  }
  USUARIOS.filter(u => u.rol === "tecnico").forEach(u => {
    select.innerHTML += `<option value="${u.nombre}">${u.nombre} — ${u.cargo}</option>`;
  });
}

function abrirModalDelegar(id) {
  ticketActual = TICKETS.find(t => t.id === id);
  document.getElementById("modal-delegar-titulo").textContent = "Delegar Ticket #" + id;
  llenarSelectTecnicos("delegar-tecnico", ticketActual?.tecnico);
  document.getElementById("delegar-error").textContent = "";
  abrirModal("modal-delegar");
}

function abrirModalSoluciones() {
  renderSoluciones("");
  abrirModal("modal-soluciones");
}

function crearTicket() {
  let depto     = document.getElementById("nuevo-depto").value;
  let problema  = document.getElementById("nuevo-problema").value;
  let equipo    = document.getElementById("nuevo-equipo").value;
  let prioridad = document.getElementById("nuevo-prioridad").value;
  let tecnico   = document.getElementById("nuevo-tecnico").value;
  let errorDiv  = document.getElementById("nuevo-error");

  if (!depto || !problema || !equipo) {
    errorDiv.textContent = "⚠ Completa todos los campos obligatorios.";
    return;
  }

  let nuevoTicket = {
    id:           generarId(),
    estado:       tecnico ? "ASIGNADO" : "CREADO",
    prioridad,
    titulo:       problema.substring(0, 80),
    descripcion:  problema,
    departamento: depto,
    equipo,
    solicitante:  usuarioActual.nombre,
    tecnico:      tecnico || null,
    creadoEn:     ahora(),
    historial: [
      { accion: "Ticket creado", usuario: usuarioActual.nombre, detalle: "Ticket creado desde el portal", fecha: ahora() }
    ]
  };

  if (tecnico) registrarHistorial(nuevoTicket, "Ticket asignado", "Asignado a " + tecnico, usuarioActual.nombre);

  TICKETS.push(nuevoTicket);

  ["nuevo-depto","nuevo-problema","nuevo-equipo","nuevo-tecnico"].forEach(id => {
    document.getElementById(id).value = "";
  });
  document.getElementById("nuevo-prioridad").value = "media";

  cerrarModal("modal-nuevo");
  toast("exito", "Ticket Creado", `El ticket fue creado exitosamente.`);
  cargarDashboard();
}

function confirmarDelegar() {
  let tecnico  = document.getElementById("delegar-tecnico").value;
  let motivo   = document.getElementById("delegar-motivo").value;
  let errorDiv = document.getElementById("delegar-error");

  if (!tecnico || !motivo.trim()) {
    errorDiv.textContent = "⚠ Completa todos los campos.";
    return;
  }

  ticketActual.tecnico = tecnico;
  ticketActual.estado  = "ASIGNADO";
  registrarHistorial(ticketActual, "Ticket delegado", "Delegado a " + tecnico + ". Motivo: " + motivo, usuarioActual.nombre);

  document.getElementById("delegar-motivo").value = "";
  toast("info", "Ticket Delegado", `Ticket delegado a ${tecnico} exitosamente.`);
  cerrarModal("modal-delegar");
  cargarPagina(document.querySelector(".nav-item.activo")?.dataset.pagina || "dashboard");
}
function mostrarPdfSeleccionado(input) {
  if (input.files && input.files[0]) {
    let nombre = input.files[0].name;
    document.getElementById("pdf-nombre").textContent = nombre;
    document.getElementById("pdf-seleccionado").style.display = "flex";
    document.querySelector(".upload-area").style.borderColor = "#10b981";
    toast("info", "PDF Seleccionado", `Archivo: ${nombre}`);
  }
}

function quitarPdf() {
  document.getElementById("input-pdf").value = "";
  document.getElementById("pdf-seleccionado").style.display = "none";
  document.querySelector(".upload-area").style.borderColor = "";
}
// ══════════════════════════════════
// APUNTES
// ══════════════════════════════════

function getApuntesUsuario() {
  if (!APUNTES[usuarioActual.id]) APUNTES[usuarioActual.id] = [];
  return APUNTES[usuarioActual.id];
}

function abrirModalApuntes() {
  document.getElementById("apunte-titulo").value       = "";
  document.getElementById("apunte-desc").value         = "";
  document.getElementById("apunte-prioridad").value    = "normal";
  document.getElementById("apunte-error").textContent  = "";

  // Llenar destinatarios si es admin
  let selectDest = document.getElementById("apunte-destinatario");
  let campoDest  = document.getElementById("campo-destinatario");
  selectDest.innerHTML = '<option value="yo">Solo para mí</option>';

  if (usuarioActual.rol === "admin") {
    campoDest.style.display = "block";
    USUARIOS.filter(u => u.rol === "tecnico" || u.rol === "recepcionista").forEach(u => {
      selectDest.innerHTML += `<option value="${u.id}">→ ${u.nombre} (${u.cargo})</option>`;
    });
  } else {
    campoDest.style.display = "none";
  }

  abrirModal("modal-apuntes");
}

function guardarApunte() {
  let titulo       = document.getElementById("apunte-titulo").value.trim();
  let desc         = document.getElementById("apunte-desc").value.trim();
  let prioridad    = document.getElementById("apunte-prioridad").value;
  let destinatario = document.getElementById("apunte-destinatario").value;
  let errorDiv     = document.getElementById("apunte-error");

  if (!titulo) {
    errorDiv.textContent = "⚠ El título es obligatorio.";
    return;
  }

  let ahora = new Date();
  let apunte = {
    id:        Date.now(),
    titulo,
    desc,
    prioridad,
    realizado: false,
    hora:      ahora.toLocaleTimeString("es", { hour: "2-digit", minute: "2-digit" }),
    fecha:     ahora.toLocaleDateString("es"),
    deAdmin:   false,
    autorNombre: usuarioActual.nombre,
  };

  // 🔹 APUNTE PERSONAL
  if (destinatario === "yo" || usuarioActual.rol !== "admin") {
    if (!APUNTES[usuarioActual.id]) APUNTES[usuarioActual.id] = [];
    APUNTES[usuarioActual.id].unshift(apunte);

    toast("exito", "Apunte guardado", `"${titulo}" agregado a tus recordatorios.`);
  } 
  
  // 🔹 APUNTE PARA OTRO TÉCNICO
  else {
    let tecnicoId = parseInt(destinatario);

    // ✅ Buscar técnico ANTES de usarlo
    let tecnico = USUARIOS.find(u => u.id === tecnicoId);

    // ✅ Validación PRO
    if (!tecnico) {
      console.error("Técnico no encontrado");
      errorDiv.textContent = "Error: técnico no válido.";
      return;
    }

    if (!APUNTES[tecnicoId]) APUNTES[tecnicoId] = [];

    apunte.deAdmin      = true;
    apunte.autorNombre  = "Administrador";
    apunte.leido        = false;
    apunte.leidoEn      = null;
    apunte.realizado    = false;
    apunte.realizadoEn  = null;
    apunte.eliminado    = false;

    // Guardar en el técnico
    APUNTES[tecnicoId].unshift(apunte);

    // Guardar historial del admin
    let adminId = usuarioActual.id;
    if (!window.APUNTES_ENVIADOS) window.APUNTES_ENVIADOS = {};
    if (!APUNTES_ENVIADOS[adminId]) APUNTES_ENVIADOS[adminId] = [];

    APUNTES_ENVIADOS[adminId].unshift({
      apunteId: apunte.id,
      tecnicoId: tecnicoId,
      tecnicoNombre: tecnico.nombre,
      titulo: apunte.titulo,
      desc: apunte.desc,
      prioridad: apunte.prioridad,
      hora: apunte.hora,
      fecha: apunte.fecha,
      ref: apunte,
    });

    toast("exito", "Apunte enviado", `Nota enviada a ${tecnico.nombre}.`);
  }

  cerrarModal("modal-apuntes");
  renderApuntesDashboard();
}

function marcarApunteLeido(id) {
  let apuntes = getApuntesUsuario();
  let apunte  = apuntes.find(a => a.id === id);
  if (!apunte) return;

  apunte.leido   = true;
  apunte.leidoEn = new Date().toLocaleTimeString("es", { hour: "2-digit", minute: "2-digit" })
                 + " · " + new Date().toLocaleDateString("es");

  toast("info", "Apunte leído", "Confirmaste la lectura de esta nota.");
  renderApuntesDashboard();
}

function eliminarApunte(id) {
  let apuntes = getApuntesUsuario();
  let apunte  = apuntes.find(a => a.id === id);
  if (!apunte) return;

  // BLOQUEO: debe estar realizado primero
  if (!apunte.realizado) {
    toast("error", "Acción no permitida", "Primero debes marcar el apunte como realizado.");
    return;
  }

  if (apunte.deAdmin) {
    // Nota del admin → marcar como eliminada pero mantener historial
    apunte.eliminado   = true;
    apunte.eliminadoEn = new Date().toLocaleTimeString("es", { hour:"2-digit", minute:"2-digit" })
                       + " · " + new Date().toLocaleDateString("es");

    // Quitar del panel del técnico
    APUNTES[usuarioActual.id] = apuntes.filter(a => a.id !== id);

  } else {
    // Apunte propio → eliminar normalmente
    APUNTES[usuarioActual.id] = apuntes.filter(a => a.id !== id);
  }

  toast("alerta", "Apunte eliminado", "El recordatorio fue eliminado.");
  renderApuntesDashboard();
}

function toggleRealizadoApunte(id) {
  let apuntes = getApuntesUsuario();
  let apunte  = apuntes.find(a => a.id === id);
  if (!apunte) return;

  apunte.realizado = !apunte.realizado;
  apunte.realizadoEn = apunte.realizado
    ? new Date().toLocaleTimeString("es", { hour:"2-digit", minute:"2-digit" })
      + " · " + new Date().toLocaleDateString("es")
    : null;

  if (apunte.realizado) {
    toast("exito", "¡Tarea completada!", `"${apunte.titulo}" marcada como realizada.`);
  } else {
    toast("info", "Tarea pendiente", `"${apunte.titulo}" marcada como pendiente.`);
  }

  renderApuntesDashboard();
}

function renderApuntesDashboard() {
  let lista = document.getElementById("apuntes-lista-dashboard");
  if (!lista) return;

  let apuntes = getApuntesUsuario();

  // ── Si es admin, agregar sección de notas enviadas ──
  let seccionEnviadas = "";
  if (usuarioActual.rol === "admin") {
  let enviadas = APUNTES_ENVIADOS[usuarioActual.id] || [];

  if (enviadas.length > 0) {

    // Contar estados
    let noVistas   = enviadas.filter(a => !a.ref.leido).length;
    let realizadas = enviadas.filter(a => a.ref.realizado).length;
    let eliminadas = enviadas.filter(a => a.ref.eliminado).length;

    seccionEnviadas = `
      <div style="padding:8px 8px 4px 8px;">

        <!-- Resumen -->
        <div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:10px;">
          <span style="font-size:10px;font-weight:700;color:var(--text-muted);
            text-transform:uppercase;letter-spacing:0.5px;width:100%;margin-bottom:2px;">
            <i class="fa-solid fa-paper-plane" style="margin-right:4px;"></i>
            Notas enviadas a técnicos
          </span>
          <span style="background:#fee2e2;color:#991b1b;font-size:10px;font-weight:700;
            padding:2px 8px;border-radius:99px;">
            ${noVistas} sin leer
          </span>
          <span style="background:#d1fae5;color:#065f46;font-size:10px;font-weight:700;
            padding:2px 8px;border-radius:99px;">
            ${realizadas} realizadas
          </span>
          <span style="background:#f3f4f6;color:#6b7280;font-size:10px;font-weight:700;
            padding:2px 8px;border-radius:99px;">
            ${eliminadas} eliminadas
          </span>
        </div>

        <!-- Lista de notas enviadas -->
        ${enviadas.map(a => `
          <div style="background:var(--bg);border-radius:8px;padding:8px 10px;
            margin-bottom:6px;border-left:3px solid ${
              a.ref.eliminado ? '#9ca3af' :
              a.ref.realizado ? '#10b981' :
              a.ref.leido     ? '#3b82f6' : '#ef4444'
            };opacity:${a.ref.eliminado ? '0.6' : '1'};">

            <!-- Fila superior: destinatario + estado -->
            <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:6px;">
              <div style="flex:1;min-width:0;">
                <div style="font-size:10px;font-weight:700;color:var(--text-muted);margin-bottom:2px;">
                  <i class="fa-solid fa-user" style="margin-right:3px;"></i>${a.tecnicoNombre}
                </div>
                <div style="font-size:12px;font-weight:600;color:var(--text);">${a.titulo}</div>
                ${a.desc ? `<div style="font-size:11px;color:var(--text-muted);margin-top:1px;">${a.desc}</div>` : ""}
              </div>
              <div style="flex-shrink:0;text-align:right;display:flex;flex-direction:column;gap:2px;">
                ${a.ref.eliminado
                  ? `<span class="apunte-leido-badge" style="background:#f3f4f6;color:#6b7280;">
                      <i class="fa-solid fa-trash"></i> Eliminado
                     </span>
                     <span style="font-size:10px;color:var(--text-muted);">${a.ref.eliminadoEn || ""}</span>`
                  : a.ref.realizado
                    ? `<span class="apunte-leido-badge visto">
                        <i class="fa-solid fa-circle-check"></i> Realizado
                       </span>
                       <span style="font-size:10px;color:var(--text-muted);">${a.ref.realizadoEn || ""}</span>`
                    : a.ref.leido
                      ? `<span class="apunte-leido-badge visto">
                          <i class="fa-solid fa-eye"></i> Visto
                         </span>
                         <span style="font-size:10px;color:var(--text-muted);">${a.ref.leidoEn || ""}</span>`
                      : `<span class="apunte-leido-badge no-visto">
                          <i class="fa-solid fa-eye-slash"></i> No visto
                         </span>`
                }
              </div>
            </div>

            <!-- Fila inferior: fecha + botón eliminar del admin -->
            <div style="display:flex;justify-content:space-between;align-items:center;margin-top:6px;">
              <span style="font-size:10px;color:var(--text-muted);">
                <i class="fa-solid fa-clock" style="margin-right:3px;opacity:.6;"></i>${a.hora} · ${a.fecha}
              </span>
              <button class="apunte-btn eliminar-btn"
                onclick="eliminarApunteAdmin(${a.apunteId})"
                style="font-size:10px;padding:2px 7px;">
                <i class="fa-solid fa-trash"></i>
              </button>
            </div>

          </div>
        `).join("")}
      </div>

      <div style="border-top:1px solid var(--border);margin:4px 8px;"></div>
      <div style="padding:4px 8px 0 8px;">
        <div style="font-size:11px;font-weight:700;color:var(--text-muted);
          text-transform:uppercase;letter-spacing:0.5px;margin-bottom:6px;">
          <i class="fa-solid fa-note-sticky" style="margin-right:4px;"></i>
          Mis apuntes personales
        </div>
      </div>
    `;
  }
}

  // ── Lista de apuntes propios ──
  let apuntesHTML = "";
  if (apuntes.length === 0) {
    apuntesHTML = `
      <div class="apuntes-vacio">
        <i class="fa-solid fa-note-sticky"></i>
        Sin apuntes aún
      </div>
    `;
  } else {
    apuntesHTML = apuntes.map(a => `
      <div class="apunte-item ${a.prioridad} ${a.realizado ? 'realizado' : ''}" id="apunte-${a.id}">

        ${a.deAdmin ? `
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;">
            <span style="font-size:10px;font-weight:700;color:#ef4444;display:flex;align-items:center;gap:4px;">
              <i class="fa-solid fa-user-shield"></i> Nota del Administrador
            </span>
            ${a.leido
              ? `<span class="apunte-leido-badge visto">
                  <i class="fa-solid fa-eye"></i> Visto
                 </span>`
              : `<span class="apunte-leido-badge no-visto">
                  <i class="fa-solid fa-eye-slash"></i> No visto
                 </span>`
            }
          </div>
        ` : ""}

        <div class="apunte-fila-superior">
          <div class="apunte-check ${a.realizado ? 'marcado' : ''}"
               onclick="toggleRealizadoApunte(${a.id})">
            ${a.realizado ? '<i class="fa-solid fa-check"></i>' : ''}
          </div>
          <div class="apunte-contenido">
            <div class="apunte-titulo-text ${a.realizado ? 'tachado' : ''}">${a.titulo}</div>
            ${a.desc ? `<div class="apunte-desc-text">${a.desc}</div>` : ""}
          </div>
        </div>

        <div class="apunte-fila-inferior">
          <span class="apunte-hora">
            <i class="fa-solid fa-clock" style="margin-right:3px;opacity:.6;"></i>${a.hora} · ${a.fecha}
          </span>
          <div class="apunte-acciones">

            ${a.deAdmin && !a.leido && usuarioActual.rol !== "admin" ? `
              <button class="apunte-btn leer-btn" onclick="marcarApunteLeido(${a.id})">
                <i class="fa-solid fa-eye"></i> Leído
              </button>
            ` : ""}

            ${!a.realizado
              ? `<button class="apunte-btn realizado-btn" onclick="toggleRealizadoApunte(${a.id})">
                  <i class="fa-solid fa-circle-check"></i> Listo
                 </button>`
              : `<button class="apunte-btn pendiente-btn" onclick="toggleRealizadoApunte(${a.id})">
                  <i class="fa-solid fa-rotate-left"></i> Pendiente
                 </button>`
            }

            <button class="apunte-btn eliminar-btn" onclick="eliminarApunte(${a.id})">
              <i class="fa-solid fa-trash"></i>
            </button>

          </div>
        </div>

      </div>
    `).join("");
  }

  lista.innerHTML = seccionEnviadas + apuntesHTML;
}

function eliminarApunteAdmin(apunteId) {
  if (!confirm("¿Eliminar esta nota del historial?")) return;

  // Eliminar del historial del admin
  let adminId = usuarioActual.id;
  if (APUNTES_ENVIADOS[adminId]) {
    APUNTES_ENVIADOS[adminId] = APUNTES_ENVIADOS[adminId]
      .filter(a => a.apunteId !== apunteId);
  }

  // También eliminar del array del técnico si aún existe
  USUARIOS.forEach(u => {
    if (APUNTES[u.id]) {
      APUNTES[u.id] = APUNTES[u.id].filter(a => a.id !== apunteId);
    }
  });

  toast("alerta", "Nota eliminada", "La nota fue eliminada del historial.");
  renderApuntesDashboard();
}

// ══════════════════════════════════
// EDITAR TICKET (solo admin)
// ══════════════════════════════════
function abrirModalEditarTicket(id) {
  let ticket = TICKETS.find(t => t.id === id);
  if (!ticket) return;
  ticketActual = ticket;

  // Llenar campos con datos actuales
  document.getElementById("editar-titulo").value       = ticket.titulo;
  document.getElementById("editar-descripcion").value  = ticket.descripcion;
  document.getElementById("editar-prioridad").value    = ticket.prioridad;
  document.getElementById("editar-equipo").value       = ticket.equipo || "PC / Laptop";
  document.getElementById("editar-motivo").value       = "";
  document.getElementById("editar-error").textContent  = "";

  // Departamento
  let selectDepto = document.getElementById("editar-depto");
  for (let opt of selectDepto.options) {
    if (opt.value === ticket.departamento) { opt.selected = true; break; }
  }

  // Técnico
  llenarSelectTecnicosEditar();

  abrirModal("modal-editar");
}

function llenarSelectTecnicosEditar() {
  let select = document.getElementById("editar-tecnico");
  if (!select) return;
  select.innerHTML = '<option value="">Sin asignar</option>';
  USUARIOS.filter(u => u.rol === "tecnico" || u.rol === "recepcionista").forEach(u => {
    let selected = ticketActual.tecnico === u.nombre ? "selected" : "";
    select.innerHTML += `<option value="${u.nombre}" ${selected}>${u.nombre} — ${u.cargo}</option>`;
  });
}

function confirmarEdicion() {
  let titulo      = document.getElementById("editar-titulo").value.trim();
  let descripcion = document.getElementById("editar-descripcion").value.trim();
  let prioridad   = document.getElementById("editar-prioridad").value;
  let depto       = document.getElementById("editar-depto").value;
  let equipo      = document.getElementById("editar-equipo").value;
  let tecnico     = document.getElementById("editar-tecnico").value;
  let motivo      = document.getElementById("editar-motivo").value.trim();
  let errorDiv    = document.getElementById("editar-error");

  if (!titulo || !descripcion) {
    errorDiv.textContent = "⚠ El título y la descripción son obligatorios.";
    return;
  }
  if (!motivo) {
    errorDiv.textContent = "⚠ Debes indicar el motivo de la edición.";
    return;
  }

  // Detectar qué cambió para el historial
  let cambios = [];
  if (ticketActual.titulo       !== titulo)      cambios.push("título");
  if (ticketActual.descripcion  !== descripcion) cambios.push("descripción");
  if (ticketActual.prioridad    !== prioridad)   cambios.push(`prioridad → ${prioridad}`);
  if (ticketActual.departamento !== depto)       cambios.push(`departamento → ${depto}`);
  if ((ticketActual.tecnico||"") !== tecnico)    cambios.push(`técnico → ${tecnico || "sin asignar"}`);

  // Aplicar cambios
  ticketActual.titulo        = titulo;
  ticketActual.descripcion   = descripcion;
  ticketActual.prioridad     = prioridad;
  ticketActual.departamento  = depto;
  ticketActual.equipo        = equipo;
  ticketActual.tecnico       = tecnico || null;

  // Si se asignó técnico y el estado era CREADO → pasar a ASIGNADO
  if (tecnico && ticketActual.estado === "CREADO") {
    ticketActual.estado = "ASIGNADO";
    cambios.push("estado → ASIGNADO");
  }

  // Registrar en historial
  let detalle = cambios.length > 0
    ? `Campos editados: ${cambios.join(", ")}. Motivo: ${motivo}`
    : `Revisión sin cambios. Motivo: ${motivo}`;

  registrarHistorial(ticketActual, "Ticket editado por administrador", detalle, usuarioActual.nombre);

  cerrarModal("modal-editar");
  toast("exito", "Ticket Actualizado", `#${ticketActual.id} fue editado correctamente.`);
  verTicket(ticketActual.id);
}
// ══════════════════════════════════
// GESTIÓN DE SEDES (solo admin)
// ══════════════════════════════════

function cargarSedes(sedeId = null) {
  sedeSeleccionada = sedeId;
  let pagina = document.getElementById("pagina-sedes");

  // Tabs de sedes
  let tabsHTML = `
    <div class="sede-tabs">
      <button class="sede-tab ${!sedeId ? 'activa' : ''}"
        style="${!sedeId ? 'background:#1e293b;' : ''}"
        onclick="cargarSedes(null)">
        <i class="fa-solid fa-earth-americas"></i>
        Todas las Sedes
        <span class="sede-badge" style="background:${!sedeId?'rgba(255,255,255,0.2)':'#f0f2f5'};color:${!sedeId?'#fff':'var(--text-muted)'};">
          ${TICKETS.length}
        </span>
      </button>
      ${SEDES.map(s => {
        let tickets = getTicketsPorSede(s.id);
        let activa  = sedeId === s.id;
        return `
          <button class="sede-tab ${activa ? 'activa' : ''}"
            style="${activa ? `background:${s.color};` : ''}"
            onclick="cargarSedes(${s.id})">
            <span class="sede-punto" style="background:${activa ? '#fff' : s.color};"></span>
            ${s.nombre}
            <span class="sede-badge" style="background:${activa?'rgba(255,255,255,0.25)':'#f0f2f5'};color:${activa?'#fff':'var(--text-muted)'};">
              ${tickets.length}
            </span>
          </button>
        `;
      }).join("")}
    </div>
  `;

  if (!sedeId) {
    // Vista global: tarjetas de todas las sedes
    pagina.innerHTML = tabsHTML + renderVistaGlobalSedes();
  } else {
    // Vista de una sede específica
    pagina.innerHTML = tabsHTML + renderVistaSede(sedeId);
  }
}

function renderVistaGlobalSedes() {
  let statsGlobal = getEstadisticasPorSede(null);

  let tarjetasSedes = SEDES.map(s => {
    let stats    = getEstadisticasPorSede(s.id);
    let tecnicos = getTecnicosPorSede(s.id).filter(u => u.rol === "tecnico");
    return `
      <div class="sede-card" style="border-top-color:${s.color};"
           onclick="cargarSedes(${s.id})">
        <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:12px;">
          <div>
            <div style="font-size:15px;font-weight:700;">${s.nombre}</div>
            <div style="font-size:12px;color:var(--text-muted);margin-top:2px;">
              <i class="fa-solid fa-location-dot" style="margin-right:4px;"></i>${s.ciudad}
            </div>
          </div>
          <span style="background:${s.color}22;color:${s.color};font-size:11px;font-weight:700;
            padding:3px 10px;border-radius:99px;">
            ${tecnicos.length} técnico${tecnicos.length !== 1 ? 's' : ''}
          </span>
        </div>

        <div style="display:grid;grid-template-columns:repeat(2,1fr);gap:8px;margin-bottom:12px;">
          <div style="background:var(--bg);border-radius:8px;padding:8px;text-align:center;">
            <div style="font-size:20px;font-weight:700;color:${s.color};">${stats.total}</div>
            <div style="font-size:11px;color:var(--text-muted);">Total</div>
          </div>
          <div style="background:var(--bg);border-radius:8px;padding:8px;text-align:center;">
            <div style="font-size:20px;font-weight:700;color:#f97316;">${stats.enProceso}</div>
            <div style="font-size:11px;color:var(--text-muted);">En Proceso</div>
          </div>
          <div style="background:var(--bg);border-radius:8px;padding:8px;text-align:center;">
            <div style="font-size:20px;font-weight:700;color:#eab308;">${stats.creados}</div>
            <div style="font-size:11px;color:var(--text-muted);">Pendientes</div>
          </div>
          <div style="background:var(--bg);border-radius:8px;padding:8px;text-align:center;">
            <div style="font-size:20px;font-weight:700;color:#10b981;">${stats.cerrados}</div>
            <div style="font-size:11px;color:var(--text-muted);">Cerrados</div>
          </div>
        </div>

        ${stats.inmediata > 0 ? `
          <div style="background:#fff1f2;border:1px solid #fecdd3;border-radius:8px;
            padding:6px 10px;font-size:11px;color:#991b1b;font-weight:600;
            display:flex;align-items:center;gap:6px;">
            <i class="fa-solid fa-triangle-exclamation"></i>
            ${stats.inmediata} ticket(s) urgente(s)
          </div>
        ` : `
          <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;
            padding:6px 10px;font-size:11px;color:#166534;font-weight:600;
            display:flex;align-items:center;gap:6px;">
            <i class="fa-solid fa-circle-check"></i>
            Sin urgencias
          </div>
        `}
      </div>
    `;
  }).join("");

  return `
    <!-- Stats globales -->
    <div class="stats-grid" style="margin-bottom:24px;">
      <div class="stat-card">
        <div class="stat-info"><p>Total Global</p><strong>${statsGlobal.total}</strong></div>
        <div class="stat-icono azul"><i class="fa-solid fa-ticket"></i></div>
      </div>
      <div class="stat-card">
        <div class="stat-info"><p>En Proceso</p><strong>${statsGlobal.enProceso}</strong></div>
        <div class="stat-icono naranja"><i class="fa-solid fa-clock"></i></div>
      </div>
      <div class="stat-card">
        <div class="stat-info"><p>Cerrados</p><strong>${statsGlobal.cerrados}</strong></div>
        <div class="stat-icono verde"><i class="fa-solid fa-circle-check"></i></div>
      </div>
      <div class="stat-card">
        <div class="stat-info"><p>Sedes Activas</p><strong>${SEDES.length}</strong></div>
        <div class="stat-icono morado"><i class="fa-solid fa-building"></i></div>
      </div>
    </div>

    <!-- Tarjetas por sede -->
    <h3 style="font-size:14px;font-weight:700;margin-bottom:14px;">
      <i class="fa-solid fa-building" style="color:var(--accent);margin-right:6px;"></i>
      Resumen por Sede
    </h3>
    <div class="sedes-overview-grid">${tarjetasSedes}</div>
  `;
}

// Busca esta función en tu app.js y reemplázala:
function renderVistaSede(sedeId) {
  const sede = SEDES.find(s => s.id === sedeId);
  if (!sede) return ""; // Retornamos vacío si no hay sede

  const ticketsSede = TICKETS.filter(t => t.sedeId === sedeId);
  const rol = getRolEfectivo();

  // Generamos la lista de tickets
  const listaHTML = ticketsSede.length > 0
    ? ticketsSede.map(t => renderTicketCardCompacta(t, getBotonesTicket(t, rol))).join("")
    : `<div class="vacio">No hay tickets en esta sede.</div>`;

  // IMPORTANTE: Solo retornamos el HTML, no usamos document.getElementById aquí
  return `
    <div class="header-detalle-sede" style="margin-top:20px;">
      <div class="titulo-sede" style="display:flex; align-items:center; gap:10px; margin-bottom:15px;">
        <span class="punto-sede" style="background:${sede.color}; width:15px; height:15px; border-radius:50%; display:inline-block;"></span>
        <h2 style="margin:0;">Detalle de ${sede.nombre}</h2>
      </div>
    </div>
    <div class="tickets-grid-compacto" style="display: grid; gap: 15px;">
      ${listaHTML}
    </div>
  `;
}


function reasignarTicketSede(sedeOrigenId) {
  let ticketId   = document.getElementById("select-ticket-reasignar").value;
  let sedeDestId = parseInt(document.getElementById("select-sede-destino").value);

  if (!ticketId)   { toast("alerta", "Selecciona un ticket", "Debes elegir el ticket a reasignar.");      return; }
  if (!sedeDestId) { toast("alerta", "Selecciona una sede",  "Debes elegir la sede de destino.");         return; }

  let ticket   = TICKETS.find(t => t.id === ticketId);
  let sedeDest = SEDES.find(s => s.id === sedeDestId);
  if (!ticket || !sedeDest) return;

  let sedeOrigen = SEDES.find(s => s.id === sedeOrigenId);

  // Reasignar sede y quitar técnico (ya que los técnicos son exclusivos por sede)
  ticket.sedeId  = sedeDestId;
  ticket.tecnico = null;
  if (ticket.estado === "ASIGNADO" || ticket.estado === "EN_PROCESO") {
    ticket.estado = "CREADO";
  }

  registrarHistorial(
    ticket,
    "Ticket reasignado de sede",
    `Movido de ${sedeOrigen?.nombre} a ${sedeDest.nombre} por el administrador. Técnico removido.`,
    usuarioActual.nombre
  );

  toast("exito", "Ticket Reasignado", `#${ticket.id} movido a ${sedeDest.nombre}.`);
  cargarSedes(sedeOrigenId);
}
//hasta aqui esta todo ok 
