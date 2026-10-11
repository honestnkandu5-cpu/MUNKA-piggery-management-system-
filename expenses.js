// =====================================
// MUNKA PIGGERY TECHNOLOGY
// EXPENSES RECORDS MODULE
// FARM-SECURED VERSION
// PROFESSIONAL UPGRADE
// DYNAMIC FARM BRANDING
// CUSTOM NOTIFICATIONS
// NO BROWSER ALERT HEADINGS
// =====================================

let editID = null;


// =====================================
// CUSTOM NOTIFICATION SYSTEM
// =====================================

function showExpenseNotification(message, type = "success") {

    let container = document.getElementById(
        "munka-expense-notifications"
    );

    if (!container) {

        container = document.createElement("div");

        container.id = "munka-expense-notifications";

        container.style.cssText = `
            position: fixed;
            top: 20px;
            right: 15px;
            z-index: 999999;
            display: flex;
            flex-direction: column;
            gap: 10px;
            width: min(360px, calc(100vw - 30px));
            pointer-events: none;
        `;

        document.body.appendChild(container);
    }

    const styles = {
        success: {
            background: "#166534",
            border: "#22c55e",
            icon: "✓"
        },

        error: {
            background: "#991b1b",
            border: "#ef4444",
            icon: "✕"
        },

        warning: {
            background: "#92400e",
            border: "#f59e0b",
            icon: "!"
        },

        info: {
            background: "#1e40af",
            border: "#60a5fa",
            icon: "i"
        }
    };

    const selected = styles[type] || styles.info;

    const notification = document.createElement("div");

    notification.style.cssText = `
        display: flex;
        align-items: center;
        gap: 12px;
        padding: 15px;
        background: ${selected.background};
        color: white;
        border-left: 5px solid ${selected.border};
        border-radius: 10px;
        box-shadow: 0 5px 20px rgba(0,0,0,0.25);
        font-family: Arial, sans-serif;
        font-size: 14px;
        font-weight: 600;
        line-height: 1.5;
        overflow-wrap: anywhere;
        opacity: 0;
        transform: translateY(-10px);
        transition: opacity .25s ease, transform .25s ease;
        pointer-events: auto;
    `;

    const icon = document.createElement("span");

    icon.textContent = selected.icon;

    icon.style.cssText = `
        display: flex;
        align-items: center;
        justify-content: center;
        min-width: 26px;
        height: 26px;
        border: 2px solid white;
        border-radius: 50%;
        font-size: 15px;
        font-weight: bold;
    `;

    const text = document.createElement("span");

    text.textContent = String(message);

    text.style.flex = "1";

    const closeButton = document.createElement("button");

    closeButton.type = "button";
    closeButton.textContent = "×";
    closeButton.setAttribute("aria-label", "Close notification");

    closeButton.style.cssText = `
        border: none;
        background: transparent;
        color: white;
        font-size: 25px;
        cursor: pointer;
        padding: 0 3px;
    `;

    notification.appendChild(icon);
    notification.appendChild(text);
    notification.appendChild(closeButton);

    container.appendChild(notification);

    requestAnimationFrame(() => {
        notification.style.opacity = "1";
        notification.style.transform = "translateY(0)";
    });

    let timer;

    function removeNotification() {

        clearTimeout(timer);

        notification.style.opacity = "0";
        notification.style.transform = "translateY(-10px)";

        setTimeout(() => {
            notification.remove();
        }, 250);
    }

    closeButton.addEventListener(
        "click",
        removeNotification
    );

    timer = setTimeout(
        removeNotification,
        type === "error" ? 6000 : 3500
    );
}


// =====================================
// GET LOGGED-IN USER
// =====================================

function getLoggedUser() {

    try {

        return JSON.parse(
            localStorage.getItem("loggedInUser")
        );

    } catch (error) {

        console.error("Unable to read logged-in user:", error);

        return null;
    }
}


// =====================================
// GET CURRENT FARM ID
// =====================================

function getFarmID() {

    const loggedUser = getLoggedUser();

    if (!loggedUser || !loggedUser.farm_id) {

        console.error(
            "No farm_id found for logged-in user."
        );

        return null;
    }

    return loggedUser.farm_id;
}


// =====================================
// GET REGISTERED FARM NAME
// =====================================

