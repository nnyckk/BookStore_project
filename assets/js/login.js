// ==========================================
// 1. Import helper functions from Firebase
// ==========================================
import { loginWithEmail, getUserData } from "./firebase.js";

// ==========================================
// 2. DOM Elements
// ==========================================
const loginForm = document.getElementById("loginForm");
const loginEmail = document.getElementById("loginEmail");
const loginPassword = document.getElementById("loginPassword");
const logInError = document.getElementById("logInError");
const togglePasswordBtn = document.querySelector(".toggle-password");
const passwordInput = document.getElementById("loginPassword");

// ==========================================
// 3. Helper functions
// ==========================================
function showLoginError(input, message) {
  input.classList.add("invalid");
  logInError.textContent = message;
  logInError.style.display = "flex";
}

function clearLoginError() {
  loginEmail.classList.remove("invalid");
  loginPassword.classList.remove("invalid");
  logInError.style.display = "none";
  logInError.textContent = "";
}

// ==========================================
// 4. Form submission event
// ==========================================
loginForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  clearLoginError();

  const email = loginEmail.value.trim();
  const password = loginPassword.value;

  if (!email) return showLoginError(loginEmail, "Please enter your email.");
  if (!password) return showLoginError(loginPassword, "Please enter your password.");

  try {
    // Authenticate user
    const user = await loginWithEmail(email, password);

    // Fetch user data from Firestore
    const userData = await getUserData(user.uid);

    if (!userData) {
      showLoginError(loginEmail, "User not found in database.");
      return;
    }

    // Save user info in sessionStorage
    sessionStorage.setItem("userName", userData.name);
    sessionStorage.setItem("userRole", userData.role);
    sessionStorage.setItem("userEmail", userData.email);

    // Redirect to main page
    window.location.href = "books.html";
  } catch (err) {
    showLoginError(loginEmail, "Incorrect email or password.");
    loginEmail.classList.add("invalid");
    loginPassword.classList.add("invalid");
  }
});

// ==========================================
// 5. Toggle password visibility
// ==========================================
togglePasswordBtn.addEventListener("click", () => {
  const type = passwordInput.type === "password" ? "text" : "password";
  passwordInput.type = type;
  togglePasswordBtn.classList.toggle("active");
});