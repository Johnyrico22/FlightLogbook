// auth.js
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/11.4.0/firebase-auth.js";

// Initialize auth and provider.
const auth = getAuth();
const provider = new GoogleAuthProvider();

export function signIn() {
  signInWithPopup(auth, provider)
    .then((result) => {
      console.log("Signed in as:", result.user.displayName);
      // Optionally, redirect or update UI.
    })
    .catch((error) => {
      console.error("Sign in error:", error);
    });
}

export function signOutUser() {
  signOut(auth)
    .then(() => {
      console.log("Signed out successfully.");
    })
    .catch((error) => {
      console.error("Sign out error:", error);
    });
}

// Listen for authentication state changes.
onAuthStateChanged(auth, (user) => {
  const authContainer = document.getElementById("auth-container");
  if (!authContainer) return;
  
  if (user) {
    // When signed in, show the user's display name and a sign-out button.
    authContainer.innerHTML = `
      <p>Signed in as <strong>${user.displayName}</strong></p>
      <button id="sign-out-btn">Sign Out</button>
    `;
    document.getElementById("sign-out-btn").addEventListener("click", signOutUser);
  } else {
    // When signed out, show a sign-in button.
    authContainer.innerHTML = `<button id="sign-in-btn">Sign In with Google</button>`;
    document.getElementById("sign-in-btn").addEventListener("click", signIn);
  }
});