async function getRegisteredFarmName() {

    try {

        const {
            data: sessionData,
            error: sessionError
        } = await supabaseClient.auth.getSession();

        if (sessionError) throw sessionError;

        const session = sessionData.session;

        if (!session || !session.user) {
            return "Registered Farm";
        }

        const {
            data: userProfile,
            error: userError
        } = await supabaseClient
            .from("users")
            .select("farm_id")
            .eq("auth_user_id", session.user.id)
            .maybeSingle();

        if (userError) throw userError;

        if (!userProfile || !userProfile.farm_id) {
            return "Registered Farm";
        }

        const {
            data: farm,
            error: farmError
        } = await supabaseClient
            .from("farms")
            .select("farm_name")
            .eq("id", userProfile.farm_id)
            .maybeSingle();

        if (farmError) throw farmError;

        return farm?.farm_name || "Registered Farm";

    } catch (error) {

        console.error(
            "Unable to get registered farm name:",
            error
        );

        return "Registered Farm";
    }
}


// =====================================
// ESCAPE HTML
// =====================================

function escapeHTML(value) {

    if (value === null || value === undefined) {
        return "";
    }

    return String(value)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}


// =====================================
// DESCRIPTION OPTIONS
// =====================================

const descriptionOptions = {

    "Feed": [
        "Piglet Feed",
        "Weaner Feed",
        "Grower Feed",
        "Finisher Feed",
        "Sow Feed",
        "Boar Feed",
        "Maize",
        "Soybean Meal",
        "Premix",
        "Bran",
        "Other Feed"
    ],

    "Medicine": [
        "Dewormer",
        "Antibiotics",
        "Vitamins",
        "Mineral Supplement",
        "Pain Relief Medicine",
        "Treatment Medicine",
        "Disinfectant",
        "Other Medicine"
    ],

    "Vaccination": [
        "Vaccination",
        "Vaccine Dose",
        "Vaccination Service",
        "Cold Chain / Vaccine Transport",
        "Other Vaccination Expense"
    ],

    "Labour": [
        "Farm Worker Wages",
        "Casual Labour",
        "Cleaning Labour",
        "Feeding Labour",
        "Construction Labour",
        "Other Labour"
    ],

    "Transport": [
        "Feed Transportation",
        "Pig Transportation",
        "Medicine Transportation",
        "Vaccine Transportation",
        "Farm Supply Delivery",
        "Fuel / Transport Charge",
        "Other Transport"
    ],

    "Repairs & Maintenance": [
        "Pig Pen Repair",
        "Fence Repair",
        "Roof Repair",
        "Water System Repair",
        "Electrical Repair",
        "Equipment Repair",
        "Plumbing Repair",
        "Other Repair"
    ],

    "Utilities": [
        "Electricity",
        "Water",
        "Internet",
        "Communication",
        "Waste Management",
        "Other Utility"
    ],

    "Equipment": [
        "Feeding Equipment",
        "Watering Equipment",
        "Weighing Equipment",
        "Farm Tools",
        "Protective Equipment",
        "Breeding Equipment",
        "Cleaning Equipment",
        "Other Equipment"
    ],

    "Breeding / Artificial Insemination": [
        "Semen",
        "Artificial Insemination Service",
        "Breeding Service",
        "Breeding Supplies",
        "Hormonal Product",
        "Other Breeding Expense"
    ],

    "Cleaning & Disinfection": [
        "Disinfectant",
        "Detergent",
        "Bleach",
        "Cleaning Equipment",
        "Protective Clothing",
        "Other Cleaning Expense"
    ],

    "Marketing": [
        "Advertising",
        "Printing",
        "Social Media Promotion",
        "Transport for Marketing",
        "Market Levy",
        "Other Marketing Expense"
    ],

    "Other": [
        "General Farm Expense",
        "Administrative Expense",
        "Bank Charges",
        "Other"
    ]
};


// =====================================
// REMARKS / RECOMMENDATIONS
// =====================================

