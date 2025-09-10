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
  orderBy,
  where,
  getDoc,
  serverTimestamp,
} from "https://www.gstatic.com/firebasejs/12.2.1/firebase-firestore.js";

import {
  getAuth,
  signInWithEmailAndPassword,
  onAuthStateChanged,
  signOut,
} from "https://www.gstatic.com/firebasejs/12.2.1/firebase-auth.js";

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
// 3. Initialize Firebase App, Firestore & Auth
// ==========================================
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
export const db = getFirestore(app);
export const auth = getAuth(app);

// ==========================================
// 4. Firestore helper functions (Books)
// ==========================================
export async function addBookToFirestore(book) {
  await addDoc(collection(db, "books"), book);
}

export function onBooksChange(callback) {
  const booksCol = collection(db, "books");
  return onSnapshot(booksCol, (snapshot) => {
    const books = snapshot.docs.map((docSnap) => ({
      id: docSnap.id,
      ...docSnap.data(),
    }));
    callback(books);
  });
}

export async function updateBookInFirestore(bookId, updatedData) {
  const bookRef = doc(db, "books", bookId);
  await updateDoc(bookRef, updatedData);
}

// ==========================================
// 5. Firestore helper functions (Authors)
// ==========================================
export async function addAuthorToFirestore(authorName) {
  const authorsCol = collection(db, "authors");
  const normalizedNew = authorName.trim().toLowerCase();
  const snapshot = await getDocs(authorsCol);

  const exists = snapshot.docs.some((docSnap) => {
    const existingName = docSnap.data().name.trim().toLowerCase();
    return existingName === normalizedNew;
  });

  if (!exists) {
    await addDoc(authorsCol, { name: authorName });
  }
}

export function onAuthorsChange(callback) {
  const authorsCol = collection(db, "authors");
  return onSnapshot(authorsCol, (snapshot) => {
    const authors = snapshot.docs.map((docSnap) => docSnap.data().name);
    callback(authors);
  });
}

export async function getAuthorsFromFirestore() {
  const authorsCol = collection(db, "authors");
  const snapshot = await getDocs(authorsCol);
  return snapshot.docs.map((docSnap) => ({
    id: docSnap.id,
    ...docSnap.data(),
  }));
}

export async function addBookAndAuthor(book) {
  await addDoc(collection(db, "books"), book);
  await addAuthorToFirestore(book.author);
}

// ==========================================
// 6. Firestore helper functions (Users)
// ==========================================
export async function getUserData(uid) {
  const userRef = doc(db, "users", uid);
  const userSnap = await getDoc(userRef);
  return userSnap.exists() ? userSnap.data() : null;
}

// ==========================================
// 7. Auth helper functions
// ==========================================
export async function loginWithEmail(email, password) {
  const userCredential = await signInWithEmailAndPassword(
    auth,
    email,
    password
  );
  return userCredential.user;
}

export async function logoutUser() {
  await signOut(auth);
}

export function onAuthChange(callback) {
  onAuthStateChanged(auth, callback);
}

// ==========================================
// 8. Firestore helper functions (History)
// ==========================================
export async function addHistoryEntry(entry) {
  await addDoc(collection(db, "history"), {
    ...entry,
    timestamp: serverTimestamp(),
  });
}

export function onHistoryChange(callback) {
  const historyCol = collection(db, "history");
  const q = query(historyCol, orderBy("timestamp", "desc"));
  return onSnapshot(q, (snapshot) => {
    const history = snapshot.docs.map((docSnap) => ({
      id: docSnap.id,
      ...docSnap.data(),
    }));
    callback(history);
  });
}

export async function logHistory({
  action,
  book,
  user,
  quantity = null,
  notes = "",
}) {
  await addHistoryEntry({
    action,
    book,
    user,
    quantity,
    notes,
  });
}

// =================================
// Wrapper pentru adăugare carte
// =================================
export async function addBook(book, user) {
  // adaugă cartea în Firestore
  await addBookToFirestore(book);

  // loghează acțiunea în istoric
  await logHistory({
    action: "Added Book",
    book: book.title,
    user: user.displayName, // doar numele
    quantity: 1,
    notes: "", // gol
  });
}

async function editBook(bookId, updatedData, user) {
  await updateBookInFirestore(bookId, updatedData);
  await logHistory({
    action: "Edited Book",
    book: updatedData.title || "Unknown",
    user: user.displayName, // doar numele
    notes: "", // gol
  });
}

async function deleteBook(bookId, bookTitle, user) {
  await deleteDoc(doc(db, "books", bookId));
  await logHistory({
    action: "Deleted Book",
    book: bookTitle,
    user: user.displayName, // doar numele
    notes: "", // gol
  });
}

async function sellBook(bookId, bookTitle, quantitySold, user, notes = "") {
  // 1. Actualizează stocul
  const bookRef = doc(db, "books", bookId);
  const bookSnap = await getDoc(bookRef);
  if (bookSnap.exists()) {
    const currentQty = bookSnap.data().quantity || 0;
    await updateBookInFirestore(bookId, {
      quantity: currentQty - quantitySold,
    });
  }

  // 2. Adaugă în istoric
  await logHistory({
    action: "Sold Book",
    book: bookTitle,
    user: user.displayName, // doar numele
    quantity: quantitySold,
    notes, // notița introdusă de user
  });
}