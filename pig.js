// ==========================================================
// MUNKA PIGGERY TECHNOLOGY
// PIG REGISTRATION MODULE
// MULTI-FARM + PERMISSION-CONTROLLED VERSION
// CATEGORY-BASED LIVESTOCK REGISTRATION
// FARM NAME FIRST PRINT & PDF VERSION
// ==========================================================

let editID = null;


// ==========================================================
// GET LOGGED-IN USER
// ==========================================================

function getLoggedUser() {

    const user = JSON.parse(
        localStorage.getItem("loggedInUser")
    );

    if (!user) {
        alert("No logged-in user found. Please login again.");
        return null;
    }

    return user;
}


// ==========================================================
// GET FARM ID
// ==========================================================

function getFarmID() {

    const user = getLoggedUser();

    if (!user) return null;

    if (!user.farm_id) {

        alert(
            "Your account is not connected to a farm. " +
            "Please contact the administrator."
        );

        return null;
    }

    return user.farm_id;
}


// ==========================================================
// GET REGISTERED FARM NAME
// ==========================================================

async function getRegisteredFarmName() {

    const farmID = getFarmID();

    if (!farmID) return "REGISTERED FARM";

    try {

        const { data, error } = await supabaseClient
            .from("farms")
            .select("farm_name")
            .eq("id", farmID)
            .maybeSingle();

        if (error) throw error;

        if (data && data.farm_name) {
            return data.farm_name;
        }

    } catch (error) {

        console.error("GET FARM NAME ERROR:", error);

    }

    return "REGISTERED FARM";
}


// ==========================================================
// SAFE HTML DISPLAY
// ==========================================================

