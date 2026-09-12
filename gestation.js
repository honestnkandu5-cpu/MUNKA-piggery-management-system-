// ==========================================================
// MUNKA PIGGERY FARM
// GESTATION RECORDS MODULE
// PERMISSION-CONTROLLED VERSION
// ==========================================================
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
// ==========================================================


let gestationRecords = [];

let editId = null;


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
// CHECK DELETE ROLE
// ONLY OWNER/ADMIN AND FARM MANAGER
// ==========================================================

function canDeleteGestation(){

    const loggedUser =
        getLoggedUser();


    if(!loggedUser){

        return false;

    }


    const role =
        String(
            loggedUser.role || ""
        )
        .trim()
        .toLowerCase();


    return (

        role === "owner" ||

        role === "admin" ||

        role === "owner/admin" ||

        role === "farm manager"

    );

}


// ==========================================================
// LOAD ALL RECORDS
// ==========================================================

async function loadGestationRecords(){

    try{

        const {
            data,
            error
        } =
            await supabaseClient

                .from("gestation_records")

                .select("*")

                .order(
                    "id",
                    {
                        ascending: true
                    }
                );


        if(error){

            throw error;

        }


        gestationRecords =
            data || [];


        displayRecords();

    }

    catch(error){

        console.error(
            "LOAD GESTATION ERROR:",
            error
        );


        alert(
            error.message
        );

    }

}


// ==========================================================
// AUTOMATIC DATE CALCULATION
// ==========================================================

function calculateGestationDates(){

    const serviceInput =
        document.getElementById(
            "serviceDate"
        );


    if(
        !serviceInput ||
        !serviceInput.value
    ){

        return;

    }


    const serviceDate =
        new Date(
            serviceInput.value
        );


    function addDays(days){

        const date =
            new Date(
                serviceDate
            );


        date.setDate(
            date.getDate() + days
        );


        const year =
            date.getFullYear();


        const month =
            String(
                date.getMonth() + 1
            )
            .padStart(2,"0");


        const day =
            String(
                date.getDate()
            )
            .padStart(2,"0");


        return (
            year +
            "-" +
            month +
            "-" +
            day
        );

    }


    document
        .getElementById("check21")
        .value =
        addDays(21);


    document
        .getElementById("feed90")
        .value =
        addDays(90);


    document
        .getElementById("deworm101")
        .value =
        addDays(101);


    document
        .getElementById("litter101")
        .value =
        addDays(101);


    document
        .getElementById("actionDay")
        .value =
        addDays(107);


    document
        .getElementById("deliveryDate")
        .value =
        addDays(114);


    document
        .getElementById("farrowsure")
        .value =
        addDays(114);

}


// ==========================================================
// SAVE / UPDATE RECORD
// ==========================================================

document
    .getElementById("gestationForm")
    .addEventListener(
        "submit",
        async function(e){

            e.preventDefault();


            // ----------------------------------------------
            // ADD PERMISSION
            // ----------------------------------------------

            if(
                typeof canAdd === "function" &&
                editId === null &&
                !canAdd("Gestation")
            ){

                alert(
                    "Access Denied.\n\n" +
                    "You do not have permission to add gestation records."
                );

                return;

            }


            // ----------------------------------------------
            // EDIT PERMISSION
            // ----------------------------------------------

            if(
                typeof canEdit === "function" &&
                editId !== null &&
                !canEdit("Gestation")
            ){

                alert(
                    "Access Denied.\n\n" +
                    "You do not have permission to edit gestation records."
                );

                return;

            }


            const loggedUser =
                getLoggedUser();


            if(!loggedUser){

                return;

            }


            const record = {

                sow_id:
                    document
                        .getElementById("sowID")
                        .value
                        .trim(),

                registration_date:
                    document
                        .getElementById("registrationDate")
                        .value,

                breed:
                    document
                        .getElementById("breed")
                        .value,

                number_of_teats:
                    parseInt(
                        document
                            .getElementById("teats")
                            .value
                    ) || null,

                parity:
                    document
                        .getElementById("parity")
                        .value,

                service_date:
                    document
                        .getElementById("serviceDate")
                        .value,

                boarr_semen_used:
                    document
                        .getElementById("boar")
                        .value
                        .trim(),

                check21:
                    document
                        .getElementById("check21")
                        .value,

                feed90:
                    document
                        .getElementById("feed90")
                        .value,

                deworm101:
                    document
                        .getElementById("deworm101")
                        .value,

                litter101:
                    document
                        .getElementById("litter101")
                        .value,

                action_day:
                    document
                        .getElementById("actionDay")
                        .value,

                delivery_date:
                    document
                        .getElementById("deliveryDate")
                        .value,

                farrowsure:
                    document
                        .getElementById("farrowsure")
                        .value,

                status:
                    document
                        .getElementById("status")
                        .value,

                notes:
                    document
                        .getElementById("notes")
                        .value
                        .trim(),

                created_by:
                    loggedUser.full_name,

                updated_by:
                    null,

                updated_at:
                    null

            };


            let result;

            let actionType;


            // =================================================
            // NEW RECORD
            // =================================================

            if(editId === null){

                actionType = "Added";


                result =
                    await supabaseClient

                        .from("gestation_records")

                        .insert([
                            record
                        ]);

            }


            // =================================================
            // UPDATE RECORD
            // =================================================

            else{

                actionType = "Updated";


                record.updated_by =
                    loggedUser.full_name;


                record.updated_at =
                    new Date().toISOString();


                result =
                    await supabaseClient

                        .from("gestation_records")

                        .update(record)

                        .eq(
                            "id",
                            editId
                        );

            }


            // =================================================
            // CHECK DATABASE RESULT
            // =================================================

            if(result.error){

                console.error(
                    result.error
                );


                alert(
                    result.error.message
                );


                return;

            }


            // =================================================
            // ACTIVITY LOG
            // =================================================

            await saveActivity(

                loggedUser.full_name +
                " (" +
                loggedUser.role +
                ")",

                actionType,

                "Gestation Records",

                actionType +
                " gestation record for Sow ID: " +
                record.sow_id

            );


            alert(
                editId === null
                ?
                "Gestation record saved successfully."
                :
                "Gestation record updated successfully."
            );


            editId = null;


            document
                .getElementById("gestationForm")
                .reset();


            loadGestationRecords();

        }
    );


