// ==========================================
// FIREBASE SYNC - Sincronización en tiempo real
// ==========================================

let firebaseApp = null;
let firebaseDb = null;
let syncEnabled = false;
let syncListeners = {};

// Inicializar Firebase
function initFirebase() {
    if (!isFirebaseConfigured()) {
        console.log('⚠️ Firebase no configurado. Usando solo localStorage.');
        updateSyncStatus('offline');
        return false;
    }

    try {
        // Inicializar Firebase
        firebaseApp = firebase.initializeApp(firebaseConfig);
        firebaseDb = firebase.database();
        syncEnabled = true;

        console.log('🔥 Firebase conectado correctamente');
        updateSyncStatus('online');

        // Configurar listeners de sincronización en tiempo real
        setupRealtimeListeners();

        // Detectar cambios de conexión
        firebase.database().ref('.info/connected').on('value', (snapshot) => {
            if (snapshot.val() === true) {
                console.log('🟢 Conexión con Firebase establecida');
                updateSyncStatus('online');
            } else {
                console.log('🔴 Sin conexión con Firebase');
                updateSyncStatus('offline');
            }
        });

        return true;
    } catch (error) {
        console.error('❌ Error al inicializar Firebase:', error);
        updateSyncStatus('error');
        return false;
    }
}

// Actualizar indicador visual de sincronización
function updateSyncStatus(status) {
    const indicator = document.getElementById('sync-status');
    if (!indicator) return;

    switch (status) {
        case 'online':
            indicator.innerHTML = '🟢 Sincronizado';
            indicator.className = 'sync-status sync-online';
            break;
        case 'offline':
            indicator.innerHTML = '🔴 Offline (local)';
            indicator.className = 'sync-status sync-offline';
            break;
        case 'syncing':
            indicator.innerHTML = '🔄 Sincronizando...';
            indicator.className = 'sync-status sync-syncing';
            break;
        case 'error':
            indicator.innerHTML = '⚠️ Error de conexión';
            indicator.className = 'sync-status sync-error';
            break;
    }
}

// Configurar listeners en tiempo real para cada colección
function setupRealtimeListeners() {
    const collections = ['animales', 'pesajes', 'consumo', 'incidencias'];

    collections.forEach(collection => {
        const ref = firebaseDb.ref(collection);

        syncListeners[collection] = ref.on('value', (snapshot) => {
            const data = snapshot.val();
            if (data) {
                // Convertir objeto a array
                const dataArray = Object.values(data);

                // Guardar en localStorage como backup
                localStorage.setItem(STORAGE_KEYS[collection], JSON.stringify(dataArray));

                // Re-renderizar si es necesario (evitar loops)
                if (!window.isLocalUpdate) {
                    console.log(`📥 Datos de ${collection} actualizados desde Firebase`);
                    refreshUI(collection);
                }
            }
        }, (error) => {
            console.error(`Error al escuchar ${collection}:`, error);
        });
    });
}

// Refrescar la UI según la colección actualizada
function refreshUI(collection) {
    switch (collection) {
        case 'animales':
            renderizarTablaAnimales();
            actualizarSelectsAnimales();
            break;
        case 'pesajes':
            renderizarTablaPesajes();
            break;
        case 'consumo':
            renderizarTablaConsumo();
            break;
        case 'incidencias':
            renderizarTablaIncidencias();
            break;
    }

    // Actualizar calendario si existe
    if (typeof renderizarCalendario === 'function') {
        renderizarCalendario();
    }
}

// Guardar datos en Firebase
async function guardarEnFirebase(collection, datos) {
    if (!syncEnabled || !firebaseDb) return false;

    try {
        updateSyncStatus('syncing');

        // Convertir array a objeto con IDs como claves
        const dataObject = {};
        datos.forEach(item => {
            if (item.id) {
                dataObject[item.id] = item;
            }
        });

        await firebaseDb.ref(collection).set(dataObject);

        updateSyncStatus('online');
        console.log(`📤 ${collection} guardado en Firebase`);
        return true;
    } catch (error) {
        console.error(`Error al guardar ${collection} en Firebase:`, error);
        updateSyncStatus('error');
        return false;
    }
}

// Cargar datos desde Firebase (con fallback a localStorage)
async function cargarDesdeFirebase(collection) {
    if (!syncEnabled || !firebaseDb) {
        // Fallback a localStorage
        return JSON.parse(localStorage.getItem(STORAGE_KEYS[collection]) || '[]');
    }

    try {
        const snapshot = await firebaseDb.ref(collection).once('value');
        const data = snapshot.val();

        if (data) {
            return Object.values(data);
        }
        return [];
    } catch (error) {
        console.error(`Error al cargar ${collection} desde Firebase:`, error);
        // Fallback a localStorage
        return JSON.parse(localStorage.getItem(STORAGE_KEYS[collection]) || '[]');
    }
}

// Sincronizar datos locales con Firebase (subir todo)
async function syncLocalToFirebase() {
    if (!syncEnabled) {
        alert('⚠️ Firebase no está configurado. Edita firebase-config.js con tus credenciales.');
        return;
    }

    const collections = ['animales', 'pesajes', 'consumo', 'incidencias'];

    updateSyncStatus('syncing');

    try {
        for (const collection of collections) {
            const localData = JSON.parse(localStorage.getItem(STORAGE_KEYS[collection]) || '[]');
            if (localData.length > 0) {
                await guardarEnFirebase(collection, localData);
            }
        }

        updateSyncStatus('online');
        alert('✅ Datos sincronizados con Firebase correctamente');
    } catch (error) {
        updateSyncStatus('error');
        alert('❌ Error al sincronizar: ' + error.message);
    }
}

// Forzar descarga desde Firebase
async function syncFirebaseToLocal() {
    if (!syncEnabled) {
        alert('⚠️ Firebase no está configurado.');
        return;
    }

    const collections = ['animales', 'pesajes', 'consumo', 'incidencias'];

    updateSyncStatus('syncing');

    try {
        for (const collection of collections) {
            const firebaseData = await cargarDesdeFirebase(collection);
            localStorage.setItem(STORAGE_KEYS[collection], JSON.stringify(firebaseData));
            refreshUI(collection);
        }

        updateSyncStatus('online');
        alert('✅ Datos descargados desde Firebase');
    } catch (error) {
        updateSyncStatus('error');
        alert('❌ Error al descargar: ' + error.message);
    }
}