const recommendationOptions = {

    "Feed": [
        "Feed Cost Reasonable - Maintain Current Supplier",
        "Feed Cost High - Compare Suppliers",
        "Consider Bulk Feed Purchasing",
        "Monitor Feed Prices",
        "Review Feed Consumption",
        "Reduce Feed Wastage",
        "Maintain Current Feeding Programme",
        "Review Feed Formulation"
    ],

    "Medicine": [
        "Medicine Cost Reasonable - Maintain Supplier",
        "Medicine Cost High - Compare Suppliers",
        "Maintain Adequate Medicine Stock",
        "Review Preventive Health Programme",
        "Use Medicine According to Veterinary Advice",
        "Monitor Medicine Consumption",
        "Consider Bulk Purchasing Where Appropriate"
    ],

    "Vaccination": [
        "Vaccination Cost Reasonable",
        "Maintain Regular Vaccination Programme",
        "Review Vaccination Schedule",
        "Maintain Adequate Vaccine Stock",
        "Plan Vaccination in Advance",
        "Monitor Vaccination Costs"
    ],

    "Labour": [
        "Labour Cost Reasonable",
        "Labour Cost High - Review Labour Planning",
        "Improve Worker Productivity",
        "Review Staff Allocation",
        "Maintain Efficient Labour Scheduling",
        "Monitor Labour Costs"
    ],

    "Transport": [
        "Transport Cost Reasonable",
        "Transport Cost High - Compare Providers",
        "Combine Deliveries Where Possible",
        "Plan Transport in Advance",
        "Consider Bulk Transportation",
        "Monitor Transport Costs"
    ],

    "Repairs & Maintenance": [
        "Repair Cost Reasonable",
        "Repair Cost High - Compare Service Providers",
        "Schedule Preventive Maintenance",
        "Inspect Equipment Regularly",
        "Prioritise Critical Repairs",
        "Monitor Maintenance Costs"
    ],

    "Utilities": [
        "Utility Cost Reasonable",
        "Utility Cost High - Review Consumption",
        "Monitor Electricity Usage",
        "Monitor Water Usage",
        "Reduce Unnecessary Utility Consumption",
        "Review Monthly Utility Costs"
    ],

    "Equipment": [
        "Equipment Cost Reasonable",
        "Compare Equipment Prices Before Purchase",
        "Prioritise Essential Equipment",
        "Maintain Equipment Properly",
        "Consider Durable Equipment",
        "Monitor Equipment Costs"
    ],

    "Breeding / Artificial Insemination": [
        "Breeding Cost Reasonable",
        "Maintain Accurate Breeding Records",
        "Plan Breeding Services in Advance",
        "Compare Breeding Service Costs",
        "Monitor Breeding Programme Costs",
        "Maintain Good Breeding Management"
    ],

    "Cleaning & Disinfection": [
        "Cleaning Cost Reasonable",
        "Maintain Regular Cleaning Programme",
        "Maintain Proper Disinfection",
        "Compare Cleaning Supply Prices",
        "Monitor Cleaning Supply Consumption",
        "Avoid Unnecessary Wastage"
    ],

    "Marketing": [
        "Marketing Cost Reasonable",
        "Monitor Marketing Results",
        "Use Cost-Effective Marketing Channels",
        "Review Marketing Expenses",
        "Increase Market Search",
        "Maintain Effective Marketing Activities"
    ],

    "Other": [
        "Expense Reasonable - Maintain Current Practice",
        "Expense High - Review Cost",
        "Compare Prices Before Purchase",
        "Seek Alternative Suppliers",
        "Improve Expense Planning",
        "Monitor Farm Operating Costs",
        "Consider Cost Reduction Measures"
    ]
};


// =====================================
// LOAD DESCRIPTION OPTIONS
// =====================================

function loadDescriptionOptions(selectedValue = "") {

    const category = document.getElementById("category").value;
    const description = document.getElementById("description");

    description.innerHTML = "";

    const firstOption = document.createElement("option");

    firstOption.value = "";

    firstOption.textContent = category
        ? "Select Description"
        : "Select Expense Category First";

    description.appendChild(firstOption);

    if (!category) return;

    const options = descriptionOptions[category] || [];

    options.forEach(function (item) {

        const option = document.createElement("option");

        option.value = item;
        option.textContent = item;

        if (item === selectedValue) {
            option.selected = true;
        }

        description.appendChild(option);
    });
}


// =====================================
// LOAD REMARKS OPTIONS
// =====================================

function loadRecommendationOptions(selectedValue = "") {

    const category = document.getElementById("category").value;
    const remarks = document.getElementById("remarks");

    remarks.innerHTML = "";

    const firstOption = document.createElement("option");

    firstOption.value = "";

    firstOption.textContent = category
        ? "Select Recommendation"
        : "Select Expense Category First";

    remarks.appendChild(firstOption);

    if (!category) return;

    const options = recommendationOptions[category] || [];

    options.forEach(function (item) {

        const option = document.createElement("option");

        option.value = item;
        option.textContent = item;

        if (item === selectedValue) {
            option.selected = true;
        }

        remarks.appendChild(option);
    });
}


