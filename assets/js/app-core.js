// ==============================================
// APP-CORE.JS - Core App Logic & Initialization
// ==============================================

import {
  onBooksChange,
  initAutoCleanup,
  addBook,
  editBook,
  sellBook,
  logoutUser,
} from "./firebase.js";

import { setupHistory, loadHistory } from "./history-manager.js";
import { setupAutocomplete } from "./autocomplete.js";

// =========================
// GLOBAL STATE
// =========================
export let books = [];
let editIndex = null;
let sellIndex = null;
export let sortState = { title: "asc", author: "asc" };
export let priceFilterState = { min: null, max: null };
export let currentUser = null;

// DOM Elements
export let elements = {};

// =========================
// STATE MANAGEMENT FUNCTIONS
// =========================
export function setEditIndex(value) {
  editIndex = value;
}

export function setSellIndex(value) {
  sellIndex = value;
}

export function getEditIndex() {
  return editIndex;
}

export function getSellIndex() {
  return sellIndex;
}

// =========================
// INITIALIZATION
// =========================
document.addEventListener("DOMContentLoaded", async () => {
  // Initialize DOM elements
  initializeDOMElements();

  // Initialize auto cleanup and load books
  await initAutoCleanup();

  // Set up user data
  setupUserData();

  // Set up components
  setupHistory();
  setupAutocomplete();
  setupTabNavigation();
  setupEventListeners();

  // Load initial data
  await loadBooks();
});

// =========================
// DOM ELEMENTS INITIALIZATION
// =========================
function initializeDOMElements() {
  elements = {
    // Book table elements
    tableBody: document.querySelector("#bookTable tbody"),
    searchInput: document.getElementById("searchInput"),
    bookCountEl: document.getElementById("bookCount"),

    // Modal elements
    addBookModal: document.getElementById("addBookModal"),
    openAddBookBtn: document.getElementById("addBook"),
    closeAddBookBtn: document
      .getElementById("addBookModal")
      .querySelector(".close"),
    addBookForm: document.getElementById("addBookForm"),
    addError: document.getElementById("addError"),
    authorInput: document.getElementById("bookAuthor"),

    // Sell modal elements
    sellBookModal: document.getElementById("sellBookModal"),
    closeSellBookBtn: document
      .getElementById("sellBookModal")
      .querySelector(".sell-close"),
    sellBookForm: document.getElementById("sellBookForm"),
    sellQuantityInput: document.getElementById("sellQuantity"),
    sellNotesInput: document.getElementById("sellNotes"),
    sellConfirmBtn: document
      .getElementById("sellBookForm")
      .querySelector(".save-btn"),
    sellBookTitle: document.getElementById("sellBookTitle"),
    sellBookAuthor: document.getElementById("sellBookAuthor"),
    sellBookStock: document.getElementById("sellBookStock"),
    sellError: document.getElementById("sellError"),

    // Sorting elements
    titleHeader: document.getElementById("titleHeader"),
    authorHeader: document.getElementById("authorHeader"),
    titleArrow: document.getElementById("titleArrow"),
    authorArrow: document.getElementById("authorArrow"),

    // Filter elements
    priceArrow: document.getElementById("priceArrow"),
    priceFilter: document.getElementById("priceFilter"),
    minPriceInput: document.getElementById("minPrice"),
    maxPriceInput: document.getElementById("maxPrice"),
    applyPriceFilterBtn: document.getElementById("applyPriceFilter"),
    resetPriceFilter: document.getElementById("resetPriceFilter"),

    // Tab navigation elements
    libraryBtn: document.getElementById("showLibraryTable"),
    historyBtn: document.getElementById("showHistoryTable"),
    bookTableContainer: document.getElementById("bookTableContainer"),
    historyTableContainer: document.getElementById("historyTableContainer"),
  };
}

// =========================
// BOOKS LOADING & RENDERING
// =========================
function loadBooks() {
  const booksSpinner = document.getElementById("booksSpinner");
  booksSpinner.style.display = "block";

  // Listen to real-time updates from Firestore
  onBooksChange((updatedBooks) => {
    books = updatedBooks;

    // Restore sort if exists
    const savedSort = localStorage.getItem("sortState");
    if (savedSort) {
      const { by, order } = JSON.parse(savedSort);
      sortState[by] = order;
      sortBooks(by, true);
    } else {
      renderTable();
    }

    updateNoDataOverlay(books);
    updateBookCount(books);
    booksSpinner.style.display = "none";
  });
}

