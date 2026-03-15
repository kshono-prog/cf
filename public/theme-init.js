(function () {
  var key = "cf-theme-preference";
  var raw = window.localStorage.getItem(key);
  var preference =
    raw === "light" || raw === "dark" || raw === "system" ? raw : "system";
  var systemTheme = window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";
  var resolved = preference === "system" ? systemTheme : preference;
  document.documentElement.dataset.theme = resolved;
  document.documentElement.dataset.themePreference = preference;
  document.documentElement.style.colorScheme = resolved;
})();
