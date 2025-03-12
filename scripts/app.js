// Main application entry point
document.addEventListener("DOMContentLoaded", function () {
  // Register service worker for PWA functionality
  if ("serviceWorker" in navigator) {
    navigator.serviceWorker
      .register("sw.js")
      .then((reg) =>
        console.log("Service Worker registered with scope:", reg.scope),
      )
      .catch((err) =>
        console.error("Service Worker registration failed:", err),
      );
  }

  // Initialize the UI
  UIService.init();

  // Check if there's a vault already
  const hasVault = localStorage.getItem("encryptedVault") !== null;

  if (hasVault) {
    // Show unlock UI
    document.getElementById("unlock-btn").style.display = "inline-block";
    document.getElementById("create-vault-btn").style.display = "inline-block";
  } else {
    // Show create UI
    document.getElementById("unlock-btn").style.display = "none";
    document.getElementById("create-vault-btn").style.display = "inline-block";
  }
});
