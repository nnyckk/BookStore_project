// ==============================================
// BOOK-FORMS.JS - Modal & Form Management
// ==============================================

import { 
  books, 
  currentUser, 
  elements,
  showSuccessPopup,
  showAddError,
  showSellError,
  setEditIndex,
  setSellIndex,
  getEditIndex,
  getSellIndex
} from "./app-core.js";

import { addBook, editBook, sellBook, deleteBook } from "./firebase.js";

// =========================
// STATE VARIABLES
// =========================
let deleteIndex = null;

// =========================
// MODAL MANAGEMENT
// =========================
export function openAddBookModal(isEdit = false) {
  elements.addBookModal.style.display = "flex";
  elements.openAddBookBtn.classList.add("active");

  const modalTitle = elements.addBookModal.querySelector("h2");
  const saveBtn = elements.addBookForm.querySelector(".save-btn");

  if (isEdit) {
    modalTitle.textContent = "Edit Book";
    saveBtn.textContent = "Update Book";
  } else {
    elements.addBookForm.reset();
    setEditIndex(null);
    modalTitle.textContent = "Add Book";
    saveBtn.textContent = "Add Book";
  }
}

export function closeAddBookModal() {
  elements.addBookModal.style.display = "none";
  elements.openAddBookBtn.classList.remove("active");

  // Reset error messages and invalid classes
  elements.addError.style.display = "none";
  elements.addError.textContent = "";
  [
    document.getElementById("bookTitle"),
    elements.authorInput,
    document.getElementById("bookStock"),
    document.getElementById("bookPrice"),
    document.getElementById("bookIsbn"),
  ].forEach((input) => {
    input.classList.remove("invalid");
  });
}

// =========================
// EDIT, SELL & DELETE HANDLERS
// =========================
export function handleEdit(id) {
  setEditIndex(id);
  const book = books.find((b) => b.id === id);
  if (!book) return;

  document.getElementById("bookTitle").value = book.title;
  elements.authorInput.value = book.author;
  document.getElementById("bookStock").value = book.stock;
  document.getElementById("bookPrice").value = book.price;
  document.getElementById("bookIsbn").value = book.isbn;
  openAddBookModal(true);
}

export function handleSell(id) {
  setSellIndex(id);
  const book = books.find((b) => b.id === id);
  if (!book) return;

  elements.sellBookTitle.textContent = book.title;
  elements.sellBookAuthor.textContent = book.author;
  elements.sellBookStock.textContent = book.stock;
  elements.sellQuantityInput.max = book.stock;
  elements.sellQuantityInput.value = book.stock > 0 ? 1 : 0;
  elements.sellConfirmBtn.disabled = book.stock === 0;
  elements.sellNotesInput.value = "";

  // Reset error state
  elements.sellQuantityInput.classList.remove("invalid");
  elements.sellError.style.display = "none";
  elements.sellError.textContent = "";

  elements.sellBookModal.style.display = "flex";
}

export function handleDelete(id) {
  if (currentUser?.role !== 'admin') return;
  
  deleteIndex = id;
  const book = books.find((b) => b.id === id);
  if (!book) return;

  document.getElementById('deleteBookTitle').textContent = `"${book.title}"`;
  document.getElementById('deleteBookModal').style.display = 'flex';
}

