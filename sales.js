/* ============================================================
   MUNKA PIGGERY MANAGEMENT SYSTEM
   SALES MANAGEMENT MODULE
   Complete replacement: sales.js
   Uses supabaseClient from supabase.js
============================================================ */

"use strict";

let editID = null;
let isSavingSale = false;
let salesRecordsCache = [];
let salesInitialized = false;


/* ============================================================
   1. SUPABASE CLIENT
============================================================ */

function getSalesClient() {
    if (
        typeof supabaseClient !== "undefined" &&
        supabaseClient &&
        typeof supabaseClient.from === "function"
    ) {
        return supabaseClient;
    }

    throw new Error(
        "Supabase client unavailable. Check supabase.js and script loading order."
    );
}


/* ============================================================
   2. USER AND FARM INFORMATION
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
        const client = getSalesClient();
        const user = getLoggedUser();

        if (!user || !user.farm_id) {
            return "Unknown Farm";
        }

        const { data, error } = await client
            .from("farms")
            .select("farm_name")
            .eq("id", user.farm_id)
            .maybeSingle();

        if (error) {
            console.warn("Unable to retrieve farm name:", error);
            return "Unknown Farm";
        }

        return data?.farm_name || "Unknown Farm";

    } catch (error) {
        console.error("Farm name error:", error);
        return "Unknown Farm";
    }
}


/* ============================================================
   3. PERMISSIONS
============================================================ */

function checkSalesPermission(action) {
    const user = getLoggedUser();

    if (!user) {
        alert("Please log in before using Sales.");
        return false;
    }

    if (
        String(user.role || "").toLowerCase() === "super admin"
    ) {
        alert("Please open the appropriate farm account.");
        return false;
    }

    const permissionFunctions = {
        add: typeof canAdd === "function" ? canAdd : null,
        edit: typeof canEdit === "function" ? canEdit : null,
        delete: typeof canDelete === "function" ? canDelete : null,
        view: typeof canView === "function" ? canView : null,
        report: typeof canReport === "function" ? canReport : null
    };

    const permissionFunction = permissionFunctions[action];

    // Do not bypass an existing permission system.
    if (!permissionFunction) {
        console.error(
            "Permission function is unavailable for Sales action:",
            action
        );

        alert(
            "Unable to verify your Sales permissions. Please contact your administrator."
        );

        return false;
    }

    try {
        if (!permissionFunction("Sales")) {
            alert(
                "You do not have permission to perform this action in Sales."
            );

            return false;
        }

        return true;

    } catch (error) {
        console.error("Sales permission error:", error);

        alert("Unable to verify your permissions.");
        return false;
    }
}


/* ============================================================
   4. ACTIVITY LOGGING
============================================================ */

async function recordSalesActivity(action, description) {
    try {
        if (typeof logActivity === "function") {
            await logActivity("Sales", action, description);
        }
    } catch (error) {
        console.warn("Activity logging failed:", error);
    }
}


/* ============================================================
   5. GENERAL HELPERS
============================================================ */

