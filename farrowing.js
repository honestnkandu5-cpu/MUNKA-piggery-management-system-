// =====================================
// MUNKA PIGGERY TECHNOLOGY
// FARROWING RECORDS - SUPABASE
// FARM-SECURED VERSION
// REGISTERED FARM PDF / PRINT VERSION
// =====================================

let farrowingRecords = [];
let editID = null;


// =====================================
// GET LOGGED-IN USER
// =====================================

function getLoggedUser() {

    const user =
        JSON.parse(
            localStorage.getItem("loggedInUser")
        );

    if (!user) {

        alert(
            "No logged-in user found. Please login again."
        );

        return null;
    }

    return user;
}


// =====================================
// GET FARM ID
// =====================================

function getFarmID() {

    const loggedUser = getLoggedUser();

    if (!loggedUser) {
        return null;
    }

    if (!loggedUser.farm_id) {

        alert(
            "Your account is not linked to a farm. Please contact the administrator."
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

        if (
            typeof supabaseClient === "undefined"
        ) {

            return "REGISTERED FARM";

        }


        const loggedUser =
            getLoggedUser();


        if (!loggedUser) {

            return "REGISTERED FARM";

        }


        const farmID =
            loggedUser.farm_id;


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

            console.error(
                "GET FARM NAME ERROR:",
                error
            );

            return "REGISTERED FARM";

        }


        if (
            farm &&
            farm.farm_name
        ) {

            return String(
                farm.farm_name
            ).trim();

        }


        return "REGISTERED FARM";


    } catch (error) {

        console.error(
            "FARM NAME ERROR:",
            error
        );

        return "REGISTERED FARM";

    }

}


// =====================================
// LOAD ALL RECORDS
// =====================================

