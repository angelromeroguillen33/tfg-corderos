/* ========================================
   TFG Cebo de Corderos - Lógica de Aplicación
   Aplicación Offline con almacenamiento local
   Auto-guardado automático en archivo JSON
   ======================================== */

// ==========================================
// CONFIGURACIÓN DEL ESTUDIO
// ==========================================
const FECHA_FIN_ESTUDIO_STR = '2026-02-04';
const NOMBRE_ARCHIVO_DATOS = 'TFG_Corderos_Datos.json';

// ==========================================
// INICIALIZACIÓN Y ALMACENAMIENTO
// ==========================================

// Claves de almacenamiento local
const STORAGE_KEYS = {
    animales: 'tfg_corderos_animales',
    pesajes: 'tfg_corderos_pesajes',
    consumo: 'tfg_corderos_consumo',
    incidencias: 'tfg_corderos_incidencias',
    ultimoBackup: 'tfg_corderos_ultimo_backup'
};

// Cargar datos desde localStorage
function cargarDatos(clave) {
    try {
        const datos = localStorage.getItem(STORAGE_KEYS[clave]);
        return datos ? JSON.parse(datos) : [];
    } catch (e) {
        console.error(`Error al cargar ${clave}:`, e);
        return [];
    }
}

// Guardar datos en localStorage y Firebase
function guardarDatos(clave, datos) {
    try {
        // Marcar como actualización local para evitar loops
        window.isLocalUpdate = true;

        // Guardar en localStorage (siempre, como backup)
        localStorage.setItem(STORAGE_KEYS[clave], JSON.stringify(datos));
        actualizarEstadoGuardado();

        // Sincronizar con Firebase si está habilitado
        if (typeof syncEnabled !== 'undefined' && syncEnabled) {
            guardarEnFirebase(clave, datos);
        }

        // Resetear flag después de un breve delay
        setTimeout(() => { window.isLocalUpdate = false; }, 100);

        return true;
    } catch (e) {
        console.error(`Error al guardar ${clave}:`, e);
        document.getElementById('estado-guardado').textContent = '❌ Error al guardar';
        window.isLocalUpdate = false;
        return false;
    }
}

// Actualizar mensaje de estado con info de guardado
function actualizarEstadoGuardado() {
    const estadoEl = document.getElementById('estado-guardado');
    if (estadoEl) {
        const ultimoBackup = localStorage.getItem(STORAGE_KEYS.ultimoBackup);
        if (ultimoBackup) {
            const fecha = new Date(ultimoBackup);
            const fechaFormateada = fecha.toLocaleDateString('es-ES') + ' ' + fecha.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
            estadoEl.innerHTML = `✅ Guardado auto · Último backup: <strong>${fechaFormateada}</strong>`;
        } else {
            estadoEl.textContent = '✅ Datos guardados · Sin backup aún';
        }
        estadoEl.style.color = '#4a5a3c';
    }
}

// ==========================================
// AUTO-GUARDADO Y BACKUP AUTOMÁTICO
// ==========================================

// Generar backup completo
function generarBackupCompleto() {
    return {
        version: '2.0',
        fechaCreacion: new Date().toISOString(),
        fechaFinEstudio: FECHA_FIN_ESTUDIO_STR,
        animales: cargarDatos('animales'),
        pesajes: cargarDatos('pesajes'),
        consumo: cargarDatos('consumo'),
        incidencias: cargarDatos('incidencias')
    };
}

// Descargar backup automáticamente
function descargarBackupAutomatico(silencioso = false) {
    const datos = generarBackupCompleto();

    // Solo descargar si hay datos
    const totalRegistros = datos.animales.length + datos.pesajes.length + datos.consumo.length;
    if (totalRegistros === 0) {
        return false;
    }

    const blob = new Blob([JSON.stringify(datos, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = url;
    a.download = NOMBRE_ARCHIVO_DATOS;
    a.click();

    URL.revokeObjectURL(url);

    // Registrar última fecha de backup
    localStorage.setItem(STORAGE_KEYS.ultimoBackup, new Date().toISOString());

    if (!silencioso) {
        actualizarEstadoGuardado();
    }

    return true;
}

// Cargar datos desde archivo JSON
function cargarDesdeArchivo(archivo) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();

        reader.onload = (e) => {
            try {
                const datos = JSON.parse(e.target.result);

                if (!datos.animales && !datos.pesajes && !datos.consumo) {
                    reject(new Error('Formato de archivo inválido'));
                    return;
                }

                // Guardar en localStorage
                if (datos.animales) guardarDatos('animales', datos.animales);
                if (datos.pesajes) guardarDatos('pesajes', datos.pesajes);
                if (datos.consumo) guardarDatos('consumo', datos.consumo);
                if (datos.incidencias) guardarDatos('incidencias', datos.incidencias);

                resolve(datos);
            } catch (error) {
                reject(error);
            }
        };

        reader.onerror = () => reject(new Error('Error al leer archivo'));
        reader.readAsText(archivo);
    });
}

// Auto-guardado al cerrar la página
function configurarAutoGuardado() {
    // Guardar al cerrar o recargar
    window.addEventListener('beforeunload', (e) => {
        const totalRegistros = cargarDatos('animales').length + cargarDatos('pesajes').length + cargarDatos('consumo').length;

        if (totalRegistros > 0) {
            // Nota: Los navegadores modernos no permiten mostrar mensajes personalizados
            // pero esto sí asegura que los datos en localStorage estén actualizados
            console.log('💾 Auto-guardado completado');
        }
    });

    // Recordatorio de backup cada 30 minutos
    setInterval(() => {
        const ultimoBackup = localStorage.getItem(STORAGE_KEYS.ultimoBackup);
        if (ultimoBackup) {
            const hace = Date.now() - new Date(ultimoBackup).getTime();
            const horasSinBackup = hace / (1000 * 60 * 60);

            if (horasSinBackup > 2) {
                console.log('⚠️ Han pasado más de 2 horas desde el último backup');
            }
        }
    }, 30 * 60 * 1000);

    // Verificar si es el día final del estudio
    const hoy = new Date().toISOString().split('T')[0];
    if (hoy === FECHA_FIN_ESTUDIO_STR) {
        setTimeout(() => {
            alert('📊 ¡Hoy es el último día del estudio (4 de febrero)!\n\nRecuerda exportar todos tus datos a Excel antes de cerrar la aplicación.');
        }, 2000);
    }
}

// Generar ID único
function generarId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

// ==========================================
// MANEJO DE TABS
// ==========================================

function inicializarTabs() {
    const tabs = document.querySelectorAll('.tab-btn');
    const contents = document.querySelectorAll('.tab-content');

    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            // Desactivar todos los tabs y contenidos
            tabs.forEach(t => t.classList.remove('active'));
            contents.forEach(c => c.classList.remove('active'));

            // Activar tab seleccionado
            tab.classList.add('active');
            const tabId = tab.getAttribute('data-tab');
            document.getElementById(tabId).classList.add('active');

            // Actualizar resultados si es la pestaña de resultados
            if (tabId === 'resultados') {
                actualizarResultados();
            }
        });
    });
}

// ==========================================
// GESTIÓN DE ANIMALES
// ==========================================

function inicializarFormAnimales() {
    const form = document.getElementById('form-animal');

    form.addEventListener('submit', (e) => {
        e.preventDefault();

        const animal = {
            id: document.getElementById('animal-id-hidden')?.value || generarId(), // Usar ID existente si editamos
            crotal: document.getElementById('crotal').value.trim().toUpperCase(),
            grupo: document.getElementById('grupo').value,
            pesoInicial: parseFloat(document.getElementById('peso-inicial').value),
            fechaInicio: document.getElementById('fecha-inicio').value,
            observaciones: document.getElementById('observaciones-animal').value.trim(),
            activo: true,
            fechaRegistro: new Date().toISOString()
        };

        const animales = cargarDatos('animales');

        // Comprobar si estamos editando (ID existe)
        const indiceExistente = animales.findIndex(a => a.id === animal.id);

        if (indiceExistente >= 0) {
            // EDICIÓN
            // Validar crotal duplicado solo si cambió
            if (animales.some(a => a.crotal === animal.crotal && a.id !== animal.id)) {
                alert('⚠️ Ya existe otro animal con ese número de crotal.');
                return;
            }

            // Mantener datos que no se editan en el form (historial, fechas, etc si las hubiera)
            animal.activo = animales[indiceExistente].activo;
            animal.fechaRegistro = animales[indiceExistente].fechaRegistro;

            animales[indiceExistente] = animal;
            alert('✅ Animal actualizado correctamente.');

            // Resetear modo edición
            document.getElementById('btn-submit-animal').innerHTML = '➕ Registrar Animal';
            document.getElementById('animal-id-hidden').value = '';
        } else {
            // CREACIÓN
            // Validar que el crotal no exista
            if (animales.some(a => a.crotal === animal.crotal)) {
                alert('⚠️ Ya existe un animal con ese número de crotal.');
                return;
            }

            // Validar peso
            if (animal.pesoInicial <= 0 || animal.pesoInicial > 100) {
                alert('⚠️ El peso inicial debe estar entre 0 y 100 kg.');
                return;
            }

            animales.push(animal);
            alert('✅ Animal registrado correctamente.');
        }

        guardarDatos('animales', animales);

        form.reset();
        document.getElementById('fecha-inicio').value = '2025-12-23';
        document.getElementById('animal-id-hidden').value = '';
        document.getElementById('btn-submit-animal').innerHTML = '➕ Registrar Animal';

        renderizarTablaAnimales();
        actualizarSelectsAnimales();

    });
}

function editarAnimal(id) {
    const animales = cargarDatos('animales');
    const animal = animales.find(a => a.id === id);

    if (!animal) return;

    // Rellenar formulario
    document.getElementById('crotal').value = animal.crotal;
    document.getElementById('grupo').value = animal.grupo;
    document.getElementById('peso-inicial').value = animal.pesoInicial;
    document.getElementById('fecha-inicio').value = animal.fechaInicio;
    document.getElementById('observaciones-animal').value = animal.observaciones;

    // Campo oculto para ID
    let hiddenInput = document.getElementById('animal-id-hidden');
    if (!hiddenInput) {
        hiddenInput = document.createElement('input');
        hiddenInput.type = 'hidden';
        hiddenInput.id = 'animal-id-hidden';
        document.getElementById('form-animal').appendChild(hiddenInput);
    }
    hiddenInput.value = animal.id;

    // Cambiar botón
    const btnSubmit = document.querySelector('#form-animal button[type="submit"]');
    btnSubmit.id = 'btn-submit-animal'; // Asegurar ID
    btnSubmit.innerHTML = '💾 Actualizar Animal';

    // Scroll al formulario
    document.getElementById('animales').scrollIntoView({ behavior: 'smooth' });
    document.getElementById('crotal').focus();
}

