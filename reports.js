// ============================================================
// MUNKA PIGGERY MANAGEMENT SYSTEM
// REPORTS & ANALYTICS - FARM SECURED VERSION
// ============================================================

// ------------------------------------------------------------
// CHART VARIABLES
// ------------------------------------------------------------
let financialChart = null;
let pigChart = null;
let gestationChart = null;
let productionChart = null;
let healthChart = null;
let feedingChart = null;

// ------------------------------------------------------------
// REPORT DATA
// ------------------------------------------------------------
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

// ------------------------------------------------------------
// GET LOGGED-IN USER
// ------------------------------------------------------------
function getLoggedUser() {
    try {
        return JSON.parse(localStorage.getItem("loggedInUser")) || null;
    } catch (error) {
        console.error("Unable to read logged-in user:", error);
        return null;
    }
}

// ------------------------------------------------------------
// GET CURRENT FARM ID
// ------------------------------------------------------------
function getFarmID() {
    const user = getLoggedUser();

    if (!user || !user.farm_id) {
        console.error("No farm ID found for logged-in user.");
        return null;
    }

    return user.farm_id;
}

// ------------------------------------------------------------
// CHECK USER
// ------------------------------------------------------------
function checkUserAccess() {
    const user = getLoggedUser();

    if (!user) {
        alert("Your session has expired. Please login again.");
        window.location.href = "login.html";
        return false;
    }

    if (!user.farm_id) {
        alert("Your account is not linked to a farm.");
        return false;
    }

    return true;
}

// ------------------------------------------------------------
// FORMAT MONEY
// ------------------------------------------------------------
function formatMoney(value) {
    return Number(value || 0).toLocaleString("en-ZM", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    });
}

// ------------------------------------------------------------
// FORMAT NUMBER
// ------------------------------------------------------------
function formatNumber(value) {
    return Number(value || 0).toLocaleString("en-ZM");
}

// ------------------------------------------------------------
// SELECTED MONTH
// ------------------------------------------------------------
function getSelectedMonth() {
    const monthInput = document.getElementById("reportMonth");

    if (!monthInput || !monthInput.value) {
        return "";
    }

    return monthInput.value;
}

// ------------------------------------------------------------
// CHECK WHETHER DATE BELONGS TO SELECTED MONTH
// ------------------------------------------------------------
function belongsToMonth(dateValue, selectedMonth) {
    if (!selectedMonth) {
        return true;
    }

    if (!dateValue) {
        return false;
    }

    const dateString = String(dateValue).substring(0, 7);

    return dateString === selectedMonth;
}

