// ==============================================
// HISTORY-MANAGER.JS - History Management System
// ==============================================

import { onHistoryChangeFirstPage, loadHistoryPage } from "./firebase.js";

// =========================
// STATE VARIABLES
// =========================
let historyTableBody;
let noHistoryOverlay;
let historySpinner;
let historyTableContainer;

let historyPagination = {
  data: [],
  lastDoc: null,
  hasMore: true,
  loading: false,
  pageSize: 35
};

// =========================
// INITIALIZATION
// =========================
export function setupHistory() {
  // Get DOM elements
  historyTableBody = document.getElementById("historyTableBody");
  noHistoryOverlay = document.getElementById("noHistoryOverlay");
  historySpinner = document.getElementById("historySpinner");
  historyTableContainer = document.getElementById("historyTableContainer");
}

// =========================
// HISTORY LOADING
// =========================
export function loadHistory() {
  // Reset pagination state
  historyPagination = {
    data: [],
    lastDoc: null,
    hasMore: true,
    loading: false,
    pageSize: 35
  };

  if (historySpinner) historySpinner.style.display = "flex";

  // Listen for real-time updates on first page only
  onHistoryChangeFirstPage((result) => {
    if (historySpinner) historySpinner.style.display = "none";

    // Update pagination state
    historyPagination.data = result.data;
    historyPagination.lastDoc = result.lastDoc;
    historyPagination.hasMore = result.hasMore;

    if (!result.data.length) {
      noHistoryOverlay.style.display = "flex";
      historyTableBody.innerHTML = "";
      removeLoadMoreButton();
      return;
    }

    noHistoryOverlay.style.display = "none";
    renderHistory(historyPagination.data);
    
    // Add Load More button if there are more entries
    if (historyPagination.hasMore) {
      addLoadMoreButton();
    } else {
      removeLoadMoreButton();
    }
  }, historyPagination.pageSize);
}

// =========================
// LOAD MORE FUNCTIONALITY
// =========================
async function loadMoreHistory() {
  if (historyPagination.loading || !historyPagination.hasMore) {
    return;
  }

  historyPagination.loading = true;
  const loadMoreBtn = document.getElementById("loadMoreHistoryBtn");
  
  if (loadMoreBtn) {
    loadMoreBtn.textContent = "Loading...";
    loadMoreBtn.disabled = true;
  }

  try {
    const result = await loadHistoryPage(
      historyPagination.pageSize,
      historyPagination.lastDoc
    );

    // Append new data to existing
    historyPagination.data = [...historyPagination.data, ...result.data];
    historyPagination.lastDoc = result.lastDoc;
    historyPagination.hasMore = result.hasMore;

    // Re-render with all data
    renderHistory(historyPagination.data);

    // Update or remove Load More button
    if (historyPagination.hasMore) {
      if (loadMoreBtn) {
        loadMoreBtn.textContent = "Load More";
        loadMoreBtn.disabled = false;
      }
    } else {
      removeLoadMoreButton();
    }

  } catch (error) {
    console.error("Error loading more history:", error);
    if (loadMoreBtn) {
      loadMoreBtn.textContent = "Error - Try Again";
      loadMoreBtn.disabled = false;
    }
  } finally {
    historyPagination.loading = false;
  }
}

// =========================
// LOAD MORE BUTTON MANAGEMENT
// =========================
function addLoadMoreButton() {
  // Check if button already exists
  if (document.getElementById("loadMoreHistoryBtn")) {
    return;
  }

  const loadMoreBtn = document.createElement("button");
  loadMoreBtn.id = "loadMoreHistoryBtn";
  loadMoreBtn.className = "btn load-more-btn";
  loadMoreBtn.textContent = "Load More";
  loadMoreBtn.addEventListener("click", loadMoreHistory);

  historyTableContainer.appendChild(loadMoreBtn);
}

function removeLoadMoreButton() {
  const loadMoreBtn = document.getElementById("loadMoreHistoryBtn");
  if (loadMoreBtn) {
    loadMoreBtn.remove();
  }
}

// =========================
// HISTORY RENDERING
// =========================
function renderHistory(historyList) {
  const fragment = document.createDocumentFragment();

  historyList.forEach((entry) => {
    // Optimized timestamp formatting
    let formattedDate = "N/A";
    if (entry.timestamp) {
      try {
        const date = entry.timestamp.toDate ? entry.timestamp.toDate() : new Date(entry.timestamp);
        formattedDate = date.toLocaleDateString("ro-RO") + " " + date.toLocaleTimeString("ro-RO", { 
          hour: '2-digit', 
          minute: '2-digit' 
        });
      } catch (error) {
        console.error("Error formatting timestamp:", error);
        formattedDate = "Invalid Date";
      }
    }
    
    const row = document.createElement("tr");
    row.innerHTML = `
      <td>${entry.action || "-"}</td>
      <td>${entry.book || "-"}</td>
      <td>${entry.user || "-"}</td>
      <td>${entry.quantity !== null && entry.quantity !== undefined ? entry.quantity : "-"}</td>
      <td class="notes-cell" title="${entry.notes || ""}">${entry.notes || "-"}</td>
      <td>${formattedDate}</td>
    `;
    fragment.appendChild(row);
  });

  // Clear and append once for better performance
  historyTableBody.innerHTML = "";
  historyTableBody.appendChild(fragment);
  updateHistoryRowColors();
}

// =========================
// UTILITY FUNCTIONS
// =========================
function updateHistoryRowColors() {
  let visibleIndex = 0;
  historyTableBody.querySelectorAll("tr").forEach((row) => {
    if (row.style.display !== "none") {
      row.style.background =
        visibleIndex % 2 === 0 ? "var(--neutral-50)" : "var(--primary-50)";
      visibleIndex++;
    }
  });
}