/* ============================================================
   MUNKA PIGGERY MANAGEMENT SYSTEM
   SALES MANAGEMENT MODULE
   Physical-removal confirmation and population-event support
============================================================ */

let editID = null;
let isSavingSale = false;


/* ============================================================
   1. USER AND FARM INFORMATION
============================================================ */

function getLoggedUser() {
    try {
        const storedUser = localStorage.getItem("loggedInUser");

        return storedUser ? JSON.parse(storedUser) : null;
    } catch (error) {
        console.error("Unable to read logged-in user:", error);
        return null;
    }
}


function getFarmID() {
    const user = getLoggedUser();

    return user && user.farm_id ? user.farm_id : null;
}


async function getRegisteredFarmName() {
    try {
        const user = getLoggedUser();

        if (!user) {
            return "Unknown Farm";
        }

        if (user.farm_name) {
            return user.farm_name;
        }

        const { data: sessionData, error: sessionError } =
            await supabase.auth.getSession();

        if (sessionError || !sessionData.session) {
            return "Unknown Farm";
        }

        const authUserId = sessionData.session.user.id;

        const { data: userData, error: userError } =
            await supabase
                .from("users")
                .select("farm_id")
                .eq("auth_user_id", authUserId)
                .maybeSingle();

        if (userError || !userData || !userData.farm_id) {
            return "Unknown Farm";
        }

        const { data: farmData, error: farmError } =
            await supabase
                .from("farms")
                .select("farm_name")
                .eq("id", userData.farm_id)
                .maybeSingle();

        if (farmError || !farmData) {
            return "Unknown Farm";
        }

        return farmData.farm_name || "Unknown Farm";

    } catch (error) {
        console.error("Error retrieving farm name:", error);
        return "Unknown Farm";
    }
}


/* ============================================================
   2. PERMISSION CHECKS
============================================================ */

function checkSalesPermission(action) {
    try {
        if (action === "add" && typeof canAdd === "function") {
            return canAdd("Sales");
        }

        if (action === "edit" && typeof canEdit === "function") {
            return canEdit("Sales");
        }

        if (action === "delete" && typeof canDelete === "function") {
            return canDelete("Sales");
        }

        if (action === "view" && typeof canView === "function") {
            return canView("Sales");
        }

        if (action === "report" && typeof canReport === "function") {
            return canReport("Sales");
        }

        return false;

    } catch (error) {
        console.error("Sales permission check failed:", error);
        return false;
    }
}


/* ============================================================
   3. ACTIVITY LOGGING
============================================================ */

async function recordSalesActivity(action, description) {
    try {
        if (typeof logActivity === "function") {
            await logActivity(
                "Sales",
                action,
                description
            );
        } else {
            console.warn(
                "Activity logging function is unavailable."
            );
        }
    } catch (error) {
        console.error("Sales activity logging failed:", error);
    }
}


/* ============================================================
   4. GENERAL HELPERS
============================================================ */

function getTodayDate() {
    const now = new Date();

    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, "0");
    const day = String(now.getDate()).padStart(2, "0");

    return `${year}-${month}-${day}`;
}


function escapeHTML(value) {
    return String(value ?? "").replace(/[&<>"']/g, function (character) {
        const entities = {
            "&": "&amp;",
            "<": "&lt;",
            ">": "&gt;",
            '"': "&quot;",
            "'": "&#039;"
        };

        return entities[character];
    });
}


function getInputValue(id) {
    const element = document.getElementById(id);

    return element ? element.value.trim() : "";
}


function getNumericValue(id) {
    const value = getInputValue(id);

    if (value === "") {
        return 0;
    }

    const number = Number(value);

    return Number.isFinite(number) ? number : NaN;
}


function formatMoney(value) {
    const amount = Number(value) || 0;

    return "K" + amount.toLocaleString("en-ZM", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    });
}


function formatDate(value) {
    if (!value) {
        return "";
    }

    const datePart = String(value).split("T")[0];
    const parts = datePart.split("-");

    if (parts.length !== 3) {
        return escapeHTML(value);
    }

    return `${parts[2]}/${parts[1]}/${parts[0]}`;
}


