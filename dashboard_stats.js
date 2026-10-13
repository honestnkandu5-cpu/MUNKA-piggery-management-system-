/* ============================================================
   MUNKA PIGGERY TECHNOLOGY
   LIVE DASHBOARD FARM STATISTICS
   ============================================================

   STATISTICS:
   1. Total pigs
   2. Sows
   3. Boars
   4. Piglets
   5. Weaners
   6. Growers
   7. Other pig categories
   8. Pregnant sows
   9. Expected farrowings
   10. Piglets weaned
   11. Treatments this month
   12. Sales this month
   13. Expenses this month
   14. Net balance

   SECURITY:
   - Regular users: assigned farm only.
   - Super Admin: platform-wide data only when permitted
     by the database's Row Level Security policies.

   IMPORTANT:
   - Uses the existing supabaseClient.
   - Does not modify supabase.js.
   - Uses unique helper names to avoid duplicate declarations.
   ============================================================ */


/* ============================================================
   CONFIGURATION
   ============================================================ */

window.munkaLiveStatistics = window.munkaLiveStatistics || {
    loaded: false,
    loading: false,
    refreshTimer: null,
    lastData: null
};


/* ============================================================
   GENERAL HELPERS
   ============================================================ */

function munkaStatsNumber(value) {
    return new Intl.NumberFormat("en-ZM").format(
        Number(value || 0)
    );
}


function munkaStatsMoney(value) {
    return new Intl.NumberFormat("en-ZM", {
        style: "currency",
        currency: "ZMW",
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    }).format(Number(value || 0));
}


function munkaStatsToday() {
    return new Intl.DateTimeFormat("en-CA", {
        timeZone: "Africa/Lusaka",
        year: "numeric",
        month: "2-digit",
        day: "2-digit"
    }).format(new Date());
}


function munkaStatsMonthRange() {
    const parts = new Intl.DateTimeFormat("en-GB", {
        timeZone: "Africa/Lusaka",
        year: "numeric",
        month: "2-digit"
    }).formatToParts(new Date());

    const values = {};

    parts.forEach(function (part) {
        if (part.type !== "literal") {
            values[part.type] = part.value;
        }
    });

    const year = Number(values.year);
    const month = Number(values.month);

    const start =
        String(year) + "-" +
        String(month).padStart(2, "0") +
        "-01";

    const nextMonth = new Date(
        Date.UTC(year, month, 1)
    );

    const end =
        nextMonth.getUTCFullYear() + "-" +
        String(nextMonth.getUTCMonth() + 1).padStart(2, "0") +
        "-01";

    return {
        start: start,
        end: end
    };
}


function munkaStatsDate(value) {
    if (!value) {
        return "Not recorded";
    }

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
        return "Not recorded";
    }

    return date.toLocaleDateString("en-ZM", {
        timeZone: "Africa/Lusaka",
        day: "2-digit",
        month: "short",
        year: "numeric"
    });
}


