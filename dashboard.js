// ==========================================================
// MUNKA PIGGERY TECHNOLOGY
// DASHBOARD.JS
// COMPLETE DASHBOARD REPLACEMENT
// ==========================================================
//
// FEATURES
// 1. Logged-in user information
// 2. Registered farm information
// 3. Zambia date and time
// 4. Farm statistics
// 5. Pig category statistics
// 6. Pregnant sows and expected farrowings
// 7. Piglets weaned
// 8. Monthly treatments, sales and expenses
// 9. Net balance
// 10. Dashboard announcements
// 11. Announcement management
// 12. Dashboard notifications
// 13. Notification read status
// 14. Dashboard navigation
// 15. Secure Supabase logout
//
// IMPORTANT:
// - Uses the existing supabaseClient.
// - Does not modify supabase.js.
// - Super Admin access across farms depends on Supabase RLS.
// ==========================================================


// ==========================================================
// GLOBAL VARIABLES
// ==========================================================

let dashboardAnnouncements = [];
let dashboardNotifications = [];
let managedAnnouncements = [];

let dashboardCurrentUser = null;
let dashboardCurrentFarmId = null;

let dashboardFarmStatistics = {
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

let dashboardStatisticsLoading = false;
let dashboardAnnouncementsLoading = false;
let dashboardNotificationsLoading = false;


// ==========================================================
// SUPABASE CLIENT CHECK
// ==========================================================

function getDashboardSupabaseClient() {
    if (
        typeof supabaseClient !== "undefined" &&
        supabaseClient
    ) {
        return supabaseClient;
    }

    console.error(
        "MUNKA Dashboard: supabaseClient is unavailable. Check script order."
    );

    return null;
}


// ==========================================================
// GENERAL HELPERS
// ==========================================================

function dashboardEscapeHTML(value) {
    return String(value ?? "").replace(/[&<>"']/g, function (character) {
        const replacements = {
            "&": "&amp;",
            "<": "&lt;",
            ">": "&gt;",
            '"': "&quot;",
            "'": "&#039;"
        };

        return replacements[character];
    });
}


function dashboardShowMessage(message, type = "info") {
    let messageBox = document.getElementById(
        "dashboardGeneralMessage"
    );

    if (!messageBox) {
        messageBox = document.createElement("div");
        messageBox.id = "dashboardGeneralMessage";

        messageBox.style.position = "fixed";
        messageBox.style.top = "15px";
        messageBox.style.right = "15px";
        messageBox.style.zIndex = "99999";
        messageBox.style.maxWidth = "340px";
        messageBox.style.padding = "12px 16px";
        messageBox.style.borderRadius = "8px";
        messageBox.style.color = "#ffffff";
        messageBox.style.fontSize = "14px";
        messageBox.style.boxShadow =
            "0 4px 14px rgba(0,0,0,0.2)";

        document.body.appendChild(messageBox);
    }

    const backgrounds = {
        success: "#16803c",
        error: "#c62828",
        warning: "#e69500",
        info: "#1769aa"
    };

    messageBox.textContent = message;
    messageBox.style.background =
        backgrounds[type] || backgrounds.info;

    messageBox.style.display = "block";

    clearTimeout(messageBox.hideTimer);

    messageBox.hideTimer = setTimeout(function () {
        messageBox.style.display = "none";
    }, 4000);
}


function formatDashboardMoney(amount) {
    const number = Number(amount || 0);

    return "ZMW " + number.toLocaleString("en-ZM", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    });
}


function getDashboardZambiaDateParts(dateValue = new Date()) {
    const date = new Date(dateValue);

    const parts = new Intl.DateTimeFormat("en-GB", {
        timeZone: "Africa/Lusaka",
        year: "numeric",
        month: "2-digit",
        day: "2-digit"
    }).formatToParts(date);

    const result = {};

    parts.forEach(function (part) {
        if (part.type !== "literal") {
            result[part.type] = part.value;
        }
    });

    return result;
}