/* ============================================================
   5. CALCULATE TOTAL SALE AMOUNT

   Preserves the existing calculation:
   Weight x Price per kg
============================================================ */

function calculateTotalAmount() {
    const weight = getNumericValue("weight");
    const pricePerKg = getNumericValue("pricePerKg");

    const totalElement = document.getElementById("totalAmount");

    if (!totalElement) {
        return;
    }

    if (
        !Number.isFinite(weight) ||
        !Number.isFinite(pricePerKg)
    ) {
        totalElement.value = "";
        return;
    }

    const total = weight * pricePerKg;

    totalElement.value = total.toFixed(2);
}


/* ============================================================
   6. PHYSICAL-REMOVAL CONFIRMATION
============================================================ */

function updateRemovalDateField() {
    const removalSelect =
        document.getElementById("removedFromFarm");

    const removalDate =
        document.getElementById("removalDate");

    const saleDate =
        document.getElementById("saleDate");

    if (!removalSelect || !removalDate) {
        return;
    }

    const pigsRemoved = removalSelect.value === "true";

    removalDate.disabled = !pigsRemoved;
    removalDate.required = pigsRemoved;

    if (pigsRemoved) {
        if (!removalDate.value) {
            removalDate.value =
                (saleDate && saleDate.value) || getTodayDate();
        }
    } else {
        removalDate.value = "";
    }
}


function getRemovalDetails() {
    const removalSelect =
        document.getElementById("removedFromFarm");

    const removalDate =
        document.getElementById("removalDate");

    const removedFromFarm =
        !!removalSelect &&
        removalSelect.value === "true";

    const removalDateValue =
        removalDate && removalDate.value
            ? removalDate.value
            : null;

    return {
        removed_from_farm: removedFromFarm,
        removal_date: removedFromFarm
            ? removalDateValue
            : null
    };
}


function validateRemovalDetails() {
    const removalDetails = getRemovalDetails();

    if (
        removalDetails.removed_from_farm &&
        !removalDetails.removal_date
    ) {
        alert(
            "Please enter the date the pigs physically left the farm."
        );

        document.getElementById("removalDate")?.focus();

        return false;
    }

    return true;
}


function confirmPhysicalRemoval() {
    const removalDetails = getRemovalDetails();

    if (!removalDetails.removed_from_farm) {
        return true;
    }

    return confirm(
        "PHYSICAL REMOVAL CONFIRMATION\n\n" +
        "You have indicated that these pigs have physically left the farm.\n\n" +
        "Saving this record will create or update a sale population event " +
        "in the database.\n\n" +
        "Please confirm that the pigs have actually left the farm."
    );
}


/* ============================================================
   7. INITIALISE THE SALES FORM
============================================================ */

document.addEventListener("DOMContentLoaded", function () {
    const weightInput = document.getElementById("weight");
    const priceInput = document.getElementById("pricePerKg");

    if (weightInput) {
        weightInput.addEventListener(
            "input",
            calculateTotalAmount
        );
    }

    if (priceInput) {
        priceInput.addEventListener(
            "input",
            calculateTotalAmount
        );
    }

    const removalSelect =
        document.getElementById("removedFromFarm");

    if (removalSelect) {
        removalSelect.addEventListener(
            "change",
            updateRemovalDateField
        );
    }

    const saleDate =
        document.getElementById("saleDate");

    if (saleDate) {
        saleDate.addEventListener("change", function () {
            const removalSelect =
                document.getElementById("removedFromFarm");

            const removalDate =
                document.getElementById("removalDate");

            if (
                removalSelect &&
                removalSelect.value === "true" &&
                removalDate &&
                !removalDate.value
            ) {
                removalDate.value = saleDate.value;
            }
        });

        if (!saleDate.value) {
            saleDate.value = getTodayDate();
        }
    }

    updateRemovalDateField();
});


/* ============================================================
   8. SAVE A NEW SALE
============================================================ */

