import {
  getBooksFromFirestore,
  addBookToFirestore,
  updateBookInFirestore,
} from "./firebase.js";

document.addEventListener("DOMContentLoaded", async () => {
  // =========================================================
  // 1. DOM Elements
  // =========================================================
  // Table and inputs
  const tableBody = document.querySelector("#bookTable tbody");
  const searchInput = document.getElementById("searchInput");

  // Add Book modal elements
  const addBookModal = document.getElementById("addBookModal");
  const openAddBookBtn = document.getElementById("addBook");
  const closeAddBookBtn = addBookModal.querySelector(".close");
  const addBookForm = document.getElementById("addBookForm");

  // Sell Book modal elements
  const sellBookModal = document.getElementById("sellBookModal");
  const closeSellBookBtn = sellBookModal.querySelector(".sell-close");
  const sellBookForm = document.getElementById("sellBookForm");
  const sellQuantityInput = document.getElementById("sellQuantity");
  const sellNotesInput = document.getElementById("sellNotes");
  const sellConfirmBtn = sellBookForm.querySelector(".save-btn");

  const sellBookTitle = document.getElementById("sellBookTitle");
  const sellBookAuthor = document.getElementById("sellBookAuthor");
  const sellBookStock = document.getElementById("sellBookStock");

  // Sorting headers
  const titleHeader = document.getElementById("titleHeader");
  const authorHeader = document.getElementById("authorHeader");
  const titleArrow = document.getElementById("titleArrow");
  const authorArrow = document.getElementById("authorArrow");

  // Price filter elements
  const priceArrow = document.getElementById("priceArrow");
  const priceFilter = document.getElementById("priceFilter");
  const minPriceInput = document.getElementById("minPrice");
  const maxPriceInput = document.getElementById("maxPrice");
  const applyPriceFilterBtn = document.getElementById("applyPriceFilter");
  const resetPriceFilter = document.getElementById("resetPriceFilter");

  // =========================================================
  // 2. State variables
  // =========================================================
  let books = []; // Array to store all books
  let editIndex = null; // Firestore document ID for editing
  let sellIndex = null; // Firestore document ID for selling

  let sortState = { title: "asc", author: "asc" }; // Current sorting order
  let priceFilterState = { min: null, max: null }; // Price filter state

  // =========================================================
  // 3. Load books from Firestore
  // =========================================================
  async function loadBooks() {
    books = await getBooksFromFirestore(); // Fetch all books from Firestore

    //Restore sorting from localStorage
    const savedSort = localStorage.getItem("sortState");
    if (savedSort) {
      const { by, order } = JSON.parse(savedSort);
      sortState[by] = order; // Restore last order
      sortBooks(by, true); // true = restore mode (do not toggle)
    } else {
      renderTable(); // Render normally if no sort saved
    }

    const overlay = document.getElementById("noDataOverlay");
    const tableBox = document.querySelector(".table-box");

    // Show overlay if no data
    if (books.length === 0) {
      overlay.style.display = "flex";
      tableBox.classList.add("active");
    } else {
      overlay.style.display = "none";
      tableBox.classList.remove("active");
    }
  }

  // =========================================================
  // 4. Render table function
  // =========================================================
  function renderTable(filteredBooks = null) {
    const list = filteredBooks || books; // Use filtered list or all books
    tableBody.innerHTML = ""; // Clear table before rendering

    list.forEach((book) => {
      const row = document.createElement("tr");
      row.dataset.id = book.id; // Store Firestore doc ID in dataset
      row.innerHTML = `
        <td>${book.title}</td>
        <td>${book.author}</td>
        <td>${book.stock}</td>
        <td>${book.price.toFixed(2)} €</td>
        <td class="has-icon">
          ${book.isbn}
          <span class="edit-icon" data-id="${book.id}" title="Edit">
            <svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px" fill="#3888bc"><path d="M200-120q-33 0-56.5-23.5T120-200v-560q0-33 23.5-56.5T200-840h357l-80 80H200v560h560v-278l80-80v358q0 33-23.5 56.5T760-120H200Zm280-360ZM360-360v-170l367-367q12-12 27-18t30-6q16 0 30.5 6t26.5 18l56 57q11 12 17 26.5t6 29.5q0 15-5.5 29.5T897-728L530-360H360Zm481-424-56-56 56 56ZM440-440h56l232-232-28-28-29-28-231 231v57Zm260-260-29-28 29 28 28 28-28-28Z"/></svg>
          </span>
          <span class="sell-icon" data-id="${book.id}" title="Sell">
            <svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px" fill="#3888bc"><path d="M280-80q-33 0-56.5-23.5T200-160q0-33 23.5-56.5T280-240q33 0 56.5 23.5T360-160q0 33-23.5 56.5T280-80Zm400 0q-33 0-56.5-23.5T600-160q0-33 23.5-56.5T680-240q33 0 56.5 23.5T760-160q0 33-23.5 56.5T680-80ZM246-720l96 200h280l110-200H246Zm-38-80h590q23 0 35 20.5t1 41.5L692-482q-11 20-29.5 31T622-440H324l-44 80h480v80H280q-45 0-68-39.5t-2-78.5l54-98-144-304H40v-80h130l38 80Zm134 280h280-280Z"/></svg>
          </span>
        </td>
      `;
      tableBody.appendChild(row);
    });

    updateRowColors(); // Apply alternate row colors
    updateSellIcons(); // Disable sell icons if stock = 0
  }

  // =========================================================
  // 5. Use functions
  // =========================================================

  function updateSellIcons() {
    const sellIcons = document.querySelectorAll(".sell-icon");
    sellIcons.forEach((icon) => {
      const id = icon.dataset.id;
      const book = books.find((b) => b.id === id);
      if (!book) return;

      if (book.stock === 0) {
        icon.classList.add("disabled"); // Make gray and non-clickable
      } else {
        icon.classList.remove("disabled");
      }
    });
  }

  function updateRowColors() {
    const rows = tableBody.querySelectorAll("tr");
    let visibleIndex = 0;
    rows.forEach((row) => {
      if (row.style.display !== "none") {
        row.style.background =
          visibleIndex % 2 === 0 ? "var(--neutral-50)" : "var(--primary-50)";
        visibleIndex++;
      }
    });
  }

  // =========================================================
  // 6. Add / Edit Modal
  // =========================================================
  function openAddBookModal(isEdit = false) {
    addBookModal.style.display = "flex";
    const modalTitle = addBookModal.querySelector("h2");
    const saveBtn = addBookForm.querySelector(".save-btn");

    if (!isEdit) {
      addBookForm.reset(); // Clear form for new book
      editIndex = null;
      modalTitle.textContent = "Add Book";
      saveBtn.textContent = "Add Book";
    } else {
      modalTitle.textContent = "Edit Book";
      saveBtn.textContent = "Update Book";
    }
  }

  function closeAddBookModal() {
    addBookModal.style.display = "none";
  }

  openAddBookBtn.addEventListener("click", () => openAddBookModal(false));
  closeAddBookBtn.addEventListener("click", closeAddBookModal);
  window.addEventListener("click", (e) => {
    if (e.target === addBookModal) closeAddBookModal();
  });

  // =========================================================
  // 7. Add / Edit Book (Firestore)
  // =========================================================
  addBookForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    const bookData = {
      title: document.getElementById("bookTitle").value,
      author: document.getElementById("bookAuthor").value,
      stock: parseInt(document.getElementById("bookStock").value),
      price: parseFloat(
        document.getElementById("bookPrice").value.replace(",", ".")
      ),
      isbn: document.getElementById("bookIsbn").value,
    };

    if (editIndex) {
      await updateBookInFirestore(editIndex, bookData); // Update book in Firestore
      showSuccessPopup(
        `Cartea "${bookData.title}" a fost actualizată cu succes!`
      );
    } else {
      await addBookToFirestore(bookData); // Add new book in Firestore
      showSuccessPopup(`Cartea "${bookData.title}" a fost adăugată cu succes!`);
    }

    await loadBooks(); // Reload books
    closeAddBookModal();
  });

  // =========================================================
  // 8. Search / Filter
  // =========================================================
  function applyFilters() {
    const filterText = searchInput.value.toLowerCase();
    const filteredBooks = books.filter((book) => {
      const textMatch =
        book.title.toLowerCase().includes(filterText) ||
        book.author.toLowerCase().includes(filterText) ||
        book.isbn.toLowerCase().includes(filterText);

      let priceMatch = true;
      if (priceFilterState.min !== null)
        priceMatch = priceMatch && book.price >= priceFilterState.min;
      if (priceFilterState.max !== null)
        priceMatch = priceMatch && book.price <= priceFilterState.max;

      return textMatch && priceMatch;
    });

    renderTable(filteredBooks);

    const overlay = document.getElementById("noDataOverlay");
    const tableBox = document.querySelector(".table-box");

    // Show overlay if no results
    if (filteredBooks.length === 0) {
      overlay.style.display = "flex";
      tableBox.classList.add("active");
    } else {
      overlay.style.display = "none";
      tableBox.classList.remove("active");
    }
  }

  searchInput.addEventListener("input", applyFilters);

  // =========================================================
  // 9. Sort Books
  // =========================================================
  function sortBooks(by, restore = false) {
    // If restoring from localStorage, use saved sortState
    let order = sortState[by];

    // If triggered by a user click, toggle sort direction
    if (!restore) {
      order = order === "asc" ? "desc" : "asc";
      sortState[by] = order;
    }

    // Perform sorting
    books.sort((a, b) => {
      if (a[by].toLowerCase() < b[by].toLowerCase())
        return order === "asc" ? -1 : 1;
      if (a[by].toLowerCase() > b[by].toLowerCase())
        return order === "asc" ? 1 : -1;
      return 0;
    });

    // Save both column (by) and order into localStorage
    localStorage.setItem("sortState", JSON.stringify({ by, order }));

    // SVG arrows
    const ascSVG = `<svg xmlns="http://www.w3.org/2000/svg" height="30px" viewBox="0 -960 960 960" width="30px" fill="#3888bc"><path d="m280-400 200-200 200 200H280Z"/></svg>`;
    const descSVG = `<svg xmlns="http://www.w3.org/2000/svg" height="30px" viewBox="0 -960 960 960" width="30px" fill="#3888bc"><path d="M480-360 280-560h400L480-360Z"/></svg>`;

    titleArrow.innerHTML = sortState.title === "asc" ? ascSVG : descSVG;
    authorArrow.innerHTML = sortState.author === "asc" ? ascSVG : descSVG;

    // Re-apply filters after sorting
    applyFilters();
  }

  titleHeader.addEventListener("click", () => sortBooks("title"));
  authorHeader.addEventListener("click", () => sortBooks("author"));

  // =========================================================
  // 10. Price Filter
  // =========================================================
  priceArrow.addEventListener("click", () => {
    priceFilter.style.display =
      priceFilter.style.display === "flex" ? "none" : "flex";
  });

  applyPriceFilterBtn.addEventListener("click", () => {
    const min = minPriceInput.value ? parseFloat(minPriceInput.value) : null;
    const max = maxPriceInput.value ? parseFloat(maxPriceInput.value) : null;
    priceFilterState.min = min;
    priceFilterState.max = max;

    applyFilters();
    priceFilter.style.display = "none";

    if (min !== null || max !== null) priceArrow.classList.add("active");
    else priceArrow.classList.remove("active");
  });

  resetPriceFilter.addEventListener("click", () => {
    minPriceInput.value = "";
    maxPriceInput.value = "";
    priceFilterState.min = null;
    priceFilterState.max = null;
    priceArrow.classList.remove("active");
    applyFilters();
    priceFilter.style.display = "none";
  });

  // =========================================================
  // 11. Edit / Sell Icons
  // =========================================================
  document.addEventListener("click", (e) => {
    const editIcon = e.target.closest(".edit-icon");
    if (editIcon) {
      editIndex = editIcon.dataset.id;
      const book = books.find((b) => b.id === editIndex);
      if (!book) return;

      // Populate form with selected book data
      document.getElementById("bookTitle").value = book.title;
      document.getElementById("bookAuthor").value = book.author;
      document.getElementById("bookStock").value = book.stock;
      document.getElementById("bookPrice").value = book.price;
      document.getElementById("bookIsbn").value = book.isbn;
      openAddBookModal(true);
    }

    const sellIcon = e.target.closest(".sell-icon");
    if (sellIcon) {
      sellIndex = sellIcon.dataset.id;
      const book = books.find((b) => b.id === sellIndex);
      if (!book) return;

      // Show Sell modal with book data
      sellBookTitle.textContent = book.title;
      sellBookAuthor.textContent = book.author;
      sellBookStock.textContent = book.stock;
      sellQuantityInput.max = book.stock;
      sellQuantityInput.value = book.stock > 0 ? 1 : 0;
      sellConfirmBtn.disabled = book.stock === 0;
      sellNotesInput.value = "";
      sellBookModal.style.display = "flex";
    }
  });

  // =========================================================
  // 12. Sell Modal Close
  // =========================================================
  closeSellBookBtn.addEventListener("click", () => {
    sellBookModal.style.display = "none";
  });

  window.addEventListener("click", (e) => {
    if (e.target === sellBookModal) sellBookModal.style.display = "none";
  });

  // =========================================================
  // 13. Confirm Sell
  // =========================================================

  //PopUp Succes
  function showSuccessPopup(message) {
    const popup = document.getElementById("successPopup");
    popup.textContent = message;
    popup.classList.add("show"); // add class for animation

    setTimeout(() => {
      popup.classList.remove("show"); // remove class after 3s
    }, 3000);
  }

  sellBookForm.addEventListener("submit", async (e) => {
    e.preventDefault(); // Prevent form from submitting normally

    const sellError = document.getElementById("sellError");
    const quantity = Number(sellQuantityInput.value); // Convert input value to number for validation

    const book = books.find((b) => b.id === sellIndex); // Find the selected book
    if (!book) return; // Exit if book not found

    // -------------------------
    // Strict validation
    // -------------------------
    // Check if quantity is a positive integer
    if (!quantity || quantity < 1 || !Number.isInteger(quantity)) {
      sellError.textContent = "Introduceți o cantitate validă.";
      sellError.style.display = "flex";
      return;
    }

    // Check if quantity does not exceed stock
    if (quantity > book.stock) {
      sellError.textContent =
        "Nu se poate vinde mai mult decât există în stoc.";
      sellError.style.display = "flex";
      return;
    }

    // Hide error if validation passes
    sellError.style.display = "none";

    // -------------------------
    // Update Firestore stock
    // -------------------------
    await updateBookInFirestore(sellIndex, {
      stock: book.stock - quantity, // Subtract sold quantity from stock
    });

    await loadBooks(); // Reload table with updated data
    sellBookModal.style.display = "none"; // Close the sell modal

    // -------------------------
    // Show success popup
    // -------------------------
    showSuccessPopup(
      `Ai vândut ${quantity} ${
        quantity === 1 ? "exemplar" : "exemplare"
      } din "${book.title}" cu succes!`
    );
  });

  // =========================================================
  // 14. Initial load
  // =========================================================
  await loadBooks(); // Fetch and display books on page load
});
