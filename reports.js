// ==========================================================
// MUNKA PIGGERY FARM LIMITED
// REPORTS & ANALYTICS MODULE
// reports.js
// MATCHED TO CURRENT reports.html
// ==========================================================


// ==========================================================
// GLOBAL CHART VARIABLES
// ==========================================================

let financialChart = null;
let pigChart = null;
let gestationChart = null;
let productionChart = null;
let healthChart = null;
let feedingChart = null;


// ==========================================================
// GLOBAL REPORT DATA
// ==========================================================

let reportData = {

    pigs: [],
    gestation: [],
    farrowing: [],
    weaning: [],
    treatments: [],
    feeding: [],
    sales: [],
    expenses: []

};


// ==========================================================
// FORMAT MONEY
// ==========================================================

function formatMoney(amount) {

    return "ZMW " +
        Number(amount || 0).toLocaleString(
            "en-ZM",
            {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2
            }
        );

}


// ==========================================================
// FORMAT NUMBER
// ==========================================================

function formatNumber(number) {

    return Number(number || 0).toLocaleString("en-ZM");

}


// ==========================================================
// GET SELECTED MONTH
// ==========================================================

function getSelectedMonth() {

    const input =
        document.getElementById("reportMonth");

    if (!input || !input.value) {

        return null;

    }

    return input.value;

}


// ==========================================================
// CHECK DATE AGAINST SELECTED MONTH
// ==========================================================

function belongsToMonth(dateValue, selectedMonth) {

    if (!selectedMonth) {

        return true;

    }

    if (!dateValue) {

        return false;

    }

    return String(dateValue).substring(0, 7)
        === selectedMonth;

}


// ==========================================================
// FILTER RECORDS BY MONTH
// ==========================================================

function filterByMonth(records, dateField) {

    const selectedMonth =
        getSelectedMonth();

    if (!selectedMonth) {

        return records || [];

    }

    return (records || []).filter(function(record) {

        return belongsToMonth(
            record[dateField],
            selectedMonth
        );

    });

}


// ==========================================================
// LOAD ALL REPORT DATA
// ==========================================================

async function loadReportData() {

    try {

        const results = await Promise.all([

            // 0
            supabaseClient
                .from("pigs")
                .select("*"),

            // 1
            supabaseClient
                .from("gestation_records")
                .select("*"),

            // 2
            supabaseClient
                .from("farrowing_records")
                .select("*"),

            // 3
            supabaseClient
                .from("weaning_records")
                .select("*"),

            // 4
            supabaseClient
                .from("treatment_records")
                .select("*"),

            // 5
            supabaseClient
                .from("feeding_records")
                .select("*"),

            // 6
            supabaseClient
                .from("sales_records")
                .select("*"),

            // 7
            supabaseClient
                .from("expenses_records")
                .select("*")

        ]);


        const tableNames = [

            "pigs",
            "gestation_records",
            "farrowing_records",
            "weaning_records",
            "treatment_records",
            "feeding_records",
            "sales_records",
            "expenses_records"

        ];


        // --------------------------------------------------
        // CHECK DATABASE ERRORS
        // --------------------------------------------------

        for (let i = 0; i < results.length; i++) {

            if (results[i].error) {

                console.error(
                    "Error loading " +
                    tableNames[i] +
                    ":",
                    results[i].error
                );

                throw results[i].error;

            }

        }


        // --------------------------------------------------
        // IMPORTANT:
        // CORRECT RESULT INDEXES
        // --------------------------------------------------

        reportData.pigs =
            results[0].data || [];

        reportData.gestation =
            results[1].data || [];

        reportData.farrowing =
            results[2].data || [];

        reportData.weaning =
            results[3].data || [];

        reportData.treatments =
            results[4].data || [];

        reportData.feeding =
            results[5].data || [];

        reportData.sales =
            results[6].data || [];

        reportData.expenses =
            results[7].data || [];


        console.log(
            "REPORT DATA LOADED:",
            reportData
        );


        return true;


    } catch (error) {

        console.error(
            "REPORT DATA ERROR:",
            error
        );

        alert(
            "Unable to load Reports & Analytics data.\n\n" +
            (error.message || error)
        );

        return false;

    }

}


