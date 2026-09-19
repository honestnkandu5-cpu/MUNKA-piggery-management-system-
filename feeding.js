// ==========================================
// MUNKA PIGGERY FARM LIMITED
// FEEDING RECORDS MODULE
// FARM-SECURED VERSION
// ==========================================

let editID = null;


// ==========================================
// GET LOGGED-IN USER
// ==========================================

function getLoggedUser(){

    const loggedUser =
        JSON.parse(localStorage.getItem("loggedInUser"));

    return loggedUser;
}


// ==========================================
// GET CURRENT FARM ID
// ==========================================

function getFarmID(){

    const loggedUser = getLoggedUser();

    if(!loggedUser){

        console.error("No logged-in user found.");

        return null;
    }

    return loggedUser.farm_id;
}


// ==========================================
// INITIAL LOAD
// ==========================================

window.addEventListener("DOMContentLoaded", () => {

    generateRecordID();

    const today =
        new Date().toISOString().split("T")[0];

    document.getElementById("feedingDate").value = today;

    setupFeedCostCalculation();

    loadFeedingRecords();

});


// ==========================================
// GENERATE RECORD ID
// ==========================================

function generateRecordID(){

    const id =
        "FEED-" + Date.now();

    const recordID =
        document.getElementById("recordID");

    if(recordID){

        recordID.value = id;

    }

}


// ==========================================
// AUTOMATIC FEED COST
// ==========================================

function calculateFeedCost(){

    const quantity =
        Number(document.getElementById("quantity").value || 0);

    const price =
        Number(document.getElementById("feedPrice").value || 0);

    const total =
        quantity * price;

    document.getElementById("feedCost").value =
        total.toFixed(2);

}


function setupFeedCostCalculation(){

    const quantity =
        document.getElementById("quantity");

    const price =
        document.getElementById("feedPrice");

    if(quantity){

        quantity.addEventListener(
            "change",
            calculateFeedCost
        );

    }

    if(price){

        price.addEventListener(
            "change",
            calculateFeedCost
        );

    }

}


// ==========================================
// ESCAPE HTML
// ==========================================