function renderizarTablaAnimales() {
    const tbody = document.querySelector('#tabla-animales tbody');
    let animales = cargarDatos('animales');

    // Aplicar ordenación si existe
    animales = ordenarDatos(animales, 'tabla-animales', getValorAnimal);

    tbody.innerHTML = animales.map(animal => `
        <tr data-id="${animal.id}">
            <td><strong>${animal.crotal}</strong></td>
            <td><span class="badge badge-${animal.grupo.toLowerCase()}">${animal.grupo === 'A' ? 'Grupo A (Ad libitum)' : 'Grupo B (85%)'}</span></td>
            <td>${animal.pesoInicial.toFixed(1)} kg</td>
            <td>${formatearFecha(animal.fechaInicio)}</td>
            <td class="${animal.activo ? 'estado-activo' : 'estado-baja'}">${animal.activo ? '✅ Activo' : '❌ Baja'}</td>
            <td class="acciones">
                <button class="btn-editar" onclick="editarAnimal('${animal.id}')" title="Editar">✏️</button>
                <button class="btn-editar" onclick="toggleEstadoAnimal('${animal.id}')" title="${animal.activo ? 'Dar de baja' : 'Reactivar'}">
                    ${animal.activo ? '🔻' : '🔺'}
                </button>
                <button class="btn-eliminar" onclick="eliminarAnimal('${animal.id}')">🗑️</button>
            </td>
        </tr>
    `).join('');

    if (animales.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" style="text-align: center; color: #64748b;">No hay animales registrados</td></tr>';
    }
}

function toggleEstadoAnimal(id) {
    const animales = cargarDatos('animales');
    const animal = animales.find(a => a.id === id);

    if (animal) {
        animal.activo = !animal.activo;
        guardarDatos('animales', animales);
        renderizarTablaAnimales();
        actualizarSelectsAnimales();
    }
}

function eliminarAnimal(id) {
    if (!confirm('¿Estás seguro de eliminar este animal? Se eliminarán también sus pesajes e incidencias.')) {
        return;
    }

    let animales = cargarDatos('animales');
    const animal = animales.find(a => a.id === id);

    if (animal) {
        // Eliminar pesajes asociados
        let pesajes = cargarDatos('pesajes');
        pesajes = pesajes.filter(p => p.crotal !== animal.crotal);
        guardarDatos('pesajes', pesajes);

        // Eliminar incidencias asociadas
        let incidencias = cargarDatos('incidencias');
        incidencias = incidencias.filter(i => i.crotal !== animal.crotal);
        guardarDatos('incidencias', incidencias);

        // Eliminar animal
        animales = animales.filter(a => a.id !== id);
        guardarDatos('animales', animales);

        renderizarTablaAnimales();
        renderizarTablaPesajes();
        renderizarTablaIncidencias();
        actualizarSelectsAnimales();
    }
}

// ==========================================
// GESTIÓN DE PESAJES
// ==========================================

function inicializarFormPesajes() {
    const form = document.getElementById('form-pesaje');

    // Establecer fecha actual por defecto
    document.getElementById('pesaje-fecha').valueAsDate = new Date();

    form.addEventListener('submit', (e) => {
        e.preventDefault();

        const crotal = document.getElementById('pesaje-crotal').value;
        const fecha = document.getElementById('pesaje-fecha').value;
        const peso = parseFloat(document.getElementById('pesaje-peso').value);

        // Validar peso
        if (peso <= 0 || peso > 100) {
            alert('⚠️ El peso debe estar entre 0 y 100 kg.');
            return;
        }

        // Validar pérdida de peso excesiva
        const ultimoPeso = obtenerUltimoPeso(crotal, fecha);
        if (ultimoPeso && peso < ultimoPeso * 0.9) {
            if (!confirm(`⚠️ El peso registrado (${peso} kg) es ${((1 - peso / ultimoPeso) * 100).toFixed(1)}% menor que el último peso (${ultimoPeso.toFixed(1)} kg). ¿Confirmar este registro?`)) {
                return;
            }
        }

        const pesaje = {
            id: generarId(),
            crotal: crotal,
            fecha: fecha,
            peso: peso,
            semana: document.getElementById('pesaje-semana').value || calcularSemana(crotal, fecha),
            notas: document.getElementById('pesaje-notas').value.trim(),
            fechaRegistro: new Date().toISOString()
        };

        const pesajes = cargarDatos('pesajes');
        pesajes.push(pesaje);
        guardarDatos('pesajes', pesajes);

        form.reset();
        document.getElementById('pesaje-fecha').valueAsDate = new Date();

        renderizarTablaPesajes();

        alert('✅ Pesaje registrado correctamente.');
    });

    // Filtros de pesajes
    document.getElementById('filtro-pesaje-animal').addEventListener('change', renderizarTablaPesajes);
    document.getElementById('filtro-pesaje-fecha').addEventListener('change', renderizarTablaPesajes);
    document.getElementById('filtro-pesaje-semana').addEventListener('input', renderizarTablaPesajes);

    // Botón borrar filtros
    document.getElementById('btn-limpiar-filtros-pesaje').addEventListener('click', (e) => {
        e.preventDefault();
        document.getElementById('filtro-pesaje-animal').value = '';
        document.getElementById('filtro-pesaje-fecha').value = '';
        document.getElementById('filtro-pesaje-semana').value = '';
        renderizarTablaPesajes();
    });
}

function obtenerUltimoPeso(crotal, fechaActual) {
    const animales = cargarDatos('animales');
    const animal = animales.find(a => a.crotal === crotal);

    if (!animal) return null;

    const pesajes = cargarDatos('pesajes')
        .filter(p => p.crotal === crotal && p.fecha < fechaActual)
        .sort((a, b) => new Date(b.fecha) - new Date(a.fecha));

    if (pesajes.length > 0) {
        return pesajes[0].peso;
    }

    return animal.pesoInicial;
}

function calcularSemana(crotal, fecha) {
    // Fechas clave del ensayo (fijas, no dependen del animal)
    const FECHA_PESO_LLEGADA = new Date(2025, 11, 18);  // 18 dic - peso de llegada (sin semana)
    const FECHA_INICIO_ENSAYO = new Date(2025, 11, 24); // 24 dic - Semana 0 (peso inicial ensayo)
    const FECHA_INICIO_SEMANA1 = new Date(2025, 11, 31); // 31 dic - Semana 1

    const fechaPesaje = new Date(fecha);

    // Normalizar a medianoche para comparar solo fechas
    fechaPesaje.setHours(0, 0, 0, 0);

    // Antes del 24 de diciembre: peso de llegada, no tiene semana
    if (fechaPesaje < FECHA_INICIO_ENSAYO) {
        return null; // O podríamos devolver 'Llegada'
    }

    // Entre 24/12 y 30/12 (inclusive): Semana 0 (peso inicial del ensayo)
    if (fechaPesaje < FECHA_INICIO_SEMANA1) {
        return 0;
    }

    // A partir del 31/12: calcular semanas desde esa fecha
    const diasDesdeInicio = Math.floor((fechaPesaje - FECHA_INICIO_SEMANA1) / (1000 * 60 * 60 * 24));
    const semana = Math.floor(diasDesdeInicio / 7) + 1;

    return semana;
}

function calcularGMD(crotal, fecha, pesoActual) {
    const animales = cargarDatos('animales');
    const animal = animales.find(a => a.crotal === crotal);

    if (!animal) return null;

    const fechaInicio = new Date(animal.fechaInicio);
    const fechaPesaje = new Date(fecha);
    const dias = Math.floor((fechaPesaje - fechaInicio) / (1000 * 60 * 60 * 24));

    if (dias <= 0) return null;

    const ganancia = pesoActual - animal.pesoInicial;
    return Math.round((ganancia / dias) * 1000); // en gramos/día
}

function renderizarTablaPesajes() {
    const tbody = document.querySelector('#tabla-pesajes tbody');
    const filtroAnimal = document.getElementById('filtro-pesaje-animal').value;
    const filtroFecha = document.getElementById('filtro-pesaje-fecha').value;
    const filtroSemana = document.getElementById('filtro-pesaje-semana').value;
    const animales = cargarDatos('animales');

    let pesajes = cargarDatos('pesajes');

    if (filtroAnimal) {
        pesajes = pesajes.filter(p => p.crotal === filtroAnimal);
    }
    if (filtroFecha) {
        pesajes = pesajes.filter(p => p.fecha === filtroFecha);
    }
    if (filtroSemana) {
        pesajes = pesajes.filter(p => p.semana == filtroSemana);
    }

    // Aplicar ordenación: si no hay columna seleccionada, ordenar por fecha desc por defecto
    if (estadoOrdenacion['tabla-pesajes'].columna) {
        pesajes = ordenarDatos(pesajes, 'tabla-pesajes', (p, col) => getValorPesaje(p, col, animales));
    } else {
        pesajes.sort((a, b) => new Date(b.fecha) - new Date(a.fecha));
    }

    tbody.innerHTML = pesajes.map(pesaje => {
        const animal = animales.find(a => a.crotal === pesaje.crotal);
        const grupo = animal ? animal.grupo : '-';
        const gmd = calcularGMD(pesaje.crotal, pesaje.fecha, pesaje.peso);
        const semanaCalculada = calcularSemana(pesaje.crotal, pesaje.fecha);
        const semanaDisplay = semanaCalculada === null ? 'Llegada' : semanaCalculada;

        return `
            <tr data-id="${pesaje.id}">
                <td>${formatearFecha(pesaje.fecha)}</td>
                <td><strong>${pesaje.crotal}</strong></td>
                <td><span class="badge badge-${grupo.toLowerCase()}">${grupo}</span></td>
                <td>${pesaje.peso.toFixed(1)} kg</td>
                <td>${semanaDisplay}</td>
                <td>${gmd !== null ? gmd + ' g' : '-'}</td>
                <td class="acciones">
                    <button class="btn-eliminar" onclick="eliminarPesaje('${pesaje.id}')">🗑️</button>
                </td>
            </tr>
        `;
    }).join('');

    if (pesajes.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" style="text-align: center; color: #64748b;">No hay pesajes registrados</td></tr>';
    }

    // Actualizar gráfico con los datos filtrados
    actualizarGraficoPesaje(pesajes);
}

function eliminarPesaje(id) {
    if (!confirm('¿Estás seguro de eliminar este pesaje?')) {
        return;
    }

    let pesajes = cargarDatos('pesajes');
    pesajes = pesajes.filter(p => p.id !== id);
    guardarDatos('pesajes', pesajes);

    renderizarTablaPesajes();
}

// ==========================================
// GESTIÓN DE CONSUMO
// ==========================================