async function saveSaleRecord() {
    if (isSavingSale) {
        return;
    }

    if (!checkSalesPermission("add") && editID === null) {
        alert("You do not have permission to add sales records.");
        return;
    }

    if (editID !== null && !checkSalesPermission("edit")) {
        alert("You do not have permission to edit sales records.");
        return;
    }

    const farmID = getFarmID();
    const user = getLoggedUser();

    if (!farmID || !user) {
        alert("Your farm session could not be verified. Please log in again.");
        return;
    }

    if (!validateRemovalDetails()) {
        return;
    }

    if (!confirmPhysicalRemoval()) {
        return;
    }

    const quantity = getNumericValue("quantity");
    const weight = getNumericValue("weight");
    const pricePerKg = getNumericValue("pricePerKg");

    if (
        !Number.isFinite(quantity) ||
        quantity <= 0 ||
        !Number.isInteger(quantity)
    ) {
        alert("Enter a valid whole-number quantity greater than zero.");
        return;
    }

    if (!Number.isFinite(weight) || weight < 0) {
        alert("Enter a valid weight.");
        return;
    }

    if (!Number.isFinite(pricePerKg) || pricePerKg < 0) {
        alert("Enter a valid price per kilogram.");
        return;
    }

    const saleDate = getInputValue("saleDate");

    if (!saleDate) {
        alert("Please enter the sale date.");
        return;
    }

    const userIdentifier =
        user.username ||
        user.full_name ||
        user.id ||
        "Unknown User";

    const removalDetails = getRemovalDetails();

    const totalAmount = weight * pricePerKg;

    const saleData = {
        sale_date: saleDate,
        pig_id: getInputValue("pigID"),
        breed: getInputValue("breed"),
        category: getInputValue("category"),
        quantity: quantity,
        weight: weight,
        price_per_kg: pricePerKg,
        total_amount: totalAmount,
        buyer_name: getInputValue("buyerName"),
        buyer_contact: getInputValue("buyerContact"),
        payment_method: getInputValue("paymentMethod"),
        payment_status: getInputValue("paymentStatus"),
        responsible_person: getInputValue("responsiblePerson"),
        remarks: getInputValue("remarks"),

        // PHYSICAL REMOVAL FIELDS
        removed_from_farm: removalDetails.removed_from_farm,
        removal_date: removalDetails.removal_date,

        updated_by: userIdentifier,
        updated_at: new Date().toISOString()
    };

    isSavingSale = true;

    try {
        let result;

        if (editID !== null) {
            result = await supabase
                .from("sales_records")
                .update(saleData)
                .eq("id", editID)
                .eq("farm_id", farmID)
                .select();

        } else {
            saleData.farm_id = farmID;

            saleData.record_id = "SALE-" + Date.now();

            saleData.created_by = userIdentifier;
            saleData.created_at = new Date().toISOString();

            result = await supabase
                .from("sales_records")
                .insert([saleData])
                .select();
        }

        if (result.error) {
            console.error("Sales save error:", result.error);

            alert(
                "Unable to save the sales record.\n\n" +
                result.error.message
            );

            return;
        }

        if (!result.data || result.data.length === 0) {
            alert(
                "No sales record was returned. Check your database permissions."
            );

            return;
        }

        const savedSale = result.data[0];

        const action = editID !== null ? "UPDATE" : "INSERT";

        await recordSalesActivity(
            action,
            "Sales record " +
            (savedSale.record_id || savedSale.id) +
            " saved. Quantity: " +
            quantity +
            ". Physical removal: " +
            (removalDetails.removed_from_farm ? "Yes" : "No") +
            "."
        );

        const farmName = await getRegisteredFarmName();

        alert(
            "Sales record saved successfully.\n\n" +
            "Farm: " + farmName + "\n" +
            "Quantity: " + quantity + "\n" +
            "Physical removal confirmed: " +
            (removalDetails.removed_from_farm ? "Yes" : "No") +
            (
                removalDetails.removed_from_farm
                    ? "\nRemoval date: " +
                      removalDetails.removal_date
                    : ""
            )
        );

        clearSaleForm();

        await loadSalesRecords();

    } catch (error) {
        console.error("Unexpected sales error:", error);

        alert(
            "An unexpected error occurred while saving the sale."
        );

    } finally {
        isSavingSale = false;
    }
}


/* ============================================================
   9. LOAD SALES RECORDS FOR THE CURRENT FARM
============================================================ */