function formatDashboardDate(dateValue) {
    if (!dateValue) {
        return "Not available";
    }

    const date = new Date(dateValue);

    if (Number.isNaN(date.getTime())) {
        return String(dateValue);
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


function formatDashboardDateOnly(dateValue) {
    if (!dateValue) {
        return "Not available";
    }

    const date = new Date(dateValue);

    if (Number.isNaN(date.getTime())) {
        return String(dateValue);
    }

    return new Intl.DateTimeFormat("en-GB", {
        timeZone: "Africa/Lusaka",
        day: "2-digit",
        month: "short",
        year: "numeric"
    }).format(date);
}


function getDashboardCurrentMonthRange() {
    const parts = getDashboardZambiaDateParts();

    const year = Number(parts.year);
    const month = Number(parts.month);

    const startDate =
        year + "-" + String(month).padStart(2, "0") + "-01";

    const nextMonthDate = new Date(
        Date.UTC(year, month, 1)
    );

    const nextYear = nextMonthDate.getUTCFullYear();
    const nextMonth = String(
        nextMonthDate.getUTCMonth() + 1
    ).padStart(2, "0");

    const endDate =
        nextYear + "-" + nextMonth + "-01";

    return {
        startDate: startDate,
        endDate: endDate
    };
}


function getDashboardToday() {
    const parts = getDashboardZambiaDateParts();

    return (
        parts.year + "-" +
        parts.month + "-" +
        parts.day
    );
}


function getDashboardLoggedInUser() {
    if (dashboardCurrentUser) {
        return dashboardCurrentUser;
    }

    try {
        const storedUser = localStorage.getItem("loggedInUser");

        if (storedUser) {
            dashboardCurrentUser = JSON.parse(storedUser);
            return dashboardCurrentUser;
        }
    } catch (error) {
        console.error(
            "Unable to read dashboard user:",
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

    return (
        role === "owner/admin" ||
        role === "owner / admin" ||
        role === "super admin"
    );
}


// ==========================================================
// DISPLAY LOGGED-IN USER
// ==========================================================

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

    const nameElements = [
        "loggedInUserName",
        "dashboardUserName",
        "userName",
        "welcomeUserName"
    ];

    const roleElements = [
        "loggedInUserRole",
        "dashboardUserRole",
        "userRole"
    ];

    nameElements.forEach(function (id) {
        const element = document.getElementById(id);

        if (element) {
            element.textContent = name;
        }
    });

    roleElements.forEach(function (id) {
        const element = document.getElementById(id);

        if (element) {
            element.textContent = role;
        }
    });
}


// ==========================================================
// LOAD USER PROFILE AND FARM
// ==========================================================

async function displayFarmName() {
    const client = getDashboardSupabaseClient();

    if (!client) {
        return;
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
            window.location.href = "login.html";
            return;
        }

        const authUserId = session.user.id;

        const {
            data: profile,
            error: profileError
        } = await client
            .from("users")
            .select("*")
            .eq("auth_user_id", authUserId)
            .maybeSingle();

        if (profileError) {
            throw profileError;
        }

        if (!profile) {
            console.error(
                "No application user profile was found."
            );

            return;
        }

        dashboardCurrentUser = {
            ...profile,
            email: session.user.email
        };

        dashboardCurrentFarmId = profile.farm_id ?? null;

        try {
            localStorage.setItem(
                "loggedInUser",
                JSON.stringify(dashboardCurrentUser)
            );
        } catch (storageError) {
            console.warn(
                "Unable to refresh stored user profile.",
                storageError
            );
        }

        displayLoggedInUser();

        const farmNameElementIds = [
            "dashboardFarmName",
            "farmName",
            "registeredFarmName",
            "currentFarmName"
        ];

        if (isDashboardSuperAdmin()) {
            farmNameElementIds.forEach(function (id) {
                const element = document.getElementById(id);

                if (element) {
                    element.textContent =
                        "MUNKA PIGGERY PLATFORM";
                }
            });

            return;
        }

        if (!dashboardCurrentFarmId) {
            farmNameElementIds.forEach(function (id) {
                const element = document.getElementById(id);

                if (element) {
                    element.textContent = "Farm not assigned";
                }
            });

            return;
        }

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

        const farmName =
            farm?.farm_name || "Registered Farm";

        farmNameElementIds.forEach(function (id) {
            const element = document.getElementById(id);

            if (element) {
                element.textContent = farmName;
            }
        });

    } catch (error) {
        console.error(
            "Unable to load dashboard user and farm:",
            error
        );
    }
}


// ==========================================================
// LIVE FARM STATISTICS
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
            margin: 0 0 18px;
            color: #c8d6e5;
            font-size: 13px;
        }

        #dashboardStatisticsGrid {
            display: grid;
            grid-template-columns:
                repeat(auto-fit, minmax(150px, 1fr));
            gap: 12px;
        }

        .dashboard-stat-card {
            padding: 16px;
            min-height: 80px;
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
            font-size: 22px;
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
            background: #16803c;
            color: #ffffff;
            border: none;
            border-radius: 7px;
            padding: 9px 14px;
            cursor: pointer;
            margin-top: 12px;
        }

        #refreshDashboardStatistics:hover {
            background: #20a052;
        }
    `;

    document.head.appendChild(style);

    const panel = document.createElement("section");

    panel.id = "dashboardFarmStatisticsPanel";

    panel.innerHTML = `
        <h2>Farm Statistics</h2>

        <p class="statistics-subtitle">
            Live information from your registered farm.
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

    const possibleLocations = [
        "dashboardStatisticsContainer",
        "dashboardStatsContainer",
        "dashboardMainContent",
        "dashboardContent"
    ];

    let inserted = false;

    for (const id of possibleLocations) {
        const element = document.getElementById(id);

        if (element) {
            element.appendChild(panel);
            inserted = true;
            break;
        }
    }

    if (!inserted) {
        const announcementSection =
            document.getElementById(
                "dashboardAnnouncements"
            ) ||
            document.getElementById(
                "announcementsSection"
            );

        if (announcementSection?.parentNode) {
            announcementSection.parentNode.insertBefore(
                panel,
                announcementSection
            );

            inserted = true;
        }
    }

    if (!inserted) {
        const main =
            document.querySelector("main") ||
            document.querySelector(".dashboard-container") ||
            document.body;

        main.appendChild(panel);
    }

    const refreshButton = document.getElementById(
        "refreshDashboardStatistics"
    );

    if (refreshButton) {
        refreshButton.addEventListener("click", function () {
            loadDashboardFarmStatistics();
        });
    }

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
                id="dashboardStat-${dashboardEscapeHTML(key)}">
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

    const moneyKeys = [
        "salesThisMonth",
        "expensesThisMonth",
        "netBalance"
    ];

    if (moneyKeys.includes(key)) {
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
            "Total Registered Pigs"
        ),

        createStatisticsCardHTML(
            "sows",
            "Sows"
        ),

        createStatisticsCardHTML(
            "boars",
            "Boars"
        ),

        createStatisticsCardHTML(
            "piglets",
            "Piglets"
        ),

        createStatisticsCardHTML(
            "weaners",
            "Weaners"
        ),

        createStatisticsCardHTML(
            "growers",
            "Growers"
        ),

        createStatisticsCardHTML(
            "otherCategories",
            "Other Pig Categories"
        ),

        createStatisticsCardHTML(
            "pregnantSows",
            "Pregnant Sows"
        ),

        createStatisticsCardHTML(
            "expectedFarrowings",
            "Expected Farrowings",
            "warning-card"
        ),

        createStatisticsCardHTML(
            "pigletsWeaned",
            "Piglets Weaned"
        ),

        createStatisticsCardHTML(
            "treatmentsThisMonth",
            "Treatments This Month"
        ),

        createStatisticsCardHTML(
            "salesThisMonth",
            "Sales This Month",
            "money-card"
        ),

        createStatisticsCardHTML(
            "expensesThisMonth",
            "Expenses This Month",
            "money-card"
        ),

        createStatisticsCardHTML(
            "netBalance",
            "Net Balance This Month",
            "money-card"
        )
    ].join("");

    Object.keys(dashboardFarmStatistics).forEach(function (key) {
        updateDashboardStatistic(
            key,
            dashboardFarmStatistics[key]
        );
    });
}


