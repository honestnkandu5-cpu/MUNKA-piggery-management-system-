// ==========================================================
// MUNKA PIGGERY FARM
// PIG REGISTRATION MODULE
// MULTI-FARM + PERMISSION-CONTROLLED VERSION
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
// ==========================================================

function printReport(){

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


    window.print();

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