/* ============================================================
   MUNKA PIGGERY TECHNOLOGY
   PROFESSIONAL LIVE FARM STATISTICS

   File: dashboard_stats.js

   Features:
   - Farm-specific statistics
   - Accurate pig category reporting
   - Pregnant sow monitoring
   - Expected farrowings
   - Piglets weaned: monthly and cumulative
   - Treatment records
   - Sales recorded
   - Payments received
   - Pending payments
   - Monthly expenses
   - Net cash position
   - Zambia date and time
   - Manual and automatic refreshing
   - Mobile-responsive design

   IMPORTANT:
   Regular users can only request statistics for their farm.
   Super Admin users are not shown farm statistics here.
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

            if (
                window.supabase &&
                typeof window.supabase.from === "function"
            ) {
                return window.supabase;
            }

            return null;
        } catch (error) {
            console.error(
                "MUNKA Statistics: Could not access Supabase.",
                error
            );

            return null;
        }
    }

    function getLoggedInUser() {
        try {
            const savedUser = localStorage.getItem("loggedInUser");

            if (!savedUser) {
                return null;
            }

            return JSON.parse(savedUser);
        } catch (error) {
            console.error(
                "MUNKA Statistics: Could not read logged-in user.",
                error
            );

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
            parts.year +
            "-" +
            parts.month +
            "-" +
            parts.day
        );
    }

    function getMonthRange() {
        const today = getZambiaToday();
        const firstDay = today.substring(0, 8) + "01";

        const year = Number(today.substring(0, 4));
        const month = Number(today.substring(5, 7));

        let nextYear = year;
        let nextMonth = month + 1;

        if (nextMonth > 12) {
            nextMonth = 1;
            nextYear++;
        }

        const nextMonthStart =
            String(nextYear) +
            "-" +
            String(nextMonth).padStart(2, "0") +
            "-01";

        return {
            today: today,
            start: firstDay,
            end: nextMonthStart
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
        const status = document.getElementById(
            "munkaLiveStatisticsStatus"
        );

        if (!status) {
            return;
        }

        status.textContent = message;
        status.className =
            "munka-statistics-status " +
            (type || "info");
    }

    function setLastUpdated(date) {
        const element = document.getElementById(
            "munkaStatisticsLastUpdated"
        );

        if (!element) {
            return;
        }

        element.textContent = date
            ? "Last updated: " + formatZambiaDateTime(date)
            : "Statistics have not been updated yet.";
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
            spinner.style.display = loading ? "inline-block" : "none";
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
       SECURITY AND FARM IDENTIFICATION
    ======================================================== */

    function isSuperAdmin(user) {
        return normalizeText(user && user.role) === "super admin";
    }

    function getFarmId(user) {
        if (!user) {
            return null;
        }

        const farmId = user.farm_id;

        if (
            farmId === null ||
            farmId === undefined ||
            String(farmId).trim() === ""
        ) {
            return null;
        }

        return farmId;
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
       DATABASE QUERY HELPER

       Every farm statistics query includes farm_id.

       Pagination avoids silently limiting larger farms to
       the first 1,000 records.
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
                    tableName +
                    ": " +
                    result.error.message
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
       PIG POPULATION CALCULATIONS
    ======================================================== */

    function calculatePigPopulation(pigs) {
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

            if (!category) {
                stats.unspecified++;
                return;
            }

            if (
                category === "sow" ||
                category === "sows"
            ) {
                stats.sows++;
                return;
            }

            if (
                category === "boar" ||
                category === "boars"
            ) {
                stats.boars++;
                return;
            }

            if (
                category === "piglet" ||
                category === "piglets" ||
                category === "suckling piglet" ||
                category === "suckling piglets"
            ) {
                stats.piglets++;
                return;
            }

            if (
                category === "weaner" ||
                category === "weaners"
            ) {
                stats.weaners++;
                return;
            }

            if (
                category === "grower" ||
                category === "growers"
            ) {
                stats.growers++;
                return;
            }

            stats.unspecified++;
        });

        return stats;
    }

    /* ========================================================
       BREEDING CALCULATIONS
    ======================================================== */

    function calculateBreeding(gestationRecords, today) {
        const pregnantSowIds = new Set();

        let expectedFarrowings = 0;

        gestationRecords.forEach(function (record) {
            const status = normalizeText(record.status);

            /*
             * Your database status check showed "Pregnant".
             * Only records explicitly marked Pregnant count
             * as current pregnancies.
             */

            if (status !== "pregnant") {
                return;
            }

            if (record.sow_id) {
                pregnantSowIds.add(
                    String(record.sow_id).trim()
                );
            }

            /*
             * Count expected farrowings only where the
             * delivery date is today or later.
             */

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
       WEANING CALCULATIONS
    ======================================================== */

    function calculateWeaning(records, monthRange) {
        let cumulativeWeaned = 0;
        let monthlyWeaned = 0;
        let monthlyRecords = 0;

        records.forEach(function (record) {
            const total = Math.max(
                0,
                numberValue(record.total_weaned)
            );

            cumulativeWeaned += total;

            if (
                isDateInCurrentMonth(
                    record.weaning_date,
                    monthRange
                )
            ) {
                monthlyWeaned += total;
                monthlyRecords++;
            }
        });

        return {
            cumulative: cumulativeWeaned,
            thisMonth: monthlyWeaned,
            recordsThisMonth: monthlyRecords
        };
    }

    /* ========================================================
       TREATMENT CALCULATIONS
    ======================================================== */

    function calculateTreatments(records, monthRange) {
        const currentMonthRecords = records.filter(
            function (record) {
                return isDateInCurrentMonth(
                    record.treatment_date,
                    monthRange
                );
            }
        );

        return {
            thisMonth: currentMonthRecords.length
        };
    }

    /* ========================================================
       FINANCIAL CALCULATIONS

       Sales recorded:
       All sales entered during the current month.

       Payments received:
       Sales with payment_status = Paid.

       Pending payments:
       Sales with payment_status = Pending.

       Net cash position:
       Payments received minus recorded expenses.

       This is a dashboard summary, not a full accounting
       statement.
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

            const paymentStatus = normalizeText(
                record.payment_status
            );

            if (paymentStatus === "paid") {
                paymentsReceived += amount;
                paidTransactions++;
            } else if (
                paymentStatus === "pending" ||
                paymentStatus === "unpaid"
            ) {
                pendingPayments += amount;
                pendingTransactions++;
            } else {
                /*
                 * Unknown statuses remain visible in the
                 * sales total but are not assumed to be
                 * money received.
                 */
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

    function calculateExpenses(records, monthRange) {
        let totalExpenses = 0;

        records.forEach(function (record) {
            if (
                isDateInCurrentMonth(
                    record.expense_date,
                    monthRange
                )
            ) {
                totalExpenses += numberValue(
                    record.total_amount
                );
            }
        });

        return totalExpenses;
    }

    /* ========================================================
       CREATE DASHBOARD STYLES
    ======================================================== */

    function injectStyles() {
        if (document.getElementById(STYLE_ID)) {
            return;
        }

        const style = document.createElement("style");

        style.id = STYLE_ID;

        style.textContent = `
            #${SECTION_ID} {
                width: 100%;
                margin: 24px 0;
                padding: 24px;
                box-sizing: border-box;
                border-radius: 18px;
                background: var(--munka-stats-bg, #ffffff);
                border: 1px solid var(--munka-stats-border, #e0e8e1);
                box-shadow: 0 5px 20px rgba(20, 65, 35, 0.07);
                color: var(--munka-stats-text, #183d28);
            }

            #${SECTION_ID} *,
            #${SECTION_ID} *::before,
            #${SECTION_ID} *::after {
                box-sizing: border-box;
            }

            #${SECTION_ID} .munka-stats-header {
                display: flex;
                justify-content: space-between;
                align-items: flex-start;
                flex-wrap: wrap;
                gap: 16px;
                margin-bottom: 20px;
            }

            #${SECTION_ID} .munka-stats-title {
                margin: 0 0 7px;
                font-size: clamp(21px, 3vw, 28px);
                line-height: 1.25;
                font-weight: 800;
                color: var(--munka-stats-heading, #176b38);
            }

            #${SECTION_ID} .munka-stats-subtitle {
                margin: 0;
                font-size: 14px;
                line-height: 1.6;
                color: var(--munka-stats-muted, #617166);
            }

            #${SECTION_ID} .munka-stats-controls {
                display: flex;
                align-items: center;
                gap: 10px;
                flex-wrap: wrap;
            }

            #${SECTION_ID} .munka-refresh-button {
                min-height: 42px;
                padding: 10px 16px;
                border: none;
                border-radius: 9px;
                background: #176b38;
                color: #ffffff;
                font-weight: 700;
                font-size: 13px;
                cursor: pointer;
                transition: opacity 0.2s ease;
            }

            #${SECTION_ID} .munka-refresh-button:hover {
                opacity: 0.88;
            }

            #${SECTION_ID} .munka-refresh-button:disabled {
                opacity: 0.6;
                cursor: wait;
            }

            #${SECTION_ID} .munka-statistics-spinner {
                display: none;
                width: 13px;
                height: 13px;
                margin-right: 7px;
                vertical-align: middle;
                border: 2px solid rgba(255,255,255,0.4);
                border-top-color: #ffffff;
                border-radius: 50%;
                animation: munkaStatsSpin 0.8s linear infinite;
            }

            @keyframes munkaStatsSpin {
                to { transform: rotate(360deg); }
            }

            #${SECTION_ID} .munka-stats-period {
                margin: 0 0 14px;
                font-size: 13px;
                font-weight: 700;
                color: var(--munka-stats-muted, #617166);
            }

            #${SECTION_ID} .munka-statistics-grid {
                display: grid;
                grid-template-columns: repeat(4, minmax(0, 1fr));
                gap: 14px;
            }

            #${SECTION_ID} .munka-stat-card {
                min-width: 0;
                padding: 17px;
                border-radius: 13px;
                border: 1px solid var(--munka-stats-border, #e0e8e1);
                background: var(--munka-stats-card-bg, #fbfdfb);
                position: relative;
                overflow: hidden;
            }

            #${SECTION_ID} .munka-stat-card::before {
                content: "";
                position: absolute;
                top: 0;
                left: 0;
                width: 4px;
                height: 100%;
                background: var(--munka-card-accent, #27834a);
            }

            #${SECTION_ID} .munka-stat-card.green {
                --munka-card-accent: #23834a;
            }

            #${SECTION_ID} .munka-stat-card.blue {
                --munka-card-accent: #2879b9;
            }

            #${SECTION_ID} .munka-stat-card.orange {
                --munka-card-accent: #d78624;
            }

            #${SECTION_ID} .munka-stat-card.red {
                --munka-card-accent: #c64a4a;
            }

            #${SECTION_ID} .munka-stat-card.purple {
                --munka-card-accent: #8055ae;
            }

            #${SECTION_ID} .munka-stat-card.teal {
                --munka-card-accent: #198b8b;
            }

            #${SECTION_ID} .munka-stat-label {
                display: block;
                margin-bottom: 11px;
                font-size: 12px;
                line-height: 1.5;
                font-weight: 700;
                text-transform: uppercase;
                letter-spacing: 0.35px;
                color: var(--munka-stats-muted, #617166);
                overflow-wrap: anywhere;
            }

            #${SECTION_ID} .munka-stat-value {
                display: block;
                font-size: clamp(22px, 2.3vw, 30px);
                line-height: 1.25;
                font-weight: 800;
                color: var(--munka-stats-text, #183d28);
                overflow-wrap: anywhere;
            }

            #${SECTION_ID} .munka-stat-value.currency {
                font-size: clamp(17px, 1.8vw, 23px);
            }

            #${SECTION_ID} .munka-stat-description {
                display: block;
                margin-top: 8px;
                font-size: 12px;
                line-height: 1.5;
                color: var(--munka-stats-muted, #617166);
            }

            #${SECTION_ID} .munka-stats-group-title {
                grid-column: 1 / -1;
                margin: 18px 0 0;
                padding-bottom: 10px;
                border-bottom: 1px solid var(--munka-stats-border, #e0e8e1);
                font-size: 16px;
                font-weight: 800;
                color: var(--munka-stats-heading, #176b38);
            }

            #${SECTION_ID} .munka-statistics-status {
                margin-top: 18px;
                padding: 11px 13px;
                border-radius: 9px;
                font-size: 13px;
                line-height: 1.6;
                background: #f0f6f1;
                color: #315b3d;
                overflow-wrap: anywhere;
            }

            #${SECTION_ID} .munka-statistics-status.success {
                background: #eaf7ed;
                color: #176b38;
            }

            #${SECTION_ID} .munka-statistics-status.error {
                background: #fff0f0;
                color: #a32727;
            }

            #${SECTION_ID} .munka-statistics-status.warning {
                background: #fff7e8;
                color: #805400;
            }

            #${SECTION_ID} .munka-statistics-updated {
                margin: 10px 0 0;
                font-size: 12px;
                color: var(--munka-stats-muted, #617166);
            }

            body.dark-mode #${SECTION_ID} {
                --munka-stats-bg: #18251d;
                --munka-stats-border: #35483b;
                --munka-stats-text: #e8f3ea;
                --munka-stats-heading: #7fdaa0;
                --munka-stats-muted: #b0c2b5;
                --munka-stats-card-bg: #202f25;
                background: var(--munka-stats-bg);
                color: var(--munka-stats-text);
            }

            body.dark-mode #${SECTION_ID} .munka-statistics-status {
                background: #26382b;
                color: #d9f0df;
            }

            body.dark-mode #${SECTION_ID} .munka-statistics-status.success {
                background: #1f3b29;
                color: #a9e6ba;
            }

            body.dark-mode #${SECTION_ID} .munka-statistics-status.error {
                background: #472626;
                color: #ffd0d0;
            }

            body.dark-mode #${SECTION_ID} .munka-statistics-status.warning {
                background: #493b22;
                color: #ffe0a0;
            }

            @media (max-width: 1000px) {
                #${SECTION_ID} .munka-statistics-grid {
                    grid-template-columns: repeat(3, minmax(0, 1fr));
                }
            }

            @media (max-width: 700px) {
                #${SECTION_ID} {
                    padding: 16px;
                    margin: 18px 0;
                    border-radius: 13px;
                }

                #${SECTION_ID} .munka-statistics-grid {
                    grid-template-columns: repeat(2, minmax(0, 1fr));
                    gap: 10px;
                }

                #${SECTION_ID} .munka-stat-card {
                    padding: 13px;
                }

                #${SECTION_ID} .munka-stat-label {
                    font-size: 11px;
                }

                #${SECTION_ID} .munka-stat-value {
                    font-size: 23px;
                }

                #${SECTION_ID} .munka-stat-value.currency {
                    font-size: 17px;
                }
            }

            @media (max-width: 380px) {
                #${SECTION_ID} .munka-statistics-grid {
                    grid-template-columns: 1fr;
                }

                #${SECTION_ID} .munka-stats-header {
                    display: block;
                }

                #${SECTION_ID} .munka-stats-controls {
                    margin-top: 14px;
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
                    <h2 class="munka-stats-title">
                        Live Farm Statistics
                    </h2>

                    <p class="munka-stats-subtitle">
                        Monitor your pig population, breeding,
                        production, animal health and finances.
                    </p>
                </div>

                <div class="munka-stats-controls">
                    <button
                        type="button"
                        id="munkaRefreshStatisticsButton"
                        class="munka-refresh-button"
                    >
                        <span
                            id="munkaStatisticsSpinner"
                            class="munka-statistics-spinner"
                            aria-hidden="true"
                        ></span>
                        Refresh Statistics
                    </button>
                </div>
            </div>

            <p class="munka-stats-period"
               id="munkaStatisticsPeriod">
                Reporting period: Current month
            </p>

            <div class="munka-statistics-grid">

                <h3 class="munka-stats-group-title">
                    Pig Population
                </h3>

                <article class="munka-stat-card green">
                    <span class="munka-stat-label">
                        Total Registered Pigs
                    </span>
                    <strong class="munka-stat-value"
                            id="munkaStatTotalPigs">—</strong>
                    <span class="munka-stat-description">
                        Registered pig records in this farm
                    </span>
                </article>

                <article class="munka-stat-card green">
                    <span class="munka-stat-label">
                        Sows
                    </span>
                    <strong class="munka-stat-value"
                            id="munkaStatSows">—</strong>
                    <span class="munka-stat-description">
                        Records classified as sows
                    </span>
                </article>

                <article class="munka-stat-card blue">
                    <span class="munka-stat-label">
                        Boars
                    </span>
                    <strong class="munka-stat-value"
                            id="munkaStatBoars">—</strong>
                    <span class="munka-stat-description">
                        Records classified as boars
                    </span>
                </article>

                <article class="munka-stat-card orange">
                    <span class="munka-stat-label">
                        Piglets
                    </span>
                    <strong class="munka-stat-value"
                            id="munkaStatPiglets">—</strong>
                </article>

                <article class="munka-stat-card purple">
                    <span class="munka-stat-label">
                        Weaners
                    </span>
                    <strong class="munka-stat-value"
                            id="munkaStatWeaners">—</strong>
                </article>

                <article class="munka-stat-card teal">
                    <span class="munka-stat-label">
                        Growers
                    </span>
                    <strong class="munka-stat-value"
                            id="munkaStatGrowers">—</strong>
                </article>

                <article class="munka-stat-card orange">
                    <span class="munka-stat-label">
                        Unspecified Categories
                    </span>
                    <strong class="munka-stat-value"
                            id="munkaStatUnspecified">—</strong>
                    <span class="munka-stat-description">
                        Records needing a category
                    </span>
                </article>

                <h3 class="munka-stats-group-title">
                    Breeding and Production
                </h3>

                <article class="munka-stat-card purple">
                    <span class="munka-stat-label">
                        Pregnant Sows
                    </span>
                    <strong class="munka-stat-value"
                            id="munkaStatPregnantSows">—</strong>
                    <span class="munka-stat-description">
                        Unique sow IDs with Pregnant status
                    </span>
                </article>

                <article class="munka-stat-card orange">
                    <span class="munka-stat-label">
                        Expected Farrowings
                    </span>
                    <strong class="munka-stat-value"
                            id="munkaStatExpectedFarrowings">—</strong>
                    <span class="munka-stat-description">
                        Pregnant records with a due date today or later
                    </span>
                </article>

                <article class="munka-stat-card green">
                    <span class="munka-stat-label">
                        Piglets Weaned This Month
                    </span>
                    <strong class="munka-stat-value"
                            id="munkaStatWeanedThisMonth">—</strong>
                    <span class="munka-stat-description">
                        Based on recorded weaning dates
                    </span>
                </article>

                <article class="munka-stat-card blue">
                    <span class="munka-stat-label">
                        Piglets Weaned Cumulatively
                    </span>
                    <strong class="munka-stat-value"
                            id="munkaStatWeanedCumulative">—</strong>
                    <span class="munka-stat-description">
                        Total across all recorded weaning events
                    </span>
                </article>

                <h3 class="munka-stats-group-title">
                    Animal Health
                </h3>

                <article class="munka-stat-card red">
                    <span class="munka-stat-label">
                        Treatments This Month
                    </span>
                    <strong class="munka-stat-value"
                            id="munkaStatTreatments">—</strong>
                    <span class="munka-stat-description">
                        Treatment records entered this month
                    </span>
                </article>

                <h3 class="munka-stats-group-title">
                    Financial Performance
                </h3>

                <article class="munka-stat-card green">
                    <span class="munka-stat-label">
                        Sales Recorded
                    </span>
                    <strong class="munka-stat-value currency"
                            id="munkaStatSales">—</strong>
                    <span class="munka-stat-description">
                        All sales entered this month
                    </span>
                </article>

                <article class="munka-stat-card teal">
                    <span class="munka-stat-label">
                        Payments Received
                    </span>
                    <strong class="munka-stat-value currency"
                            id="munkaStatPaymentsReceived">—</strong>
                    <span class="munka-stat-description"
                          id="munkaStatPaidTransactions">
                        Confirmed paid sales
                    </span>
                </article>

                <article class="munka-stat-card orange">
                    <span class="munka-stat-label">
                        Pending Payments
                    </span>
                    <strong class="munka-stat-value currency"
                            id="munkaStatPendingPayments">—</strong>
                    <span class="munka-stat-description"
                          id="munkaStatPendingTransactions">
                        Unpaid or pending sales
                    </span>
                </article>

                <article class="munka-stat-card red">
                    <span class="munka-stat-label">
                        Expenses This Month
                    </span>
                    <strong class="munka-stat-value currency"
                            id="munkaStatExpenses">—</strong>
                    <span class="munka-stat-description">
                        Recorded expenses for the month
                    </span>
                </article>

                <article class="munka-stat-card blue">
                    <span class="munka-stat-label">
                        Net Cash Position
                    </span>
                    <strong class="munka-stat-value currency"
                            id="munkaStatNetBalance">—</strong>
                    <span class="munka-stat-description">
                        Payments received minus recorded expenses
                    </span>
                </article>

            </div>

            <div
                id="munkaLiveStatisticsStatus"
                class="munka-statistics-status"
                role="status"
                aria-live="polite"
            >
                Preparing your farm statistics...
            </div>

            <p
                id="munkaStatisticsLastUpdated"
                class="munka-statistics-updated"
            >
                Statistics have not been updated yet.
            </p>
        `;

        /*
         * Place statistics after the announcements area.
         * The HTML uses the announcements-section class.
         */

        const announcementsSection =
            document.querySelector(".announcements-section");

        if (announcementsSection) {
            announcementsSection.insertAdjacentElement(
                "afterend",
                section
            );
        } else {
            const welcomeSection =
                document.querySelector(".welcome-section");

            if (welcomeSection) {
                welcomeSection.insertAdjacentElement(
                    "afterend",
                    section
                );
            } else {
                document.body.appendChild(section);
            }
        }

        const refreshButton = document.getElementById(
            "munkaRefreshStatisticsButton"
        );

        if (refreshButton) {
            refreshButton.addEventListener("click", function () {
                loadDashboardFarmStatistics(true);
            });
        }

        return section;
    }

    /* ========================================================
       DISPLAY STATISTICS
    ======================================================== */

    function displayStatistics(data) {
        setText("munkaStatTotalPigs", formatNumber(data.pigs.total));
        setText("munkaStatSows", formatNumber(data.pigs.sows));
        setText("munkaStatBoars", formatNumber(data.pigs.boars));
        setText("munkaStatPiglets", formatNumber(data.pigs.piglets));
        setText("munkaStatWeaners", formatNumber(data.pigs.weaners));
        setText("munkaStatGrowers", formatNumber(data.pigs.growers));

        setText(
            "munkaStatUnspecified",
            formatNumber(data.pigs.unspecified)
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
       LOAD ALL STATISTICS
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
                    "The Supabase client was not found. Check supabase.js and the script order in dashboard.html."
                );
            }

            const sessionResult = await client.auth.getSession();

            if (sessionResult.error) {
                throw new Error(
                    "Could not verify the login session: " +
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

            const user = validation.user;
            const farmId = validation.farmId;

            /*
             * The reporting dates use Zambia's calendar date.
             * Database date columns are compared as YYYY-MM-DD.
             */

            const monthRange = getMonthRange();

            setStatus(
                "Loading statistics for your registered farm...",
                "info"
            );

            /*
             * Fetch data concurrently.
             *
             * Every query is explicitly filtered by farm_id.
             * Supabase Row Level Security must also remain enabled.
             */

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
                )
            ]);

            const pigs = results[0];
            const gestationRecords = results[1];
            const weaningRecords = results[2];
            const treatmentRecords = results[3];
            const salesRecords = results[4];
            const expenseRecords = results[5];

            const pigStats = calculatePigPopulation(pigs);

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

            setStatus(
                "Statistics loaded successfully for your farm. " +
                "Financial figures cover the current month; " +
                "pig population and cumulative weaning figures cover all available records.",
                "success"
            );

            /*
             * Preserve a public reference for other dashboard
             * components that need the latest statistics.
             */

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
            console.error(
                "MUNKA Statistics error:",
                error
            );

            state.lastError = error.message || "Unknown error";

            /*
             * If a refresh fails after an earlier successful
             * load, keep the previous displayed values rather
             * than replacing good data with zeros.
             */

            if (lastSuccessfulData) {
                setStatus(
                    "Could not refresh the latest statistics. " +
                    "The figures currently displayed are from the previous successful update. " +
                    "Details: " + state.lastError,
                    "warning"
                );
            } else {
                setStatus(
                    "Statistics could not be loaded. " +
                    "Check your internet connection, login session, " +
                    "table access and Supabase permissions. " +
                    "Details: " + state.lastError,
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

        /*
         * Prevent the old dashboard.js statistics loader from
         * creating another statistics panel. This replacement
         * file becomes the single statistics loader.
         *
         * Other dashboard.js features remain unchanged.
         */

        window.loadDashboardFarmStatistics =
            loadDashboardFarmStatistics;

        createStatisticsPanel();

        loadDashboardFarmStatistics(false);

        /*
         * Refresh every five minutes while the page is open.
         */

        if (refreshTimer) {
            clearInterval(refreshTimer);
        }

        refreshTimer = setInterval(function () {
            if (!document.hidden) {
                loadDashboardFarmStatistics(false);
            }
        }, REFRESH_INTERVAL);

        /*
         * Refresh when the user returns to the dashboard tab.
         */

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