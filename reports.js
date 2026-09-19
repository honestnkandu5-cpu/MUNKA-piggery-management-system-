// ============================================================
// MUNKA PIGGERY MANAGEMENT SYSTEM
// REPORTS & ANALYTICS
// AUTOMATIC FARM-SECURED REPORTING
//
// FINANCIAL COLOUR SYSTEM
// SALES       = BLUE
// EXPENSES    = RED
// PROFIT      = GREEN
// LOSS        = RED
// BALANCE     = YELLOW
// ============================================================


let financialChart = null;
let pigChart = null;
let gestationChart = null;
let productionChart = null;
let healthChart = null;
let feedingChart = null;


// ============================================================
// REPORT DATA
// ============================================================

let reportData = {

    pigs: [],
    gestation: [],
    farrowing: [],
    weaning: [],
    treatment: [],
    feeding: [],
    sales: [],
    expenses: []

};


// ============================================================
// FINANCIAL COLOUR CONSTANTS
// ============================================================

const FINANCIAL_COLORS = {

    sales: "#2563eb",

    expenses: "#dc2626",

    profit: "#16a34a",

    loss: "#dc2626",

    balance: "#eab308"

};


// ============================================================
// USER
// ============================================================

function getLoggedUser() {

    try {

        return JSON.parse(
            localStorage.getItem("loggedInUser")
        ) || null;

    } catch (error) {

        console.error(error);

        return null;
    }

}


// ============================================================
// FARM ID
// ============================================================

function getFarmID() {

    const user =
        getLoggedUser();


    if (!user || !user.farm_id) {

        console.error(
            "No farm ID found."
        );

        return null;
    }


    return user.farm_id;
}


// ============================================================
// ACCESS
// ============================================================

function checkUserAccess() {

    const user =
        getLoggedUser();


    if (!user) {

        alert(
            "Your session has expired. Please login again."
        );

        window.location.href =
            "login.html";

        return false;
    }


    if (!user.farm_id) {

        alert(
            "Your account is not linked to a farm."
        );

        return false;
    }


    return true;
}


// ============================================================
// FORMATTING
// ============================================================

function formatMoney(value) {

    return Number(value || 0).toLocaleString(
        "en-ZM",
        {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        }
    );

}


function formatNumber(value) {

    return Number(value || 0).toLocaleString(
        "en-ZM"
    );

}


// ============================================================
// SAFE HTML
// ============================================================