async function loadRecords() {

    try {

        const farmID = getFarmID();

        if (!farmID) return;


        const { data, error } =

            await supabaseClient

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

        console.error(error);

        alert(error.message);

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


    const farrowDate =
        new Date(
            farrowDateValue + "T00:00:00"
        );


    if (isNaN(farrowDate.getTime())) return;


    function addDays(days) {

        const date =
            new Date(farrowDate);

        date.setDate(
            date.getDate() + days
        );

        return date
            .toISOString()
            .split("T")[0];

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


document
    .getElementById("farrowDate")
    .addEventListener(
        "change",
        calculateFarrowingDates
    );


// =====================================
// TOTAL BORN CALCULATION
// =====================================

function calculateTotalBorn() {

    const bornAlive =
        Number(
            document.getElementById("bornAlive").value
        ) || 0;


    const stillborn =
        Number(
            document.getElementById("stillborn").value
        ) || 0;


    const mummified =
        Number(
            document.getElementById("mummified").value
        ) || 0;


    document.getElementById("totalBorn").value =
        bornAlive +
        stillborn +
        mummified;

}


document
    .getElementById("bornAlive")
    .addEventListener(
        "change",
        calculateTotalBorn
    );


document
    .getElementById("stillborn")
    .addEventListener(
        "change",
        calculateTotalBorn
    );


document
    .getElementById("mummified")
    .addEventListener(
        "change",
        calculateTotalBorn
    );


// =====================================
// SAVE / UPDATE RECORD
// =====================================

document
    .getElementById("farrowingForm")
    .addEventListener(
        "submit",
        async function (e) {

            e.preventDefault();


            const loggedUser =
                getLoggedUser();

            if (!loggedUser) return;


            const farmID =
                getFarmID();

            if (!farmID) return;


            calculateTotalBorn();


            const record = {

                farm_id:
                    farmID,

                sow_id:
                    document
                        .getElementById("sowID")
                        .value
                        .trim(),

                breed:
                    document
                        .getElementById("breed")
                        .value,

                farrow_date:
                    document
                        .getElementById("farrowDate")
                        .value,

                teeth_date:
                    document
                        .getElementById("teethDate")
                        .value,

                tail_date:
                    document
                        .getElementById("tailDate")
                        .value,

                iron_date:
                    document
                        .getElementById("ironDate")
                        .value,

                weaning_date:
                    document
                        .getElementById("weaningDate")
                        .value,

                born_alive:
                    Number(
                        document
                            .getElementById("bornAlive")
                            .value
                    ) || 0,

                stillborn:
                    Number(
                        document
                            .getElementById("stillborn")
                            .value
                    ) || 0,

                mummified:
                    Number(
                        document
                            .getElementById("mummified")
                            .value
                    ) || 0,

                total_born:
                    Number(
                        document
                            .getElementById("totalBorn")
                            .value
                    ) || 0,

                male_piglets:
                    Number(
                        document
                            .getElementById("malePiglets")
                            .value
                    ) || 0,

                female_piglets:
                    Number(
                        document
                            .getElementById("femalePiglets")
                            .value
                    ) || 0,

                total_weaned:
                    Number(
                        document
                            .getElementById("totalWeaned")
                            .value
                    ) || 0,

                birth_weight:
                    Number(
                        document
                            .getElementById("birthWeight")
                            .value
                    ) || 0,

                mortality:
                    Number(
                        document
                            .getElementById("mortality")
                            .value
                    ) || 0,

                mortality_reason:
                    document
                        .getElementById("mortalityReason")
                        .value,

                sow_condition:
                    document
                        .getElementById("sowCondition")
                        .value,

                notes:
                    document
                        .getElementById("notes")
                        .value,

                created_by:
                    loggedUser.full_name,

                updated_by:
                    null,

                updated_at:
                    null

            };


            try {

                // =================================
                // ADD NEW RECORD
                // =================================

                if (editID === null) {

                    const { error } =

                        await supabaseClient

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


                    alert(
                        "Farrowing record saved successfully."
                    );

                }


                // =================================
                // UPDATE EXISTING RECORD
                // =================================

                else {

                    record.updated_by =
                        loggedUser.full_name;


                    record.updated_at =
                        new Date().toISOString();


                    // Prevent changing farm ownership
                    delete record.farm_id;


                    const { error } =

                        await supabaseClient

                        .from("farrowing_records")

                        .update(record)

                        .eq("id", editID)

                        .eq("farm_id", farmID);


                    if (error) throw error;


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


                    alert(
                        "Farrowing record updated successfully."
                    );


                    editID = null;

                }


                document
                    .getElementById("farrowingForm")
                    .reset();


                document.getElementById("totalBorn").value = "";


                loadRecords();


            } catch (error) {

                console.error(error);

                alert(error.message);

            }

        }
    );


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

function displayRecords(
    records = farrowingRecords
) {

    const table =
        document.getElementById(
            "farrowingTable"
        );


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

        table.innerHTML += `

            <tr>

                <td>
                    ${escapeHTML(record.sow_id)}
                </td>

                <td>
                    ${escapeHTML(record.breed)}
                </td>

                <td>
                    ${escapeHTML(record.farrow_date)}
                </td>

                <td>
                    ${escapeHTML(record.born_alive)}
                </td>

                <td>
                    ${escapeHTML(record.stillborn)}
                </td>

                <td>
                    ${escapeHTML(record.mummified)}
                </td>

                <td>
                    <strong>
                        ${escapeHTML(record.total_born)}
                    </strong>
                </td>

                <td>
                    ${escapeHTML(record.mortality)}
                </td>

                <td>
                    ${escapeHTML(record.total_weaned)}
                </td>

                <td>
                    ${escapeHTML(record.weaning_date)}
                </td>

                <td class="action-cell">

                    <button
                        type="button"
                        class="edit-btn"
                        onclick="editRecord(${record.id})"
                    >
                        ✏️ Edit
                    </button>

                    <button
                        type="button"
                        class="delete-btn"
                        onclick="deleteRecord(${record.id})"
                    >
                        🗑️ Delete
                    </button>

                </td>

            </tr>

        `;

    });

}


// =====================================
// DELETE RECORD
// =====================================

async function deleteRecord(id) {

    if (
        !confirm(
            "Delete this farrowing record?"
        )
    ) {
        return;
    }


    const loggedUser =
        getLoggedUser();

    if (!loggedUser) return;


    const farmID =
        getFarmID();

    if (!farmID) return;


    try {

        const { error } =

            await supabaseClient

            .from("farrowing_records")

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

            "Farrowing Records",

            "Deleted farrowing record ID: " +
            id

        );


        alert(
            "Record deleted successfully."
        );


        loadRecords();


    } catch (error) {

        console.error(error);

        alert(error.message);

    }

}


