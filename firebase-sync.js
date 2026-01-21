// ==========================================
// FIREBASE SYNC - Sincronización en tiempo real
// Con Autenticación de Usuario
// ==========================================

let firebaseApp = null;
let firebaseDb = null;
let firebaseAuth = null;
let syncEnabled = false;
let syncListeners = {};
let currentUser = null;

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
        firebaseAuth = firebase.auth();

        console.log('🔥 Firebase inicializado. Esperando autenticación...');
        updateSyncStatus('offline');

        // Escuchar cambios en el estado de autenticación
        firebaseAuth.onAuthStateChanged((user) => {
            if (user) {
                // Usuario autenticado
                currentUser = user;
                syncEnabled = true;
                console.log('✅ Usuario autenticado:', user.email);
                updateSyncStatus('online');
                updateLoginUI(true, user.email);

                // Configurar listeners de sincronización
                setupRealtimeListeners();

                // Detectar cambios de conexión
                firebase.database().ref('.info/connected').on('value', (snapshot) => {
                    if (snapshot.val() === true) {
                        console.log('🟢 Conexión con Firebase establecida');
                        if (currentUser) updateSyncStatus('online');
                    } else {
                        console.log('🔴 Sin conexión con Firebase');
                        updateSyncStatus('offline');
                    }
                });
            } else {
                // Usuario no autenticado
                currentUser = null;
                syncEnabled = false;
                console.log('🔐 No autenticado. Modo offline.');
                updateSyncStatus('offline');
                updateLoginUI(false, null);

                // Limpiar listeners
                removeRealtimeListeners();
            }
        });

        return true;
    } catch (error) {
        console.error('❌ Error al inicializar Firebase:', error);
        updateSyncStatus('error');
        return false;
    }
}

// ==========================================
// AUTENTICACIÓN
// ==========================================

// Iniciar sesión con email y contraseña
async function loginWithEmail(email, password) {
    if (!firebaseAuth) {
        alert('❌ Firebase no está inicializado.');
        return false;
    }

    try {
        updateSyncStatus('syncing');
        const userCredential = await firebaseAuth.signInWithEmailAndPassword(email, password);
        console.log('✅ Login exitoso:', userCredential.user.email);
        closeLoginModal();
        return true;
    } catch (error) {
        console.error('❌ Error de login:', error);
        let mensaje = 'Error al iniciar sesión.';
        switch (error.code) {
            case 'auth/user-not-found':
                mensaje = 'Usuario no encontrado. Verifica tu email.';
                break;
            case 'auth/wrong-password':
                mensaje = 'Contraseña incorrecta.';
                break;
            case 'auth/invalid-email':
                mensaje = 'Email no válido.';
                break;
            case 'auth/too-many-requests':
                mensaje = 'Demasiados intentos. Espera un momento.';
                break;
        }
        alert('❌ ' + mensaje);
        updateSyncStatus('error');
        return false;
    }
}

// Cerrar sesión
async function logout() {
    if (!firebaseAuth) return;

    try {
        await firebaseAuth.signOut();
        console.log('👋 Sesión cerrada');
    } catch (error) {
        console.error('Error al cerrar sesión:', error);
    }
}

// Mostrar modal de login
function showLoginModal() {
    const modal = document.getElementById('login-modal');
    if (modal) {
        modal.style.display = 'flex';
        document.getElementById('login-email').focus();
    }
}

// Cerrar modal de login
function closeLoginModal() {
    const modal = document.getElementById('login-modal');
    if (modal) {
        modal.style.display = 'none';
        document.getElementById('login-email').value = '';
        document.getElementById('login-password').value = '';
    }
}

// Actualizar UI según estado de login
function updateLoginUI(isLoggedIn, email) {
    const loginBtn = document.getElementById('btn-login');
    const logoutBtn = document.getElementById('btn-logout');
    const userInfo = document.getElementById('user-info');

    if (loginBtn) loginBtn.style.display = isLoggedIn ? 'none' : 'inline-flex';
    if (logoutBtn) logoutBtn.style.display = isLoggedIn ? 'inline-flex' : 'none';
    if (userInfo) userInfo.textContent = isLoggedIn ? email : '';
}

// Limpiar listeners de Firebase
function removeRealtimeListeners() {
    const collections = ['animales', 'pesajes', 'consumo', 'incidencias'];
    collections.forEach(collection => {
        if (syncListeners[collection] && firebaseDb) {
            firebaseDb.ref(collection).off('value', syncListeners[collection]);
            delete syncListeners[collection];
        }
    });
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
