document.addEventListener("DOMContentLoaded", () => {
  
    // =========================================================
    // 2. DOM Elements
    // =========================================================
    const tableBody = document.querySelector("#bookTable tbody");
    const searchInput = document.getElementById("searchInput");
    const addBookModal = document.getElementById("addBookModal");
    const openAddBookBtn = document.getElementById("addBook");
    const closeAddBookBtn = addBookModal.querySelector(".close");
    const addBookForm = document.getElementById("addBookForm");
  
    const sellBookModal = document.getElementById("sellBookModal");
    const closeSellBookBtn = sellBookModal.querySelector(".sell-close");
    const sellBookForm = document.getElementById("sellBookForm");
    const sellQuantityInput = document.getElementById("sellQuantity");
    const sellNotesInput = document.getElementById("sellNotes");
    const sellConfirmBtn = sellBookForm.querySelector(".save-btn");
  
    const sellBookTitle = document.getElementById("sellBookTitle");
    const sellBookAuthor = document.getElementById("sellBookAuthor");
    const sellBookStock = document.getElementById("sellBookStock");
  
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
  
    let books = JSON.parse(localStorage.getItem("books")) || [];
    let editIndex = null; // id-ul cărții
    let sellIndex = null; // id-ul cărții
  
    let sortState = { title: "asc", author: "asc" };
    let priceFilterState = { min: null, max: null };
  
    // =========================================================
    // Generate unique ID for books
    // =========================================================
    function generateUniqueId() {
      return "book-" + Date.now() + "-" + Math.floor(Math.random() * 1000);
    }
  
    // =========================================================
    // Render table
    // =========================================================
    function renderTable(filteredBooks = null) {
      const list = filteredBooks || books;
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
              <svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px" fill="#3888bc">
                <path d="M200-120q-33 0-56.5-23.5T120-200v-560q0-33 23.5-56.5T200-840h357l-80 80H200v560h560v-278l80-80v358q0 33-23.5 56.5T760-120H200Zm280-360ZM360-360v-170l367-367q12-12 27-18t30-6q16 0 30.5 6t26.5 18l56 57q11 12 17 26.5t6 29.5q0 15-5.5 29.5T897-728L530-360H360Zm481-424-56-56 56 56ZM440-440h56l232-232-28-28-29-28-231 231v57Zm260-260-29-28 29 28 28 28-28-28Z"/>
              </svg>
            </span>
            <span class="sell-icon" data-id="${book.id}" title="Sell">
              <svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px" fill="#3888bc">
                <path d="M280-80q-33 0-56.5-23.5T200-160q0-33 23.5-56.5T280-240q33 0 56.5 23.5T360-160q0 33-23.5 56.5T280-80Zm400 0q-33 0-56.5-23.5T600-160q0-33 23.5-56.5T680-240q33 0 56.5 23.5T760-160q0 33-23.5 56.5T680-80ZM246-720l96 200h280l110-200H246Zm-38-80h590q23 0 35 20.5t1 41.5L692-482q-11 20-29.5 31T622-440H324l-44 80h480v80H280q-45 0-68-39.5t-2-78.5l54-98-144-304H40v-80h130l38 80Zm134 280h280-280Z"/>
              </svg>
            </span>
          </td>
        `;
        tableBody.appendChild(row);
      });
  
      updateRowColors();
    }
  
    // =========================================================
    // Alternate row colors
    // =========================================================
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
    // Add / Edit Modal
    // =========================================================
    function openAddBookModal(isEdit = false) {
      addBookModal.style.display = "flex";
      const modalTitle = addBookModal.querySelector("h2");
      const saveBtn = addBookForm.querySelector(".save-btn");
  
      if (!isEdit) {
        addBookForm.reset();
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
    // Add / Edit Book
    // =========================================================
    addBookForm.addEventListener("submit", (e) => {
      e.preventDefault();
  
      const bookData = {
        id: editIndex
          ? books.find((b) => b.id === editIndex).id
          : generateUniqueId(),
        title: document.getElementById("bookTitle").value,
        author: document.getElementById("bookAuthor").value,
        stock: parseInt(document.getElementById("bookStock").value),
        price: parseFloat(
          document.getElementById("bookPrice").value.replace(",", ".")
        ),
        isbn: document.getElementById("bookIsbn").value,
      };
  
      if (editIndex) {
        const bookPos = books.findIndex((b) => b.id === editIndex);
        if (bookPos !== -1) books[bookPos] = bookData;
      } else {
        books.push(bookData);
      }
  
      localStorage.setItem("books", JSON.stringify(books));
      renderTable();
      closeAddBookModal();
    });
  
    // =========================================================
    // Search / Filter
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
    // Sort Books
    // =========================================================
    function sortBooks(by) {
      const order = sortState[by];
  
      books.sort((a, b) => {
        if (a[by].toLowerCase() < b[by].toLowerCase())
          return order === "asc" ? -1 : 1;
        if (a[by].toLowerCase() > b[by].toLowerCase())
          return order === "asc" ? 1 : -1;
        return 0;
      });
  
      sortState[by] = order === "asc" ? "desc" : "asc";
  
      const ascSVG = `<svg xmlns="http://www.w3.org/2000/svg" height="30px" viewBox="0 -960 960 960" width="30px" fill="#3888bc"><path d="m280-400 200-200 200 200H280Z"/></svg>`;
      const descSVG = `<svg xmlns="http://www.w3.org/2000/svg" height="30px" viewBox="0 -960 960 960" width="30px" fill="#3888bc"><path d="M480-360 280-560h400L480-360Z"/></svg>`;
  
      if (by === "title")
        titleArrow.innerHTML = sortState[by] === "asc" ? ascSVG : descSVG;
      if (by === "author")
        authorArrow.innerHTML = sortState[by] === "asc" ? ascSVG : descSVG;
  
      applyFilters();
    }
  
    titleHeader.addEventListener("click", () => sortBooks("title"));
    authorHeader.addEventListener("click", () => sortBooks("author"));
  
    // =========================================================
    // Price Filter
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
    // Edit / Sell Icons
    // =========================================================
    document.addEventListener("click", (e) => {
      const editIcon = e.target.closest(".edit-icon");
      if (editIcon) {
        const bookId = editIcon.dataset.id;
        editIndex = bookId;
        const book = books.find((b) => b.id === bookId);
        if (!book) return;
  
        document.getElementById("bookTitle").value = book.title;
        document.getElementById("bookAuthor").value = book.author;
        document.getElementById("bookStock").value = book.stock;
        document.getElementById("bookPrice").value = book.price;
        document.getElementById("bookIsbn").value = book.isbn;
        openAddBookModal(true);
      }
  
      const sellIcon = e.target.closest(".sell-icon");
      if (sellIcon) {
        const bookId = sellIcon.dataset.id;
        sellIndex = bookId;
        const book = books.find((b) => b.id === bookId);
        if (!book) return;
  
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
    // Sell Modal Close
    // =========================================================
    closeSellBookBtn.addEventListener("click", () => {
      sellBookModal.style.display = "none";
    });
  
    window.addEventListener("click", (e) => {
      if (e.target === sellBookModal) sellBookModal.style.display = "none";
    });
  
    // =========================================================
    // Confirm Sell
    // =========================================================
    sellBookForm.addEventListener("submit", (e) => {
      e.preventDefault();
  
      const quantity = parseInt(sellQuantityInput.value);
      const sellError = document.getElementById("sellError");
  
      if (!quantity || quantity <= 0) {
        sellError.textContent = "Introduceți o cantitate validă.";
        sellError.style.display = "block";
        return;
      }
  
      if (sellIndex) {
        const bookPos = books.findIndex((b) => b.id === sellIndex);
        if (bookPos !== -1) {
          if (quantity > books[bookPos].stock) {
            sellError.textContent =
              "Nu poți vinde mai mult decât există în stoc!";
            sellError.style.display = "block";
            return;
          }
  
          // dacă e valid
          sellError.style.display = "none";
          books[bookPos].stock -= quantity;
          localStorage.setItem("books", JSON.stringify(books));
          renderTable();
          sellBookModal.style.display = "none";
        }
      }
    });
  
    // =========================================================
    // Initial render
    // =========================================================
    renderTable();
  });
  