function escapePigHTML(value) {

    return String(value ?? "").replace(
        /[&<>"']/g,
        function (character) {

            const replacements = {
                "&": "&amp;",
                "<": "&lt;",
                ">": "&gt;",
                '"': "&quot;",
                "'": "&#39;"
            };

            return replacements[character];
        }
    );
}


// ==========================================================
// SAVE / UPDATE PIG RECORD
// ==========================================================

document
    .getElementById("pigForm")
    .addEventListener("submit", async function (e) {

        e.preventDefault();

        // ================================================
        // PERMISSIONS
        // ================================================

        if (editID === null) {

            if (
                typeof canAdd !== "function" ||
                !canAdd("Pig Registration")
            ) {

                alert(
                    "Access Denied.\n\n" +
                    "You do not have permission to add pig records."
                );

                return;
            }

        } else {

            if (
                typeof canEdit !== "function" ||
                !canEdit("Pig Registration")
            ) {

                alert(
                    "Access Denied.\n\n" +
                    "You do not have permission to edit pig records."
                );

                return;
            }
        }

        // ================================================
        // USER AND FARM
        // ================================================

        const loggedUser = getLoggedUser();

        if (!loggedUser) return;

        const farmID = getFarmID();

        if (!farmID) return;

        // ================================================
        // READ FORM
        // ================================================

        const pigID = document
            .getElementById("pigID")
            .value
            .trim();

        const category = document
            .getElementById("category")
            .value;

        if (!category) {
            alert("Please select a pig category.");
            return;
        }

        // ================================================
        // PREPARE DATABASE RECORD
        // ================================================

        const pig = {

            pig_id: pigID,

            breed: document
                .getElementById("breed")
                .value,

            category: category,

            farrow_date: document
                .getElementById("farrowDate")
                .value,

            source: document
                .getElementById("source")
                .value
                .trim(),

            weight: Number(
                document
                    .getElementById("weight")
                    .value
            ),

            health_status: document
                .getElementById("healthStatus")
                .value

        };

        try {

            // ============================================
            // ADD NEW PIG
            // ============================================

            if (editID === null) {

                pig.created_by = loggedUser.full_name;
                pig.updated_by = null;
                pig.updated_at = null;
                pig.farm_id = farmID;

                const { error } = await supabaseClient
                    .from("pigs")
                    .insert([pig]);

                if (error) throw error;

                await saveActivity(

                    loggedUser.full_name +
                    " (" +
                    loggedUser.role +
                    ")",

                    "Added",

                    "Pig Registration",

                    "Registered Pig ID: " +
                    pig.pig_id +
                    "; Category: " +
                    pig.category

                );

                alert("Pig record saved successfully.");

            }

            // ============================================
            // UPDATE EXISTING PIG
            // ============================================

            else {

                pig.updated_by = loggedUser.full_name;
                pig.updated_at = new Date().toISOString();

                // Do not change farm ownership or creator.
                const { error } = await supabaseClient
                    .from("pigs")
                    .update(pig)
                    .eq("id", editID)
                    .eq("farm_id", farmID);

                if (error) throw error;

                await saveActivity(

                    loggedUser.full_name +
                    " (" +
                    loggedUser.role +
                    ")",

                    "Updated",

                    "Pig Registration",

                    "Updated Pig ID: " +
                    pig.pig_id +
                    "; Category: " +
                    pig.category

                );

                alert("Pig record updated successfully.");

            }

            clearForm();

            await loadPigs();

        } catch (error) {

            console.error("SAVE / UPDATE PIG ERROR:", error);

            alert(
                "Unable to save the pig record.\n\n" +
                error.message
            );

        }

    });


// ==========================================================
// LOAD PIG RECORDS
// ==========================================================

async function loadPigs() {

    if (
        typeof canView !== "function" ||
        !canView("Pig Registration")
    ) {

        const table = document.getElementById("pigTable");

        if (table) {
            table.innerHTML =
                '<tr><td colspan="8">You do not have permission to view pig records.</td></tr>';
        }

        return;
    }

    const farmID = getFarmID();

    if (!farmID) return;

    try {

        const { data, error } = await supabaseClient
            .from("pigs")
            .select("*")
            .eq("farm_id", farmID)
            .order("id", { ascending: true });

        if (error) throw error;

        displayPigs(data || []);

    } catch (error) {

        console.error("LOAD PIGS ERROR:", error);

        alert(
            "Unable to load pig records.\n\n" +
            error.message
        );

    }

}


// ==========================================================
// DISPLAY PIG RECORDS
// ==========================================================

function displayPigs(records) {

    const table = document.getElementById("pigTable");

    if (!table) return;

    table.innerHTML = "";

    if (!records.length) {

        table.innerHTML =
            '<tr><td colspan="8">No pig records found.</td></tr>';

        return;
    }

    records.forEach(function (pig) {

        let actionButtons = "";

        // ================================================
        // EDIT BUTTON
        // ================================================

        if (
            typeof canEdit === "function" &&
            canEdit("Pig Registration")
        ) {

            actionButtons += `
                <button
                    type="button"
                    onclick="editPig(${Number(pig.id)})">
                    ✏️ Edit
                </button>
            `;

        }

        // ================================================
        // DELETE BUTTON
        // ================================================

        if (
            typeof canDelete === "function" &&
            canDelete("Pig Registration")
        ) {

            actionButtons += `
                <button
                    type="button"
                    onclick="deletePig(${Number(pig.id)})">
                    🗑️ Delete
                </button>
            `;

        }

        if (!actionButtons) {
            actionButtons = "<span>No actions</span>";
        }

        // ================================================
        // TABLE ROW
        // ================================================

        const row = document.createElement("tr");

        row.innerHTML = `

            <td>${escapePigHTML(pig.pig_id)}</td>

            <td>${escapePigHTML(pig.breed)}</td>

            <td>${escapePigHTML(pig.category || "Not assigned")}</td>

            <td>${escapePigHTML(pig.farrow_date)}</td>

            <td>${escapePigHTML(pig.source)}</td>

            <td>
                ${
                    pig.weight !== null && pig.weight !== undefined
                        ? escapePigHTML(pig.weight) + " Kg"
                        : ""
                }
            </td>

            <td>${escapePigHTML(pig.health_status)}</td>

            <td>${actionButtons}</td>

        `;

        table.appendChild(row);

    });

}


// ==========================================================
// EDIT PIG RECORD
// ==========================================================

async function editPig(id) {

    if (
        typeof canEdit !== "function" ||
        !canEdit("Pig Registration")
    ) {

        alert(
            "Access Denied.\n\n" +
            "You do not have permission to edit pig records."
        );

        return;
    }

    const farmID = getFarmID();

    if (!farmID) return;

    try {

        const { data, error } = await supabaseClient
            .from("pigs")
            .select("*")
            .eq("id", id)
            .eq("farm_id", farmID)
            .single();

        if (error) throw error;

        document.getElementById("pigID").value =
            data.pig_id || "";

        document.getElementById("breed").value =
            data.breed || "";

        document.getElementById("category").value =
            data.category || "";

        document.getElementById("farrowDate").value =
            data.farrow_date || "";

        document.getElementById("source").value =
            data.source || "";

        document.getElementById("weight").value =
            data.weight !== null && data.weight !== undefined
                ? String(data.weight)
                : "";

        document.getElementById("healthStatus").value =
            data.health_status || "";

        editID = id;

        const submitButton = document.querySelector(
            '#pigForm button[type="submit"]'
        );

        if (submitButton) {
            submitButton.textContent = "💾 Update Pig Record";
        }

        window.scrollTo({
            top: 0,
            behavior: "smooth"
        });

    } catch (error) {

        console.error("EDIT PIG ERROR:", error);

        alert(
            "Unable to open pig record.\n\n" +
            error.message
        );

    }

}


// ==========================================================
// DELETE PIG RECORD
// ==========================================================

async function deletePig(id) {

    if (
        typeof canDelete !== "function" ||
        !canDelete("Pig Registration")
    ) {

        alert(
            "Access Denied.\n\n" +
            "You do not have permission to delete pig records."
        );

        return;
    }

    const farmID = getFarmID();

    if (!farmID) return;

    const loggedUser = getLoggedUser();

    if (!loggedUser) return;

    try {

        // Get the pig ID for confirmation and activity log.
        const { data: pig, error: fetchError } =
            await supabaseClient
                .from("pigs")
                .select("pig_id")
                .eq("id", id)
                .eq("farm_id", farmID)
                .single();

        if (fetchError) throw fetchError;

        const confirmDelete = confirm(
            "Delete Pig ID: " + (pig.pig_id || id) + "?"
        );

        if (!confirmDelete) return;

        const { error } = await supabaseClient
            .from("pigs")
            .delete()
            .eq("id", id)
            .eq("farm_id", farmID);

        if (error) throw error;

        await saveActivity(

            loggedUser.full_name +
            " (" +
            loggedUser.role +
            ")",

            "Deleted",

            "Pig Registration",

            "Deleted Pig ID: " + (pig.pig_id || id)

        );

        alert("Pig record deleted successfully.");

        await loadPigs();

    } catch (error) {

        console.error("DELETE PIG ERROR:", error);

        alert(
            "Unable to delete pig record.\n\n" +
            error.message
        );

    }

}


// ==========================================================
// SEARCH PIG RECORDS
// Searches Pig ID, Breed and Category
// ==========================================================

async function searchPig() {

    if (
        typeof canView !== "function" ||
        !canView("Pig Registration")
    ) {

        alert(
            "Access Denied.\n\n" +
            "You do not have permission to view pig records."
        );

        return;
    }

    const farmID = getFarmID();

    if (!farmID) return;

    const keyword = document
        .getElementById("searchPig")
        .value
        .trim();

    try {

        let query = supabaseClient
            .from("pigs")
            .select("*")
            .eq("farm_id", farmID);

        if (keyword) {

            // Escape PostgREST filter punctuation.
            const safeKeyword = keyword.replace(
                /[%_,().]/g,
                " "
            );

            query = query.or(
                "pig_id.ilike.%" + safeKeyword + "%," +
                "breed.ilike.%" + safeKeyword + "%," +
                "category.ilike.%" + safeKeyword + "%"
            );

        }

        const { data, error } = await query
            .order("id", { ascending: true });

        if (error) throw error;

        displayPigs(data || []);

    } catch (error) {

        console.error("SEARCH PIG ERROR:", error);

        alert(
            "Unable to search pig records.\n\n" +
            error.message
        );

    }

}


// ==========================================================
// CLEAR FORM
// ==========================================================

function clearForm() {

    const form = document.getElementById("pigForm");

    if (form) {
        form.reset();
    }

    editID = null;

    const submitButton = document.querySelector(
        '#pigForm button[type="submit"]'
    );

    if (submitButton) {
        submitButton.textContent = "💾 Save Pig Record";
    }

}


// ==========================================================
// GENERATE CATEGORY REPORT
// ==========================================================

async function generateReport() {

    if (
        typeof canReport !== "function" ||
        !canReport("Pig Registration")
    ) {

        alert(
            "Access Denied.\n\n" +
            "You do not have permission to generate pig reports."
        );

        return;
    }

    const farmID = getFarmID();

    if (!farmID) return;

    try {

        const { data, error } = await supabaseClient
            .from("pigs")
            .select("category")
            .eq("farm_id", farmID);

        if (error) throw error;

        const records = data || [];

        const counts = {
            "Piglet": 0,
            "Weaner": 0,
            "Grower": 0,
            "Boar": 0,
            "Sow": 0,
            "Pregnant Sow": 0,
            "Lactating Sow": 0,
            "Unassigned": 0
        };

        records.forEach(function (pig) {

            if (
                Object.prototype.hasOwnProperty.call(
                    counts,
                    pig.category
                ) &&
                pig.category !== "Unassigned"
            ) {

                counts[pig.category]++;

            } else {

                counts["Unassigned"]++;

            }

        });

        const totalSows =
            counts["Sow"] +
            counts["Pregnant Sow"] +
            counts["Lactating Sow"];

        alert(

            "PIG REGISTRATION REPORT\n\n" +

            "Total Registered Pigs: " + records.length + "\n\n" +

            "Piglets: " + counts["Piglet"] + "\n" +

            "Weaners: " + counts["Weaner"] + "\n" +

            "Growers: " + counts["Grower"] + "\n" +

            "Boars: " + counts["Boar"] + "\n" +

            "Total Sows: " + totalSows + "\n" +

            "Pregnant Sows: " + counts["Pregnant Sow"] + "\n" +

            "Lactating Sows: " + counts["Lactating Sow"] + "\n" +

            "Category Not Assigned: " + counts["Unassigned"]

        );

    } catch (error) {

        console.error("PIG REPORT ERROR:", error);

        alert(
            "Unable to generate pig report.\n\n" +
            error.message
        );

    }

}


// ==========================================================
// PRINT REPORT
// Uses the existing page print layout.
// ==========================================================

async function printReport() {

    if (
        typeof canReport !== "function" ||
        !canReport("Pig Registration")
    ) {

        alert(
            "Access Denied.\n\n" +
            "You do not have permission to print pig reports."
        );

        return;
    }

    try {

        const farmName = await getRegisteredFarmName();

        const pageHeader = document.querySelector(".page-header");

        if (!pageHeader) {
            window.print();
            return;
        }

        const softwareBrand =
            pageHeader.querySelector(".software-brand");

        const subtitle =
            pageHeader.querySelector("p");

        const farmLabel =
            pageHeader.querySelector(".farm-label");

        const farmNameElement =
            pageHeader.querySelector("[data-farm-name]");

        const pigIcon =
            pageHeader.querySelector(".pig-icon");

        const originalFarmName = farmNameElement
            ? farmNameElement.textContent
            : "";

        if (farmNameElement) {
            farmNameElement.textContent = farmName;
            farmNameElement.classList.add("print-farm-name");
        }

        if (softwareBrand) softwareBrand.style.display = "none";
        if (subtitle) subtitle.style.display = "none";
        if (farmLabel) farmLabel.style.display = "none";
        if (pigIcon) pigIcon.style.display = "none";

        pageHeader.classList.add("printing-farm-header");

        const printStyle = document.createElement("style");

        printStyle.id = "temporary-farm-print-style";

        printStyle.textContent = `
            @media print {

                .printing-farm-header {
                    display: block !important;
                    width: 100% !important;
                    text-align: center !important;
                    margin-bottom: 18px !important;
                    padding: 0 !important;
                    background: transparent !important;
                    box-shadow: none !important;
                }

                .printing-farm-header [data-farm-name] {
                    display: block !important;
                    visibility: visible !important;
                    font-size: 30px !important;
                    font-weight: 800 !important;
                    text-align: center !important;
                    color: #000 !important;
                    margin: 0 0 12px 0 !important;
                    padding: 0 !important;
                    border: none !important;
                }

                .printing-farm-header .software-brand,
                .printing-farm-header p,
                .printing-farm-header .farm-label,
                .printing-farm-header .pig-icon {
                    display: none !important;
                }

            }
        `;

        document.head.appendChild(printStyle);

        const restorePrintPage = function () {

            if (farmNameElement) {
                farmNameElement.textContent = originalFarmName;
                farmNameElement.classList.remove("print-farm-name");
            }

            if (softwareBrand) softwareBrand.style.display = "";
            if (subtitle) subtitle.style.display = "";
            if (farmLabel) farmLabel.style.display = "";
            if (pigIcon) pigIcon.style.display = "";

            pageHeader.classList.remove("printing-farm-header");

            const temporaryStyle = document.getElementById(
                "temporary-farm-print-style"
            );

            if (temporaryStyle) temporaryStyle.remove();

            window.removeEventListener("afterprint", restorePrintPage);

        };

        window.addEventListener("afterprint", restorePrintPage);

        window.print();

    } catch (error) {

        console.error("PRINT REPORT ERROR:", error);

        alert(
            "Unable to prepare the print report.\n\n" +
            error.message
        );

    }

}


// ==========================================================
// DOWNLOAD PDF REPORT
// Category-based version
// ==========================================================

async function downloadPDF() {

    if (
        typeof canReport !== "function" ||
        !canReport("Pig Registration")
    ) {

        alert(
            "Access Denied.\n\n" +
            "You do not have permission to download pig reports."
        );

        return;
    }

    if (typeof window.jspdf === "undefined") {

        alert(
            "PDF library could not be loaded. " +
            "Please check your internet connection and try again."
        );

        return;
    }

    const farmID = getFarmID();

    if (!farmID) return;

    const loggedUser = getLoggedUser();

    if (!loggedUser) return;

    try {

        const farmName = await getRegisteredFarmName();

        const { data, error } = await supabaseClient
            .from("pigs")
            .select("*")
            .eq("farm_id", farmID)
            .order("id", { ascending: true });

        if (error) throw error;

        const records = data || [];

        const { jsPDF } = window.jspdf;

        const doc = new jsPDF({
            orientation: "landscape",
            unit: "mm",
            format: "a4"
        });

        // ================================================
        // FARM NAME
        // ================================================

        doc.setFontSize(22);
        doc.setFont("helvetica", "bold");

        doc.text(
            farmName,
            148,
            18,
            { align: "center" }
        );

        // ================================================
        // REPORT TITLE
        // ================================================

        doc.setFontSize(15);

        doc.text(
            "PIG REGISTRATION REPORT",
            148,
            30,
            { align: "center" }
        );

        // ================================================
        // REPORT DETAILS
        // ================================================

        const generatedDate = new Date().toLocaleString(
            "en-ZM",
            { timeZone: "Africa/Lusaka" }
        );

        doc.setFontSize(9);
        doc.setFont("helvetica", "normal");

        doc.text("Generated: " + generatedDate, 14, 40);

        doc.text(
            "Generated By: " +
            (loggedUser.full_name || "System User"),
            14,
            46
        );

        doc.text(
            "Total Registered Pigs: " + records.length,
            14,
            52
        );

        // ================================================
        // TABLE ROWS
        // ================================================

        const tableRows = records.map(function (pig) {

            return [

                pig.pig_id || "",

                pig.breed || "",

                pig.category || "Not assigned",

                pig.farrow_date || "",

                pig.source || "",

                pig.weight !== null && pig.weight !== undefined
                    ? pig.weight + " Kg"
                    : "",

                pig.health_status || ""

            ];

        });

        // ================================================
        // PDF TABLE
        // ================================================

        doc.autoTable({

            startY: 59,

            head: [[
                "Pig ID",
                "Breed",
                "Category",
                "Farrow Date",
                "Source",
                "Weight",
                "Health Status"
            ]],

            body: tableRows,

            theme: "grid",

            styles: {
                fontSize: 8,
                cellPadding: 3,
                valign: "middle"
            },

            headStyles: {
                fontSize: 8,
                fontStyle: "bold",
                halign: "center"
            },

            columnStyles: {
                0: { cellWidth: 25 },
                1: { cellWidth: 35 },
                2: { cellWidth: 30 },
                3: { cellWidth: 30 },
                4: { cellWidth: 45 },
                5: { cellWidth: 25 },
                6: { cellWidth: 40 }
            },

            margin: {
                left: 10,
                right: 10
            }

        });

        // ================================================
        // FOOTER
        // ================================================

        const pageCount = doc.internal.getNumberOfPages();

        for (let page = 1; page <= pageCount; page++) {

            doc.setPage(page);

            const pageHeight = doc.internal.pageSize.height;

            doc.setFontSize(8);
            doc.setFont("helvetica", "normal");

            doc.text(
                farmName,
                10,
                pageHeight - 8
            );

            doc.text(
                "Page " + page + " of " + pageCount,
                287,
                pageHeight - 8,
                { align: "right" }
            );

        }

        // ================================================
        // DOWNLOAD FILE
        // ================================================

        const datePart = new Date()
            .toISOString()
            .split("T")[0];

        const fileName =
            farmName.replace(/[^a-z0-9]/gi, "_") +
            "_Pig_Registration_" +
            datePart +
            ".pdf";

        doc.save(fileName);

    } catch (error) {

        console.error("DOWNLOAD PDF ERROR:", error);

        alert(
            "Unable to generate PDF.\n\n" +
            error.message
        );

    }

}


// ==========================================================
// LOAD RECORDS WHEN PAGE OPENS
// ==========================================================

window.addEventListener("load", function () {
    loadPigs();
});


// ==========================================================
// SEARCH WHILE TYPING
// ==========================================================

const searchBox = document.getElementById("searchPig");

if (searchBox) {
    searchBox.addEventListener("keyup", searchPig);
}