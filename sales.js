/* ============================================================
   MUNKA PIGGERY MANAGEMENT SYSTEM
   SALES MANAGEMENT MODULE
   Complete updated version
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
        console.error("Farm name error:", error);
        return "Unknown Farm";
    }
}


/* ============================================================
   2. PERMISSIONS
============================================================ */

function checkSalesPermission(action) {
    try {
        if (action === "add") {
            return typeof canAdd === "function" && canAdd("Sales");
        }

        if (action === "edit") {
            return typeof canEdit === "function" && canEdit("Sales");
        }

        if (action === "delete") {
            return typeof canDelete === "function" && canDelete("Sales");
        }

        if (action === "view") {
            return typeof canView === "function" && canView("Sales");
        }

        if (action === "report") {
            return typeof canReport === "function" && canReport("Sales");
        }

        return false;

    } catch (error) {
        console.error("Permission check error:", error);
        return false;
    }
}


/* ============================================================
   3. ACTIVITY LOGGING
============================================================ */

async function recordSalesActivity(action, description) {
    try {
        if (typeof logActivity === "function") {
            await logActivity("Sales", action, description);
        }
    } catch (error) {
        console.error("Activity logging error:", error);
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


function setInputValue(id, value) {
    const element = document.getElementById(id);

    if (element) {
        element.value = value ?? "";
    }
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

    const parts = String(value).split("T")[0].split("-");

    if (parts.length !== 3) {
        return String(value);
    }

    return `${parts[2]}/${parts[1]}/${parts[0]}`;
}


/* ============================================================
   5. CALCULATE TOTAL AMOUNT

   Preserves the existing calculation:
   Weight x Price per kg
============================================================ */

function calculateTotalAmount() {
    const weight = getNumericValue("weight");
    const price = getNumericValue("pricePerKg");

    const totalField = document.getElementById("totalAmount");

    if (!totalField) {
        return;
    }

    if (
        !Number.isFinite(weight) ||
        !Number.isFinite(price)
    ) {
        totalField.value = "";
        return;
    }

    totalField.value = (weight * price).toFixed(2);
}


/* ============================================================
   6. PHYSICAL REMOVAL CONFIRMATION
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

    const removed = removalSelect.value === "true";

    removalDate.disabled = !removed;
    removalDate.required = removed;

    if (removed && !removalDate.value) {
        removalDate.value =
            (saleDate && saleDate.value) || getTodayDate();
    }

    if (!removed) {
        removalDate.value = "";
    }
}


function getRemovalDetails() {
    const removalSelect =
        document.getElementById("removedFromFarm");

    const removalDate =
        document.getElementById("removalDate");

    const removed =
        !!removalSelect &&
        removalSelect.value === "true";

    return {
        removed_from_farm: removed,
        removal_date: removed && removalDate
            ? removalDate.value || null
            : null
    };
}


function validateRemovalDetails() {
    const details = getRemovalDetails();

    if (details.removed_from_farm && !details.removal_date) {
        alert("Please enter the date the pigs left the farm.");

        document.getElementById("removalDate")?.focus();

        return false;
    }

    return true;
}


function confirmPhysicalRemoval() {
    const details = getRemovalDetails();

    if (!details.removed_from_farm) {
        return true;
    }

    return confirm(
        "PHYSICAL REMOVAL CONFIRMATION\n\n" +
        "Have these pigs actually left the farm?\n\n" +
        "Confirming Yes will create or update the sale population event.\n\n" +
        "Continue only if the pigs have physically left the farm."
    );
}


/* ============================================================
   7. INITIALISE FORM AND BUTTONS

   IMPORTANT:
   The HTML uses <form id="salesForm"> and a submit button.
   This handler connects the Save button to the JavaScript.
============================================================ */

document.addEventListener("DOMContentLoaded", function () {
    const salesForm = document.getElementById("salesForm");

    if (salesForm) {
        salesForm.addEventListener("submit", async function (event) {
            event.preventDefault();
            await saveSaleRecord();
        });
    }

    const weightField = document.getElementById("weight");
    const priceField = document.getElementById("pricePerKg");

    if (weightField) {
        weightField.addEventListener("change", calculateTotalAmount);
    }

    if (priceField) {
        priceField.addEventListener("change", calculateTotalAmount);
    }

    const removalSelect =
        document.getElementById("removedFromFarm");

    if (removalSelect) {
        removalSelect.addEventListener(
            "change",
            updateRemovalDateField
        );
    }

    const saleDate = document.getElementById("saleDate");

    if (saleDate && !saleDate.value) {
        saleDate.value = getTodayDate();
    }

    updateRemovalDateField();
});


/* ============================================================
   8. SAVE OR UPDATE A SALE
============================================================ */

async function saveSaleRecord() {
    if (isSavingSale) {
        return;
    }

    const isEditing = editID !== null;

    if (isEditing && !checkSalesPermission("edit")) {
        alert("You do not have permission to update sales records.");
        return;
    }

    if (!isEditing && !checkSalesPermission("add")) {
        alert("You do not have permission to add sales records.");
        return;
    }

    const farmID = getFarmID();
    const user = getLoggedUser();

    if (!farmID || !user) {
        alert("Your farm session is missing. Please log in again.");
        return;
    }

    if (!validateRemovalDetails()) {
        return;
    }

    if (!confirmPhysicalRemoval()) {
        return;
    }

    const saleDate = getInputValue("saleDate");
    const pigID = getInputValue("pigID");
    const breed = getInputValue("breed");
    const category = getInputValue("category");
    const quantity = getNumericValue("quantity");
    const weight = getNumericValue("weight");
    const pricePerKg = getNumericValue("pricePerKg");

    if (!saleDate || !pigID || !breed || !category) {
        alert("Please complete all required sale fields.");
        return;
    }

    if (
        !Number.isFinite(quantity) ||
        quantity <= 0 ||
        !Number.isInteger(quantity)
    ) {
        alert("Please select a valid quantity.");
        return;
    }

    if (!Number.isFinite(weight) || weight <= 0) {
        alert("Please select a valid weight.");
        return;
    }

    if (!Number.isFinite(pricePerKg) || pricePerKg <= 0) {
        alert("Please select a valid price per kilogram.");
        return;
    }

    const userIdentifier =
        user.username ||
        user.full_name ||
        String(user.id || "Unknown User");

    const removalDetails = getRemovalDetails();

    const saleData = {
        sale_date: saleDate,
        pig_id: pigID,
        breed: breed,
        category: category,
        quantity: quantity,
        weight: weight,
        price_per_kg: pricePerKg,
        total_amount: weight * pricePerKg,
        buyer_name: getInputValue("buyerName"),
        buyer_contact: getInputValue("buyerContact"),
        payment_method: getInputValue("paymentMethod"),
        payment_status: getInputValue("paymentStatus"),
        responsible_person: getInputValue("responsiblePerson"),
        remarks: getInputValue("remarks"),

        removed_from_farm: removalDetails.removed_from_farm,
        removal_date: removalDetails.removal_date,

        updated_by: userIdentifier,
        updated_at: new Date().toISOString()
    };

    isSavingSale = true;

    try {
        let result;

        if (isEditing) {
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
                "The sales record could not be saved.\n\n" +
                result.error.message
            );

            return;
        }

        if (!result.data || result.data.length === 0) {
            alert(
                "No record was returned. Check your database permissions."
            );

            return;
        }

        const savedSale = result.data[0];

        await recordSalesActivity(
            isEditing ? "UPDATE" : "INSERT",
            "Sales record " +
            (savedSale.record_id || savedSale.id) +
            "; quantity: " + quantity +
            "; pigs physically removed: " +
            (removalDetails.removed_from_farm ? "Yes" : "No")
        );

        const farmName = await getRegisteredFarmName();

        alert(
            (isEditing ? "Sales record updated" : "Sales record saved") +
            " successfully.\n\nFarm: " + farmName +
            "\nQuantity: " + quantity +
            "\nPigs physically removed: " +
            (removalDetails.removed_from_farm ? "Yes" : "No") +
            (
                removalDetails.removed_from_farm
                    ? "\nRemoval date: " + removalDetails.removal_date
                    : ""
            )
        );

        clearSaleForm();
        await loadSalesRecords();

    } catch (error) {
        console.error("Unexpected sales error:", error);

        alert(
            "An error occurred while saving the sale.\n\n" +
            (error.message || "Please try again.")
        );

    } finally {
        isSavingSale = false;
    }
}


/* ============================================================
   9. UPDATE BUTTON

   The user must first select Edit on a saved record.
============================================================ */

async function updateSaleRecord() {
    if (editID === null) {
        alert(
            "Please select a saved sales record using its Edit button first."
        );
        return;
    }

    await saveSaleRecord();
}


/* ============================================================
   10. LOAD SALES RECORDS
============================================================ */

async function loadSalesRecords() {
    const tableBody = document.getElementById("salesTable");

    if (!tableBody) {
        console.error("Cannot find the sales table body.");
        return;
    }

    if (!checkSalesPermission("view")) {
        tableBody.innerHTML =
            '<tr><td colspan="10">' +
            'You do not have permission to view sales records.' +
            '</td></tr>';

        return;
    }

    const farmID = getFarmID();

    if (!farmID) {
        tableBody.innerHTML =
            '<tr><td colspan="10">Farm session not found. Please log in again.</td></tr>';

        return;
    }

    try {
        const { data, error } = await supabase
            .from("sales_records")
            .select("*")
            .eq("farm_id", farmID)
            .order("id", { ascending: false });

        if (error) {
            console.error("Load sales error:", error);

            tableBody.innerHTML =
                '<tr><td colspan="10">Unable to load sales records.</td></tr>';

            return;
        }

        displaySalesRecords(data || []);

    } catch (error) {
        console.error("Sales loading error:", error);

        tableBody.innerHTML =
            '<tr><td colspan="10">An error occurred while loading records.</td></tr>';
    }
}


/* ============================================================
   11. DISPLAY SALES HISTORY

   The HTML has <tbody id="salesTable">.
   Therefore, use getElementById rather than #salesTable tbody.
============================================================ */

function displaySalesRecords(records) {
    const tableBody = document.getElementById("salesTable");

    if (!tableBody) {
        console.error("Sales table body was not found.");
        return;
    }

    const recordCount = document.getElementById("recordCount");

    if (recordCount) {
        recordCount.textContent = records.length + " Records";
    }

    if (!records.length) {
        tableBody.innerHTML =
            '<tr><td colspan="10">No sales records found.</td></tr>';

        return;
    }

    tableBody.innerHTML = records.map(function (sale) {
        const removed = sale.removed_from_farm === true;

        const removalStatus = removed
            ? "Removed from farm"
            : "Still on farm";

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
                <td>${escapeHTML(formatDate(sale.sale_date))}</td>
                <td>${escapeHTML(sale.pig_id || "")}</td>
                <td>${escapeHTML(sale.breed || "")}</td>
                <td>${escapeHTML(sale.category || "")}</td>
                <td>${escapeHTML(sale.quantity ?? 0)}</td>
                <td>${escapeHTML(sale.weight ?? 0)}</td>
                <td>${escapeHTML(formatMoney(sale.total_amount))}</td>
                <td>${escapeHTML(sale.buyer_name || "")}</td>
                <td>
                    ${escapeHTML(sale.payment_status || "")}
                    <br>
                    <small>${escapeHTML(removalStatus)}</small>
                    ${
                        removed && sale.removal_date
                            ? '<br><small>Removal: ' +
                              escapeHTML(formatDate(sale.removal_date)) +
                              '</small>'
                            : ""
                    }
                </td>
                <td>${actions}</td>
            </tr>
        `;
    }).join("");
}


/* ============================================================
   12. EDIT A SALE
============================================================ */

async function editSale(id) {
    if (!checkSalesPermission("edit")) {
        alert("You do not have permission to edit sales records.");
        return;
    }

    const farmID = getFarmID();

    if (!farmID) {
        alert("Farm session missing. Please log in again.");
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
            console.error("Edit sale error:", error);

            alert("Unable to find that sales record for your farm.");
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
                data.removed_from_farm === true ? "true" : "false";
        }

        setInputValue("removalDate", data.removal_date);

        updateRemovalDateField();
        calculateTotalAmount();

        const updateButton =
            document.querySelector(".update-btn");

        if (updateButton) {
            updateButton.textContent = "✏️ Update Selected Record";
        }

        const form = document.getElementById("salesForm");

        if (form) {
            form.scrollIntoView({
                behavior: "smooth",
                block: "start"
            });
        }

    } catch (error) {
        console.error("Edit sale error:", error);

        alert("Unable to open the sales record.");
    }
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
        alert("Farm session missing. Please log in again.");
        return;
    }

    if (!confirm(
        "Are you sure you want to delete this sales record?\n\n" +
        "The linked sale population event will also be removed " +
        "by the configured database trigger."
    )) {
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

            alert("Unable to delete record: " + error.message);
            return;
        }

        if (!data || data.length === 0) {
            alert("No record was deleted. Check your farm permissions.");
            return;
        }

        await recordSalesActivity(
            "DELETE",
            "Deleted sales record " +
            (data[0].record_id || data[0].id)
        );

        if (editID !== null && Number(editID) === Number(id)) {
            clearSaleForm();
        }

        alert("Sales record deleted successfully.");

        await loadSalesRecords();

    } catch (error) {
        console.error("Delete sale error:", error);

        alert("An error occurred while deleting the record.");
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
        "Enter the Pig ID or Sale Record ID:"
    );

    if (searchValue === null || !searchValue.trim()) {
        return;
    }

    const farmID = getFarmID();

    if (!farmID) {
        alert("Farm session missing.");
        return;
    }

    const term = searchValue.trim();

    try {
        // Fetch only this farm's records.
        // Client-side filtering avoids malformed Supabase OR filters.
        const { data, error } = await supabase
            .from("sales_records")
            .select("*")
            .eq("farm_id", farmID)
            .order("id", { ascending: false });

        if (error) {
            console.error("Sales search error:", error);

            alert("Unable to search records: " + error.message);
            return;
        }

        const matches = (data || []).filter(function (sale) {
            return (
                String(sale.pig_id || "").toLowerCase() === term.toLowerCase() ||
                String(sale.record_id || "").toLowerCase() === term.toLowerCase()
            );
        });

        if (!matches.length) {
            alert("No matching sales records found.");
            return;
        }

        displaySalesRecords(matches);

        if (matches.length === 1 && checkSalesPermission("edit")) {
            if (confirm("One matching record found. Open it for editing?")) {
                await editSale(matches[0].id);
            }
        }

    } catch (error) {
        console.error("Sales search error:", error);

        alert("An error occurred while searching.");
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
        alert("Farm session missing.");
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

        const reportWindow = window.open("", "_blank");

        if (!reportWindow) {
            alert("Allow pop-ups in your browser to open the report.");
            return;
        }

        const rows = records.map(function (sale) {
            return `
                <tr>
                    <td>${escapeHTML(sale.record_id || sale.id)}</td>
                    <td>${escapeHTML(formatDate(sale.sale_date))}</td>
                    <td>${escapeHTML(sale.pig_id || "")}</td>
                    <td>${escapeHTML(sale.category || "")}</td>
                    <td>${escapeHTML(sale.quantity ?? 0)}</td>
                    <td>${escapeHTML(sale.weight ?? 0)}</td>
                    <td>${escapeHTML(formatMoney(sale.total_amount))}</td>
                    <td>${sale.removed_from_farm === true ? "Yes" : "No"}</td>
                    <td>${escapeHTML(formatDate(sale.removal_date))}</td>
                </tr>
            `;
        }).join("");

        reportWindow.document.write(`
            <!DOCTYPE html>
            <html lang="en">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1">
                <title>MUNKA PIGGERY Sales Report</title>
                <style>
                    body {
                        font-family: Arial, sans-serif;
                        margin: 20px;
                        color: #222;
                    }

                    h1, h2 {
                        text-align: center;
                    }

                    .summary {
                        padding: 12px;
                        border: 1px solid #ccc;
                        margin: 20px 0;
                    }

                    .table-wrap {
                        overflow-x: auto;
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
                <h1>MUNKA PIGGERY TECHNOLOGY</h1>
                <h2>Sales Report</h2>

                <p><strong>Farm:</strong> ${escapeHTML(farmName)}</p>
                <p><strong>Report date:</strong> ${escapeHTML(getTodayDate())}</p>

                <div class="summary">
                    <p><strong>Number of records:</strong> ${records.length}</p>
                    <p><strong>Total quantity sold:</strong> ${totalQuantity}</p>
                    <p><strong>Total recorded weight:</strong> ${totalWeight.toLocaleString("en-ZM")} kg</p>
                    <p><strong>Total sales:</strong> ${escapeHTML(formatMoney(totalSales))}</p>
                </div>

                <div class="table-wrap">
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
                        <tbody>${rows}</tbody>
                    </table>
                </div>

                <br>
                <button onclick="window.print()">Print Report</button>
            </body>
            </html>
        `);

        reportWindow.document.close();

    } catch (error) {
        console.error("Sales report error:", error);

        alert("An error occurred while generating the report.");
    }
}


/* ============================================================
   16. DOWNLOAD SALES PDF
============================================================ */

async function downloadSalesPDF() {
    if (!checkSalesPermission("report")) {
        alert("You do not have permission to download sales reports.");
        return;
    }

    if (
        !window.jspdf ||
        typeof window.jspdf.jsPDF !== "function"
    ) {
        alert(
            "The PDF library did not load. Check your internet connection and refresh the page."
        );
        return;
    }

    const farmID = getFarmID();

    if (!farmID) {
        alert("Farm session missing.");
        return;
    }

    try {
        const { data, error } = await supabase
            .from("sales_records")
            .select("*")
            .eq("farm_id", farmID)
            .order("sale_date", { ascending: false });

        if (error) {
            alert("Unable to retrieve records: " + error.message);
            return;
        }

        const records = data || [];
        const farmName = await getRegisteredFarmName();

        const jsPDF = window.jspdf.jsPDF;
        const doc = new jsPDF({ orientation: "landscape" });

        doc.setFontSize(16);
        doc.text("MUNKA PIGGERY TECHNOLOGY", 14, 15);

        doc.setFontSize(12);
        doc.text("Sales Report", 14, 23);

        doc.setFontSize(10);
        doc.text("Farm: " + farmName, 14, 30);
        doc.text("Generated: " + getTodayDate(), 14, 36);

        const totalQuantity = records.reduce(function (sum, sale) {
            return sum + (Number(sale.quantity) || 0);
        }, 0);

        const totalSales = records.reduce(function (sum, sale) {
            return sum + (Number(sale.total_amount) || 0);
        }, 0);

        doc.text("Total quantity: " + totalQuantity, 14, 43);
        doc.text("Total sales: " + formatMoney(totalSales), 100, 43);

        if (typeof doc.autoTable !== "function") {
            alert(
                "The PDF table extension did not load. Refresh the page and try again."
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
                    sale.quantity ?? 0,
                    sale.weight ?? 0,
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

        alert(
            "PDF generation failed.\n\n" +
            (error.message || "Please refresh the page and try again.")
        );
    }
}


/* ============================================================
   17. CLEAR THE FORM
============================================================ */

function clearSaleForm() {
    editID = null;

    const form = document.getElementById("salesForm");

    if (form) {
        form.reset();
    }

    setInputValue("recordID", "");
    setInputValue("saleDate", getTodayDate());

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

    const updateButton =
        document.querySelector(".update-btn");

    if (updateButton) {
        updateButton.textContent = "✏️ Update Record";
    }

    calculateTotalAmount();
    updateRemovalDateField();
}


/* ============================================================
   18. LOAD RECORDS WHEN THE PAGE OPENS
============================================================ */

window.addEventListener("load", function () {
    loadSalesRecords();
});


/* ============================================================
   END OF SALES MANAGEMENT MODULE
============================================================ */