// =====================================
// CATEGORY CHANGE
// =====================================

document
    .getElementById("category")
    .addEventListener("change", function () {

        loadDescriptionOptions();
        loadRecommendationOptions();

    });


// =====================================
// AUTOMATIC EXPENSE CALCULATION
// =====================================

function calculateExpenseTotal() {

    const quantity = Number(
        document.getElementById("quantity").value
    ) || 0;

    const unitCost = Number(
        document.getElementById("unitCost").value
    ) || 0;

    const total = quantity * unitCost;

    document.getElementById("totalAmount").value =
        total.toFixed(2);
}


document
    .getElementById("quantity")
    .addEventListener("change", calculateExpenseTotal);

document
    .getElementById("unitCost")
    .addEventListener("change", calculateExpenseTotal);


// =====================================
// SAVE EXPENSE RECORD
// =====================================

document
    .getElementById("expensesForm")
    .addEventListener("submit", async function (e) {

        e.preventDefault();

        const loggedUser = getLoggedUser();

        if (!loggedUser) {

            showExpenseNotification(
                "No logged-in user found. Please login again.",
                "error"
            );

            return;
        }

        const farmID = getFarmID();

        if (!farmID) {

            showExpenseNotification(
                "Your account is not linked to a farm. Please contact the administrator.",
                "error"
            );

            return;
        }

        const totalAmount = Number(
            document.getElementById("totalAmount").value
        ) || 0;

        if (totalAmount <= 0) {

            showExpenseNotification(
                "Please select a valid quantity and unit cost.",
                "warning"
            );

            return;
        }

        const expense = {

            farm_id: farmID,

            expense_id: "EXP-" + Date.now(),

            expense_date: document.getElementById(
                "expenseDate"
            ).value,

            category: document.getElementById(
                "category"
            ).value,

            description: document.getElementById(
                "description"
            ).value,

            quantity: Number(
                document.getElementById("quantity").value
            ) || 0,

            unit: document.getElementById("unit").value,

            unit_cost: Number(
                document.getElementById("unitCost").value
            ) || 0,

            total_amount: totalAmount,

            payment_method: document.getElementById(
                "paymentMethod"
            ).value,

            supplier_name: document.getElementById(
                "supplierName"
            ).value.trim(),

            supplier_contact: document.getElementById(
                "supplierContact"
            ).value.trim(),

            responsible_person: document.getElementById(
                "responsiblePerson"
            ).value,

            remarks: document.getElementById("remarks").value,

            created_by: loggedUser.full_name,

            created_at: new Date().toISOString(),

            updated_by: null,

            updated_at: null
        };

        try {

            const { error } = await supabaseClient
                .from("expenses_records")
                .insert([expense]);

            if (error) throw error;

            await saveActivity(
                loggedUser.full_name + " (" + loggedUser.role + ")",
                "Added",
                "Expenses Records",
                "Added expense record: " + expense.description
            );

            showExpenseNotification(
                "Expense record saved successfully.",
                "success"
            );

            clearExpenseForm();

            await loadExpensesRecords();

        } catch (error) {

            console.error(error);

            showExpenseNotification(
                error.message || "Unable to save expense record.",
                "error"
            );
        }
    });


// =====================================
// LOAD EXPENSE RECORDS
// =====================================

async function loadExpensesRecords() {

    const farmID = getFarmID();

    if (!farmID) {

        console.error(
            "Cannot load expenses: farm_id missing."
        );

        return;
    }

    try {

        const { data, error } = await supabaseClient
            .from("expenses_records")
            .select("*")
            .eq("farm_id", farmID)
            .order("id", { ascending: false });

        if (error) throw error;

        displayExpensesRecords(data || []);

    } catch (error) {

        console.error(error);

        showExpenseNotification(
            error.message || "Unable to load expense records.",
            "error"
        );
    }
}


// =====================================
// DISPLAY EXPENSE RECORDS
// =====================================