function inicializarFormConsumo() {
    const form = document.getElementById('form-consumo');

    // Establecer fecha actual por defecto
    document.getElementById('consumo-fecha').valueAsDate = new Date();

    form.addEventListener('submit', (e) => {
        e.preventDefault();

        const consumo = {
            id: generarId(),
            grupo: document.getElementById('consumo-grupo').value,
            fecha: document.getElementById('consumo-fecha').value,
            piensoOfrecido: parseFloat(document.getElementById('consumo-pienso-ofrecido').value),
            piensoRechazado: parseFloat(document.getElementById('consumo-pienso-rechazado').value) || 0,
            forrajeOfrecido: parseFloat(document.getElementById('consumo-forraje-ofrecido').value) || 0,
            forrajeRechazado: parseFloat(document.getElementById('consumo-forraje-rechazado').value) || 0,
            fechaRegistro: new Date().toISOString()
        };

        // Validar que el rechazo no sea mayor que lo ofrecido
        if (consumo.piensoRechazado > consumo.piensoOfrecido) {
            alert('⚠️ El pienso rechazado no puede ser mayor que el ofrecido.');
            return;
        }

        if (consumo.forrajeRechazado > consumo.forrajeOfrecido) {
            alert('⚠️ El forraje rechazado no puede ser mayor que el ofrecido.');
            return;
        }

        const consumos = cargarDatos('consumo');

        // Verificar si ya existe un registro para ese grupo y fecha
        const existente = consumos.find(c => c.grupo === consumo.grupo && c.fecha === consumo.fecha);
        if (existente) {
            if (!confirm('Ya existe un registro para este grupo y fecha. ¿Desea reemplazarlo?')) {
                return;
            }
            // Eliminar el existente
            const index = consumos.indexOf(existente);
            consumos.splice(index, 1);
        }

        consumos.push(consumo);
        guardarDatos('consumo', consumos);

        form.reset();
        document.getElementById('consumo-fecha').valueAsDate = new Date();
        document.getElementById('consumo-pienso-rechazado').value = '0';
        document.getElementById('consumo-forraje-rechazado').value = '0';

        renderizarTablaConsumo();

        alert('✅ Consumo registrado correctamente.');
    });

    // Filtros de consumo
    document.getElementById('filtro-consumo-grupo').addEventListener('change', renderizarTablaConsumo);
    document.getElementById('filtro-consumo-fecha').addEventListener('change', renderizarTablaConsumo);

    document.getElementById('btn-limpiar-filtros-consumo').addEventListener('click', (e) => {
        e.preventDefault();
        document.getElementById('filtro-consumo-grupo').value = '';
        document.getElementById('filtro-consumo-fecha').value = '';
        renderizarTablaConsumo();
    });
}

function renderizarTablaConsumo() {
    const tbody = document.querySelector('#tabla-consumo tbody');
    const filtroGrupo = document.getElementById('filtro-consumo-grupo').value;
    const filtroFecha = document.getElementById('filtro-consumo-fecha').value;

    let consumos = cargarDatos('consumo');

    if (filtroGrupo) {
        consumos = consumos.filter(c => c.grupo === filtroGrupo);
    }
    if (filtroFecha) {
        consumos = consumos.filter(c => c.fecha === filtroFecha);
    }

    // Aplicar ordenación: si no hay columna seleccionada, ordenar por fecha desc por defecto
    if (estadoOrdenacion['tabla-consumo'].columna) {
        consumos = ordenarDatos(consumos, 'tabla-consumo', getValorConsumo);
    } else {
        consumos.sort((a, b) => new Date(b.fecha) - new Date(a.fecha));
    }

    tbody.innerHTML = consumos.map(consumo => {
        const consumoNeto = consumo.piensoOfrecido - consumo.piensoRechazado;

        return `
            <tr data-id="${consumo.id}">
                <td>${formatearFecha(consumo.fecha)}</td>
                <td><span class="badge badge-${consumo.grupo.toLowerCase()}">${consumo.grupo}</span></td>
                <td>${consumo.piensoOfrecido.toFixed(2)} kg</td>
                <td>${consumo.piensoRechazado.toFixed(2)} kg</td>
                <td><strong>${consumoNeto.toFixed(2)} kg</strong></td>
                <td>${consumo.forrajeOfrecido.toFixed(2)} kg</td>
                <td>${consumo.forrajeRechazado.toFixed(2)} kg</td>
                <td class="acciones">
                    <button class="btn-eliminar" onclick="eliminarConsumo('${consumo.id}')">🗑️</button>
                </td>
            </tr>
        `;
    }).join('');

    if (consumos.length === 0) {
        tbody.innerHTML = '<tr><td colspan="8" style="text-align: center; color: #64748b;">No hay registros de consumo</td></tr>';
    }

    // Actualizar gráfico con los datos filtrados
    actualizarGraficoConsumo(consumos);
}

function eliminarConsumo(id) {
    if (!confirm('¿Estás seguro de eliminar este registro de consumo?')) {
        return;
    }

    let consumos = cargarDatos('consumo');
    consumos = consumos.filter(c => c.id !== id);
    guardarDatos('consumo', consumos);

    renderizarTablaConsumo();
}

// ==========================================
// GESTIÓN DE INCIDENCIAS
// ==========================================

function inicializarFormIncidencias() {
    const form = document.getElementById('form-incidencia');
    const selectCrotalDiv = document.getElementById('grupo-crotal');
    const selectTipo = document.getElementById('incidencia-tipo');
    const camposMedicamento = document.getElementById('campos-medicamento');
    const radiosAmbito = document.getElementsByName('incidencia-ambito');

    // Establecer fecha actual
    document.getElementById('incidencia-fecha').valueAsDate = new Date();

    // Listener para cambio de ámbito (Individual vs Grupo)
    radiosAmbito.forEach(radio => {
        radio.addEventListener('change', (e) => {
            if (e.target.value === 'individual') {
                selectCrotalDiv.style.display = 'block';
                document.getElementById('incidencia-crotal').setAttribute('required', 'true');
            } else {
                selectCrotalDiv.style.display = 'none';
                document.getElementById('incidencia-crotal').removeAttribute('required');
            }
        });
    });

    // Listener para tipo de incidencia (Mostrar medicamentos si es tratamiento, descripción si es síntoma/retirada)
    selectTipo.addEventListener('change', (e) => {
        const tipo = e.target.value;
        const divDescripcion = document.getElementById('div-descripcion-incidencia');
        const txtDescripcion = document.getElementById('incidencia-descripcion');

        // Reset
        camposMedicamento.style.display = 'none';
        divDescripcion.style.display = 'none';
        document.getElementById('med-nombre').removeAttribute('required');
        txtDescripcion.removeAttribute('required');

        if (tipo === 'tratamiento') {
            camposMedicamento.style.display = 'block';
            document.getElementById('med-nombre').setAttribute('required', 'true');
        } else if (tipo === 'sintomatologia' || tipo === 'retirada' || tipo === 'baja' || tipo === 'otro') {
            divDescripcion.style.display = 'block';
            txtDescripcion.setAttribute('required', 'true');
        }
    });

    form.addEventListener('submit', (e) => {
        e.preventDefault();

        const ambito = document.querySelector('input[name="incidencia-ambito"]:checked').value;
        const fecha = document.getElementById('incidencia-fecha').value;
        const tipo = selectTipo.value;
        // Obtenemos la descripción ya sea del campo específico o si estaba unificado antes
        const descripcion = document.getElementById('incidencia-descripcion').value.trim();

        // Recopilar datos de medicamento si es tratamiento
        let datosMedicamento = null;
        if (tipo === 'tratamiento') {
            datosMedicamento = {
                nombre: document.getElementById('med-nombre').value.trim(),
                presentacion: document.getElementById('med-presentacion').value,
                dosis: document.getElementById('med-dosis').value.trim(),
                unidad: document.getElementById('med-unidad').value,
                via: document.getElementById('med-via').value,
                duracion: document.getElementById('med-duracion').value,
                notas: document.getElementById('med-notas').value.trim()
            };
        }

        const animales = cargarDatos('animales');
        let listaCrotales = [];

        // Determinar a qué animales afecta
        if (ambito === 'individual') {
            listaCrotales.push(document.getElementById('incidencia-crotal').value);
        } else if (ambito === 'grupoA') {
            listaCrotales = animales.filter(a => a.grupo === 'A' && a.activo).map(a => a.crotal);
        } else if (ambito === 'grupoB') {
            listaCrotales = animales.filter(a => a.grupo === 'B' && a.activo).map(a => a.crotal);
        } else if (ambito === 'ambos') {
            listaCrotales = animales.filter(a => a.activo).map(a => a.crotal);
        }

        if (listaCrotales.length === 0) {
            alert('⚠️ No hay animales activos seleccionados para esta incidencia.');
            return;
        }

        const incidencias = cargarDatos('incidencias');
        let contador = 0;

        listaCrotales.forEach(crotal => {
            const nuevaIncidencia = {
                id: generarId(),
                crotal: crotal,
                fecha: fecha,
                tipo: tipo,
                descripcion: descripcion,
                medicamento: datosMedicamento,
                ambitoRegistro: ambito, // Para saber si vino de una acción grupal
                fechaRegistro: new Date().toISOString()
            };

            incidencias.push(nuevaIncidencia);
            contador++;

            // Lógica específica para Retirada o Baja
            if (tipo === 'retirada' || tipo === 'baja') {
                const animal = animales.find(a => a.crotal === crotal);
                if (animal) {
                    animal.activo = false;
                    animal.fechaSalida = fecha;
                    animal.motivoSalida = (tipo === 'baja' ? 'Baja por muerte' : 'Retirada del estudio') + ': ' + descripcion;
                }
            }
        });

        guardarDatos('incidencias', incidencias);
        if (tipo === 'retirada' || tipo === 'baja') {
            guardarDatos('animales', animales);
            renderizarTablaAnimales();
            actualizarSelectsAnimales();
        }

        // Resetear formulario
        form.reset();
        document.getElementById('incidencia-fecha').valueAsDate = new Date();
        // Reset manual de campos que no resetea el form.reset si tienen valores por defecto o dinámicos
        if (document.getElementById('med-unidad')) document.getElementById('med-unidad').value = 'ml';
        if (document.getElementById('med-presentacion')) document.getElementById('med-presentacion').value = 'inyectable';

        // Restaurar estado visual
        // Restaurar estado visual
        selectCrotalDiv.style.display = 'block';
        camposMedicamento.style.display = 'none';
        document.getElementById('div-descripcion-incidencia').style.display = 'none';

        renderizarTablaIncidencias();
        renderizarCalendario(); // Actualizar indicadores

        let mensaje = `✅ Se ha registrado la incidencia para ${contador} animal(es).`;
        if (ambito !== 'individual') mensaje += `\n(Aplicado a: ${ambito})`;
        alert(mensaje);
    });
}