function escapeHTML(value){

    if(value === null || value === undefined){

        return "";

    }

    return String(value)

        .replace(/&/g,"&amp;")
        .replace(/</g,"&lt;")
        .replace(/>/g,"&gt;")
        .replace(/"/g,"&quot;")
        .replace(/'/g,"&#039;");

}


// ==========================================
// SAVE FEEDING RECORD
// ==========================================

async function saveFeedingRecord(){

    const loggedUser =
        getLoggedUser();

    const farmID =
        getFarmID();


    if(!loggedUser){

        alert(
            "No logged-in user found. Please login again."
        );

        return;
    }


    if(!farmID){

        alert(
            "Farm information not found. Please login again."
        );

        return;
    }


    calculateFeedCost();


    const data = {

        farm_id:
            farmID,

        record_id:
            document.getElementById("recordID").value,

        feeding_date:
            document.getElementById("feedingDate").value,

        pen_number:
            document.getElementById("penNumber").value,

        pig_category:
            document.getElementById("pigCategory").value,

        breed:
            document.getElementById("breed").value,

        feed_type:
            document.getElementById("feedType").value,

        feed_brand:
            document.getElementById("feedBrand").value,

        quantity:
            Number(
                document.getElementById("quantity").value
            ),

        feed_price:
            Number(
                document.getElementById("feedPrice").value
            ),

        feed_cost:
            Number(
                document.getElementById("feedCost").value
            ),

        morning_feeding:
            document.getElementById("morningFeeding").value,

        evening_feeding:
            document.getElementById("eveningFeeding").value,

        water_available:
            document.getElementById("waterAvailable").value,

        feed_supplier:
            document.getElementById("feedSupplier").value,

        responsible_person:
            document.getElementById("responsiblePerson").value,

        remarks:
            document.getElementById("remarks").value,

        created_by:
            loggedUser.full_name,

        created_at:
            new Date().toISOString(),

        updated_by:
            null,

        updated_at:
            null
    };


    const { error } =
        await supabaseClient

            .from("feeding_records")

            .insert([data]);


    if(error){

        console.error(error);

        alert(error.message);

        return;
    }


    // ACTIVITY LOG

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


    alert(
        "Feeding record saved successfully."
    );


    document
        .getElementById("feedingForm")
        .reset();


    editID = null;

    generateRecordID();

    document.getElementById("feedingDate").value =
        new Date().toISOString().split("T")[0];

    document.getElementById("morningFeeding").value =
        "08:00";

    document.getElementById("eveningFeeding").value =
        "16:00";

    document.getElementById("feedCost").value =
        "";

    loadFeedingRecords();

}


// ==========================================
// LOAD ALL FEEDING RECORDS
// ==========================================

async function loadFeedingRecords(){

    const farmID =
        getFarmID();


    if(!farmID){

        console.error(
            "Farm ID not found."
        );

        return;
    }


    const { data, error } =
        await supabaseClient

            .from("feeding_records")

            .select("*")

            .eq("farm_id", farmID)

            .order("id", {
                ascending:false
            });


    if(error){

        console.error(error);

        return;
    }


    displayFeedingRecords(data || []);

}


// ==========================================
// DISPLAY RECORDS
// ==========================================

function displayFeedingRecords(data){

    const table =
        document.getElementById("feedingTable");


    table.innerHTML = "";


    if(!data.length){

        table.innerHTML = `

            <tr>

                <td colspan="11" class="empty-state">

                    No feeding records found.

                </td>

            </tr>

        `;

        return;

    }


    data.forEach(row => {

        const tr =
            document.createElement("tr");


        tr.innerHTML = `

            <td>
                ${escapeHTML(row.feeding_date || "")}
            </td>

            <td>
                ${escapeHTML(row.pen_number || "")}
            </td>

            <td>
                ${escapeHTML(row.pig_category || "")}
            </td>

            <td>
                ${escapeHTML(row.breed || "")}
            </td>

            <td>
                ${escapeHTML(row.feed_type || "")}
            </td>

            <td>
                ${escapeHTML(row.feed_brand || "")}
            </td>

            <td>
                ${row.quantity !== null &&
                  row.quantity !== undefined
                    ? escapeHTML(row.quantity) + " Kg"
                    : ""}
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

            <td>
                ${escapeHTML(row.remarks || "")}
            </td>

            <td>
                ${escapeHTML(
                    row.responsible_person || ""
                )}
            </td>

            <td class="action-cell">

                <button
                    class="small-btn edit-action"
                    onclick="editFeedingRecord(${row.id})">
                    Edit
                </button>

                <button
                    class="small-btn delete-action"
                    onclick="deleteFeedingRecord(${row.id})">
                    Delete
                </button>

            </td>

        `;


        table.appendChild(tr);

    });

}


// ==========================================
// SEARCH RECORD
// ==========================================

async function searchFeedingRecord(){

    const farmID =
        getFarmID();


    if(!farmID){

        alert(
            "Farm information not found. Please login again."
        );

        return;
    }


    const pen =
        document.getElementById("penNumber").value;


    if(pen === ""){

        alert("Select a Pen Number first.");

        return;
    }


    const { data, error } =
        await supabaseClient

            .from("feeding_records")

            .select("*")

            .eq("farm_id", farmID)

            .eq("pen_number", pen)

            .order("id", {
                ascending:false
            });


    if(error){

        alert(error.message);

        return;
    }


    displayFeedingRecords(data || []);

}


// ==========================================
// EDIT RECORD
// ==========================================

async function editFeedingRecord(id){

    const farmID =
        getFarmID();


    if(!farmID){

        alert(
            "Farm information not found. Please login again."
        );

        return;
    }


    const { data, error } =
        await supabaseClient

            .from("feeding_records")

            .select("*")

            .eq("id", id)

            .eq("farm_id", farmID)

            .single();


    if(error){

        alert(error.message);

        return;
    }


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
        data.quantity || "";


    document.getElementById("feedPrice").value =
        data.feed_price || "";


    document.getElementById("feedCost").value =
        data.feed_cost || "";


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
        top:0,
        behavior:"smooth"
    });

}


// ==========================================
// UPDATE FEEDING RECORD
// ==========================================