async function loadDashboardFarmStatistics() {
    if (dashboardStatisticsLoading) {
        return;
    }

    const client = getDashboardSupabaseClient();

    if (!client) {
        return;
    }

    dashboardStatisticsLoading = true;

    const statusElement = document.getElementById(
        "dashboardStatisticsStatus"
    );

    if (statusElement) {
        statusElement.textContent =
            "Loading farm statistics...";
    }

    try {
        if (!dashboardCurrentUser) {
            await displayFarmName();
        }

        const user = getDashboardLoggedInUser();

        if (!user) {
            throw new Error(
                "The dashboard user profile is unavailable."
            );
        }

        const superAdmin = isDashboardSuperAdmin();

        const farmId = dashboardCurrentFarmId;

        if (!superAdmin && !farmId) {
            resetDashboardFarmStatistics();
            displayDashboardFarmStatistics();

            if (statusElement) {
                statusElement.textContent =
                    "No farm has been assigned to this user.";
            }

            return;
        }

        resetDashboardFarmStatistics();

        const monthRange = getDashboardCurrentMonthRange();

        async function getFarmQuery(table, columns) {
            let query = client
                .from(table)
                .select(columns);

            if (!superAdmin) {
                query = query.eq("farm_id", farmId);
            }

            const { data, error } = await query;

            if (error) {
                throw new Error(
                    table + ": " + error.message
                );
            }

            return data || [];
        }

        async function getMonthlyFarmQuery(
            table,
            columns,
            dateColumn
        ) {
            let query = client
                .from(table)
                .select(columns)
                .gte(dateColumn, monthRange.startDate)
                .lt(dateColumn, monthRange.endDate);

            if (!superAdmin) {
                query = query.eq("farm_id", farmId);
            }

            const { data, error } = await query;

            if (error) {
                throw new Error(
                    table + ": " + error.message
                );
            }

            return data || [];
        }

        // ------------------------------------------
        // PIG COUNTS
        // ------------------------------------------

        const pigs = await getFarmQuery(
            "pigs",
            "id, category"
        );

        dashboardFarmStatistics.totalPigs = pigs.length;

        pigs.forEach(function (pig) {
            const categoryKey =
                normalizeDashboardPigCategory(
                    pig.category
                );

            dashboardFarmStatistics[categoryKey]++;
        });

        // ------------------------------------------
        // GESTATION AND EXPECTED FARROWINGS
        // ------------------------------------------

        const gestationRecords = await getFarmQuery(
            "gestation_records",
            "id, sow_id, service_date, delivery_date, status"
        );

        const today = getDashboardToday();

        const pregnantSowIds = new Set();

        gestationRecords.forEach(function (record) {
            const status = String(record.status || "")
                .trim()
                .toLowerCase();

            const closedStatuses = [
                "completed",
                "complete",
                "delivered",
                "farrowed",
                "cancelled",
                "canceled",
                "failed",
                "not pregnant",
                "not_pregnant"
            ];

            const isClosed =
                closedStatuses.includes(status);

            const deliveryDate = record.delivery_date
                ? String(record.delivery_date).slice(0, 10)
                : "";

            if (
                !isClosed &&
                record.sow_id
            ) {
                pregnantSowIds.add(
                    String(record.sow_id)
                );
            }

            if (
                !isClosed &&
                deliveryDate &&
                deliveryDate >= today
            ) {
                dashboardFarmStatistics.expectedFarrowings++;
            }
        });

        dashboardFarmStatistics.pregnantSows =
            pregnantSowIds.size;

        // ------------------------------------------
        // PIGLETS WEANED
        // ------------------------------------------

        const weaningRecords = await getFarmQuery(
            "weaning_records",
            "total_weaned, weaning_date"
        );

        dashboardFarmStatistics.pigletsWeaned =
            weaningRecords.reduce(function (total, record) {
                return total +
                    Number(record.total_weaned || 0);
            }, 0);

        // ------------------------------------------
        // TREATMENTS THIS MONTH
        // ------------------------------------------

        const treatmentRecords = await getMonthlyFarmQuery(
            "treatment_records",
            "id, treatment_date",
            "treatment_date"
        );

        dashboardFarmStatistics.treatmentsThisMonth =
            treatmentRecords.length;

        // ------------------------------------------
        // SALES THIS MONTH
        // ------------------------------------------

        const salesRecords = await getMonthlyFarmQuery(
            "sales_records",
            "total_amount, sale_date",
            "sale_date"
        );

        dashboardFarmStatistics.salesThisMonth =
            salesRecords.reduce(function (total, record) {
                return total +
                    Number(record.total_amount || 0);
            }, 0);

        // ------------------------------------------
        // EXPENSES THIS MONTH
        // ------------------------------------------

        const expenseRecords = await getMonthlyFarmQuery(
            "expenses_records",
            "total_amount, expense_date",
            "expense_date"
        );

        dashboardFarmStatistics.expensesThisMonth =
            expenseRecords.reduce(function (total, record) {
                return total +
                    Number(record.total_amount || 0);
            }, 0);

        // ------------------------------------------
        // NET BALANCE
        // ------------------------------------------

        dashboardFarmStatistics.netBalance =
            dashboardFarmStatistics.salesThisMonth -
            dashboardFarmStatistics.expensesThisMonth;

        displayDashboardFarmStatistics();

        if (statusElement) {
            statusElement.textContent =
                "Statistics updated successfully. " +
                "Monthly financial figures cover " +
                monthRange.startDate +
                " to " +
                monthRange.endDate +
                " (end date excluded).";
        }

    } catch (error) {
        console.error(
            "Dashboard statistics error:",
            error
        );

        if (statusElement) {
            statusElement.textContent =
                "Some statistics could not be loaded. " +
                "Check the browser console and database permissions.";
        }

    } finally {
        dashboardStatisticsLoading = false;
    }
}