function renderizarTablaIncidencias() {
    const tbody = document.querySelector('#tabla-incidencias tbody');
    // Filtrar por tipo si está seleccionado
    const filtroTipo = document.getElementById('filtro-incidencia-tipo');

    // Añadir listener si no existe (chapuza rápida para evitar múltiples listeners, idealmente mover a init)
    if (!filtroTipo.dataset.listening) {
        filtroTipo.addEventListener('change', renderizarTablaIncidencias);
        filtroTipo.dataset.listening = 'true';
    }

    let incidencias = cargarDatos('incidencias');
    const animales = cargarDatos('animales');

    // Aplicar filtro
    if (filtroTipo.value) {
        incidencias = incidencias.filter(i => i.tipo === filtroTipo.value);
    }

    // Aplicar ordenación: si no hay columna seleccionada, ordenar por fecha desc por defecto
    if (estadoOrdenacion['tabla-incidencias'].columna) {
        incidencias = ordenarDatos(incidencias, 'tabla-incidencias', getValorIncidencia);
    } else {
        incidencias.sort((a, b) => new Date(b.fecha) - new Date(a.fecha));
    }

    const tiposTexto = {
        'sintomatologia': '<span class="badge" style="background:#fff3cd; color:#856404; border-color:#ffeeba">🩺 Sintomatología</span>',
        'tratamiento': '<span class="badge" style="background:#d4edda; color:#155724; border-color:#c3e6cb">💉 Tratamiento</span>',
        'retirada': '<span class="badge" style="background:#f8d7da; color:#721c24; border-color:#f5c6cb">🚫 Retirada</span>',
        'enfermedad': '🤒 Enfermedad',
        'baja': '<span class="badge" style="background:#3d2e24; color:#fff; border-color:#000">❌ Baja</span>',
        'otro': '📌 Otro'
    };

    tbody.innerHTML = incidencias.map(inc => {
        const animal = animales.find(a => a.crotal === inc.crotal);
        const grupo = animal ? animal.grupo : '?';
        const badgeGrupo = grupo === 'A' ?
            '<span class="badge badge-a">Gr. A</span>' :
            '<span class="badge badge-b">Gr. B</span>';

        // Formatear info de medicamento
        let infoMed = '-';
        if (inc.medicamento) {
            const unidad = inc.medicamento.unidad || '';
            infoMed = `
                <strong>${inc.medicamento.nombre}</strong><br>
                <small>${inc.medicamento.dosis}${unidad} (${inc.medicamento.via})</small>
            `;
        } else if (inc.tratamiento) { // Compatibilidad datos viejos
            infoMed = inc.tratamiento;
        }

        return `
        <tr data-id="${inc.id}">
            <td>${formatearFecha(inc.fecha)}</td>
            <td>
                <strong>${inc.crotal}</strong> ${badgeGrupo}
            </td>
            <td>${tiposTexto[inc.tipo] || inc.tipo}</td>
            <td>${inc.descripcion}</td>
            <td>${infoMed}</td>
            <td class="acciones">
                <button class="btn-eliminar" onclick="eliminarIncidencia('${inc.id}')" title="Eliminar">🗑️</button>
            </td>
        </tr>
        `;
    }).join('');

    if (incidencias.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" style="text-align: center; color: #64748b;">No hay incidencias registradas con este filtro</td></tr>';
    }
}

function eliminarIncidencia(id) {
    if (!confirm('¿Estás seguro de eliminar esta incidencia?')) {
        return;
    }

    let incidencias = cargarDatos('incidencias');
    incidencias = incidencias.filter(i => i.id !== id);
    guardarDatos('incidencias', incidencias);

    renderizarTablaIncidencias();
}

// ==========================================
// RESULTADOS Y CÁLCULOS
// ==========================================

function actualizarResultados() {
    const animales = cargarDatos('animales');
    const pesajes = cargarDatos('pesajes');
    const consumos = cargarDatos('consumo');

    // Resumen general
    const resumenGeneral = document.getElementById('resumen-general');
    const animalesActivos = animales.filter(a => a.activo).length;
    const grupoA = animales.filter(a => a.grupo === 'A');
    const grupoB = animales.filter(a => a.grupo === 'B');

    resumenGeneral.innerHTML = `
        <div class="stat">
            <span>Total animales:</span>
            <span class="stat-value">${animales.length}</span>
        </div>
        <div class="stat">
            <span>Animales activos:</span>
            <span class="stat-value">${animalesActivos}</span>
        </div>
        <div class="stat">
            <span>Grupo A:</span>
            <span class="stat-value">${grupoA.length} animales</span>
        </div>
        <div class="stat">
            <span>Grupo B:</span>
            <span class="stat-value">${grupoB.length} animales</span>
        </div>
        <div class="stat">
            <span>Total pesajes:</span>
            <span class="stat-value">${pesajes.length}</span>
        </div>
    `;

    // Estadísticas por grupo
    actualizarEstadisticasGrupo('A', 'resumen-grupo-a');
    actualizarEstadisticasGrupo('B', 'resumen-grupo-b');

    // Tabla de evolución
    actualizarTablaEvolucion();

    // Tabla de conversión
    actualizarTablaConversion();
}

function actualizarEstadisticasGrupo(grupo, elementoId) {
    const animales = cargarDatos('animales').filter(a => a.grupo === grupo && a.activo);
    const pesajes = cargarDatos('pesajes');
    const consumos = cargarDatos('consumo').filter(c => c.grupo === grupo);

    const elemento = document.getElementById(elementoId);

    if (animales.length === 0) {
        elemento.innerHTML = '<p>Sin datos</p>';
        return;
    }

    // Calcular estadísticas
    let pesoInicialTotal = 0;
    let pesoActualTotal = 0;
    let gmdTotal = 0;
    let diasTotal = 0;

    animales.forEach(animal => {
        pesoInicialTotal += animal.pesoInicial;

        // Obtener último peso
        const pesajesAnimal = pesajes
            .filter(p => p.crotal === animal.crotal)
            .sort((a, b) => new Date(b.fecha) - new Date(a.fecha));

        const pesoActual = pesajesAnimal.length > 0 ? pesajesAnimal[0].peso : animal.pesoInicial;
        pesoActualTotal += pesoActual;

        // Calcular días en cebo
        const fechaInicio = new Date(animal.fechaInicio);
        const hoy = new Date();
        const dias = Math.floor((hoy - fechaInicio) / (1000 * 60 * 60 * 24));
        diasTotal += dias;

        // GMD
        if (dias > 0) {
            gmdTotal += ((pesoActual - animal.pesoInicial) / dias) * 1000;
        }
    });

    const pesoInicialMedio = pesoInicialTotal / animales.length;
    const pesoActualMedio = pesoActualTotal / animales.length;
    const gmdMedio = gmdTotal / animales.length;
    const diasMedio = diasTotal / animales.length;

    // Consumo total
    const consumoTotal = consumos.reduce((acc, c) => acc + (c.piensoOfrecido - c.piensoRechazado), 0);

    elemento.innerHTML = `
        <div class="stat">
            <span>Animales activos:</span>
            <span class="stat-value">${animales.length}</span>
        </div>
        <div class="stat">
            <span>Peso inicial medio:</span>
            <span class="stat-value">${pesoInicialMedio.toFixed(2)} kg</span>
        </div>
        <div class="stat">
            <span>Peso actual medio:</span>
            <span class="stat-value">${pesoActualMedio.toFixed(2)} kg</span>
        </div>
        <div class="stat">
            <span>Ganancia media:</span>
            <span class="stat-value">${(pesoActualMedio - pesoInicialMedio).toFixed(2)} kg</span>
        </div>
        <div class="stat">
            <span>GMD medio:</span>
            <span class="stat-value">${gmdMedio.toFixed(0)} g/día</span>
        </div>
        <div class="stat">
            <span>Días en cebo (media):</span>
            <span class="stat-value">${diasMedio.toFixed(0)} días</span>
        </div>
        <div class="stat">
            <span>Consumo total pienso:</span>
            <span class="stat-value">${consumoTotal.toFixed(2)} kg</span>
        </div>
    `;
}

function actualizarTablaEvolucion() {
    const tbody = document.querySelector('#tabla-evolucion tbody');
    const animales = cargarDatos('animales');
    const pesajes = cargarDatos('pesajes');

    tbody.innerHTML = animales.map(animal => {
        // Obtener último peso
        const pesajesAnimal = pesajes
            .filter(p => p.crotal === animal.crotal)
            .sort((a, b) => new Date(b.fecha) - new Date(a.fecha));

        const pesoActual = pesajesAnimal.length > 0 ? pesajesAnimal[0].peso : animal.pesoInicial;
        const ganancia = pesoActual - animal.pesoInicial;

        // Calcular días y GMD
        const fechaInicio = new Date(animal.fechaInicio);
        const hoy = new Date();
        const dias = Math.floor((hoy - fechaInicio) / (1000 * 60 * 60 * 24));
        const gmd = dias > 0 ? Math.round((ganancia / dias) * 1000) : 0;

        return `
            <tr>
                <td><strong>${animal.crotal}</strong></td>
                <td><span class="badge badge-${animal.grupo.toLowerCase()}">${animal.grupo}</span></td>
                <td>${animal.pesoInicial.toFixed(1)} kg</td>
                <td>${pesoActual.toFixed(1)} kg</td>
                <td>${ganancia >= 0 ? '+' : ''}${ganancia.toFixed(2)} kg</td>
                <td>${gmd} g</td>
                <td>${dias}</td>
            </tr>
        `;
    }).join('');

    if (animales.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" style="text-align: center; color: #64748b;">No hay animales registrados</td></tr>';
    }
}

function actualizarTablaConversion() {
    const tbody = document.querySelector('#tabla-conversion tbody');
    const animales = cargarDatos('animales');
    const pesajes = cargarDatos('pesajes');
    const consumos = cargarDatos('consumo');

    const grupos = ['A', 'B'];

    tbody.innerHTML = grupos.map(grupo => {
        const animalesGrupo = animales.filter(a => a.grupo === grupo && a.activo);
        const consumosGrupo = consumos.filter(c => c.grupo === grupo);

        // Consumo total neto
        const consumoTotal = consumosGrupo.reduce((acc, c) => acc + (c.piensoOfrecido - c.piensoRechazado), 0);

        // Ganancia total del grupo
        let gananciaTotal = 0;
        animalesGrupo.forEach(animal => {
            const pesajesAnimal = pesajes
                .filter(p => p.crotal === animal.crotal)
                .sort((a, b) => new Date(b.fecha) - new Date(a.fecha));

            const pesoActual = pesajesAnimal.length > 0 ? pesajesAnimal[0].peso : animal.pesoInicial;
            gananciaTotal += pesoActual - animal.pesoInicial;
        });

        // Índice de conversión
        const ic = gananciaTotal > 0 ? consumoTotal / gananciaTotal : 0;

        return `
            <tr>
                <td><span class="badge badge-${grupo.toLowerCase()}">${grupo === 'A' ? 'Grupo A (Ad libitum)' : 'Grupo B (85%)'}</span></td>
                <td>${consumoTotal.toFixed(2)} kg</td>
                <td>${gananciaTotal.toFixed(2)} kg</td>
                <td>${ic > 0 ? ic.toFixed(2) : '-'}</td>
            </tr>
        `;
    }).join('');
}

