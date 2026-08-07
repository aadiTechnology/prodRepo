// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyALci4CKZef93zAcIMXdMezcOhqR3ziKFQ",
  authDomain: "smartkidzpreschool.firebaseapp.com",
  projectId: "smartkidzpreschool",
  storageBucket: "smartkidzpreschool.firebasestorage.app",
  messagingSenderId: "462916035047",
  appId: "1:462916035047:web:c04034131f51b319ce9d42",
  measurementId: "G-9KMY9KR6ZZ"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);