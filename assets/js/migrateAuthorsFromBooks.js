import { getBooksFromFirestore, getAuthorsFromFirestore, addAuthorToFirestore } from "./firebase.js";

async function migrateAuthorsFromBooks() {
  try {
    // 1️⃣ Get all books and extract their authors
    const books = await getBooksFromFirestore();
    const bookAuthors = books.map(b => b.author.trim().toLowerCase());

    // 2️⃣ Get all existing authors from the "authors" collection
    const authors = await getAuthorsFromFirestore();
    const existingAuthors = authors.map(a => a.name.trim().toLowerCase());

    // 3️⃣ Filter out authors that already exist
    const newAuthors = [...new Set(bookAuthors)].filter(a => !existingAuthors.includes(a));

    // 4️⃣ Add the new authors to Firestore
    for (const author of newAuthors) {
      // Use the original casing from books for display purposes
      const originalName = books.find(b => b.author.trim().toLowerCase() === author).author;
      await addAuthorToFirestore(originalName);
      console.log(`Added author: ${originalName}`);
    }

    console.log("Migration complete!");
  } catch (e) {
    console.error("Error migrating authors:", e);
  }
}

// 🔹 Run the migration
migrateAuthorsFromBooks();