/* ============================================================
   MUNKA PIGGERY TECHNOLOGY
   PROFESSIONAL LIVE FARM STATISTICS

   File: dashboard_stats.js

   FEATURES
   - Farm-specific statistics
   - Verified actual pig population
   - Registered pig records shown separately
   - Opening population and population movements
   - Pregnant sows and expected farrowings
   - Monthly and cumulative weaning
   - Monthly treatments
   - Monthly sales and payment status
   - Monthly expenses and net cash position
   - Zambia date and time
   - Manual and automatic refreshing
   - Responsive mobile-friendly dashboard
   - Prevents unverified population from appearing as zero

   IMPORTANT
   - Super Admin does not see farm statistics here.
   - Supabase Row Level Security must remain enabled.
   - Population movements are obtained from
     public.farm_population_summary.
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
        try {
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
        } catch (error) {
            console.error("MUNKA Statistics:", error);
            return null;
        }
    }

    function getLoggedInUser() {
        try {
            const value = localStorage.getItem("loggedInUser");

            return value ? JSON.parse(value) : null;
        } catch (error) {
            console.error("Could not read logged-in user:", error);
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

        const result = Number(value);

        return Number.isFinite(result) ? result : 0;
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

    function setOptionalText(id, value) {
        const element = document.getElementById(id);

        if (element) {
            element.textContent = String(value);
        }
    }

    /* ========================================================
       USER AND FARM VALIDATION
    ======================================================== */

    function isSuperAdmin(user) {
        return normalizeText(user && user.role) === "super admin";
    }

    function getFarmId(user) {
        if (!user) {
            return null;
        }

        const id = user.farm_id;

        if (
            id === null ||
            id === undefined ||
            String(id).trim() === ""
        ) {
            return null;
        }

        return id;
    }

    function validateUser() {
        const user = getLoggedInUser();

        if (!user) {
            return {
                ok: false,
                message: "Please log in to view farm statistics."
            };
        }

        if (isSuperAdmin(user)) {
            return {
                ok: false,
                message:
                    "Farm statistics are available from a farm user's dashboard."
            };
        }

        const farmId = getFarmId(user);

        if (farmId === null) {
            return {
                ok: false,
                message:
                    "Your account has no assigned farm. Contact your farm administrator."
            };
        }

        return {
            ok: true,
            user: user,
            farmId: farmId
        };
    }

    /* ========================================================
       PAGINATED FARM DATA
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

       This view is the source of actual population figures.
       Do not replace these values with pigs.length.
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
       REGISTERED PIG RECORDS

       These are registration records, not a verified count
       of every animal physically present on the farm.
    ======================================================== */

    function calculateRegisteredPigs(pigs) {
        const stats = {
            total: pigs.length,
            sows: 0,
            boars: 0,
            piglets: 0,
            weaners: 0,
            growers: 0,
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
       BREEDING STATISTICS
    ======================================================== */

    function calculateBreeding(records, today) {
        const pregnantSowIds = new Set();
        let expectedFarrowings = 0;

        records.forEach(function (record) {
            if (normalizeText(record.status) !== "pregnant") {
                return;
            }

            if (record.sow_id) {
                pregnantSowIds.add(
                    String(record.sow_id).trim()
                );
            }

            if (
                record.delivery_date &&
                String(record.delivery_date).substring(0, 10) >= today
            ) {
                expectedFarrowings++;
            }
        });

        return {
            pregnantSows: pregnantSowIds.size,
            expectedFarrowings: expectedFarrowings
        };
    }

    /* ========================================================
       WEANING STATISTICS
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
       SALES AND PAYMENTS
    ======================================================== */

    function calculateSales(records, monthRange) {
        let totalSales = 0;
        let paymentsReceived = 0;
        let pendingPayments = 0;
        let paidTransactions = 0;
        let pendingTransactions = 0;
        let otherStatusAmount = 0;

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
            } else {
                otherStatusAmount += amount;
            }
        });

        return {
            totalSales: totalSales,
            paymentsReceived: paymentsReceived,
            pendingPayments: pendingPayments,
            paidTransactions: paidTransactions,
            pendingTransactions: pendingTransactions,
            otherStatusAmount: otherStatusAmount
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
       CREATE STYLES
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
                line-height:1.25;
                font-weight:800;
                color:var(--munka-stats-heading,#176b38);
            }
            #${SECTION_ID} .munka-stats-subtitle {
                margin:0;
                font-size:14px;
                line-height:1.6;
                color:var(--munka-stats-muted,#617166);
            }
            #${SECTION_ID} .munka-stats-controls {
                display:flex;
                align-items:center;
                gap:10px;
                flex-wrap:wrap;
            }
            #${SECTION_ID} .munka-refresh-button {
                min-height:42px;
                padding:10px 16px;
                border:0;
                border-radius:9px;
                background:#176b38;
                color:#fff;
                font-weight:700;
                font-size:13px;
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
            #${SECTION_ID} .munka-statistics-grid {
                display:grid;
                grid-template-columns:repeat(4,minmax(0,1fr));
                gap:14px;
            }
            #${SECTION_ID} .munka-stat-card {
                min-width:0;
                padding:17px;
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
            #${SECTION_ID} .munka-stat-label {
                display:block;
                margin-bottom:11px;
                font-size:12px;
                line-height:1.5;
                font-weight:700;
                text-transform:uppercase;
                letter-spacing:.35px;
                color:var(--munka-stats-muted,#617166);
                overflow-wrap:anywhere;
            }
            #${SECTION_ID} .munka-stat-value {
                display:block;
                font-size:clamp(22px,2.3vw,30px);
                line-height:1.25;
                font-weight:800;
                color:var(--munka-stats-text,#183d28);
                overflow-wrap:anywhere;
            }
            #${SECTION_ID} .munka-stat-value.currency {
                font-size:clamp(17px,1.8vw,23px);
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
            #${SECTION_ID} .munka-stats-group-title {
                grid-column:1/-1;
                margin:18px 0 0;
                padding-bottom:10px;
                border-bottom:1px solid var(--munka-stats-border,#e0e8e1);
                font-size:16px;
                font-weight:800;
                color:var(--munka-stats-heading,#176b38);
            }
            #${SECTION_ID} .munka-statistics-status {
                margin-top:18px;
                padding:11px 13px;
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
                    border-radius:13px;
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
                    font-size:17px;
                }
            }
            @media(max-width:380px) {
                #${SECTION_ID} .munka-statistics-grid {
                    grid-template-columns:1fr;
                }
                #${SECTION_ID} .munka-stats-header {
                    display:block;
                }
                #${SECTION_ID} .munka-stats-controls {
                    margin-top:14px;
                }
            }
        `;

        document.head.appendChild(style);
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
                    <h2 class="munka-stats-title">Live Farm Statistics</h2>
                    <p class="munka-stats-subtitle">
                        Monitor verified pig population, breeding,
                        production, animal health and finances.
                    </p>
                </div>
                <div class="munka-stats-controls">
                    <button type="button"
                        id="munkaRefreshStatisticsButton"
                        class="munka-refresh-button">
                        <span id="munkaStatisticsSpinner"
                            class="munka-statistics-spinner"
                            aria-hidden="true"></span>
                        Refresh Statistics
                    </button>
                </div>
            </div>

            <p class="munka-stats-period"
                id="munkaStatisticsPeriod">
                Reporting period: Current month
            </p>

            <div class="munka-statistics-grid">
                <h3 class="munka-stats-group-title">Pig Population</h3>

                <article class="munka-stat-card green">
                    <span class="munka-stat-label">Actual Pig Population</span>
                    <strong class="munka-stat-value text-value"
                        id="munkaStatActualPopulation">—</strong>
                    <span class="munka-stat-description"
                        id="munkaStatPopulationDescription">
                        Based on verified opening count and recorded movements.
                    </span>
                </article>

                <article class="munka-stat-card blue">
                    <span class="munka-stat-label">Opening Population</span>
                    <strong class="munka-stat-value text-value"
                        id="munkaStatOpeningPopulation">—</strong>
                    <span class="munka-stat-description"
                        id="munkaStatOpeningDate">
                        Verified baseline count
                    </span>
                </article>

                <article class="munka-stat-card green">
                    <span class="munka-stat-label">Total Registered Pig Records</span>
                    <strong class="munka-stat-value"
                        id="munkaStatTotalPigs">—</strong>
                    <span class="munka-stat-description">
                        Registered records, not the verified physical population.
                    </span>
                </article>

                <article class="munka-stat-card purple">
                    <span class="munka-stat-label">Sows Registered</span>
                    <strong class="munka-stat-value"
                        id="munkaStatSows">—</strong>
                </article>

                <article class="munka-stat-card blue">
                    <span class="munka-stat-label">Boars Registered</span>
                    <strong class="munka-stat-value"
                        id="munkaStatBoars">—</strong>
                </article>

                <article class="munka-stat-card orange">
                    <span class="munka-stat-label">Piglets Registered</span>
                    <strong class="munka-stat-value"
                        id="munkaStatPiglets">—</strong>
                </article>

                <article class="munka-stat-card purple">
                    <span class="munka-stat-label">Weaners Registered</span>
                    <strong class="munka-stat-value"
                        id="munkaStatWeaners">—</strong>
                </article>

                <article class="munka-stat-card teal">
                    <span class="munka-stat-label">Growers Registered</span>
                    <strong class="munka-stat-value"
                        id="munkaStatGrowers">—</strong>
                </article>

                <article class="munka-stat-card orange">
                    <span class="munka-stat-label">Other/Unspecified Categories</span>
                    <strong class="munka-stat-value"
                        id="munkaStatUnspecified">—</strong>
                </article>

                <article class="munka-stat-card green">
                    <span class="munka-stat-label">Births Since Opening</span>
                    <strong class="munka-stat-value"
                        id="munkaStatBirths">—</strong>
                </article>

                <article class="munka-stat-card red">
                    <span class="munka-stat-label">Deaths Since Opening</span>
                    <strong class="munka-stat-value"
                        id="munkaStatDeaths">—</strong>
                </article>

                <article class="munka-stat-card orange">
                    <span class="munka-stat-label">Pigs Sold and Removed</span>
                    <strong class="munka-stat-value"
                        id="munkaStatPopulationSales">—</strong>
                </article>

                <article class="munka-stat-card blue">
                    <span class="munka-stat-label">Purchases Since Opening</span>
                    <strong class="munka-stat-value"
                        id="munkaStatPurchases">—</strong>
                </article>

                <article class="munka-stat-card teal">
                    <span class="munka-stat-label">Arrivals Since Opening</span>
                    <strong class="munka-stat-value"
                        id="munkaStatArrivals">—</strong>
                </article>

                <h3 class="munka-stats-group-title">Breeding and Production</h3>

                <article class="munka-stat-card purple">
                    <span class="munka-stat-label">Pregnant Sows</span>
                    <strong class="munka-stat-value"
                        id="munkaStatPregnantSows">—</strong>
                    <span class="munka-stat-description">
                        Unique sow IDs with Pregnant status.
                    </span>
                </article>

                <article class="munka-stat-card orange">
                    <span class="munka-stat-label">Expected Farrowings</span>
                    <strong class="munka-stat-value"
                        id="munkaStatExpectedFarrowings">—</strong>
                    <span class="munka-stat-description">
                        Pregnant records with a due date today or later.
                    </span>
                </article>

                <article class="munka-stat-card green">
                    <span class="munka-stat-label">Piglets Weaned This Month</span>
                    <strong class="munka-stat-value"
                        id="munkaStatWeanedThisMonth">—</strong>
                </article>

                <article class="munka-stat-card blue">
                    <span class="munka-stat-label">Piglets Weaned Cumulatively</span>
                    <strong class="munka-stat-value"
                        id="munkaStatWeanedCumulative">—</strong>
                </article>

                <h3 class="munka-stats-group-title">Animal Health</h3>

                <article class="munka-stat-card red">
                    <span class="munka-stat-label">Treatments This Month</span>
                    <strong class="munka-stat-value"
                        id="munkaStatTreatments">—</strong>
                </article>

                <h3 class="munka-stats-group-title">Financial Performance</h3>

                <article class="munka-stat-card green">
                    <span class="munka-stat-label">Sales Recorded This Month</span>
                    <strong class="munka-stat-value currency"
                        id="munkaStatSales">—</strong>
                </article>

                <article class="munka-stat-card teal">
                    <span class="munka-stat-label">Payments Received</span>
                    <strong class="munka-stat-value currency"
                        id="munkaStatPaymentsReceived">—</strong>
                    <span class="munka-stat-description"
                        id="munkaStatPaidTransactions">
                        Paid transactions
                    </span>
                </article>

                <article class="munka-stat-card orange">
                    <span class="munka-stat-label">Pending Payments</span>
                    <strong class="munka-stat-value currency"
                        id="munkaStatPendingPayments">—</strong>
                    <span class="munka-stat-description"
                        id="munkaStatPendingTransactions">
                        Pending transactions
                    </span>
                </article>

                <article class="munka-stat-card red">
                    <span class="munka-stat-label">Expenses This Month</span>
                    <strong class="munka-stat-value currency"
                        id="munkaStatExpenses">—</strong>
                </article>

                <article class="munka-stat-card blue">
                    <span class="munka-stat-label">Net Cash Position</span>
                    <strong class="munka-stat-value currency"
                        id="munkaStatNetBalance">—</strong>
                    <span class="munka-stat-description">
                        Payments received minus recorded expenses.
                        Not a complete profit calculation.
                    </span>
                </article>
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

        const button = document.getElementById(
            "munkaRefreshStatisticsButton"
        );

        if (button) {
            button.addEventListener("click", function () {
                loadDashboardFarmStatistics(true);
            });
        }

        return section;
    }

    /* ========================================================
       DISPLAY ALL STATISTICS
    ======================================================== */

    function displayStatistics(data) {
        const population = data.population;
        const registered = data.pigs;

        setText(
            "munkaStatActualPopulation",
            formatVerifiedPopulation(population.current_population)
        );

        setText(
            "munkaStatOpeningPopulation",
            formatVerifiedPopulation(population.opening_population)
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
                ? "Opening population has not been verified. Enter the actual opening count."
                : "Based on verified opening count and recorded population movements."
        );

        setText("munkaStatTotalPigs", formatNumber(registered.total));
        setText("munkaStatSows", formatNumber(registered.sows));
        setText("munkaStatBoars", formatNumber(registered.boars));
        setText("munkaStatPiglets", formatNumber(registered.piglets));
        setText("munkaStatWeaners", formatNumber(registered.weaners));
        setText("munkaStatGrowers", formatNumber(registered.growers));

        setText(
            "munkaStatUnspecified",
            formatNumber(registered.unspecified)
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
            "munkaStatPregnantSows",
            formatNumber(data.breeding.pregnantSows)
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
            formatNumber(data.sales.paidTransactions) +
            " paid transaction(s)"
        );

        setText(
            "munkaStatPendingTransactions",
            formatNumber(data.sales.pendingTransactions) +
            " pending transaction(s)"
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

    async function loadDashboardFarmStatistics(manualRefresh) {
        if (isLoading) {
            return;
        }

        isLoading = true;
        setLoading(true);

        try {
            const section = createStatisticsPanel();

            if (!section) {
                throw new Error(
                    "The statistics panel could not be created."
                );
            }

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
                "Loading statistics for your registered farm...",
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
            const gestationRecords = results[1];
            const weaningRecords = results[2];
            const treatmentRecords = results[3];
            const salesRecords = results[4];
            const expenseRecords = results[5];
            const population = results[6];

            const pigStats = calculateRegisteredPigs(pigs);

            const breedingStats = calculateBreeding(
                gestationRecords,
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

            const netCashPosition =
                salesStats.paymentsReceived - expenses;

            const data = {
                farmId: farmId,
                farmName: population.farm_name,
                population: population,
                pigs: pigStats,
                breeding: breedingStats,
                weaning: weaningStats,
                treatments: treatmentStats,
                sales: salesStats,
                expenses: expenses,
                netCashPosition: netCashPosition,
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
                      ". Actual population is based on the verified opening count and recorded movements."
                    : "Other farm statistics loaded for " +
                      population.farm_name +
                      ". Actual pig population is not verified because an opening count has not been entered.",
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

            if (lastSuccessfulData) {
                setStatus(
                    "Could not refresh the latest statistics. " +
                    "Previously loaded figures remain displayed. Details: " +
                    state.lastError,
                    "warning"
                );
            } else {
                setStatus(
                    "Statistics could not be loaded. Check your connection, " +
                    "login session, table names, view access and Supabase permissions. Details: " +
                    state.lastError,
                    "error"
                );
            }

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

        loadDashboardFarmStatistics(false);

        if (refreshTimer) {
            clearInterval(refreshTimer);
        }

        refreshTimer = setInterval(function () {
            if (!document.hidden) {
                loadDashboardFarmStatistics(false);
            }
        }, REFRESH_INTERVAL);

        document.addEventListener(
            "visibilitychange",
            function () {
                if (!document.hidden) {
                    loadDashboardFarmStatistics(false);
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