function displayExpensesRecords(records) {

    const table = document.getElementById("expensesTable");

    const recordCount = document.getElementById("recordCount");

    table.innerHTML = "";

    if (!records.length) {

        table.innerHTML = `
            <tr>
                <td colspan="9" class="no-records">
                    No expense records found.
                </td>
            </tr>
        `;

        recordCount.textContent = "0 Records";

        return;
    }

    recordCount.textContent =
        records.length +
        (records.length === 1 ? " Record" : " Records");

    records.forEach(function (expense) {

        table.innerHTML += `
            <tr>
                <td>${escapeHTML(expense.expense_date || "")}</td>

                <td>${escapeHTML(expense.category || "")}</td>

                <td>${escapeHTML(expense.description || "")}</td>

                <td>
                    ${escapeHTML(expense.quantity || 0)}
                    ${escapeHTML(expense.unit || "")}
                </td>

                <td>
                    ZMW ${Number(expense.unit_cost || 0).toFixed(2)}
                </td>

                <td class="amount-cell">
                    ZMW ${Number(expense.total_amount || 0).toFixed(2)}
                </td>

                <td>${escapeHTML(expense.supplier_name || "")}</td>

                <td>${escapeHTML(expense.payment_method || "")}</td>

                <td class="action-cell">
                    <button
                        class="edit-btn"
                        onclick="editExpense(${Number(expense.id)})">
                        Edit
                    </button>

                    <button
                        class="delete-btn"
                        onclick="deleteExpense(${Number(expense.id)})">
                        Delete
                    </button>
                </td>
            </tr>
        `;
    });
}


// =====================================
// LOAD PAGE
// =====================================

window.addEventListener("load", function () {

    const dateField = document.getElementById("expenseDate");

    if (dateField && !dateField.value) {

        dateField.value = new Date()
            .toISOString()
            .split("T")[0];
    }

    loadExpensesRecords();
});


// =====================================
// EDIT EXPENSE
// =====================================

async function editExpense(id) {

    const farmID = getFarmID();

    if (!farmID) {

        showExpenseNotification(
            "Your account is not linked to a farm.",
            "error"
        );

        return;
    }

    try {

        const { data, error } = await supabaseClient
            .from("expenses_records")
            .select("*")
            .eq("id", id)
            .eq("farm_id", farmID)
            .single();

        if (error) throw error;

        editID = id;

        document.getElementById("expenseID").value =
            data.expense_id || "";

        document.getElementById("expenseDate").value =
            data.expense_date || "";

        document.getElementById("category").value =
            data.category || "";

        loadDescriptionOptions(data.description || "");

        loadRecommendationOptions(data.remarks || "");

        document.getElementById("quantity").value =
            data.quantity ?? "";

        document.getElementById("unit").value =
            data.unit || "";

        document.getElementById("unitCost").value =
            data.unit_cost ?? "";

        document.getElementById("totalAmount").value =
            data.total_amount ?? "";

        document.getElementById("paymentMethod").value =
            data.payment_method || "";

        document.getElementById("supplierName").value =
            data.supplier_name || "";

        document.getElementById("supplierContact").value =
            data.supplier_contact || "";

        document.getElementById("responsiblePerson").value =
            data.responsible_person || "";

        window.scrollTo({
            top: 0,
            behavior: "smooth"
        });

    } catch (error) {

        console.error(error);

        showExpenseNotification(
            error.message || "Unable to load expense record.",
            "error"
        );
    }
}


// =====================================
// UPDATE EXPENSE
// =====================================

