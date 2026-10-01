/* ============================================================
   MUNKA PIGGERY MANAGEMENT SYSTEM
   DASHBOARD FARM STATISTICS
   ============================================================ */

let dashboardFarmStatistics = {};


/* ============================================================
   HELPER FUNCTIONS
   ============================================================ */

function dashboardStatsNumber(value) {
    const number = Number(value || 0);

    return new Intl.NumberFormat("en-ZM").format(number);
}


function dashboardStatsCurrency(value) {
    const number = Number(value || 0);

    return new Intl.NumberFormat("en-ZM", {
        style: "currency",
        currency: "ZMW",
        minimumFractionDigits: 2
    }).format(number);
}


function dashboardStatsDateOnly(value) {

    if (!value) {
        return "";
    }

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
        return "";
    }

    return date.toLocaleDateString("en-ZM", {
        day: "2-digit",
        month: "short",
        year: "numeric"
    });
}


function dashboardStatsGetMonthRange() {

    const now = new Date();

    const start = new Date(
        now.getFullYear(),
        now.getMonth(),
        1
    );

    const end = new Date(
        now.getFullYear(),
        now.getMonth() + 1,
        1
    );

    return {
        start: start.toISOString(),
        end: end.toISOString()
    };
}


/* ============================================================
   CREATE STATISTICS SECTION
   ============================================================ */

function createDashboardStatisticsPanel() {

    if (document.getElementById("farmStatisticsSection")) {
        return;
    }

    const announcementsSection =
        document.getElementById("announcementsSection");

    if (!announcementsSection) {
        console.warn(
            "Announcements section not found. Statistics panel was not created."
        );

        return;
    }

    const section = document.createElement("section");

    section.id = "farmStatisticsSection";
    section.className = "dashboard-section farm-statistics-section";

    section.innerHTML = `

        <div class="section-heading statistics-heading">

            <div>

                <span class="section-kicker">
                    FARM PERFORMANCE
                </span>

                <h2>
                    📊 Farm Statistics
                </h2>

                <p>
                    A quick overview of your farm's current performance.
                </p>

            </div>

            <button
                type="button"
                id="refreshFarmStatisticsButton"
                class="dashboard-btn secondary-btn"
            >
                ↻ Refresh
            </button>

        </div>


        <div
            id="farmStatisticsStatus"
            class="farm-statistics-status"
        >
            Loading farm statistics...
        </div>


        <div class="farm-statistics-grid">


            <!-- TOTAL PIGS -->

            <div class="farm-stat-card">

                <div class="stat-card-icon pig-icon">
                    🐖
                </div>

                <div class="stat-card-content">

                    <span class="stat-card-label">
                        Total Pigs
                    </span>

                    <strong id="statTotalPigs">
                        0
                    </strong>

                    <small>
                        Registered on this farm
                    </small>

                </div>

            </div>


            <!-- PREGNANT SOWS -->

            <div class="farm-stat-card">

                <div class="stat-card-icon sow-icon">
                    🐷
                </div>

                <div class="stat-card-content">

                    <span class="stat-card-label">
                        Pregnant Sows
                    </span>

                    <strong id="statPregnantSows">
                        0
                    </strong>

                    <small>
                        Active gestation records
                    </small>

                </div>

            </div>


            <!-- EXPECTED FARROWINGS -->

            <div class="farm-stat-card">

                <div class="stat-card-icon farrowing-icon">
                    📅
                </div>

                <div class="stat-card-content">

                    <span class="stat-card-label">
                        Expected Farrowings
                    </span>

                    <strong id="statExpectedFarrowings">
                        0
                    </strong>

                    <small>
                        Upcoming deliveries
                    </small>

                </div>

            </div>


            <!-- WEANED PIGLETS -->

            <div class="farm-stat-card">

                <div class="stat-card-icon weaning-icon">
                    🐽
                </div>

                <div class="stat-card-content">

                    <span class="stat-card-label">
                        Piglets Weaned
                    </span>

                    <strong id="statPigletsWeaned">
                        0
                    </strong>

                    <small>
                        Total recorded weaned
                    </small>

                </div>

            </div>


            <!-- TREATMENTS -->

            <div class="farm-stat-card">

                <div class="stat-card-icon treatment-icon">
                    💉
                </div>

                <div class="stat-card-content">

                    <span class="stat-card-label">
                        Treatments
                    </span>

                    <strong id="statTreatmentsMonth">
                        0
                    </strong>

                    <small>
                        This month
                    </small>

                </div>

            </div>


            <!-- SALES -->

            <div class="farm-stat-card">

                <div class="stat-card-icon sales-icon">
                    💰
                </div>

                <div class="stat-card-content">

                    <span class="stat-card-label">
                        Sales
                    </span>

                    <strong id="statSalesMonth">
                        ZMW 0.00
                    </strong>

                    <small>
                        This month
                    </small>

                </div>

            </div>


            <!-- EXPENSES -->

            <div class="farm-stat-card">

                <div class="stat-card-icon expenses-icon">
                    💳
                </div>

                <div class="stat-card-content">

                    <span class="stat-card-label">
                        Expenses
                    </span>

                    <strong id="statExpensesMonth">
                        ZMW 0.00
                    </strong>

                    <small>
                        This month
                    </small>

                </div>

            </div>


            <!-- NET BALANCE -->

            <div class="farm-stat-card net-balance-card">

                <div class="stat-card-icon balance-icon">
                    📈
                </div>

                <div class="stat-card-content">

                    <span class="stat-card-label">
                        Net Balance
                    </span>

                    <strong id="statNetBalance">
                        ZMW 0.00
                    </strong>

                    <small>
                        Sales minus expenses
                    </small>

                </div>

            </div>

        </div>
    `;


    announcementsSection.insertAdjacentElement(
        "afterend",
        section
    );


    const refreshButton =
        document.getElementById(
            "refreshFarmStatisticsButton"
        );


    if (refreshButton) {

        refreshButton.addEventListener(
            "click",
            loadDashboardFarmStatistics
        );

    }
}