// ==========================================================
// ANNOUNCEMENTS
// ==========================================================

function isDashboardAnnouncementActive(announcement) {
    if (!announcement) {
        return false;
    }

    if (
        announcement.status &&
        String(announcement.status).toLowerCase() !== "active"
    ) {
        return false;
    }

    if (announcement.expires_at) {
        const expiry = new Date(announcement.expires_at);

        if (
            !Number.isNaN(expiry.getTime()) &&
            expiry < new Date()
        ) {
            return false;
        }
    }

    return true;
}


function getPriorityInformation(priority) {
    const value = String(priority || "normal")
        .trim()
        .toLowerCase();

    if (value === "high" || value === "urgent") {
        return {
            label: value.toUpperCase(),
            color: "#c62828"
        };
    }

    if (value === "medium") {
        return {
            label: "MEDIUM",
            color: "#e69500"
        };
    }

    return {
        label: "NORMAL",
        color: "#16803c"
    };
}


function createAnnouncementCard(announcement) {
    const priority = getPriorityInformation(
        announcement.priority
    );

    const card = document.createElement("article");

    card.className = "dashboard-announcement-card";

    card.style.background = "#ffffff";
    card.style.borderRadius = "9px";
    card.style.padding = "14px";
    card.style.marginBottom = "12px";
    card.style.borderLeft =
        "5px solid " + priority.color;
    card.style.boxShadow =
        "0 2px 8px rgba(0,0,0,0.08)";

    const title = dashboardEscapeHTML(
        announcement.title || "Announcement"
    );

    const message = dashboardEscapeHTML(
        announcement.message || ""
    );

    const createdDate = announcement.created_at
        ? formatDashboardDate(announcement.created_at)
        : "";

    card.innerHTML = `
        <div style="
            display:flex;
            justify-content:space-between;
            gap:10px;
            flex-wrap:wrap;
            align-items:center;
        ">
            <strong style="color:#173b4d;">
                ${title}
            </strong>

            <span style="
                color:#ffffff;
                background:${priority.color};
                padding:4px 8px;
                border-radius:5px;
                font-size:11px;
                font-weight:bold;
            ">
                ${dashboardEscapeHTML(priority.label)}
            </span>
        </div>

        <p style="
            color:#273746;
            white-space:pre-wrap;
            overflow-wrap:anywhere;
            margin:12px 0;
        ">${message}</p>

        <small style="color:#64748b;">
            ${dashboardEscapeHTML(createdDate)}
        </small>
    `;

    return card;
}