// ==========================================
// EXPORTACIÓN Y BACKUP
// ==========================================

function inicializarExportacion() {
    // Exportar a Excel
    document.getElementById('btn-exportar-excel').addEventListener('click', exportarExcel);

    // Backup JSON
    document.getElementById('btn-backup-json').addEventListener('click', descargarBackupJSON);

    // Restaurar
    document.getElementById('btn-restore').addEventListener('click', restaurarDatos);

    // Limpiar datos
    document.getElementById('btn-limpiar-datos').addEventListener('click', limpiarTodosDatos);

    // Actualizar resultados
    document.getElementById('btn-actualizar-resultados').addEventListener('click', actualizarResultados);
}

function exportarExcel() {
    try {
        if (typeof XLSX === 'undefined') {
            alert('❌ Error: La librería de Excel no está disponible.');
            return;
        }

        const animales = cargarDatos('animales');
        const pesajes = cargarDatos('pesajes');
        const consumos = cargarDatos('consumo');

        // Crear libro de trabajo
        const wb = XLSX.utils.book_new();

        // Hoja de Pesajes (simplificada)
        const datosPesajes = pesajes
            .sort((a, b) => new Date(a.fecha) - new Date(b.fecha))
            .map(p => {
                const animal = animales.find(a => a.crotal === p.crotal);
                return {
                    'Fecha': p.fecha,
                    'Crotal': p.crotal,
                    'Grupo': animal ? animal.grupo : '',
                    'Peso (kg)': p.peso
                };
            });

        if (datosPesajes.length > 0) {
            const wsPesajes = XLSX.utils.json_to_sheet(datosPesajes);
            XLSX.utils.book_append_sheet(wb, wsPesajes, 'Pesajes');
        }

        // Hoja de Consumo (simplificada)
        const datosConsumo = consumos
            .sort((a, b) => new Date(a.fecha) - new Date(b.fecha))
            .map(c => ({
                'Fecha': c.fecha,
                'Grupo': c.grupo,
                'Pienso Ofrecido (kg)': c.piensoOfrecido,
                'Pienso Rechazado (kg)': c.piensoRechazado,
                'Consumo Neto (kg)': (c.piensoOfrecido - c.piensoRechazado).toFixed(2)
            }));

        if (datosConsumo.length > 0) {
            const wsConsumo = XLSX.utils.json_to_sheet(datosConsumo);
            XLSX.utils.book_append_sheet(wb, wsConsumo, 'Consumo');
        }

        if (datosPesajes.length === 0 && datosConsumo.length === 0) {
            alert('⚠️ No hay datos para exportar.');
            return;
        }

        // Descargar
        const fecha = new Date().toISOString().split('T')[0];
        XLSX.writeFile(wb, `TFG_Corderos_${fecha}.xlsx`);

        alert('✅ Excel generado correctamente.');
    } catch (e) {
        console.error('Error al exportar Excel:', e);
        alert('❌ Error: ' + e.message);
    }
}

function descargarBackupJSON() {
    if (descargarBackupAutomatico()) {
        alert('✅ Backup guardado como ' + NOMBRE_ARCHIVO_DATOS);
    } else {
        alert('⚠️ No hay datos para guardar.');
    }
}

function restaurarDatos() {
    const input = document.getElementById('input-restore');

    if (!input.files || input.files.length === 0) {
        alert('⚠️ Por favor, selecciona un archivo JSON de backup.');
        return;
    }

    const file = input.files[0];
    const reader = new FileReader();

    reader.onload = (e) => {
        try {
            const datos = JSON.parse(e.target.result);

            if (!datos.animales || !datos.pesajes || !datos.consumo || !datos.incidencias) {
                throw new Error('Formato de archivo inválido');
            }

            if (!confirm('⚠️ Esto reemplazará TODOS los datos actuales. ¿Continuar?')) {
                return;
            }

            guardarDatos('animales', datos.animales);
            guardarDatos('pesajes', datos.pesajes);
            guardarDatos('consumo', datos.consumo);
            guardarDatos('incidencias', datos.incidencias);

            // Actualizar todas las vistas
            renderizarTablaAnimales();
            renderizarTablaPesajes();
            renderizarTablaConsumo();
            renderizarTablaIncidencias();
            actualizarSelectsAnimales();

            alert('✅ Datos restaurados correctamente.');

        } catch (error) {
            console.error('Error al restaurar:', error);
            alert('❌ Error al restaurar los datos: ' + error.message);
        }
    };

    reader.readAsText(file);
}

function limpiarTodosDatos() {
    if (!confirm('⚠️ ¿Estás SEGURO de que quieres eliminar TODOS los datos? Esta acción NO se puede deshacer.')) {
        return;
    }

    if (!confirm('⚠️ ÚLTIMA CONFIRMACIÓN: Se eliminarán todos los animales, pesajes, consumos e incidencias.')) {
        return;
    }

    localStorage.removeItem(STORAGE_KEYS.animales);
    localStorage.removeItem(STORAGE_KEYS.pesajes);
    localStorage.removeItem(STORAGE_KEYS.consumo);
    localStorage.removeItem(STORAGE_KEYS.incidencias);

    // Actualizar todas las vistas
    renderizarTablaAnimales();
    renderizarTablaPesajes();
    renderizarTablaConsumo();
    renderizarTablaIncidencias();
    actualizarSelectsAnimales();

    alert('✅ Todos los datos han sido eliminados.');
}

// ==========================================
// UTILIDADES
// ==========================================

function formatearFecha(fechaStr) {
    const fecha = new Date(fechaStr);
    return fecha.toLocaleDateString('es-ES', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
    });
}

function actualizarSelectsAnimales() {
    const animales = cargarDatos('animales').filter(a => a.activo);

    // Select de pesajes
    const selectPesaje = document.getElementById('pesaje-crotal');
    selectPesaje.innerHTML = '<option value="">Seleccionar animal...</option>' +
        animales.map(a => `<option value="${a.crotal}">${a.crotal} (Grupo ${a.grupo})</option>`).join('');

    // Select de incidencias
    const selectIncidencia = document.getElementById('incidencia-crotal');
    selectIncidencia.innerHTML = '<option value="">Seleccionar animal...</option>' +
        animales.map(a => `<option value="${a.crotal}">${a.crotal} (Grupo ${a.grupo})</option>`).join('');

    // Filtro de pesajes
    const filtroPesaje = document.getElementById('filtro-pesaje-animal');
    const todosAnimales = cargarDatos('animales');
    filtroPesaje.innerHTML = '<option value="">Todos</option>' +
        todosAnimales.map(a => `<option value="${a.crotal}">${a.crotal} (Grupo ${a.grupo})</option>`).join('');

    // Select del modal de pesaje
    const selectModalPesaje = document.getElementById('modal-pesaje-animal');
    if (selectModalPesaje) {
        selectModalPesaje.innerHTML = '<option value="">Seleccionar...</option>' +
            animales.map(a => `<option value="${a.crotal}">${a.crotal} (${a.grupo})</option>`).join('');
    }
}

// ==========================================
// CALENDARIO INTERACTIVO
// ==========================================

// Fechas del estudio (usar formato local para evitar problemas de zona horaria)
const FECHA_INICIO_ESTUDIO = new Date(2025, 11, 23); // 23 de diciembre 2025
const FECHA_FIN_ESTUDIO = new Date(2026, 1, 4);      // 4 de febrero 2026

let calendarioMesActual = 11; // Diciembre (0-indexed)
let calendarioAnioActual = 2025;
let fechaSeleccionada = null;

function inicializarCalendario() {
    // Navegación de meses
    document.getElementById('btn-mes-anterior').addEventListener('click', () => {
        calendarioMesActual--;
        if (calendarioMesActual < 0) {
            calendarioMesActual = 11;
            calendarioAnioActual--;
        }
        renderizarCalendario();
    });

    document.getElementById('btn-mes-siguiente').addEventListener('click', () => {
        calendarioMesActual++;
        if (calendarioMesActual > 11) {
            calendarioMesActual = 0;
            calendarioAnioActual++;
        }
        renderizarCalendario();
    });

    // Cerrar modal
    document.getElementById('modal-cerrar').addEventListener('click', cerrarModalCalendario);
    document.getElementById('modal-calendario').addEventListener('click', (e) => {
        if (e.target.id === 'modal-calendario') cerrarModalCalendario();
    });

    // Tabs del modal
    document.querySelectorAll('.modal-tab').forEach(tab => {
        tab.addEventListener('click', () => {
            document.querySelectorAll('.modal-tab').forEach(t => t.classList.remove('active'));
            tab.classList.add('active');

            const tabId = tab.getAttribute('data-modal-tab');
            document.getElementById('modal-pesaje').style.display = tabId === 'pesaje' ? 'block' : 'none';
            document.getElementById('modal-consumo').style.display = tabId === 'consumo' ? 'block' : 'none';
        });
    });

    // Guardar pesaje desde modal
    document.getElementById('btn-guardar-pesaje-modal').addEventListener('click', guardarPesajeDesdeModal);

    // Guardar consumo desde modal
    document.getElementById('btn-guardar-consumo-modal').addEventListener('click', guardarConsumoDesdeModal);

    renderizarCalendario();
}