// =========================
// FORM SUBMISSIONS
// =========================
export function setupFormHandlers() {
  // Add/Edit Book Form
  elements.addBookForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    const titleInput = document.getElementById("bookTitle");
    const stockInput = document.getElementById("bookStock");
    const priceInput = document.getElementById("bookPrice");
    const isbnInput = document.getElementById("bookIsbn");

    // Clear previous errors
    elements.addError.style.display = "none";
    [titleInput, elements.authorInput, stockInput, priceInput, isbnInput].forEach((i) =>
      i.classList.remove("invalid")
    );

    // Validation
    if (!titleInput.value.trim())
      return showAddError(titleInput, "Title is required.");
    if (!elements.authorInput.value.trim())
      return showAddError(elements.authorInput, "Author is required.");
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

    const currentEditIndex = getEditIndex();

    // Duplicate ISBN check
    const duplicate = books.find(
      (b) =>
        b.isbn.toLowerCase() === isbnInput.value.trim().toLowerCase() &&
        b.id !== currentEditIndex
    );
    if (duplicate)
      return showAddError(isbnInput, "A book with this ISBN already exists!");

    const bookData = {
      title: titleInput.value.trim(),
      author: elements.authorInput.value.trim(),
      stock: parseInt(stockInput.value),
      price: parseFloat(priceInput.value.replace(",", ".")),
      isbn: isbnInput.value.trim(),
    };

    try {
      if (currentEditIndex !== null) {
        // Edit existing book
        const originalBook = books.find(b => b.id === currentEditIndex);
        
        if (!originalBook) {
          return showAddError(titleInput, "Original book not found!");
        }
        
        await editBook(currentEditIndex, bookData, currentUser, originalBook);
        showSuccessPopup(
          `Book <strong>"${bookData.title}"</strong> updated successfully!`
        );
      } else {
        // Add new book
        await addBook(bookData, currentUser);
        showSuccessPopup(
          `Book <strong>"${bookData.title}"</strong> added successfully!`
        );
      }

      closeAddBookModal();
    } catch (error) {
      console.error("Error saving book:", error);
      showAddError(titleInput, "An error occurred. Please try again.");
    }
  });

  // Sell Book Form
  elements.sellBookForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const quantity = Number(elements.sellQuantityInput.value);
    const notes = elements.sellNotesInput.value.trim();
    const currentSellIndex = getSellIndex();
    const book = books.find((b) => b.id === currentSellIndex);
    if (!book) return;

    if (!quantity || quantity < 1 || !Number.isInteger(quantity)) {
      return showSellError(elements.sellQuantityInput, "Enter a valid quantity.");
    }

    if (quantity > book.stock) {
      return showSellError(
        elements.sellQuantityInput,
        "You cannot sell more than the available stock."
      );
    }

    elements.sellError.style.display = "none";

    try {
      await sellBook(currentSellIndex, book.title, quantity, currentUser, notes);
      elements.sellBookModal.style.display = "none";
      showSuccessPopup(
        `You sold ${quantity} ${quantity === 1 ? "item" : "items"} of <strong>"${
          book.title
        }"</strong> successfully!`
      );
    } catch (error) {
      console.error("Error selling book:", error);
      showSellError(elements.sellQuantityInput, "An error occurred. Please try again.");
    }
  });

  // DELETE BOOK HANDLERS
  const deleteBookModal = document.getElementById('deleteBookModal');
  const closeDeleteModal = document.getElementById('closeDeleteModal');
  const cancelDelete = document.getElementById('cancelDelete');
  const confirmDelete = document.getElementById('confirmDelete');

  // Ensure elements exist before adding listeners
  if (closeDeleteModal) {
    closeDeleteModal.addEventListener('click', () => {
      deleteBookModal.style.display = 'none';
      deleteIndex = null;
    });
  }

  if (cancelDelete) {
    cancelDelete.addEventListener('click', () => {
      deleteBookModal.style.display = 'none';
      deleteIndex = null;
    });
  }

  if (confirmDelete) {
    confirmDelete.addEventListener('click', async () => {
      if (!deleteIndex) return;
      
      const book = books.find(b => b.id === deleteIndex);
      if (!book) return;

      try {
        // Disable button during deletion
        confirmDelete.disabled = true;
        confirmDelete.textContent = 'Deleting...';

        await deleteBook(deleteIndex, book.title, currentUser);
        
        deleteBookModal.style.display = 'none';
        deleteIndex = null;
        
        showSuccessPopup(
          `Book <strong>"${book.title}"</strong> deleted successfully!`
        );
      } catch (error) {
        console.error('Error deleting book:', error);
        alert('An error occurred while deleting the book. Please try again.');
      } finally {
        confirmDelete.disabled = false;
        confirmDelete.textContent = 'Delete Book';
      }
    });
  }

  // Modal close handlers
  elements.openAddBookBtn.addEventListener("click", () => openAddBookModal(false));
  elements.closeAddBookBtn.addEventListener("click", closeAddBookModal);
  
  elements.closeSellBookBtn.addEventListener("click", () => {
    elements.sellBookModal.style.display = "none";
  });

  // Click outside modal to close
  window.addEventListener("click", (e) => {
    if (e.target === elements.addBookModal) closeAddBookModal();
    if (e.target === elements.sellBookModal) elements.sellBookModal.style.display = "none";
    if (deleteBookModal && e.target === deleteBookModal) {
      deleteBookModal.style.display = "none";
      deleteIndex = null;
    }
  });

  // Edit, sell, and delete icon handlers
  document.addEventListener("click", (e) => {
    const editIcon = e.target.closest(".edit-icon");
    if (editIcon) handleEdit(editIcon.dataset.id);

    const sellIcon = e.target.closest(".sell-icon");
    if (sellIcon) handleSell(sellIcon.dataset.id);

    const deleteIcon = e.target.closest(".delete-icon");
    if (deleteIcon && currentUser?.role === 'admin') {
      handleDelete(deleteIcon.dataset.id);
    }
  });
}

// Initialize when DOM is loaded
document.addEventListener("DOMContentLoaded", () => {
  // Wait for elements to be initialized
  setTimeout(setupFormHandlers, 100);
});