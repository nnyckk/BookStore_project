import {
  addBookToFirestore,
  onBooksChange,
  updateBookInFirestore,
  addAuthorToFirestore,
  onAuthorsChange,
  getAuthorsFromFirestore,
  addBookAndAuthor,
  auth,
  logoutUser,
  onHistoryChange,
  addHistoryEntry,
} from "./firebase.js";

document.addEventListener("DOMContentLoaded", async () => {
  // =========================
  // 1. DOM ELEMENTS
  // =========================
  const tableBody = document.querySelector("#bookTable tbody");
  const searchInput = document.getElementById("searchInput");
  const bookCountEl = document.getElementById("bookCount");

  const addBookModal = document.getElementById("addBookModal");
  const openAddBookBtn = document.getElementById("addBook");
  const closeAddBookBtn = addBookModal.querySelector(".close");
  const addBookForm = document.getElementById("addBookForm");
  const addError = document.getElementById("addError");
  const authorInput = document.getElementById("bookAuthor");

  const sellBookModal = document.getElementById("sellBookModal");
  const closeSellBookBtn = sellBookModal.querySelector(".sell-close");
  const sellBookForm = document.getElementById("sellBookForm");
  const sellQuantityInput = document.getElementById("sellQuantity");
  const sellNotesInput = document.getElementById("sellNotes");
  const sellConfirmBtn = sellBookForm.querySelector(".save-btn");
  const sellBookTitle = document.getElementById("sellBookTitle");
  const sellBookAuthor = document.getElementById("sellBookAuthor");
  const sellBookStock = document.getElementById("sellBookStock");
  const sellError = document.getElementById("sellError");

  const titleHeader = document.getElementById("titleHeader");
  const authorHeader = document.getElementById("authorHeader");
  const titleArrow = document.getElementById("titleArrow");
  const authorArrow = document.getElementById("authorArrow");

  const priceArrow = document.getElementById("priceArrow");
  const priceFilter = document.getElementById("priceFilter");
  const minPriceInput = document.getElementById("minPrice");
  const maxPriceInput = document.getElementById("maxPrice");
  const applyPriceFilterBtn = document.getElementById("applyPriceFilter");
  const resetPriceFilter = document.getElementById("resetPriceFilter");

  // =========================
  // 2. STATE VARIABLES
  // =========================
  let books = [];
  let editIndex = null;
  let sellIndex = null;
  let sortState = { title: "asc", author: "asc" };
  let priceFilterState = { min: null, max: null };

  // =========================
  // 3. INITIAL LOAD
  // =========================
  await loadBooks();

  // =========================
  // 4. BOOKS LOADING
  // =========================
  function loadBooks() {
    const booksSpinner = document.getElementById("booksSpinner");
    booksSpinner.style.display = "block"; // Show loading

    // Listen to real-time updates from Firestore
    onBooksChange((updatedBooks) => {
      books = updatedBooks;

      // Restore sort if exists
      const savedSort = localStorage.getItem("sortState");
      if (savedSort) {
        const { by, order } = JSON.parse(savedSort);
        sortState[by] = order;
        sortBooks(by, true); // render with saved sort
      } else {
        renderTable();
      }

      updateNoDataOverlay(books);
      updateBookCount(books);

      booksSpinner.style.display = "none"; // Hide loading
    });
  }

  // =========================
  // 5. TABLE RENDERING
  // =========================
  function renderTable(filteredBooks = null) {
    const list = filteredBooks || books;
    const booksSpinner = document.getElementById("booksSpinner");

    // Show loading
    booksSpinner.style.display = "block";
    tableBody.innerHTML = "";

    list.forEach((book) => {
      const row = document.createElement("tr");
      row.dataset.id = book.id;
      row.innerHTML = `
        <td>${book.title}</td>
        <td>${book.author}</td>
        <td>${book.stock}</td>
        <td>${book.price.toFixed(2)} €</td>
        <td class="has-icon">
          ${book.isbn}
          <span class="edit-icon" data-id="${book.id}" title="Edit">
            <svg xmlns="http://www.w3.org/2000/svg" height="30px" viewBox="0 -960 960 960" width="30px" fill="#3888bc"><path d="M200-120q-33 0-56.5-23.5T120-200v-560q0-33 23.5-56.5T200-840h357l-80 80H200v560h560v-278l80-80v358q0 33-23.5 56.5T760-120H200Zm280-360ZM360-360v-170l367-367q12-12 27-18t30-6q16 0 30.5 6t26.5 18l56 57q11 12 17 26.5t6 29.5q0 15-5.5 29.5T897-728L530-360H360Zm481-424-56-56 56 56ZM440-440h56l232-232-28-28-29-28-231 231v57Zm260-260-29-28 29 28 28 28-28-28Z"/></svg>
          </span>
          <span class="sell-icon" data-id="${book.id}" title="Sell">
            <svg xmlns="http://www.w3.org/2000/svg" height="30px" viewBox="0 -960 960 960" width="30px" fill="#3888bc"><path d="M280-80q-33 0-56.5-23.5T200-160q0-33 23.5-56.5T280-240q33 0 56.5 23.5T360-160q0 33-23.5 56.5T280-80Zm400 0q-33 0-56.5-23.5T600-160q0-33 23.5-56.5T680-240q33 0 56.5 23.5T760-160q0 33-23.5 56.5T680-80ZM246-720l96 200h280l110-200H246Zm-38-80h590q23 0 35 20.5t1 41.5L692-482q-11 20-29.5 31T622-440H324l-44 80h480v80H280q-45 0-68-39.5t-2-78.5l54-98-144-304H40v-80h130l38 80Zm134 280h280-280Z"/></svg>
          </span>
        </td>
      `;

      // Stock coloring
      const stockCell = row.children[2];
      if (book.stock === 0) stockCell.classList.add("stock-zero");
      else if (book.stock < 3) stockCell.classList.add("stock-low");
      else stockCell.classList.remove("stock-zero", "stock-low");

      tableBody.appendChild(row);
    });

    updateRowColors();
    updateSellIcons();

    // Hide loading
    booksSpinner.style.display = "none";
  }

  // =========================
  // 6. UTILITY FUNCTIONS
  // =========================
  function updateNoDataOverlay(list = books) {
    const overlay = document.getElementById("noDataOverlay");
    const tableBox = document.querySelector(".table-box");
    overlay.style.display = list.length === 0 ? "flex" : "none";
    tableBox.classList.toggle("active", list.length === 0);
  }

  function updateSellIcons() {
    document.querySelectorAll(".sell-icon").forEach((icon) => {
      const book = books.find((b) => b.id === icon.dataset.id);
      if (!book) return;
      icon.classList.toggle("disabled", book.stock === 0);
    });
  }

  function updateRowColors() {
    let visibleIndex = 0;
    tableBody.querySelectorAll("tr").forEach((row) => {
      if (row.style.display !== "none") {
        row.style.background =
          visibleIndex % 2 === 0 ? "var(--neutral-50)" : "var(--primary-50)";
        visibleIndex++;
      }
    });
  }

  function updateBookCount(filteredList = books) {
    const total = books.length;
    const shown = filteredList.length;
    bookCountEl.textContent =
      shown === total ? `${total} Books` : `${shown} of ${total} Books`;
  }

  function showSuccessPopup(message) {
    const popup = document.getElementById("successPopup");
    popup.innerHTML = message;
    popup.classList.add("show");
    setTimeout(() => popup.classList.remove("show"), 3000);
  }

  function showAddError(input, message) {
    addError.textContent = message;
    addError.style.display = "flex";
    input.classList.add("invalid");
  }

  function showSellError(input, message) {
    sellError.textContent = message;
    sellError.style.display = "flex";
    input.classList.add("invalid");
  }

  // =========================
  // 7. ADD/EDIT BOOK MODAL
  // =========================
  function openAddBookModal(isEdit = false) {
    addBookModal.style.display = "flex";
    openAddBookBtn.classList.add("active");

    const modalTitle = addBookModal.querySelector("h2");
    const saveBtn = addBookForm.querySelector(".save-btn");

    if (isEdit) {
      modalTitle.textContent = "Edit Book";
      saveBtn.textContent = "Update Book";
    } else {
      addBookForm.reset();
      editIndex = null;
      modalTitle.textContent = "Add Book";
      saveBtn.textContent = "Add Book";
    }
  }

  function closeAddBookModal() {
    addBookModal.style.display = "none";
    openAddBookBtn.classList.remove("active");

    // Reset error messages and invalid classes
    addError.style.display = "none";
    addError.textContent = "";
    [
      document.getElementById("bookTitle"),
      authorInput,
      document.getElementById("bookStock"),
      document.getElementById("bookPrice"),
      document.getElementById("bookIsbn"),
    ].forEach((input) => {
      input.classList.remove("invalid");
    });
  }

  openAddBookBtn.addEventListener("click", () => openAddBookModal(false));
  closeAddBookBtn.addEventListener("click", closeAddBookModal);
  window.addEventListener("click", (e) => {
    if (e.target === addBookModal) closeAddBookModal();
  });

  // =========================
  // 8. ADD/EDIT BOOK FORM
  // =========================
  addBookForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    const titleInput = document.getElementById("bookTitle");
    const stockInput = document.getElementById("bookStock");
    const priceInput = document.getElementById("bookPrice");
    const isbnInput = document.getElementById("bookIsbn");

    addError.style.display = "none";
    [titleInput, authorInput, stockInput, priceInput, isbnInput].forEach((i) =>
      i.classList.remove("invalid")
    );

    // Validation
    if (!titleInput.value.trim())
      return showAddError(titleInput, "Title is required.");
    if (!authorInput.value.trim())
      return showAddError(authorInput, "Author is required.");
    if (
      !stockInput.value ||
      stockInput.value < 0 ||
      !Number.isInteger(+stockInput.value)
    )
      return showAddError(stockInput, "Enter a valid stock number.");
    if (!priceInput.value || +priceInput.value.replace(",", ".") < 0)
      return showAddError(priceInput, "Enter a valid price.");
    if (!isbnInput.value.trim())
      return showAddError(isbnInput, "ISBN is required.");

    // Duplicate ISBN check
    const duplicate = books.find(
      (b) =>
        b.isbn.toLowerCase() === isbnInput.value.trim().toLowerCase() &&
        b.id !== editIndex
    );
    if (duplicate)
      return showAddError(isbnInput, "A book with this ISBN already exists!");

    const bookData = {
      title: titleInput.value.trim(),
      author: authorInput.value.trim(),
      stock: parseInt(stockInput.value),
      price: parseFloat(priceInput.value.replace(",", ".")),
      isbn: isbnInput.value.trim(),
    };

    if (editIndex !== null) {
      await updateBookInFirestore(editIndex, bookData);
      await addAuthorToFirestore(bookData.author);

      closeAddBookModal();
      showSuccessPopup(
        `Book <strong>"${bookData.title}"</strong> updated successfully!`
      );
    } else {
      await addBookAndAuthor(bookData);

      closeAddBookModal();
      showSuccessPopup(
        `Book <strong>"${bookData.title}"</strong> added successfully!`
      );
    }
  });

  // =========================
  // 9. SEARCH & PRICE FILTER
  // =========================
  function applyFilters() {
    const text = searchInput.value.toLowerCase();
    const filtered = books.filter((b) => {
      const matchText =
        b.title.toLowerCase().includes(text) ||
        b.author.toLowerCase().includes(text) ||
        b.isbn.toLowerCase().includes(text);

      const matchPrice =
        (priceFilterState.min === null || b.price >= priceFilterState.min) &&
        (priceFilterState.max === null || b.price <= priceFilterState.max);

      return matchText && matchPrice;
    });

    renderTable(filtered);
    updateBookCount(filtered);
    updateNoDataOverlay(filtered);
  }

  searchInput.addEventListener("input", applyFilters);

  priceArrow.addEventListener("click", () => {
    priceFilter.style.display =
      priceFilter.style.display === "flex" ? "none" : "flex";
  });

  applyPriceFilterBtn.addEventListener("click", () => {
    priceFilterState.min = minPriceInput.value ? +minPriceInput.value : null;
    priceFilterState.max = maxPriceInput.value ? +maxPriceInput.value : null;
    applyFilters();
    priceFilter.style.display = "none";
    priceArrow.classList.toggle(
      "active",
      priceFilterState.min !== null || priceFilterState.max !== null
    );
  });

  resetPriceFilter.addEventListener("click", () => {
    minPriceInput.value = "";
    maxPriceInput.value = "";
    priceFilterState = { min: null, max: null };
    applyFilters();
    priceArrow.classList.remove("active");
    priceFilter.style.display = "none";
  });

  // =========================
  // 10. SORTING
  // =========================
  function sortBooks(by, restore = false) {
    if (!restore) {
      sortState[by] = sortState[by] === "asc" ? "desc" : "asc";
    }
    const order = sortState[by];

    books.sort((a, b) => {
      const valA = typeof a[by] === "string" ? a[by].toLowerCase() : a[by];
      const valB = typeof b[by] === "string" ? b[by].toLowerCase() : b[by];
      return valA < valB
        ? order === "asc"
          ? -1
          : 1
        : valA > valB
        ? order === "asc"
          ? 1
          : -1
        : 0;
    });

    localStorage.setItem("sortState", JSON.stringify({ by, order }));

    const ascSVG = `<svg xmlns="http://www.w3.org/2000/svg" height="30px" viewBox="0 -960 960 960" width="30px" fill="#3888bc"><path d="m280-400 200-200 200 200H280Z"/></svg>`;
    const descSVG = `<svg xmlns="http://www.w3.org/2000/svg" height="30px" viewBox="0 -960 960 960" width="30px" fill="#3888bc"><path d="M480-360 280-560h400L480-360Z"/></svg>`;

    titleArrow.innerHTML = sortState.title === "asc" ? ascSVG : descSVG;
    authorArrow.innerHTML = sortState.author === "asc" ? ascSVG : descSVG;

    applyFilters();
  }

  titleHeader.addEventListener("click", () => sortBooks("title"));
  authorHeader.addEventListener("click", () => sortBooks("author"));

  // =========================
  // 11. EDIT & SELL HANDLERS
  // =========================
  document.addEventListener("click", (e) => {
    const editIcon = e.target.closest(".edit-icon");
    if (editIcon) handleEdit(editIcon.dataset.id);

    const sellIcon = e.target.closest(".sell-icon");
    if (sellIcon) handleSell(sellIcon.dataset.id);
  });

  function handleEdit(id) {
    editIndex = id;
    const book = books.find((b) => b.id === id);
    if (!book) return;

    document.getElementById("bookTitle").value = book.title;
    authorInput.value = book.author;
    document.getElementById("bookStock").value = book.stock;
    document.getElementById("bookPrice").value = book.price;
    document.getElementById("bookIsbn").value = book.isbn;
    openAddBookModal(true);
  }

  function handleSell(id) {
    sellIndex = id;
    const book = books.find((b) => b.id === id);
    if (!book) return;

    sellBookTitle.textContent = book.title;
    sellBookAuthor.textContent = book.author;
    sellBookStock.textContent = book.stock;
    sellQuantityInput.max = book.stock;
    sellQuantityInput.value = book.stock > 0 ? 1 : 0;
    sellConfirmBtn.disabled = book.stock === 0;
    sellNotesInput.value = "";

    // Reset error
    sellQuantityInput.classList.remove("invalid");
    sellError.style.display = "none";
    sellError.textContent = "";

    sellBookModal.style.display = "flex";
  }

  // =========================
  // 12. SELL MODAL
  // =========================
  closeSellBookBtn.addEventListener(
    "click",
    () => (sellBookModal.style.display = "none")
  );
  window.addEventListener("click", (e) => {
    if (e.target === sellBookModal) sellBookModal.style.display = "none";
  });

  sellBookForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const quantity = Number(sellQuantityInput.value);
    const book = books.find((b) => b.id === sellIndex);
    if (!book) return;

    if (!quantity || quantity < 1 || !Number.isInteger(quantity)) {
      return showSellError(sellQuantityInput, "Enter a valid quantity.");
    }

    if (quantity > book.stock) {
      return showSellError(
        sellQuantityInput,
        "You cannot sell more than the available stock."
      );
    }

    sellError.style.display = "none";

    await updateBookInFirestore(sellIndex, { stock: book.stock - quantity });
    await loadBooks();
    sellBookModal.style.display = "none";

    showSuccessPopup(
      `You sold ${quantity} ${quantity === 1 ? "item" : "items"} of <strong>"${
        book.title
      }"</strong> successfully!`
    );
  });

  // =========================
  // 13. AUTHOR AUTOCOMPLETE (REAL-TIME)
  // =========================
  const suggestionBox = document.getElementById("authorSuggestions");
  let selectedIndex = -1;
  let authorsCache = [];

  // Listen to real-time changes in authors collection
  function listenAuthorsRealtime() {
    onAuthorsChange((authors) => {
      authorsCache = authors; // update cache
      updateAuthorSuggestions(); // refresh suggestions if input is not empty
    });
  }

  // Call the listener on page load
  listenAuthorsRealtime();

  // Handle input changes
  authorInput.addEventListener("input", () => {
    selectedIndex = -1; // reset selection on new input
    updateAuthorSuggestions();
  });

  // Keyboard navigation
  authorInput.addEventListener("keydown", (e) => {
    const items = suggestionBox.querySelectorAll(".suggestion-item");
    if (!items.length) return;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      selectedIndex = (selectedIndex + 1) % items.length;
      highlightItem(items);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      selectedIndex = (selectedIndex - 1 + items.length) % items.length;
      highlightItem(items);
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (selectedIndex >= 0 && selectedIndex < items.length) {
        selectAuthor(items[selectedIndex].textContent);
      }
    } else if (e.key === "Escape") {
      clearSuggestions();
    }
  });

  // Close suggestions on outside click
  document.addEventListener("click", (e) => {
    if (!authorInput.contains(e.target) && !suggestionBox.contains(e.target)) {
      clearSuggestions();
    }
  });

  // Update suggestion list
  function updateAuthorSuggestions() {
    const value = authorInput.value.trim().toLowerCase();
    suggestionBox.innerHTML = "";
    suggestionBox.style.display = "none";

    if (!value) return;

    const matches = authorsCache.filter((a) => a.toLowerCase().includes(value));
    if (!matches.length) return;

    matches.forEach((match) => {
      const item = document.createElement("div");
      item.textContent = match;
      item.classList.add("suggestion-item");
      item.addEventListener("click", () => selectAuthor(match));
      suggestionBox.appendChild(item);
    });

    suggestionBox.style.display = "block";
  }

  // Highlight current item
  function highlightItem(items) {
    items.forEach((item, i) => {
      item.classList.toggle("highlight", i === selectedIndex);
    });

    const selectedItem = items[selectedIndex];
    if (selectedItem) {
      selectedItem.scrollIntoView({ block: "nearest" });
    }
  }

  // Select an author from the suggestions
  function selectAuthor(name) {
    authorInput.value = name;
    clearSuggestions();
  }

  // Clear suggestions
  function clearSuggestions() {
    suggestionBox.innerHTML = "";
    suggestionBox.style.display = "none";
    selectedIndex = -1;
  }

  // =========================
  // 14. User Modal & Logout
  // =========================
  const userBtn = document.querySelector(".user-btn");
  const userModal = document.getElementById("userModal");
  const closeUserModal = document.getElementById("closeUserModal");
  const userGreeting = document.getElementById("userGreeting");
  const userEmailEl = document.getElementById("userEmail");
  const userRoleDisplay = document.getElementById("userRoleDisplay");
  const logoutBtn = document.getElementById("logoutBtn");

  const userName = sessionStorage.getItem("userName");
  const userEmail = sessionStorage.getItem("userEmail");
  const userRole = sessionStorage.getItem("userRole");

  if (userName && userEmail) {
    userGreeting.innerHTML = `Hello, ${userName}`;
    userEmailEl.innerHTML = `<strong>Email:</strong> ${userEmail}`;
    userRoleDisplay.innerHTML = userRole
      ? `<strong>Role:</strong> ${userRole}`
      : "";
  } else {
    window.location.href = "index.html";
  }

  userBtn.addEventListener("click", () => {
    userModal.style.display = "flex";
    userBtn.classList.add("active");
  });

  closeUserModal.addEventListener("click", () => {
    userModal.style.display = "none";
    userBtn.classList.remove("active");
  });

  logoutBtn.addEventListener("click", async () => {
    sessionStorage.clear();
    await logoutUser();
    window.location.href = "index.html";
  });

  window.addEventListener("click", (e) => {
    if (e.target === userModal) {
      userModal.style.display = "none";
      userBtn.classList.remove("active");
    }
  });

  // ==========================================
  // Auto Logout after 10 minutes of inactivity
  // ==========================================
  const AUTO_LOGOUT_TIME = 10 * 60 * 1000;
  let logoutTimer;

  function updateLastActivity() {
    sessionStorage.setItem("lastActivity", Date.now());
  }

  function startLogoutTimer() {
    if (logoutTimer) clearTimeout(logoutTimer);
    logoutTimer = setTimeout(async () => {
      sessionStorage.clear();
      await logoutUser();
      alert("You have been logged out due to inactivity.");
      window.location.href = "index.html";
    }, AUTO_LOGOUT_TIME);
  }

  ["click", "mousemove", "keydown", "scroll", "touchstart"].forEach((event) => {
    window.addEventListener(event, () => {
      updateLastActivity();
      startLogoutTimer();
    });
  });

  const lastActivity = sessionStorage.getItem("lastActivity");
  if (lastActivity && Date.now() - lastActivity > AUTO_LOGOUT_TIME) {
    sessionStorage.clear();
    logoutUser();
    alert("You have been logged out due to inactivity.");
    window.location.href = "index.html";
  } else {
    updateLastActivity();
    startLogoutTimer();
  }

  // ==========================================
  // Book and History Buttons
  // ==========================================

  const libraryBtn = document.getElementById("showLibraryTable");
  const historyBtn = document.getElementById("showHistoryTable");

  const bookTableContainer = document.getElementById("bookTableContainer");
  const historyTableContainer = document.getElementById(
    "historyTableContainer"
  );

  function showBookTable() {
    bookTableContainer.style.display = "block";
    historyTableContainer.style.display = "none";
    libraryBtn.classList.add("active");
    historyBtn.classList.remove("active");
    sessionStorage.setItem("activeTab", "books");
  }

  function showHistoryTable() {
    bookTableContainer.style.display = "none";
    historyTableContainer.style.display = "block";
    historyBtn.classList.add("active");
    libraryBtn.classList.remove("active");
    sessionStorage.setItem("activeTab", "history");

    loadHistory();
  }

  // Event listeners
  libraryBtn.addEventListener("click", showBookTable);
  historyBtn.addEventListener("click", showHistoryTable);

  // Local Storage initialization
  const activeTab = sessionStorage.getItem("activeTab");
  if (activeTab === "history") {
    showHistoryTable();
  } else {
    showBookTable();
  }

  // =========================
  // HISTORY LOADING & RENDER
  // =========================
  const historyTableBody = document.getElementById("historyTableBody");
  const noHistoryOverlay = document.getElementById("noHistoryOverlay");
  const historySpinner = document.getElementById("historySpinner"); // sau creează un spinner separat pentru istoric

  function loadHistory() {
    historySpinner.style.display = "flex"; // arată spinnerul

    onHistoryChange((historyList) => {
      historySpinner.style.display = "none"; // ascunde spinnerul

      if (!historyList.length) {
        noHistoryOverlay.style.display = "flex";
        historyTableBody.innerHTML = "";
        return;
      }

      noHistoryOverlay.style.display = "none";
      renderHistory(historyList);
    });
  }

  function renderHistory(historyList) {
    historyTableBody.innerHTML = "";

    historyList.forEach((entry) => {
      const date = entry.timestamp?.toDate
        ? entry.timestamp.toDate().toLocaleString()
        : "N/A";

      const row = document.createElement("tr");
      row.innerHTML = `
      <td>${entry.action || "-"}</td>
      <td>${entry.book || "-"}</td>
      <td>${entry.user || "-"}</td>
      <td>${entry.quantity ?? "-"}</td>
      <td>${entry.notes || "-"}</td>
      <td>${date}</td>
    `;
      historyTableBody.appendChild(row);
    });
    updateRowColors();
  }

  // Apelează loadHistory când se încarcă pagina
  loadHistory();
});