// =====================================
// EDIT RECORD
// =====================================

async function editRecord(id) {

    const farmID =
        getFarmID();

    if (!farmID) return;


    try {

        const { data, error } =

            await supabaseClient

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
            data.born_alive || "";


        document.getElementById("stillborn").value =
            data.stillborn || 0;


        document.getElementById("mummified").value =
            data.mummified || 0;


        document.getElementById("totalBorn").value =
            data.total_born || 0;


        document.getElementById("malePiglets").value =
            data.male_piglets || 0;


        document.getElementById("femalePiglets").value =
            data.female_piglets || 0;


        document.getElementById("totalWeaned").value =
            data.total_weaned || 0;


        document.getElementById("birthWeight").value =
            data.birth_weight || 0;


        document.getElementById("mortality").value =
            data.mortality || 0;


        document.getElementById("mortalityReason").value =
            data.mortality_reason || "";


        document.getElementById("sowCondition").value =
            data.sow_condition ||
            "Good - Normal recovery";


        document.getElementById("notes").value =
            data.notes || "";


        editID = id;


        window.scrollTo({

            top: 0,

            behavior: "smooth"

        });


    } catch (error) {

        console.error(error);

        alert(error.message);

    }

}


// =====================================
// SEARCH RECORDS
// =====================================

async function searchRecord() {

    const keyword =
        document
            .getElementById(
                "searchFarrowing"
            )
            .value
            .trim();


    const farmID =
        getFarmID();

    if (!farmID) return;


    try {

        let query =

            supabaseClient

            .from("farrowing_records")

            .select("*")

            .eq("farm_id", farmID)

            .order("id", {
                ascending: true
            });


        if (keyword) {

            query =
                query.ilike(
                    "sow_id",
                    `%${keyword}%`
                );

        }


        const { data, error } =
            await query;


        if (error) throw error;


        displayRecords(data || []);


    } catch (error) {

        console.error(error);

        alert(error.message);

    }

}


// =====================================
// GENERATE REPORT
// =====================================

async function generateReport() {

    const farmID =
        getFarmID();

    if (!farmID) return;


    try {

        const { data, error } =

            await supabaseClient

            .from("farrowing_records")

            .select("*")

            .eq("farm_id", farmID);


        if (error) throw error;


        const records =
            data || [];


        const totalRecords =
            records.length;


        const totalBorn =
            records.reduce(
                (sum, record) =>
                    sum +
                    (Number(record.total_born) || 0),
                0
            );


        const totalBornAlive =
            records.reduce(
                (sum, record) =>
                    sum +
                    (Number(record.born_alive) || 0),
                0
            );


        const totalStillborn =
            records.reduce(
                (sum, record) =>
                    sum +
                    (Number(record.stillborn) || 0),
                0
            );


        const totalMummified =
            records.reduce(
                (sum, record) =>
                    sum +
                    (Number(record.mummified) || 0),
                0
            );


        const totalMortality =
            records.reduce(
                (sum, record) =>
                    sum +
                    (Number(record.mortality) || 0),
                0
            );


        const totalWeaned =
            records.reduce(
                (sum, record) =>
                    sum +
                    (Number(record.total_weaned) || 0),
                0
            );


        const farmName =
            await getRegisteredFarmName();


        alert(

            farmName +
            " - FARROWING REPORT\n\n" +

            "Total Farrowing Records: " +
            totalRecords +

            "\nTotal Born: " +
            totalBorn +

            "\nBorn Alive: " +
            totalBornAlive +

            "\nStillborn: " +
            totalStillborn +

            "\nMummified: " +
            totalMummified +

            "\nPiglets Lost: " +
            totalMortality +

            "\nTotal Weaned: " +
            totalWeaned

        );


    } catch (error) {

        console.error(error);

        alert(error.message);

    }

}


