if (!firebase.apps.length) firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.database();

// Analytics is optional. Ad blockers / unsupported browsers can make
// firebase.analytics() throw, which must never stop the app from starting.
let analytics = null;
try {
    if (typeof firebase.analytics === 'function') analytics = firebase.analytics();
} catch (e) {
    console.warn('[startup] analytics unavailable (non-fatal)', e);
}
