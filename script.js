const darkModeButton = document.getElementById("dark-mode-toggle");

function applyDarkMode(isDark) {
  document.documentElement.classList.toggle("dark-mode", isDark);

  if (darkModeButton) {
    darkModeButton.textContent = isDark ? "Light mode" : "Dark mode";
  }

  localStorage.setItem("theme", isDark ? "dark" : "light");
}

const isAlreadyDark = document.documentElement.classList.contains("dark-mode");
applyDarkMode(isAlreadyDark);

if (darkModeButton) {
  darkModeButton.addEventListener("click", () => {
    const isCurrentlyDark = document.documentElement.classList.contains("dark-mode");
    applyDarkMode(!isCurrentlyDark);
  });
}