/* ============================================================
   LOADING STATE
   ============================================================ */

function setDashboardStatisticsLoading() {

    const status =
        document.getElementById(
            "farmStatisticsStatus"
        );

    if (status) {

        status.textContent =
            "Loading the latest farm statistics...";

    }
}


/* ============================================================
   ERROR DISPLAY
   ============================================================ */

function displayDashboardStatisticsError(message) {

    const status =
        document.getElementById(
            "farmStatisticsStatus"
        );

    if (status) {

        status.textContent =
            message ||
            "Unable to load farm statistics.";

    }
}


/* ============================================================
   CHECK ACTIVE GESTATION
   ============================================================ */

function dashboardStatsIsActiveGestation(record) {

    if (!record) {
        return false;
    }

    const status =
        String(record.status || "")
            .trim()
            .toLowerCase();


    /*
     * If the record has a status, ignore clearly completed
     * or cancelled records.
     */

    if (
        status === "completed" ||
        status === "complete" ||
        status === "cancelled" ||
        status === "cancelled" ||
        status === "farrowed" ||
        status === "closed"
    ) {

        return false;

    }


    return true;
}


/* ============================================================
   LOAD FARM STATISTICS
   ============================================================ */

async function loadDashboardFarmStatistics() {

    createDashboardStatisticsPanel();

    setDashboardStatisticsLoading();


    try {

        /*
         * Get logged-in user
         */

        let loggedInUser = null;


        try {

            loggedInUser =
                JSON.parse(
                    localStorage.getItem(
                        "loggedInUser"
                    )
                );

        } catch (error) {

            console.error(
                "Could not read loggedInUser:",
                error
            );

        }


        if (!loggedInUser) {

            displayDashboardStatisticsError(
                "Please log in to view farm statistics."
            );

            return;
        }


        const farmId =
            Number(
                loggedInUser.farm_id ||
                window.dashboardCurrentFarmId ||
                0
            );


        if (!farmId) {

            displayDashboardStatisticsError(
                "No farm is assigned to this account."
            );

            return;
        }


        /*
         * Current month
         */

        const monthRange =
            dashboardStatsGetMonthRange();


        /* ====================================================
           1. TOTAL PIGS
        ==================================================== */

        const {
            count: totalPigs,
            error: pigsError
        } = await supabase
            .from("pigs")
            .select(
                "id",
                {
                    count: "exact",
                    head: true
                }
            )
            .eq(
                "farm_id",
                farmId
            );


        if (pigsError) {
            throw pigsError;
        }


        /* ====================================================
           2. GESTATION RECORDS
        ==================================================== */

        const {
            data: gestationRecords,
            error: gestationError
        } = await supabase
            .from("gestation_records")
            .select(
                `
                    id,
                    sow_id,
                    delivery_date,
                    status
                `
            )
            .eq(
                "farm_id",
                farmId
            );


        if (gestationError) {
            throw gestationError;
        }


        const activeGestation =
            (gestationRecords || [])
                .filter(
                    dashboardStatsIsActiveGestation
                );


        const pregnantSows =
            activeGestation.length;


        /*
         * Expected farrowings
         *
         * Count active gestations whose delivery date
         * is today or in the future.
         */

        const today =
            new Date();

        today.setHours(
            0,
            0,
            0,
            0
        );


        const expectedFarrowings =
            activeGestation.filter(
                record => {

                    if (!record.delivery_date) {
                        return false;
                    }

                    const deliveryDate =
                        new Date(
                            record.delivery_date
                        );

                    deliveryDate.setHours(
                        0,
                        0,
                        0,
                        0
                    );

                    return deliveryDate >= today;

                }
            ).length;


        /* ====================================================
           3. WEANED PIGLETS
        ==================================================== */

        const {
            data: farrowingRecords,
            error: farrowingError
        } = await supabase
            .from("farrowing_records")
            .select(
                "total_weaned"
            )
            .eq(
                "farm_id",
                farmId
            );


        if (farrowingError) {
            throw farrowingError;
        }


        const pigletsWeaned =
            (farrowingRecords || [])
                .reduce(
                    (total, record) => {

                        return total +
                            Number(
                                record.total_weaned || 0
                            );

                    },
                    0
                );


        /* ====================================================
           4. TREATMENTS THIS MONTH
        ==================================================== */

        const {
            count: treatmentsMonth,
            error: treatmentError
        } = await supabase
            .from("treatment_records")
            .select(
                "id",
                {
                    count: "exact",
                    head: true
                }
            )
            .eq(
                "farm_id",
                farmId
            )
            .gte(
                "treatment_date",
                monthRange.start
            )
            .lt(
                "treatment_date",
                monthRange.end
            );


        if (treatmentError) {
            throw treatmentError;
        }


        /* ====================================================
           5. SALES THIS MONTH
        ==================================================== */

        const {
            data: salesRecords,
            error: salesError
        } = await supabase
            .from("sales_records")
            .select(
                "total_amount"
            )
            .eq(
                "farm_id",
                farmId
            )
            .gte(
                "sale_date",
                monthRange.start
            )
            .lt(
                "sale_date",
                monthRange.end
            );


        if (salesError) {
            throw salesError;
        }


        const salesMonth =
            (salesRecords || [])
                .reduce(
                    (total, record) => {

                        return total +
                            Number(
                                record.total_amount || 0
                            );

                    },
                    0
                );


        /* ====================================================
           6. EXPENSES THIS MONTH
        ==================================================== */

        const {
            data: expenseRecords,
            error: expenseError
        } = await supabase
            .from("expenses_records")
            .select(
                "total_amount"
            )
            .eq(
                "farm_id",
                farmId
            )
            .gte(
                "expense_date",
                monthRange.start
            )
            .lt(
                "expense_date",
                monthRange.end
            );


        if (expenseError) {
            throw expenseError;
        }


        const expensesMonth =
            (expenseRecords || [])
                .reduce(
                    (total, record) => {

                        return total +
                            Number(
                                record.total_amount || 0
                            );

                    },
                    0
                );


        /* ====================================================
           7. NET BALANCE
        ==================================================== */

        const netBalance =
            salesMonth -
            expensesMonth;


        /* ====================================================
           SAVE STATISTICS
        ==================================================== */

        dashboardFarmStatistics = {

            farmId,

            totalPigs:
                totalPigs || 0,

            pregnantSows,

            expectedFarrowings,

            pigletsWeaned,

            treatmentsMonth:
                treatmentsMonth || 0,

            salesMonth,

            expensesMonth,

            netBalance

        };


        /* ====================================================
           DISPLAY STATISTICS
        ==================================================== */

        const totalPigsElement =
            document.getElementById(
                "statTotalPigs"
            );

        const pregnantSowsElement =
            document.getElementById(
                "statPregnantSows"
            );

        const expectedFarrowingsElement =
            document.getElementById(
                "statExpectedFarrowings"
            );

        const pigletsWeanedElement =
            document.getElementById(
                "statPigletsWeaned"
            );

        const treatmentsElement =
            document.getElementById(
                "statTreatmentsMonth"
            );

        const salesElement =
            document.getElementById(
                "statSalesMonth"
            );

        const expensesElement =
            document.getElementById(
                "statExpensesMonth"
            );

        const balanceElement =
            document.getElementById(
                "statNetBalance"
            );


        if (totalPigsElement) {

            totalPigsElement.textContent =
                dashboardStatsNumber(
                    totalPigs
                );

        }


        if (pregnantSowsElement) {

            pregnantSowsElement.textContent =
                dashboardStatsNumber(
                    pregnantSows
                );

        }


        if (expectedFarrowingsElement) {

            expectedFarrowingsElement.textContent =
                dashboardStatsNumber(
                    expectedFarrowings
                );

        }


        if (pigletsWeanedElement) {

            pigletsWeanedElement.textContent =
                dashboardStatsNumber(
                    pigletsWeaned
                );

        }


        if (treatmentsElement) {

            treatmentsElement.textContent =
                dashboardStatsNumber(
                    treatmentsMonth
                );

        }


        if (salesElement) {

            salesElement.textContent =
                dashboardStatsCurrency(
                    salesMonth
                );

        }


        if (expensesElement) {

            expensesElement.textContent =
                dashboardStatsCurrency(
                    expensesMonth
                );

        }


        if (balanceElement) {

            balanceElement.textContent =
                dashboardStatsCurrency(
                    netBalance
                );

        }


        const status =
            document.getElementById(
                "farmStatisticsStatus"
            );


        if (status) {

            status.textContent =
                `Statistics updated • ${dashboardStatsDateOnly(new Date())}`;

        }


        console.log(
            "MUNKA PIGGERY dashboard statistics:",
            dashboardFarmStatistics
        );


    } catch (error) {

        console.error(
            "Dashboard statistics error:",
            error
        );


        displayDashboardStatisticsError(
            "Some farm statistics could not be loaded. Please check your database permissions and try again."
        );

    }

}


/* ============================================================
   INITIALIZE
   ============================================================ */

function initializeDashboardFarmStatistics() {

    createDashboardStatisticsPanel();

    loadDashboardFarmStatistics();

}


/* ============================================================
   START WHEN DASHBOARD LOADS
   ============================================================ */

document.addEventListener(
    "DOMContentLoaded",
    initializeDashboardFarmStatistics
);