// ------------------------------------------------------------
// LOAD ALL REPORT DATA
// ------------------------------------------------------------
async function loadReportData() {

    if (!checkUserAccess()) {
        return;
    }

    const farmID = getFarmID();

    if (!farmID) {
        return;
    }

    try {

        const [
            pigsResult,
            gestationResult,
            farrowingResult,
            weaningResult,
            treatmentResult,
            feedingResult,
            salesResult,
            expensesResult
        ] = await Promise.all([

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

        if (pigsResult.error) throw pigsResult.error;
        if (gestationResult.error) throw gestationResult.error;
        if (farrowingResult.error) throw farrowingResult.error;
        if (weaningResult.error) throw weaningResult.error;
        if (treatmentResult.error) throw treatmentResult.error;
        if (feedingResult.error) throw feedingResult.error;
        if (salesResult.error) throw salesResult.error;
        if (expensesResult.error) throw expensesResult.error;

        reportData.pigs = pigsResult.data || [];
        reportData.gestation = gestationResult.data || [];
        reportData.farrowing = farrowingResult.data || [];
        reportData.weaning = weaningResult.data || [];
        reportData.treatment = treatmentResult.data || [];
        reportData.feeding = feedingResult.data || [];
        reportData.sales = salesResult.data || [];
        reportData.expenses = expensesResult.data || [];

        console.log("Farm-secured report data loaded:", {
            farmID: farmID,
            pigs: reportData.pigs.length,
            gestation: reportData.gestation.length,
            farrowing: reportData.farrowing.length,
            weaning: reportData.weaning.length,
            treatment: reportData.treatment.length,
            feeding: reportData.feeding.length,
            sales: reportData.sales.length,
            expenses: reportData.expenses.length
        });

        generateReports();

    } catch (error) {

        console.error("Error loading report data:", error);

        alert(
            "Unable to load reports.\n\n" +
            (error.message || "Unknown error")
        );
    }
}

// ------------------------------------------------------------
// GENERATE ALL REPORTS
// ------------------------------------------------------------
function generateReports() {

    generateDashboardSummary();
    generateFinancialReport();
    generatePigReport();
    generateGestationReport();
    generateProductionReport();
    generateHealthReport();
    generateFeedingReport();
    generateMonthlyFinancialTable();

    createFinancialChart();
    createPigChart();
    createGestationChart();
    createProductionChart();
    createHealthChart();
    createFeedingChart();
}

// ------------------------------------------------------------
// DASHBOARD SUMMARY
// ------------------------------------------------------------
function generateDashboardSummary() {

    const selectedMonth = getSelectedMonth();

    const pigs = reportData.pigs;

    const sales = reportData.sales.filter(record => {
        return belongsToMonth(
            record.sale_date || record.sales_date || record.date || record.created_at,
            selectedMonth
        );
    });

    const expenses = reportData.expenses.filter(record => {
        return belongsToMonth(
            record.expense_date || record.date || record.created_at,
            selectedMonth
        );
    });

    const weaning = reportData.weaning.filter(record => {
        return belongsToMonth(
            record.weaning_date || record.date || record.created_at,
            selectedMonth
        );
    });

    const treatment = reportData.treatment.filter(record => {
        return belongsToMonth(
            record.treatment_date || record.date || record.created_at,
            selectedMonth
        );
    });

    const feeding = reportData.feeding.filter(record => {
        return belongsToMonth(
            record.feeding_date || record.date || record.created_at,
            selectedMonth
        );
    });

    const totalSales = sales.reduce(
        (sum, record) => sum + Number(record.total_amount || 0),
        0
    );

    const totalExpenses = expenses.reduce(
        (sum, record) => sum + Number(record.total_amount || 0),
        0
    );

    const totalWeaned = weaning.reduce(
        (sum, record) => sum + Number(record.total_weaned || 0),
        0
    );

    const totalFeed = feeding.reduce(
        (sum, record) =>
            sum + Number(
                record.quantity ||
                record.feed_quantity ||
                0
            ),
        0
    );

    const mortality = reportData.farrowing.reduce(
        (sum, record) => {
            if (
                belongsToMonth(
                    record.farrow_date || record.date || record.created_at,
                    selectedMonth
                )
            ) {
                return sum + Number(record.mortality || 0);
            }

            return sum;
        },
        0
    );

    setElementText("totalPigs", pigs.length);
    setElementText("totalSales", formatMoney(totalSales));
    setElementText("totalExpenses", formatMoney(totalExpenses));
    setElementText(
        "totalProfit",
        formatMoney(totalSales - totalExpenses)
    );
    setElementText("totalWeaned", totalWeaned);
    setElementText("totalTreatments", treatment.length);
    setElementText("totalFeed", formatNumber(totalFeed));
    setElementText("totalMortality", mortality);
}

// ------------------------------------------------------------
// SET ELEMENT TEXT SAFELY
// ------------------------------------------------------------
function setElementText(id, value) {

    const element = document.getElementById(id);

    if (element) {
        element.textContent = value;
    }
}

// ------------------------------------------------------------
// FINANCIAL REPORT
// ------------------------------------------------------------
function generateFinancialReport() {

    const selectedMonth = getSelectedMonth();

    const sales = reportData.sales.filter(record => {
        return belongsToMonth(
            record.sale_date ||
            record.sales_date ||
            record.date ||
            record.created_at,
            selectedMonth
        );
    });

    const expenses = reportData.expenses.filter(record => {
        return belongsToMonth(
            record.expense_date ||
            record.date ||
            record.created_at,
            selectedMonth
        );
    });

    const totalSales = sales.reduce(
        (sum, record) =>
            sum + Number(record.total_amount || 0),
        0
    );

    const totalExpenses = expenses.reduce(
        (sum, record) =>
            sum + Number(record.total_amount || 0),
        0
    );

    const profit = totalSales - totalExpenses;

    setElementText(
        "financialSales",
        formatMoney(totalSales)
    );

    setElementText(
        "financialExpenses",
        formatMoney(totalExpenses)
    );

    setElementText(
        "financialProfit",
        formatMoney(profit)
    );

    const salesElement =
        document.getElementById("totalSalesAmount");

    const expensesElement =
        document.getElementById("totalExpenseAmount");

    const profitElement =
        document.getElementById("netProfit");

    if (salesElement) {
        salesElement.textContent = formatMoney(totalSales);
    }

    if (expensesElement) {
        expensesElement.textContent = formatMoney(totalExpenses);
    }

    if (profitElement) {
        profitElement.textContent = formatMoney(profit);
    }
}

// ------------------------------------------------------------
// PIG REPORT
// ------------------------------------------------------------
function generatePigReport() {

    const selectedMonth = getSelectedMonth();

    let pigs = reportData.pigs;

    if (selectedMonth) {

        pigs = pigs.filter(pig => {

            return belongsToMonth(
                pig.farrowDate ||
                pig.farrow_date ||
                pig.registration_date ||
                pig.created_at,
                selectedMonth
            );

        });
    }

    const totalPigs = pigs.length;

    const male = pigs.filter(
        pig => String(pig.sex || "").toLowerCase() === "male"
    ).length;

    const female = pigs.filter(
        pig => String(pig.sex || "").toLowerCase() === "female"
    ).length;

    const healthy = pigs.filter(
        pig =>
            String(pig.health_status || pig.healthStatus || "")
                .toLowerCase() === "healthy"
    ).length;

    setElementText("pigTotal", totalPigs);
    setElementText("pigMale", male);
    setElementText("pigFemale", female);
    setElementText("pigHealthy", healthy);
}

// ------------------------------------------------------------
// GESTATION REPORT
// ------------------------------------------------------------
function generateGestationReport() {

    const selectedMonth = getSelectedMonth();

    const records = reportData.gestation.filter(record => {

        const date =
            record.service_date ||
            record.mating_date ||
            record.breeding_date ||
            record.gestation_date ||
            record.date ||
            record.created_at;

        return belongsToMonth(date, selectedMonth);
    });

    setElementText(
        "gestationTotal",
        records.length
    );

    const completed = records.filter(record => {

        const status =
            String(record.status || "").toLowerCase();

        return (
            status.includes("complete") ||
            status.includes("farrow") ||
            status.includes("delivered")
        );
    }).length;

    const pending = records.length - completed;

    setElementText(
        "gestationCompleted",
        completed
    );

    setElementText(
        "gestationPending",
        pending
    );
}

// ------------------------------------------------------------
// PRODUCTION REPORT
// ------------------------------------------------------------
function generateProductionReport() {

    const selectedMonth = getSelectedMonth();

    const farrowing = reportData.farrowing.filter(record => {

        return belongsToMonth(
            record.farrow_date ||
            record.date ||
            record.created_at,
            selectedMonth
        );
    });

    const weaning = reportData.weaning.filter(record => {

        return belongsToMonth(
            record.weaning_date ||
            record.date ||
            record.created_at,
            selectedMonth
        );
    });

    const totalBorn = farrowing.reduce(
        (sum, record) =>
            sum + Number(record.total_born || 0),
        0
    );

    const totalWeaned = weaning.reduce(
        (sum, record) =>
            sum + Number(record.total_weaned || 0),
        0
    );

    const totalMortality = farrowing.reduce(
        (sum, record) =>
            sum + Number(record.mortality || 0),
        0
    );

    setElementText(
        "productionFarrowings",
        farrowing.length
    );

    setElementText(
        "productionBorn",
        totalBorn
    );

    setElementText(
        "productionWeaned",
        totalWeaned
    );

    setElementText(
        "productionMortality",
        totalMortality
    );
}

// ------------------------------------------------------------
// HEALTH REPORT
// ------------------------------------------------------------
function generateHealthReport() {

    const selectedMonth = getSelectedMonth();

    const records = reportData.treatment.filter(record => {

        return belongsToMonth(
            record.treatment_date ||
            record.date ||
            record.created_at,
            selectedMonth
        );
    });

    const diseaseCounts = {};

    records.forEach(record => {

        const disease =
            record.symptom ||
            record.possible_cause ||
            "Unknown";

        diseaseCounts[disease] =
            (diseaseCounts[disease] || 0) + 1;
    });

    const totalTreatments = records.length;

    setElementText(
        "healthTotal",
        totalTreatments
    );

    setElementText(
        "healthDiseases",
        Object.keys(diseaseCounts).length
    );
}

// ------------------------------------------------------------
// FEEDING REPORT
// ------------------------------------------------------------
function generateFeedingReport() {

    const selectedMonth = getSelectedMonth();

    const records = reportData.feeding.filter(record => {

        return belongsToMonth(
            record.feeding_date ||
            record.date ||
            record.created_at,
            selectedMonth
        );
    });

    const totalQuantity = records.reduce(
        (sum, record) =>
            sum +
            Number(
                record.quantity ||
                record.feed_quantity ||
                0
            ),
        0
    );

    const totalCost = records.reduce(
        (sum, record) =>
            sum + Number(record.feed_cost || 0),
        0
    );

    setElementText(
        "feedingTotal",
        records.length
    );

    setElementText(
        "feedingQuantity",
        formatNumber(totalQuantity)
    );

    setElementText(
        "feedingCost",
        formatMoney(totalCost)
    );
}

// ------------------------------------------------------------
// MONTHLY FINANCIAL TABLE
// ------------------------------------------------------------
function generateMonthlyFinancialTable() {

    const tableBody =
        document.getElementById("monthlyFinancialTableBody");

    if (!tableBody) {
        return;
    }

    tableBody.innerHTML = "";

    const monthlyData = {};

    reportData.sales.forEach(record => {

        const date =
            record.sale_date ||
            record.sales_date ||
            record.date ||
            record.created_at;

        if (!date) {
            return;
        }

        const month = String(date).substring(0, 7);

        if (!monthlyData[month]) {
            monthlyData[month] = {
                sales: 0,
                expenses: 0
            };
        }

        monthlyData[month].sales +=
            Number(record.total_amount || 0);
    });

    reportData.expenses.forEach(record => {

        const date =
            record.expense_date ||
            record.date ||
            record.created_at;

        if (!date) {
            return;
        }

        const month = String(date).substring(0, 7);

        if (!monthlyData[month]) {
            monthlyData[month] = {
                sales: 0,
                expenses: 0
            };
        }

        monthlyData[month].expenses +=
            Number(record.total_amount || 0);
    });

    const months = Object.keys(monthlyData).sort();

    months.forEach(month => {

        const data = monthlyData[month];

        const profit =
            data.sales - data.expenses;

        const row = document.createElement("tr");

        row.innerHTML = `
            <td>${month}</td>
            <td>${formatMoney(data.sales)}</td>
            <td>${formatMoney(data.expenses)}</td>
            <td>${formatMoney(profit)}</td>
        `;

        tableBody.appendChild(row);
    });
}

// ------------------------------------------------------------
// CREATE FINANCIAL CHART
// ------------------------------------------------------------
function createFinancialChart() {

    const canvas =
        document.getElementById("financialChart");

    if (!canvas || typeof Chart === "undefined") {
        return;
    }

    if (financialChart) {
        financialChart.destroy();
    }

    const selectedMonth = getSelectedMonth();

    const sales = reportData.sales
        .filter(record =>
            belongsToMonth(
                record.sale_date ||
                record.sales_date ||
                record.date ||
                record.created_at,
                selectedMonth
            )
        )
        .reduce(
            (sum, record) =>
                sum + Number(record.total_amount || 0),
            0
        );

    const expenses = reportData.expenses
        .filter(record =>
            belongsToMonth(
                record.expense_date ||
                record.date ||
                record.created_at,
                selectedMonth
            )
        )
        .reduce(
            (sum, record) =>
                sum + Number(record.total_amount || 0),
            0
        );

    financialChart = new Chart(
        canvas.getContext("2d"),
        {
            type: "bar",

            data: {
                labels: [
                    "Sales",
                    "Expenses",
                    "Profit"
                ],

                datasets: [
                    {
                        label: "Financial Performance",

                        data: [
                            sales,
                            expenses,
                            sales - expenses
                        ]
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

// ------------------------------------------------------------
// CREATE PIG CHART
// ------------------------------------------------------------
function createPigChart() {

    const canvas =
        document.getElementById("pigChart");

    if (!canvas || typeof Chart === "undefined") {
        return;
    }

    if (pigChart) {
        pigChart.destroy();
    }

    const selectedMonth = getSelectedMonth();

    const pigs = reportData.pigs.filter(pig => {

        return belongsToMonth(
            pig.farrowDate ||
            pig.farrow_date ||
            pig.registration_date ||
            pig.created_at,
            selectedMonth
        );
    });

    const male = pigs.filter(
        pig =>
            String(pig.sex || "").toLowerCase() === "male"
    ).length;

    const female = pigs.filter(
        pig =>
            String(pig.sex || "").toLowerCase() === "female"
    ).length;

    pigChart = new Chart(
        canvas.getContext("2d"),
        {
            type: "pie",

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
                responsive: true,
                maintainAspectRatio: false
            }
        }
    );
}

// ------------------------------------------------------------
// CREATE GESTATION CHART
// ------------------------------------------------------------
function createGestationChart() {

    const canvas =
        document.getElementById("gestationChart");

    if (!canvas || typeof Chart === "undefined") {
        return;
    }

    if (gestationChart) {
        gestationChart.destroy();
    }

    const selectedMonth = getSelectedMonth();

    const records =
        reportData.gestation.filter(record => {

            return belongsToMonth(
                record.service_date ||
                record.mating_date ||
                record.breeding_date ||
                record.gestation_date ||
                record.date ||
                record.created_at,
                selectedMonth
            );
        });

    const completed = records.filter(record => {

        const status =
            String(record.status || "").toLowerCase();

        return (
            status.includes("complete") ||
            status.includes("farrow") ||
            status.includes("delivered")
        );
    }).length;

    const pending =
        records.length - completed;

    gestationChart = new Chart(
        canvas.getContext("2d"),
        {
            type: "doughnut",

            data: {
                labels: [
                    "Completed",
                    "Pending"
                ],

                datasets: [
                    {
                        data: [
                            completed,
                            pending
                        ]
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

// ------------------------------------------------------------
// CREATE PRODUCTION CHART
// ------------------------------------------------------------
function createProductionChart() {

    const canvas =
        document.getElementById("productionChart");

    if (!canvas || typeof Chart === "undefined") {
        return;
    }

    if (productionChart) {
        productionChart.destroy();
    }

    const selectedMonth = getSelectedMonth();

    const farrowing =
        reportData.farrowing.filter(record =>
            belongsToMonth(
                record.farrow_date ||
                record.date ||
                record.created_at,
                selectedMonth
            )
        );

    const weaning =
        reportData.weaning.filter(record =>
            belongsToMonth(
                record.weaning_date ||
                record.date ||
                record.created_at,
                selectedMonth
            )
        );

    const born = farrowing.reduce(
        (sum, record) =>
            sum + Number(record.total_born || 0),
        0
    );

    const weaned = weaning.reduce(
        (sum, record) =>
            sum + Number(record.total_weaned || 0),
        0
    );

    const mortality = farrowing.reduce(
        (sum, record) =>
            sum + Number(record.mortality || 0),
        0
    );

    productionChart = new Chart(
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
                        label: "Production",

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
                maintainAspectRatio: false
            }
        }
    );
}

// ------------------------------------------------------------
// CREATE HEALTH CHART
// ------------------------------------------------------------
function createHealthChart() {

    const canvas =
        document.getElementById("healthChart");

    if (!canvas || typeof Chart === "undefined") {
        return;
    }

    if (healthChart) {
        healthChart.destroy();
    }

    const selectedMonth = getSelectedMonth();

    const records =
        reportData.treatment.filter(record =>
            belongsToMonth(
                record.treatment_date ||
                record.date ||
                record.created_at,
                selectedMonth
            )
        );

    const diseaseCounts = {};

    records.forEach(record => {

        const disease =
            record.symptom ||
            record.possible_cause ||
            "Unknown";

        diseaseCounts[disease] =
            (diseaseCounts[disease] || 0) + 1;
    });

    healthChart = new Chart(
        canvas.getContext("2d"),
        {
            type: "bar",

            data: {
                labels:
                    Object.keys(diseaseCounts),

                datasets: [
                    {
                        label: "Treatment Records",

                        data:
                            Object.values(diseaseCounts)
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

// ------------------------------------------------------------
// CREATE FEEDING CHART
// ------------------------------------------------------------
function createFeedingChart() {

    const canvas =
        document.getElementById("feedingChart");

    if (!canvas || typeof Chart === "undefined") {
        return;
    }

    if (feedingChart) {
        feedingChart.destroy();
    }

    const selectedMonth = getSelectedMonth();

    const records =
        reportData.feeding.filter(record =>
            belongsToMonth(
                record.feeding_date ||
                record.date ||
                record.created_at,
                selectedMonth
            )
        );

    const feedTypes = {};
    const feedQuantities = {};

    records.forEach(record => {

        const type =
            record.feed_type ||
            "Unknown";

        const quantity =
            Number(
                record.quantity ||
                record.feed_quantity ||
                0
            );

        feedTypes[type] =
            (feedTypes[type] || 0) + quantity;

        feedQuantities[type] =
            (feedQuantities[type] || 0) + quantity;
    });

    feedingChart = new Chart(
        canvas.getContext("2d"),
        {
            type: "bar",

            data: {
                labels:
                    Object.keys(feedQuantities),

                datasets: [
                    {
                        label: "Feed Used",

                        data:
                            Object.values(feedQuantities)
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

// ------------------------------------------------------------
// CLEAR MONTH FILTER
// ------------------------------------------------------------
function clearReportFilter() {

    const monthInput =
        document.getElementById("reportMonth");

    if (monthInput) {
        monthInput.value = "";
    }

    generateReports();
}

// ------------------------------------------------------------
// FULL REPORT
// ------------------------------------------------------------
function generateFullReport() {

    if (!checkUserAccess()) {
        return;
    }

    const farmID = getFarmID();

    if (!farmID) {
        return;
    }

    const selectedMonth = getSelectedMonth();

    const pigs = reportData.pigs.filter(pig => {

        return belongsToMonth(
            pig.farrowDate ||
            pig.farrow_date ||
            pig.registration_date ||
            pig.created_at,
            selectedMonth
        );
    });

    const sales = reportData.sales.filter(record => {

        return belongsToMonth(
            record.sale_date ||
            record.sales_date ||
            record.date ||
            record.created_at,
            selectedMonth
        );
    });

    const expenses = reportData.expenses.filter(record => {

        return belongsToMonth(
            record.expense_date ||
            record.date ||
            record.created_at,
            selectedMonth
        );
    });

    const weaning = reportData.weaning.filter(record => {

        return belongsToMonth(
            record.weaning_date ||
            record.date ||
            record.created_at,
            selectedMonth
        );
    });

    const treatment = reportData.treatment.filter(record => {

        return belongsToMonth(
            record.treatment_date ||
            record.date ||
            record.created_at,
            selectedMonth
        );
    });

    const feeding = reportData.feeding.filter(record => {

        return belongsToMonth(
            record.feeding_date ||
            record.date ||
            record.created_at,
            selectedMonth
        );
    });

    const farrowing = reportData.farrowing.filter(record => {

        return belongsToMonth(
            record.farrow_date ||
            record.date ||
            record.created_at,
            selectedMonth
        );
    });

    const totalSales = sales.reduce(
        (sum, record) =>
            sum + Number(record.total_amount || 0),
        0
    );

    const totalExpenses = expenses.reduce(
        (sum, record) =>
            sum + Number(record.total_amount || 0),
        0
    );

    const totalWeaned = weaning.reduce(
        (sum, record) =>
            sum + Number(record.total_weaned || 0),
        0
    );

    const totalFeed = feeding.reduce(
        (sum, record) =>
            sum +
            Number(
                record.quantity ||
                record.feed_quantity ||
                0
            ),
        0
    );

    const totalMortality = farrowing.reduce(
        (sum, record) =>
            sum + Number(record.mortality || 0),
        0
    );

    const reportWindow =
        window.open("", "_blank");

    if (!reportWindow) {
        alert(
            "Please allow pop-ups in your browser to generate the full report."
        );
        return;
    }

    reportWindow.document.write(`
        <!DOCTYPE html>

        <html>

        <head>

            <title>MUNKA PIGGERY - Full Report</title>

            <style>

                body {
                    font-family: Arial, sans-serif;
                    padding: 30px;
                    color: #222;
                }

                h1 {
                    text-align: center;
                    margin-bottom: 5px;
                }

                h2 {
                    margin-top: 30px;
                    border-bottom: 1px solid #ccc;
                    padding-bottom: 8px;
                }

                .subtitle {
                    text-align: center;
                    color: #666;
                    margin-bottom: 25px;
                }

                .summary {
                    display: grid;
                    grid-template-columns:
                        repeat(4, 1fr);
                    gap: 15px;
                }

                .card {
                    border: 1px solid #ddd;
                    padding: 15px;
                    text-align: center;
                    border-radius: 8px;
                }

                .card strong {
                    display: block;
                    font-size: 20px;
                    margin-top: 8px;
                }

                table {
                    width: 100%;
                    border-collapse: collapse;
                    margin-top: 15px;
                }

                th,
                td {
                    border: 1px solid #ddd;
                    padding: 8px;
                    text-align: left;
                }

                th {
                    background: #f2f2f2;
                }

                .footer {
                    margin-top: 40px;
                    text-align: center;
                    color: #777;
                    font-size: 12px;
                }

                @media print {

                    button {
                        display: none;
                    }

                }

            </style>

        </head>

        <body>

            <h1>MUNKA PIGGERY</h1>

            <div class="subtitle">
                Piggery Management System - Full Report
            </div>

            <p>
                <strong>Farm ID:</strong> ${farmID}
            </p>

            <p>
                <strong>Report Period:</strong>
                ${selectedMonth || "All Records"}
            </p>

            <h2>Summary</h2>

            <div class="summary">

                <div class="card">
                    Total Pigs
                    <strong>${pigs.length}</strong>
                </div>

                <div class="card">
                    Total Sales
                    <strong>${formatMoney(totalSales)}</strong>
                </div>

                <div class="card">
                    Total Expenses
                    <strong>${formatMoney(totalExpenses)}</strong>
                </div>

                <div class="card">
                    Net Profit
                    <strong>${formatMoney(
                        totalSales - totalExpenses
                    )}</strong>
                </div>

                <div class="card">
                    Total Weaned
                    <strong>${totalWeaned}</strong>
                </div>

                <div class="card">
                    Treatments
                    <strong>${treatment.length}</strong>
                </div>

                <div class="card">
                    Feed Used
                    <strong>${formatNumber(totalFeed)}</strong>
                </div>

                <div class="card">
                    Mortality
                    <strong>${totalMortality}</strong>
                </div>

            </div>

            <h2>Production</h2>

            <table>

                <tr>
                    <th>Item</th>
                    <th>Total</th>
                </tr>

                <tr>
                    <td>Farrowing Records</td>
                    <td>${farrowing.length}</td>
                </tr>

                <tr>
                    <td>Weaning Records</td>
                    <td>${weaning.length}</td>
                </tr>

                <tr>
                    <td>Total Weaned</td>
                    <td>${totalWeaned}</td>
                </tr>

                <tr>
                    <td>Total Mortality</td>
                    <td>${totalMortality}</td>
                </tr>

            </table>

            <h2>Financial Performance</h2>

            <table>

                <tr>
                    <th>Item</th>
                    <th>Amount</th>
                </tr>

                <tr>
                    <td>Total Sales</td>
                    <td>${formatMoney(totalSales)}</td>
                </tr>

                <tr>
                    <td>Total Expenses</td>
                    <td>${formatMoney(totalExpenses)}</td>
                </tr>

                <tr>
                    <td>Net Profit</td>
                    <td>${formatMoney(
                        totalSales - totalExpenses
                    )}</td>
                </tr>

            </table>

            <h2>Health</h2>

            <table>

                <tr>
                    <th>Item</th>
                    <th>Total</th>
                </tr>

                <tr>
                    <td>Treatment Records</td>
                    <td>${treatment.length}</td>
                </tr>

            </table>

            <h2>Feeding</h2>

            <table>

                <tr>
                    <th>Item</th>
                    <th>Total</th>
                </tr>

                <tr>
                    <td>Feed Records</td>
                    <td>${feeding.length}</td>
                </tr>

                <tr>
                    <td>Total Feed Used</td>
                    <td>${formatNumber(totalFeed)}</td>
                </tr>

            </table>

            <div class="footer">
                MUNKA PIGGERY Management System
                <br>
                Generated automatically from the current farm records.
            </div>

            <script>

                window.onload = function () {
                    window.print();
                };

            <\/script>

        </body>

        </html>
    `);

    reportWindow.document.close();
}

// ------------------------------------------------------------
// PRINT CURRENT REPORT PAGE
// ------------------------------------------------------------
function printReport() {
    window.print();
}

// ------------------------------------------------------------
// PAGE INITIALIZATION
// ------------------------------------------------------------
document.addEventListener(
    "DOMContentLoaded",
    function () {

        if (!checkUserAccess()) {
            return;
        }

        loadReportData();

        const monthInput =
            document.getElementById("reportMonth");

        if (monthInput) {

            monthInput.addEventListener(
                "change",
                function () {
                    generateReports();
                }
            );

        }

    }
);