async function loadSalesRecords() {
    if (!checkSalesPermission("view")) {
        const tableBody =
            document.querySelector("#salesTable tbody");

        if (tableBody) {
            tableBody.innerHTML =
                '<tr><td colspan="14">' +
                'You do not have permission to view sales records.' +
                '</td></tr>';
        }

        return;
    }

    const farmID = getFarmID();

    if (!farmID) {
        console.error("Farm ID is missing.");

        return;
    }

    try {
        const { data, error } = await supabase
            .from("sales_records")
            .select("*")
            .eq("farm_id", farmID)
            .order("id", { ascending: false });

        if (error) {
            console.error("Unable to load sales records:", error);

            alert("Unable to load sales records: " + error.message);

            return;
        }

        displaySalesRecords(data || []);

    } catch (error) {
        console.error("Sales loading error:", error);
    }
}


/* ============================================================
   10. DISPLAY SALES RECORDS
============================================================ */

function displaySalesRecords(records) {
    const tableBody =
        document.querySelector("#salesTable tbody");

    if (!tableBody) {
        console.error("Sales table body was not found.");
        return;
    }

    if (!records.length) {
        tableBody.innerHTML =
            '<tr><td colspan="14">No sales records found.</td></tr>';

        return;
    }

    tableBody.innerHTML = records.map(function (sale) {
        const removed = sale.removed_from_farm === true;

        let removalStatus = removed
            ? "Yes — " + formatDate(sale.removal_date)
            : "No";

        let actions = "";

        if (checkSalesPermission("edit")) {
            actions +=
                '<button type="button" onclick="editSale(' +
                Number(sale.id) +
                ')">Edit</button> ';
        }

        if (checkSalesPermission("delete")) {
            actions +=
                '<button type="button" onclick="deleteSale(' +
                Number(sale.id) +
                ')">Delete</button>';
        }

        return `
            <tr>
                <td>${escapeHTML(sale.record_id || sale.id)}</td>
                <td>${escapeHTML(formatDate(sale.sale_date))}</td>
                <td>${escapeHTML(sale.pig_id)}</td>
                <td>${escapeHTML(sale.breed)}</td>
                <td>${escapeHTML(sale.category)}</td>
                <td>${escapeHTML(sale.quantity)}</td>
                <td>${escapeHTML(sale.weight)}</td>
                <td>${escapeHTML(formatMoney(sale.price_per_kg))}</td>
                <td>${escapeHTML(formatMoney(sale.total_amount))}</td>
                <td>${escapeHTML(sale.buyer_name)}</td>
                <td>${escapeHTML(sale.buyer_contact)}</td>
                <td>${escapeHTML(sale.payment_status)}</td>
                <td>${escapeHTML(removalStatus)}</td>
                <td>${actions}</td>
            </tr>
        `;
    }).join("");
}


/* ============================================================
   11. EDIT A SALE
============================================================ */

async function editSale(id) {
    if (!checkSalesPermission("edit")) {
        alert("You do not have permission to edit sales records.");
        return;
    }

    const farmID = getFarmID();

    if (!farmID) {
        alert("Farm information is missing. Please log in again.");
        return;
    }

    try {
        const { data, error } = await supabase
            .from("sales_records")
            .select("*")
            .eq("id", id)
            .eq("farm_id", farmID)
            .maybeSingle();

        if (error || !data) {
            alert(
                "Unable to find this sales record for your farm."
            );

            console.error("Edit sale error:", error);

            return;
        }

        editID = data.id;

        setInputValue("recordID", data.record_id);
        setInputValue("saleDate", data.sale_date);
        setInputValue("pigID", data.pig_id);
        setInputValue("breed", data.breed);
        setInputValue("category", data.category);
        setInputValue("quantity", data.quantity);
        setInputValue("weight", data.weight);
        setInputValue("pricePerKg", data.price_per_kg);
        setInputValue("totalAmount", data.total_amount);
        setInputValue("buyerName", data.buyer_name);
        setInputValue("buyerContact", data.buyer_contact);
        setInputValue("paymentMethod", data.payment_method);
        setInputValue("paymentStatus", data.payment_status);
        setInputValue("responsiblePerson", data.responsible_person);
        setInputValue("remarks", data.remarks);

        const removalSelect =
            document.getElementById("removedFromFarm");

        if (removalSelect) {
            removalSelect.value =
                data.removed_from_farm === true
                    ? "true"
                    : "false";
        }

        setInputValue("removalDate", data.removal_date);

        updateRemovalDateField();

        calculateTotalAmount();

        const saveButton =
            document.querySelector(
                'button[onclick*="saveSaleRecord"]'
            );

        if (saveButton) {
            saveButton.textContent = "Update Sale";
        }

        const form = document.querySelector("form");

        if (form) {
            form.scrollIntoView({
                behavior: "smooth",
                block: "start"
            });
        }

    } catch (error) {
        console.error("Edit sale error:", error);

        alert("An error occurred while opening the sales record.");
    }
}


