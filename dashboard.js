// ==========================================================
// MUNKA PIGGERY TECHNOLOGY
// COMPLETE DASHBOARD.JS
// ==========================================================
//
// FEATURES
// 1. Authenticated user profile
// 2. Registered farm name
// 3. Live farm statistics
// 4. Pig registration population
// 5. Pig categories
// 6. Gestation and expected farrowing statistics
// 7. Weaning statistics
// 8. Monthly treatments, sales and expenses
// 9. Net financial balance
// 10. Announcements
// 11. Announcement management
// 12. Notifications
// 13. Mark notifications as read
// 14. Dashboard navigation
// 15. Logout
//
// SECURITY
// - Uses the existing supabaseClient.
// - Does not modify supabase.js.
// - Does not disable RLS.
// - Super Admin cross-farm access depends on RLS.
// ==========================================================


// ==========================================================
// GLOBAL VARIABLES
// ==========================================================

let dashboardAnnouncements = [];
let dashboardNotifications = [];
let managedAnnouncements = [];

let dashboardCurrentUser = null;
let dashboardCurrentFarmId = null;

let dashboardStatisticsLoading = false;
let dashboardAnnouncementsLoading = false;
let dashboardNotificationsLoading = false;

let dashboardFarmStatistics = {};


// ==========================================================
// SUPABASE CLIENT
// ==========================================================

function getDashboardSupabaseClient() {
    if (
        typeof supabaseClient !== "undefined" &&
        supabaseClient
    ) {
        return supabaseClient;
    }

    console.error(
        "Dashboard error: supabaseClient is unavailable."
    );

    return null;
}


// ==========================================================
// GENERAL HELPERS
// ==========================================================

function dashboardEscapeHTML(value) {
    return String(value ?? "").replace(/[&<>"']/g, function (char) {
        const replacements = {
            "&": "&amp;",
            "<": "&lt;",
            ">": "&gt;",
            '"': "&quot;",
            "'": "&#039;"
        };

        return replacements[char];
    });
}


function dashboardShowMessage(message, type = "info") {
    let box = document.getElementById(
        "dashboardGeneralMessage"
    );

    if (!box) {
        box = document.createElement("div");
        box.id = "dashboardGeneralMessage";

        Object.assign(box.style, {
            position: "fixed",
            top: "15px",
            right: "15px",
            zIndex: "99999",
            maxWidth: "340px",
            padding: "12px 16px",
            borderRadius: "8px",
            color: "#ffffff",
            fontSize: "14px",
            boxShadow: "0 4px 14px rgba(0,0,0,0.2)"
        });

        document.body.appendChild(box);
    }

    const backgrounds = {
        success: "#16803c",
        error: "#c62828",
        warning: "#e69500",
        info: "#1769aa"
    };

    box.textContent = message;
    box.style.background =
        backgrounds[type] || backgrounds.info;

    box.style.display = "block";

    clearTimeout(box.hideTimer);

    box.hideTimer = setTimeout(function () {
        box.style.display = "none";
    }, 4500);
}


function formatDashboardMoney(value) {
    return "ZMW " + Number(value || 0).toLocaleString("en-ZM", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    });
}


function formatDashboardDate(value) {
    if (!value) {
        return "Not available";
    }

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
        return String(value);
    }

    return new Intl.DateTimeFormat("en-GB", {
        timeZone: "Africa/Lusaka",
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        hour12: false
    }).format(date);
}


function formatDashboardDateOnly(value) {
    if (!value) {
        return "Not available";
    }

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
        return String(value);
    }

    return new Intl.DateTimeFormat("en-GB", {
        timeZone: "Africa/Lusaka",
        day: "2-digit",
        month: "short",
        year: "numeric"
    }).format(date);
}


function getDashboardZambiaDateParts() {
    const parts = new Intl.DateTimeFormat("en-GB", {
        timeZone: "Africa/Lusaka",
        year: "numeric",
        month: "2-digit",
        day: "2-digit"
    }).formatToParts(new Date());

    const result = {};

    parts.forEach(function (part) {
        if (part.type !== "literal") {
            result[part.type] = part.value;
        }
    });

    return result;
}


function getDashboardToday() {
    const parts = getDashboardZambiaDateParts();

    return (
        parts.year + "-" +
        parts.month + "-" +
        parts.day
    );
}


function getDashboardCurrentMonthRange() {
    const parts = getDashboardZambiaDateParts();

    const year = Number(parts.year);
    const month = Number(parts.month);

    const startDate =
        year + "-" +
        String(month).padStart(2, "0") +
        "-01";

    const nextMonth = new Date(
        Date.UTC(year, month, 1)
    );

    const endDate =
        nextMonth.getUTCFullYear() + "-" +
        String(nextMonth.getUTCMonth() + 1).padStart(2, "0") +
        "-01";

    return {
        startDate,
        endDate
    };
}


