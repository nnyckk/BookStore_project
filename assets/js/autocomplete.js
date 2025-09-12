// ==============================================
// AUTOCOMPLETE.JS - Author Autocomplete System
// ==============================================

import { onAuthorsChange } from "./firebase.js";
import { elements } from "./app-core.js";

// =========================
// STATE VARIABLES
// =========================
let suggestionBox;
let selectedIndex = -1;
let authorsCache = [];

// =========================
// INITIALIZATION
// =========================
export function setupAutocomplete() {
  suggestionBox = document.getElementById("authorSuggestions");
  
  // Listen to real-time changes in authors collection
  listenAuthorsRealtime();
  
  // Setup event listeners
  setupEventListeners();
}

// =========================
// AUTHORS DATA MANAGEMENT
// =========================
function listenAuthorsRealtime() {
  onAuthorsChange((authors) => {
    authorsCache = authors;
    updateAuthorSuggestions();
  });
}

// =========================
// EVENT LISTENERS
// =========================
function setupEventListeners() {
  // Input change handler
  elements.authorInput.addEventListener("input", () => {
    selectedIndex = -1;
    updateAuthorSuggestions();
  });

  // Keyboard navigation
  elements.authorInput.addEventListener("keydown", (e) => {
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
    if (!elements.authorInput.contains(e.target) && !suggestionBox.contains(e.target)) {
      clearSuggestions();
    }
  });
}

// =========================
// SUGGESTION MANAGEMENT
// =========================
function updateAuthorSuggestions() {
  const value = elements.authorInput.value.trim().toLowerCase();
  suggestionBox.innerHTML = "";
  suggestionBox.style.display = "none";

  if (!value) return;

  const matches = authorsCache.filter((a) => a.toLowerCase().includes(value));
  if (!matches.length) return;

  const fragment = document.createDocumentFragment();
  matches.forEach((match) => {
    const item = document.createElement("div");
    item.textContent = match;
    item.classList.add("suggestion-item");
    item.addEventListener("click", () => selectAuthor(match));
    fragment.appendChild(item);
  });

  suggestionBox.appendChild(fragment);
  suggestionBox.style.display = "block";
}

function highlightItem(items) {
  items.forEach((item, i) => {
    item.classList.toggle("highlight", i === selectedIndex);
  });

  const selectedItem = items[selectedIndex];
  if (selectedItem) {
    selectedItem.scrollIntoView({ block: "nearest" });
  }
}

function selectAuthor(name) {
  elements.authorInput.value = name;
  clearSuggestions();
}

function clearSuggestions() {
  suggestionBox.innerHTML = "";
  suggestionBox.style.display = "none";
  selectedIndex = -1;
}