// ==========================================================
// LOAD REPORTS
// ==========================================================

async function loadReports() {

    const success =
        await loadReportData();


    if (!success) {

        return;

    }


    calculateDashboardSummary();

    calculateFinancialReport();

    calculatePigReport();

    calculateGestationReport();

    calculateProductionReport();

    calculateHealthReport();

    calculateFeedingReport();

    generateMonthlyFinancialTable();

    createFinancialChart();

    createPigChart();

    createGestationChart();

    createProductionChart();

    createHealthChart();

    createFeedingChart();

}


// ==========================================================
// DASHBOARD SUMMARY
// ==========================================================

function calculateDashboardSummary() {

    // ------------------------------------------------------
    // PIGS
    // ------------------------------------------------------

    const pigs =
        filterByMonth(
            reportData.pigs,
            "created_at"
        );


    // ------------------------------------------------------
    // SALES
    // ------------------------------------------------------

    const sales =
        filterByMonth(
            reportData.sales,
            "sale_date"
        );


    let totalSales = 0;


    sales.forEach(function(record) {

        totalSales +=
            Number(
                record.total_amount || 0
            );

    });


    // ------------------------------------------------------
    // EXPENSES
    // ------------------------------------------------------

    const expenses =
        filterByMonth(
            reportData.expenses,
            "expense_date"
        );


    let totalExpenses = 0;


    expenses.forEach(function(record) {

        totalExpenses +=
            Number(
                record.total_amount || 0
            );

    });


    // ------------------------------------------------------
    // PROFIT
    // ------------------------------------------------------

    const profit =
        totalSales - totalExpenses;


    // ------------------------------------------------------
    // WEANING
    // ------------------------------------------------------

    const weaning =
        filterByMonth(
            reportData.weaning,
            "weaning_date"
        );


    let totalWeaned = 0;


    weaning.forEach(function(record) {

        totalWeaned +=
            Number(
                record.total_weaned || 0
            );

    });


    // ------------------------------------------------------
    // TREATMENTS
    // ------------------------------------------------------

    const treatments =
        filterByMonth(
            reportData.treatments,
            "treatment_date"
        );


    // ------------------------------------------------------
    // FEEDING
    // ------------------------------------------------------

    const feeding =
        filterByMonth(
            reportData.feeding,
            "feeding_date"
        );


    // ------------------------------------------------------
    // FARROWING
    // ------------------------------------------------------

    const farrowing =
        filterByMonth(
            reportData.farrowing,
            "farrow_date"
        );


    // ------------------------------------------------------
    // DISPLAY
    // ------------------------------------------------------

    setText(
        "totalPigs",
        formatNumber(pigs.length)
    );


    setText(
        "totalSales",
        formatMoney(totalSales)
    );


    setText(
        "totalExpenses",
        formatMoney(totalExpenses)
    );


    setText(
        "profitLoss",
        formatMoney(profit)
    );


    setText(
        "totalWeaned",
        formatNumber(totalWeaned)
    );


    setText(
        "totalTreatments",
        formatNumber(treatments.length)
    );


    setText(
        "totalFeeding",
        formatNumber(feeding.length)
    );


    setText(
        "totalFarrowing",
        formatNumber(farrowing.length)
    );

}


// ==========================================================
// SAFE TEXT DISPLAY
// ==========================================================

function setText(id, value) {

    const element =
        document.getElementById(id);

    if (element) {

        element.textContent = value;

    }

}


// ==========================================================
// FINANCIAL REPORT
// ==========================================================

function calculateFinancialReport() {

    const sales =
        filterByMonth(
            reportData.sales,
            "sale_date"
        );


    const expenses =
        filterByMonth(
            reportData.expenses,
            "expense_date"
        );


    let totalSales = 0;

    let totalExpenses = 0;


    sales.forEach(function(record) {

        totalSales +=
            Number(
                record.total_amount || 0
            );

    });


    expenses.forEach(function(record) {

        totalExpenses +=
            Number(
                record.total_amount || 0
            );

    });


    const profit =
        totalSales - totalExpenses;


    setText(
        "financialSales",
        formatMoney(totalSales)
    );


    setText(
        "financialExpenses",
        formatMoney(totalExpenses)
    );


    setText(
        "financialProfit",
        formatMoney(profit)
    );

}