// ==========================================================
// DISPLAY RECORDS
// ==========================================================

function displayRecords(
    records = gestationRecords
){

    const table =
        document.getElementById(
            "gestationTable"
        );


    if(!table){

        return;

    }


    table.innerHTML = "";


    records.forEach(
        function(record){

            let actionButtons = "";


            // =================================================
            // EDIT BUTTON
            // =================================================

            if(
                typeof canEdit === "function" &&
                canEdit("Gestation")
            ){

                actionButtons += `

                    <button
                        type="button"
                        onclick="editRecord(${record.id})">

                        ✏️ Edit

                    </button>

                `;

            }


            // =================================================
            // DELETE BUTTON
            // =================================================
            //
            // ONLY OWNER/ADMIN AND FARM MANAGER
            // =================================================

            if(
                canDeleteGestation()
            ){

                actionButtons += `

                    <button
                        type="button"
                        onclick="deleteRecord(${record.id})">

                        🗑️ Delete

                    </button>

                `;

            }


            // =================================================
            // NO ACTIONS
            // =================================================

            if(!actionButtons){

                actionButtons =
                    "<span>No actions</span>";

            }


            table.innerHTML += `

                <tr>

                    <td>
                        ${record.sow_id || ""}
                    </td>

                    <td>
                        ${record.breed || ""}
                    </td>

                    <td>
                        ${record.service_date || ""}
                    </td>

                    <td>
                        ${record.delivery_date || ""}
                    </td>

                    <td>
                        ${record.status || ""}
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
// EDIT RECORD
// ==========================================================

function editRecord(id){

    if(
        typeof canEdit === "function" &&
        !canEdit("Gestation")
    ){

        alert(
            "Access Denied.\n\n" +
            "You do not have permission to edit gestation records."
        );

        return;

    }


    const record =
        gestationRecords.find(
            function(item){

                return item.id === id;

            }
        );


    if(!record){

        return;

    }


    document
        .getElementById("sowID")
        .value =
        record.sow_id || "";


    document
        .getElementById("registrationDate")
        .value =
        record.registration_date || "";


    document
        .getElementById("breed")
        .value =
        record.breed || "";


    document
        .getElementById("teats")
        .value =
        record.number_of_teats || "";


    document
        .getElementById("parity")
        .value =
        record.parity || "";


    document
        .getElementById("serviceDate")
        .value =
        record.service_date || "";


    document
        .getElementById("boar")
        .value =
        record.boarr_semen_used || "";


    document
        .getElementById("check21")
        .value =
        record.check21 || "";


    document
        .getElementById("feed90")
        .value =
        record.feed90 || "";


    document
        .getElementById("deworm101")
        .value =
        record.deworm101 || "";


    document
        .getElementById("litter101")
        .value =
        record.litter101 || "";


    document
        .getElementById("actionDay")
        .value =
        record.action_day || "";


    document
        .getElementById("deliveryDate")
        .value =
        record.delivery_date || "";


    document
        .getElementById("farrowsure")
        .value =
        record.farrowsure || "";


    document
        .getElementById("status")
        .value =
        record.status || "";


    document
        .getElementById("notes")
        .value =
        record.notes || "";


    editId =
        record.id;


    window.scrollTo({

        top: 0,

        behavior: "smooth"

    });

}


// ==========================================================
// DELETE RECORD
// ==========================================================

async function deleteRecord(id){

    // =======================================================
    // ROLE CHECK
    // =======================================================

    if(!canDeleteGestation()){

        alert(
            "Access Denied.\n\n" +
            "Only Owner/Admin and Farm Manager can delete gestation records."
        );

        return;

    }


    if(
        !confirm(
            "Delete this gestation record?"
        )
    ){

        return;

    }


    const loggedUser =
        getLoggedUser();


    if(!loggedUser){

        return;

    }


    try{

        const deletedRecord =
            gestationRecords.find(
                function(record){

                    return record.id === id;

                }
            );


        const {
            error
        } =
            await supabaseClient

                .from("gestation_records")

                .delete()

                .eq(
                    "id",
                    id
                );


        if(error){

            throw error;

        }


        // ===================================================
        // ACTIVITY LOG
        // ===================================================

        await saveActivity(

            loggedUser.full_name +
            " (" +
            loggedUser.role +
            ")",

            "Deleted",

            "Gestation Records",

            "Deleted gestation record for Sow ID: " +
            (
                deletedRecord
                ?
                deletedRecord.sow_id
                :
                id
            )

        );


        alert(
            "Gestation record deleted successfully."
        );


        loadGestationRecords();

    }

    catch(error){

        console.error(
            "DELETE GESTATION ERROR:",
            error
        );


        alert(
            error.message
        );

    }

}


// ==========================================================
// SEARCH RECORD
// ==========================================================

function searchRecord(){

    if(
        typeof canView === "function" &&
        !canView("Gestation")
    ){

        alert(
            "Access Denied.\n\n" +
            "You do not have permission to view gestation records."
        );

        return;

    }


    const search =
        document
            .getElementById("searchGestation")
            .value
            .trim()
            .toLowerCase();


    if(search === ""){

        displayRecords();

        return;

    }


    const filtered =
        gestationRecords.filter(
            function(record){

                return (

                    String(
                        record.sow_id || ""
                    )
                    .toLowerCase()
                    .includes(search)

                    ||

                    String(
                        record.breed || ""
                    )
                    .toLowerCase()
                    .includes(search)

                    ||

                    String(
                        record.status || ""
                    )
                    .toLowerCase()
                    .includes(search)

                );

            }
        );


    displayRecords(
        filtered
    );

}


// ==========================================================
// GENERATE REPORT
// ==========================================================

function generateReport(){

    if(
        typeof canReport === "function" &&
        !canReport("Gestation")
    ){

        alert(
            "Access Denied.\n\n" +
            "You do not have permission to generate gestation reports."
        );

        return;

    }


    const total =
        gestationRecords.length;


    const pregnant =
        gestationRecords.filter(
            r =>
                r.status === "Pregnant"
        ).length;


    const farrowed =
        gestationRecords.filter(
            r =>
                r.status === "Farrowed"
        ).length;


    const empty =
        gestationRecords.filter(
            r =>
                r.status === "Empty"
        ).length;


    const aborted =
        gestationRecords.filter(
            r =>
                r.status === "Aborted"
        ).length;


    alert(

        "GESTATION REPORT\n\n" +

        "Total Records : " +
        total +

        "\nPregnant : " +
        pregnant +

        "\nFarrowed : " +
        farrowed +

        "\nEmpty : " +
        empty +

        "\nAborted : " +
        aborted

    );

}


// ==========================================================
// PRINT REPORT
// ==========================================================

function printReport(){

    window.print();

}


// ==========================================================
// CLEAR FORM
// ==========================================================

function clearForm(){

    const form =
        document.getElementById(
            "gestationForm"
        );


    if(form){

        form.reset();

    }


    editId = null;

}


// ==========================================================
// SERVICE DATE LISTENER
// ==========================================================

document.addEventListener(
    "DOMContentLoaded",
    function(){

        const serviceDate =
            document.getElementById(
                "serviceDate"
            );


        if(serviceDate){

            serviceDate.addEventListener(
                "change",
                calculateGestationDates
            );

        }


        const searchBox =
            document.getElementById(
                "searchGestation"
            );


        if(searchBox){

            searchBox.addEventListener(
                "keyup",
                searchRecord
            );

        }

    }
);


// ==========================================================
// PAGE LOAD
// ==========================================================

window.addEventListener(
    "load",
    function(){

        loadGestationRecords();

    }
);


// ==========================================================
// END OF GESTATION MODULE
// ==========================================================