/* ============================================================
   MUNKA PIGGERY TECHNOLOGY
   PROFESSIONAL LIVE FARM STATISTICS

   File: dashboard_stats.js

   FEATURES
   - Farm-specific statistics
   - Verified actual population from farm_population_summary
   - Individual pig records and group totals shown separately
   - Correct group-based weaner counting
   - Pregnant and lactating sow statistics
   - Unclassified pig records shown separately
   - Population movements
   - Breeding and production statistics
   - Monthly treatments
   - Monthly sales, payments, and expenses
   - Zambia date and time
   - Automatic and manual refreshing
   - Responsive dashboard
   ============================================================ */

(function () {
    "use strict";

    const STYLE_ID = "munka-live-statistics-styles";
    const SECTION_ID = "munkaLiveStatisticsSection";
    const REFRESH_INTERVAL = 5 * 60 * 1000;
    const PAGE_SIZE = 1000;

    let refreshTimer = null;
    let isLoading = false;
    let lastSuccessfulData = null;

    const state = {
        initialized: false,
        lastUpdated: null,
        lastError: null
    };

    /* ========================================================
       GENERAL HELPERS
    ======================================================== */

    function getSupabaseClient() {
        if (
            typeof supabaseClient !== "undefined" &&
            supabaseClient
        ) {
            return supabaseClient;
        }

        if (
            window.supabaseClient &&
            typeof window.supabaseClient.from === "function"
        ) {
            return window.supabaseClient;
        }

        return null;
    }

    function getLoggedInUser() {
        try {
            const value = localStorage.getItem("loggedInUser");
            return value ? JSON.parse(value) : null;
        } catch (error) {
            console.error("MUNKA user error:", error);
            return null;
        }
    }

    function normalizeText(value) {
        return String(value ?? "")
            .trim()
            .toLowerCase()
            .replace(/\s+/g, " ");
    }

    function numberValue(value) {
        if (
            value === null ||
            value === undefined ||
            value === ""
        ) {
            return 0;
        }

        const number = Number(value);

        return Number.isFinite(number) ? number : 0;
    }

    function formatNumber(value) {
        return new Intl.NumberFormat("en-ZM", {
            maximumFractionDigits: 0
        }).format(numberValue(value));
    }

    function formatCurrency(value) {
        return "ZMW " + new Intl.NumberFormat("en-ZM", {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        }).format(numberValue(value));
    }

    function formatVerifiedPopulation(value) {
        if (
            value === null ||
            value === undefined ||
            value === ""
        ) {
            return "Not verified";
        }

        const number = Number(value);

        if (!Number.isFinite(number) || number < 0) {
            return "Not verified";
        }

        return formatNumber(number);
    }

    function getZambiaDateParts() {
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

    function getZambiaToday() {
        const parts = getZambiaDateParts();

        return (
            parts.year + "-" +
            parts.month + "-" +
            parts.day
        );
    }

    function getMonthRange() {
        const today = getZambiaToday();

        const year = Number(today.substring(0, 4));
        const month = Number(today.substring(5, 7));

        let nextYear = year;
        let nextMonth = month + 1;

        if (nextMonth > 12) {
            nextMonth = 1;
            nextYear++;
        }

        return {
            today: today,
            start: today.substring(0, 8) + "01",
            end:
                String(nextYear) + "-" +
                String(nextMonth).padStart(2, "0") +
                "-01"
        };
    }

    function formatZambiaDateTime(date) {
        return new Intl.DateTimeFormat("en-ZM", {
            timeZone: "Africa/Lusaka",
            day: "2-digit",
            month: "short",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit",
            hour12: true
        }).format(date);
    }

    function isDateInCurrentMonth(dateValue, monthRange) {
        if (!dateValue) {
            return false;
        }

        const date = String(dateValue).substring(0, 10);

        return (
            date >= monthRange.start &&
            date < monthRange.end
        );
    }

    function setText(id, value) {
        const element = document.getElementById(id);

        if (element) {
            element.textContent = String(value);
        }
    }

    function setStatus(message, type) {
        const element = document.getElementById(
            "munkaLiveStatisticsStatus"
        );

        if (!element) {
            return;
        }

        element.textContent = message;
        element.className =
            "munka-statistics-status " + (type || "info");
    }

    function setLastUpdated(date) {
        setText(
            "munkaStatisticsLastUpdated",
            date
                ? "Last updated: " + formatZambiaDateTime(date)
                : "Statistics have not been updated yet."
        );
    }

    function setLoading(loading) {
        const button = document.getElementById(
            "munkaRefreshStatisticsButton"
        );

        const spinner = document.getElementById(
            "munkaStatisticsSpinner"
        );

        if (button) {
            button.disabled = loading;
            button.textContent = loading
                ? "Refreshing..."
                : "Refresh Statistics";
        }

        if (spinner) {
            spinner.style.display = loading
                ? "inline-block"
                : "none";
        }

        const section = document.getElementById(SECTION_ID);

        if (section) {
            section.setAttribute(
                "aria-busy",
                loading ? "true" : "false"
            );
        }
    }

    /* ========================================================
       USER VALIDATION
    ======================================================== */

    function validateUser() {
        const user = getLoggedInUser();

        if (!user) {
            return {
                ok: false,
                message: "Please log in to view farm statistics."
            };
        }

        if (normalizeText(user.role) === "super admin") {
            return {
                ok: false,
                message:
                    "Farm statistics are available from a farm user's dashboard."
            };
        }

        if (
            user.farm_id === null ||
            user.farm_id === undefined ||
            String(user.farm_id).trim() === ""
        ) {
            return {
                ok: false,
                message:
                    "Your account has no assigned farm. Contact your farm administrator."
            };
        }

        return {
            ok: true,
            user: user,
            farmId: user.farm_id
        };
    }

    /* ========================================================
       FARM-SCOPED PAGINATED DATA
    ======================================================== */

    async function fetchAllFarmRows(
        client,
        tableName,
        columns,
        farmId,
        configureQuery
    ) {
        let allRows = [];
        let offset = 0;

        while (true) {
            let query = client
                .from(tableName)
                .select(columns)
                .eq("farm_id", farmId);

            if (typeof configureQuery === "function") {
                query = configureQuery(query);
            }

            const result = await query.range(
                offset,
                offset + PAGE_SIZE - 1
            );

            if (result.error) {
                throw new Error(
                    tableName + ": " + result.error.message
                );
            }

            const rows = result.data || [];

            allRows = allRows.concat(rows);

            if (rows.length < PAGE_SIZE) {
                break;
            }

            offset += PAGE_SIZE;
        }

        return allRows;
    }

    /* ========================================================
       VERIFIED POPULATION SUMMARY
    ======================================================== */

    async function fetchPopulationSummary(client, farmId) {
        const result = await client
            .from("farm_population_summary")
            .select(
                "farm_id, farm_name, opening_date, " +
                "opening_population, current_population, " +
                "births_since_opening, purchases_since_opening, " +
                "arrivals_since_opening, deaths_since_opening, " +
                "sales_since_opening"
            )
            .eq("farm_id", farmId)
            .maybeSingle();

        if (result.error) {
            throw new Error(
                "Population summary: " + result.error.message
            );
        }

        if (!result.data) {
            throw new Error(
                "No population summary exists for your farm."
            );
        }

        return result.data;
    }

    /* ========================================================
       INDIVIDUAL PIG CATEGORY COUNTS

       Pregnant and lactating sows are included in total sows.
       Group animals are handled separately.
    ======================================================== */

    function calculateRegisteredPigs(pigs) {
        const stats = {
            total: pigs.length,
            sows: 0,
            boars: 0,
            piglets: 0,
            weaners: 0,
            growers: 0,
            pregnantSows: 0,
            lactatingSows: 0,
            unspecified: 0
        };

        pigs.forEach(function (pig) {
            const category = normalizeText(pig.category);

            if (
                category === "sow" ||
                category === "sows"
            ) {
                stats.sows++;
            } else if (
                category === "pregnant sow" ||
                category === "pregnant sows"
            ) {
                stats.sows++;
                stats.pregnantSows++;
            } else if (
                category === "lactating sow" ||
                category === "lactating sows"
            ) {
                stats.sows++;
                stats.lactatingSows++;
            } else if (
                category === "boar" ||
                category === "boars"
            ) {
                stats.boars++;
            } else if (
                category === "piglet" ||
                category === "piglets" ||
                category === "suckling piglet" ||
                category === "suckling piglets"
            ) {
                stats.piglets++;
            } else if (
                category === "weaner" ||
                category === "weaners"
            ) {
                stats.weaners++;
            } else if (
                category === "grower" ||
                category === "growers"
            ) {
                stats.growers++;
            } else {
                stats.unspecified++;
            }
        });

        return stats;
    }

    /* ========================================================
       GROUP QUANTITIES

       These are separate group totals. We do not add them
       blindly to individual records because some individuals
       may already belong to a group.
    ======================================================== */

    function calculatePigGroups(groups) {
        const stats = {
            pigletGroups: 0,
            pigletAnimals: 0,
            weanerGroups: 0,
            weanerAnimals: 0
        };

        groups.forEach(function (group) {
            const category = normalizeText(group.category);
            const quantity = Math.max(
                0,
                Math.floor(numberValue(group.quantity))
            );

            if (
                category === "piglet" ||
                category === "piglets"
            ) {
                stats.pigletGroups++;
                stats.pigletAnimals += quantity;
            } else if (
                category === "weaner" ||
                category === "weaners"
            ) {
                stats.weanerGroups++;
                stats.weanerAnimals += quantity;
            }
        });

        return stats;
    }

    /* ========================================================
       BREEDING
    ======================================================== */

    function calculateBreeding(records, pigs, today) {
        const pregnantSowIds = new Set();
        const expectedSowIds = new Set();

        records.forEach(function (record) {
            if (normalizeText(record.status) !== "pregnant") {
                return;
            }

            if (record.sow_id !== null &&
                record.sow_id !== undefined) {
                pregnantSowIds.add(
                    String(record.sow_id).trim()
                );

                if (
                    record.delivery_date &&
                    String(record.delivery_date).substring(0, 10) >= today
                ) {
                    expectedSowIds.add(
                        String(record.sow_id).trim()
                    );
                }
            }
        });

        const registeredPregnantIds = new Set();

        pigs.forEach(function (pig) {
            const category = normalizeText(pig.category);

            if (
                category === "pregnant sow" ||
                category === "pregnant sows"
            ) {
                registeredPregnantIds.add(
                    String(pig.id)
                );
            }
        });

        return {
            pregnantSows: Math.max(
                pregnantSowIds.size,
                registeredPregnantIds.size
            ),
            expectedFarrowings: expectedSowIds.size
        };
    }

    /* ========================================================
       WEANING
    ======================================================== */

    function calculateWeaning(records, monthRange) {
        let cumulative = 0;
        let thisMonth = 0;
        let recordsThisMonth = 0;

        records.forEach(function (record) {
            const total = Math.max(
                0,
                numberValue(record.total_weaned)
            );

            cumulative += total;

            if (
                isDateInCurrentMonth(
                    record.weaning_date,
                    monthRange
                )
            ) {
                thisMonth += total;
                recordsThisMonth++;
            }
        });

        return {
            cumulative: cumulative,
            thisMonth: thisMonth,
            recordsThisMonth: recordsThisMonth
        };
    }

    /* ========================================================
       TREATMENTS
    ======================================================== */

    function calculateTreatments(records, monthRange) {
        return {
            thisMonth: records.filter(function (record) {
                return isDateInCurrentMonth(
                    record.treatment_date,
                    monthRange
                );
            }).length
        };
    }

    /* ========================================================
       SALES
    ======================================================== */

    function calculateSales(records, monthRange) {
        let totalSales = 0;
        let paymentsReceived = 0;
        let pendingPayments = 0;
        let paidTransactions = 0;
        let pendingTransactions = 0;

        records.forEach(function (record) {
            if (
                !isDateInCurrentMonth(
                    record.sale_date,
                    monthRange
                )
            ) {
                return;
            }

            const amount = numberValue(record.total_amount);
            totalSales += amount;

            const status = normalizeText(record.payment_status);

            if (status === "paid") {
                paymentsReceived += amount;
                paidTransactions++;
            } else if (
                status === "pending" ||
                status === "unpaid"
            ) {
                pendingPayments += amount;
                pendingTransactions++;
            }
        });

        return {
            totalSales: totalSales,
            paymentsReceived: paymentsReceived,
            pendingPayments: pendingPayments,
            paidTransactions: paidTransactions,
            pendingTransactions: pendingTransactions
        };
    }

    /* ========================================================
       EXPENSES
    ======================================================== */

    function calculateExpenses(records, monthRange) {
        return records.reduce(function (total, record) {
            if (
                isDateInCurrentMonth(
                    record.expense_date,
                    monthRange
                )
            ) {
                return total + numberValue(record.total_amount);
            }

            return total;
        }, 0);
    }

    /* ========================================================
       STYLES
    ======================================================== */

    function injectStyles() {
        if (document.getElementById(STYLE_ID)) {
            return;
        }

        const style = document.createElement("style");
        style.id = STYLE_ID;

        style.textContent = `
            #${SECTION_ID} {
                width:100%;
                margin:24px 0;
                padding:24px;
                box-sizing:border-box;
                border-radius:18px;
                background:var(--munka-stats-bg,#fff);
                border:1px solid var(--munka-stats-border,#e0e8e1);
                box-shadow:0 5px 20px rgba(20,65,35,.07);
                color:var(--munka-stats-text,#183d28);
            }

            #${SECTION_ID} *,
            #${SECTION_ID} *::before,
            #${SECTION_ID} *::after {
                box-sizing:border-box;
            }

            #${SECTION_ID} .munka-stats-header {
                display:flex;
                justify-content:space-between;
                align-items:flex-start;
                flex-wrap:wrap;
                gap:16px;
                margin-bottom:20px;
            }

            #${SECTION_ID} .munka-stats-title {
                margin:0 0 7px;
                font-size:clamp(21px,3vw,28px);
                font-weight:800;
                color:var(--munka-stats-heading,#176b38);
            }

            #${SECTION_ID} .munka-stats-subtitle {
                margin:0;
                font-size:14px;
                line-height:1.6;
                color:var(--munka-stats-muted,#617166);
            }

            #${SECTION_ID} .munka-refresh-button {
                min-height:44px;
                padding:10px 16px;
                border:0;
                border-radius:9px;
                background:#176b38;
                color:#fff;
                font-weight:700;
                cursor:pointer;
            }

            #${SECTION_ID} .munka-refresh-button:disabled {
                opacity:.6;
                cursor:wait;
            }

            #${SECTION_ID} .munka-statistics-spinner {
                display:none;
                width:13px;
                height:13px;
                margin-right:7px;
                vertical-align:middle;
                border:2px solid rgba(255,255,255,.4);
                border-top-color:#fff;
                border-radius:50%;
                animation:munkaStatsSpin .8s linear infinite;
            }

            @keyframes munkaStatsSpin {
                to { transform:rotate(360deg); }
            }

            #${SECTION_ID} .munka-stats-period {
                margin:0 0 14px;
                font-size:13px;
                font-weight:700;
                color:var(--munka-stats-muted,#617166);
            }

            #${SECTION_ID} .munka-stats-group-title {
                grid-column:1/-1;
                margin:18px 0 0;
                padding-bottom:10px;
                border-bottom:1px solid var(--munka-stats-border,#e0e8e1);
                font-size:16px;
                font-weight:800;
                color:var(--munka-stats-heading,#176b38);
            }

            #${SECTION_ID} .munka-statistics-grid {
                display:grid;
                grid-template-columns:repeat(4,minmax(0,1fr));
                gap:14px;
            }

            #${SECTION_ID} .munka-stat-card {
                min-width:0;
                padding:16px;
                border-radius:13px;
                border:1px solid var(--munka-stats-border,#e0e8e1);
                background:var(--munka-stats-card-bg,#fbfdfb);
                position:relative;
                overflow:hidden;
            }

            #${SECTION_ID} .munka-stat-card::before {
                content:"";
                position:absolute;
                top:0;
                left:0;
                width:4px;
                height:100%;
                background:var(--munka-card-accent,#27834a);
            }

            #${SECTION_ID} .green { --munka-card-accent:#23834a; }
            #${SECTION_ID} .blue { --munka-card-accent:#2879b9; }
            #${SECTION_ID} .orange { --munka-card-accent:#d78624; }
            #${SECTION_ID} .red { --munka-card-accent:#c64a4a; }
            #${SECTION_ID} .purple { --munka-card-accent:#8055ae; }
            #${SECTION_ID} .teal { --munka-card-accent:#198b8b; }

            #${SECTION_ID} .munka-stat-category {
                display:inline-block;
                margin-bottom:10px;
                padding:4px 8px;
                border-radius:5px;
                background:var(--munka-stats-border,#e0e8e1);
                color:var(--munka-stats-heading,#176b38);
                font-size:10px;
                font-weight:800;
                text-transform:uppercase;
                letter-spacing:.5px;
            }

            #${SECTION_ID} .munka-stat-label {
                display:block;
                margin-bottom:10px;
                font-size:12px;
                line-height:1.5;
                font-weight:700;
                color:var(--munka-stats-muted,#617166);
                overflow-wrap:anywhere;
            }

            #${SECTION_ID} .munka-stat-value {
                display:block;
                font-size:clamp(22px,2.3vw,30px);
                line-height:1.3;
                font-weight:800;
                color:var(--munka-stats-text,#183d28);
                overflow-wrap:anywhere;
            }

            #${SECTION_ID} .munka-stat-value.currency {
                font-size:clamp(16px,1.8vw,22px);
            }

            #${SECTION_ID} .munka-stat-value.text-value {
                font-size:clamp(15px,1.6vw,20px);
            }

            #${SECTION_ID} .munka-stat-description {
                display:block;
                margin-top:8px;
                font-size:12px;
                line-height:1.5;
                color:var(--munka-stats-muted,#617166);
            }

            #${SECTION_ID} .munka-statistics-status {
                margin-top:18px;
                padding:12px;
                border-radius:9px;
                font-size:13px;
                line-height:1.6;
                background:#f0f6f1;
                color:#315b3d;
                overflow-wrap:anywhere;
            }

            #${SECTION_ID} .munka-statistics-status.success {
                background:#eaf7ed;
                color:#176b38;
            }

            #${SECTION_ID} .munka-statistics-status.error {
                background:#fff0f0;
                color:#a32727;
            }

            #${SECTION_ID} .munka-statistics-status.warning {
                background:#fff7e8;
                color:#805400;
            }

            #${SECTION_ID} .munka-statistics-updated {
                margin:10px 0 0;
                font-size:12px;
                color:var(--munka-stats-muted,#617166);
            }

            body.dark-mode #${SECTION_ID} {
                --munka-stats-bg:#18251d;
                --munka-stats-border:#35483b;
                --munka-stats-text:#e8f3ea;
                --munka-stats-heading:#7fdaa0;
                --munka-stats-muted:#b0c2b5;
                --munka-stats-card-bg:#202f25;
                background:var(--munka-stats-bg);
                color:var(--munka-stats-text);
            }

            body.dark-mode #${SECTION_ID} .munka-statistics-status {
                background:#26382b;
                color:#d9f0df;
            }

            body.dark-mode #${SECTION_ID} .munka-statistics-status.success {
                background:#1f3b29;
                color:#a9e6ba;
            }

            body.dark-mode #${SECTION_ID} .munka-statistics-status.error {
                background:#472626;
                color:#ffd0d0;
            }

            body.dark-mode #${SECTION_ID} .munka-statistics-status.warning {
                background:#493b22;
                color:#ffe0a0;
            }

            @media(max-width:1000px) {
                #${SECTION_ID} .munka-statistics-grid {
                    grid-template-columns:repeat(3,minmax(0,1fr));
                }
            }

            @media(max-width:700px) {
                #${SECTION_ID} {
                    padding:16px;
                    margin:18px 0;
                }

                #${SECTION_ID} .munka-statistics-grid {
                    grid-template-columns:repeat(2,minmax(0,1fr));
                    gap:10px;
                }

                #${SECTION_ID} .munka-stat-card {
                    padding:13px;
                }

                #${SECTION_ID} .munka-stat-label {
                    font-size:11px;
                }

                #${SECTION_ID} .munka-stat-value {
                    font-size:23px;
                }

                #${SECTION_ID} .munka-stat-value.currency {
                    font-size:16px;
                }
            }

            @media(max-width:380px) {
                #${SECTION_ID} .munka-statistics-grid {
                    grid-template-columns:1fr;
                }
            }

            @media(prefers-reduced-motion:reduce) {
                #${SECTION_ID} .munka-statistics-spinner {
                    animation:none;
                }
            }
        `;

        document.head.appendChild(style);
    }

    /* ========================================================
       CARD BUILDER

       Every card explicitly displays its category.
    ======================================================== */

    function createCard(category, title, id, color, description, extraClass) {
        return `
            <article class="munka-stat-card ${color || "green"}">
                <span class="munka-stat-category">
                    ${category}
                </span>
                <span class="munka-stat-label">${title}</span>
                <strong class="munka-stat-value ${extraClass || ""}"
                    id="${id}">—</strong>
                ${
                    description
                        ? `<span class="munka-stat-description">${description}</span>`
                        : ""
                }
            </article>
        `;
    }

    /* ========================================================
       CREATE STATISTICS PANEL
    ======================================================== */

    function createStatisticsPanel() {
        let section = document.getElementById(SECTION_ID);

        if (section) {
            return section;
        }

        section = document.createElement("section");
        section.id = SECTION_ID;
        section.setAttribute("aria-label", "Live farm statistics");

        section.innerHTML = `
            <div class="munka-stats-header">
                <div>
                    <h2 class="munka-stats-title">
                        MUNKA PIGGERY — Live Farm Statistics
                    </h2>
                    <p class="munka-stats-subtitle">
                        A category-by-category overview of population,
                        breeding, production, animal health and finances.
                    </p>
                </div>

                <button type="button"
                    id="munkaRefreshStatisticsButton"
                    class="munka-refresh-button">
                    <span id="munkaStatisticsSpinner"
                        class="munka-statistics-spinner"
                        aria-hidden="true"></span>
                    Refresh Statistics
                </button>
            </div>

            <p class="munka-stats-period"
                id="munkaStatisticsPeriod">
                Reporting period: Current month
            </p>

            <div class="munka-statistics-grid">

                <h3 class="munka-stats-group-title">
                    1. Verified Pig Population
                </h3>

                ${createCard(
                    "Population",
                    "Actual Pig Population",
                    "munkaStatActualPopulation",
                    "green",
                    "Verified opening population plus recorded movements.",
                    "text-value"
                )}

                ${createCard(
                    "Population",
                    "Opening Population",
                    "munkaStatOpeningPopulation",
                    "blue",
                    "The verified starting count.",
                    "text-value"
                )}

                ${createCard(
                    "Registration",
                    "Total Individual Pig Records",
                    "munkaStatTotalPigs",
                    "purple",
                    "Individual records in the pigs table."
                )}

                ${createCard(
                    "Registration",
                    "Unclassified Pig Records",
                    "munkaStatUnspecified",
                    "orange",
                    "Records whose category is missing or unrecognised."
                )}

                <h3 class="munka-stats-group-title">
                    2. Animal Categories
                </h3>

                ${createCard(
                    "Sow Category",
                    "Total Sows",
                    "munkaStatSows",
                    "purple",
                    "Includes ordinary, pregnant and lactating sows."
                )}

                ${createCard(
                    "Breeding Status",
                    "Pregnant Sows",
                    "munkaStatPregnantSows",
                    "purple",
                    "A subset of total sows; not additional animals."
                )}

                ${createCard(
                    "Breeding Status",
                    "Lactating Sows",
                    "munkaStatLactatingSows",
                    "teal",
                    "A subset of total sows; not additional animals."
                )}

                ${createCard(
                    "Male Breeding Stock",
                    "Boars",
                    "munkaStatBoars",
                    "blue",
                    "Individually registered boars."
                )}

                ${createCard(
                    "Growing Stock",
                    "Growers",
                    "munkaStatGrowers",
                    "green",
                    "Individually registered growers."
                )}

                ${createCard(
                    "Young Stock",
                    "Piglets in Individual Records",
                    "munkaStatPiglets",
                    "orange",
                    "Individual piglet records only."
                )}

                ${createCard(
                    "Young Stock",
                    "Piglet Group Quantity",
                    "munkaStatPigletGroupQuantity",
                    "orange",
                    "Piglets recorded in groups; shown separately to avoid double-counting."
                )}

                ${createCard(
                    "Young Stock",
                    "Weaners in Individual Records",
                    "munkaStatWeaners",
                    "purple",
                    "Individual weaner records, which may overlap with groups."
                )}

                ${createCard(
                    "Young Stock",
                    "Weaner Group Quantity",
                    "munkaStatWeanerGroupQuantity",
                    "purple",
                    "Total animals registered in weaner groups."
                )}

                <h3 class="munka-stats-group-title">
                    3. Population Movements Since Opening
                </h3>

                ${createCard(
                    "Births",
                    "Piglets Born",
                    "munkaStatBirths",
                    "green",
                    "Recorded births since the opening date."
                )}

                ${createCard(
                    "Mortality",
                    "Deaths",
                    "munkaStatDeaths",
                    "red",
                    "Recorded deaths since the opening date."
                )}

                ${createCard(
                    "Sales",
                    "Pigs Sold and Removed",
                    "munkaStatPopulationSales",
                    "orange",
                    "Recorded sales after physical removal."
                )}

                ${createCard(
                    "Purchases",
                    "Pigs Purchased",
                    "munkaStatPurchases",
                    "blue",
                    "Recorded purchases since opening."
                )}

                ${createCard(
                    "Arrivals",
                    "Other Pig Arrivals",
                    "munkaStatArrivals",
                    "teal",
                    "Other recorded arrivals since opening."
                )}

                <h3 class="munka-stats-group-title">
                    4. Breeding and Production
                </h3>

                ${createCard(
                    "Breeding",
                    "Expected Farrowings",
                    "munkaStatExpectedFarrowings",
                    "orange",
                    "Unique pregnant sows with a due date today or later."
                )}

                ${createCard(
                    "Production",
                    "Piglets Weaned This Month",
                    "munkaStatWeanedThisMonth",
                    "green",
                    "Total recorded weaning quantity this month."
                )}

                ${createCard(
                    "Production",
                    "Piglets Weaned Cumulatively",
                    "munkaStatWeanedCumulative",
                    "blue",
                    "Total recorded weaning quantity across all records."
                )}

                <h3 class="munka-stats-group-title">
                    5. Animal Health
                </h3>

                ${createCard(
                    "Veterinary Care",
                    "Treatments This Month",
                    "munkaStatTreatments",
                    "red",
                    "Number of treatment records this month."
                )}

                <h3 class="munka-stats-group-title">
                    6. Financial Performance
                </h3>

                ${createCard(
                    "Sales",
                    "Sales Recorded This Month",
                    "munkaStatSales",
                    "green",
                    "Total sales value recorded this month.",
                    "currency"
                )}

                ${createCard(
                    "Payments",
                    "Payments Received",
                    "munkaStatPaymentsReceived",
                    "teal",
                    "Value of sales marked as paid.",
                    "currency"
                )}

                ${createCard(
                    "Payments",
                    "Pending Payments",
                    "munkaStatPendingPayments",
                    "orange",
                    "Value of sales marked pending or unpaid.",
                    "currency"
                )}

                ${createCard(
                    "Expenses",
                    "Expenses This Month",
                    "munkaStatExpenses",
                    "red",
                    "Total recorded expenses this month.",
                    "currency"
                )}

                ${createCard(
                    "Cash Position",
                    "Net Cash Position",
                    "munkaStatNetBalance",
                    "blue",
                    "Payments received minus recorded expenses; not full profit.",
                    "currency"
                )}

                <h3 class="munka-stats-group-title">
                    7. Transaction Details
                </h3>

                ${createCard(
                    "Paid Transactions",
                    "Paid Sales Transactions",
                    "munkaStatPaidTransactions",
                    "teal",
                    "Number of transactions marked paid."
                )}

                ${createCard(
                    "Unpaid Transactions",
                    "Pending Sales Transactions",
                    "munkaStatPendingTransactions",
                    "orange",
                    "Number of transactions marked pending or unpaid."
                )}

            </div>

            <div id="munkaLiveStatisticsStatus"
                class="munka-statistics-status"
                role="status"
                aria-live="polite">
                Preparing your farm statistics...
            </div>

            <p id="munkaStatisticsLastUpdated"
                class="munka-statistics-updated">
                Statistics have not been updated yet.
            </p>
        `;

        const announcementsSection =
            document.querySelector(".announcements-section");

        const welcomeSection =
            document.querySelector(".welcome-section");

        if (announcementsSection) {
            announcementsSection.insertAdjacentElement(
                "afterend",
                section
            );
        } else if (welcomeSection) {
            welcomeSection.insertAdjacentElement(
                "afterend",
                section
            );
        } else {
            document.body.appendChild(section);
        }

        document.getElementById(
            "munkaRefreshStatisticsButton"
        ).addEventListener("click", function () {
            loadDashboardFarmStatistics(true);
        });

        return section;
    }

    /* ========================================================
       DISPLAY STATISTICS
    ======================================================== */

    function displayStatistics(data) {
        const population = data.population;
        const registered = data.pigs;
        const groups = data.groups;

        setText(
            "munkaStatActualPopulation",
            formatVerifiedPopulation(population.current_population)
        );

        setText(
            "munkaStatOpeningPopulation",
            formatVerifiedPopulation(population.opening_population)
        );

        setText(
            "munkaStatTotalPigs",
            formatNumber(registered.total)
        );

        setText(
            "munkaStatUnspecified",
            formatNumber(registered.unspecified)
        );

        setText("munkaStatSows", formatNumber(registered.sows));
        setText("munkaStatBoars", formatNumber(registered.boars));
        setText("munkaStatGrowers", formatNumber(registered.growers));

        setText(
            "munkaStatPiglets",
            formatNumber(registered.piglets)
        );

        setText(
            "munkaStatWeaners",
            formatNumber(registered.weaners)
        );

        setText(
            "munkaStatLactatingSows",
            formatNumber(registered.lactatingSows)
        );

        setText(
            "munkaStatPregnantSows",
            formatNumber(data.breeding.pregnantSows)
        );

        setText(
            "munkaStatPigletGroupQuantity",
            formatNumber(groups.pigletAnimals)
        );

        setText(
            "munkaStatWeanerGroupQuantity",
            formatNumber(groups.weanerAnimals)
        );

        setText(
            "munkaStatBirths",
            formatNumber(population.births_since_opening)
        );

        setText(
            "munkaStatDeaths",
            formatNumber(population.deaths_since_opening)
        );

        setText(
            "munkaStatPopulationSales",
            formatNumber(population.sales_since_opening)
        );

        setText(
            "munkaStatPurchases",
            formatNumber(population.purchases_since_opening)
        );

        setText(
            "munkaStatArrivals",
            formatNumber(population.arrivals_since_opening)
        );

        setText(
            "munkaStatExpectedFarrowings",
            formatNumber(data.breeding.expectedFarrowings)
        );

        setText(
            "munkaStatWeanedThisMonth",
            formatNumber(data.weaning.thisMonth)
        );

        setText(
            "munkaStatWeanedCumulative",
            formatNumber(data.weaning.cumulative)
        );

        setText(
            "munkaStatTreatments",
            formatNumber(data.treatments.thisMonth)
        );

        setText(
            "munkaStatSales",
            formatCurrency(data.sales.totalSales)
        );

        setText(
            "munkaStatPaymentsReceived",
            formatCurrency(data.sales.paymentsReceived)
        );

        setText(
            "munkaStatPendingPayments",
            formatCurrency(data.sales.pendingPayments)
        );

        setText(
            "munkaStatExpenses",
            formatCurrency(data.expenses)
        );

        setText(
            "munkaStatNetBalance",
            formatCurrency(data.netCashPosition)
        );

        setText(
            "munkaStatPaidTransactions",
            formatNumber(data.sales.paidTransactions)
        );

        setText(
            "munkaStatPendingTransactions",
            formatNumber(data.sales.pendingTransactions)
        );

        setText(
            "munkaStatOpeningDate",
            population.opening_date
                ? "Opening date: " + population.opening_date
                : "Opening date not recorded"
        );

        setText(
            "munkaStatPopulationDescription",
            population.current_population === null ||
            population.current_population === undefined
                ? "Opening population has not been verified."
                : "Verified opening count plus recorded movements."
        );

        const monthName = new Intl.DateTimeFormat("en-ZM", {
            timeZone: "Africa/Lusaka",
            month: "long",
            year: "numeric"
        }).format(new Date());

        setText(
            "munkaStatisticsPeriod",
            "Reporting period: " + monthName
        );
    }

    /* ========================================================
       LOAD STATISTICS
    ======================================================== */

    async function loadDashboardFarmStatistics() {
        if (isLoading) {
            return;
        }

        isLoading = true;
        setLoading(true);

        try {
            createStatisticsPanel();

            const validation = validateUser();

            if (!validation.ok) {
                setStatus(validation.message, "warning");
                return;
            }

            const client = getSupabaseClient();

            if (!client) {
                throw new Error(
                    "Supabase client not found. Check supabase.js and script order."
                );
            }

            const sessionResult = await client.auth.getSession();

            if (sessionResult.error) {
                throw new Error(
                    "Could not verify login session: " +
                    sessionResult.error.message
                );
            }

            const session =
                sessionResult.data &&
                sessionResult.data.session;

            if (!session) {
                setStatus(
                    "Your login session has expired. Please log in again.",
                    "error"
                );
                return;
            }

            const farmId = validation.farmId;
            const monthRange = getMonthRange();

            setStatus(
                "Loading statistics for your farm...",
                "info"
            );

            const results = await Promise.all([
                fetchAllFarmRows(
                    client,
                    "pigs",
                    "id, category",
                    farmId
                ),

                fetchAllFarmRows(
                    client,
                    "pig_groups",
                    "id, category, quantity",
                    farmId
                ),

                fetchAllFarmRows(
                    client,
                    "gestation_records",
                    "id, sow_id, service_date, delivery_date, status",
                    farmId
                ),

                fetchAllFarmRows(
                    client,
                    "weaning_records",
                    "id, total_weaned, weaning_date",
                    farmId
                ),

                fetchAllFarmRows(
                    client,
                    "treatment_records",
                    "id, treatment_date",
                    farmId
                ),

                fetchAllFarmRows(
                    client,
                    "sales_records",
                    "id, sale_date, total_amount, payment_status",
                    farmId
                ),

                fetchAllFarmRows(
                    client,
                    "expenses_records",
                    "id, expense_date, total_amount",
                    farmId
                ),

                fetchPopulationSummary(client, farmId)
            ]);

            const pigs = results[0];
            const groups = results[1];
            const gestationRecords = results[2];
            const weaningRecords = results[3];
            const treatmentRecords = results[4];
            const salesRecords = results[5];
            const expenseRecords = results[6];
            const population = results[7];

            const pigStats = calculateRegisteredPigs(pigs);
            const groupStats = calculatePigGroups(groups);

            const breedingStats = calculateBreeding(
                gestationRecords,
                pigs,
                monthRange.today
            );

            const weaningStats = calculateWeaning(
                weaningRecords,
                monthRange
            );

            const treatmentStats = calculateTreatments(
                treatmentRecords,
                monthRange
            );

            const salesStats = calculateSales(
                salesRecords,
                monthRange
            );

            const expenses = calculateExpenses(
                expenseRecords,
                monthRange
            );

            const data = {
                farmId: farmId,
                farmName: population.farm_name,
                population: population,
                pigs: pigStats,
                groups: groupStats,
                breeding: breedingStats,
                weaning: weaningStats,
                treatments: treatmentStats,
                sales: salesStats,
                expenses: expenses,
                netCashPosition:
                    salesStats.paymentsReceived - expenses,
                generatedAt: new Date().toISOString()
            };

            displayStatistics(data);

            lastSuccessfulData = data;
            state.lastUpdated = new Date();
            state.lastError = null;

            setLastUpdated(state.lastUpdated);

            const populationVerified =
                population.current_population !== null &&
                population.current_population !== undefined;

            setStatus(
                populationVerified
                    ? "Statistics loaded successfully for " +
                      population.farm_name +
                      ". Group quantities are shown separately to avoid double-counting."
                    : "Other statistics loaded for " +
                      population.farm_name +
                      ". Actual population is not verified because an opening count has not been entered.",
                populationVerified ? "success" : "warning"
            );

            window.munkaLiveStatistics = {
                lastData: data,
                lastUpdated: state.lastUpdated,
                refresh: loadDashboardFarmStatistics
            };

            window.dashboardFarmStatistics = data;

            console.log(
                "MUNKA Farm Statistics loaded successfully.",
                data
            );

        } catch (error) {
            console.error("MUNKA Statistics error:", error);

            state.lastError =
                error.message || "Unknown error";

            setStatus(
                lastSuccessfulData
                    ? "Refresh failed. Previously loaded statistics remain displayed. Details: " +
                      state.lastError
                    : "Statistics could not be loaded. Check your connection, table names, view access and Supabase permissions. Details: " +
                      state.lastError,
                lastSuccessfulData ? "warning" : "error"
            );

        } finally {
            isLoading = false;
            setLoading(false);
        }
    }

    /* ========================================================
       INITIALIZATION
    ======================================================== */

    function initializeDashboardFarmStatistics() {
        if (state.initialized) {
            return;
        }

        state.initialized = true;

        injectStyles();

        window.loadDashboardFarmStatistics =
            loadDashboardFarmStatistics;

        createStatisticsPanel();

        loadDashboardFarmStatistics();

        refreshTimer = setInterval(function () {
            if (!document.hidden) {
                loadDashboardFarmStatistics();
            }
        }, REFRESH_INTERVAL);

        document.addEventListener(
            "visibilitychange",
            function () {
                if (!document.hidden) {
                    loadDashboardFarmStatistics();
                }
            }
        );
    }

    if (document.readyState === "loading") {
        document.addEventListener(
            "DOMContentLoaded",
            initializeDashboardFarmStatistics
        );
    } else {
        initializeDashboardFarmStatistics();
    }

})();