// ==========================================================
// PIG REPORT
// ==========================================================

function calculatePigReport() {

    const pigs =
        filterByMonth(
            reportData.pigs,
            "created_at"
        );


    let male = 0;

    let female = 0;


    pigs.forEach(function(pig) {

        const sex =
            String(
                pig.sex || ""
            ).trim().toLowerCase();


        if (
            sex === "male" ||
            sex === "m"
        ) {

            male++;

        }


        if (
            sex === "female" ||
            sex === "f"
        ) {

            female++;

        }

    });


    setText(
        "pigReportTotal",
        formatNumber(pigs.length)
    );


    setText(
        "malePigs",
        formatNumber(male)
    );


    setText(
        "femalePigs",
        formatNumber(female)
    );

}


// ==========================================================
// GESTATION REPORT
// ==========================================================

function calculateGestationReport() {

    const allGestation =
        reportData.gestation || [];


    const monthlyGestation =
        filterByMonth(
            allGestation,
            getGestationDateField()
        );


    let active = 0;

    let completed = 0;


    allGestation.forEach(function(record) {

        const status =
            String(
                record.status ||
                record.gestation_status ||
                ""
            ).trim().toLowerCase();


        if (
            status === "active" ||
            status === "ongoing" ||
            status === "in progress" ||
            status === "pending"
        ) {

            active++;

        }
        else if (
            status === "completed" ||
            status === "complete" ||
            status === "finished"
        ) {

            completed++;

        }

    });


    setText(
        "gestationCount",
        formatNumber(allGestation.length)
    );


    setText(
        "gestationMonthCount",
        formatNumber(monthlyGestation.length)
    );


    setText(
        "activeGestations",
        formatNumber(active)
    );


    setText(
        "completedGestations",
        formatNumber(completed)
    );

}


// ==========================================================
// FIND GESTATION DATE FIELD
// ==========================================================

function getGestationDateField() {

    const records =
        reportData.gestation || [];


    if (!records.length) {

        return "created_at";

    }


    const first =
        records[0];


    const possibleFields = [

        "service_date",
        "mating_date",
        "breeding_date",
        "gestation_date",
        "date",
        "created_at"

    ];


    for (let i = 0; i < possibleFields.length; i++) {

        if (
            Object.prototype.hasOwnProperty.call(
                first,
                possibleFields[i]
            )
        ) {

            return possibleFields[i];

        }

    }


    return "created_at";

}


// ==========================================================
// PRODUCTION REPORT
// ==========================================================

function calculateProductionReport() {

    const farrowing =
        filterByMonth(
            reportData.farrowing,
            "farrow_date"
        );


    const weaning =
        filterByMonth(
            reportData.weaning,
            "weaning_date"
        );


    let totalBorn = 0;

    let totalWeaned = 0;

    let totalMortality = 0;


    // ------------------------------------------------------
    // FARROWING = BORN
    // ------------------------------------------------------

    farrowing.forEach(function(record) {

        totalBorn +=
            Number(
                record.total_born || 0
            );

    });


    // ------------------------------------------------------
    // WEANING = WEANED + MORTALITY
    // ------------------------------------------------------

    weaning.forEach(function(record) {

        totalWeaned +=
            Number(
                record.total_weaned || 0
            );


        totalMortality +=
            Number(
                record.mortality || 0
            );

    });


    setText(
        "productionFarrowing",
        formatNumber(farrowing.length)
    );


    setText(
        "totalBorn",
        formatNumber(totalBorn)
    );


    setText(
        "productionWeaned",
        formatNumber(totalWeaned)
    );


    setText(
        "productionMortality",
        formatNumber(totalMortality)
    );

}


// ==========================================================
// HEALTH REPORT
// ==========================================================

function calculateHealthReport() {

    const treatments =
        filterByMonth(
            reportData.treatments,
            "treatment_date"
        );


    const weaning =
        filterByMonth(
            reportData.weaning,
            "weaning_date"
        );


    let mortality = 0;


    weaning.forEach(function(record) {

        mortality +=
            Number(
                record.mortality || 0
            );

    });


    setText(
        "healthTreatments",
        formatNumber(treatments.length)
    );


    setText(
        "healthEvents",
        formatNumber(treatments.length)
    );


    setText(
        "healthMortality",
        formatNumber(mortality)
    );

}


