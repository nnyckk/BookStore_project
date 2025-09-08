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
const loginBtn = document.getElementById("loginBtn");
const btnText = loginBtn.querySelector(".btn-text");
const spinner = loginBtn.querySelector(".spinner");

// ==========================================
// 3. Helper functions
// ==========================================
function showLoginError(input, message) {
  input.classList.add("invalid");
  logInError.textContent = message;
  logInError.style.display = "flex";
  input.focus();
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

  // Show spinner & disable button
  btnText.style.display = "none";
  spinner.style.display = "inline-block";
  loginBtn.disabled = true;

  try {
    // Authenticate user
    const user = await loginWithEmail(email, password);

    // Fetch user data from Firestore
    const userData = await getUserData(user.uid);

    if (!userData) {
      throw new Error("User not found in database.");
    }

    // Save user info in sessionStorage
    sessionStorage.setItem("userName", userData.name);
    sessionStorage.setItem("userRole", userData.role);
    sessionStorage.setItem("userEmail", userData.email);

    // Redirect to main page
    window.location.href = "books.html";
  } catch (err) {
    // Show any error (login failed, user not found etc.)
    showLoginError(loginEmail, err.message);
    loginEmail.classList.add("invalid");
    loginPassword.classList.add("invalid");
  } finally {
    // Hide spinner & enable button
    btnText.style.display = "inline-block";
    spinner.style.display = "none";
    loginBtn.disabled = false;
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