function displayDashboardAnnouncements() {
    const containers = [
        document.getElementById("dashboardAnnouncementsList"),
        document.getElementById("announcementsList"),
        document.getElementById("dashboardAnnouncements")
    ];

    const container = containers.find(function (element) {
        return element &&
            element.id !== "dashboardAnnouncements" ||
            (
                element &&
                element.id === "dashboardAnnouncements" &&
                !element.querySelector(
                    "#dashboardAnnouncementsList"
                )
            );
    });

    if (!container) {
        return;
    }

    container.innerHTML = "";

    const activeAnnouncements =
        dashboardAnnouncements.filter(
            isDashboardAnnouncementActive
        );

    if (activeAnnouncements.length === 0) {
        container.innerHTML = `
            <p style="padding:10px;color:#64748b;">
                There are no announcements at the moment.
            </p>
        `;

        return;
    }

    activeAnnouncements.forEach(function (announcement) {
        container.appendChild(
            createAnnouncementCard(announcement)
        );
    });
}


async function loadDashboardAnnouncements() {
    if (dashboardAnnouncementsLoading) {
        return;
    }

    const client = getDashboardSupabaseClient();

    if (!client) {
        return;
    }

    dashboardAnnouncementsLoading = true;

    try {
        let query = client
            .from("announcements")
            .select("*")
            .order("created_at", {
                ascending: false
            });

        const { data, error } = await query;

        if (error) {
            throw error;
        }

        dashboardAnnouncements = data || [];

        displayDashboardAnnouncements();

        if (isDashboardAdmin()) {
            await loadManagedAnnouncements();
        }

    } catch (error) {
        console.error(
            "Unable to load announcements:",
            error
        );

    } finally {
        dashboardAnnouncementsLoading = false;
    }
}