// ==========================================================
// FEEDING REPORT
// ==========================================================

function calculateFeedingReport() {

    const feeding =
        filterByMonth(
            reportData.feeding,
            "feeding_date"
        );


    let totalQuantity = 0;

    let totalCost = 0;


    feeding.forEach(function(record) {

        totalQuantity +=
            Number(
                record.quantity ||
                record.feed_quantity ||
                0
            );


        totalCost +=
            Number(
                record.feed_cost || 0
            );

    });


    setText(
        "feedingReportRecords",
        formatNumber(feeding.length)
    );


    setText(
        "feedingReportQuantity",
        totalQuantity.toFixed(2) + " Kg"
    );


    setText(
        "feedingReportCost",
        formatMoney(totalCost)
    );

}


// ==========================================================
// MONTHLY FINANCIAL TABLE
// ==========================================================

function generateMonthlyFinancialTable() {

    const table =
        document.getElementById(
            "monthlyFinancialTable"
        );


    if (!table) {

        return;

    }


    table.innerHTML = "";


    const monthlyData = {};


    // ------------------------------------------------------
    // SALES
    // ------------------------------------------------------

    reportData.sales.forEach(function(sale) {

        if (!sale.sale_date) {

            return;

        }


        const month =
            String(
                sale.sale_date
            ).substring(0, 7);


        if (!monthlyData[month]) {

            monthlyData[month] = {

                sales: 0,
                expenses: 0

            };

        }


        monthlyData[month].sales +=
            Number(
                sale.total_amount || 0
            );

    });


    // ------------------------------------------------------
    // EXPENSES
    // ------------------------------------------------------

    reportData.expenses.forEach(function(expense) {

        if (!expense.expense_date) {

            return;

        }


        const month =
            String(
                expense.expense_date
            ).substring(0, 7);


        if (!monthlyData[month]) {

            monthlyData[month] = {

                sales: 0,
                expenses: 0

            };

        }


        monthlyData[month].expenses +=
            Number(
                expense.total_amount || 0
            );

    });


    const months =
        Object.keys(monthlyData)
            .sort()
            .reverse();


    if (!months.length) {

        table.innerHTML = `

            <tr>

                <td colspan="4">
                    No financial records available.
                </td>

            </tr>

        `;

        return;

    }


    months.forEach(function(month) {

        const sales =
            monthlyData[month].sales;


        const expenses =
            monthlyData[month].expenses;


        const profit =
            sales - expenses;


        table.innerHTML += `

            <tr>

                <td>
                    ${formatMonth(month)}
                </td>

                <td>
                    ${formatMoney(sales)}
                </td>

                <td>
                    ${formatMoney(expenses)}
                </td>

                <td>
                    ${formatMoney(profit)}
                </td>

            </tr>

        `;

    });

}


// ==========================================================
// FORMAT MONTH
// ==========================================================

function formatMonth(month) {

    if (!month) {

        return "";

    }


    const date =
        new Date(
            month + "-01T00:00:00"
        );


    return date.toLocaleDateString(
        "en-US",
        {
            month: "long",
            year: "numeric"
        }
    );

}


// ==========================================================
// FINANCIAL CHART
// ==========================================================

