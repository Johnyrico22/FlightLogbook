// auth.js
import { auth } from "./firebase.js";
import { 
  onAuthStateChanged, 
  GoogleAuthProvider, 
  signInWithPopup, 
  signOut 
} from "https://www.gstatic.com/firebasejs/11.4.0/firebase-auth.js";

// Listen for auth state changes and update the UI.
onAuthStateChanged(auth, (user) => {
  const authContainer = document.getElementById("auth-container");
  if (!authContainer) return;
  
  if (user) {
    // If user is signed in, show their display name and a sign-out button.
    authContainer.innerHTML = `
      <p>Signed in as <strong>${user.displayName}</strong>
      <button id="sign-out-btn">Sign Out</button></p>
    `;
    document.getElementById("sign-out-btn").addEventListener("click", () => {
      signOut(auth)
        .then(() => {
          console.log("Signed out successfully.");
          // Optionally redirect or update UI.
        })
        .catch((error) => {
          console.error("Sign out error:", error);
        });
    });
  } else {
    // If no user is signed in and we're on the login page, show sign in button.
    if (window.location.pathname.endsWith("login.html")) {
      authContainer.innerHTML = `<button id="sign-in-btn">Sign In with Google</button>`;
      const provider = new GoogleAuthProvider();
      document.getElementById("sign-in-btn").addEventListener("click", () => {
        signInWithPopup(auth, provider)
          .then((result) => {
            console.log("Signed in as:", result.user.displayName);
            window.location.href = "index.html";
          })
          .catch((error) => {
            console.error("Sign in error:", error);
            alert("Sign in failed. Please try again.");
          });
      });
    } else {
      // Not on login page? Redirect to login.
      window.location.href = "login.html";
    }
  }
});

export { auth };