function getTodayDate() {
    const parts = new Intl.DateTimeFormat("en-CA", {
        timeZone: "Africa/Lusaka",
        year: "numeric",
        month: "2-digit",
        day: "2-digit"
    }).formatToParts(new Date());

    const date = {};

    parts.forEach(function (part) {
        date[part.type] = part.value;
    });

    return `${date.year}-${date.month}-${date.day}`;
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

    return element ? String(element.value ?? "").trim() : "";
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
    return "K" + (Number(value) || 0).toLocaleString("en-ZM", {
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


function showSalesError(message, error) {
    console.error(message, error || "");

    alert(
        message +
        (error?.message ? "\n\n" + error.message : "")
    );
}


/* ============================================================
   6. CALCULATE TOTAL
   Assumption: weight is the total weight entered for the sale.
============================================================ */

function calculateTotalAmount() {
    const weight = getNumericValue("weight");
    const price = getNumericValue("pricePerKg");
    const field = document.getElementById("totalAmount");

    if (!field) {
        return;
    }

    if (
        !Number.isFinite(weight) ||
        !Number.isFinite(price)
    ) {
        field.value = "";
        return;
    }

    field.value = (weight * price).toFixed(2);
}


/* ============================================================
   7. PHYSICAL REMOVAL CONFIRMATION
============================================================ */

function updateRemovalDateField() {
    const removalSelect = document.getElementById("removedFromFarm");
    const removalDate = document.getElementById("removalDate");
    const saleDate = document.getElementById("saleDate");

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
    const removedSelect = document.getElementById("removedFromFarm");
    const removalDate = document.getElementById("removalDate");

    const removed =
        !!removedSelect && removedSelect.value === "true";

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
        alert("Enter the date the pigs left the farm.");

        document.getElementById("removalDate")?.focus();

        return false;
    }

    const saleDate = getInputValue("saleDate");

    if (
        details.removed_from_farm &&
        details.removal_date < saleDate
    ) {
        alert("The removal date cannot be earlier than the sale date.");
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
        "Confirm only if the pigs have physically left the farm."
    );
}


/* ============================================================
   8. READ AND VALIDATE FORM
============================================================ */

function getSaleFormData() {
    const saleDate = getInputValue("saleDate");
    const pigID = getInputValue("pigID");
    const breed = getInputValue("breed");
    const category = getInputValue("category");
    const quantity = getNumericValue("quantity");
    const weight = getNumericValue("weight");
    const pricePerKg = getNumericValue("pricePerKg");

    if (!saleDate || !pigID || !breed || !category) {
        throw new Error("Please complete all required sale fields.");
    }

    if (!Number.isInteger(quantity) || quantity <= 0) {
        throw new Error("Quantity must be a whole number greater than zero.");
    }

    if (!Number.isFinite(weight) || weight <= 0) {
        throw new Error("Please select a valid weight.");
    }

    if (!Number.isFinite(pricePerKg) || pricePerKg <= 0) {
        throw new Error("Please select a valid price per kilogram.");
    }

    if (!validateRemovalDetails()) {
        throw new Error("Please correct the physical removal details.");
    }

    const removal = getRemovalDetails();

    return {
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
        removed_from_farm: removal.removed_from_farm,
        removal_date: removal.removal_date
    };
}


/* ============================================================
   9. SAVE OR UPDATE SALE
============================================================ */

async function saveSaleRecord() {
    if (isSavingSale) {
        return;
    }

    const editing = editID !== null;

    if (!checkSalesPermission(editing ? "edit" : "add")) {
        return;
    }

    const user = getLoggedUser();
    const farmID = getFarmID();

    if (!user || !farmID) {
        alert("Your farm session is missing. Please log in again.");
        return;
    }

    let saleData;

    try {
        saleData = getSaleFormData();
    } catch (error) {
        alert(error.message);
        return;
    }

    if (!confirmPhysicalRemoval()) {
        return;
    }

    if (!confirm(
        (editing ? "Update" : "Save") + " this sales record?\n\n" +
        "Pig ID: " + saleData.pig_id + "\n" +
        "Quantity: " + saleData.quantity + "\n" +
        "Total: " + formatMoney(saleData.total_amount)
    )) {
        return;
    }

    const client = getSalesClient();

    const userIdentifier =
        user.username ||
        user.full_name ||
        user.id ||
        user.auth_user_id ||
        null;

    saleData.updated_by = userIdentifier;
    saleData.updated_at = new Date().toISOString();

    isSavingSale = true;

    try {
        let result;

        if (editing) {
            result = await client
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

            result = await client
                .from("sales_records")
                .insert([saleData])
                .select();
        }

        if (result.error) {
            throw result.error;
        }

        if (!result.data || result.data.length === 0) {
            throw new Error(
                "No record was returned. Check your database permissions."
            );
        }

        const savedRecord = result.data[0];

        await recordSalesActivity(
            editing ? "UPDATE" : "INSERT",
            "Sales record " +
            (savedRecord.record_id || savedRecord.id)
        );

        alert(
            (editing ? "Sales record updated" : "Sales record saved") +
            " successfully."
        );

        clearSaleForm();

        await loadSalesRecords();

    } catch (error) {
        showSalesError("Unable to save the sales record.", error);

    } finally {
        isSavingSale = false;
    }
}


async function updateSaleRecord() {
    if (editID === null) {
        alert(
            "Select a saved record using its Edit button before updating."
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
        console.error("Sales table body not found.");
        return;
    }

    if (!checkSalesPermission("view")) {
        tableBody.innerHTML =
            '<tr><td colspan="10">You do not have permission to view sales.</td></tr>';

        return;
    }

    const farmID = getFarmID();

    if (!farmID) {
        tableBody.innerHTML =
            '<tr><td colspan="10">Farm session missing. Please log in again.</td></tr>';

        return;
    }

    try {
        const { data, error } = await getSalesClient()
            .from("sales_records")
            .select("*")
            .eq("farm_id", farmID)
            .order("sale_date", { ascending: false });

        if (error) {
            throw error;
        }

        salesRecordsCache = data || [];

        displaySalesRecords(salesRecordsCache);

    } catch (error) {
        showSalesError("Unable to load sales records.", error);
    }
}


/* ============================================================
   11. DISPLAY SALES RECORDS
============================================================ */

function displaySalesRecords(records) {
    const tableBody = document.getElementById("salesTable");

    if (!tableBody) {
        return;
    }

    if (!Array.isArray(records) || records.length === 0) {
        tableBody.innerHTML =
            '<tr><td colspan="10">No sales records found.</td></tr>';
    } else {
        tableBody.innerHTML = records.map(function (sale) {
            const removed = sale.removed_from_farm === true;

            let actions = "";

            if (checkSalesPermission("edit")) {
                actions +=
                    '<button type="button" onclick="editSale(' +
                    JSON.stringify(String(sale.id)) +
                    ')">Edit</button> ';
            }

            if (checkSalesPermission("delete")) {
                actions +=
                    '<button type="button" onclick="deleteSale(' +
                    JSON.stringify(String(sale.id)) +
                    ')">Delete</button>';
            }

            return `
                <tr>
                    <td>${escapeHTML(formatDate(sale.sale_date))}</td>
                    <td>${escapeHTML(sale.pig_id)}</td>
                    <td>${escapeHTML(sale.breed)}</td>
                    <td>${escapeHTML(sale.category)}</td>
                    <td>${escapeHTML(sale.quantity)}</td>
                    <td>${escapeHTML(sale.weight)}</td>
                    <td>${escapeHTML(formatMoney(sale.total_amount))}</td>
                    <td>${escapeHTML(sale.buyer_name)}</td>
                    <td>
                        ${escapeHTML(sale.payment_status)}
                        <br>
                        <small>${removed ? "Removed from farm" : "Still on farm"}</small>
                    </td>
                    <td>${actions}</td>
                </tr>
            `;
        }).join("");
    }

    const count = document.getElementById("recordCount");

    if (count) {
        count.textContent = records.length + " Records";
    }
}


/* ============================================================
   12. EDIT SALE
============================================================ */

async function editSale(id) {
    if (!checkSalesPermission("edit")) {
        return;
    }

    const farmID = getFarmID();

    if (!farmID) {
        alert("Farm session missing. Please log in again.");
        return;
    }

    try {
        const { data, error } = await getSalesClient()
            .from("sales_records")
            .select("*")
            .eq("id", id)
            .eq("farm_id", farmID)
            .maybeSingle();

        if (error) {
            throw error;
        }

        if (!data) {
            alert("Sales record not found.");
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
        setInputValue(
            "removedFromFarm",
            data.removed_from_farm === true ? "true" : "false"
        );
        setInputValue("removalDate", data.removal_date);

        updateRemovalDateField();
        calculateTotalAmount();

        const button = document.querySelector(".update-btn");

        if (button) {
            button.textContent = "✏️ Update Selected Record";
        }

        document.getElementById("salesForm")?.scrollIntoView({
            behavior: "smooth",
            block: "start"
        });

    } catch (error) {
        showSalesError("Unable to open the sales record.", error);
    }
}


/* ============================================================
   13. DELETE SALE
============================================================ */

async function deleteSale(id) {
    if (!checkSalesPermission("delete")) {
        return;
    }

    const farmID = getFarmID();

    if (!farmID) {
        alert("Farm session missing.");
        return;
    }

    if (!confirm("Are you sure you want to delete this sales record?")) {
        return;
    }

    try {
        const { data, error } = await getSalesClient()
            .from("sales_records")
            .delete()
            .eq("id", id)
            .eq("farm_id", farmID)
            .select();

        if (error) {
            throw error;
        }

        if (!data || data.length === 0) {
            alert("No record was deleted. Check your permissions.");
            return;
        }

        await recordSalesActivity(
            "DELETE",
            "Deleted sales record " + id
        );

        if (String(editID) === String(id)) {
            clearSaleForm();
        }

        alert("Sales record deleted successfully.");

        await loadSalesRecords();

    } catch (error) {
        showSalesError("Unable to delete the sales record.", error);
    }
}


/* ============================================================
   14. SEARCH SALES
============================================================ */

async function searchSaleRecord() {
    if (!checkSalesPermission("view")) {
        return;
    }

    const searchTerm = prompt(
        "Enter Pig ID or Sale Record ID:"
    );

    if (searchTerm === null || !searchTerm.trim()) {
        return;
    }

    const farmID = getFarmID();

    if (!farmID) {
        alert("Farm session missing.");
        return;
    }

    try {
        const { data, error } = await getSalesClient()
            .from("sales_records")
            .select("*")
            .eq("farm_id", farmID)
            .order("sale_date", { ascending: false });

        if (error) {
            throw error;
        }

        const term = searchTerm.trim().toLowerCase();

        const results = (data || []).filter(function (sale) {
            return (
                String(sale.pig_id || "").toLowerCase().includes(term) ||
                String(sale.record_id || "").toLowerCase().includes(term)
            );
        });

        displaySalesRecords(results);

        if (!results.length) {
            alert("No matching sales records found.");
        }

    } catch (error) {
        showSalesError("Sales search failed.", error);
    }
}


/* ============================================================
   15. GENERATE SALES REPORT
============================================================ */

async function generateSalesReport() {
    if (!checkSalesPermission("report")) {
        return;
    }

    const farmID = getFarmID();

    if (!farmID) {
        alert("Farm session missing.");
        return;
    }

    try {
        const { data, error } = await getSalesClient()
            .from("sales_records")
            .select("*")
            .eq("farm_id", farmID)
            .order("sale_date", { ascending: false });

        if (error) {
            throw error;
        }

        const records = data || [];

        const quantity = records.reduce(function (sum, sale) {
            return sum + (Number(sale.quantity) || 0);
        }, 0);

        const totalSales = records.reduce(function (sum, sale) {
            return sum + (Number(sale.total_amount) || 0);
        }, 0);

        const paidSales = records
            .filter(function (sale) {
                return String(sale.payment_status || "").toLowerCase() === "paid";
            })
            .reduce(function (sum, sale) {
                return sum + (Number(sale.total_amount) || 0);
            }, 0);

        alert(
            "MUNKA PIGGERY SALES REPORT\n\n" +
            "Records: " + records.length + "\n" +
            "Quantity sold: " + quantity + "\n" +
            "Total sales: " + formatMoney(totalSales) + "\n" +
            "Paid sales: " + formatMoney(paidSales) + "\n" +
            "Other payment statuses: " +
            formatMoney(totalSales - paidSales)
        );

    } catch (error) {
        showSalesError("Unable to generate the sales report.", error);
    }
}


/* ============================================================
   16. DOWNLOAD SALES PDF
============================================================ */

async function downloadSalesPDF() {
    if (!checkSalesPermission("report")) {
        return;
    }

    if (
        !window.jspdf ||
        typeof window.jspdf.jsPDF !== "function"
    ) {
        alert("The PDF library did not load. Refresh the page and try again.");
        return;
    }

    const farmID = getFarmID();

    if (!farmID) {
        alert("Farm session missing.");
        return;
    }

    try {
        const { data, error } = await getSalesClient()
            .from("sales_records")
            .select("*")
            .eq("farm_id", farmID)
            .order("sale_date", { ascending: false });

        if (error) {
            throw error;
        }

        const records = data || [];
        const farmName = await getRegisteredFarmName();

        const doc = new window.jspdf.jsPDF({
            orientation: "landscape"
        });

        doc.setFontSize(16);
        doc.text("MUNKA PIGGERY TECHNOLOGY", 14, 15);

        doc.setFontSize(12);
        doc.text("Sales Report", 14, 23);

        doc.setFontSize(9);
        doc.text("Farm: " + farmName, 14, 30);
        doc.text("Generated: " + getTodayDate(), 14, 35);

        if (typeof doc.autoTable !== "function") {
            alert("The PDF table extension did not load. Refresh and retry.");
            return;
        }

        doc.autoTable({
            startY: 40,

            head: [[
                "Date",
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
        showSalesError("Unable to download the sales PDF.", error);
    }
}


/* ============================================================
   17. CLEAR FORM
============================================================ */

function clearSaleForm() {
    editID = null;

    const form = document.getElementById("salesForm");

    if (form) {
        form.reset();
    }

    setInputValue("recordID", "");
    setInputValue("saleDate", getTodayDate());
    setInputValue("removedFromFarm", "false");
    setInputValue("removalDate", "");

    const removalDate = document.getElementById("removalDate");

    if (removalDate) {
        removalDate.disabled = true;
        removalDate.required = false;
    }

    const updateButton = document.querySelector(".update-btn");

    if (updateButton) {
        updateButton.textContent = "✏️ Update Record";
    }

    calculateTotalAmount();
    updateRemovalDateField();
}


/* ============================================================
   18. INITIALIZE SALES MODULE
============================================================ */

function initializeSalesModule() {
    if (salesInitialized) {
        return;
    }

    salesInitialized = true;

    const form = document.getElementById("salesForm");

    if (form) {
        form.addEventListener("submit", async function (event) {
            event.preventDefault();
            await saveSaleRecord();
        });
    }

    document.getElementById("weight")
        ?.addEventListener("change", calculateTotalAmount);

    document.getElementById("pricePerKg")
        ?.addEventListener("change", calculateTotalAmount);

    document.getElementById("removedFromFarm")
        ?.addEventListener("change", updateRemovalDateField);

    const saleDate = document.getElementById("saleDate");

    if (saleDate && !saleDate.value) {
        saleDate.value = getTodayDate();
    }

    updateRemovalDateField();
    calculateTotalAmount();

    loadSalesRecords();
}

if (document.readyState === "loading") {
    document.addEventListener(
        "DOMContentLoaded",
        initializeSalesModule
    );
} else {
    initializeSalesModule();
}

/* ================= END OF SALES MODULE ================= */