// ==========================================================
// LOGGED-IN USER
// ==========================================================

function getDashboardLoggedInUser() {
    if (dashboardCurrentUser) {
        return dashboardCurrentUser;
    }

    try {
        const saved = localStorage.getItem("loggedInUser");

        if (saved) {
            dashboardCurrentUser = JSON.parse(saved);
            return dashboardCurrentUser;
        }
    } catch (error) {
        console.error(
            "Unable to read saved dashboard profile:",
            error
        );
    }

    return null;
}


function isDashboardSuperAdmin() {
    const user = getDashboardLoggedInUser();

    return Boolean(
        user &&
        String(user.role || "").trim().toLowerCase() ===
            "super admin"
    );
}


function isDashboardAdmin() {
    const user = getDashboardLoggedInUser();

    if (!user) {
        return false;
    }

    const role = String(user.role || "")
        .trim()
        .toLowerCase();

    return [
        "owner/admin",
        "owner / admin",
        "super admin"
    ].includes(role);
}


function displayLoggedInUser() {
    const user = getDashboardLoggedInUser();

    if (!user) {
        return;
    }

    const name =
        user.full_name ||
        user.username ||
        user.email ||
        "Dashboard User";

    const role = user.role || "User";

    [
        "loggedInUserName",
        "dashboardUserName",
        "userName",
        "welcomeUserName"
    ].forEach(function (id) {
        const element = document.getElementById(id);

        if (element) {
            element.textContent = name;
        }
    });

    [
        "loggedInUserRole",
        "dashboardUserRole",
        "userRole"
    ].forEach(function (id) {
        const element = document.getElementById(id);

        if (element) {
            element.textContent = role;
        }
    });
}


// ==========================================================
// FARM NAME AND PROFILE
// ==========================================================

async function displayFarmName() {
    const client = getDashboardSupabaseClient();

    const nameElementIds = [
        "dashboardFarmName",
        "farmName",
        "registeredFarmName",
        "currentFarmName"
    ];

    function showFarmName(name) {
        nameElementIds.forEach(function (id) {
            const element = document.getElementById(id);

            if (element) {
                element.textContent = name;
            }
        });
    }

    try {
        const {
            data: sessionData,
            error: sessionError
        } = await client.auth.getSession();

        if (sessionError) {
            throw sessionError;
        }

        const session = sessionData?.session;

        if (!session?.user) {
            showFarmName("Session expired");
            window.location.replace("login.html");
            return;
        }

        const {
            data: profile,
            error: profileError
        } = await client
            .from("users")
            .select("*")
            .eq("auth_user_id", session.user.id)
            .maybeSingle();

        if (profileError) {
            throw profileError;
        }

        if (!profile) {
            showFarmName("User profile not found");
            return;
        }

        dashboardCurrentUser = {
            ...profile,
            email: session.user.email
        };

        dashboardCurrentFarmId = profile.farm_id ?? null;

        displayLoggedInUser();

        if (isDashboardSuperAdmin()) {
            showFarmName("MUNKA PIGGERY PLATFORM");
        } else if (!dashboardCurrentFarmId) {
            showFarmName("No farm assigned");
        } else {
            const {
                data: farm,
                error: farmError
            } = await client
                .from("farms")
                .select("id, farm_name")
                .eq("id", dashboardCurrentFarmId)
                .maybeSingle();

            if (farmError) {
                throw farmError;
            }

            if (!farm) {
                showFarmName("Registered farm not found");
            } else {
                dashboardCurrentUser.farm_name =
                    farm.farm_name || "Registered Farm";

                showFarmName(dashboardCurrentUser.farm_name);
            }
        }

        localStorage.setItem(
            "loggedInUser",
            JSON.stringify(dashboardCurrentUser)
        );

    } catch (error) {
        console.error(
            "Unable to load farm name:",
            error
        );

        showFarmName("Unable to load farm information");
    }
}


// ==========================================================
// LIVE STATISTICS PANEL
// ==========================================================

function resetDashboardFarmStatistics() {
    dashboardFarmStatistics = {
        totalPigs: 0,
        sows: 0,
        boars: 0,
        piglets: 0,
        weaners: 0,
        growers: 0,
        otherCategories: 0,
        pregnantSows: 0,
        expectedFarrowings: 0,
        pigletsWeaned: 0,
        treatmentsThisMonth: 0,
        salesThisMonth: 0,
        expensesThisMonth: 0,
        netBalance: 0
    };
}


function normalizeDashboardPigCategory(category) {
    const value = String(category || "")
        .trim()
        .toLowerCase();

    if (
        value.includes("sow") ||
        value.includes("breeding female")
    ) {
        return "sows";
    }

    if (
        value.includes("boar") ||
        value.includes("breeding male")
    ) {
        return "boars";
    }

    if (
        value.includes("piglet") ||
        value.includes("suckling")
    ) {
        return "piglets";
    }

    if (
        value.includes("weaner") ||
        value.includes("weanling")
    ) {
        return "weaners";
    }

    if (
        value.includes("grower") ||
        value.includes("growing")
    ) {
        return "growers";
    }

    return "otherCategories";
}


