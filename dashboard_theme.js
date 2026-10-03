// ==========================================================
// MUNKA PIGGERY TECHNOLOGY
// DASHBOARD THEME / NIGHT MODE
// ==========================================================

const DASHBOARD_THEME_STORAGE_KEY = "munkaDashboardTheme";


// ==========================================================
// GET INITIAL THEME
// ==========================================================

function getInitialDashboardTheme() {

    const savedTheme =
        localStorage.getItem(
            DASHBOARD_THEME_STORAGE_KEY
        );

    if (
        savedTheme === "dark" ||
        savedTheme === "light"
    ) {
        return savedTheme;
    }

    // Use the device's theme if the user has never
    // selected a theme before.
    if (
        window.matchMedia &&
        window.matchMedia(
            "(prefers-color-scheme: dark)"
        ).matches
    ) {
        return "dark";
    }

    return "light";
}


// ==========================================================
// APPLY THEME
// ==========================================================

function applyDashboardTheme(theme) {

    const normalizedTheme =
        theme === "dark"
            ? "dark"
            : "light";

    document.documentElement.setAttribute(
        "data-theme",
        normalizedTheme
    );

    document.body.classList.toggle(
        "dark-mode",
        normalizedTheme === "dark"
    );

    const icon =
        document.getElementById(
            "themeToggleIcon"
        );

    const text =
        document.getElementById(
            "themeToggleText"
        );

    const button =
        document.getElementById(
            "themeToggleButton"
        );


    if (normalizedTheme === "dark") {

        if (icon) {
            icon.textContent = "☀️";
        }

        if (text) {
            text.textContent = "Light Mode";
        }

        if (button) {

            button.title =
                "Switch to light mode";

            button.setAttribute(
                "aria-label",
                "Switch to light mode"
            );
        }

    } else {

        if (icon) {
            icon.textContent = "🌙";
        }

        if (text) {
            text.textContent = "Night Mode";
        }

        if (button) {

            button.title =
                "Switch to night mode";

            button.setAttribute(
                "aria-label",
                "Switch to night mode"
            );
        }
    }


    localStorage.setItem(
        DASHBOARD_THEME_STORAGE_KEY,
        normalizedTheme
    );
}


// ==========================================================
// TOGGLE THEME
// ==========================================================

function toggleDashboardTheme() {

    const currentTheme =
        document.body.classList.contains(
            "dark-mode"
        )
            ? "dark"
            : "light";

    const newTheme =
        currentTheme === "dark"
            ? "light"
            : "dark";

    applyDashboardTheme(newTheme);
}


// ==========================================================
// INITIALIZE THEME
// ==========================================================

function initializeDashboardTheme() {

    const initialTheme =
        getInitialDashboardTheme();

    applyDashboardTheme(initialTheme);
}


// ==========================================================
// MAKE FUNCTION AVAILABLE TO HTML BUTTON
// ==========================================================

window.toggleDashboardTheme =
    toggleDashboardTheme;

window.applyDashboardTheme =
    applyDashboardTheme;

window.initializeDashboardTheme =
    initializeDashboardTheme;


// ==========================================================
// START THEME
// ==========================================================

document.addEventListener(
    "DOMContentLoaded",
    function () {

        initializeDashboardTheme();

    }
);