export function renderTable(filteredBooks = null) {
  const list = filteredBooks || books;
  const booksSpinner = document.getElementById("booksSpinner");

  booksSpinner.style.display = "block";
  elements.tableBody.innerHTML = "";

  const fragment = document.createDocumentFragment();

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
        ${
          currentUser?.role === "admin"
            ? `
          <span class="delete-icon" data-id="${book.id}" title="Delete">
            <svg xmlns="http://www.w3.org/2000/svg" height="30px" viewBox="0 -960 960 960" width="30px" fill="#3888bc"><path d="M280-120q-33 0-56.5-23.5T200-200v-520h-40v-80h200v-40h240v40h200v80h-40v520q0 33-23.5 56.5T680-120H280Zm400-600H280v520h400v-520ZM360-280h80v-360h-80v360Zm160 0h80v-360h-80v360ZM280-720v520-520Z"/></svg>
          </span>
        `
            : ""
        }
      </td>
    `;

    // Apply stock coloring
    const stockCell = row.children[2];
    if (book.stock === 0) stockCell.classList.add("stock-zero");
    else if (book.stock < 3) stockCell.classList.add("stock-low");
    else stockCell.classList.remove("stock-zero", "stock-low");

    fragment.appendChild(row);
    if (currentUser?.role !== 'admin') {
      row.querySelector('.has-icon').classList.add('volunteer-icons');
    }
  });

  elements.tableBody.appendChild(fragment);
  updateRowColors();
  updateSellIcons();
  booksSpinner.style.display = "none";
}

// =========================
// UTILITY FUNCTIONS
// =========================
export function updateNoDataOverlay(list = books) {
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
  elements.tableBody.querySelectorAll("tr").forEach((row) => {
    if (row.style.display !== "none") {
      row.style.background =
        visibleIndex % 2 === 0 ? "var(--neutral-50)" : "var(--primary-50)";
      visibleIndex++;
    }
  });
}

export function updateBookCount(filteredList = books) {
  const total = books.length;
  const shown = filteredList.length;
  elements.bookCountEl.textContent =
    shown === total ? `${total} Books` : `${shown} of ${total} Books`;
}

export function showSuccessPopup(message) {
  const popup = document.getElementById("successPopup");
  popup.innerHTML = message;
  popup.classList.add("show");
  setTimeout(() => popup.classList.remove("show"), 3000);
}

export function showAddError(input, message) {
  elements.addError.textContent = message;
  elements.addError.style.display = "flex";
  input.classList.add("invalid");
}

export function showSellError(input, message) {
  elements.sellError.textContent = message;
  elements.sellError.style.display = "flex";
  input.classList.add("invalid");
}

// =========================
// SEARCH & FILTERING
// =========================
export function applyFilters() {
  const text = elements.searchInput.value.toLowerCase();
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

// =========================
// SORTING
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

  elements.titleArrow.innerHTML = sortState.title === "asc" ? ascSVG : descSVG;
  elements.authorArrow.innerHTML =
    sortState.author === "asc" ? ascSVG : descSVG;

  applyFilters();
}

// =========================
// USER DATA & AUTHENTICATION
// =========================
function setupUserData() {
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
    currentUser = {
      displayName: userName,
      email: userEmail,
      role: userRole,
    };

    userGreeting.innerHTML = `Hello, ${userName}`;
    userEmailEl.innerHTML = `<strong>Email:</strong> ${userEmail}`;
    userRoleDisplay.innerHTML = userRole
      ? `<strong>Role:</strong> ${userRole}`
      : "";
  } else {
    window.location.href = "index.html";
  }

  // User modal event listeners
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

  setupAutoLogout();
}

function setupAutoLogout() {
  const AUTO_LOGOUT_TIME = 10 * 60 * 1000; // 10 minutes
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
}

// =========================
// TAB NAVIGATION
// =========================
function setupTabNavigation() {
  function showBookTable() {
    elements.bookTableContainer.style.display = "block";
    elements.historyTableContainer.style.display = "none";
    elements.libraryBtn.classList.add("active");
    elements.historyBtn.classList.remove("active");
    sessionStorage.setItem("activeTab", "books");
  }

  function showHistoryTable() {
    elements.bookTableContainer.style.display = "none";
    elements.historyTableContainer.style.display = "block";
    elements.historyBtn.classList.add("active");
    elements.libraryBtn.classList.remove("active");
    sessionStorage.setItem("activeTab", "history");
    loadHistory();
  }

  elements.libraryBtn.addEventListener("click", showBookTable);
  elements.historyBtn.addEventListener("click", showHistoryTable);

  // Initialize active tab
  const activeTab = sessionStorage.getItem("activeTab");
  if (activeTab === "history") {
    showHistoryTable();
  } else {
    showBookTable();
  }
}

// =========================
// EVENT LISTENERS SETUP
// =========================
function setupEventListeners() {
  // Search
  elements.searchInput.addEventListener("input", applyFilters);

  // Sorting
  elements.titleHeader.addEventListener("click", () => sortBooks("title"));
  elements.authorHeader.addEventListener("click", () => sortBooks("author"));

  // Price filter
  elements.priceArrow.addEventListener("click", () => {
    elements.priceFilter.style.display =
      elements.priceFilter.style.display === "flex" ? "none" : "flex";
  });

  elements.applyPriceFilterBtn.addEventListener("click", () => {
    priceFilterState.min = elements.minPriceInput.value
      ? +elements.minPriceInput.value
      : null;
    priceFilterState.max = elements.maxPriceInput.value
      ? +elements.maxPriceInput.value
      : null;
    applyFilters();
    elements.priceFilter.style.display = "none";
    elements.priceArrow.classList.toggle(
      "active",
      priceFilterState.min !== null || priceFilterState.max !== null
    );
  });

  elements.resetPriceFilter.addEventListener("click", () => {
    elements.minPriceInput.value = "";
    elements.maxPriceInput.value = "";
    priceFilterState = { min: null, max: null };
    applyFilters();
    elements.priceArrow.classList.remove("active");
    elements.priceFilter.style.display = "none";
  });
}