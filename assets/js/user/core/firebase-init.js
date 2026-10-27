if (!firebase.apps.length) firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.database();
const analytics = firebase.analytics(); // এই লাইনটি নতুন যুক্ত করবেন
