// firebase.js
import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getDatabase, ref, set } from 'firebase/database';

// Your web app's Firebase configuration
const firebaseConfig = {
    apiKey: "AIzaSyA1Eu8xyx7OAQ8y4ng-Fu6phrCWJWHiYlc",
    authDomain: "trial-b04e6.firebaseapp.com",
    databaseURL: "https://trial-b04e6-default-rtdb.firebaseio.com",
    projectId: "trial-b04e6",
    storageBucket: "trial-b04e6.appspot.com",
    messagingSenderId: "870551973559",
    appId: "1:870551973559:web:151d8cb3f567a01109e732",
    measurementId: "G-HM63X09XYF"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase Authentication and Realtime Database
export const auth = getAuth(app);
export const db = getDatabase(app); // Export the Realtime Database reference
