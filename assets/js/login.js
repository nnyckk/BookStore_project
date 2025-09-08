import { loginWithEmail, getUserData } from "./firebase.js";

const loginForm = document.getElementById("loginForm");
const loginEmail = document.getElementById("loginEmail");
const loginPassword = document.getElementById("loginPassword");
const logInError = document.getElementById("logInError");

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

loginForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  clearLoginError();

  const email = loginEmail.value.trim();
  const password = loginPassword.value;

  if (!email) return showLoginError(loginEmail, "Please enter your email.");
  if (!password)
    return showLoginError(loginPassword, "Please enter your password.");

  try {
    const user = await loginWithEmail(email, password);

    // ======== FETCH USER DATA FROM FIRESTORE =========
    // users documents are keyed by uid
    const userData = await getUserData(user.uid);

    if (!userData) {
      showLoginError(loginEmail, "User not found in database.");
      return;
    }

    // Save user info in sessionStorage
    sessionStorage.setItem("userName", userData.name);
    sessionStorage.setItem("userRole", userData.role);
    sessionStorage.setItem("userEmail", userData.email);

    window.location.href = "books.html";
  } catch (err) {
    showLoginError(loginEmail, "Incorrect email or password.");
    loginEmail.classList.add("invalid");
    loginPassword.classList.add("invalid");
  }
});

const togglePasswordBtn = document.querySelector(".toggle-password");
const passwordInput = document.getElementById("loginPassword");

togglePasswordBtn.addEventListener("click", () => {
  const type = passwordInput.type === "password" ? "text" : "password";
  passwordInput.type = type;
  togglePasswordBtn.classList.toggle("active");
});