// =====================================
// PDF DOWNLOAD
// =====================================

async function downloadPDF() {

    const farmID =
        getFarmID();

    if (!farmID) return;


    if (
        !window.jspdf ||
        !window.jspdf.jsPDF
    ) {

        alert(
            "PDF library could not be loaded. Please check your internet connection and try again."
        );

        return;

    }


    try {

        const { data, error } =

            await supabaseClient

            .from("farrowing_records")

            .select("*")

            .eq("farm_id", farmID)

            .order("id", {
                ascending: true
            });


        if (error) throw error;


        const records =
            data || [];


        if (records.length === 0) {

            alert(
                "There are no farrowing records available to download."
            );

            return;

        }


        const farmName =
            await getRegisteredFarmName();


        const {
            jsPDF
        } = window.jspdf;


        const doc =
            new jsPDF({
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


        const loggedUser =
            getLoggedUser();


        doc.text(
            "Generated By: " +
            (loggedUser
                ? loggedUser.full_name
                : "System"),
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

        const totalBorn =
            records.reduce(
                (sum, record) =>
                    sum +
                    (Number(record.total_born) || 0),
                0
            );


        const totalBornAlive =
            records.reduce(
                (sum, record) =>
                    sum +
                    (Number(record.born_alive) || 0),
                0
            );


        const totalStillborn =
            records.reduce(
                (sum, record) =>
                    sum +
                    (Number(record.stillborn) || 0),
                0
            );


        const totalMummified =
            records.reduce(
                (sum, record) =>
                    sum +
                    (Number(record.mummified) || 0),
                0
            );


        const totalMortality =
            records.reduce(
                (sum, record) =>
                    sum +
                    (Number(record.mortality) || 0),
                0
            );


        const totalWeaned =
            records.reduce(
                (sum, record) =>
                    sum +
                    (Number(record.total_weaned) || 0),
                0
            );


        doc.setFontSize(10);

        doc.setFont(undefined, "bold");

        doc.text(
            "SUMMARY",
            14,
            52
        );


        doc.setFont(undefined, "normal");

        doc.text(
            "Records: " + records.length,
            14,
            59
        );

        doc.text(
            "Born Alive: " + totalBornAlive,
            60,
            59
        );

        doc.text(
            "Total Born: " + totalBorn,
            110,
            59
        );

        doc.text(
            "Stillborn: " + totalStillborn,
            160,
            59
        );

        doc.text(
            "Mummified: " + totalMummified,
            215,
            59
        );


        doc.text(
            "Piglets Lost: " + totalMortality,
            14,
            65
        );

        doc.text(
            "Total Weaned: " + totalWeaned,
            70,
            65
        );


        // =================================
        // TABLE
        // =================================

        const tableRows =
            records.map(function (record) {

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

        const pageCount =
            doc.internal.getNumberOfPages();


        for (
            let page = 1;
            page <= pageCount;
            page++
        ) {

            doc.setPage(page);


            doc.setFontSize(8);

            doc.text(

                farmName +
                " - Farrowing Records",

                14,

                202

            );


            doc.text(

                "Page " +
                page +
                " of " +
                pageCount,

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

        const today =
            new Date()
                .toISOString()
                .split("T")[0];


        const safeFarmName =
            farmName
                .replace(
                    /[^a-z0-9]+/gi,
                    "-"
                )
                .replace(
                    /^-+|-+$/g,
                    ""
                );


        doc.save(

            safeFarmName +
            "-Farrowing-Records-" +
            today +
            ".pdf"

        );


    } catch (error) {

        console.error(error);

        alert(
            "Unable to generate PDF: " +
            error.message
        );

    }

}


// =====================================
// PRINT REPORT
// =====================================

async function printReport() {

    try {

        const farmName =
            await getRegisteredFarmName();


        const softwareBrand =
            document.querySelector(
                ".software-brand"
            );


        const systemDescription =
            document.querySelector(
                ".page-header p"
            );


        const farmLabel =
            document.querySelector(
                ".farm-label"
            );


        const farmNameElement =
            document.querySelector(
                "[data-farm-name]"
            );


        const headerIcon =
            document.querySelector(
                ".header-icon"
            );


        // =================================
        // STORE ORIGINAL VALUES
        // =================================

        const originalSoftwareDisplay =
            softwareBrand
                ? softwareBrand.style.display
                : "";


        const originalDescriptionDisplay =
            systemDescription
                ? systemDescription.style.display
                : "";


        const originalFarmLabelDisplay =
            farmLabel
                ? farmLabel.style.display
                : "";


        const originalIconDisplay =
            headerIcon
                ? headerIcon.style.display
                : "";


        const originalFarmNameText =
            farmNameElement
                ? farmNameElement.textContent
                : "";


        const originalFarmNameStyle =
            farmNameElement
                ? farmNameElement.getAttribute("style")
                : null;


        // =================================
        // HIDE SOFTWARE BRANDING
        // =================================

        if (softwareBrand) {

            softwareBrand.style.display =
                "none";

        }


        if (systemDescription) {

            systemDescription.style.display =
                "none";

        }


        if (farmLabel) {

            farmLabel.style.display =
                "none";

        }


        if (headerIcon) {

            headerIcon.style.display =
                "none";

        }


        // =================================
        // MAKE FARM NAME MAIN PRINT HEADING
        // =================================

        if (farmNameElement) {

            farmNameElement.textContent =
                farmName;


            farmNameElement.style.display =
                "block";

            farmNameElement.style.fontSize =
                "30px";

            farmNameElement.style.fontWeight =
                "800";

            farmNameElement.style.textAlign =
                "center";

            farmNameElement.style.lineHeight =
                "1.2";

            farmNameElement.style.margin =
                "0 0 12px 0";

            farmNameElement.style.letterSpacing =
                "0.5px";

        }


        // =================================
        // TEMPORARY PRINT CSS
        // =================================

        const printStyle =
            document.createElement("style");


        printStyle.id =
            "farrowing-print-branding";


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


        document.head.appendChild(
            printStyle
        );


        // =================================
        // PRINT
        // =================================

        window.print();


        // =================================
        // RESTORE SCREEN AFTER PRINT
        // =================================

        const restoreScreen =
            function () {

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


                    if (
                        originalFarmNameStyle === null
                    ) {

                        farmNameElement.removeAttribute(
                            "style"
                        );

                    } else {

                        farmNameElement.setAttribute(
                            "style",
                            originalFarmNameStyle
                        );

                    }

                }


                if (printStyle) {

                    printStyle.remove();

                }

            };


        window.addEventListener(
            "afterprint",
            restoreScreen,
            {
                once: true
            }
        );


        // Backup restoration
        setTimeout(
            restoreScreen,
            3000
        );


    } catch (error) {

        console.error(
            "PRINT REPORT ERROR:",
            error
        );

        alert(
            "Unable to prepare the print report: " +
            error.message
        );

    }

}


// =====================================
// CLEAR FORM
// =====================================

function clearForm() {

    document
        .getElementById("farrowingForm")
        .reset();


    document.getElementById("totalBorn").value = "";


    editID = null;

}


// =====================================
// SEARCH WHILE TYPING
// =====================================

const searchBox =
    document.getElementById(
        "searchFarrowing"
    );


if (searchBox) {

    searchBox.addEventListener(
        "keyup",
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