function setInputValue(id, value) {
    const element = document.getElementById(id);

    if (element) {
        element.value = value ?? "";
    }
}


/* ============================================================
   12. UPDATE A SALE
============================================================ */

async function updateSaleRecord() {
    if (editID === null) {
        alert("Please select a sales record to update.");
        return;
    }

    await saveSaleRecord();
}


/* ============================================================
   13. DELETE A SALE
============================================================ */

async function deleteSale(id) {
    if (!checkSalesPermission("delete")) {
        alert("You do not have permission to delete sales records.");
        return;
    }

    const farmID = getFarmID();

    if (!farmID) {
        alert("Farm information is missing. Please log in again.");
        return;
    }

    const confirmed = confirm(
        "Are you sure you want to delete this sales record?\n\n" +
        "If this record has a linked population event, the database " +
        "trigger is configured to remove that linked event as well."
    );

    if (!confirmed) {
        return;
    }

    try {
        const { data, error } = await supabase
            .from("sales_records")
            .delete()
            .eq("id", id)
            .eq("farm_id", farmID)
            .select();

        if (error) {
            console.error("Delete sale error:", error);

            alert("Unable to delete the sales record: " + error.message);

            return;
        }

        if (!data || data.length === 0) {
            alert(
                "The record was not deleted. It may not belong to your farm."
            );

            return;
        }

        await recordSalesActivity(
            "DELETE",
            "Deleted sales record " +
            (data[0].record_id || data[0].id)
        );

        alert("Sales record deleted successfully.");

        if (editID !== null && Number(editID) === Number(id)) {
            clearSaleForm();
        }

        await loadSalesRecords();

    } catch (error) {
        console.error("Delete sale error:", error);

        alert("An unexpected error occurred while deleting the record.");
    }
}


/* ============================================================
   14. SEARCH SALES RECORDS
============================================================ */

async function searchSaleRecord() {
    if (!checkSalesPermission("view")) {
        alert("You do not have permission to search sales records.");
        return;
    }

    const searchValue = prompt(
        "Enter the Pig ID or sale record ID to search:"
    );

    if (searchValue === null || !searchValue.trim()) {
        return;
    }

    const farmID = getFarmID();

    if (!farmID) {
        alert("Farm information is missing.");
        return;
    }

    const searchTerm = searchValue.trim();

    try {
        const { data, error } = await supabase
            .from("sales_records")
            .select("*")
            .eq("farm_id", farmID)
            .or(
                "pig_id.eq." +
                searchTerm.replace(/[(),]/g, "") +
                ",record_id.eq." +
                searchTerm.replace(/[(),]/g, "")
            )
            .order("id", { ascending: false });

        if (error) {
            console.error("Search error:", error);

            alert("Unable to search sales records: " + error.message);

            return;
        }

        if (!data || data.length === 0) {
            alert("No matching sales records were found.");
            return;
        }

        displaySalesRecords(data);

        if (data.length === 1 && checkSalesPermission("edit")) {
            const openRecord = confirm(
                "One matching record was found.\n\n" +
                "Would you like to open it for editing?"
            );

            if (openRecord) {
                await editSale(data[0].id);
            }
        }

    } catch (error) {
        console.error("Search sale error:", error);

        alert("An unexpected error occurred during the search.");
    }
}


/* ============================================================
   15. GENERATE SALES REPORT
============================================================ */