function munkaStatsEscape(value) {
    return String(value ?? "").replace(
        /[&<>"']/g,
        function (character) {
            const entities = {
                "&": "&amp;",
                "<": "&lt;",
                ">": "&gt;",
                '"': "&quot;",
                "'": "&#39;"
            };

            return entities[character];
        }
    );
}


/* ============================================================
   READ CURRENT USER
   ============================================================ */

function munkaStatsGetUser() {
    try {
        return JSON.parse(
            localStorage.getItem("loggedInUser") || "null"
        );
    } catch (error) {
        console.error(
            "MUNKA statistics: Unable to read logged-in user.",
            error
        );

        return null;
    }
}


function munkaStatsIsSuperAdmin(user) {
    if (!user) {
        return false;
    }

    return String(user.role || "")
        .trim()
        .toLowerCase() === "super admin";
}


/* ============================================================
   STATUS DISPLAY
   ============================================================ */

function munkaStatsSetStatus(message, isError) {
    const element = document.getElementById(
        "munkaLiveStatisticsStatus"
    );

    if (!element) {
        return;
    }

    element.textContent = message;

    element.classList.toggle(
        "statistics-error",
        Boolean(isError)
    );
}


/* ============================================================
   CREATE STATISTICS PANEL
   ============================================================ */

function createDashboardStatisticsPanel() {
    /*
     * Avoid creating duplicate panels.
     */

    if (
        document.getElementById(
            "munkaLiveStatisticsSection"
        )
    ) {
        return;
    }

    /*
     * Use the real announcements section in the supplied HTML.
     */

    const announcementsSection =
        document.querySelector(".announcements-section");

    if (!announcementsSection) {
        console.error(
            "MUNKA statistics: .announcements-section was not found."
        );

        return;
    }

    const section = document.createElement("section");

    section.id = "munkaLiveStatisticsSection";

    section.className =
        "dashboard-section farm-statistics-section";

    section.innerHTML = `
        <div class="section-heading statistics-heading">
            <div>
                <span class="section-kicker">
                    LIVE FARM PERFORMANCE
                </span>

                <h2>📊 Live Farm Statistics</h2>

                <p id="munkaLiveStatisticsSubtitle">
                    Loading farm performance...
                </p>
            </div>

            <button
                type="button"
                id="munkaRefreshStatisticsButton"
                class="dashboard-btn secondary-btn">
                ↻ Refresh
            </button>
        </div>

        <div
            id="munkaLiveStatisticsStatus"
            class="farm-statistics-status"
            role="status"
            aria-live="polite">
            Loading statistics...
        </div>

        <div class="munka-statistics-group">
            <h3>🐖 Pig Population</h3>

            <div class="munka-statistics-grid">

                <article class="munka-stat-card">
                    <span class="munka-stat-icon">🐖</span>
                    <span class="munka-stat-label">Total Pigs</span>
                    <strong id="munkaStatTotalPigs">0</strong>
                    <small>Registered pigs</small>
                </article>

                <article class="munka-stat-card">
                    <span class="munka-stat-icon">🐷</span>
                    <span class="munka-stat-label">Sows</span>
                    <strong id="munkaStatSows">0</strong>
                    <small>Recorded sow category</small>
                </article>

                <article class="munka-stat-card">
                    <span class="munka-stat-icon">🐗</span>
                    <span class="munka-stat-label">Boars</span>
                    <strong id="munkaStatBoars">0</strong>
                    <small>Recorded boar category</small>
                </article>

                <article class="munka-stat-card">
                    <span class="munka-stat-icon">🐖</span>
                    <span class="munka-stat-label">Piglets</span>
                    <strong id="munkaStatPiglets">0</strong>
                    <small>Registered piglet category</small>
                </article>

                <article class="munka-stat-card">
                    <span class="munka-stat-icon">🐽</span>
                    <span class="munka-stat-label">Weaners</span>
                    <strong id="munkaStatWeaners">0</strong>
                    <small>Registered weaner category</small>
                </article>

                <article class="munka-stat-card">
                    <span class="munka-stat-icon">🐖</span>
                    <span class="munka-stat-label">Growers</span>
                    <strong id="munkaStatGrowers">0</strong>
                    <small>Registered grower category</small>
                </article>

                <article class="munka-stat-card">
                    <span class="munka-stat-icon">📋</span>
                    <span class="munka-stat-label">Other Categories</span>
                    <strong id="munkaStatOtherCategories">0</strong>
                    <small>Other recorded categories</small>
                </article>

            </div>
        </div>

        <div class="munka-statistics-group">
            <h3>🤰 Breeding & Production</h3>

            <div class="munka-statistics-grid">

                <article class="munka-stat-card">
                    <span class="munka-stat-icon">🤰</span>
                    <span class="munka-stat-label">Pregnant Sows</span>
                    <strong id="munkaStatPregnantSows">0</strong>
                    <small>Active gestation records</small>
                </article>

                <article class="munka-stat-card">
                    <span class="munka-stat-icon">📅</span>
                    <span class="munka-stat-label">Expected Farrowings</span>
                    <strong id="munkaStatExpectedFarrowings">0</strong>
                    <small>Due today or later</small>
                </article>

                <article class="munka-stat-card">
                    <span class="munka-stat-icon">🐽</span>
                    <span class="munka-stat-label">Piglets Weaned</span>
                    <strong id="munkaStatPigletsWeaned">0</strong>
                    <small>Total in weaning records</small>
                </article>

            </div>
        </div>

        <div class="munka-statistics-group">
            <h3>💉 Health & Finance</h3>

            <div class="munka-statistics-grid">

                <article class="munka-stat-card">
                    <span class="munka-stat-icon">💉</span>
                    <span class="munka-stat-label">Treatments</span>
                    <strong id="munkaStatTreatments">0</strong>
                    <small>This month</small>
                </article>

                <article class="munka-stat-card">
                    <span class="munka-stat-icon">💰</span>
                    <span class="munka-stat-label">Sales</span>
                    <strong id="munkaStatSales">ZMW 0.00</strong>
                    <small>This month</small>
                </article>

                <article class="munka-stat-card">
                    <span class="munka-stat-icon">💳</span>
                    <span class="munka-stat-label">Expenses</span>
                    <strong id="munkaStatExpenses">ZMW 0.00</strong>
                    <small>This month</small>
                </article>

                <article class="munka-stat-card munka-net-balance">
                    <span class="munka-stat-icon">📈</span>
                    <span class="munka-stat-label">Net Balance</span>
                    <strong id="munkaStatNetBalance">ZMW 0.00</strong>
                    <small>Sales minus expenses</small>
                </article>

            </div>
        </div>

        <div
            id="munkaStatisticsCategoryDetails"
            class="munka-statistics-category-details">
        </div>

        <p class="munka-statistics-updated">
            Last updated:
            <strong id="munkaStatisticsLastUpdated">Not yet updated</strong>
        </p>
    `;

    announcementsSection.insertAdjacentElement(
        "afterend",
        section
    );

    const refreshButton = document.getElementById(
        "munkaRefreshStatisticsButton"
    );

    if (refreshButton) {
        refreshButton.addEventListener(
            "click",
            loadDashboardFarmStatistics
        );
    }

    munkaStatsAddStyles();
}


/* ============================================================
   STATISTICS STYLES
   ============================================================ */

function munkaStatsAddStyles() {
    if (document.getElementById("munkaStatisticsStyles")) {
        return;
    }

    const style = document.createElement("style");

    style.id = "munkaStatisticsStyles";

    style.textContent = `
        #munkaLiveStatisticsSection {
            margin-top: 24px;
            margin-bottom: 24px;
        }

        #munkaLiveStatisticsSection .munka-statistics-group {
            margin-top: 24px;
        }

        #munkaLiveStatisticsSection .munka-statistics-group h3 {
            margin-bottom: 14px;
        }

        #munkaLiveStatisticsSection .munka-statistics-grid {
            display: grid;
            grid-template-columns: repeat(
                auto-fit,
                minmax(185px, 1fr)
            );
            gap: 16px;
        }

        #munkaLiveStatisticsSection .munka-stat-card {
            display: flex;
            flex-direction: column;
            gap: 9px;
            min-width: 0;
            padding: 20px;
            border-radius: 15px;
            border: 1px solid #dbe5ed;
            background: var(--card-bg, #ffffff);
            box-shadow: 0 4px 14px rgba(0, 0, 0, 0.06);
        }

        #munkaLiveStatisticsSection .munka-stat-icon {
            font-size: 27px;
        }

        #munkaLiveStatisticsSection .munka-stat-label {
            font-size: 14px;
            font-weight: 600;
        }

        #munkaLiveStatisticsSection .munka-stat-card strong {
            font-size: clamp(21px, 3vw, 29px);
            overflow-wrap: anywhere;
        }

        #munkaLiveStatisticsSection .munka-stat-card small {
            font-size: 12px;
            opacity: 0.75;
        }

        #munkaLiveStatisticsSection .munka-statistics-updated {
            margin-top: 18px;
            font-size: 12px;
        }

        #munkaLiveStatisticsSection .munka-statistics-category-details {
            margin-top: 20px;
        }

        #munkaLiveStatisticsSection .munka-category-row {
            display: flex;
            justify-content: space-between;
            gap: 12px;
            padding: 10px 12px;
            border-bottom: 1px solid #dbe5ed;
        }

        #munkaLiveStatisticsSection .statistics-error {
            color: #b42318;
        }

        @media (max-width: 480px) {
            #munkaLiveStatisticsSection .munka-statistics-grid {
                grid-template-columns: repeat(2, minmax(0, 1fr));
                gap: 10px;
            }

            #munkaLiveStatisticsSection .munka-stat-card {
                padding: 13px;
            }
        }
    `;

    document.head.appendChild(style);
}


/* ============================================================
   UPDATE DISPLAY
   ============================================================ */

function munkaStatsSetValue(id, value) {
    const element = document.getElementById(id);

    if (element) {
        element.textContent = value;
    }
}


function munkaStatsDisplayCategoryDetails(categories) {
    const container = document.getElementById(
        "munkaStatisticsCategoryDetails"
    );

    if (!container) {
        return;
    }

    const entries = Object.entries(categories).sort(
        function (a, b) {
            return a[0].localeCompare(b[0]);
        }
    );

    if (entries.length === 0) {
        container.innerHTML = "";
        return;
    }

    container.innerHTML = `
        <h3>📋 Registered Pig Categories</h3>
        ${entries.map(function (entry) {
            return `
                <div class="munka-category-row">
                    <span>${munkaStatsEscape(entry[0])}</span>
                    <strong>${munkaStatsNumber(entry[1])}</strong>
                </div>
            `;
        }).join("")}
    `;
}


/* ============================================================
   NORMALIZE PIG CATEGORY
   ============================================================ */

function munkaStatsNormalizeCategory(value) {
    return String(value || "")
        .trim()
        .toLowerCase()
        .replace(/[_-]+/g, " ")
        .replace(/\s+/g, " ");
}


function munkaStatsGetPigCategories(pigs) {
    const categories = {};

    (pigs || []).forEach(function (pig) {
        const rawCategory = String(
            pig.category || ""
        ).trim();

        const category = rawCategory || "Unspecified";

        categories[category] =
            (categories[category] || 0) + 1;
    });

    const result = {
        categories: categories,
        sows: 0,
        boars: 0,
        piglets: 0,
        weaners: 0,
        growers: 0,
        other: 0
    };

    Object.entries(categories).forEach(function (entry) {
        const category = munkaStatsNormalizeCategory(entry[0]);
        const count = entry[1];

        if (
            category === "sow" ||
            category === "sows"
        ) {
            result.sows += count;
        } else if (
            category === "boar" ||
            category === "boars"
        ) {
            result.boars += count;
        } else if (
            category === "piglet" ||
            category === "piglets" ||
            category === "suckling piglet" ||
            category === "suckling piglets"
        ) {
            result.piglets += count;
        } else if (
            category === "weaner" ||
            category === "weaners"
        ) {
            result.weaners += count;
        } else if (
            category === "grower" ||
            category === "growers"
        ) {
            result.growers += count;
        } else {
            result.other += count;
        }
    });

    return result;
}


/* ============================================================
   CHECK ACTIVE GESTATION
   ============================================================ */

function dashboardStatsIsActiveGestation(record) {
    if (!record) {
        return false;
    }

    const status = String(record.status || "")
        .trim()
        .toLowerCase();

    const closedStatuses = [
        "completed",
        "complete",
        "cancelled",
        "canceled",
        "farrowed",
        "closed",
        "finished",
        "delivered"
    ];

    return !closedStatuses.includes(status);
}


/* ============================================================
   SUPABASE QUERY HELPERS
   ============================================================ */

function munkaStatsApplyFarmFilter(query, farmId, isSuperAdmin) {
    if (!isSuperAdmin) {
        return query.eq("farm_id", farmId);
    }

    /*
     * Super Admin has no farm_id filter here.
     *
     * Supabase RLS must still authorize cross-farm access.
     */

    return query;
}


async function munkaStatsFetchAllRows(query) {
    const pageSize = 1000;
    let allRows = [];
    let offset = 0;

    while (true) {
        const result = await query.range(
            offset,
            offset + pageSize - 1
        );

        if (result.error) {
            throw result.error;
        }

        const rows = result.data || [];

        allRows = allRows.concat(rows);

        if (rows.length < pageSize) {
            break;
        }

        offset += pageSize;
    }

    return allRows;
}


/* ============================================================
   MAIN STATISTICS LOADER
   ============================================================ */

async function loadDashboardFarmStatistics() {
    createDashboardStatisticsPanel();

    if (window.munkaLiveStatistics.loading) {
        return;
    }

    if (
        typeof supabaseClient === "undefined" ||
        !supabaseClient
    ) {
        munkaStatsSetStatus(
            "Supabase is not available. Check your script configuration.",
            true
        );

        return;
    }

    window.munkaLiveStatistics.loading = true;

    munkaStatsSetStatus(
        "Loading the latest statistics...",
        false
    );

    const refreshButton = document.getElementById(
        "munkaRefreshStatisticsButton"
    );

    if (refreshButton) {
        refreshButton.disabled = true;
        refreshButton.textContent = "Loading...";
    }

    try {
        const user = munkaStatsGetUser();

        if (!user) {
            munkaStatsSetStatus(
                "Please log in to view statistics.",
                true
            );

            return;
        }

        const isSuperAdmin = munkaStatsIsSuperAdmin(user);

        const farmId = Number(
            user.farm_id ||
            window.dashboardCurrentFarmId ||
            0
        );

        if (!isSuperAdmin && !farmId) {
            munkaStatsSetStatus(
                "No farm is assigned to this account.",
                true
            );

            return;
        }

        /*
         * Confirm the current authenticated Supabase session.
         */

        const sessionResult =
            await supabaseClient.auth.getSession();

        if (sessionResult.error) {
            throw sessionResult.error;
        }

        if (!sessionResult.data.session) {
            munkaStatsSetStatus(
                "Your session has expired. Please log in again.",
                true
            );

            return;
        }

        const month = munkaStatsMonthRange();
        const today = munkaStatsToday();

        const subtitle = document.getElementById(
            "munkaLiveStatisticsSubtitle"
        );

        if (subtitle) {
            subtitle.textContent = isSuperAdmin
                ? "Platform-wide statistics, subject to database permissions."
                : "Performance overview for your assigned farm.";
        }

        /* ================================================
           1. PIG POPULATION AND CATEGORIES
        ================================================ */

        let pigsQuery = supabaseClient
            .from("pigs")
            .select("id, category");

        pigsQuery = munkaStatsApplyFarmFilter(
            pigsQuery,
            farmId,
            isSuperAdmin
        );

        const pigs = await munkaStatsFetchAllRows(
            pigsQuery
        );

        const pigStats = munkaStatsGetPigCategories(
            pigs
        );

        munkaStatsSetValue(
            "munkaStatTotalPigs",
            munkaStatsNumber(pigs.length)
        );

        munkaStatsSetValue(
            "munkaStatSows",
            munkaStatsNumber(pigStats.sows)
        );

        munkaStatsSetValue(
            "munkaStatBoars",
            munkaStatsNumber(pigStats.boars)
        );

        munkaStatsSetValue(
            "munkaStatPiglets",
            munkaStatsNumber(pigStats.piglets)
        );

        munkaStatsSetValue(
            "munkaStatWeaners",
            munkaStatsNumber(pigStats.weaners)
        );

        munkaStatsSetValue(
            "munkaStatGrowers",
            munkaStatsNumber(pigStats.growers)
        );

        munkaStatsSetValue(
            "munkaStatOtherCategories",
            munkaStatsNumber(pigStats.other)
        );

        munkaStatsDisplayCategoryDetails(
            pigStats.categories
        );

        /* ================================================
           2. GESTATION AND EXPECTED FARROWINGS
        ================================================ */

        let gestationQuery = supabaseClient
            .from("gestation_records")
            .select("id, sow_id, service_date, delivery_date, status");

        gestationQuery = munkaStatsApplyFarmFilter(
            gestationQuery,
            farmId,
            isSuperAdmin
        );

        const gestationRecords =
            await munkaStatsFetchAllRows(
                gestationQuery
            );

        const activeGestations =
            gestationRecords.filter(function (record) {
                return dashboardStatsIsActiveGestation(record);
            });

        /*
         * Pregnant sows are counted from active gestation
         * records that have a service date.
         *
         * If the same sow has multiple active records,
         * count that sow only once.
         */

        const pregnantSowIds = new Set();

        activeGestations.forEach(function (record) {
            if (!record.service_date || !record.sow_id) {
                return;
            }

            pregnantSowIds.add(String(record.sow_id));
        });

        const pregnantSows = pregnantSowIds.size;

        /*
         * Count active records with a delivery date
         * today or later.
         */

        const expectedFarrowings =
            activeGestations.filter(function (record) {
                if (!record.delivery_date) {
                    return false;
                }

                return record.delivery_date >= today;
            }).length;

        munkaStatsSetValue(
            "munkaStatPregnantSows",
            munkaStatsNumber(pregnantSows)
        );

        munkaStatsSetValue(
            "munkaStatExpectedFarrowings",
            munkaStatsNumber(expectedFarrowings)
        );

        /* ================================================
           3. PIGLETS WEANED
        ================================================ */

        let weaningQuery = supabaseClient
            .from("weaning_records")
            .select("total_weaned");

        weaningQuery = munkaStatsApplyFarmFilter(
            weaningQuery,
            farmId,
            isSuperAdmin
        );

        const weaningRecords =
            await munkaStatsFetchAllRows(
                weaningQuery
            );

        const pigletsWeaned = weaningRecords.reduce(
            function (total, record) {
                return total + Number(
                    record.total_weaned || 0
                );
            },
            0
        );

        munkaStatsSetValue(
            "munkaStatPigletsWeaned",
            munkaStatsNumber(pigletsWeaned)
        );

        /* ================================================
           4. TREATMENTS THIS MONTH
        ================================================ */

        let treatmentsQuery = supabaseClient
            .from("treatment_records")
            .select("id", { count: "exact", head: true })
            .gte("treatment_date", month.start)
            .lt("treatment_date", month.end);

        treatmentsQuery = munkaStatsApplyFarmFilter(
            treatmentsQuery,
            farmId,
            isSuperAdmin
        );

        const treatmentsResult = await treatmentsQuery;

        if (treatmentsResult.error) {
            throw treatmentsResult.error;
        }

        const treatmentsMonth =
            treatmentsResult.count || 0;

        munkaStatsSetValue(
            "munkaStatTreatments",
            munkaStatsNumber(treatmentsMonth)
        );

        /* ================================================
           5. SALES THIS MONTH
        ================================================ */

        let salesQuery = supabaseClient
            .from("sales_records")
            .select("total_amount")
            .gte("sale_date", month.start)
            .lt("sale_date", month.end);

        salesQuery = munkaStatsApplyFarmFilter(
            salesQuery,
            farmId,
            isSuperAdmin
        );

        const salesRecords =
            await munkaStatsFetchAllRows(
                salesQuery
            );

        const salesMonth = salesRecords.reduce(
            function (total, record) {
                return total + Number(
                    record.total_amount || 0
                );
            },
            0
        );

        munkaStatsSetValue(
            "munkaStatSales",
            munkaStatsMoney(salesMonth)
        );

        /* ================================================
           6. EXPENSES THIS MONTH
        ================================================ */

        let expensesQuery = supabaseClient
            .from("expenses_records")
            .select("total_amount")
            .gte("expense_date", month.start)
            .lt("expense_date", month.end);

        expensesQuery = munkaStatsApplyFarmFilter(
            expensesQuery,
            farmId,
            isSuperAdmin
        );

        const expenseRecords =
            await munkaStatsFetchAllRows(
                expensesQuery
            );

        const expensesMonth = expenseRecords.reduce(
            function (total, record) {
                return total + Number(
                    record.total_amount || 0
                );
            },
            0
        );

        munkaStatsSetValue(
            "munkaStatExpenses",
            munkaStatsMoney(expensesMonth)
        );

        /* ================================================
           7. NET BALANCE
        ================================================ */

        const netBalance =
            salesMonth - expensesMonth;

        munkaStatsSetValue(
            "munkaStatNetBalance",
            munkaStatsMoney(netBalance)
        );

        /* ================================================
           SAVE RESULTS
        ================================================ */

        const statistics = {
            farmId: isSuperAdmin ? null : farmId,
            platformWide: isSuperAdmin,
            totalPigs: pigs.length,
            categories: pigStats.categories,
            sows: pigStats.sows,
            boars: pigStats.boars,
            piglets: pigStats.piglets,
            weaners: pigStats.weaners,
            growers: pigStats.growers,
            otherCategories: pigStats.other,
            pregnantSows: pregnantSows,
            expectedFarrowings: expectedFarrowings,
            pigletsWeaned: pigletsWeaned,
            treatmentsMonth: treatmentsMonth,
            salesMonth: salesMonth,
            expensesMonth: expensesMonth,
            netBalance: netBalance,
            monthStart: month.start,
            monthEnd: month.end
        };

        window.munkaLiveStatistics.lastData =
            statistics;

        /*
         * Keep the existing dashboard statistics object
         * updated without redeclaring its variable.
         */

        window.dashboardFarmStatistics = statistics;

        const updatedElement = document.getElementById(
            "munkaStatisticsLastUpdated"
        );

        if (updatedElement) {
            updatedElement.textContent =
                new Date().toLocaleString("en-ZM", {
                    timeZone: "Africa/Lusaka",
                    dateStyle: "medium",
                    timeStyle: "short"
                });
        }

        munkaStatsSetStatus(
            isSuperAdmin
                ? "Platform statistics updated successfully."
                : "Farm statistics updated successfully.",
            false
        );

        window.munkaLiveStatistics.loaded = true;

        console.log(
            "MUNKA live statistics:",
            statistics
        );

    } catch (error) {
        console.error(
            "MUNKA live statistics error:",
            error
        );

        munkaStatsSetStatus(
            "Unable to load all statistics. Check Supabase permissions, table access and database column names.",
            true
        );

    } finally {
        window.munkaLiveStatistics.loading = false;

        const refreshButton = document.getElementById(
            "munkaRefreshStatisticsButton"
        );

        if (refreshButton) {
            refreshButton.disabled = false;
            refreshButton.textContent = "↻ Refresh";
        }
    }
}


/* ============================================================
   INITIALIZATION
   ============================================================ */

function initializeDashboardFarmStatistics() {
    createDashboardStatisticsPanel();

    loadDashboardFarmStatistics();
}


/* ============================================================
   INITIALIZE WITHOUT DUPLICATING THE MAIN DASHBOARD
   ============================================================ */

if (!window.munkaLiveStatistics.initializationRegistered) {
    window.munkaLiveStatistics.initializationRegistered = true;

    document.addEventListener(
        "DOMContentLoaded",
        initializeDashboardFarmStatistics
    );
}