function createFinancialChart() {

    const canvas =
        document.getElementById(
            "financialChart"
        );


    if (!canvas) {

        return;

    }


    if (financialChart) {

        financialChart.destroy();

        financialChart = null;

    }


    const ctx =
        canvas.getContext("2d");


    const monthlyData = {};


    reportData.sales.forEach(function(sale) {

        if (!sale.sale_date) {

            return;

        }


        const month =
            String(
                sale.sale_date
            ).substring(0, 7);


        if (!monthlyData[month]) {

            monthlyData[month] = {

                sales: 0,
                expenses: 0

            };

        }


        monthlyData[month].sales +=
            Number(
                sale.total_amount || 0
            );

    });


    reportData.expenses.forEach(function(expense) {

        if (!expense.expense_date) {

            return;

        }


        const month =
            String(
                expense.expense_date
            ).substring(0, 7);


        if (!monthlyData[month]) {

            monthlyData[month] = {

                sales: 0,
                expenses: 0

            };

        }


        monthlyData[month].expenses +=
            Number(
                expense.total_amount || 0
            );

    });


    const months =
        Object.keys(monthlyData).sort();


    financialChart =
        new Chart(
            ctx,
            {

                type: "bar",

                data: {

                    labels:
                        months.map(formatMonth),

                    datasets: [

                        {

                            label: "Sales",

                            data:
                                months.map(
                                    function(month) {

                                        return monthlyData[
                                            month
                                        ].sales;

                                    }
                                )

                        },

                        {

                            label: "Expenses",

                            data:
                                months.map(
                                    function(month) {

                                        return monthlyData[
                                            month
                                        ].expenses;

                                    }
                                )

                        }

                    ]

                },

                options: {

                    responsive: true,

                    maintainAspectRatio: false,

                    scales: {

                        y: {

                            beginAtZero: true

                        }

                    }

                }

            }

        );

}


// ==========================================================
// PIG CHART
// ==========================================================

function createPigChart() {

    const canvas =
        document.getElementById(
            "pigChart"
        );


    if (!canvas) {

        return;

    }


    if (pigChart) {

        pigChart.destroy();

        pigChart = null;

    }


    const pigs =
        filterByMonth(
            reportData.pigs,
            "created_at"
        );


    let male = 0;

    let female = 0;

    let other = 0;


    pigs.forEach(function(pig) {

        const sex =
            String(
                pig.sex || ""
            ).trim().toLowerCase();


        if (
            sex === "male" ||
            sex === "m"
        ) {

            male++;

        }
        else if (
            sex === "female" ||
            sex === "f"
        ) {

            female++;

        }
        else {

            other++;

        }

    });


    const labels = [
        "Male",
        "Female"
    ];


    const values = [
        male,
        female
    ];


    if (other > 0) {

        labels.push("Other");

        values.push(other);

    }


    pigChart =
        new Chart(
            canvas.getContext("2d"),
            {

                type: "doughnut",

                data: {

                    labels: labels,

                    datasets: [

                        {

                            label:
                                "Pig Population",

                            data: values

                        }

                    ]

                },

                options: {

                    responsive: true,

                    maintainAspectRatio: false

                }

            }

        );

}


// ==========================================================
// GESTATION CHART
// ==========================================================

function createGestationChart() {

    const canvas =
        document.getElementById(
            "gestationChart"
        );


    if (!canvas) {

        return;

    }


    if (gestationChart) {

        gestationChart.destroy();

        gestationChart = null;

    }


    const records =
        filterByMonth(
            reportData.gestation,
            getGestationDateField()
        );


    const statusCounts = {

        Active: 0,

        Completed: 0,

        Other: 0

    };


    records.forEach(function(record) {

        const status =
            String(
                record.status ||
                record.gestation_status ||
                ""
            ).trim().toLowerCase();


        if (
            status === "active" ||
            status === "ongoing" ||
            status === "in progress" ||
            status === "pending"
        ) {

            statusCounts.Active++;

        }
        else if (
            status === "completed" ||
            status === "complete" ||
            status === "finished"
        ) {

            statusCounts.Completed++;

        }
        else {

            statusCounts.Other++;

        }

    });


    gestationChart =
        new Chart(
            canvas.getContext("2d"),
            {

                type: "bar",

                data: {

                    labels: [

                        "Active",
                        "Completed",
                        "Other"

                    ],

                    datasets: [

                        {

                            label:
                                "Gestation Records",

                            data: [

                                statusCounts.Active,
                                statusCounts.Completed,
                                statusCounts.Other

                            ]

                        }

                    ]

                },

                options: {

                    responsive: true,

                    maintainAspectRatio: false,

                    scales: {

                        y: {

                            beginAtZero: true,

                            ticks: {

                                stepSize: 1

                            }

                        }

                    }

                }

            }

        );

}


// ==========================================================
// PRODUCTION CHART
// ==========================================================