// ==========================================================
// ANNOUNCEMENT MANAGEMENT
// ==========================================================

function openAnnouncementManagement() {
    const modal = document.getElementById(
        "announcementManagementModal"
    );

    if (!modal) {
        dashboardShowMessage(
            "Announcement management panel was not found.",
            "warning"
        );

        return;
    }

    modal.style.display = "flex";

    loadManagedAnnouncements();
}


function closeAnnouncementManagement() {
    const modal = document.getElementById(
        "announcementManagementModal"
    );

    if (modal) {
        modal.style.display = "none";
    }
}


async function loadAnnouncementTargetUsers() {
    const client = getDashboardSupabaseClient();

    const select = document.getElementById(
        "announcementTargetUser"
    );

    if (!client || !select) {
        return;
    }

    try {
        const { data, error } = await client
            .from("users")
            .select("id, full_name, role, status")
            .order("full_name", {
                ascending: true
            });

        if (error) {
            throw error;
        }

        select.innerHTML =
            '<option value="">Select a user</option>';

        (data || [])
            .filter(function (user) {
                return !user.status ||
                    String(user.status).toLowerCase() ===
                    "active";
            })
            .forEach(function (user) {
                const option =
                    document.createElement("option");

                option.value = user.id;

                option.textContent =
                    (user.full_name || "Unnamed User") +
                    " (" +
                    (user.role || "User") +
                    ")";

                select.appendChild(option);
            });

    } catch (error) {
        console.error(
            "Unable to load announcement recipients:",
            error
        );
    }
}


