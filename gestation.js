// ==========================================================
// MUNKA PIGGERY TECHNOLOGY
// GESTATION RECORDS MODULE
// FARM-SECURED + PERMISSION-CONTROLLED VERSION
// CUSTOM IN-PAGE NOTIFICATIONS
// ==========================================================
//
// FARM SECURITY:
// Every record belongs to the logged-in user's farm_id.
//
// PERMISSIONS:
// canView("Gestation")
// canAdd("Gestation")
// canEdit("Gestation")
// canDelete("Gestation")
// canReport("Gestation")
//
// DELETE:
// ONLY Owner/Admin AND Farm Manager
//
// NOTIFICATION SYSTEM:
// Uses custom notifications instead of browser alert().
// ==========================================================

let gestationRecords = [];
let editId = null;


// ==========================================================
// CUSTOM NOTIFICATION SYSTEM
// ==========================================================

function showGestationNotification(message, type = "success", duration) {

    let container = document.getElementById(
        "gestationNotificationContainer"
    );

    if (!container) {

        container = document.createElement("div");

        container.id = "gestationNotificationContainer";

        container.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            z-index: 999999;
            display: flex;
            flex-direction: column;
            gap: 10px;
            width: min(390px, calc(100vw - 32px));
            pointer-events: none;
        `;

        document.body.appendChild(container);

    }

    const notification = document.createElement("div");

    const settings = {
        success: {
            background: "#dcfce7",
            border: "#16a34a",
            color: "#166534",
            icon: "✓"
        },
        error: {
            background: "#fee2e2",
            border: "#dc2626",
            color: "#991b1b",
            icon: "✕"
        },
        warning: {
            background: "#fef3c7",
            border: "#d97706",
            color: "#92400e",
            icon: "!"
        },
        info: {
            background: "#dbeafe",
            border: "#2563eb",
            color: "#1e40af",
            icon: "i"
        }
    };

    const style = settings[type] || settings.info;

    notification.style.cssText = `
        display: flex;
        align-items: flex-start;
        gap: 12px;
        padding: 15px 17px;
        background: ${style.background};
        color: ${style.color};
        border-left: 5px solid ${style.border};
        border-radius: 9px;
        box-shadow: 0 6px 22px rgba(0,0,0,0.18);
        font-family: Arial, sans-serif;
        font-size: 14px;
        line-height: 1.5;
        font-weight: 500;
        white-space: pre-line;
        overflow-wrap: anywhere;
        opacity: 0;
        transform: translateX(20px);
        transition: opacity 0.25s ease, transform 0.25s ease;
        pointer-events: auto;
    `;

    const icon = document.createElement("span");

    icon.textContent = style.icon;

    icon.style.cssText = `
        display: inline-flex;
        flex-shrink: 0;
        align-items: center;
        justify-content: center;
        width: 23px;
        height: 23px;
        border-radius: 50%;
        background: ${style.border};
        color: #ffffff;
        font-weight: bold;
    `;

    const text = document.createElement("div");

    text.textContent = String(message);

    text.style.cssText = `
        flex: 1;
        min-width: 0;
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
        line-height: 20px;
        cursor: pointer;
        padding: 0 0 0 5px;
    `;

    notification.appendChild(icon);
    notification.appendChild(text);
    notification.appendChild(closeButton);

    container.appendChild(notification);

    requestAnimationFrame(function () {

        notification.style.opacity = "1";
        notification.style.transform = "translateX(0)";

    });

    let removed = false;

    function removeNotification() {

        if (removed) {
            return;
        }

        removed = true;

        notification.style.opacity = "0";
        notification.style.transform = "translateX(20px)";

        setTimeout(function () {

            if (notification.parentNode) {
                notification.remove();
            }

            if (
                container &&
                container.childElementCount === 0
            ) {
                container.remove();
            }

        }, 300);

    }

    closeButton.addEventListener(
        "click",
        removeNotification
    );

    const displayDuration =
        Number.isFinite(duration)
            ? duration
            : (type === "error" ? 6000 : 3500);

    setTimeout(
        removeNotification,
        displayDuration
    );

}


// ==========================================================
// GET LOGGED-IN USER
// ==========================================================

function getLoggedUser() {

    try {

        const storedUser = localStorage.getItem("loggedInUser");

        if (!storedUser) {

            showGestationNotification(
                "No logged-in user found. Please log in again.",
                "error"
            );

            return null;

        }

        const user = JSON.parse(storedUser);

        if (!user || typeof user !== "object") {

            showGestationNotification(
                "Your login information is invalid. Please log in again.",
                "error"
            );

            return null;

        }

        return user;

    } catch (error) {

        console.error("GET LOGGED USER ERROR:", error);

        showGestationNotification(
            "Unable to read your login information. Please log in again.",
            "error"
        );

        return null;

    }

}


// ==========================================================
// GET FARM ID
// ==========================================================

function getFarmID() {

    const loggedUser = getLoggedUser();

    if (!loggedUser) {
        return null;
    }

    const farmID = loggedUser.farm_id;

    if (
        farmID === null ||
        farmID === undefined ||
        farmID === ""
    ) {

        showGestationNotification(
            "Your account is not assigned to a farm. Please contact the administrator.",
            "error"
        );

        return null;

    }

    return farmID;

}


// ==========================================================
// GET REGISTERED FARM NAME
// Used by PRINT and PDF reports.
// ==========================================================

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

        const {
            data: farm,
            error
        } = await supabaseClient
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


// ==========================================================
// CHECK DELETE ROLE
// ONLY OWNER/ADMIN AND FARM MANAGER
// ==========================================================

function canDeleteGestation() {

    const loggedUser = getLoggedUser();

    if (!loggedUser) {
        return false;
    }

    const role = String(
        loggedUser.role || ""
    ).trim().toLowerCase();

    return (
        role === "owner" ||
        role === "admin" ||
        role === "owner/admin" ||
        role === "farm manager"
    );

}


// ==========================================================
// LOAD FARM RECORDS ONLY
// ==========================================================

async function loadGestationRecords() {

    try {

        const farmID = getFarmID();

        if (!farmID) {
            return;
        }

        const {
            data,
            error
        } = await supabaseClient
            .from("gestation_records")
            .select("*")
            .eq("farm_id", farmID)
            .order("id", {
                ascending: true
            });

        if (error) {
            throw error;
        }

        gestationRecords = Array.isArray(data) ? data : [];

        displayRecords();

    } catch (error) {

        console.error("LOAD GESTATION ERROR:", error);

        showGestationNotification(
            "Unable to load gestation records.\n" +
            (error.message || "Please try again."),
            "error"
        );

    }

}


// ==========================================================
// AUTOMATIC DATE CALCULATION
// ==========================================================

function calculateGestationDates() {

    const serviceInput = document.getElementById("serviceDate");

    if (!serviceInput || !serviceInput.value) {
        return;
    }

    const serviceDate = new Date(
        serviceInput.value + "T00:00:00"
    );

    if (Number.isNaN(serviceDate.getTime())) {

        showGestationNotification(
            "Please enter a valid service date.",
            "warning"
        );

        return;

    }

    function addDays(days) {

        const date = new Date(serviceDate);

        date.setDate(date.getDate() + days);

        const year = date.getFullYear();

        const month = String(
            date.getMonth() + 1
        ).padStart(2, "0");

        const day = String(
            date.getDate()
        ).padStart(2, "0");

        return year + "-" + month + "-" + day;

    }

    const dateFields = [
        ["check21", 21],
        ["feed90", 90],
        ["deworm101", 101],
        ["litter101", 101],
        ["actionDay", 107],
        ["deliveryDate", 114],
        ["farrowsure", 114]
    ];

    dateFields.forEach(function (item) {

        const field = document.getElementById(item[0]);

        if (field) {
            field.value = addDays(item[1]);
        }

    });

}


// ==========================================================
// SAVE / UPDATE RECORD
// ==========================================================

const gestationForm = document.getElementById("gestationForm");

if (gestationForm) {

    gestationForm.addEventListener(
        "submit",
        async function (e) {

            e.preventDefault();

            // ----------------------------------------------
            // ADD PERMISSION
            // ----------------------------------------------

            if (
                typeof canAdd === "function" &&
                editId === null &&
                !canAdd("Gestation")
            ) {

                showGestationNotification(
                    "Access Denied.\nYou do not have permission to add gestation records.",
                    "error"
                );

                return;

            }

            // ----------------------------------------------
            // EDIT PERMISSION
            // ----------------------------------------------

            if (
                typeof canEdit === "function" &&
                editId !== null &&
                !canEdit("Gestation")
            ) {

                showGestationNotification(
                    "Access Denied.\nYou do not have permission to edit gestation records.",
                    "error"
                );

                return;

            }

            const loggedUser = getLoggedUser();

            if (!loggedUser) {
                return;
            }

            const farmID = getFarmID();

            if (!farmID) {
                return;
            }

            const record = {

                farm_id:
                    farmID,

                sow_id:
                    document.getElementById("sowID").value.trim(),

                registration_date:
                    document.getElementById("registrationDate").value,

                breed:
                    document.getElementById("breed").value,

                number_of_teats:
                    parseInt(
                        document.getElementById("teats").value,
                        10
                    ) || null,

                parity:
                    document.getElementById("parity").value,

                service_date:
                    document.getElementById("serviceDate").value,

                boarr_semen_used:
                    document.getElementById("boar").value.trim(),

                check21:
                    document.getElementById("check21").value,

                feed90:
                    document.getElementById("feed90").value,

                deworm101:
                    document.getElementById("deworm101").value,

                litter101:
                    document.getElementById("litter101").value,

                action_day:
                    document.getElementById("actionDay").value,

                delivery_date:
                    document.getElementById("deliveryDate").value,

                farrowsure:
                    document.getElementById("farrowsure").value,

                status:
                    document.getElementById("status").value,

                notes:
                    document.getElementById("notes").value.trim(),

                created_by:
                    loggedUser.full_name,

                updated_by:
                    null,

                updated_at:
                    null

            };

            let result;
            let actionType;

            try {

                // ------------------------------------------
                // NEW RECORD
                // ------------------------------------------

                if (editId === null) {

                    actionType = "Added";

                    result = await supabaseClient
                        .from("gestation_records")
                        .insert([record]);

                }

                // ------------------------------------------
                // UPDATE RECORD
                // ------------------------------------------

                else {

                    actionType = "Updated";

                    // Do not allow farm_id to be changed.
                    delete record.farm_id;

                    record.updated_by = loggedUser.full_name;

                    record.updated_at = new Date().toISOString();

                    result = await supabaseClient
                        .from("gestation_records")
                        .update(record)
                        .eq("id", editId)
                        .eq("farm_id", farmID);

                }

                if (result.error) {
                    throw result.error;
                }

                // ------------------------------------------
                // ACTIVITY LOG
                // ------------------------------------------

                try {

                    await saveActivity(
                        loggedUser.full_name + " (" + loggedUser.role + ")",
                        actionType,
                        "Gestation Records",
                        actionType + " gestation record for Sow ID: " + record.sow_id
                    );

                } catch (activityError) {

                    console.error(
                        "GESTATION ACTIVITY LOG ERROR:",
                        activityError
                    );

                }

                showGestationNotification(
                    editId === null
                        ? "Gestation record saved successfully."
                        : "Gestation record updated successfully.",
                    "success"
                );

                editId = null;

                document.getElementById("gestationForm").reset();

                loadGestationRecords();

            } catch (error) {

                console.error("SAVE/UPDATE GESTATION ERROR:", error);

                showGestationNotification(
                    "Unable to save the gestation record.\n" +
                    (error.message || "Please try again."),
                    "error"
                );

            }

        }
    );

}


// ==========================================================
// DISPLAY RECORDS
// ==========================================================

function displayRecords(records = gestationRecords) {

    const table = document.getElementById("gestationTable");

    if (!table) {
        return;
    }

    table.innerHTML = "";

    records.forEach(function (record) {

        let actionButtons = "";

        // ----------------------------------------------
        // EDIT BUTTON
        // ----------------------------------------------

        if (
            typeof canEdit === "function" &&
            canEdit("Gestation")
        ) {

            actionButtons += `
                <button
                    type="button"
                    onclick="editRecord(${Number(record.id)})">
                    ✏️ Edit
                </button>
            `;

        }

        // ----------------------------------------------
        // DELETE BUTTON
        // ----------------------------------------------

        if (canDeleteGestation()) {

            actionButtons += `
                <button
                    type="button"
                    onclick="deleteRecord(${Number(record.id)})">
                    🗑️ Delete
                </button>
            `;

        }

        if (!actionButtons) {
            actionButtons = "<span>No actions</span>";
        }

        const row = document.createElement("tr");

        const values = [
            record.sow_id || "",
            record.breed || "",
            record.service_date || "",
            record.delivery_date || "",
            record.status || ""
        ];

        values.forEach(function (value) {

            const cell = document.createElement("td");

            // textContent prevents database text from being interpreted as HTML.
            cell.textContent = String(value);

            row.appendChild(cell);

        });

        const actionCell = document.createElement("td");

        actionCell.innerHTML = actionButtons;

        row.appendChild(actionCell);

        table.appendChild(row);

    });

}


// ==========================================================
// EDIT RECORD
// ==========================================================

function editRecord(id) {

    if (
        typeof canEdit === "function" &&
        !canEdit("Gestation")
    ) {

        showGestationNotification(
            "Access Denied.\nYou do not have permission to edit gestation records.",
            "error"
        );

        return;

    }

    const record = gestationRecords.find(function (item) {

        return String(item.id) === String(id);

    });

    if (!record) {

        showGestationNotification(
            "The selected gestation record could not be found.",
            "error"
        );

        return;

    }

    document.getElementById("sowID").value =
        record.sow_id || "";

    document.getElementById("registrationDate").value =
        record.registration_date || "";

    document.getElementById("breed").value =
        record.breed || "";

    document.getElementById("teats").value =
        record.number_of_teats || "";

    document.getElementById("parity").value =
        record.parity || "";

    document.getElementById("serviceDate").value =
        record.service_date || "";

    document.getElementById("boar").value =
        record.boarr_semen_used || "";

    document.getElementById("check21").value =
        record.check21 || "";

    document.getElementById("feed90").value =
        record.feed90 || "";

    document.getElementById("deworm101").value =
        record.deworm101 || "";

    document.getElementById("litter101").value =
        record.litter101 || "";

    document.getElementById("actionDay").value =
        record.action_day || "";

    document.getElementById("deliveryDate").value =
        record.delivery_date || "";

    document.getElementById("farrowsure").value =
        record.farrowsure || "";

    document.getElementById("status").value =
        record.status || "";

    document.getElementById("notes").value =
        record.notes || "";

    editId = record.id;

    window.scrollTo({
        top: 0,
        behavior: "smooth"
    });

}


// ==========================================================
// DELETE RECORD
// ==========================================================

async function deleteRecord(id) {

    // ----------------------------------------------
    // ROLE CHECK
    // ----------------------------------------------

    if (!canDeleteGestation()) {

        showGestationNotification(
            "Access Denied.\nOnly Owner/Admin and Farm Manager can delete gestation records.",
            "error"
        );

        return;

    }

    // This is still a native confirmation dialog.
    // The success/error messages below use custom notifications.

    if (!confirm("Delete this gestation record?")) {
        return;
    }

    const loggedUser = getLoggedUser();

    if (!loggedUser) {
        return;
    }

    const farmID = getFarmID();

    if (!farmID) {
        return;
    }

    try {

        const deletedRecord = gestationRecords.find(function (record) {

            return String(record.id) === String(id);

        });

        const {
            error
        } = await supabaseClient
            .from("gestation_records")
            .delete()
            .eq("id", id)
            .eq("farm_id", farmID);

        if (error) {
            throw error;
        }

        // ------------------------------------------
        // ACTIVITY LOG
        // ------------------------------------------

        try {

            await saveActivity(
                loggedUser.full_name + " (" + loggedUser.role + ")",
                "Deleted",
                "Gestation Records",
                "Deleted gestation record for Sow ID: " +
                (deletedRecord ? deletedRecord.sow_id : id)
            );

        } catch (activityError) {

            console.error(
                "GESTATION ACTIVITY LOG ERROR:",
                activityError
            );

        }

        showGestationNotification(
            "Gestation record deleted successfully.",
            "success"
        );

        await loadGestationRecords();

    } catch (error) {

        console.error("DELETE GESTATION ERROR:", error);

        showGestationNotification(
            "Unable to delete the gestation record.\n" +
            (error.message || "Please try again."),
            "error"
        );

    }

}


// ==========================================================
// SEARCH RECORD
// ==========================================================

function searchRecord() {

    if (
        typeof canView === "function" &&
        !canView("Gestation")
    ) {

        showGestationNotification(
            "Access Denied.\nYou do not have permission to view gestation records.",
            "error"
        );

        return;

    }

    const search = document
        .getElementById("searchGestation")
        .value
        .trim()
        .toLowerCase();

    if (search === "") {

        displayRecords();

        return;

    }

    const filtered = gestationRecords.filter(function (record) {

        return (
            String(record.sow_id || "").toLowerCase().includes(search) ||
            String(record.breed || "").toLowerCase().includes(search) ||
            String(record.status || "").toLowerCase().includes(search)
        );

    });

    displayRecords(filtered);

}


// ==========================================================
// CUSTOM REPORT MODAL
// Replaces the old browser alert used for report summaries.
// ==========================================================

function showGestationReportModal(reportText) {

    const existing = document.getElementById(
        "gestationReportModal"
    );

    if (existing) {
        existing.remove();
    }

    const overlay = document.createElement("div");

    overlay.id = "gestationReportModal";

    overlay.style.cssText = `
        position: fixed;
        inset: 0;
        z-index: 999998;
        background: rgba(0,0,0,0.6);
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 16px;
    `;

    const modal = document.createElement("div");

    modal.style.cssText = `
        width: min(420px, 100%);
        background: #ffffff;
        border-radius: 14px;
        overflow: hidden;
        box-shadow: 0 15px 45px rgba(0,0,0,0.3);
        font-family: Arial, sans-serif;
    `;

    const header = document.createElement("div");

    header.textContent = "GESTATION REPORT";

    header.style.cssText = `
        background: #166534;
        color: #ffffff;
        font-size: 17px;
        font-weight: bold;
        padding: 18px;
    `;

    const body = document.createElement("pre");

    body.textContent = reportText;

    body.style.cssText = `
        white-space: pre-wrap;
        overflow-wrap: anywhere;