function renderizarCalendario() {
    const grid = document.getElementById('calendario-grid');
    const titulo = document.getElementById('calendario-titulo-mes');

    const meses = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
        'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
    const diasSemana = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];

    titulo.textContent = `${meses[calendarioMesActual]} ${calendarioAnioActual}`;

    // Obtener datos para indicadores
    const pesajes = cargarDatos('pesajes');
    const consumos = cargarDatos('consumo');
    const incidencias = cargarDatos('incidencias');

    // Calcular días del mes
    const primerDia = new Date(calendarioAnioActual, calendarioMesActual, 1);
    const ultimoDia = new Date(calendarioAnioActual, calendarioMesActual + 1, 0);
    const diasEnMes = ultimoDia.getDate();

    // Día de la semana del primer día (ajustar para Lunes=0)
    let diaSemanaInicio = primerDia.getDay() - 1;
    if (diaSemanaInicio < 0) diaSemanaInicio = 6;

    let html = '';

    // Headers de días de la semana
    diasSemana.forEach(dia => {
        html += `<div class="calendario-header">${dia}</div>`;
    });

    // Espacios vacíos antes del primer día
    for (let i = 0; i < diaSemanaInicio; i++) {
        html += '<div class="calendario-dia fuera-rango"></div>';
    }

    // Días del mes
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);

    for (let dia = 1; dia <= diasEnMes; dia++) {
        const fechaDia = new Date(calendarioAnioActual, calendarioMesActual, dia);
        // Formato YYYY-MM-DD sin usar toISOString (evita problemas de zona horaria UTC)
        const fechaStr = `${calendarioAnioActual}-${String(calendarioMesActual + 1).padStart(2, '0')}-${String(dia).padStart(2, '0')}`;

        // Verificar si está dentro del rango del estudio
        const dentroRango = fechaDia >= FECHA_INICIO_ESTUDIO && fechaDia <= FECHA_FIN_ESTUDIO;
        const esHoy = fechaDia.getTime() === hoy.getTime();

        // Buscar datos de este día
        const tienePesajes = pesajes.some(p => p.fecha === fechaStr);
        const tieneConsumoA = consumos.some(c => c.fecha === fechaStr && c.grupo === 'A');
        const tieneConsumoB = consumos.some(c => c.fecha === fechaStr && c.grupo === 'B');

        // Detección de incidencias (start day)
        const incidenciasDia = incidencias.filter(i => i.fecha === fechaStr);
        const tieneSintomatologia = incidenciasDia.some(i => i.tipo === 'sintomatologia');
        const tieneRetirada = incidenciasDia.some(i => i.tipo === 'retirada' || i.tipo === 'baja');

        // Detección de tratamientos (incluyendo multi-día)
        const tieneTratamiento = incidencias.some(i => {
            if (i.tipo !== 'tratamiento') return false;

            // Si es el día de inicio
            if (i.fecha === fechaStr) return true;

            // Si tiene duración y el día actual está dentro del rango
            if (i.medicamento && i.medicamento.duracion > 1) {
                const fechaInicio = new Date(i.fecha);
                const fechaActual = new Date(fechaStr);

                // Normalizar a medianoche
                fechaInicio.setHours(0, 0, 0, 0);
                fechaActual.setHours(0, 0, 0, 0);

                const diffTime = fechaActual - fechaInicio;
                const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

                return diffDays > 0 && diffDays < parseInt(i.medicamento.duracion);
            }
            return false;
        });

        let clases = 'calendario-dia';
        if (!dentroRango) clases += ' fuera-rango';
        if (esHoy) clases += ' hoy';

        let indicadores = '';
        if (dentroRango) {
            if (tienePesajes) indicadores += '<span class="indicador indicador-pesaje" title="Pesaje"></span>';
            if (tieneConsumoA) indicadores += '<span class="indicador indicador-consumo-a" title="Consumo A"></span>';
            if (tieneConsumoB) indicadores += '<span class="indicador indicador-consumo-b" title="Consumo B"></span>';

            // Nuevos indicadores de incidencia
            if (tieneSintomatologia) indicadores += '<span class="indicador indicador-sintomatologia" title="Sintomatología"></span>';
            if (tieneTratamiento) indicadores += '<span class="indicador indicador-tratamiento" title="Tratamiento en curso"></span>';
            if (tieneRetirada) indicadores += '<span class="indicador indicador-retirada" title="Retirada/Baja"></span>';
        }

        html += `
            <div class="${clases}" ${dentroRango ? `onclick="abrirModalCalendario('${fechaStr}')"` : ''}>
                <div class="dia-numero">${dia}</div>
                <div class="dia-indicadores">${indicadores}</div>
            </div>
        `;
    }

    grid.innerHTML = html;
}

function abrirModalCalendario(fechaStr) {
    fechaSeleccionada = fechaStr;

    const modal = document.getElementById('modal-calendario');
    const titulo = document.getElementById('modal-titulo');

    // Formatear fecha para título (parseamos manualmente para evitar problemas de zona horaria)
    const [year, month, day] = fechaStr.split('-').map(Number);
    const fecha = new Date(year, month - 1, day);
    titulo.textContent = `📅 ${fecha.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' })}`;

    // Actualizar select de animales
    actualizarSelectsAnimales();

    // Limpiar formularios
    document.getElementById('modal-pesaje-peso').value = '';
    document.getElementById('modal-pesaje-notas').value = '';
    document.getElementById('modal-pienso-ofrecido').value = '0';
    document.getElementById('modal-pienso-rechazado').value = '0';

    // Mostrar resumen del día
    mostrarResumenDia(fechaStr);

    modal.style.display = 'flex';
}

function cerrarModalCalendario() {
    document.getElementById('modal-calendario').style.display = 'none';
    fechaSeleccionada = null;
}

function mostrarResumenDia(fechaStr) {
    const resumen = document.getElementById('modal-resumen-dia');
    const pesajes = cargarDatos('pesajes').filter(p => p.fecha === fechaStr);
    const consumos = cargarDatos('consumo').filter(c => c.fecha === fechaStr);
    // Incidencias del día (inicio)
    const incidenciasInicio = cargarDatos('incidencias').filter(i => i.fecha === fechaStr);

    // Tratamientos activos (multi-día)
    const tratamientosActivos = cargarDatos('incidencias').filter(i => {
        if (i.tipo !== 'tratamiento') return false;

        // Incluir si empieza hoy
        if (i.fecha === fechaStr) return true;

        // Incluir si está en curso
        if (i.medicamento && i.medicamento.duracion > 1) {
            const fechaInicio = new Date(i.fecha);
            const fechaActual = new Date(fechaStr);
            fechaInicio.setHours(0, 0, 0, 0);
            fechaActual.setHours(0, 0, 0, 0);

            const diffTime = fechaActual - fechaInicio;
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

            return diffDays > 0 && diffDays < parseInt(i.medicamento.duracion);
        }
        return false;
    });

    let html = '';

    if (pesajes.length > 0) {
        html += '<div class="dato-item"><strong>⚖️ Pesajes:</strong></div>';
        pesajes.forEach(p => {
            html += `<div class="dato-item">• ${p.crotal}: ${p.peso} kg</div>`;
        });
    }

    if (consumos.length > 0) {
        html += '<div class="dato-item"><strong>🌾 Consumo:</strong></div>';
        consumos.forEach(c => {
            const neto = c.piensoOfrecido - c.piensoRechazado;
            html += `<div class="dato-item">• Grupo ${c.grupo}: ${neto.toFixed(2)} kg neto</div>`;
        });
    }

    // Mostrar incidencias que EMPIEZAN hoy (excepto tratamientos que ya listamos abajo)
    const otrasIncidencias = incidenciasInicio.filter(i => i.tipo !== 'tratamiento');
    if (otrasIncidencias.length > 0) {
        html += '<div class="dato-item"><strong>📋 Incidencias:</strong></div>';
        otrasIncidencias.forEach(i => {
            html += `<div class="dato-item">• ${i.tipo}: ${i.crotal} (${i.descripcion})</div>`;
        });
    }

    if (tratamientosActivos.length > 0) {
        html += '<div class="dato-item"><strong>💉 Tratamientos en curso:</strong></div>';
        tratamientosActivos.forEach(t => {
            const fechaInicio = new Date(t.fecha);
            const fechaActual = new Date(fechaStr);
            fechaInicio.setHours(0, 0, 0, 0);
            fechaActual.setHours(0, 0, 0, 0);

            // Para asegurar cálculo correcto de días
            const diffTime = fechaActual - fechaInicio;
            const diaActual = Math.round(diffTime / (1000 * 60 * 60 * 24)) + 1;
            const totalDias = t.medicamento ? t.medicamento.duracion : 1;

            html += `<div class="dato-item">• ${t.crotal}: ${t.medicamento ? t.medicamento.nombre : 'Tratamiento'} (Día ${diaActual}/${totalDias})</div>`;
        });
    }

    resumen.innerHTML = html || 'Sin registros para este día';
}

function guardarPesajeDesdeModal() {
    const animal = document.getElementById('modal-pesaje-animal').value;
    const peso = parseFloat(document.getElementById('modal-pesaje-peso').value);
    const notas = document.getElementById('modal-pesaje-notas').value.trim();

    if (!animal) {
        alert('⚠️ Selecciona un animal');
        return;
    }

    if (!peso || peso <= 0) {
        alert('⚠️ Introduce un peso válido');
        return;
    }

    const pesaje = {
        id: generarId(),
        crotal: animal,
        fecha: fechaSeleccionada,
        peso: peso,
        semana: calcularSemana(animal, fechaSeleccionada),
        notas: notas,
        fechaRegistro: new Date().toISOString()
    };

    const pesajes = cargarDatos('pesajes');
    pesajes.push(pesaje);
    guardarDatos('pesajes', pesajes);

    // Actualizar vistas
    renderizarCalendario();
    renderizarTablaPesajes();
    mostrarResumenDia(fechaSeleccionada);
    actualizarGraficoPesaje(); // Actualizar gráfico

    // Limpiar formulario
    document.getElementById('modal-pesaje-peso').value = '';
    document.getElementById('modal-pesaje-notas').value = '';

    alert('✅ Pesaje guardado');
}

function guardarConsumoDesdeModal() {
    const grupo = document.getElementById('modal-consumo-grupo').value;
    const piensoOfrecido = parseFloat(document.getElementById('modal-pienso-ofrecido').value) || 0;
    const piensoRechazado = parseFloat(document.getElementById('modal-pienso-rechazado').value) || 0;

    if (piensoOfrecido <= 0) {
        alert('⚠️ Introduce el pienso ofrecido');
        return;
    }

    const consumos = cargarDatos('consumo');

    // Verificar si ya existe
    const existente = consumos.findIndex(c => c.grupo === grupo && c.fecha === fechaSeleccionada);
    if (existente >= 0) {
        consumos.splice(existente, 1);
    }

    const consumo = {
        id: generarId(),
        grupo: grupo,
        fecha: fechaSeleccionada,
        piensoOfrecido: piensoOfrecido,
        piensoRechazado: piensoRechazado,
        forrajeOfrecido: 0,
        forrajeRechazado: 0,
        fechaRegistro: new Date().toISOString()
    };

    consumos.push(consumo);
    guardarDatos('consumo', consumos);

    // Actualizar vistas
    renderizarCalendario();
    renderizarTablaConsumo();
    mostrarResumenDia(fechaSeleccionada);
    actualizarGraficoConsumo(); // Actualizar gráfico

    alert('✅ Consumo guardado');
}

function guardarPesaje() {
    const crotal = document.getElementById('pesaje-crotal').value;
    const fecha = document.getElementById('pesaje-fecha').value;
    const peso = parseFloat(document.getElementById('pesaje-peso').value);
    const semana = parseInt(document.getElementById('pesaje-semana').value) || 0;
    const notas = document.getElementById('pesaje-notas').value.trim();

    if (!crotal || !fecha || !peso) {
        alert('⚠️ Rellena todos los campos obligatorios');
        return;
    }

    const pesaje = {
        id: generarId(),
        crotal: crotal,
        fecha: fecha,
        peso: peso,
        semana: semana,
        notas: notas,
        fechaRegistro: new Date().toISOString()
    };

    const pesajes = cargarDatos('pesajes');
    pesajes.push(pesaje);
    guardarDatos('pesajes', pesajes);

    // Reset form
    document.getElementById('pesaje-peso').value = '';
    document.getElementById('pesaje-notas').value = '';

    renderizarTablaPesajes();
    renderizarCalendario();
    actualizarGraficoPesaje(); // Actualizar gráfico

    alert('✅ Pesaje registrado correctamente');
}