async function updateExpenseRecord() {

    if (editID === null) {

        showExpenseNotification(
            "Please select an expense record first.",
            "warning"
        );

        return;
    }

    const loggedUser = getLoggedUser();

    if (!loggedUser) {

        showExpenseNotification(
            "No logged-in user found. Please login again.",
            "error"
        );

        return;
    }

    const farmID = getFarmID();

    if (!farmID) {

        showExpenseNotification(
            "Your account is not linked to a farm.",
            "error"
        );

        return;
    }

    calculateExpenseTotal();

    const totalAmount = Number(
        document.getElementById("totalAmount").value
    ) || 0;

    if (totalAmount <= 0) {

        showExpenseNotification(
            "Please select a valid quantity and unit cost.",
            "warning"
        );

        return;
    }

    const updatedExpense = {

        expense_date: document.getElementById(
            "expenseDate"
        ).value,

        category: document.getElementById(
            "category"
        ).value,

        description: document.getElementById(
            "description"
        ).value,

        quantity: Number(
            document.getElementById("quantity").value
        ) || 0,

        unit: document.getElementById("unit").value,

        unit_cost: Number(
            document.getElementById("unitCost").value
        ) || 0,

        total_amount: totalAmount,

        payment_method: document.getElementById(
            "paymentMethod"
        ).value,

        supplier_name: document.getElementById(
            "supplierName"
        ).value.trim(),

        supplier_contact: document.getElementById(
            "supplierContact"
        ).value.trim(),

        responsible_person: document.getElementById(
            "responsiblePerson"
        ).value,

        remarks: document.getElementById("remarks").value,

        updated_by: loggedUser.full_name,

        updated_at: new Date().toISOString()
    };

    try {

        const { error } = await supabaseClient
            .from("expenses_records")
            .update(updatedExpense)
            .eq("id", editID)
            .eq("farm_id", farmID);

        if (error) throw error;

        await saveActivity(
            loggedUser.full_name + " (" + loggedUser.role + ")",
            "Updated",
            "Expenses Records",
            "Updated expense record ID: " + editID
        );

        showExpenseNotification(
            "Expense record updated successfully.",
            "success"
        );

        editID = null;

        clearExpenseForm();

        await loadExpensesRecords();

    } catch (error) {

        console.error(error);

        showExpenseNotification(
            error.message || "Unable to update expense record.",
            "error"
        );
    }
}


// =====================================
// DELETE EXPENSE
// =====================================

async function deleteExpense(id) {

    const confirmDelete = confirm(
        "Delete this expense record?"
    );

    if (!confirmDelete) return;

    const farmID = getFarmID();

    if (!farmID) {

        showExpenseNotification(
            "Your account is not linked to a farm.",
            "error"
        );

        return;
    }

    try {

        const { error } = await supabaseClient
            .from("expenses_records")
            .delete()
            .eq("id", id)
            .eq("farm_id", farmID);

        if (error) throw error;

        const loggedUser = getLoggedUser();

        if (loggedUser) {

            await saveActivity(
                loggedUser.full_name + " (" + loggedUser.role + ")",
                "Deleted",
                "Expenses Records",
                "Deleted expense record ID: " + id
            );
        }

        showExpenseNotification(
            "Expense record deleted successfully.",
            "success"
        );

        await loadExpensesRecords();

    } catch (error) {

        console.error(error);

        showExpenseNotification(
            error.message || "Unable to delete expense record.",
            "error"
        );
    }
}


// =====================================
// SEARCH EXPENSE
// =====================================

async function searchExpenseRecord() {

    const supplier = prompt(
        "Enter Supplier / Payee Name"
    );

    if (!supplier) return;

    const farmID = getFarmID();

    if (!farmID) {

        showExpenseNotification(
            "Your account is not linked to a farm.",
            "error"
        );

        return;
    }

    try {

        const { data, error } = await supabaseClient
            .from("expenses_records")
            .select("*")
            .eq("farm_id", farmID)
            .ilike("supplier_name", "%" + supplier + "%");

        if (error) throw error;

        if (!data || data.length === 0) {

            showExpenseNotification(
                "No expense record found.",
                "warning"
            );

            return;
        }

        displayExpensesRecords(data);

        await editExpense(data[0].id);

    } catch (error) {

        console.error(error);

        showExpenseNotification(
            error.message || "Unable to search expense records.",
            "error"
        );
    }
}


// =====================================
// GENERATE PRINT REPORT
// =====================================

