// auth.js
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/11.4.0/firebase-auth.js";

// Initialize authentication and Google provider.
const auth = getAuth();
const provider = new GoogleAuthProvider();

// Function to sign in with Google using a popup.
export function signIn() {
  signInWithPopup(auth, provider)
    .then((result) => {
      console.log("Signed in as:", result.user.displayName);
      // No auto redirect here—your app can react via onAuthStateChanged.
    })
    .catch((error) => {
      console.error("Sign in error:", error);
    });
}

// Function to sign out.
export function signOutUser() {
  signOut(auth)
    .then(() => {
      console.log("Signed out successfully.");
    })
    .catch((error) => {
      console.error("Sign out error:", error);
    });
}

// Listen for auth state changes and update the UI accordingly.
onAuthStateChanged(auth, (user) => {
  const authContainer = document.getElementById("auth-container");
  if (!authContainer) return;
  
  if (user) {
    // When signed in, show user's display name and a sign-out button.
    authContainer.innerHTML = `
      <p>Signed in as <strong>${user.displayName}</strong>
      <button id="sign-out-btn">Sign Out</button></p>
    `;
    document.getElementById("sign-out-btn").addEventListener("click", signOutUser);
  } else {
    // When signed out, show a sign-in button.
    authContainer.innerHTML = `<button id="sign-in-btn">Sign In with Google</button>`;
    document.getElementById("sign-in-btn").addEventListener("click", signIn);
  }
});

export { auth };