function guardarConsumo() {
    const grupo = document.getElementById('consumo-grupo').value;
    const fecha = document.getElementById('consumo-fecha').value;
    const piensoOfrecido = parseFloat(document.getElementById('consumo-pienso-ofrecido').value);
    const piensoRechazado = parseFloat(document.getElementById('consumo-pienso-rechazado').value) || 0;
    const forrajeOfrecido = parseFloat(document.getElementById('consumo-forraje-ofrecido').value) || 0;
    const forrajeRechazado = parseFloat(document.getElementById('consumo-forraje-rechazado').value) || 0;

    if (!grupo || !fecha || isNaN(piensoOfrecido)) {
        alert('⚠️ Rellena los campos obligatorios');
        return;
    }

    const consumos = cargarDatos('consumo');
    // ... (rest of logic) ...
    // Note: I will need to replace the whole function content to be safe or use targeted replace if I knew exact lines.
    // Since functions are small, replacing works.

    // Verificar si ya existe registro para ese grupo y fecha
    const indiceExistente = consumos.findIndex(c => c.grupo === grupo && c.fecha === fecha);
    if (indiceExistente >= 0) {
        if (!confirm('⚠️ Ya existe un registro de consumo para este grupo y fecha. ¿Deseas sobrescribirlo?')) {
            return;
        }
        consumos.splice(indiceExistente, 1);
    }

    const consumo = {
        id: generarId(),
        grupo: grupo,
        fecha: fecha,
        piensoOfrecido: piensoOfrecido,
        piensoRechazado: piensoRechazado,
        forrajeOfrecido: forrajeOfrecido,
        forrajeRechazado: forrajeRechazado,
        fechaRegistro: new Date().toISOString()
    };

    consumos.push(consumo);
    guardarDatos('consumo', consumos);

    document.getElementById('form-consumo').reset();
    document.getElementById('consumo-fecha').valueAsDate = new Date();

    renderizarTablaConsumo();
    renderizarCalendario();
    actualizarGraficoConsumo(); // Actualizar gráfico

    alert('✅ Consumo diario registrado');
}

// ==========================================
// GRÁFICOS (Chart.js)
// ==========================================

let chartPesaje = null;
let chartConsumo = null;

// Colores del tema vintage/pergamino (basados en la imagen de referencia)
const CHART_COLORS = {
    // Grupo A - Terracota/Naranja rojizo
    terracotta: '#C47A5C',
    terracottaLight: 'rgba(196, 122, 92, 0.25)',
    terracottaDashed: '#B87456',

    // Grupo B - Verde salvia
    sage: '#8FA078',
    sageLight: 'rgba(143, 160, 120, 0.25)',
    sageDashed: '#7A8F68',

    // Colores base del pergamino
    text: '#4A3728',
    textSecondary: '#6B5344',
    grid: '#C9BC9E',
    gridLight: 'rgba(201, 188, 158, 0.5)',
    background: '#F5ECD7',
    border: '#B9A88A'
};

// Plugin personalizado para fondo de pergamino
const pergaminoBackground = {
    id: 'pergaminoBackground',
    beforeDraw: (chart) => {
        const { ctx, chartArea } = chart;
        if (!chartArea) return;

        // Fondo principal de pergamino
        ctx.save();
        ctx.fillStyle = CHART_COLORS.background;
        ctx.fillRect(chartArea.left, chartArea.top, chartArea.width, chartArea.height);

        // Efecto de textura sutil (ruido)
        ctx.globalAlpha = 0.03;
        for (let i = 0; i < 200; i++) {
            const x = chartArea.left + Math.random() * chartArea.width;
            const y = chartArea.top + Math.random() * chartArea.height;
            const size = Math.random() * 2;
            ctx.fillStyle = Math.random() > 0.5 ? '#8B7355' : '#A89880';
            ctx.beginPath();
            ctx.arc(x, y, size, 0, Math.PI * 2);
            ctx.fill();
        }

        // Borde interior con efecto papel viejo
        ctx.globalAlpha = 1;
        ctx.strokeStyle = CHART_COLORS.border;
        ctx.lineWidth = 1;
        ctx.strokeRect(chartArea.left, chartArea.top, chartArea.width, chartArea.height);
        ctx.restore();
    }
};

function inicializarGraficos() {
    // Registrar el plugin de fondo pergamino
    Chart.register(pergaminoBackground);

    // Configuración global de fuentes - Estilo clásico/vintage
    Chart.defaults.font.family = "'Georgia', 'Times New Roman', serif";
    Chart.defaults.font.size = 12;
    Chart.defaults.color = CHART_COLORS.text;

    // Listeners para filtros de gráficos
    document.getElementById('grafico-pesaje-metrica').addEventListener('change', actualizarGraficoPesaje);
    document.getElementById('grafico-consumo-metrica').addEventListener('change', actualizarGraficoConsumo);

    // Opciones comunes de estilo vintage
    const opcionesVintage = {
        responsive: true,
        maintainAspectRatio: false,
        layout: {
            padding: { top: 20, right: 25, bottom: 10, left: 15 }
        },
        interaction: { mode: 'index', intersect: false },
        plugins: {
            legend: {
                position: 'bottom',
                labels: {
                    font: {
                        family: "'Georgia', serif",
                        size: 11,
                        style: 'italic'
                    },
                    color: CHART_COLORS.textSecondary,
                    usePointStyle: true,
                    pointStyle: 'circle',
                    padding: 20,
                    boxWidth: 12,
                    boxHeight: 12
                }
            },
            tooltip: {
                backgroundColor: 'rgba(74, 55, 40, 0.95)',
                titleColor: '#F5ECD7',
                bodyColor: '#F5ECD7',
                borderColor: CHART_COLORS.border,
                borderWidth: 1,
                padding: 12,
                cornerRadius: 4,
                titleFont: {
                    family: "'Georgia', serif",
                    size: 13,
                    weight: 'bold'
                },
                bodyFont: {
                    family: "'Georgia', serif",
                    size: 12
                },
                callbacks: {
                    label: function (context) {
                        let label = context.dataset.label || '';
                        if (label) label += ': ';
                        if (context.parsed.y !== null) {
                            label += context.parsed.y.toFixed(2);
                        }
                        return label;
                    }
                }
            }
        },
        scales: {
            x: {
                grid: {
                    color: CHART_COLORS.gridLight,
                    lineWidth: 1,
                    drawBorder: true
                },
                border: {
                    color: CHART_COLORS.text,
                    width: 2
                },
                ticks: {
                    font: {
                        family: "'Georgia', serif",
                        size: 11,
                        style: 'italic'
                    },
                    color: CHART_COLORS.textSecondary
                },
                title: {
                    display: true,
                    text: 'Días de Cebo',
                    font: {
                        family: "'Georgia', serif",
                        size: 13,
                        weight: 'bold',
                        style: 'italic'
                    },
                    color: CHART_COLORS.text,
                    padding: { top: 10 }
                }
            },
            y: {
                beginAtZero: false,
                grid: {
                    color: CHART_COLORS.gridLight,
                    lineWidth: 1,
                    drawBorder: true
                },
                border: {
                    color: CHART_COLORS.text,
                    width: 2
                },
                ticks: {
                    font: {
                        family: "'Georgia', serif",
                        size: 11
                    },
                    color: CHART_COLORS.textSecondary
                }
            }
        }
    };

    // Crear gráfica de Pesaje (Líneas)
    const ctxPesaje = document.getElementById('grafico-pesaje').getContext('2d');
    chartPesaje = new Chart(ctxPesaje, {
        type: 'line',
        data: { labels: [], datasets: [] },
        options: {
            ...opcionesVintage,
            scales: {
                ...opcionesVintage.scales,
                y: {
                    ...opcionesVintage.scales.y,
                    title: {
                        display: true,
                        text: 'Peso Medio (kg)',
                        font: {
                            family: "'Georgia', serif",
                            size: 13,
                            weight: 'bold'
                        },
                        color: CHART_COLORS.text
                    }
                }
            }
        }
    });

    // Crear gráfica de Consumo (Líneas con estilo vintage, igual que pesajes)
    const ctxConsumo = document.getElementById('grafico-consumo').getContext('2d');
    chartConsumo = new Chart(ctxConsumo, {
        type: 'line',
        data: { labels: [], datasets: [] },
        options: {
            ...opcionesVintage,
            scales: {
                ...opcionesVintage.scales,
                y: {
                    ...opcionesVintage.scales.y,
                    beginAtZero: true,
                    title: {
                        display: true,
                        text: 'Ingesta Media (kg/animal)',
                        font: {
                            family: "'Georgia', serif",
                            size: 13,
                            weight: 'bold'
                        },
                        color: CHART_COLORS.text
                    }
                }
            }
        }
    });

    // Cargar datos iniciales
    actualizarGraficoPesaje();
    actualizarGraficoConsumo();
}

function actualizarGraficoPesaje(datosFiltrados = null) {
    if (!chartPesaje) return;

    const metrica = document.getElementById('grafico-pesaje-metrica').value;
    const pesajes = datosFiltrados || cargarDatos('pesajes');
    const animales = cargarDatos('animales');

    // Agrupar pesajes por fecha
    const fechas = [...new Set(pesajes.map(p => p.fecha))].sort();

    const datosA = [];
    const datosB = [];

    fechas.forEach(fecha => {
        const pesajesFecha = pesajes.filter(p => p.fecha === fecha);

        let sumaA = 0, countA = 0, sumaB = 0, countB = 0;

        pesajesFecha.forEach(p => {
            const animal = animales.find(a => a.crotal === p.crotal);
            if (!animal) return;

            if (animal.grupo === 'A') {
                sumaA += p.peso;
                countA++;
            } else if (animal.grupo === 'B') {
                sumaB += p.peso;
                countB++;
            }
        });

        if (metrica === 'pesoMedio') {
            datosA.push(countA > 0 ? (sumaA / countA) : null);
            datosB.push(countB > 0 ? (sumaB / countB) : null);
        }
    });

    // Placeholder para GMD si se selecciona
    if (metrica === 'gmd') {
        datosA.length = 0; // Limpiar para MVP
        datosB.length = 0;
    }

    chartPesaje.data.labels = fechas.map(f => formatearFecha(f));
    chartPesaje.data.datasets = [
        {
            label: 'Grupo A (Ad libitum + paja)',
            data: datosA,
            borderColor: CHART_COLORS.terracotta,
            backgroundColor: CHART_COLORS.terracottaLight,
            borderWidth: 3,
            pointBackgroundColor: CHART_COLORS.background,
            pointBorderColor: CHART_COLORS.terracotta,
            pointBorderWidth: 2,
            pointRadius: 6,
            pointHoverRadius: 8,
            tension: 0.1,
            spanGaps: true,
            fill: false
        },
        {
            label: 'Grupo B (Ración 85% + Heno de Avena)',
            data: datosB,
            borderColor: CHART_COLORS.sage,
            backgroundColor: CHART_COLORS.sageLight,
            borderWidth: 3,
            pointBackgroundColor: CHART_COLORS.background,
            pointBorderColor: CHART_COLORS.sage,
            pointBorderWidth: 2,
            pointRadius: 6,
            pointHoverRadius: 8,
            tension: 0.1,
            spanGaps: true,
            fill: false
        }
    ];

    chartPesaje.options.scales.y.title = {
        display: true,
        text: metrica === 'pesoMedio' ? 'Peso Medio (kg)' : 'GMD (g/día)',
        color: CHART_COLORS.text,
        font: { family: "'Georgia', serif", weight: 'bold', size: 13 }
    };

    chartPesaje.update();
}

