// ==========================================
// MUNKA PIGGERY TECHNOLOGY
// FEEDING RECORDS MODULE
// FARM-SECURED VERSION
// CUSTOM NOTIFICATIONS
// CUSTOM DELETE CONFIRMATION
// ==========================================

let editID = null;


// ==========================================
// CUSTOM NOTIFICATION SYSTEM
// ==========================================

function showFeedingNotification(message, type = "success") {

    let container = document.getElementById(
        "munka-feeding-notifications"
    );

    if (!container) {

        container = document.createElement("div");

        container.id = "munka-feeding-notifications";

        container.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            z-index: 999999;
            width: min(380px, calc(100vw - 30px));
            display: flex;
            flex-direction: column;
            gap: 10px;
            pointer-events: none;
        `;

        document.body.appendChild(container);
    }

    const styles = {
        success: {
            background: "#e8f8ee",
            border: "#16a34a",
            color: "#166534",
            icon: "✓"
        },
        error: {
            background: "#fef2f2",
            border: "#dc2626",
            color: "#991b1b",
            icon: "✕"
        },
        warning: {
            background: "#fff7ed",
            border: "#f59e0b",
            color: "#9a3412",
            icon: "!"
        },
        info: {
            background: "#eff6ff",
            border: "#2563eb",
            color: "#1e40af",
            icon: "i"
        }
    };

    const style = styles[type] || styles.info;

    const notification = document.createElement("div");

    notification.style.cssText = `
        display: flex;
        align-items: flex-start;
        gap: 12px;
        padding: 14px 15px;
        border-radius: 10px;
        background: ${style.background};
        border-left: 5px solid ${style.border};
        color: ${style.color};
        box-shadow: 0 6px 22px rgba(0,0,0,0.18);
        font-family: Arial, sans-serif;
        font-size: 14px;
        line-height: 1.5;
        pointer-events: auto;
        opacity: 0;
        transform: translateX(15px);
        transition: opacity 0.25s ease, transform 0.25s ease;
    `;

    const icon = document.createElement("span");

    icon.textContent = style.icon;

    icon.style.cssText = `
        display: flex;
        align-items: center;
        justify-content: center;
        flex-shrink: 0;
        width: 23px;
        height: 23px;
        border-radius: 50%;
        background: ${style.border};
        color: #ffffff;
        font-weight: bold;
        font-size: 14px;
    `;

    const text = document.createElement("div");

    text.textContent = String(message);

    text.style.cssText = `
        flex: 1;
        overflow-wrap: anywhere;
        white-space: pre-line;
    `;

    const closeButton = document.createElement("button");

    closeButton.type = "button";
    closeButton.textContent = "×";
    closeButton.setAttribute("aria-label", "Close notification");

    closeButton.style.cssText = `
        border: none;
        background: transparent;
        color: ${style.color};
        font-size: 22px;
        line-height: 1;
        cursor: pointer;
        padding: 0;
        margin-left: 3px;
    `;

    notification.appendChild(icon);
    notification.appendChild(text);
    notification.appendChild(closeButton);

    container.appendChild(notification);

    requestAnimationFrame(function () {

        notification.style.opacity = "1";
        notification.style.transform = "translateX(0)";

    });

    let dismissed = false;

    function removeNotification() {

        if (dismissed) return;

        dismissed = true;

        notification.style.opacity = "0";
        notification.style.transform = "translateX(15px)";

        setTimeout(function () {

            notification.remove();

            if (
                container &&
                container.children.length === 0
            ) {
                container.remove();
            }

        }, 300);
    }

    closeButton.addEventListener(
        "click",
        removeNotification
    );

    setTimeout(
        removeNotification,
        type === "error" ? 6000 : 5000
    );
}


// ==========================================
// CUSTOM CONFIRMATION DIALOG
// ==========================================

function showFeedingConfirmation(message) {

    return new Promise(function (resolve) {

        const overlay = document.createElement("div");

        overlay.style.cssText = `
            position: fixed;
            inset: 0;
            z-index: 1000000;
            background: rgba(0, 0, 0, 0.55);
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 20px;
        `;

        const dialog = document.createElement("div");

        dialog.style.cssText = `
            width: min(420px, 100%);
            background: #ffffff;
            border-radius: 14px;
            padding: 24px;
            box-shadow: 0 15px 45px rgba(0,0,0,0.25);
            font-family: Arial, sans-serif;
        `;

        const heading = document.createElement("h3");

        heading.textContent = "Confirm Action";

        heading.style.cssText = `
            margin: 0 0 12px;
            color: #166534;
            font-size: 20px;
        `;

        const messageElement = document.createElement("p");

        messageElement.textContent = message;

        messageElement.style.cssText = `
            margin: 0 0 22px;
            color: #374151;
            font-size: 15px;
            line-height: 1.6;
        `;

        const buttons = document.createElement("div");

        buttons.style.cssText = `
            display: flex;
            justify-content: flex-end;
            gap: 10px;
            flex-wrap: wrap;
        `;

        const cancelButton = document.createElement("button");

        cancelButton.type = "button";
        cancelButton.textContent = "Cancel";

        cancelButton.style.cssText = `
            padding: 10px 17px;
            border: 1px solid #d1d5db;
            border-radius: 7px;
            background: #f3f4f6;
            color: #374151;
            cursor: pointer;
            font-weight: 600;
        `;

        const confirmButton = document.createElement("button");

        confirmButton.type = "button";
        confirmButton.textContent = "Delete";

        confirmButton.style.cssText = `
            padding: 10px 17px;
            border: none;
            border-radius: 7px;
            background: #dc2626;
            color: #ffffff;
            cursor: pointer;
            font-weight: 600;
        `;

        buttons.appendChild(cancelButton);
        buttons.appendChild(confirmButton);

        dialog.appendChild(heading);
        dialog.appendChild(messageElement);
        dialog.appendChild(buttons);

        overlay.appendChild(dialog);

        document.body.appendChild(overlay);

        let finished = false;

        function finish(result) {

            if (finished) return;

            finished = true;

            document.removeEventListener(
                "keydown",
                escapeHandler
            );

            overlay.remove();

            resolve(result);
        }

        function escapeHandler(event) {

            if (event.key === "Escape") {
                finish(false);
            }
        }

        cancelButton.addEventListener(
            "click",
            function () {
                finish(false);
            }
        );

        confirmButton.addEventListener(
            "click",
            function () {
                finish(true);
            }
        );

        overlay.addEventListener(
            "click",
            function (event) {

                if (event.target === overlay) {
                    finish(false);
                }

            }
        );

        document.addEventListener(
            "keydown",
            escapeHandler
        );

        confirmButton.focus();

    });
}


// ==========================================
// GET LOGGED-IN USER
// ==========================================

function getLoggedUser() {

    try {

        const loggedUser = JSON.parse(
            localStorage.getItem("loggedInUser")
        );

        return loggedUser;

    } catch (error) {

        console.error("GET LOGGED USER ERROR:", error);

        return null;
    }
}


// ==========================================
// GET CURRENT FARM ID
// ==========================================

function getFarmID() {

    const loggedUser = getLoggedUser();

    if (!loggedUser) {

        console.error("No logged-in user found.");

        return null;
    }

    if (
        loggedUser.farm_id === null ||
        loggedUser.farm_id === undefined ||
        loggedUser.farm_id === ""
    ) {

        return null;
    }

    return loggedUser.farm_id;
}


// ==========================================
// GET REGISTERED FARM NAME
// ==========================================

async function getRegisteredFarmName() {

    try {

        if (typeof supabaseClient === "undefined") {
            return "REGISTERED FARM";
        }

        const loggedUser = getLoggedUser();

        if (!loggedUser) {
            return "REGISTERED FARM";
        }

        const farmID = loggedUser.farm_id;

        if (
            farmID === null ||
            farmID === undefined ||
            farmID === ""
        ) {
            return "REGISTERED FARM";
        }

        const { data: farm, error } = await supabaseClient
            .from("farms")
            .select("farm_name")
            .eq("id", farmID)
            .maybeSingle();

        if (error) {

            console.error("GET FARM NAME ERROR:", error);

            return "REGISTERED FARM";
        }

        if (farm && farm.farm_name) {

            return String(farm.farm_name).trim();
        }

        return "REGISTERED FARM";

    } catch (error) {

        console.error("FARM NAME ERROR:", error);

        return "REGISTERED FARM";
    }
}


// ==========================================
// INITIAL LOAD
// ==========================================

window.addEventListener(
    "DOMContentLoaded",
    function () {

        generateRecordID();

        const dateInput = document.getElementById("feedingDate");

        if (dateInput) {

            dateInput.value = new Date()
                .toISOString()
                .split("T")[0];
        }

        setupFeedCostCalculation();

        loadFeedingRecords();

    }
);


// ==========================================
// GENERATE RECORD ID
// ==========================================

function generateRecordID() {

    const id = "FEED-" + Date.now();

    const recordID = document.getElementById("recordID");

    if (recordID) {
        recordID.value = id;
    }
}


// ==========================================
// AUTOMATIC FEED COST
// ==========================================

function calculateFeedCost() {

    const quantity = Number(
        document.getElementById("quantity").value || 0
    );

    const price = Number(
        document.getElementById("feedPrice").value || 0
    );

    const total = quantity * price;

    document.getElementById("feedCost").value =
        total.toFixed(2);
}


function setupFeedCostCalculation() {

    const quantity = document.getElementById("quantity");

    const price = document.getElementById("feedPrice");

    if (quantity) {

        quantity.addEventListener(
            "input",
            calculateFeedCost
        );
    }

    if (price) {

        price.addEventListener(
            "input",
            calculateFeedCost
        );
    }
}


// ==========================================
// ESCAPE HTML
// ==========================================

function escapeHTML(value) {

    if (
        value === null ||
        value === undefined
    ) {
        return "";
    }

    return String(value)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}


// ==========================================
// SAVE FEEDING RECORD
// ==========================================

async function saveFeedingRecord() {

    const loggedUser = getLoggedUser();

    const farmID = getFarmID();

    if (!loggedUser) {

        showFeedingNotification(
            "No logged-in user found. Please log in again.",
            "error"
        );

        return;
    }

    if (farmID === null || farmID === undefined) {

        showFeedingNotification(
            "Farm information not found. Please log in again.",
            "error"
        );

        return;
    }

    try {

        calculateFeedCost();

        const data = {

            farm_id: farmID,

            record_id: document
                .getElementById("recordID")
                .value,

            feeding_date: document
                .getElementById("feedingDate")
                .value,

            pen_number: document
                .getElementById("penNumber")
                .value,

            pig_category: document
                .getElementById("pigCategory")
                .value,

            breed: document
                .getElementById("breed")
                .value,

            feed_type: document
                .getElementById("feedType")
                .value,

            feed_brand: document
                .getElementById("feedBrand")
                .value,

            quantity: Number(
                document.getElementById("quantity").value
            ),

            feed_price: Number(
                document.getElementById("feedPrice").value
            ),

            feed_cost: Number(
                document.getElementById("feedCost").value
            ),

            morning_feeding: document
                .getElementById("morningFeeding")
                .value,

            evening_feeding: document
                .getElementById("eveningFeeding")
                .value,

            water_available: document
                .getElementById("waterAvailable")
                .value,

            feed_supplier: document
                .getElementById("feedSupplier")
                .value,

            responsible_person: document
                .getElementById("responsiblePerson")
                .value,

            remarks: document
                .getElementById("remarks")
                .value,

            created_by: loggedUser.full_name,

            created_at: new Date().toISOString(),

            updated_by: null,

            updated_at: null
        };

        const { error } = await supabaseClient
            .from("feeding_records")
            .insert([data]);

        if (error) throw error;

        await saveActivity(

            loggedUser.full_name +
            " (" +
            loggedUser.role +
            ")",

            "Added",

            "Feeding Records",

            "Added feeding record for Pen: " +
            data.pen_number
        );

        showFeedingNotification(
            "Feeding record saved successfully.",
            "success"
        );

        document
            .getElementById("feedingForm")
            .reset();

        editID = null;

        generateRecordID();

        document.getElementById("feedingDate").value =
            new Date()
                .toISOString()
                .split("T")[0];

        document.getElementById("morningFeeding").value =
            "08:00";

        document.getElementById("eveningFeeding").value =
            "16:00";

        document.getElementById("feedCost").value = "";

        await loadFeedingRecords();

    } catch (error) {

        console.error("SAVE FEEDING RECORD ERROR:", error);

        showFeedingNotification(
            error.message || "Unable to save the feeding record.",
            "error"
        );
    }
}


// ==========================================
// LOAD ALL FEEDING RECORDS
// ==========================================

async function loadFeedingRecords() {

    const farmID = getFarmID();

    if (farmID === null || farmID === undefined) {

        console.error("Farm ID not found.");

        return;
    }

    try {

        const { data, error } = await supabaseClient
            .from("feeding_records")
            .select("*")
            .eq("farm_id", farmID)
            .order("id", {
                ascending: false
            });

        if (error) throw error;

        displayFeedingRecords(data || []);

    } catch (error) {

        console.error("LOAD FEEDING RECORDS ERROR:", error);

        showFeedingNotification(
            error.message || "Unable to load feeding records.",
            "error"
        );
    }
}


// ==========================================
// DISPLAY RECORDS
// ==========================================

function displayFeedingRecords(data) {

    const table = document.getElementById("feedingTable");

    if (!table) return;

    table.innerHTML = "";

    if (!data || data.length === 0) {

        table.innerHTML = `
            <tr>
                <td colspan="11" class="empty-state">
                    No feeding records found.
                </td>
            </tr>
        `;

        return;
    }

    data.forEach(function (row) {

        const tr = document.createElement("tr");

        tr.innerHTML = `
            <td>${escapeHTML(row.feeding_date || "")}</td>

            <td>${escapeHTML(row.pen_number || "")}</td>

            <td>${escapeHTML(row.pig_category || "")}</td>

            <td>${escapeHTML(row.breed || "")}</td>

            <td>${escapeHTML(row.feed_type || "")}</td>

            <td>${escapeHTML(row.feed_brand || "")}</td>

            <td>
                ${
                    row.quantity !== null &&
                    row.quantity !== undefined
                        ? escapeHTML(row.quantity) + " Kg"
                        : ""
                }
            </td>

            <td>
                ZMW ${
                    row.feed_cost !== null &&
                    row.feed_cost !== undefined
                        ? escapeHTML(
                            Number(row.feed_cost).toFixed(2)
                          )
                        : "0.00"
                }
            </td>

            <td>${escapeHTML(row.remarks || "")}</td>

            <td>${escapeHTML(row.responsible_person || "")}</td>

            <td class="action-cell">
                <button
                    type="button"
                    class="small-btn edit-action"
                    data-action="edit">
                    Edit
                </button>

                <button
                    type="button"
                    class="small-btn delete-action"
                    data-action="delete">
                    Delete
                </button>
            </td>
        `;

        tr.querySelector('[data-action="edit"]')
            .addEventListener("click", function () {
                editFeedingRecord(row.id);
            });

        tr.querySelector('[data-action="delete"]')
            .addEventListener("click", function () {
                deleteFeedingRecord(row.id);
            });

        table.appendChild(tr);
    });
}


// ==========================================
// SEARCH RECORD
// ==========================================

async function searchFeedingRecord() {

    const farmID = getFarmID();

    if (farmID === null || farmID === undefined) {

        showFeedingNotification(
            "Farm information not found. Please log in again.",
            "error"
        );

        return;
    }

    const pen = document
        .getElementById("penNumber")
        .value;

    if (pen === "") {

        showFeedingNotification(
            "Select a Pen Number first.",
            "warning"
        );

        return;
    }

    try {

        const { data, error } = await supabaseClient
            .from("feeding_records")
            .select("*")
            .eq("farm_id", farmID)
            .eq("pen_number", pen)
            .order("id", {
                ascending: false
            });

        if (error) throw error;

        displayFeedingRecords(data || []);

        if (!data || data.length === 0) {

            showFeedingNotification(
                "No feeding records were found for the selected pen.",
                "info"
            );
        }

    } catch (error) {

        console.error("SEARCH FEEDING RECORD ERROR:", error);

        showFeedingNotification(
            error.message || "Unable to search feeding records.",
            "error"
        );
    }
}


// ==========================================
// EDIT RECORD
// ==========================================

async function editFeedingRecord(id) {

    const farmID = getFarmID();

    if (farmID === null || farmID === undefined) {

        showFeedingNotification(
            "Farm information not found. Please log in again.",
            "error"
        );

        return;
    }

    try {

        const { data, error } = await supabaseClient
            .from("feeding_records")
            .select("*")
            .eq("id", id)
            .eq("farm_id", farmID)
            .single();

        if (error) throw error;

        editID = id;

        document.getElementById("recordID").value =
            data.record_id || "";

        document.getElementById("feedingDate").value =
            data.feeding_date || "";

        document.getElementById("penNumber").value =
            data.pen_number || "";

        document.getElementById("pigCategory").value =
            data.pig_category || "";

        document.getElementById("breed").value =
            data.breed || "";

        document.getElementById("feedType").value =
            data.feed_type || "";

        document.getElementById("feedBrand").value =
            data.feed_brand || "";

        document.getElementById("quantity").value =
            data.quantity ?? "";

        document.getElementById("feedPrice").value =
            data.feed_price ?? "";

        document.getElementById("feedCost").value =
            data.feed_cost ?? "";

        document.getElementById("morningFeeding").value =
            data.morning_feeding || "08:00";

        document.getElementById("eveningFeeding").value =
            data.evening_feeding || "16:00";

        document.getElementById("waterAvailable").value =
            data.water_available || "";

        document.getElementById("feedSupplier").value =
            data.feed_supplier || "";

        document.getElementById("responsiblePerson").value =
            data.responsible_person || "";

        document.getElementById("remarks").value =
            data.remarks || "";

        window.scrollTo({
            top: 0,
            behavior: "smooth"
        });

        showFeedingNotification(
            "Feeding record loaded for editing.",
            "info"
        );

    } catch (error) {

        console.error("EDIT FEEDING RECORD ERROR:", error);

        showFeedingNotification(
            error.message || "Unable to load the feeding record.",
            "error"
        );
    }
}


// ==========================================
// UPDATE FEEDING RECORD
// ==========================================

async function updateFeedingRecord() {

    if (editID === null) {

        showFeedingNotification(
            "Select a record first by clicking Edit.",
            "warning"
        );

        return;
    }

    const loggedUser = getLoggedUser();

    const farmID = getFarmID();

    if (!loggedUser) {

        showFeedingNotification(
            "No logged-in user found. Please log in again.",
            "error"
        );

        return;
    }

    if (farmID === null || farmID === undefined) {

        showFeedingNotification(
            "Farm information not found. Please log in again.",
            "error"
        );

        return;
    }

    try {

        calculateFeedCost();

        const updated = {

            record_id: document
                .getElementById("recordID")
                .value,

            feeding_date: document
                .getElementById("feedingDate")
                .value,

            pen_number: document
                .getElementById("penNumber")
                .value,

            pig_category: document
                .getElementById("pigCategory")
                .value,

            breed: document
                .getElementById("breed")
                .value,

            feed_type: document
                .getElementById("feedType")
                .value,

            feed_brand: document
                .getElementById("feedBrand")
                .value,

            quantity: Number(
                document.getElementById("quantity").value
            ),

            feed_price: Number(
                document.getElementById("feedPrice").value
            ),

            feed_cost: Number(
                document.getElementById("feedCost").value
            ),

            morning_feeding: document
                .getElementById("morningFeeding")
                .value,

            evening_feeding: document
                .getElementById("eveningFeeding")
                .value,

            water_available: document
                .getElementById("waterAvailable")
                .value,

            feed_supplier: document
                .getElementById("feedSupplier")
                .value,

            responsible_person: document
                .getElementById("responsiblePerson")
                .value,

            remarks: document
                .getElementById("remarks")
                .value,

            updated_by: loggedUser.full_name,

            updated_at: new Date().toISOString()
        };

        const { data: updatedRows, error } = await supabaseClient
            .from("feeding_records")
            .update(updated)
            .eq("id", editID)
            .eq("farm_id", farmID)
            .select("id");

        if (error) throw error;

        if (!updatedRows || updatedRows.length === 0) {

            throw new Error(
                "The record was not updated. Check your permissions or whether the record still exists."
            );
        }

        await saveActivity(

            loggedUser.full_name +
            " (" +
            loggedUser.role +
            ")",

            "Updated",

            "Feeding Records",

            "Updated feeding record for Pen: " +
            updated.pen_number
        );

        showFeedingNotification(
            "Feeding record updated successfully.",
            "success"
        );

        editID = null;

        document
            .getElementById("feedingForm")
            .reset();

        generateRecordID();

        document.getElementById("feedingDate").value =
            new Date()
                .toISOString()
                .split("T")[0];

        document.getElementById("morningFeeding").value =
            "08:00";

        document.getElementById("eveningFeeding").value =
            "16:00";

        document.getElementById("feedCost").value = "";

        await loadFeedingRecords();

    } catch (error) {

        console.error("UPDATE FEEDING RECORD ERROR:", error);

        showFeedingNotification(
            error.message || "Unable to update the feeding record.",
            "error"
        );
    }
}


// ==========================================
// DELETE RECORD
// ==========================================

async function deleteFeedingRecord(id) {

    const confirmed = await showFeedingConfirmation(
        "Are you sure you want to delete this feeding record? This action cannot be undone."
    );

    if (!confirmed) return;

    const farmID = getFarmID();

    const loggedUser = getLoggedUser();

    if (farmID === null || farmID === undefined) {

        showFeedingNotification(
            "Farm information not found. Please log in again.",
            "error"
        );

        return;
    }

    try {

        const { data: deletedRows, error } = await supabaseClient
            .from("feeding_records")
            .delete()
            .eq("id", id)
            .eq("farm_id", farmID)
            .select("id");

        if (error) throw error;

        if (!deletedRows || deletedRows.length === 0) {

            throw new Error(
                "The record was not deleted. Check your permissions or whether the record still exists."
            );
        }

        if (loggedUser) {

            await saveActivity(

                loggedUser.full_name +
                " (" +
                loggedUser.role +
                ")",

                "Deleted",

                "Feeding Records",

                "Deleted feeding record ID: " + id
            );
        }

        showFeedingNotification(
            "Feeding record deleted successfully.",
            "success"
        );

        await loadFeedingRecords();

    } catch (error) {

        console.error("DELETE FEEDING RECORD ERROR:", error);

        showFeedingNotification(
            error.message || "Unable to delete the feeding record.",
            "error"
        );
    }
}


// ==========================================
// FEEDING REPORT
// ==========================================

async function generateReport() {

    const farmID = getFarmID();

    if (farmID === null || farmID === undefined) {

        showFeedingNotification(
            "Farm information not found. Please log in again.",
            "error"
        );

        return;
    }

    try {

        const farmName = await getRegisteredFarmName();

        const { data, error } = await supabaseClient
            .from("feeding_records")
            .select("*")
            .eq("farm_id", farmID);

        if (error) throw error;

        const records = data || [];

        let totalQuantity = 0;
        let totalCost = 0;

        const feedCount = records.length;

        const feedTypes = {};

        records.forEach(function (record) {

            totalQuantity += Number(record.quantity || 0);

            totalCost += Number(record.feed_cost || 0);

            const type = record.feed_type;

            if (type) {

                if (feedTypes[type]) {
                    feedTypes[type]++;
                } else {
                    feedTypes[type] = 1;
                }
            }
        });

        let mostUsedFeed = "None";
        let highest = 0;

        for (const feed in feedTypes) {

            if (feedTypes[feed] > highest) {

                highest = feedTypes[feed];

                mostUsedFeed = feed;
            }
        }

        const reportMessage =
            farmName +
            "\n\nFEEDING REPORT\n\n" +
            "Total Records: " + feedCount +
            "\nTotal Feed Used: " + totalQuantity.toFixed(2) + " Kg" +
            "\nTotal Feed Cost: ZMW " + totalCost.toFixed(2) +
            "\nMost Used Feed: " + mostUsedFeed;

        showFeedingNotification(
            reportMessage,
            "info"
        );

    } catch (error) {

        console.error("FEEDING REPORT ERROR:", error);

        showFeedingNotification(
            error.message || "Unable to generate the feeding report.",
            "error"
        );
    }
}


// ==========================================
// DOWNLOAD FEEDING RECORDS PDF
// ==========================================

async function downloadFeedingPDF() {

    const farmID = getFarmID();

    const loggedUser = getLoggedUser();

    if (farmID === null || farmID === undefined) {

        showFeedingNotification(
            "Farm information not found. Please log in again.",
            "error"
        );

        return;
    }

    if (
        !window.jspdf ||
        !window.jspdf.jsPDF
    ) {

        showFeedingNotification(
            "The PDF library could not be loaded. Refresh the page and try again.",
            "error"
        );

        return;
    }

    try {

        const farmName = await getRegisteredFarmName();

        const { data, error } = await supabaseClient
            .from("feeding_records")
            .select("*")
            .eq("farm_id", farmID)
            .order("feeding_date", {
                ascending: false
            });

        if (error) throw error;

        if (!data || data.length === 0) {

            showFeedingNotification(
                "No feeding records found for this farm.",
                "warning"
            );

            return;
        }

        const { jsPDF } = window.jspdf;

        const doc = new jsPDF(
            "landscape",
            "mm",
            "a4"
        );

        // ==========================================
        // HEADER
        // ==========================================

        doc.setFontSize(18);

        doc.setFont(
            "helvetica",
            "bold"
        );

        doc.text(
            farmName,
            148,
            15,
            {
                align: "center"
            }
        );

        doc.setFontSize(13);

        doc.setFont(
            "helvetica",
            "normal"
        );

        doc.text(
            "FEEDING RECORDS REPORT",
            148,
            23,
            {
                align: "center"
            }
        );

        // ==========================================
        // REPORT INFORMATION
        // ==========================================

        doc.setFontSize(9);

        doc.text(
            "Farm ID: " + farmID,
            14,
            32
        );

        doc.text(
            "Generated By: " +
            (loggedUser?.full_name || "System"),
            14,
            38
        );

        doc.text(
            "Generated: " +
            new Date().toLocaleString(),
            14,
            44
        );

        doc.text(
            "Total Records: " + data.length,
            14,
            50
        );

        // ==========================================
        // SUMMARY
        // ==========================================

        let totalQuantity = 0;

        let totalCost = 0;

        data.forEach(function (record) {

            totalQuantity += Number(record.quantity || 0);

            totalCost += Number(record.feed_cost || 0);
        });

        doc.text(
            "Total Feed Used: " +
            totalQuantity.toFixed(2) +
            " Kg",
            110,
            32
        );

        doc.text(
            "Total Feed Cost: ZMW " +
            totalCost.toFixed(2),
            110,
            38
        );

        // ==========================================
        // TABLE
        // ==========================================

        if (typeof doc.autoTable !== "function") {

            showFeedingNotification(
                "The PDF table library could not be loaded. Check your PDF library scripts.",
                "error"
            );

            return;
        }

        const tableData = data.map(function (record) {

            return [

                record.feeding_date || "",

                record.pen_number || "",

                record.pig_category || "",

                record.breed || "",

                record.feed_type || "",

                record.feed_brand || "",

                record.quantity !== null &&
                record.quantity !== undefined
                    ? Number(record.quantity).toFixed(2)
                    : "",

                record.feed_cost !== null &&
                record.feed_cost !== undefined
                    ? Number(record.feed_cost).toFixed(2)
                    : "",

                record.remarks || "",

                record.responsible_person || ""
            ];
        });

        doc.autoTable({

            startY: 56,

            head: [[
                "Date",
                "Pen",
                "Category",
                "Breed",
                "Feed",
                "Brand",
                "Qty (Kg)",
                "Cost (ZMW)",
                "Feeding Status",
                "Responsible"
            ]],

            body: tableData,

            theme: "grid",

            styles: {
                fontSize: 7,
                cellPadding: 2,
                valign: "middle"
            },

            headStyles: {
                fontSize: 7,
                fontStyle: "bold"
            },

            margin: {
                left: 10,
                right: 10
            }
        });

        // ==========================================
        // FOOTER
        // ==========================================

        const pageCount = doc.internal.getNumberOfPages();

        for (
            let page = 1;
            page <= pageCount;
            page++
        ) {

            doc.setPage(page);

            doc.setFontSize(7);

            doc.text(
                farmName + " - Feeding Records",
                10,
                202
            );

            doc.text(
                "Page " + page + " of " + pageCount,
                287,
                202,
                {
                    align: "right"
                }
            );
        }

        // ==========================================
        // DOWNLOAD
        // ==========================================

        const today = new Date()
            .toISOString()
            .split("T")[0];

        const safeFarmName = farmName
            .replace(/[^a-z0-9]/gi, "_")
            .replace(/_+/g, "_")
            .replace(/^_|_$/g, "");

        doc.save(
            safeFarmName +
            "_Feeding_Records_" +
            today +
            ".pdf"
        );

        showFeedingNotification(
            "Feeding records PDF downloaded successfully.",
            "success"
        );

    } catch (error) {

        console.error("FEEDING PDF ERROR:", error);

        showFeedingNotification(
            "Unable to generate PDF: " +
            (error.message || "Unknown error."),
            "error"
        );
    }
}


// ==========================================
// END OF FEEDING RECORDS MODULE
// ==========================================