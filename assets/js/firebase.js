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
  deleteDoc,
  limit,
  startAfter,
  Timestamp,
  writeBatch,
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

export async function deleteBookFromFirestore(bookId) {
  const bookRef = doc(db, "books", bookId);
  await deleteDoc(bookRef);
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
// 8. Firestore helper functions (History) - OPTIMIZAT
// ==========================================
export async function addHistoryEntry(entry) {
  await addDoc(collection(db, "history"), {
    ...entry,
    timestamp: serverTimestamp(),
  });
}

// NOUA FUNCȚIE - Încarcă istoric cu paginare (lazy loading)
export async function loadHistoryPage(pageSize = 20, lastDoc = null) {
  const historyCol = collection(db, "history");
  
  let q;
  if (lastDoc) {
    // Pentru paginile următoare
    q = query(
      historyCol,
      orderBy("timestamp", "desc"),
      startAfter(lastDoc),
      limit(pageSize)
    );
  } else {
    // Pentru prima pagină
    q = query(
      historyCol,
      orderBy("timestamp", "desc"),
      limit(pageSize)
    );
  }

  const snapshot = await getDocs(q);
  const history = snapshot.docs.map((docSnap) => ({
    id: docSnap.id,
    ...docSnap.data(),
    _doc: docSnap, // Păstrăm referința pentru paginare
  }));

  return {
    data: history,
    lastDoc: snapshot.docs[snapshot.docs.length - 1] || null,
    hasMore: snapshot.docs.length === pageSize,
  };
}

// FUNCȚIE PENTRU REAL-TIME UPDATES DOAR PENTRU PRIMA PAGINĂ
export function onHistoryChangeFirstPage(callback, pageSize = 20) {
  const historyCol = collection(db, "history");
  const q = query(historyCol, orderBy("timestamp", "desc"), limit(pageSize));
  
  return onSnapshot(q, (snapshot) => {
    const history = snapshot.docs.map((docSnap) => ({
      id: docSnap.id,
      ...docSnap.data(),
      _doc: docSnap,
    }));
    callback({
      data: history,
      lastDoc: snapshot.docs[snapshot.docs.length - 1] || null,
      hasMore: snapshot.docs.length === pageSize,
    });
  });
}

// FUNCȚIE PENTRU CLEANUP - Șterge datele mai vechi de 3 luni
export async function cleanupOldHistory() {
  console.log("Starting history cleanup...");
  
  const threeMonthsAgo = new Date();
  threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);
  const threeMonthsAgoTimestamp = Timestamp.fromDate(threeMonthsAgo);
  
  const historyCol = collection(db, "history");
  const oldEntriesQuery = query(
    historyCol,
    where("timestamp", "<=", threeMonthsAgoTimestamp),
    limit(500) // Șterge în batches pentru a evita timeout-urile
  );
  
  try {
    const snapshot = await getDocs(oldEntriesQuery);
    
    if (snapshot.empty) {
      console.log("No old entries to delete.");
      return { deleted: 0, error: null };
    }
    
    // Folosește batch write pentru eficiență
    const batch = writeBatch(db);
    snapshot.docs.forEach((doc) => {
      batch.delete(doc.ref);
    });
    
    await batch.commit();
    
    const deletedCount = snapshot.docs.length;
    console.log(`Deleted ${deletedCount} old history entries.`);
    
    // Dacă am șters exact 500 (batch size), poate mai sunt altele
    if (deletedCount === 500) {
      console.log("More entries might exist, running cleanup again...");
      // Rulează din nou recursiv
      const nextResult = await cleanupOldHistory();
      return { 
        deleted: deletedCount + nextResult.deleted, 
        error: nextResult.error 
      };
    }
    
    return { deleted: deletedCount, error: null };
    
  } catch (error) {
    console.error("Error during cleanup:", error);
    return { deleted: 0, error: error.message };
  }
}

// FUNCȚIE PENTRU CLEANUP AUTOMAT - Rulează la pornirea aplicației
export async function initAutoCleanup() {
  const lastCleanupKey = "lastHistoryCleanup";
  const lastCleanup = localStorage.getItem(lastCleanupKey);
  const now = Date.now();
  const oneWeek = 7 * 24 * 60 * 60 * 1000; // 7 zile în millisecunde
  
  // Rulează cleanup-ul o dată pe săptămână
  if (!lastCleanup || (now - parseInt(lastCleanup)) > oneWeek) {
    console.log("Running scheduled history cleanup...");
    
    try {
      const result = await cleanupOldHistory();
      if (result.error) {
        console.error("Cleanup failed:", result.error);
      } else {
        console.log(`Cleanup successful: ${result.deleted} entries deleted.`);
        localStorage.setItem(lastCleanupKey, now.toString());
      }
    } catch (error) {
      console.error("Auto cleanup failed:", error);
    }
  }
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

// ==========================================
// 9. WRAPPER FUNCTIONS WITH HISTORY LOGGING
// ==========================================

// Wrapper pentru adăugare carte cu istoric
export async function addBook(book, user) {
  await addBookToFirestore(book);
  await addAuthorToFirestore(book.author);
  await logHistory({
    action: "Added Book",
    book: book.title,
    user: user.displayName || user.email || "Unknown User",
    quantity: book.stock || 1,
    notes: `ISBN: ${book.isbn}`,
  });
}

// Wrapper pentru editare carte cu istoric
export async function editBook(bookId, updatedData, user, originalBook) {
  await updateBookInFirestore(bookId, updatedData);
  
  if (updatedData.author) {
    await addAuthorToFirestore(updatedData.author);
  }
  
  const changes = [];
  
  if (originalBook.title !== updatedData.title) {
    changes.push(`Title: "${originalBook.title}" → "${updatedData.title}"`);
  }
  
  if (originalBook.author !== updatedData.author) {
    changes.push(`Author: "${originalBook.author}" → "${updatedData.author}"`);
  }
  
  if (originalBook.stock !== updatedData.stock) {
    changes.push(`Stock: ${originalBook.stock} → ${updatedData.stock}`);
  }
  
  if (originalBook.price !== updatedData.price) {
    changes.push(`Price: ${originalBook.price}€ → ${updatedData.price}€`);
  }
  
  if (originalBook.isbn !== updatedData.isbn) {
    changes.push(`ISBN: "${originalBook.isbn}" → "${updatedData.isbn}"`);
  }
  
  const changesText = changes.length > 0 ? changes.join(", ") : "No changes detected";
  
  await logHistory({
    action: "Edited Book",
    book: originalBook.title,
    user: user.displayName || user.email || "Unknown User",
    quantity: null,
    notes: changesText,
  });
}

// Wrapper pentru ștergere carte cu istoric
export async function deleteBook(bookId, bookTitle, user) {
  await deleteBookFromFirestore(bookId);
  
  await logHistory({
    action: "Deleted Book",
    book: bookTitle,
    user: user.displayName || user.email || "Unknown User",
    quantity: null,
    notes: "",
  });
}

// Wrapper pentru vânzare carte cu istoric
export async function sellBook(bookId, bookTitle, quantitySold, user, notes = "") {
  const bookRef = doc(db, "books", bookId);
  const bookSnap = await getDoc(bookRef);
  if (bookSnap.exists()) {
    const currentQty = bookSnap.data().stock || 0;
    await updateBookInFirestore(bookId, {
      stock: currentQty - quantitySold,
    });
  }

  await logHistory({
    action: "Sold Book",
    book: bookTitle,
    user: user.displayName || user.email || "Unknown User",
    quantity: quantitySold,
    notes: notes,
  });
}