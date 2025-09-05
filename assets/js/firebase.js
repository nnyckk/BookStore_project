// ==========================================
// 1. Import Firebase modules from CDN
// ==========================================
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.2.1/firebase-app.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/12.2.1/firebase-analytics.js";
import {
  getFirestore,
  collection,
  getDocs,
  addDoc,
  updateDoc,
  doc,
  onSnapshot,
  query,
  where
} from "https://www.gstatic.com/firebasejs/12.2.1/firebase-firestore.js";

// ==========================================
// 2. Firebase configuration
// ==========================================
const firebaseConfig = {
  apiKey: "AIzaSyAcl1hWq4vnXsycpslK8IwgLDxA1fll7iw",
  authDomain: "churchbookstore-9e9f5.firebaseapp.com",
  projectId: "churchbookstore-9e9f5",
  storageBucket: "churchbookstore-9e9f5.firebasestorage.app",
  messagingSenderId: "184074879761",
  appId: "1:184074879761:web:10693f1b8ad82a00e102b0",
  measurementId: "G-C6FEZW7D2G",
};

// ==========================================
// 3. Initialize Firebase App
// ==========================================
const app = initializeApp(firebaseConfig);

// ==========================================
// 4. Initialize Firestore database
// ==========================================
export const db = getFirestore(app);

// ==========================================
// 5. Firestore helper functions (BOOKS)
// ==========================================

export async function addBookToFirestore(book) {
  try {
    const docRef = await addDoc(collection(db, "books"), book);
    console.log("Book added with ID:", docRef.id);
  } catch (e) {
    console.error("Error adding book:", e);
  }
}

/**
 * Listen to real-time updates on books collection
 * @param {Function} callback - Function to call with updated books array
 * @returns unsubscribe function
 */
export function onBooksChange(callback) {
  const booksCol = collection(db, "books");

  const unsubscribe = onSnapshot(booksCol, (snapshot) => {
    const books = snapshot.docs.map((docSnap) => ({
      id: docSnap.id,
      ...docSnap.data(),
    }));
    callback(books);
  });

  return unsubscribe; // you can call unsubscribe() to stop listening
}

export async function updateBookInFirestore(bookId, updatedData) {
  try {
    const bookRef = doc(db, "books", bookId);
    await updateDoc(bookRef, updatedData);
    console.log("Book updated:", bookId);
  } catch (e) {
    console.error("Error updating book:", e);
  }
}

// ==========================================
// 6. Firestore helper functions (AUTHORS)
// ==========================================

export async function addAuthorToFirestore(authorName) {
  try {
    const authorsCol = collection(db, "authors");

    // Normalize name to check for duplicates
    const normalizedNew = authorName.trim().toLowerCase();

    const snapshot = await getDocs(authorsCol);
    const exists = snapshot.docs.some((docSnap) => {
      const existingName = docSnap.data().name.trim().toLowerCase();
      return existingName === normalizedNew;
    });

    if (exists) {
      console.log("Author already exists:", authorName);
      return;
    }

    // Add author in original casing
    const docRef = await addDoc(authorsCol, { name: authorName });
    console.log("Author added with ID:", docRef.id);
  } catch (e) {
    console.error("Error adding author:", e);
  }
}

/**
 * Listen to real-time updates on authors collection
 * @param {Function} callback - Function to call with updated authors array
 * @returns unsubscribe function
 */
export function onAuthorsChange(callback) {
  const authorsCol = collection(db, "authors");

  const unsubscribe = onSnapshot(authorsCol, (snapshot) => {
    const authors = snapshot.docs.map((docSnap) => docSnap.data().name);
    callback(authors);
  });

  return unsubscribe; // call unsubscribe() to stop listening
}

export async function getAuthorsFromFirestore() {
  const authorsCol = collection(db, "authors");
  const snapshot = await getDocs(authorsCol);

  const authors = [];
  snapshot.forEach((docSnap) => {
    authors.push({
      id: docSnap.id,
      ...docSnap.data(),
    });
  });

  return authors;
}

// Add book and ensure author exists
export async function addBookAndAuthor(book) {
  try {
    const docRef = await addDoc(collection(db, "books"), book);
    console.log("Book added with ID:", docRef.id);

    await addAuthorToFirestore(book.author);
  } catch (e) {
    console.error("Error adding book & author:", e);
  }
}
