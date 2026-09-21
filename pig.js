// ==========================================================
// MUNKA PIGGERY TECHNOLOGY
// PIG REGISTRATION MODULE
// MULTI-FARM + PERMISSION-CONTROLLED VERSION
// FARM NAME FIRST PRINT & PDF VERSION
// ==========================================================

let editID = null;


// ==========================================================
// GET LOGGED-IN USER
// ==========================================================

function getLoggedUser(){

    const user =
        JSON.parse(
            localStorage.getItem("loggedInUser")
        );

    if(!user){

        alert(
            "No logged-in user found. Please login again."
        );

        return null;
    }

    return user;
}


// ==========================================================
// GET FARM ID
// ==========================================================

function getFarmID(){

    const user = getLoggedUser();

    if(!user){
        return null;
    }

    if(!user.farm_id){

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

async function getRegisteredFarmName(){

    const farmID =
        getFarmID();

    if(!farmID){
        return "REGISTERED FARM";
    }

    try{

        const {
            data,
            error
        } =
            await supabaseClient

                .from("farms")

                .select("farm_name")

                .eq(
                    "id",
                    farmID
                )

                .maybeSingle();


        if(error){
            throw error;
        }


        if(
            data &&
            data.farm_name
        ){

            return data.farm_name;

        }


    }
    catch(error){

        console.error(
            "GET FARM NAME ERROR:",
            error
        );

    }


    return "REGISTERED FARM";

}


// ==========================================================
// SAVE / UPDATE PIG RECORD
// ==========================================================

document
.getElementById("pigForm")
.addEventListener(
    "submit",
    async function(e){

        e.preventDefault();


        // ==================================================
        // PERMISSIONS
        // ==================================================

        if(editID === null){

            if(
                typeof canAdd !== "function" ||
                !canAdd("Pig Registration")
            ){

                alert(
                    "Access Denied.\n\n" +
                    "You do not have permission to add pig records."
                );

                return;
            }

        }

        else{

            if(
                typeof canEdit !== "function" ||
                !canEdit("Pig Registration")
            ){

                alert(
                    "Access Denied.\n\n" +
                    "You do not have permission to edit pig records."
                );

                return;
            }
        }


        // ==================================================
        // LOGGED-IN USER
        // ==================================================

        const loggedUser =
            getLoggedUser();

        if(!loggedUser){
            return;
        }


        // ==================================================
        // FARM ID
        // ==================================================

        const farmID =
            getFarmID();

        if(!farmID){
            return;
        }


        // ==================================================
        // PREPARE PIG DATA
        // ==================================================

        const pig = {

            pig_id:
                document
                .getElementById("pigID")
                .value
                .trim(),

            breed:
                document
                .getElementById("breed")
                .value,

            sex:
                document
                .getElementById("sex")
                .value,

            farrow_date:
                document
                .getElementById("farrowDate")
                .value,

            source:
                document
                .getElementById("source")
                .value
                .trim(),

            weight:
                Number(
                    document
                    .getElementById("weight")
                    .value
                ),

            health_status:
                document
                .getElementById("healthStatus")
                .value,

            created_by:
                loggedUser.full_name,

            updated_by:
                null,

            updated_at:
                null,

            farm_id:
                farmID
        };


        try{

            // ==================================================
            // ADD NEW RECORD
            // ==================================================

            if(editID === null){

                const {
                    error
                } =
                    await supabaseClient

                        .from("pigs")

                        .insert([pig]);


                if(error){
                    throw error;
                }


                // ==========================================
                // ACTIVITY LOG
                // ==========================================

                await saveActivity(

                    loggedUser.full_name +
                    " (" +
                    loggedUser.role +
                    ")",

                    "Added",

                    "Pig Registration",

                    "Registered Pig ID: " +
                    pig.pig_id

                );


                alert(
                    "Pig record saved successfully."
                );

            }


            // ==================================================
            // UPDATE EXISTING RECORD
            // ==================================================

            else{

                pig.updated_by =
                    loggedUser.full_name;

                pig.updated_at =
                    new Date().toISOString();


                // Do not allow farm_id to be changed
                delete pig.farm_id;


                const {
                    error
                } =
                    await supabaseClient

                        .from("pigs")

                        .update(pig)

                        .eq(
                            "id",
                            editID
                        )

                        .eq(
                            "farm_id",
                            farmID
                        );


                if(error){
                    throw error;
                }


                // ==========================================
                // ACTIVITY LOG
                // ==========================================

                await saveActivity(

                    loggedUser.full_name +
                    " (" +
                    loggedUser.role +
                    ")",

                    "Updated",

                    "Pig Registration",

                    "Updated Pig ID: " +
                    pig.pig_id

                );


                alert(
                    "Pig record updated successfully."
                );


                editID = null;
            }


            clearForm();

            loadPigs();

        }


        catch(error){

            console.error(
                "SAVE / UPDATE PIG ERROR:",
                error
            );

            alert(
                error.message
            );
        }

    }
);


// ==========================================================
// LOAD PIG RECORDS
// ==========================================================

async function loadPigs(){

    const farmID =
        getFarmID();

    if(!farmID){
        return;
    }


    try{

        const {
            data,
            error
        } =
            await supabaseClient

                .from("pigs")

                .select("*")

                .eq(
                    "farm_id",
                    farmID
                )

                .order(
                    "id",
                    {
                        ascending:true
                    }
                );


        if(error){
            throw error;
        }


        displayPigs(
            data || []
        );

    }


    catch(error){

        console.error(
            "LOAD PIGS ERROR:",
            error
        );

        alert(
            error.message
        );
    }

}


// ==========================================================
// DISPLAY PIG RECORDS
// ==========================================================

function displayPigs(records){

    const table =
        document.getElementById(
            "pigTable"
        );


    if(!table){
        return;
    }


    table.innerHTML = "";


    records.forEach(
        function(pig){

            let actionButtons = "";


            // ==================================================
            // EDIT BUTTON
            // ==================================================

            if(
                typeof canEdit === "function" &&
                canEdit("Pig Registration")
            ){

                actionButtons += `

                    <button
                        type="button"
                        onclick="editPig(${pig.id})">

                        ✏️ Edit

                    </button>

                `;
            }


            // ==================================================
            // DELETE BUTTON
            // ==================================================

            if(
                typeof canDelete === "function" &&
                canDelete("Pig Registration")
            ){

                actionButtons += `

                    <button
                        type="button"
                        onclick="deletePig(${pig.id}, '${pig.pig_id}')">

                        🗑️ Delete

                    </button>

                `;
            }


            if(!actionButtons){

                actionButtons =
                    "<span>No actions</span>";

            }


            // ==================================================
            // TABLE ROW
            // ==================================================

            table.innerHTML += `

                <tr>

                    <td>
                        ${pig.pig_id || ""}
                    </td>

                    <td>
                        ${pig.breed || ""}
                    </td>

                    <td>
                        ${pig.sex || ""}
                    </td>

                    <td>
                        ${pig.farrow_date || ""}
                    </td>

                    <td>
                        ${pig.source || ""}
                    </td>

                    <td>
                        ${pig.weight || ""}
                        ${pig.weight ? "Kg" : ""}
                    </td>

                    <td>
                        ${pig.health_status || ""}
                    </td>

                    <td>
                        ${actionButtons}
                    </td>

                </tr>

            `;

        }
    );

}


// ==========================================================
// EDIT PIG RECORD
// ==========================================================

async function editPig(id){

    if(
        typeof canEdit !== "function" ||
        !canEdit("Pig Registration")
    ){

        alert(
            "Access Denied.\n\n" +
            "You do not have permission to edit pig records."
        );

        return;
    }


    const farmID =
        getFarmID();

    if(!farmID){
        return;
    }


    try{

        const {
            data,
            error
        } =
            await supabaseClient

                .from("pigs")

                .select("*")

                .eq(
                    "id",
                    id
                )

                .eq(
                    "farm_id",
                    farmID
                )

                .single();


        if(error){
            throw error;
        }


        document
            .getElementById("pigID")
            .value =
            data.pig_id || "";


        document
            .getElementById("breed")
            .value =
            data.breed || "";


        document
            .getElementById("sex")
            .value =
            data.sex || "";


        document
            .getElementById("farrowDate")
            .value =
            data.farrow_date || "";


        document
            .getElementById("source")
            .value =
            data.source || "";


        document
            .getElementById("weight")
            .value =
            data.weight || "";


        document
            .getElementById("healthStatus")
            .value =
            data.health_status || "";


        editID = id;


        window.scrollTo({
            top: 0,
            behavior: "smooth"
        });

    }


    catch(error){

        console.error(
            "EDIT PIG ERROR:",
            error
        );

        alert(
            error.message
        );
    }

}


// ==========================================================
// DELETE PIG RECORD
// ==========================================================

async function deletePig(
    id,
    pigID
){

    if(
        typeof canDelete !== "function" ||
        !canDelete("Pig Registration")
    ){

        alert(
            "Access Denied.\n\n" +
            "You do not have permission to delete pig records."
        );

        return;
    }


    const confirmDelete =
        confirm(
            "Delete Pig ID: " +
            (pigID || id) +
            "?"
        );


    if(!confirmDelete){
        return;
    }


    const loggedUser =
        getLoggedUser();

    if(!loggedUser){
        return;
    }


    const farmID =
        getFarmID();

    if(!farmID){
        return;
    }


    try{

        const {
            error
        } =
            await supabaseClient

                .from("pigs")

                .delete()

                .eq(
                    "id",
                    id
                )

                .eq(
                    "farm_id",
                    farmID
                );


        if(error){
            throw error;
        }


        // ==================================================
        // ACTIVITY LOG
        // ==================================================

        await saveActivity(

            loggedUser.full_name +
            " (" +
            loggedUser.role +
            ")",

            "Deleted",

            "Pig Registration",

            "Deleted Pig ID: " +
            (pigID || id)

        );


        alert(
            "Pig record deleted successfully."
        );


        loadPigs();

    }


    catch(error){

        console.error(
            "DELETE PIG ERROR:",
            error
        );

        alert(
            error.message
        );
    }

}


// ==========================================================
// SEARCH PIG RECORDS
// ==========================================================

async function searchPig(){

    if(
        typeof canView !== "function" ||
        !canView("Pig Registration")
    ){

        alert(
            "Access Denied.\n\n" +
            "You do not have permission to view pig records."
        );

        return;
    }


    const farmID =
        getFarmID();

    if(!farmID){
        return;
    }


    const keyword =
        document
            .getElementById("searchPig")
            .value
            .trim();


    try{

        let query =
            supabaseClient

                .from("pigs")

                .select("*")

                .eq(
                    "farm_id",
                    farmID
                );


        if(keyword){

            query =
                query.or(
                    `pig_id.ilike.%${keyword}%,breed.ilike.%${keyword}%`
                );

        }


        const {
            data,
            error
        } =
            await query.order(
                "id",
                {
                    ascending:true
                }
            );


        if(error){
            throw error;
        }


        displayPigs(
            data || []
        );

    }


    catch(error){

        console.error(
            "SEARCH PIG ERROR:",
            error
        );

        alert(
            error.message
        );
    }

}


// ==========================================================
// CLEAR FORM
// ==========================================================

function clearForm(){

    const form =
        document.getElementById(
            "pigForm"
        );


    if(form){
        form.reset();
    }


    editID = null;

}


// ==========================================================
// GENERATE REPORT
// ==========================================================

async function generateReport(){

    if(
        typeof canReport !== "function" ||
        !canReport("Pig Registration")
    ){

        alert(
            "Access Denied.\n\n" +
            "You do not have permission to generate pig reports."
        );

        return;
    }


    const farmID =
        getFarmID();

    if(!farmID){
        return;
    }


    try{

        const {
            count,
            error
        } =
            await supabaseClient

                .from("pigs")

                .select(
                    "*",
                    {
                        count:"exact",
                        head:true
                    }
                )

                .eq(
                    "farm_id",
                    farmID
                );


        if(error){
            throw error;
        }


        alert(
            "Pig Registration Report\n\n" +
            "Total Registered Pigs: " +
            (count || 0)
        );

    }


    catch(error){

        console.error(
            "PIG REPORT ERROR:",
            error
        );

        alert(
            error.message
        );
    }

}


// ==========================================================
// PRINT REPORT
// FARM NAME ONLY IN THE PRINTED HEADER
// ==========================================================

async function printReport(){

    if(
        typeof canReport !== "function" ||
        !canReport("Pig Registration")
    ){

        alert(
            "Access Denied.\n\n" +
            "You do not have permission to print pig reports."
        );

        return;
    }


    try{

        // ==================================================
        // GET REGISTERED FARM NAME
        // ==================================================

        const farmName =
            await getRegisteredFarmName();


        // ==================================================
        // FIND HEADER ELEMENTS
        // ==================================================

        const pageHeader =
            document.querySelector(
                ".page-header"
            );


        if(!pageHeader){

            window.print();

            return;
        }


        const softwareBrand =
            pageHeader.querySelector(
                ".software-brand"
            );


        const subtitle =
            pageHeader.querySelector(
                "p"
            );


        const farmLabel =
            pageHeader.querySelector(
                ".farm-label"
            );


        const farmNameElement =
            pageHeader.querySelector(
                "[data-farm-name]"
            );


        const pigIcon =
            pageHeader.querySelector(
                ".pig-icon"
            );


        // ==================================================
        // SAVE ORIGINAL VALUES
        // ==================================================

        const originalFarmName =
            farmNameElement
                ? farmNameElement.textContent
                : "";


        // ==================================================
        // PREPARE PRINT HEADER
        // ==================================================

        if(farmNameElement){

            farmNameElement.textContent =
                farmName;

            farmNameElement.classList.add(
                "print-farm-name"
            );

        }


        if(softwareBrand){

            softwareBrand.style.display =
                "none";

        }


        if(subtitle){

            subtitle.style.display =
                "none";

        }


        if(farmLabel){

            farmLabel.style.display =
                "none";

        }


        if(pigIcon){

            pigIcon.style.display =
                "none";

        }


        pageHeader.classList.add(
            "printing-farm-header"
        );


        // ==================================================
        // CREATE TEMPORARY PRINT STYLE
        // ==================================================

        const printStyle =
            document.createElement(
                "style"
            );


        printStyle.id =
            "temporary-farm-print-style";


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


                .printing-farm-header
                [data-farm-name] {

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


                .printing-farm-header
                .software-brand,

                .printing-farm-header
                p,

                .printing-farm-header
                .farm-label,

                .printing-farm-header
                .pig-icon {

                    display: none !important;

                }

            }

        `;


        document.head.appendChild(
            printStyle
        );


        // ==================================================
        // PRINT
        // ==================================================

        window.print();


        // ==================================================
        // RESTORE PAGE AFTER PRINT
        // ==================================================

        window.addEventListener(
            "afterprint",
            function restorePrintPage(){

                if(farmNameElement){

                    farmNameElement.textContent =
                        originalFarmName;

                    farmNameElement.classList.remove(
                        "print-farm-name"
                    );

                }


                if(softwareBrand){

                    softwareBrand.style.display =
                        "";

                }


                if(subtitle){

                    subtitle.style.display =
                        "";

                }


                if(farmLabel){

                    farmLabel.style.display =
                        "";

                }


                if(pigIcon){

                    pigIcon.style.display =
                        "";

                }


                pageHeader.classList.remove(
                    "printing-farm-header"
                );


                const temporaryStyle =
                    document.getElementById(
                        "temporary-farm-print-style"
                    );


                if(temporaryStyle){

                    temporaryStyle.remove();

                }


                window.removeEventListener(
                    "afterprint",
                    restorePrintPage
                );

            }
        );

    }


    catch(error){

        console.error(
            "PRINT REPORT ERROR:",
            error
        );

        alert(
            "Unable to prepare the print report.\n\n" +
            error.message
        );

    }

}


// ==========================================================
// DOWNLOAD PDF REPORT
// FARM NAME IS THE MAIN PDF HEADING
// ==========================================================

async function downloadPDF(){

    // ======================================================
    // PERMISSION CHECK
    // ======================================================

    if(
        typeof canReport !== "function" ||
        !canReport("Pig Registration")
    ){

        alert(
            "Access Denied.\n\n" +
            "You do not have permission to download pig reports."
        );

        return;
    }


    // ======================================================
    // CHECK PDF LIBRARY
    // ======================================================

    if(
        typeof window.jspdf === "undefined"
    ){

        alert(
            "PDF library could not be loaded. " +
            "Please check your internet connection and try again."
        );

        return;
    }


    // ======================================================
    // GET FARM
    // ======================================================

    const farmID =
        getFarmID();

    if(!farmID){
        return;
    }


    const loggedUser =
        getLoggedUser();

    if(!loggedUser){
        return;
    }


    try{

        // ==================================================
        // GET FARM NAME
        // ==================================================

        const farmName =
            await getRegisteredFarmName();


        // ==================================================
        // GET ALL PIG RECORDS
        // ==================================================

        const {
            data,
            error
        } =
            await supabaseClient

                .from("pigs")

                .select("*")

                .eq(
                    "farm_id",
                    farmID
                )

                .order(
                    "id",
                    {
                        ascending:true
                    }
                );


        if(error){
            throw error;
        }


        const records =
            data || [];


        // ==================================================
        // CREATE PDF
        // ==================================================

        const {
            jsPDF
        } =
            window.jspdf;


        const doc =
            new jsPDF({
                orientation: "landscape",
                unit: "mm",
                format: "a4"
            });


        // ==================================================
        // REGISTERED FARM NAME
        // MAIN PDF HEADING
        // ==================================================

        doc.setFontSize(22);

        doc.setFont(
            "helvetica",
            "bold"
        );

        doc.text(
            farmName,
            148,
            18,
            {
                align: "center"
            }
        );


        // ==================================================
        // REPORT TITLE
        // ==================================================

        doc.setFontSize(15);

        doc.setFont(
            "helvetica",
            "bold"
        );

        doc.text(
            "PIG REGISTRATION REPORT",
            148,
            30,
            {
                align: "center"
            }
        );


        // ==================================================
        // REPORT INFORMATION
        // ==================================================

        const generatedDate =
            new Date()
            .toLocaleString(
                "en-ZM",
                {
                    timeZone:
                        "Africa/Lusaka"
                }
            );


        doc.setFontSize(9);

        doc.setFont(
            "helvetica",
            "normal"
        );


        doc.text(
            "Generated: " +
            generatedDate,
            14,
            40
        );


        doc.text(
            "Generated By: " +
            (
                loggedUser.full_name ||
                "System User"
            ),
            14,
            46
        );


        doc.text(
            "Total Registered Pigs: " +
            records.length,
            14,
            52
        );


        // ==================================================
        // TABLE DATA
        // ==================================================

        const tableRows =
            records.map(
                function(pig){

                    return [

                        pig.pig_id || "",

                        pig.breed || "",

                        pig.sex || "",

                        pig.farrow_date || "",

                        pig.source || "",

                        pig.weight
                            ? pig.weight + " Kg"
                            : "",

                        pig.health_status || ""

                    ];

                }
            );


        // ==================================================
        // PDF TABLE
        // ==================================================

        doc.autoTable({

            startY: 59,

            head: [[

                "Pig ID",

                "Breed",

                "Sex",

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

                0: {
                    cellWidth: 25
                },

                1: {
                    cellWidth: 35
                },

                2: {
                    cellWidth: 20
                },

                3: {
                    cellWidth: 30
                },

                4: {
                    cellWidth: 50
                },

                5: {
                    cellWidth: 25
                },

                6: {
                    cellWidth: 45
                }

            },

            margin: {
                left: 10,
                right: 10
            }

        });


        // ==================================================
        // FOOTER ON EVERY PAGE
        // NO MUNKA PIGGERY TEXT
        // ==================================================

        const pageCount =
            doc.internal.getNumberOfPages();


        for(
            let page = 1;
            page <= pageCount;
            page++
        ){

            doc.setPage(page);

            const pageHeight =
                doc.internal.pageSize.height;


            doc.setFontSize(8);

            doc.setFont(
                "helvetica",
                "normal"
            );


            doc.text(
                farmName,
                10,
                pageHeight - 8
            );


            doc.text(
                "Page " +
                page +
                " of " +
                pageCount,
                287,
                pageHeight - 8,
                {
                    align: "right"
                }
            );

        }


        // ==================================================
        // FILE NAME
        // ==================================================

        const datePart =
            new Date()
            .toISOString()
            .split("T")[0];


        const fileName =
            farmName
                .replace(
                    /[^a-z0-9]/gi,
                    "_"
                ) +
            "_Pig_Registration_" +
            datePart +
            ".pdf";


        // ==================================================
        // DOWNLOAD
        // ==================================================

        doc.save(
            fileName
        );


    }


    catch(error){

        console.error(
            "DOWNLOAD PDF ERROR:",
            error
        );

        alert(
            "Unable to generate PDF.\n\n" +
            error.message
        );

    }

}


// ==========================================================
// LOAD RECORDS WHEN PAGE OPENS
// ==========================================================

window.addEventListener(
    "load",
    function(){

        loadPigs();

    }
);


// ==========================================================
// SEARCH WHILE TYPING
// ==========================================================

const searchBox =
    document.getElementById(
        "searchPig"
    );


if(searchBox){

    searchBox.addEventListener(
        "keyup",
        searchPig
    );

}