function escapeHTML(value) {

    return String(value ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");

}


// ============================================================
// SET TEXT
// ============================================================

function setElementText(id, value) {

    const element =
        document.getElementById(id);


    if (element) {

        element.textContent =
            value;

    }

}


// ============================================================
// MONTH
// ============================================================

function getSelectedMonth() {

    const input =
        document.getElementById(
            "reportMonth"
        );


    return input
        ? input.value
        : "";

}


function belongsToMonth(
    dateValue,
    selectedMonth
) {

    if (!selectedMonth) {

        return true;
    }


    if (!dateValue) {

        return false;
    }


    return String(dateValue)
        .substring(0, 7) === selectedMonth;

}


// ============================================================
// DATE HELPERS
// ============================================================

function getDateValue(
    record,
    fields
) {

    for (const field of fields) {

        if (
            record[field] !== undefined &&
            record[field] !== null &&
            record[field] !== ""
        ) {

            return record[field];

        }

    }


    return null;
}


// ============================================================
// FINANCIAL STATE
// ============================================================

function getFinancialState(
    profit
) {

    const value =
        Number(profit || 0);


    if (value > 0) {

        return "profit";

    }


    if (value < 0) {

        return "loss";

    }


    return "balance";

}


// ============================================================
// REMOVE FINANCIAL CLASSES
// ============================================================

function clearFinancialClasses(element) {

    if (!element) {
        return;
    }


    element.classList.remove(
        "profit-card",
        "loss-card",
        "balance-card",
        "profit-box",
        "loss-box",
        "balance-box",
        "profit-value",
        "loss-value",
        "balance-value"
    );

}


// ============================================================
// APPLY FINANCIAL STATE
// ============================================================

function applyFinancialState(
    profit
) {

    const state =
        getFinancialState(profit);


    const summaryCard =
        document.getElementById(
            "profitLossCard"
        );


    const financialBox =
        document.getElementById(
            "financialProfitBox"
        );


    const summaryValue =
        document.getElementById(
            "profitLoss"
        );


    const financialValue =
        document.getElementById(
            "financialProfit"
        );


    // --------------------------------------------------------
    // SUMMARY CARD
    // --------------------------------------------------------

    clearFinancialClasses(
        summaryCard
    );


    if (summaryCard) {

        summaryCard.classList.add(
            state + "-card"
        );

    }


    // --------------------------------------------------------
    // FINANCIAL BOX
    // --------------------------------------------------------

    clearFinancialClasses(
        financialBox
    );


    if (financialBox) {

        financialBox.classList.add(
            state + "-box"
        );

    }


    // --------------------------------------------------------
    // SUMMARY VALUE
    // --------------------------------------------------------

    clearFinancialClasses(
        summaryValue
    );


    if (summaryValue) {

        summaryValue.classList.add(
            state + "-value"
        );

    }


    // --------------------------------------------------------
    // FINANCIAL VALUE
    // --------------------------------------------------------

    clearFinancialClasses(
        financialValue
    );


    if (financialValue) {

        financialValue.classList.add(
            state + "-value"
        );

    }


    // --------------------------------------------------------
    // UPDATE PROFIT/LOSS LABEL
    // --------------------------------------------------------

    const summaryHeading =
        summaryCard
            ? summaryCard.querySelector("h3")
            : null;


    const financialHeading =
        financialBox
            ? financialBox.querySelector("h3")
            : null;


    if (state === "profit") {

        if (summaryHeading) {

            summaryHeading.textContent =
                "Profit";

        }


        if (financialHeading) {

            financialHeading.textContent =
                "Net Profit";

        }

    }


    else if (state === "loss") {

        if (summaryHeading) {

            summaryHeading.textContent =
                "Loss";

        }


        if (financialHeading) {

            financialHeading.textContent =
                "Net Loss";

        }

    }


    else {

        if (summaryHeading) {

            summaryHeading.textContent =
                "Balance";

        }


        if (financialHeading) {

            financialHeading.textContent =
                "Financial Balance";

        }

    }

}


// ============================================================
// LOAD REPORT DATA
// ============================================================

async function loadReportData() {

    if (!checkUserAccess()) {
        return;
    }


    const farmID =
        getFarmID();


    if (!farmID) {
        return;
    }


    setElementText(
        "reportStatus",
        "Loading farm records..."
    );


    try {

        const results =
            await Promise.all([

                supabaseClient
                    .from("pigs")
                    .select("*")
                    .eq("farm_id", farmID),

                supabaseClient
                    .from("gestation_records")
                    .select("*")
                    .eq("farm_id", farmID),

                supabaseClient
                    .from("farrowing_records")
                    .select("*")
                    .eq("farm_id", farmID),

                supabaseClient
                    .from("weaning_records")
                    .select("*")
                    .eq("farm_id", farmID),

                supabaseClient
                    .from("treatment_records")
                    .select("*")
                    .eq("farm_id", farmID),

                supabaseClient
                    .from("feeding_records")
                    .select("*")
                    .eq("farm_id", farmID),

                supabaseClient
                    .from("sales_records")
                    .select("*")
                    .eq("farm_id", farmID),

                supabaseClient
                    .from("expenses_records")
                    .select("*")
                    .eq("farm_id", farmID)

            ]);


        const [

            pigsResult,
            gestationResult,
            farrowingResult,
            weaningResult,
            treatmentResult,
            feedingResult,
            salesResult,
            expensesResult

        ] = results;


        const errors =
            results
                .filter(
                    result =>
                        result.error
                )
                .map(
                    result =>
                        result.error
                );


        if (errors.length) {

            console.error(
                "Report loading errors:",
                errors
            );

            throw errors[0];
        }


        reportData.pigs =
            pigsResult.data || [];


        reportData.gestation =
            gestationResult.data || [];


        reportData.farrowing =
            farrowingResult.data || [];


        reportData.weaning =
            weaningResult.data || [];


        reportData.treatment =
            treatmentResult.data || [];


        reportData.feeding =
            feedingResult.data || [];


        reportData.sales =
            salesResult.data || [];


        reportData.expenses =
            expensesResult.data || [];


        setElementText(
            "reportStatus",
            "Farm records loaded successfully"
        );


        const now =
            new Date();


        setElementText(
            "reportLastUpdated",
            "Updated " +
            now.toLocaleString()
        );


        console.log(
            "Reports loaded:",
            {
                farmID,
                pigs:
                    reportData.pigs.length,
                gestation:
                    reportData.gestation.length,
                farrowing:
                    reportData.farrowing.length,
                weaning:
                    reportData.weaning.length,
                treatment:
                    reportData.treatment.length,
                feeding:
                    reportData.feeding.length,
                sales:
                    reportData.sales.length,
                expenses:
                    reportData.expenses.length
            }
        );


        generateReports();

    }

    catch (error) {

        console.error(
            "Reports loading failed:",
            error
        );


        setElementText(
            "reportStatus",
            "Unable to load report data"
        );


        alert(
            "Unable to load Reports & Analytics.\n\n" +
            (
                error.message ||
                "Unknown database error."
            )
        );

    }

}


// ============================================================
// LOAD REPORTS
// ============================================================

function loadReports() {

    loadReportData();

}


// ============================================================
// GENERATE EVERYTHING
// ============================================================

function generateReports() {

    generateDashboardSummary();

    generateFinancialReport();

    generatePigReport();

    generateGestationReport();

    generateProductionReport();

    generateHealthReport();

    generateFeedingReport();

    generateMonthlyFinancialTable();

    generateManagementInsights();

    createFinancialChart();

    createPigChart();

    createGestationChart();

    createProductionChart();

    createHealthChart();

    createFeedingChart();

}


// ============================================================
// DASHBOARD SUMMARY
// ============================================================

function generateDashboardSummary() {

    const month =
        getSelectedMonth();


    const sales =
        reportData.sales.filter(
            record =>
                belongsToMonth(
                    getDateValue(
                        record,
                        [
                            "sale_date",
                            "sales_date",
                            "date",
                            "created_at"
                        ]
                    ),
                    month
                )
        );


    const expenses =
        reportData.expenses.filter(
            record =>
                belongsToMonth(
                    getDateValue(
                        record,
                        [
                            "expense_date",
                            "date",
                            "created_at"
                        ]
                    ),
                    month
                )
        );


    const weaning =
        reportData.weaning.filter(
            record =>
                belongsToMonth(
                    getDateValue(
                        record,
                        [
                            "weaning_date",
                            "date",
                            "created_at"
                        ]
                    ),
                    month
                )
        );


    const treatment =
        reportData.treatment.filter(
            record =>
                belongsToMonth(
                    getDateValue(
                        record,
                        [
                            "treatment_date",
                            "date",
                            "created_at"
                        ]
                    ),
                    month
                )
        );


    const feeding =
        reportData.feeding.filter(
            record =>
                belongsToMonth(
                    getDateValue(
                        record,
                        [
                            "feeding_date",
                            "date",
                            "created_at"
                        ]
                    ),
                    month
                )
        );


    const farrowing =
        reportData.farrowing.filter(
            record =>
                belongsToMonth(
                    getDateValue(
                        record,
                        [
                            "farrow_date",
                            "farrowing_date",
                            "date",
                            "created_at"
                        ]
                    ),
                    month
                )
        );


    const totalSales =
        sales.reduce(
            (sum, record) =>
                sum +
                Number(
                    record.total_amount || 0
                ),
            0
        );


    const totalExpenses =
        expenses.reduce(
            (sum, record) =>
                sum +
                Number(
                    record.total_amount || 0
                ),
            0
        );


    const profit =
        totalSales -
        totalExpenses;


    const totalWeaned =
        weaning.reduce(
            (sum, record) =>
                sum +
                Number(
                    record.total_weaned ||
                    record.weaned ||
                    record.number_weaned ||
                    0
                ),
            0
        );


    const totalFeed =
        feeding.reduce(
            (sum, record) =>
                sum +
                Number(
                    record.quantity ||
                    record.feed_quantity ||
                    0
                ),
            0
        );


    setElementText(
        "totalPigs",
        formatNumber(
            reportData.pigs.length
        )
    );


    setElementText(
        "totalSales",
        "ZMW " +
        formatMoney(totalSales)
    );


    setElementText(
        "totalExpenses",
        "ZMW " +
        formatMoney(totalExpenses)
    );


    setElementText(
        "profitLoss",
        "ZMW " +
        formatMoney(profit)
    );


    setElementText(
        "totalWeaned",
        formatNumber(totalWeaned)
    );


    setElementText(
        "totalTreatments",
        formatNumber(
            treatment.length
        )
    );


    setElementText(
        "totalFeeding",
        formatNumber(totalFeed) +
        " Kg"
    );


    setElementText(
        "totalFarrowing",
        formatNumber(
            farrowing.length
        )
    );


    // APPLY PROFIT / LOSS / BALANCE COLOUR

    applyFinancialState(
        profit
    );

}


// ============================================================
// FINANCIAL TOTALS
// ============================================================

function getFinancialTotals() {

    const month =
        getSelectedMonth();


    const sales =
        reportData.sales.filter(
            record =>
                belongsToMonth(
                    getDateValue(
                        record,
                        [
                            "sale_date",
                            "sales_date",
                            "date",
                            "created_at"
                        ]
                    ),
                    month
                )
        );


    const expenses =
        reportData.expenses.filter(
            record =>
                belongsToMonth(
                    getDateValue(
                        record,
                        [
                            "expense_date",
                            "date",
                            "created_at"
                        ]
                    ),
                    month
                )
        );


    const totalSales =
        sales.reduce(
            (sum, record) =>
                sum +
                Number(
                    record.total_amount || 0
                ),
            0
        );


    const totalExpenses =
        expenses.reduce(
            (sum, record) =>
                sum +
                Number(
                    record.total_amount || 0
                ),
            0
        );


    return {

        sales:
            totalSales,

        expenses:
            totalExpenses,

        profit:
            totalSales -
            totalExpenses

    };

}


// ============================================================
// FINANCIAL REPORT
// ============================================================

function generateFinancialReport() {

    const totals =
        getFinancialTotals();


    setElementText(
        "financialSales",
        "ZMW " +
        formatMoney(
            totals.sales
        )
    );


    setElementText(
        "financialExpenses",
        "ZMW " +
        formatMoney(
            totals.expenses
        )
    );


    setElementText(
        "financialProfit",
        "ZMW " +
        formatMoney(
            totals.profit
        )
    );


    // APPLY PROFIT / LOSS / BALANCE COLOUR

    applyFinancialState(
        totals.profit
    );

}


// ============================================================
// PIG REPORT
// ============================================================

function generatePigReport() {

    const month =
        getSelectedMonth();


    let pigs =
        reportData.pigs;


    if (month) {

        pigs =
            pigs.filter(
                pig =>
                    belongsToMonth(
                        getDateValue(
                            pig,
                            [
                                "farrowDate",
                                "farrow_date",
                                "registration_date",
                                "created_at"
                            ]
                        ),
                        month
                    )
            );

    }


    const male =
        pigs.filter(
            pig =>
                String(
                    pig.sex || ""
                ).toLowerCase() ===
                "male"
        ).length;


    const female =
        pigs.filter(
            pig =>
                String(
                    pig.sex || ""
                ).toLowerCase() ===
                "female"
        ).length;


    const healthy =
        pigs.filter(
            pig =>
                String(
                    pig.health_status ||
                    pig.healthStatus ||
                    ""
                )
                .toLowerCase()
                .includes("healthy")
        ).length;


    setElementText(
        "pigReportTotal",
        formatNumber(
            pigs.length
        )
    );


    setElementText(
        "malePigs",
        formatNumber(male)
    );


    setElementText(
        "femalePigs",
        formatNumber(female)
    );


    setElementText(
        "healthyPigs",
        formatNumber(healthy)
    );

}


// ============================================================
// GESTATION REPORT
// ============================================================

function generateGestationReport() {

    const month =
        getSelectedMonth();


    const all =
        reportData.gestation;


    const monthRecords =
        all.filter(
            record =>
                belongsToMonth(
                    getDateValue(
                        record,
                        [
                            "service_date",
                            "mating_date",
                            "breeding_date",
                            "gestation_date",
                            "date",
                            "created_at"
                        ]
                    ),
                    month
                )
        );


    const completed =
        all.filter(
            record => {

                const status =
                    String(
                        record.status || ""
                    ).toLowerCase();


                return (

                    status.includes("complete") ||

                    status.includes("farrow") ||

                    status.includes("deliver")

                );

            }
        );


    const active =
        all.filter(
            record => {

                const status =
                    String(
                        record.status || ""
                    ).toLowerCase();


                return (

                    !status.includes("complete") &&

                    !status.includes("farrow") &&

                    !status.includes("deliver")

                );

            }
        );


    setElementText(
        "gestationCount",
        formatNumber(
            all.length
        )
    );


    setElementText(
        "gestationMonthCount",
        formatNumber(
            month
                ? monthRecords.length
                : all.length
        )
    );


    setElementText(
        "activeGestations",
        formatNumber(
            active.length
        )
    );


    setElementText(
        "completedGestations",
        formatNumber(
            completed.length
        )
    );

}


// ============================================================
// PRODUCTION
// ============================================================

function generateProductionReport() {

    const month =
        getSelectedMonth();


    const farrowing =
        reportData.farrowing.filter(
            record =>
                belongsToMonth(
                    getDateValue(
                        record,
                        [
                            "farrow_date",
                            "farrowing_date",
                            "date",
                            "created_at"
                        ]
                    ),
                    month
                )
        );


    const weaning =
        reportData.weaning.filter(
            record =>
                belongsToMonth(
                    getDateValue(
                        record,
                        [
                            "weaning_date",
                            "date",
                            "created_at"
                        ]
                    ),
                    month
                )
        );


    const totalBorn =
        farrowing.reduce(
            (sum, record) =>
                sum +
                Number(
                    record.total_born ||
                    record.number_born ||
                    record.live_born ||
                    record.piglets_born ||
                    0
                ),
            0
        );


    const totalWeaned =
        weaning.reduce(
            (sum, record) =>
                sum +
                Number(
                    record.total_weaned ||
                    record.weaned ||
                    record.number_weaned ||
                    0
                ),
            0
        );


    const mortality =
        farrowing.reduce(
            (sum, record) =>
                sum +
                Number(
                    record.mortality ||
                    record.total_mortality ||
                    record.piglets_died ||
                    0
                ),
            0
        );


    setElementText(
        "productionFarrowing",
        formatNumber(
            farrowing.length
        )
    );


    setElementText(
        "totalBorn",
        formatNumber(
            totalBorn
        )
    );


    setElementText(
        "productionWeaned",
        formatNumber(
            totalWeaned
        )
    );


    setElementText(
        "productionMortality",
        formatNumber(
            mortality
        )
    );

}


// ============================================================
// HEALTH
// ============================================================

function generateHealthReport() {

    const month =
        getSelectedMonth();


    const records =
        reportData.treatment.filter(
            record =>
                belongsToMonth(
                    getDateValue(
                        record,
                        [
                            "treatment_date",
                            "date",
                            "created_at"
                        ]
                    ),
                    month
                )
        );


    const mortality =
        reportData.farrowing.reduce(
            (sum, record) => {

                if (
                    !belongsToMonth(
                        getDateValue(
                            record,
                            [
                                "farrow_date",
                                "date",
                                "created_at"
                            ]
                        ),
                        month
                    )
                ) {

                    return sum;
                }


                return sum +
                    Number(
                        record.mortality ||
                        record.total_mortality ||
                        record.piglets_died ||
                        0
                    );

            },
            0
        );


    setElementText(
        "healthTreatments",
        formatNumber(
            records.length
        )
    );


    setElementText(
        "healthEvents",
        formatNumber(
            records.length
        )
    );


    setElementText(
        "healthMortality",
        formatNumber(
            mortality
        )
    );

}


// ============================================================
// FEEDING
// ============================================================

function generateFeedingReport() {

    const month =
        getSelectedMonth();


    const records =
        reportData.feeding.filter(
            record =>
                belongsToMonth(
                    getDateValue(
                        record,
                        [
                            "feeding_date",
                            "date",
                            "created_at"
                        ]
                    ),
                    month
                )
        );


    const quantity =
        records.reduce(
            (sum, record) =>
                sum +
                Number(
                    record.quantity ||
                    record.feed_quantity ||
                    0
                ),
            0
        );


    const cost =
        records.reduce(
            (sum, record) =>
                sum +
                Number(
                    record.feed_cost ||
                    record.total_cost ||
                    record.total_amount ||
                    0
                ),
            0
        );


    setElementText(
        "feedingReportRecords",
        formatNumber(
            records.length
        )
    );


    setElementText(
        "feedingReportQuantity",
        formatNumber(
            quantity
        ) +
        " Kg"
    );


    setElementText(
        "feedingReportCost",
        "ZMW " +
        formatMoney(
            cost
        )
    );

}


// ============================================================
// MONTHLY FINANCIAL TABLE
// ============================================================

function generateMonthlyFinancialTable() {

    const body =
        document.getElementById(
            "monthlyFinancialTable"
        );


    if (!body) {
        return;
    }


    body.innerHTML = "";


    const monthly = {};


    reportData.sales.forEach(
        record => {

            const date =
                getDateValue(
                    record,
                    [
                        "sale_date",
                        "sales_date",
                        "date",
                        "created_at"
                    ]
                );


            if (!date) {
                return;
            }


            const month =
                String(date)
                    .substring(0, 7);


            if (!monthly[month]) {

                monthly[month] = {

                    sales: 0,

                    expenses: 0

                };

            }


            monthly[month].sales +=
                Number(
                    record.total_amount || 0
                );

        }
    );


    reportData.expenses.forEach(
        record => {

            const date =
                getDateValue(
                    record,
                    [
                        "expense_date",
                        "date",
                        "created_at"
                    ]
                );


            if (!date) {
                return;
            }


            const month =
                String(date)
                    .substring(0, 7);


            if (!monthly[month]) {

                monthly[month] = {

                    sales: 0,

                    expenses: 0

                };

            }


            monthly[month].expenses +=
                Number(
                    record.total_amount || 0
                );

        }
    );


    const months =
        Object.keys(monthly)
            .sort()
            .reverse();


    if (!months.length) {

        body.innerHTML = `
            <tr>
                <td colspan="4">
                    No financial records available.
                </td>
            </tr>
        `;

        return;
    }


    months.forEach(
        month => {

            const data =
                monthly[month];


            const profit =
                data.sales -
                data.expenses;


            const state =
                getFinancialState(
                    profit
                );


            const row =
                document.createElement("tr");


            row.innerHTML = `

                <td>
                    ${escapeHTML(month)}
                </td>

                <td class="sales-value">
                    ZMW ${formatMoney(data.sales)}
                </td>

                <td class="expense-value">
                    ZMW ${formatMoney(data.expenses)}
                </td>

                <td class="${state}-value">
                    ZMW ${formatMoney(profit)}
                </td>

            `;


            body.appendChild(row);

        }
    );

}


// ============================================================
// MANAGEMENT INSIGHTS
// ============================================================

function generateManagementInsights() {

    const container =
        document.getElementById(
            "managementInsights"
        );


    if (!container) {
        return;
    }


    const totals =
        getFinancialTotals();


    const insights = [];


    if (totals.sales > totals.expenses) {

        insights.push({

            title:
                "Positive Financial Result",

            text:
                "Recorded sales are currently higher than recorded expenses for the selected reporting period."

        });

    }


    else if (
        totals.sales <
        totals.expenses
    ) {

        insights.push({

            title:
                "Expenses Exceed Sales",

            text:
                "Recorded expenses are currently higher than recorded sales. Review major expense categories and selling prices."

        });

    }


    else {

        insights.push({

            title:
                "Financial Balance",

            text:
                "Recorded sales and expenses are currently at the same level."

        });

    }


    if (
        reportData.feeding.length > 0
    ) {

        insights.push({

            title:
                "Feed Records Available",

            text:
                "Feeding records are available for monitoring feed usage and feed expenditure."

        });

    }


    else {

        insights.push({

            title:
                "Feeding Records",

            text:
                "No feeding records are currently available for the selected period."

        });

    }


    if (
        reportData.gestation.length > 0
    ) {

        insights.push({

            title:
                "Breeding Monitoring",

            text:
                "Gestation records are available for monitoring breeding progress and expected farrowing."

        });

    }


    if (
        reportData.treatment.length > 0
    ) {

        insights.push({

            title:
                "Animal Health",

            text:
                "Treatment records are available. Continue maintaining health records consistently."

        });

    }


    if (
        reportData.farrowing.length > 0
    ) {

        insights.push({

            title:
                "Production Monitoring",

            text:
                "Farrowing records are available for monitoring piglet production and mortality."

        });

    }


    container.innerHTML =
        insights
            .map(
                insight => `

                    <div class="insight-card">

                        <h3>
                            ${escapeHTML(
                                insight.title
                            )}
                        </h3>

                        <p>
                            ${escapeHTML(
                                insight.text
                            )}
                        </p>

                    </div>

                `
            )
            .join("");

}


// ============================================================
// FINANCIAL CHART
// ============================================================

function createFinancialChart() {

    const canvas =
        document.getElementById(
            "financialChart"
        );


    if (
        !canvas ||
        typeof Chart === "undefined"
    ) {

        return;
    }


    if (financialChart) {

        financialChart.destroy();

    }


    const totals =
        getFinancialTotals();


    const profitColor =
        totals.profit > 0

            ? FINANCIAL_COLORS.profit

            : totals.profit < 0

                ? FINANCIAL_COLORS.loss

                : FINANCIAL_COLORS.balance;


    financialChart =
        new Chart(
            canvas.getContext("2d"),
            {

                type: "bar",

                data: {

                    labels: [

                        "Sales",

                        "Expenses",

                        totals.profit > 0
                            ? "Profit"
                            : totals.profit < 0
                                ? "Loss"
                                : "Balance"

                    ],


                    datasets: [

                        {

                            label:
                                "ZMW",


                            data: [

                                totals.sales,

                                totals.expenses,

                                Math.abs(
                                    totals.profit
                                )

                            ],


                            backgroundColor: [

                                FINANCIAL_COLORS.sales,

                                FINANCIAL_COLORS.expenses,

                                profitColor

                            ],


                            borderColor: [

                                FINANCIAL_COLORS.sales,

                                FINANCIAL_COLORS.expenses,

                                profitColor

                            ],


                            borderWidth: 1

                        }

                    ]

                },


                options: {

                    responsive: true,

                    maintainAspectRatio:
                        false,


                    plugins: {

                        legend: {

                            display:
                                false

                        },

                        tooltip: {

                            callbacks: {

                                label:
                                    function (
                                        context
                                    ) {

                                        return (
                                            " ZMW " +
                                            formatMoney(
                                                context.raw
                                            )
                                        );

                                    }

                            }

                        }

                    },


                    scales: {

                        y: {

                            beginAtZero:
                                true,

                            ticks: {

                                callback:
                                    function (
                                        value
                                    ) {

                                        return (
                                            "ZMW " +
                                            formatMoney(
                                                value
                                            )
                                        );

                                    }

                            }

                        }

                    }

                }

            }
        );

}


// ============================================================
// PIG CHART
// ============================================================

function createPigChart() {

    const canvas =
        document.getElementById(
            "pigChart"
        );


    if (
        !canvas ||
        typeof Chart === "undefined"
    ) {

        return;
    }


    if (pigChart) {

        pigChart.destroy();

    }


    const month =
        getSelectedMonth();


    const pigs =
        reportData.pigs.filter(
            pig =>
                belongsToMonth(
                    getDateValue(
                        pig,
                        [
                            "farrowDate",
                            "farrow_date",
                            "registration_date",
                            "created_at"
                        ]
                    ),
                    month
                )
        );


    const male =
        pigs.filter(
            pig =>
                String(
                    pig.sex || ""
                ).toLowerCase() ===
                "male"
        ).length;


    const female =
        pigs.filter(
            pig =>
                String(
                    pig.sex || ""
                ).toLowerCase() ===
                "female"
        ).length;


    pigChart =
        new Chart(
            canvas.getContext("2d"),
            {

                type:
                    "doughnut",


                data: {

                    labels: [
                        "Male",
                        "Female"
                    ],


                    datasets: [

                        {

                            data: [
                                male,
                                female
                            ]

                        }

                    ]

                },


                options: {

                    responsive:
                        true,

                    maintainAspectRatio:
                        false

                }

            }
        );

}


// ============================================================
// GESTATION CHART
// ============================================================

function createGestationChart() {

    const canvas =
        document.getElementById(
            "gestationChart"
        );


    if (
        !canvas ||
        typeof Chart === "undefined"
    ) {

        return;
    }


    if (gestationChart) {

        gestationChart.destroy();

    }


    const completed =
        reportData.gestation.filter(
            record => {

                const status =
                    String(
                        record.status || ""
                    ).toLowerCase();


                return (

                    status.includes("complete") ||

                    status.includes("farrow") ||

                    status.includes("deliver")

                );

            }
        ).length;


    const active =
        reportData.gestation.length -
        completed;


    gestationChart =
        new Chart(
            canvas.getContext("2d"),
            {

                type:
                    "doughnut",


                data: {

                    labels: [

                        "Completed",

                        "Active / Pending"

                    ],


                    datasets: [

                        {

                            data: [

                                completed,

                                active

                            ]

                        }

                    ]

                },


                options: {

                    responsive:
                        true,

                    maintainAspectRatio:
                        false

                }

            }
        );

}


// ============================================================
// PRODUCTION CHART
// ============================================================

function createProductionChart() {

    const canvas =
        document.getElementById(
            "productionChart"
        );


    if (
        !canvas ||
        typeof Chart === "undefined"
    ) {

        return;
    }


    if (productionChart) {

        productionChart.destroy();

    }


    const month =
        getSelectedMonth();


    const farrowing =
        reportData.farrowing.filter(
            record =>
                belongsToMonth(
                    getDateValue(
                        record,
                        [
                            "farrow_date",
                            "farrowing_date",
                            "date",
                            "created_at"
                        ]
                    ),
                    month
                )
        );


    const weaning =
        reportData.weaning.filter(
            record =>
                belongsToMonth(
                    getDateValue(
                        record,
                        [
                            "weaning_date",
                            "date",
                            "created_at"
                        ]
                    ),
                    month
                )
        );


    const born =
        farrowing.reduce(
            (sum, record) =>
                sum +
                Number(
                    record.total_born ||
                    record.number_born ||
                    record.live_born ||
                    record.piglets_born ||
                    0
                ),
            0
        );


    const weaned =
        weaning.reduce(
            (sum, record) =>
                sum +
                Number(
                    record.total_weaned ||
                    record.weaned ||
                    record.number_weaned ||
                    0
                ),
            0
        );


    const mortality =
        farrowing.reduce(
            (sum, record) =>
                sum +
                Number(
                    record.mortality ||
                    record.total_mortality ||
                    record.piglets_died ||
                    0
                ),
            0
        );


    productionChart =
        new Chart(
            canvas.getContext("2d"),
            {

                type:
                    "bar",


                data: {

                    labels: [

                        "Born",

                        "Weaned",

                        "Mortality"

                    ],


                    datasets: [

                        {

                            label:
                                "Piglets",

                            data: [

                                born,

                                weaned,

                                mortality

                            ]

                        }

                    ]

                },


                options: {

                    responsive:
                        true,

                    maintainAspectRatio:
                        false

                }

            }
        );

}


// ============================================================
// HEALTH CHART
// ============================================================

function createHealthChart() {

    const canvas =
        document.getElementById(
            "healthChart"
        );


    if (
        !canvas ||
        typeof Chart === "undefined"
    ) {

        return;
    }


    if (healthChart) {

        healthChart.destroy();

    }


    const month =
        getSelectedMonth();


    const records =
        reportData.treatment.filter(
            record =>
                belongsToMonth(
                    getDateValue(
                        record,
                        [
                            "treatment_date",
                            "date",
                            "created_at"
                        ]
                    ),
                    month
                )
        );


    const categories = {};


    records.forEach(
        record => {

            const disease =
                record.symptom ||
                record.disease ||
                record.possible_cause ||
                record.condition ||
                "General Treatment";


            categories[disease] =
                (
                    categories[disease] ||
                    0
                ) + 1;

        }
    );


    healthChart =
        new Chart(
            canvas.getContext("2d"),
            {

                type:
                    "bar",


                data: {

                    labels:
                        Object.keys(
                            categories
                        ),


                    datasets: [

                        {

                            label:
                                "Treatment Events",


                            data:
                                Object.values(
                                    categories
                                )

                        }

                    ]

                },


                options: {

                    responsive:
                        true,

                    maintainAspectRatio:
                        false

                }

            }
        );

}


// ============================================================
// FEEDING CHART
// ============================================================

function createFeedingChart() {

    const canvas =
        document.getElementById(
            "feedingChart"
        );


    if (
        !canvas ||
        typeof Chart === "undefined"
    ) {

        return;
    }


    if (feedingChart) {

        feedingChart.destroy();

    }


    const month =
        getSelectedMonth();


    const records =
        reportData.feeding.filter(
            record =>
                belongsToMonth(
                    getDateValue(
                        record,
                        [
                            "feeding_date",
                            "date",
                            "created_at"
                        ]
                    ),
                    month
                )
        );


    const types = {};


    records.forEach(
        record => {

            const type =
                record.feed_type ||
                record.feed_name ||
                record.feedType ||
                "Feed";


            const quantity =
                Number(
                    record.quantity ||
                    record.feed_quantity ||
                    0
                );


            types[type] =
                (
                    types[type] ||
                    0
                ) + quantity;

        }
    );


    feedingChart =
        new Chart(
            canvas.getContext("2d"),
            {

                type:
                    "bar",


                data: {

                    labels:
                        Object.keys(types),


                    datasets: [

                        {

                            label:
                                "Feed Used (Kg)",


                            data:
                                Object.values(types)

                        }

                    ]

                },


                options: {

                    responsive:
                        true,

                    maintainAspectRatio:
                        false

                }

            }
        );

}


// ============================================================
// CLEAR FILTER
// ============================================================

function clearReportFilter() {

    const input =
        document.getElementById(
            "reportMonth"
        );


    if (input) {

        input.value = "";

    }


    generateReports();

}


// ============================================================
// PRINT
// ============================================================

function printReports() {

    window.print();

}


// ============================================================
// PDF DOWNLOAD
// ============================================================

function downloadReportsPDF() {

    if (!checkUserAccess()) {

        return;

    }


    if (
        !window.jspdf ||
        !window.jspdf.jsPDF
    ) {

        alert(
            "PDF library is not available. Please check your internet connection."
        );

        return;
    }


    const {
        jsPDF
    } = window.jspdf;


    const doc =
        new jsPDF(
            "landscape",
            "mm",
            "a4"
        );


    const farmID =
        getFarmID();


    const month =
        getSelectedMonth();


    const totals =
        getFinancialTotals();


    const pigs =
        reportData.pigs;


    const farrowing =
        reportData.farrowing;


    const weaning =
        reportData.weaning;


    const treatment =
        reportData.treatment;


    const feeding =
        reportData.feeding;


    const totalBorn =
        farrowing.reduce(
            (sum, record) =>
                sum +
                Number(
                    record.total_born ||
                    record.number_born ||
                    record.live_born ||
                    record.piglets_born ||
                    0
                ),
            0
        );


    const totalWeaned =
        weaning.reduce(
            (sum, record) =>
                sum +
                Number(
                    record.total_weaned ||
                    record.weaned ||
                    record.number_weaned ||
                    0
                ),
            0
        );


    const totalFeed =
        feeding.reduce(
            (sum, record) =>
                sum +
                Number(
                    record.quantity ||
                    record.feed_quantity ||
                    0
                ),
            0
        );


    const mortality =
        farrowing.reduce(
            (sum, record) =>
                sum +
                Number(
                    record.mortality ||
                    record.total_mortality ||
                    record.piglets_died ||
                    0
                ),
            0
        );


    let y = 18;


    doc.setFontSize(20);


    doc.text(
        "MUNKA PIGGERY FARM",
        148,
        y,
        {
            align:
                "center"
        }
    );


    y += 8;


    doc.setFontSize(12);


    doc.text(
        "Reports & Analytics",
        148,
        y,
        {
            align:
                "center"
        }
    );


    y += 8;


    doc.setFontSize(9);


    doc.text(
        "Farm ID: " +
        farmID,
        14,
        y
    );


    doc.text(
        "Report Period: " +
        (
            month ||
            "All Records"
        ),
        14,
        y + 5
    );


    doc.text(
        "Generated: " +
        new Date().toLocaleString(),
        14,
        y + 10
    );


    y += 18;


    doc.autoTable({

        startY:
            y,


        head: [[

            "Metric",

            "Value"

        ]],


        body: [

            [

                "Total Pigs",

                pigs.length

            ],

            [

                "Total Sales",

                "ZMW " +
                formatMoney(
                    totals.sales
                )

            ],

            [

                "Total Expenses",

                "ZMW " +
                formatMoney(
                    totals.expenses
                )

            ],

            [

                totals.profit > 0
                    ? "Net Profit"
                    : totals.profit < 0
                        ? "Net Loss"
                        : "Financial Balance",

                "ZMW " +
                formatMoney(
                    Math.abs(
                        totals.profit
                    )
                )

            ],

            [

                "Farrowing Records",

                farrowing.length

            ],

            [

                "Piglets Born",

                totalBorn

            ],

            [

                "Piglets Weaned",

                totalWeaned

            ],

            [

                "Mortality",

                mortality

            ],

            [

                "Treatment Records",

                treatment.length

            ],

            [

                "Feed Used",

                formatNumber(
                    totalFeed
                ) +
                " Kg"

            ]

        ],


        styles: {

            fontSize:
                9

        },


        headStyles: {

            fontStyle:
                "bold"

        }

    });


    let finalY =
        doc.lastAutoTable.finalY +
        10;


    doc.setFontSize(13);


    doc.text(
        "Monthly Financial Summary",
        14,
        finalY
    );


    finalY += 5;


    const monthly = {};


    reportData.sales.forEach(
        record => {

            const date =
                getDateValue(
                    record,
                    [
                        "sale_date",
                        "sales_date",
                        "date",
                        "created_at"
                    ]
                );


            if (!date) {

                return;

            }


            const key =
                String(date)
                    .substring(0, 7);


            if (!monthly[key]) {

                monthly[key] = {

                    sales:
                        0,

                    expenses:
                        0

                };

            }


            monthly[key].sales +=
                Number(
                    record.total_amount ||
                    0
                );

        }
    );


    reportData.expenses.forEach(
        record => {

            const date =
                getDateValue(
                    record,
                    [
                        "expense_date",
                        "date",
                        "created_at"
                    ]
                );


            if (!date) {

                return;

            }


            const key =
                String(date)
                    .substring(0, 7);


            if (!monthly[key]) {

                monthly[key] = {

                    sales:
                        0,

                    expenses:
                        0

                };

            }


            monthly[key].expenses +=
                Number(
                    record.total_amount ||
                    0
                );

        }
    );


    const rows =
        Object.keys(monthly)
            .sort()
            .reverse()
            .map(
                monthKey => {

                    const sales =
                        monthly[
                            monthKey
                        ].sales;


                    const expenses =
                        monthly[
                            monthKey
                        ].expenses;


                    const profit =
                        sales -
                        expenses;


                    return [

                        monthKey,

                        "ZMW " +
                        formatMoney(
                            sales
                        ),

                        "ZMW " +
                        formatMoney(
                            expenses
                        ),

                        "ZMW " +
                        formatMoney(
                            profit
                        )

                    ];

                }
            );


    if (rows.length) {

        doc.autoTable({

            startY:
                finalY,


            head: [[

                "Month",

                "Sales",

                "Expenses",

                "Profit / Loss"

            ]],


            body:
                rows,


            styles: {

                fontSize:
                    8

            }

        });

    }


    const pageCount =
        doc.internal.getNumberOfPages();


    for (
        let page = 1;
        page <= pageCount;
        page++
    ) {

        doc.setPage(page);


        doc.setFontSize(8);


        doc.text(
            "MUNKA PIGGERY Management System",
            14,
            200
        );


        doc.text(
            "Page " +
            page +
            " of " +
            pageCount,
            270,
            200,
            {
                align:
                    "right"
            }
        );

    }


    const date =
        new Date()
            .toISOString()
            .substring(0, 10);


    doc.save(
        "MUNKA_PIGGERY_Full_Report_" +
        date +
        ".pdf"
    );

}


// ============================================================
// FULL REPORT
// ============================================================

function generateFullReport() {

    generateReports();


    alert(
        "Full farm report has been generated successfully.\n\n" +
        "Use 'Download PDF' to save a PDF copy."
    );

}


// ============================================================
// INITIALIZATION
// ============================================================

document.addEventListener(
    "DOMContentLoaded",
    function () {

        if (!checkUserAccess()) {

            return;

        }


        const monthInput =
            document.getElementById(
                "reportMonth"
            );


        if (monthInput) {

            monthInput.addEventListener(
                "change",
                function () {

                    generateReports();

                }
            );

        }


        loadReportData();

    }
);