async function updateFeedingRecord(){

    if(editID === null){

        alert(
            "Select a record first by clicking Edit."
        );

        return;
    }


    const loggedUser =
        getLoggedUser();

    const farmID =
        getFarmID();


    if(!loggedUser){

        alert(
            "No logged-in user found. Please login again."
        );

        return;
    }


    if(!farmID){

        alert(
            "Farm information not found. Please login again."
        );

        return;
    }


    calculateFeedCost();


    const updated = {

        record_id:
            document.getElementById("recordID").value,

        feeding_date:
            document.getElementById("feedingDate").value,

        pen_number:
            document.getElementById("penNumber").value,

        pig_category:
            document.getElementById("pigCategory").value,

        breed:
            document.getElementById("breed").value,

        feed_type:
            document.getElementById("feedType").value,

        feed_brand:
            document.getElementById("feedBrand").value,

        quantity:
            Number(
                document.getElementById("quantity").value
            ),

        feed_price:
            Number(
                document.getElementById("feedPrice").value
            ),

        feed_cost:
            Number(
                document.getElementById("feedCost").value
            ),

        morning_feeding:
            document.getElementById("morningFeeding").value,

        evening_feeding:
            document.getElementById("eveningFeeding").value,

        water_available:
            document.getElementById("waterAvailable").value,

        feed_supplier:
            document.getElementById("feedSupplier").value,

        responsible_person:
            document.getElementById("responsiblePerson").value,

        remarks:
            document.getElementById("remarks").value,

        updated_by:
            loggedUser.full_name,

        updated_at:
            new Date().toISOString()
    };


    const { error } =
        await supabaseClient

            .from("feeding_records")

            .update(updated)

            .eq("id", editID)

            .eq("farm_id", farmID);


    if(error){

        console.error(error);

        alert(error.message);

        return;
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


    alert(
        "Feeding record updated successfully."
    );


    editID = null;


    document
        .getElementById("feedingForm")
        .reset();


    generateRecordID();


    document.getElementById("feedingDate").value =
        new Date().toISOString().split("T")[0];

    document.getElementById("morningFeeding").value =
        "08:00";

    document.getElementById("eveningFeeding").value =
        "16:00";

    document.getElementById("feedCost").value =
        "";


    loadFeedingRecords();

}


// ==========================================
// DELETE RECORD
// ==========================================

async function deleteFeedingRecord(id){

    if(!confirm(
        "Delete this feeding record?"
    )){

        return;
    }


    const farmID =
        getFarmID();

    const loggedUser =
        getLoggedUser();


    if(!farmID){

        alert(
            "Farm information not found. Please login again."
        );

        return;
    }


    const { error } =
        await supabaseClient

            .from("feeding_records")

            .delete()

            .eq("id", id)

            .eq("farm_id", farmID);


    if(error){

        alert(error.message);

        return;
    }


    if(loggedUser){

        await saveActivity(

            loggedUser.full_name +
            " (" +
            loggedUser.role +
            ")",

            "Deleted",

            "Feeding Records",

            "Deleted feeding record ID: " +
            id

        );

    }


    alert(
        "Feeding record deleted successfully."
    );


    loadFeedingRecords();

}


// ==========================================
// FEEDING REPORT
// ==========================================

async function generateReport(){

    const farmID =
        getFarmID();


    if(!farmID){

        alert(
            "Farm information not found. Please login again."
        );

        return;
    }


    const { data, error } =
        await supabaseClient

            .from("feeding_records")

            .select("*")

            .eq("farm_id", farmID);


    if(error){

        alert(error.message);

        return;
    }


    let totalQuantity = 0;

    let totalCost = 0;

    const feedCount =
        data.length;

    const feedTypes = {};


    data.forEach(record => {

        totalQuantity +=
            Number(record.quantity || 0);

        totalCost +=
            Number(record.feed_cost || 0);


        const type =
            record.feed_type;


        if(type){

            if(feedTypes[type]){

                feedTypes[type]++;

            }
            else{

                feedTypes[type] = 1;

            }

        }

    });


    let mostUsedFeed = "None";

    let highest = 0;


    for(const feed in feedTypes){

        if(feedTypes[feed] > highest){

            highest =
                feedTypes[feed];

            mostUsedFeed =
                feed;

        }

    }


    alert(

        "MUNKA PIGGERY FEEDING REPORT\n\n" +

        "Total Records: " +
        feedCount +
        "\n\n" +

        "Total Feed Used: " +
        totalQuantity.toFixed(2) +
        " Kg\n\n" +

        "Total Feed Cost: ZMW " +
        totalCost.toFixed(2) +
        "\n\n" +

        "Most Used Feed: " +
        mostUsedFeed

    );

}