function actualizarGraficoConsumo(datosFiltrados = null) {
    if (!chartConsumo) return;

    const metrica = document.getElementById('grafico-consumo-metrica').value;
    const consumos = datosFiltrados || cargarDatos('consumo');
    const animales = cargarDatos('animales');

    const fechas = [...new Set(consumos.map(c => c.fecha))].sort();

    const datosA = [];
    const datosB = [];

    const activosA = animales.filter(a => a.grupo === 'A' && a.activo).length || 1;
    const activosB = animales.filter(a => a.grupo === 'B' && a.activo).length || 1;

    fechas.forEach(fecha => {
        const consumoA = consumos.find(c => c.fecha === fecha && c.grupo === 'A');
        const consumoB = consumos.find(c => c.fecha === fecha && c.grupo === 'B');

        if (metrica === 'ingesta') {
            if (consumoA) {
                const neto = consumoA.piensoOfrecido - consumoA.piensoRechazado;
                datosA.push(neto / activosA);
            } else {
                datosA.push(0);
            }

            if (consumoB) {
                const neto = consumoB.piensoOfrecido - consumoB.piensoRechazado;
                datosB.push(neto / activosB);
            } else {
                datosB.push(0);
            }
        } else {
            datosA.push(null);
            datosB.push(null);
        }
    });

    chartConsumo.data.labels = fechas.map(f => formatearFecha(f));
    chartConsumo.data.datasets = [
        {
            label: 'Grupo A (Ad libitum + paja)',
            data: datosA,
            borderColor: CHART_COLORS.terracotta,
            backgroundColor: CHART_COLORS.terracottaLight,
            borderWidth: 3,
            pointBackgroundColor: CHART_COLORS.background,
            pointBorderColor: CHART_COLORS.terracotta,
            pointBorderWidth: 2,
            pointRadius: 6,
            pointHoverRadius: 8,
            tension: 0.1,
            spanGaps: true,
            fill: false
        },
        {
            label: 'Grupo B (Ración 85% + Heno de Avena)',
            data: datosB,
            borderColor: CHART_COLORS.sage,
            backgroundColor: CHART_COLORS.sageLight,
            borderWidth: 3,
            pointBackgroundColor: CHART_COLORS.background,
            pointBorderColor: CHART_COLORS.sage,
            pointBorderWidth: 2,
            pointRadius: 6,
            pointHoverRadius: 8,
            tension: 0.1,
            spanGaps: true,
            fill: false
        }
    ];

    chartConsumo.options.scales.y.title = {
        display: true,
        text: metrica === 'ingesta' ? 'Ingesta Media (kg/animal)' : 'Índice Conversión',
        color: CHART_COLORS.text,
        font: { family: "'Georgia', serif", weight: 'bold', size: 13 }
    };

    chartConsumo.update();
}

// ==========================================
// INICIALIZACIÓN
// ==========================================

document.addEventListener('DOMContentLoaded', () => {
    console.log('🐑 TFG Cebo de Corderos - Aplicación inicializada');

    // Inicializar tabs
    inicializarTabs();

    // Inicializar formularios
    inicializarFormAnimales();
    inicializarFormPesajes();
    inicializarFormConsumo();
    inicializarFormIncidencias();

    // Inicializar calendario
    inicializarCalendario();

    // Inicializar gráficos
    if (typeof Chart !== 'undefined') {
        inicializarGraficos();
    } else {
        console.warn('Chart.js no cargado (offline?). Gráficos deshabilitados.');
    }

    // Inicializar exportación
    inicializarExportacion();

    // Renderizar tablas iniciales
    renderizarTablaAnimales();
    renderizarTablaPesajes();
    renderizarTablaConsumo();
    renderizarTablaIncidencias();

    // Inicializar ordenación de tablas
    inicializarOrdenacion();

    // Actualizar selects
    actualizarSelectsAnimales();

    // Configurar auto-guardado
    configurarAutoGuardado();

    // Mostrar estado
    actualizarEstadoGuardado();

    // Inicializar Firebase (sincronización en tiempo real)
    if (typeof initFirebase === 'function') {
        initFirebase();
    }

    console.log('💾 Sistema de auto-guardado activado');
});

function descargarGrafico(chartId, nombreArchivo) {
    const canvas = document.getElementById(chartId);
    if (!canvas) return;

    // Crear un canvas temporal para añadir fondo
    const tempCanvas = document.createElement('canvas');
    const ctx = tempCanvas.getContext('2d');
    tempCanvas.width = canvas.width;
    tempCanvas.height = canvas.height;

    // Rellenar fondo (color crema del tema)
    ctx.fillStyle = '#f5f0e1';
    ctx.fillRect(0, 0, tempCanvas.width, tempCanvas.height);

    // Dibujar el gráfico original
    ctx.drawImage(canvas, 0, 0);

    // Descargar
    const link = document.createElement('a');
    link.download = nombreArchivo;
    link.href = tempCanvas.toDataURL('image/png');
    link.click();
}

// ==========================================
// ORDENACIÓN DE TABLAS
// ==========================================

// Estado de ordenación por tabla
const estadoOrdenacion = {
    'tabla-animales': { columna: null, direccion: 'asc' },
    'tabla-pesajes': { columna: null, direccion: 'asc' },
    'tabla-consumo': { columna: null, direccion: 'asc' },
    'tabla-incidencias': { columna: null, direccion: 'asc' }
};

// Inicializar ordenación en todas las tablas
function inicializarOrdenacion() {
    document.querySelectorAll('th.sortable').forEach(th => {
        th.addEventListener('click', function () {
            const tabla = this.closest('table');
            const tablaId = tabla.id;
            const columna = this.dataset.sort;

            // Determinar dirección
            if (estadoOrdenacion[tablaId].columna === columna) {
                estadoOrdenacion[tablaId].direccion =
                    estadoOrdenacion[tablaId].direccion === 'asc' ? 'desc' : 'asc';
            } else {
                estadoOrdenacion[tablaId].columna = columna;
                estadoOrdenacion[tablaId].direccion = 'asc';
            }

            // Actualizar clases visuales
            tabla.querySelectorAll('th.sortable').forEach(header => {
                header.classList.remove('asc', 'desc');
            });
            this.classList.add(estadoOrdenacion[tablaId].direccion);

            // Renderizar tabla correspondiente
            switch (tablaId) {
                case 'tabla-animales':
                    renderizarTablaAnimales();
                    break;
                case 'tabla-pesajes':
                    renderizarTablaPesajes();
                    break;
                case 'tabla-consumo':
                    renderizarTablaConsumo();
                    break;
                case 'tabla-incidencias':
                    renderizarTablaIncidencias();
                    break;
            }
        });
    });
}

// Función genérica de ordenación
function ordenarDatos(datos, tablaId, getValor) {
    const { columna, direccion } = estadoOrdenacion[tablaId];
    if (!columna) return datos;

    return [...datos].sort((a, b) => {
        let valorA = getValor(a, columna);
        let valorB = getValor(b, columna);

        // Manejar valores null/undefined
        if (valorA == null) valorA = '';
        if (valorB == null) valorB = '';

        // Detectar y convertir fechas (formato YYYY-MM-DD)
        if (columna === 'fecha' || columna === 'fechaInicio') {
            valorA = valorA ? new Date(valorA).getTime() : 0;
            valorB = valorB ? new Date(valorB).getTime() : 0;
        }
        // Detectar números
        else if (typeof valorA === 'number' || !isNaN(parseFloat(valorA))) {
            valorA = parseFloat(valorA) || 0;
            valorB = parseFloat(valorB) || 0;
        }
        // Texto: convertir a minúsculas para comparación
        else if (typeof valorA === 'string') {
            valorA = valorA.toLowerCase();
            valorB = String(valorB).toLowerCase();
        }

        // Comparar
        let resultado = 0;
        if (valorA < valorB) resultado = -1;
        else if (valorA > valorB) resultado = 1;

        return direccion === 'desc' ? -resultado : resultado;
    });
}

// Funciones auxiliares para obtener valores de cada tipo de dato
function getValorAnimal(animal, columna) {
    switch (columna) {
        case 'crotal': return animal.crotal;
        case 'grupo': return animal.grupo;
        case 'pesoInicial': return animal.pesoInicial;
        case 'fechaInicio': return animal.fechaInicio;
        case 'activo': return animal.activo ? 1 : 0;
        default: return '';
    }
}

function getValorPesaje(pesaje, columna, animales) {
    switch (columna) {
        case 'fecha': return pesaje.fecha;
        case 'crotal': return pesaje.crotal;
        case 'grupo':
            const animal = animales.find(a => a.crotal === pesaje.crotal);
            return animal ? animal.grupo : '';
        case 'peso': return pesaje.peso;
        case 'semana': return pesaje.semana;
        case 'gmd': return calcularGMD(pesaje.crotal, pesaje.fecha, pesaje.peso);
        default: return '';
    }
}

function getValorConsumo(consumo, columna) {
    switch (columna) {
        case 'fecha': return consumo.fecha;
        case 'grupo': return consumo.grupo;
        case 'piensoOfrecido': return consumo.piensoOfrecido;
        case 'piensoRechazado': return consumo.piensoRechazado;
        case 'consumoNeto': return consumo.piensoOfrecido - consumo.piensoRechazado;
        case 'forrajeOfrecido': return consumo.forrajeOfrecido || 0;
        case 'forrajeRechazado': return consumo.forrajeRechazado || 0;
        default: return '';
    }
}

function getValorIncidencia(incidencia, columna) {
    switch (columna) {
        case 'fecha': return incidencia.fecha;
        case 'crotal': return incidencia.crotal;
        case 'tipo': return incidencia.tipo;
        default: return '';
    }
}