function handleAnnouncementTargetChange() {
    const targetType = document.getElementById(
        "announcementTargetType"
    );

    const targetUser = document.getElementById(
        "announcementTargetUser"
    );

    if (!targetType || !targetUser) {
        return;
    }

    const selectedType = String(
        targetType.value || ""
    ).toLowerCase();

    const wrapper =
        document.getElementById(
            "announcementTargetUserWrapper"
        );

    if (wrapper) {
        wrapper.style.display =
            selectedType.includes("user")
                ? "block"
                : "none";
    }

    targetUser.disabled =
        !selectedType.includes("user");
}


function toggleAnnouncementForm() {
    const form = document.getElementById(
        "announcementForm"
    );

    if (!form) {
        return;
    }

    form.style.display =
        form.style.display === "none"
            ? "block"
            : "none";
}


function resetAnnouncementForm() {
    const form = document.getElementById(
        "announcementForm"
    );

    if (form) {
        form.reset();
    }

    const idField = document.getElementById(
        "announcementId"
    );

    if (idField) {
        idField.value = "";
    }

    const submitButton = document.getElementById(
        "saveAnnouncementButton"
    );

    if (submitButton) {
        submitButton.textContent = "Save Announcement";
    }

    handleAnnouncementTargetChange();
}


function cancelAnnouncementForm() {
    resetAnnouncementForm();

    const form = document.getElementById(
        "announcementForm"
    );

    if (form) {
        form.style.display = "none";
    }
}


function showAnnouncementManagementMessage(
    message,
    type = "info"
) {
    const element = document.getElementById(
        "announcementManagementMessage"
    );

    if (!element) {
        dashboardShowMessage(message, type);
        return;
    }

    element.textContent = message;
    element.style.display = "block";

    element.style.color =
        type === "error"
            ? "#c62828"
            : type === "success"
                ? "#16803c"
                : "#1769aa";
}


async function createNotificationsForAnnouncement(
    announcement
) {
    const client = getDashboardSupabaseClient();

    if (!client || !announcement?.id) {
        return;
    }

    const { error } = await client.rpc(
        "create_announcement_notifications",
        {
            p_announcement_id: announcement.id
        }
    );

    if (error) {
        console.warn(
            "Announcement was saved, but notifications " +
            "could not be generated:",
            error.message
        );
    }
}


async function saveDashboardAnnouncement(event) {
    if (event) {
        event.preventDefault();
    }

    if (!isDashboardAdmin()) {
        dashboardShowMessage(
            "You do not have permission to manage announcements.",
            "error"
        );

        return;
    }

    const client = getDashboardSupabaseClient();

    if (!client) {
        return;
    }

    const title = document.getElementById(
        "announcementTitle"
    )?.value?.trim();

    const message = document.getElementById(
        "announcementMessage"
    )?.value?.trim();

    const priority = document.getElementById(
        "announcementPriority"
    )?.value || "normal";

    const targetType = document.getElementById(
        "announcementTargetType"
    )?.value || "all";

    const targetUserId = document.getElementById(
        "announcementTargetUser"
    )?.value || null;

    const announcementId = document.getElementById(
        "announcementId"
    )?.value;

    if (!title || !message) {
        showAnnouncementManagementMessage(
            "Enter both the announcement title and message.",
            "error"
        );

        return;
    }

    if (
        String(targetType).toLowerCase().includes("user") &&
        !targetUserId
    ) {
        showAnnouncementManagementMessage(
            "Select the user who should receive this announcement.",
            "error"
        );

        return;
    }

    const user = getDashboardLoggedInUser();

    const payload = {
        title: title,
        message: message,
        priority: priority,
        created_by: user?.id ?? null