function createDashboardStatisticsPanel() {
    if (
        document.getElementById(
            "dashboardFarmStatisticsPanel"
        )
    ) {
        return;
    }

    const style = document.createElement("style");

    style.id = "dashboardStatisticsStyles";

    style.textContent = `
        #dashboardFarmStatisticsPanel {
            margin: 20px 0;
            padding: 18px;
            border-radius: 14px;
            background: #101820;
            color: #ffffff;
            font-family: Arial, sans-serif;
        }

        #dashboardFarmStatisticsPanel h2 {
            margin: 0 0 8px;
            color: #ffd54f;
        }

        #dashboardFarmStatisticsPanel .statistics-subtitle {
            color: #c8d6e5;
            font-size: 13px;
            margin-bottom: 18px;
        }

        #dashboardStatisticsGrid {
            display: grid;
            grid-template-columns:
                repeat(auto-fit, minmax(150px, 1fr));
            gap: 12px;
        }

        .dashboard-stat-card {
            padding: 16px;
            min-height: 82px;
            border-radius: 10px;
            background: #173b4d;
            border-left: 4px solid #25b36a;
            box-sizing: border-box;
        }

        .dashboard-stat-card .stat-title {
            display: block;
            color: #d8e7ef;
            font-size: 13px;
            margin-bottom: 10px;
        }

        .dashboard-stat-card .stat-value {
            display: block;
            color: #ffffff;
            font-size: 21px;
            font-weight: bold;
            overflow-wrap: anywhere;
        }

        .dashboard-stat-card.money-card {
            border-left-color: #ffd54f;
        }

        .dashboard-stat-card.warning-card {
            border-left-color: #ff7043;
        }

        #dashboardStatisticsStatus {
            margin-top: 14px;
            font-size: 13px;
            color: #d8e7ef;
        }

        #refreshDashboardStatistics {
            margin-top: 12px;
            padding: 9px 14px;
            border: none;
            border-radius: 7px;
            background: #16803c;
            color: white;
            cursor: pointer;
        }

        #refreshDashboardStatistics:hover {
            background: #20a052;
        }
    `;

    document.head.appendChild(style);

    const panel = document.createElement("section");

    panel.id = "dashboardFarmStatisticsPanel";

    panel.innerHTML = `
        <h2>Live Farm Statistics</h2>

        <p class="statistics-subtitle">
            Current registered pig population and farm activity.
        </p>

        <div id="dashboardStatisticsGrid"></div>

        <div id="dashboardStatisticsStatus">
            Loading statistics...
        </div>

        <button
            type="button"
            id="refreshDashboardStatistics">
            Refresh Statistics
        </button>
    `;

    const target =
        document.getElementById("dashboardStatisticsContainer") ||
        document.getElementById("dashboardStatsContainer") ||
        document.getElementById("dashboardMainContent") ||
        document.getElementById("dashboardContent") ||
        document.querySelector("main") ||
        document.querySelector(".dashboard-container") ||
        document.body;

    const announcementsSection =
        document.getElementById("dashboardAnnouncements") ||
        document.getElementById("announcementsSection");

    if (
        announcementsSection &&
        announcementsSection.parentNode === target
    ) {
        target.insertBefore(panel, announcementsSection);
    } else {
        target.appendChild(panel);
    }

    document.getElementById(
        "refreshDashboardStatistics"
    ).addEventListener("click", function () {
        loadDashboardFarmStatistics();
    });

    displayDashboardFarmStatistics();
}


function createStatisticsCardHTML(
    key,
    title,
    extraClass = ""
) {
    return `
        <div class="dashboard-stat-card ${extraClass}">
            <span class="stat-title">
                ${dashboardEscapeHTML(title)}
            </span>

            <span
                class="stat-value"
                id="dashboardStat-${key}">
                0
            </span>
        </div>
    `;
}


function updateDashboardStatistic(key, value) {
    const element = document.getElementById(
        "dashboardStat-" + key
    );

    if (!element) {
        return;
    }

    if ([
        "salesThisMonth",
        "expensesThisMonth",
        "netBalance"
    ].includes(key)) {
        element.textContent = formatDashboardMoney(value);
    } else {
        element.textContent = Number(value || 0)
            .toLocaleString("en-ZM");
    }
}


function displayDashboardFarmStatistics() {
    const grid = document.getElementById(
        "dashboardStatisticsGrid"
    );

    if (!grid) {
        return;
    }

    grid.innerHTML = [
        createStatisticsCardHTML(
            "totalPigs",
            "Registered Pig Population"
        ),
        createStatisticsCardHTML(
            "sows",
            "Sows"
        ),