async function generateExpenseReport() {

    const farmID = getFarmID();

    if (!farmID) {

        showExpenseNotification(
            "Your account is not linked to a farm.",
            "error"
        );

        return;
    }

    try {

        const farmName = await getRegisteredFarmName();

        const { data, error } = await supabaseClient
            .from("expenses_records")
            .select("*")
            .eq("farm_id", farmID)
            .order("id", { ascending: false });

        if (error) throw error;

        const records = data || [];

        let totalExpense = 0;

        records.forEach(function (expense) {

            totalExpense += Number(expense.total_amount || 0);

        });

        const reportWindow = window.open("", "_blank");

        if (!reportWindow) {

            showExpenseNotification(
                "Please allow pop-ups to generate the report.",
                "warning"
            );

            return;
        }

        let rows = "";

        records.forEach(function (expense) {

            rows += `
                <tr>
                    <td>${escapeHTML(expense.expense_date || "")}</td>
                    <td>${escapeHTML(expense.category || "")}</td>
                    <td>${escapeHTML(expense.description || "")}</td>
                    <td>
                        ${escapeHTML(expense.quantity || 0)}
                        ${escapeHTML(expense.unit || "")}
                    </td>
                    <td>
                        ZMW ${Number(expense.unit_cost || 0).toFixed(2)}
                    </td>
                    <td>
                        ZMW ${Number(expense.total_amount || 0).toFixed(2)}
                    </td>
                    <td>${escapeHTML(expense.supplier_name || "")}</td>
                </tr>
            `;
        });

        reportWindow.document.write(`
            <!DOCTYPE html>
            <html>
            <head>
                <title>${escapeHTML(farmName)} - Expense Report</title>

                <style>
                    body {
                        font-family: Arial, sans-serif;
                        padding: 30px;
                    }

                    h1 {
                        text-align: center;
                        color: #1b5e20;
                    }

                    h2 {
                        text-align: center;
                    }

                    table {
                        width: 100%;
                        border-collapse: collapse;
                        margin-top: 25px;
                    }

                    th {
                        background: #2e7d32;
                        color: white;
                        padding: 8px;
                    }

                    td {
                        border: 1px solid #ccc;
                        padding: 8px;
                        text-align: center;
                    }

                    .summary {
                        margin-top: 20px;
                        font-size: 18px;
                        font-weight: bold;
                    }

                    .print-btn {
                        margin-top: 20px;
                        padding: 10px 20px;
                        background: #2e7d32;
                        color: white;
                        border: none;
                        cursor: pointer;
                    }

                    @media print {
                        .print-btn {
                            display: none;
                        }
                    }
                </style>
            </head>

            <body>
                <h1>${escapeHTML(farmName)}</h1>

                <h2>EXPENSE REPORT</h2>

                <p>
                    Generated Date:
                    ${new Date().toLocaleDateString()}
                </p>

                <p>Total Records: ${records.length}</p>

                <div class="summary">
                    Total Expenses: ZMW ${totalExpense.toFixed(2)}
                </div>

                <table>
                    <thead>
                        <tr>
                            <th>Date</th>
                            <th>Category</th>
                            <th>Description</th>
                            <th>Quantity</th>
                            <th>Unit Cost</th>
                            <th>Total</th>
                            <th>Supplier / Payee</th>
                        </tr>
                    </thead>

                    <tbody>
                        ${rows}
                    </tbody>
                </table>

                <button class="print-btn" onclick="window.print()">
                    Print Report
                </button>
            </body>
            </html>
        `);

        reportWindow.document.close();

    } catch (error) {

        console.error(error);

        showExpenseNotification(
            error.message || "Unable to generate expense report.",
            "error"
        );
    }
}


// =====================================
// DOWNLOAD PDF
// =====================================

