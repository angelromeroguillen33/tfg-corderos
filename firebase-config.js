// ==========================================
// CONFIGURACIÓN DE FIREBASE
// ==========================================
// 
// ✅ CONFIGURADO CORRECTAMENTE
// Proyecto: tfg-cebo-de-corderos
//
// ==========================================

// Configuración de Firebase (NO USAR IMPORTS - usamos versión compat)
const firebaseConfig = {
    apiKey: "AIzaSyDhOjC8OwxpknuuajFr9atQ6w9hZAC6M8U",
    authDomain: "tfg-cebo-de-corderos.firebaseapp.com",
    databaseURL: "https://tfg-cebo-de-corderos-default-rtdb.europe-west1.firebasedatabase.app",
    projectId: "tfg-cebo-de-corderos",
    storageBucket: "tfg-cebo-de-corderos.firebasestorage.app",
    messagingSenderId: "816271103056",
    appId: "1:816271103056:web:52b68056c245494b772d55"
};

// NO MODIFICAR NADA DEBAJO DE ESTA LÍNEA
// ==========================================

// Verificar si Firebase está configurado
function isFirebaseConfigured() {
    return firebaseConfig.apiKey !== "TU_API_KEY_AQUI" &&
        firebaseConfig.apiKey !== "";
}