async function generateSalesReport() {
    if (!checkSalesPermission("report")) {
        alert("You do not have permission to generate sales reports.");
        return;
    }

    const farmID = getFarmID();

    if (!farmID) {
        alert("Farm information is missing.");
        return;
    }

    try {
        const { data, error } = await supabase
            .from("sales_records")
            .select("*")
            .eq("farm_id", farmID)
            .order("sale_date", { ascending: false });

        if (error) {
            alert("Unable to generate report: " + error.message);
            return;
        }

        const records = data || [];

        const totalRecords = records.length;

        const totalQuantity = records.reduce(function (sum, sale) {
            return sum + (Number(sale.quantity) || 0);
        }, 0);

        const totalWeight = records.reduce(function (sum, sale) {
            return sum + (Number(sale.weight) || 0);
        }, 0);

        const totalSales = records.reduce(function (sum, sale) {
            return sum + (Number(sale.total_amount) || 0);
        }, 0);

        const farmName = await getRegisteredFarmName();

        const rows = records.map(function (sale) {
            return `
                <tr>
                    <td>${escapeHTML(sale.record_id || sale.id)}</td>
                    <td>${escapeHTML(formatDate(sale.sale_date))}</td>
                    <td>${escapeHTML(sale.pig_id)}</td>
                    <td>${escapeHTML(sale.category)}</td>
                    <td>${escapeHTML(sale.quantity)}</td>
                    <td>${escapeHTML(sale.weight)}</td>
                    <td>${escapeHTML(formatMoney(sale.total_amount))}</td>
                    <td>${sale.removed_from_farm === true ? "Yes" : "No"}</td>
                    <td>${escapeHTML(formatDate(sale.removal_date))}</td>
                </tr>
            `;
        }).join("");

        const reportWindow = window.open("", "_blank");

        if (!reportWindow) {
            alert(
                "The report window was blocked. Allow pop-ups and try again."
            );

            return;
        }

        reportWindow.document.write(`
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="UTF-8">
                <title>Sales Report</title>
                <style>
                    body {
                        font-family: Arial, sans-serif;
                        margin: 25px;
                        color: #222;
                    }

                    h1, h2 {
                        text-align: center;
                    }

                    .summary {
                        margin: 20px 0;
                        padding: 15px;
                        border: 1px solid #ccc;
                    }

                    table {
                        width: 100%;
                        border-collapse: collapse;
                    }

                    th, td {
                        border: 1px solid #ccc;
                        padding: 7px;
                        text-align: left;
                        font-size: 12px;
                    }

                    th {
                        background: #e8f1e8;
                    }

                    @media print {
                        button {
                            display: none;
                        }
                    }
                </style>
            </head>
            <body>
                <h1>MUNKA PIGGERY MANAGEMENT SYSTEM</h1>
                <h2>Sales Report</h2>

                <p><strong>Farm:</strong> ${escapeHTML(farmName)}</p>
                <p><strong>Report date:</strong> ${escapeHTML(getTodayDate())}</p>

                <div class="summary">
                    <p><strong>Total sales records:</strong> ${totalRecords}</p>
                    <p><strong>Total quantity sold:</strong> ${totalQuantity}</p>
                    <p><strong>Total recorded weight:</strong> ${totalWeight.toLocaleString("en-ZM")}</p>
                    <p><strong>Total sales amount:</strong> ${escapeHTML(formatMoney(totalSales))}</p>
                </div>

                <table>
                    <thead>
                        <tr>
                            <th>Record ID</th>
                            <th>Sale Date</th>
                            <th>Pig ID</th>
                            <th>Category</th>
                            <th>Quantity</th>
                            <th>Weight</th>
                            <th>Total</th>
                            <th>Removed?</th>
                            <th>Removal Date</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${rows}
                    </tbody>
                </table>

                <br>
                <button onclick="window.print()">Print Report</button>
            </body>
            </html>
        `);

        reportWindow.document.close();

    } catch (error) {
        console.error("Sales report error:", error);

        alert("An error occurred while generating the sales report.");
    }
}


/* ============================================================
   16. DOWNLOAD SALES REPORT AS PDF
============================================================ */

