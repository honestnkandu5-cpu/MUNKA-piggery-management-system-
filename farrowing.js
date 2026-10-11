// =====================================
// MUNKA PIGGERY TECHNOLOGY
// FARROWING RECORDS - SUPABASE
// FARM-SECURED VERSION
// REGISTERED FARM PDF / PRINT VERSION
// CUSTOM NOTIFICATIONS
// =====================================

let farrowingRecords = [];
let editID = null;


// =====================================
// CUSTOM NOTIFICATION SYSTEM
// =====================================

function showFarrowingNotification(message, type = "success") {

    let container = document.getElementById(
        "munka-farrowing-notifications"
    );

    if (!container) {

        container = document.createElement("div");

        container.id = "munka-farrowing-notifications";

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

    const duration = type === "error" ? 6000 : 3500;

    setTimeout(removeNotification, duration);
}


// =====================================
// CUSTOM CONFIRMATION DIALOG
// =====================================

function showFarrowingConfirmation(message) {

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

        function finish(result) {

            overlay.remove();

            resolve(result);
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

        const escapeHandler = function (event) {

            if (event.key === "Escape") {

                document.removeEventListener(
                    "keydown",
                    escapeHandler
                );

                finish(false);
            }

        };

        document.addEventListener(
            "keydown",
            escapeHandler
        );

        confirmButton.focus();

    });
}


// =====================================
// GET LOGGED-IN USER
// =====================================

function getLoggedUser() {

    try {

        const user = JSON.parse(
            localStorage.getItem("loggedInUser")
        );

        if (!user) {

            showFarrowingNotification(
                "No logged-in user found. Please log in again.",
                "error"
            );

            return null;
        }

        return user;

    } catch (error) {

        console.error("GET LOGGED USER ERROR:", error);

        showFarrowingNotification(
            "Unable to read your login information. Please log in again.",
            "error"
        );

        return null;
    }
}


// =====================================
// GET FARM ID
// =====================================