async function downloadExpensesPDF() {

    const farmID = getFarmID();

    if (!farmID) {

        showExpenseNotification(
            "Your account is not linked to a farm.",
            "error"
        );

        return;
    }

    try {

        const farmName = await getRegisteredFarmName();

        const { data, error } = await supabaseClient
            .from("expenses_records")
            .select("*")
            .eq("farm_id", farmID)
            .order("id", { ascending: false });

        if (error) throw error;

        const records = data || [];

        if (records.length === 0) {

            showExpenseNotification(
                "There are no expense records to download.",
                "warning"
            );

            return;
        }

        if (
            !window.jspdf ||
            typeof window.jspdf.jsPDF !== "function"
        ) {

            throw new Error(
                "PDF library is unavailable. Please check the jsPDF script."
            );
        }

        const { jsPDF } = window.jspdf;

        const doc = new jsPDF({
            orientation: "landscape",
            unit: "mm",
            format: "a4"
        });

        const loggedUser = getLoggedUser();

        let totalExpense = 0;
        let totalQuantity = 0;

        records.forEach(function (expense) {

            totalExpense += Number(expense.total_amount || 0);

            totalQuantity += Number(expense.quantity || 0);

        });


        // PDF HEADER

        doc.setFontSize(18);

        doc.setFont(undefined, "bold");

        doc.text(
            farmName,
            148,
            15,
            { align: "center" }
        );

        doc.setFontSize(13);

        doc.text(
            "EXPENSE RECORDS REPORT",
            148,
            23,
            { align: "center" }
        );

        doc.setFontSize(9);

        doc.setFont(undefined, "normal");

        doc.text("Farm: " + farmName, 14, 32);

        doc.text(
            "Generated By: " + (loggedUser?.full_name || ""),
            14,
            38
        );

        doc.text(
            "Generated: " + new Date().toLocaleString(),
            200,
            32
        );

        doc.text(
            "Total Records: " + records.length,
            200,
            38
        );


        // SUMMARY

        doc.setFontSize(10);

        doc.text(
            "Total Quantity: " + totalQuantity,
            14,
            48
        );

        doc.text(
            "TOTAL EXPENSES: ZMW " + totalExpense.toFixed(2),
            200,
            48
        );


        // TABLE

        const rows = records.map(function (expense) {

            return [
                expense.expense_date || "",
                expense.category || "",
                expense.description || "",
                `${expense.quantity || 0} ${expense.unit || ""}`,
                "ZMW " + Number(expense.unit_cost || 0).toFixed(2),
                "ZMW " + Number(expense.total_amount || 0).toFixed(2),
                expense.supplier_name || "",
                expense.payment_method || ""
            ];
        });

        if (typeof doc.autoTable !== "function") {

            throw new Error(
                "PDF table library is unavailable. Please check the AutoTable script."
            );
        }

        doc.autoTable({

            startY: 55,

            head: [[
                "Date",
                "Category",
                "Description",
                "Quantity",
                "Unit Cost",
                "Total",
                "Supplier / Payee",
                "Payment"
            ]],

            body: rows,

            theme: "grid",

            styles: {
                fontSize: 7,
                cellPadding: 2
            },

            headStyles: {
                fontStyle: "bold"
            },

            columnStyles: {
                0: { cellWidth: 23 },
                1: { cellWidth: 30 },
                2: { cellWidth: 45 },
                3: { cellWidth: 25 },
                4: { cellWidth: 27 },
                5: { cellWidth: 28 },
                6: { cellWidth: 45 },
                7: { cellWidth: 27 }
            },

            foot: [[
                "",
                "",
                "",
                "",
                "TOTAL",
                "ZMW " + totalExpense.toFixed(2),
                "",
                ""
            ]],

            didDrawPage: function () {

                const pageNumber =
                    doc.internal.getNumberOfPages();

                doc.setFontSize(8);

                doc.text(
                    farmName + " - Expense Report | Page " + pageNumber,
                    148,
                    202,
                    { align: "center" }
                );
            }
        });


        // SAVE PDF

        const today = new Date()
            .toISOString()
            .split("T")[0];

        const safeFarmName = farmName
            .replace(/[^a-z0-9]/gi, "_")
            .replace(/_+/g, "_")
            .replace(/^_|_$/g, "");

        doc.save(
            safeFarmName + "_Expense_Report_" + today + ".pdf"
        );

        showExpenseNotification(
            "Expense report PDF downloaded successfully.",
            "success"
        );

    } catch (error) {

        console.error(error);

        showExpenseNotification(
            "Unable to generate PDF: " + error.message,
            "error"
        );
    }
}


// =====================================
// CLEAR FORM
// =====================================

function clearExpenseForm() {

    editID = null;

    document.getElementById("expensesForm").reset();

    document.getElementById("expenseID").value = "";

    document.getElementById("description").innerHTML = `
        <option value="">
            Select Expense Category First
        </option>
    `;

    document.getElementById("remarks").innerHTML = `
        <option value="">
            Select Expense Category First
        </option>
    `;

    document.getElementById("totalAmount").value = "";

    const dateField = document.getElementById("expenseDate");

    if (dateField) {

        dateField.value = new Date()
            .toISOString()
            .split("T")[0];
    }
}


// =====================================
// TOTAL EXPENSES
// =====================================

async function calculateTotalExpenses() {

    const farmID = getFarmID();

    if (!farmID) {

        showExpenseNotification(
            "Your account is not linked to a farm.",
            "error"
        );

        return;
    }

    try {

        const { data, error } = await supabaseClient
            .from("expenses_records")
            .select("total_amount")
            .eq("farm_id", farmID);

        if (error) throw error;

        let total = 0;

        (data || []).forEach(function (expense) {

            total += Number(expense.total_amount || 0);

        });

        showExpenseNotification(
            "Total Expenses: ZMW " + total.toFixed(2),
            "info"
        );

    } catch (error) {

        console.error(error);

        showExpenseNotification(
            error.message || "Unable to calculate total expenses.",
            "error"
        );
    }
}