async function downloadSalesPDF() {
    if (!checkSalesPermission("report")) {
        alert("You do not have permission to download sales reports.");
        return;
    }

    if (!window.jspdf || !window.jspdf.jsPDF) {
        alert(
            "The PDF library could not be loaded. Check your internet connection and refresh the page."
        );

        return;
    }

    const farmID = getFarmID();

    if (!farmID) {
        alert("Farm information is missing.");
        return;
    }

    try {
        const { data, error } = await supabase
            .from("sales_records")
            .select("*")
            .eq("farm_id", farmID)
            .order("sale_date", { ascending: false });

        if (error) {
            alert("Unable to download PDF: " + error.message);
            return;
        }

        const records = data || [];

        const farmName = await getRegisteredFarmName();

        const { jsPDF } = window.jspdf;

        const doc = new jsPDF({
            orientation: "landscape"
        });

        doc.setFontSize(16);

        doc.text(
            "MUNKA PIGGERY MANAGEMENT SYSTEM",
            14,
            15
        );

        doc.setFontSize(12);

        doc.text("Sales Report", 14, 23);

        doc.setFontSize(10);

        doc.text("Farm: " + farmName, 14, 30);

        doc.text(
            "Generated: " + getTodayDate(),
            14,
            36
        );

        const totalQuantity = records.reduce(function (sum, sale) {
            return sum + (Number(sale.quantity) || 0);
        }, 0);

        const totalSales = records.reduce(function (sum, sale) {
            return sum + (Number(sale.total_amount) || 0);
        }, 0);

        doc.text(
            "Total quantity: " + totalQuantity,
            14,
            43
        );

        doc.text(
            "Total sales: " + formatMoney(totalSales),
            100,
            43
        );

        if (typeof doc.autoTable !== "function") {
            alert(
                "The PDF table library could not be loaded. Refresh the page and try again."
            );

            return;
        }

        doc.autoTable({
            startY: 49,

            head: [[
                "Record ID",
                "Sale Date",
                "Pig ID",
                "Breed",
                "Category",
                "Quantity",
                "Weight",
                "Price/kg",
                "Total",
                "Buyer",
                "Payment",
                "Removed?",
                "Removal Date"
            ]],

            body: records.map(function (sale) {
                return [
                    sale.record_id || sale.id,
                    formatDate(sale.sale_date),
                    sale.pig_id || "",
                    sale.breed || "",
                    sale.category || "",
                    sale.quantity || 0,
                    sale.weight || 0,
                    formatMoney(sale.price_per_kg),
                    formatMoney(sale.total_amount),
                    sale.buyer_name || "",
                    sale.payment_status || "",
                    sale.removed_from_farm === true ? "Yes" : "No",
                    formatDate(sale.removal_date)
                ];
            }),

            styles: {
                fontSize: 7,
                cellPadding: 2
            },

            headStyles: {
                fillColor: [30, 100, 50]
            }
        });

        doc.save("MUNKA_PIGGERY_Sales_Report.pdf");

    } catch (error) {
        console.error("Sales PDF error:", error);

        alert("An error occurred while creating the PDF.");
    }
}


/* ============================================================
   17. CLEAR THE SALES FORM
============================================================ */

function clearSaleForm() {
    editID = null;

    const form = document.querySelector("form");

    if (form) {
        form.reset();
    }

    const recordID = document.getElementById("recordID");

    if (recordID) {
        recordID.value = "";
    }

    const saleDate = document.getElementById("saleDate");

    if (saleDate) {
        saleDate.value = getTodayDate();
    }

    const removalSelect =
        document.getElementById("removedFromFarm");

    if (removalSelect) {
        removalSelect.value = "false";
    }

    const removalDate =
        document.getElementById("removalDate");

    if (removalDate) {
        removalDate.value = "";
        removalDate.disabled = true;
        removalDate.required = false;
    }

    const saveButton =
        document.querySelector(
            'button[onclick*="saveSaleRecord"]'
        );

    if (saveButton) {
        saveButton.textContent = "Save Sale";
    }

    calculateTotalAmount();

    updateRemovalDateField();
}


/* ============================================================
   18. LOAD SALES WHEN THE PAGE OPENS
============================================================ */

window.addEventListener("load", function () {
    loadSalesRecords();
});


/* ============================================================
   END OF SALES MODULE
============================================================ */