function createProductionChart() {

    const canvas =
        document.getElementById(
            "productionChart"
        );


    if (!canvas) {

        return;

    }


    if (productionChart) {

        productionChart.destroy();

        productionChart = null;

    }


    const farrowing =
        filterByMonth(
            reportData.farrowing,
            "farrow_date"
        );


    const weaning =
        filterByMonth(
            reportData.weaning,
            "weaning_date"
        );


    let born = 0;

    let weaned = 0;

    let mortality = 0;


    farrowing.forEach(function(record) {

        born +=
            Number(
                record.total_born || 0
            );

    });


    weaning.forEach(function(record) {

        weaned +=
            Number(
                record.total_weaned || 0
            );


        mortality +=
            Number(
                record.mortality || 0
            );

    });


    productionChart =
        new Chart(
            canvas.getContext("2d"),
            {

                type: "bar",

                data: {

                    labels: [

                        "Born",
                        "Weaned",
                        "Mortality"

                    ],

                    datasets: [

                        {

                            label:
                                "Production",

                            data: [

                                born,
                                weaned,
                                mortality

                            ]

                        }

                    ]

                },

                options: {

                    responsive: true,

                    maintainAspectRatio: false,

                    scales: {

                        y: {

                            beginAtZero: true

                        }

                    }

                }

            }

        );

}


// ==========================================================
// HEALTH CHART
// ==========================================================

function createHealthChart() {

    const canvas =
        document.getElementById(
            "healthChart"
        );


    if (!canvas) {

        return;

    }


    if (healthChart) {

        healthChart.destroy();

        healthChart = null;

    }


    const treatments =
        filterByMonth(
            reportData.treatments,
            "treatment_date"
        );


    const symptomCounts = {};


    treatments.forEach(function(record) {

        const symptom =
            String(
                record.symptom ||
                record.possible_cause ||
                "Unknown"
            );


        if (!symptomCounts[symptom]) {

            symptomCounts[symptom] = 0;

        }


        symptomCounts[symptom]++;

    });


    const labels =
        Object.keys(symptomCounts);


    const values =
        labels.map(function(symptom) {

            return symptomCounts[symptom];

        });


    healthChart =
        new Chart(
            canvas.getContext("2d"),
            {

                type: "bar",

                data: {

                    labels: labels,

                    datasets: [

                        {

                            label:
                                "Treatment Records",

                            data: values

                        }

                    ]

                },

                options: {

                    responsive: true,

                    maintainAspectRatio: false,

                    scales: {

                        y: {

                            beginAtZero: true,

                            ticks: {

                                stepSize: 1

                            }

                        }

                    }

                }

            }

        );

}


// ==========================================================
// FEEDING CHART
// ==========================================================

function createFeedingChart() {

    const canvas =
        document.getElementById(
            "feedingChart"
        );


    if (!canvas) {

        return;

    }


    if (feedingChart) {

        feedingChart.destroy();

        feedingChart = null;

    }


    const feeding =
        filterByMonth(
            reportData.feeding,
            "feeding_date"
        );


    const feedTypes = {};


    feeding.forEach(function(record) {

        const type =
            String(
                record.feed_type ||
                "Unknown"
            );


        if (!feedTypes[type]) {

            feedTypes[type] = 0;

        }


        feedTypes[type] +=
            Number(
                record.quantity ||
                record.feed_quantity ||
                0
            );

    });


    const labels =
        Object.keys(feedTypes);


    const values =
        labels.map(function(type) {

            return feedTypes[type];

        });


    feedingChart =
        new Chart(
            canvas.getContext("2d"),
            {

                type: "bar",

                data: {

                    labels: labels,

                    datasets: [

                        {

                            label:
                                "Feed Used (Kg)",

                            data: values

                        }

                    ]

                },

                options: {

                    responsive: true,

                    maintainAspectRatio: false,

                    scales: {

                        y: {

                            beginAtZero: true

                        }

                    }

                }

            }

        );

}


// ==========================================================
// CLEAR REPORT FILTER
// ==========================================================

function clearReportFilter() {

    const input =
        document.getElementById(
            "reportMonth"
        );


    if (input) {

        input.value = "";

    }


    loadReports();

}


// ==========================================================
// GENERATE FULL REPORT
// ==========================================================