function getFarmID() {

    const loggedUser = getLoggedUser();

    if (!loggedUser) {
        return null;
    }

    if (
        loggedUser.farm_id === null ||
        loggedUser.farm_id === undefined ||
        loggedUser.farm_id === ""
    ) {

        showFarrowingNotification(
            "Your account is not linked to a farm. Please contact the administrator.",
            "error"
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


// =====================================
// LOAD ALL RECORDS
// =====================================

async function loadRecords() {

    try {

        const farmID = getFarmID();

        if (farmID === null || farmID === undefined) {
            return;
        }

        const { data, error } = await supabaseClient
            .from("farrowing_records")
            .select("*")
            .eq("farm_id", farmID)
            .order("id", {
                ascending: true
            });

        if (error) throw error;

        farrowingRecords = data || [];

        displayRecords();

    } catch (error) {

        console.error("LOAD FARROWING RECORDS ERROR:", error);

        showFarrowingNotification(
            error.message || "Unable to load farrowing records.",
            "error"
        );
    }
}


// =====================================
// AUTOMATIC DATE CALCULATION
// =====================================

function calculateFarrowingDates() {

    const farrowDateValue =
        document.getElementById("farrowDate").value;

    if (!farrowDateValue) {

        document.getElementById("teethDate").value = "";
        document.getElementById("tailDate").value = "";
        document.getElementById("ironDate").value = "";
        document.getElementById("weaningDate").value = "";

        return;
    }

    const farrowDate = new Date(
        farrowDateValue + "T00:00:00"
    );

    if (isNaN(farrowDate.getTime())) return;

    function addDays(days) {

        const date = new Date(farrowDate);

        date.setDate(date.getDate() + days);

        const year = date.getFullYear();

        const month = String(
            date.getMonth() + 1
        ).padStart(2, "0");

        const day = String(
            date.getDate()
        ).padStart(2, "0");

        return `${year}-${month}-${day}`;
    }

    document.getElementById("teethDate").value =
        addDays(3);

    document.getElementById("tailDate").value =
        addDays(3);

    document.getElementById("ironDate").value =
        addDays(3);

    document.getElementById("weaningDate").value =
        addDays(33);
}


const farrowDateInput = document.getElementById("farrowDate");

if (farrowDateInput) {

    farrowDateInput.addEventListener(
        "change",
        calculateFarrowingDates
    );
}


// =====================================
// TOTAL BORN CALCULATION
// =====================================

function calculateTotalBorn() {

    const bornAlive =
        Number(document.getElementById("bornAlive").value) || 0;

    const stillborn =
        Number(document.getElementById("stillborn").value) || 0;

    const mummified =
        Number(document.getElementById("mummified").value) || 0;

    document.getElementById("totalBorn").value =
        bornAlive + stillborn + mummified;
}


[
    "bornAlive",
    "stillborn",
    "mummified"
].forEach(function (id) {

    const input = document.getElementById(id);

    if (input) {

        input.addEventListener(
            "change",
            calculateTotalBorn
        );
    }
});


// =====================================
// SAVE / UPDATE RECORD
// =====================================

const farrowingForm = document.getElementById("farrowingForm");

if (farrowingForm) {

    farrowingForm.addEventListener(
        "submit",
        async function (e) {

            e.preventDefault();

            const loggedUser = getLoggedUser();

            if (!loggedUser) return;

            const farmID = getFarmID();

            if (farmID === null || farmID === undefined) {
                return;
            }

            calculateTotalBorn();

            const record = {

                farm_id: farmID,

                sow_id: document
                    .getElementById("sowID")
                    .value
                    .trim(),

                breed: document
                    .getElementById("breed")
                    .value,

                farrow_date: document
                    .getElementById("farrowDate")
                    .value,

                teeth_date: document
                    .getElementById("teethDate")
                    .value,

                tail_date: document
                    .getElementById("tailDate")
                    .value,

                iron_date: document
                    .getElementById("ironDate")
                    .value,

                weaning_date: document
                    .getElementById("weaningDate")
                    .value,

                born_alive: Number(
                    document.getElementById("bornAlive").value
                ) || 0,

                stillborn: Number(
                    document.getElementById("stillborn").value
                ) || 0,

                mummified: Number(
                    document.getElementById("mummified").value
                ) || 0,

                total_born: Number(
                    document.getElementById("totalBorn").value
                ) || 0,

                male_piglets: Number(
                    document.getElementById("malePiglets").value
                ) || 0,

                female_piglets: Number(
                    document.getElementById("femalePiglets").value
                ) || 0,

                total_weaned: Number(
                    document.getElementById("totalWeaned").value
                ) || 0,

                birth_weight: Number(
                    document.getElementById("birthWeight").value
                ) || 0,

                mortality: Number(
                    document.getElementById("mortality").value
                ) || 0,

                mortality_reason: document
                    .getElementById("mortalityReason")
                    .value,

                sow_condition: document
                    .getElementById("sowCondition")
                    .value,

                notes: document
                    .getElementById("notes")
                    .value,

                created_by: loggedUser.full_name,

                updated_by: null,

                updated_at: null
            };

            try {

                // =============================
                // ADD NEW RECORD
                // =============================

                if (editID === null) {

                    const { error } = await supabaseClient
                        .from("farrowing_records")
                        .insert([record]);

                    if (error) throw error;

                    await saveActivity(

                        loggedUser.full_name +
                        " (" +
                        loggedUser.role +
                        ")",

                        "Added",

                        "Farrowing Records",

                        "Saved farrowing record for Sow ID: " +
                        record.sow_id
                    );

                    showFarrowingNotification(
                        "Farrowing record saved successfully.",
                        "success"
                    );
                }

                // =============================
                // UPDATE EXISTING RECORD
                // =============================

                else {

                    record.updated_by =
                        loggedUser.full_name;

                    record.updated_at =
                        new Date().toISOString();

                    // Prevent changing farm ownership.
                    delete record.farm_id;

                    // Keep the existing farm-specific filter.
                    const { data: updatedRows, error } =
                        await supabaseClient
                            .from("farrowing_records")
                            .update(record)
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

                        "Farrowing Records",

                        "Updated farrowing record for Sow ID: " +
                        record.sow_id
                    );

                    showFarrowingNotification(
                        "Farrowing record updated successfully.",
                        "success"
                    );

                    editID = null;
                }

                document
                    .getElementById("farrowingForm")
                    .reset();

                document.getElementById("totalBorn").value = "";

                loadRecords();

            } catch (error) {

                console.error("SAVE FARROWING RECORD ERROR:", error);

                showFarrowingNotification(
                    error.message || "Unable to save the farrowing record.",
                    "error"
                );
            }
        }
    );
}


// =====================================
// ESCAPE HTML
// =====================================

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


// =====================================
// DISPLAY RECORDS
// =====================================

function displayRecords(records = farrowingRecords) {

    const table = document.getElementById("farrowingTable");

    if (!table) return;

    table.innerHTML = "";

    if (!records || records.length === 0) {

        table.innerHTML = `
            <tr>
                <td colspan="11" class="no-records">
                    No farrowing records found.
                </td>
            </tr>
        `;

        return;
    }

    records.forEach(function (record) {

        const row = document.createElement("tr");

        row.innerHTML = `
            <td>${escapeHTML(record.sow_id)}</td>
            <td>${escapeHTML(record.breed)}</td>
            <td>${escapeHTML(record.farrow_date)}</td>
            <td>${escapeHTML(record.born_alive)}</td>
            <td>${escapeHTML(record.stillborn)}</td>
            <td>${escapeHTML(record.mummified)}</td>
            <td><strong>${escapeHTML(record.total_born)}</strong></td>
            <td>${escapeHTML(record.mortality)}</td>
            <td>${escapeHTML(record.total_weaned)}</td>
            <td>${escapeHTML(record.weaning_date)}</td>
            <td class="action-cell">
                <button
                    type="button"
                    class="edit-btn"
                    data-action="edit"
                >
                    ✏️ Edit
                </button>

                <button
                    type="button"
                    class="delete-btn"
                    data-action="delete"
                >
                    🗑️ Delete
                </button>
            </td>
        `;

        row.querySelector('[data-action="edit"]')
            .addEventListener("click", function () {
                editRecord(record.id);
            });

        row.querySelector('[data-action="delete"]')
            .addEventListener("click", function () {
                deleteRecord(record.id);
            });

        table.appendChild(row);
    });
}


// =====================================
// DELETE RECORD
// =====================================

async function deleteRecord(id) {

    const confirmed = await showFarrowingConfirmation(
        "Are you sure you want to delete this farrowing record? This action cannot be undone."
    );

    if (!confirmed) return;

    const loggedUser = getLoggedUser();

    if (!loggedUser) return;

    const farmID = getFarmID();

    if (farmID === null || farmID === undefined) {
        return;
    }

    try {

        const { data: deletedRows, error } =
            await supabaseClient
                .from("farrowing_records")
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

        await saveActivity(

            loggedUser.full_name +
            " (" +
            loggedUser.role +
            ")",

            "Deleted",

            "Farrowing Records",

            "Deleted farrowing record ID: " + id
        );

        showFarrowingNotification(
            "Farrowing record deleted successfully.",
            "success"
        );

        await loadRecords();

    } catch (error) {

        console.error("DELETE FARROWING RECORD ERROR:", error);

        showFarrowingNotification(
            error.message || "Unable to delete the farrowing record.",
            "error"
        );
    }
}


// =====================================
// EDIT RECORD
// =====================================

async function editRecord(id) {

    const farmID = getFarmID();

    if (farmID === null || farmID === undefined) {
        return;
    }

    try {

        const { data, error } = await supabaseClient
            .from("farrowing_records")
            .select("*")
            .eq("id", id)
            .eq("farm_id", farmID)
            .single();

        if (error) throw error;

        document.getElementById("sowID").value =
            data.sow_id || "";

        document.getElementById("breed").value =
            data.breed || "";

        document.getElementById("farrowDate").value =
            data.farrow_date || "";

        document.getElementById("teethDate").value =
            data.teeth_date || "";

        document.getElementById("tailDate").value =
            data.tail_date || "";

        document.getElementById("ironDate").value =
            data.iron_date || "";

        document.getElementById("weaningDate").value =
            data.weaning_date || "";

        document.getElementById("bornAlive").value =
            data.born_alive ?? "";

        document.getElementById("stillborn").value =
            data.stillborn ?? 0;

        document.getElementById("mummified").value =
            data.mummified ?? 0;

        document.getElementById("totalBorn").value =
            data.total_born ?? 0;

        document.getElementById("malePiglets").value =
            data.male_piglets ?? 0;

        document.getElementById("femalePiglets").value =
            data.female_piglets ?? 0;

        document.getElementById("totalWeaned").value =
            data.total_weaned ?? 0;

        document.getElementById("birthWeight").value =
            data.birth_weight ?? 0;

        document.getElementById("mortality").value =
            data.mortality ?? 0;

        document.getElementById("mortalityReason").value =
            data.mortality_reason || "";

        document.getElementById("sowCondition").value =
            data.sow_condition || "Good - Normal recovery";

        document.getElementById("notes").value =
            data.notes || "";

        editID = id;

        window.scrollTo({
            top: 0,
            behavior: "smooth"
        });

        showFarrowingNotification(
            "Farrowing record loaded for editing.",
            "info"
        );

    } catch (error) {

        console.error("EDIT FARROWING RECORD ERROR:", error);

        showFarrowingNotification(
            error.message || "Unable to load the record for editing.",
            "error"
        );
    }
}


// =====================================
// SEARCH RECORDS
// =====================================

async function searchRecord() {

    const searchInput = document.getElementById("searchFarrowing");

    const keyword = searchInput
        ? searchInput.value.trim()
        : "";

    const farmID = getFarmID();

    if (farmID === null || farmID === undefined) {
        return;
    }

    try {

        let query = supabaseClient
            .from("farrowing_records")
            .select("*")
            .eq("farm_id", farmID)
            .order("id", {
                ascending: true
            });

        if (keyword) {

            query = query.ilike(
                "sow_id",
                `%${keyword}%`
            );
        }

        const { data, error } = await query;

        if (error) throw error;

        displayRecords(data || []);

    } catch (error) {

        console.error("SEARCH FARROWING RECORDS ERROR:", error);

        showFarrowingNotification(
            error.message || "Unable to search farrowing records.",
            "error"
        );
    }
}


// =====================================
// GENERATE REPORT
// =====================================

async function generateReport() {

    const farmID = getFarmID();

    if (farmID === null || farmID === undefined) {
        return;
    }

    try {

        const { data, error } = await supabaseClient
            .from("farrowing_records")
            .select("*")
            .eq("farm_id", farmID);

        if (error) throw error;

        const records = data || [];

        const totalRecords = records.length;

        const totalBorn = records.reduce(
            (sum, record) =>
                sum + (Number(record.total_born) || 0),
            0
        );

        const totalBornAlive = records.reduce(
            (sum, record) =>
                sum + (Number(record.born_alive) || 0),
            0
        );

        const totalStillborn = records.reduce(
            (sum, record) =>
                sum + (Number(record.stillborn) || 0),
            0
        );

        const totalMummified = records.reduce(
            (sum, record) =>
                sum + (Number(record.mummified) || 0),
            0
        );

        const totalMortality = records.reduce(
            (sum, record) =>
                sum + (Number(record.mortality) || 0),
            0
        );

        const totalWeaned = records.reduce(
            (sum, record) =>
                sum + (Number(record.total_weaned) || 0),
            0
        );

        const farmName = await getRegisteredFarmName();

        showFarrowingNotification(
            farmName +
            " - FARROWING REPORT\n\n" +
            "Total Farrowing Records: " + totalRecords +
            "\nTotal Born: " + totalBorn +
            "\nBorn Alive: " + totalBornAlive +
            "\nStillborn: " + totalStillborn +
            "\nMummified: " + totalMummified +
            "\nPiglets Lost: " + totalMortality +
            "\nTotal Weaned: " + totalWeaned,
            "info"
        );

    } catch (error) {

        console.error("GENERATE FARROWING REPORT ERROR:", error);

        showFarrowingNotification(
            error.message || "Unable to generate the farrowing report.",
            "error"
        );
    }
}


// =====================================
// PDF DOWNLOAD
// =====================================

async function downloadPDF() {

    const farmID = getFarmID();

    if (farmID === null || farmID === undefined) {
        return;
    }

    if (
        !window.jspdf ||
        !window.jspdf.jsPDF
    ) {

        showFarrowingNotification(
            "The PDF library could not be loaded. Check your internet connection and try again.",
            "error"
        );

        return;
    }

    try {

        const { data, error } = await supabaseClient
            .from("farrowing_records")
            .select("*")
            .eq("farm_id", farmID)
            .order("id", {
                ascending: true
            });

        if (error) throw error;

        const records = data || [];

        if (records.length === 0) {

            showFarrowingNotification(
                "There are no farrowing records available to download.",
                "warning"
            );

            return;
        }

        const farmName = await getRegisteredFarmName();

        const { jsPDF } = window.jspdf;

        const doc = new jsPDF({
            orientation: "landscape",
            unit: "mm",
            format: "a4"
        });

        // =================================
        // PDF HEADER
        // =================================

        doc.setFontSize(20);
        doc.setFont(undefined, "bold");

        doc.text(
            farmName,
            148,
            15,
            {
                align: "center"
            }
        );

        doc.setFontSize(13);
        doc.setFont(undefined, "normal");

        doc.text(
            "Farrowing & Litter Management Report",
            148,
            23,
            {
                align: "center"
            }
        );

        doc.setFontSize(9);

        doc.text(
            "Farm ID: " + farmID,
            14,
            32
        );

        const loggedUser = getLoggedUser();

        doc.text(
            "Generated By: " +
            (loggedUser ? loggedUser.full_name : "System"),
            14,
            38
        );

        doc.text(
            "Generated: " +
            new Date().toLocaleString("en-ZM"),
            14,
            44
        );

        // =================================
        // SUMMARY
        // =================================

        const totalBorn = records.reduce(
            (sum, record) =>
                sum + (Number(record.total_born) || 0),
            0
        );

        const totalBornAlive = records.reduce(
            (sum, record) =>
                sum + (Number(record.born_alive) || 0),
            0
        );

        const totalStillborn = records.reduce(
            (sum, record) =>
                sum + (Number(record.stillborn) || 0),
            0
        );

        const totalMummified = records.reduce(
            (sum, record) =>
                sum + (Number(record.mummified) || 0),
            0
        );

        const totalMortality = records.reduce(
            (sum, record) =>
                sum + (Number(record.mortality) || 0),
            0
        );

        const totalWeaned = records.reduce(
            (sum, record) =>
                sum + (Number(record.total_weaned) || 0),
            0
        );

        doc.setFontSize(10);
        doc.setFont(undefined, "bold");

        doc.text("SUMMARY", 14, 52);

        doc.setFont(undefined, "normal");

        doc.text("Records: " + records.length, 14, 59);
        doc.text("Born Alive: " + totalBornAlive, 60, 59);
        doc.text("Total Born: " + totalBorn, 110, 59);
        doc.text("Stillborn: " + totalStillborn, 160, 59);
        doc.text("Mummified: " + totalMummified, 215, 59);

        doc.text("Piglets Lost: " + totalMortality, 14, 65);
        doc.text("Total Weaned: " + totalWeaned, 70, 65);

        // =================================
        // TABLE
        // =================================

        const tableRows = records.map(function (record) {

            return [
                record.sow_id || "",
                record.breed || "",
                record.farrow_date || "",
                record.born_alive || 0,
                record.stillborn || 0,
                record.mummified || 0,
                record.total_born || 0,
                record.male_piglets || 0,
                record.female_piglets || 0,
                record.mortality || 0,
                record.total_weaned || 0,
                record.weaning_date || "",
                record.sow_condition || ""
            ];
        });

        if (typeof doc.autoTable !== "function") {

            showFarrowingNotification(
                "The PDF table library could not be loaded. Please check your PDF library scripts.",
                "error"
            );

            return;
        }

        doc.autoTable({

            startY: 72,

            head: [[
                "Sow ID",
                "Breed",
                "Farrow Date",
                "Born Alive",
                "Stillborn",
                "Mummified",
                "Total Born",
                "Male",
                "Female",
                "Lost",
                "Weaned",
                "Weaning Date",
                "Sow Condition"
            ]],

            body: tableRows,

            theme: "grid",

            styles: {
                fontSize: 6.5,
                cellPadding: 2,
                overflow: "linebreak",
                valign: "middle"
            },

            headStyles: {
                fontStyle: "bold",
                halign: "center"
            },

            columnStyles: {
                0: { cellWidth: 20 },
                1: { cellWidth: 25 },
                2: { cellWidth: 21 },
                3: { cellWidth: 15 },
                4: { cellWidth: 15 },
                5: { cellWidth: 15 },
                6: { cellWidth: 15 },
                7: { cellWidth: 12 },
                8: { cellWidth: 12 },
                9: { cellWidth: 12 },
                10: { cellWidth: 13 },
                11: { cellWidth: 21 },
                12: { cellWidth: 30 }
            }
        });

        // =================================
        // FOOTER
        // =================================

        const pageCount = doc.internal.getNumberOfPages();

        for (
            let page = 1;
            page <= pageCount;
            page++
        ) {

            doc.setPage(page);

            doc.setFontSize(8);

            doc.text(
                farmName + " - Farrowing Records",
                14,
                202
            );

            doc.text(
                "Page " + page + " of " + pageCount,
                270,
                202,
                {
                    align: "right"
                }
            );
        }

        // =================================
        // DOWNLOAD
        // =================================

        const today = new Date()
            .toISOString()
            .split("T")[0];

        const safeFarmName = farmName
            .replace(/[^a-z0-9]+/gi, "-")
            .replace(/^-+|-+$/g, "");

        doc.save(
            safeFarmName +
            "-Farrowing-Records-" +
            today +
            ".pdf"
        );

        showFarrowingNotification(
            "Farrowing PDF downloaded successfully.",
            "success"
        );

    } catch (error) {

        console.error("FARROWING PDF ERROR:", error);

        showFarrowingNotification(
            "Unable to generate PDF: " +
            (error.message || "Unknown error."),
            "error"
        );
    }
}


// =====================================
// PRINT REPORT
// =====================================

async function printReport() {

    let printStyle = null;
    let restoreScreen = null;

    try {

        const farmName = await getRegisteredFarmName();

        const softwareBrand = document.querySelector(
            ".software-brand"
        );

        const systemDescription = document.querySelector(
            ".page-header p"
        );

        const farmLabel = document.querySelector(
            ".farm-label"
        );

        const farmNameElement = document.querySelector(
            "[data-farm-name]"
        );

        const headerIcon = document.querySelector(
            ".header-icon"
        );

        // =================================
        // STORE ORIGINAL VALUES
        // =================================

        const originalSoftwareDisplay =
            softwareBrand ? softwareBrand.style.display : "";

        const originalDescriptionDisplay =
            systemDescription ? systemDescription.style.display : "";

        const originalFarmLabelDisplay =
            farmLabel ? farmLabel.style.display : "";

        const originalIconDisplay =
            headerIcon ? headerIcon.style.display : "";

        const originalFarmNameText =
            farmNameElement ? farmNameElement.textContent : "";

        const originalFarmNameStyle =
            farmNameElement
                ? farmNameElement.getAttribute("style")
                : null;

        // =================================
        // HIDE SOFTWARE BRANDING
        // =================================

        if (softwareBrand) {
            softwareBrand.style.display = "none";
        }

        if (systemDescription) {
            systemDescription.style.display = "none";
        }

        if (farmLabel) {
            farmLabel.style.display = "none";
        }

        if (headerIcon) {
            headerIcon.style.display = "none";
        }

        // =================================
        // MAKE FARM NAME MAIN PRINT HEADING
        // =================================

        if (farmNameElement) {

            farmNameElement.textContent = farmName;

            farmNameElement.style.display = "block";
            farmNameElement.style.fontSize = "30px";
            farmNameElement.style.fontWeight = "800";
            farmNameElement.style.textAlign = "center";
            farmNameElement.style.lineHeight = "1.2";
            farmNameElement.style.margin = "0 0 12px 0";
            farmNameElement.style.letterSpacing = "0.5px";
        }

        // =================================
        // TEMPORARY PRINT CSS
        // =================================

        printStyle = document.createElement("style");

        printStyle.id = "farrowing-print-branding";

        printStyle.textContent = `
            @media print {

                .software-brand,
                .page-header p,
                .farm-label,
                .header-icon {
                    display: none !important;
                }

                [data-farm-name] {
                    display: block !important;
                    font-size: 30px !important;
                    font-weight: 800 !important;
                    text-align: center !important;
                    line-height: 1.2 !important;
                    margin: 0 0 12px 0 !important;
                    letter-spacing: 0.5px !important;
                }
            }
        `;

        document.head.appendChild(printStyle);

        // =================================
        // RESTORE ORIGINAL SCREEN
        // =================================

        restoreScreen = function () {

            if (softwareBrand) {
                softwareBrand.style.display =
                    originalSoftwareDisplay;
            }

            if (systemDescription) {
                systemDescription.style.display =
                    originalDescriptionDisplay;
            }

            if (farmLabel) {
                farmLabel.style.display =
                    originalFarmLabelDisplay;
            }

            if (headerIcon) {
                headerIcon.style.display =
                    originalIconDisplay;
            }

            if (farmNameElement) {

                farmNameElement.textContent =
                    originalFarmNameText;

                if (originalFarmNameStyle === null) {

                    farmNameElement.removeAttribute("style");

                } else {

                    farmNameElement.setAttribute(
                        "style",
                        originalFarmNameStyle
                    );
                }
            }

            if (printStyle) {
                printStyle.remove();
                printStyle = null;
            }

            window.removeEventListener(
                "afterprint",
                restoreScreen
            );
        };

        window.addEventListener(
            "afterprint",
            restoreScreen
        );

        // =================================
        // PRINT
        // =================================

        window.print();

        // Backup restoration in case afterprint
        // does not fire in the browser.
        setTimeout(function () {

            if (restoreScreen) {
                restoreScreen();
            }

        }, 3000);

    } catch (error) {

        console.error("PRINT REPORT ERROR:", error);

        if (restoreScreen) {
            restoreScreen();
        } else if (printStyle) {
            printStyle.remove();
        }

        showFarrowingNotification(
            "Unable to prepare the print report: " +
            (error.message || "Unknown error."),
            "error"
        );
    }
}


// =====================================
// CLEAR FORM
// =====================================

function clearForm() {

    const form = document.getElementById("farrowingForm");

    if (form) {
        form.reset();
    }

    const totalBornInput = document.getElementById("totalBorn");

    if (totalBornInput) {
        totalBornInput.value = "";
    }

    editID = null;
}


// =====================================
// SEARCH WHILE TYPING
// =====================================

const searchBox = document.getElementById("searchFarrowing");

if (searchBox) {

    searchBox.addEventListener(
        "input",
        searchRecord
    );
}


// =====================================
// LOAD RECORDS WHEN PAGE OPENS
// =====================================

document.addEventListener(
    "DOMContentLoaded",
    function () {
        loadRecords();
    }
);


// =====================================
// END OF FARROWING MODULE
// =====================================