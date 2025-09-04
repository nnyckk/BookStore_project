// ==========================================
// 1. Import Firebase modules from CDN
// ==========================================
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.2.1/firebase-app.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/12.2.1/firebase-analytics.js";
import { getFirestore, collection, getDocs, addDoc, updateDoc, doc } from "https://www.gstatic.com/firebasejs/12.2.1/firebase-firestore.js";

// ==========================================
// 2. Firebase configuration
// Replace these values with your Firebase project credentials
// ==========================================
const firebaseConfig = {
  apiKey: "AIzaSyAcl1hWq4vnXsycpslK8IwgLDxA1fll7iw",
  authDomain: "churchbookstore-9e9f5.firebaseapp.com",
  projectId: "churchbookstore-9e9f5",
  storageBucket: "churchbookstore-9e9f5.firebasestorage.app",
  messagingSenderId: "184074879761",
  appId: "1:184074879761:web:10693f1b8ad82a00e102b0",
  measurementId: "G-C6FEZW7D2G"
};

// ==========================================
// 3. Initialize Firebase App
// ==========================================
const app = initializeApp(firebaseConfig);

// ==========================================
// 4. Initialize Firestore database
// Exported so it can be used in other modules if needed
// ==========================================
export const db = getFirestore(app);

// ==========================================
// 5. Firestore helper functions
// ==========================================

/**
 * Add a new book to the "books" collection
 * @param {Object} book - Book object containing data to store
 */
export async function addBookToFirestore(book) {
  try {
    // Add a new document to the "books" collection
    const docRef = await addDoc(collection(db, "books"), book);
    console.log("Document added with ID:", docRef.id); // Log the auto-generated document ID
  } catch (e) {
    console.error("Error adding document:", e);
  }
}

/**
 * Retrieve all books from the "books" collection
 * @returns {Array} - List of books including their document IDs
 */
export async function getBooksFromFirestore() {
  const booksCol = collection(db, "books"); // Reference to "books" collection
  const snapshot = await getDocs(booksCol); // Fetch all documents in the collection

  const books = [];
  snapshot.forEach((docSnap) => {
    // For each document, combine its ID and data into an object
    books.push({
      id: docSnap.id,
      ...docSnap.data(),
    });
  });

  return books;
}

/**
 * Update an existing book in the "books" collection
 * @param {string} bookId - Firestore document ID of the book to update
 * @param {Object} updatedData - Object containing the fields to update
 */
export async function updateBookInFirestore(bookId, updatedData) {
  try {
    const bookRef = doc(db, "books", bookId); // Get reference to the specific book document
    await updateDoc(bookRef, updatedData); // Update the document with new data
    console.log("Document updated:", bookId);
  } catch (e) {
    console.error("Error updating document:", e);
  }
}