async function generateFullReport() {

    const success =
        await loadReportData();


    if (!success) {

        return;

    }


    const sales =
        reportData.sales;


    const expenses =
        reportData.expenses;


    const weaning =
        reportData.weaning;


    const treatments =
        reportData.treatments;


    const feeding =
        reportData.feeding;


    let totalSales = 0;

    let totalExpenses = 0;

    let totalWeaned = 0;

    let totalFeed = 0;

    let mortality = 0;


    sales.forEach(function(record) {

        totalSales +=
            Number(
                record.total_amount || 0
            );

    });


    expenses.forEach(function(record) {

        totalExpenses +=
            Number(
                record.total_amount || 0
            );

    });


    weaning.forEach(function(record) {

        totalWeaned +=
            Number(
                record.total_weaned || 0
            );


        mortality +=
            Number(
                record.mortality || 0
            );

    });


    feeding.forEach(function(record) {

        totalFeed +=
            Number(
                record.quantity ||
                record.feed_quantity ||
                0
            );

    });


    const profit =
        totalSales - totalExpenses;


    const reportWindow =
        window.open(
            "",
            "_blank"
        );


    if (!reportWindow) {

        alert(
            "Please allow pop-ups to generate the full report."
        );

        return;

    }


    reportWindow.document.write(`

        <!DOCTYPE html>

        <html>

        <head>

            <title>
                MUNKA PIGGERY FARM - Full Report
            </title>

            <style>

                body{

                    font-family:Arial,sans-serif;

                    padding:40px;

                    line-height:1.6;

                }

                h1{

                    text-align:center;

                }

                h2{

                    border-bottom:1px solid #333;

                    padding-bottom:5px;

                }

                .summary{

                    display:grid;

                    grid-template-columns:
                    repeat(2,1fr);

                    gap:15px;

                }

                .box{

                    border:1px solid #ccc;

                    padding:15px;

                }

                @media print{

                    button{

                        display:none;

                    }

                }

            </style>

        </head>


        <body>


            <h1>
                MUNKA PIGGERY FARM
            </h1>


            <h2>
                FULL FARM REPORT
            </h2>


            <p>
                Generated:
                ${new Date().toLocaleString()}
            </p>


            <div class="summary">


                <div class="box">

                    <strong>
                        Total Pigs
                    </strong>

                    <br>

                    ${reportData.pigs.length}

                </div>


                <div class="box">

                    <strong>
                        Total Sales
                    </strong>

                    <br>

                    ${formatMoney(totalSales)}

                </div>


                <div class="box">

                    <strong>
                        Total Expenses
                    </strong>

                    <br>

                    ${formatMoney(totalExpenses)}

                </div>


                <div class="box">

                    <strong>
                        Profit / Loss
                    </strong>

                    <br>

                    ${formatMoney(profit)}

                </div>


                <div class="box">

                    <strong>
                        Piglets Weaned
                    </strong>

                    <br>

                    ${formatNumber(totalWeaned)}

                </div>


                <div class="box">

                    <strong>
                        Treatment Records
                    </strong>

                    <br>

                    ${treatments.length}

                </div>


                <div class="box">

                    <strong>
                        Feed Used
                    </strong>

                    <br>

                    ${totalFeed.toFixed(2)} Kg

                </div>


                <div class="box">

                    <strong>
                        Mortality
                    </strong>

                    <br>

                    ${formatNumber(mortality)}

                </div>


            </div>


            <br>


            <button onclick="window.print()">
                Print Report
            </button>


        </body>

        </html>

    `);


    reportWindow.document.close();

}


// ==========================================================
// PRINT REPORTS
// ==========================================================

function printReports() {

    window.print();

}


// ==========================================================
// PAGE INITIALIZATION
// ==========================================================

document.addEventListener(
    "DOMContentLoaded",
    function() {

        loadReports();

    }
);


// ==========================================================
// MONTH CHANGE
// ==========================================================

document.addEventListener(
    "DOMContentLoaded",
    function() {

        const month =
            document.getElementById(
                "reportMonth"
            );


        if (month) {

            month.addEventListener(
                "change",
                function() {

                    loadReports();

                }
            );

        }

    }
);