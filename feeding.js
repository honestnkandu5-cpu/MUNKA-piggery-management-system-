// ==========================================
// MUNKA PIGGERY FARM LIMITED
// FINAL FEEDING RECORDS MODULE
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

window.addEventListener("DOMContentLoaded",()=>{

    generateRecordID();

    let today = new Date()
        .toISOString()
        .split("T")[0];

    document.getElementById("feedingDate").value = today;

    loadFeedingRecords();

});


// ==========================================
// GENERATE RECORD ID
// ==========================================

function generateRecordID(){

    let id = "FEED-" + Date.now();

    document.getElementById("recordID").value = id;

}


// ==========================================
// AUTOMATIC FEED COST
// ==========================================

function calculateFeedCost(){

    let quantity =
        Number(document.getElementById("quantity").value);

    let price =
        Number(document.getElementById("feedPrice").value);

    let total = quantity * price;

    document.getElementById("feedCost").value =
        total.toFixed(2);

}


document
    .getElementById("quantity")
    .addEventListener("input",calculateFeedCost);


document
    .getElementById("feedPrice")
    .addEventListener("input",calculateFeedCost);


// ==========================================
// SAVE FEEDING RECORD
// ==========================================

async function saveFeedingRecord(){

    const loggedUser = getLoggedUser();

    const farmID = getFarmID();


    if(!loggedUser){

        alert("No logged-in user found. Please login again.");

        return;
    }


    if(!farmID){

        alert("Farm information not found. Please login again.");

        return;
    }


    let data = {

        // FARM SECURITY
        farm_id: farmID,

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
        Number(document.getElementById("quantity").value),

        feed_price:
        Number(document.getElementById("feedPrice").value),

        feed_cost:
        Number(document.getElementById("feedCost").value),

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

        // CREATION INFORMATION
        created_by:
        loggedUser.full_name,

        created_at:
        new Date().toISOString(),

        // NEW RECORD HAS NOT BEEN UPDATED YET
        updated_by: null,

        updated_at: null
    };


    const {error} = await supabaseClient

        .from("feeding_records")

        .insert([data]);


    if(error){

        console.log(error);

        alert(error.message);

        return;
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

        "Feeding Records",

        "Added feeding record for Pen: " +
        data.pen_number

    );


    alert("Feeding record saved successfully");


    document
        .getElementById("feedingForm")
        .reset();


    generateRecordID();


    loadFeedingRecords();

}


// ==========================================
// PART 4 - LOAD, SEARCH, EDIT, UPDATE, DELETE
// ==========================================


// ==========================================
// LOAD ALL FEEDING RECORDS
// ==========================================

async function loadFeedingRecords(){

    const farmID = getFarmID();


    if(!farmID){

        console.error("Farm ID not found.");

        return;
    }


    const {data,error}=await supabaseClient

        .from("feeding_records")

        .select("*")

        // FARM SECURITY
        .eq("farm_id", farmID)

        .order("id",{ascending:false});


    if(error){

        console.log(error);

        return;
    }


    displayFeedingRecords(data);

}


// ==========================================
// DISPLAY RECORDS
// ==========================================

function displayFeedingRecords(data){

    let table =
        document.getElementById("feedingTable");


    table.innerHTML="";


    data.forEach(row=>{

        table.innerHTML += `

        <tr>

        <td>${row.feeding_date || ""}</td>

        <td>${row.pen_number || ""}</td>

        <td>${row.pig_category || ""}</td>

        <td>${row.breed || ""}</td>

        <td>${row.feed_type || ""}</td>

        <td>${row.quantity || ""}</td>

        <td>${row.feed_cost || ""}</td>

        <td>${row.responsible_person || ""}</td>


        <td>

        <button onclick="editFeedingRecord(${row.id})">
        Edit
        </button>


        <button onclick="deleteFeedingRecord(${row.id})">
        Delete
        </button>

        </td>


        </tr>

        `;

    });

}


// ==========================================
// SEARCH RECORD
// ==========================================

async function searchFeedingRecord(){

    const farmID = getFarmID();


    if(!farmID){

        alert("Farm information not found. Please login again.");

        return;
    }


    let pen =
        document.getElementById("penNumber").value;


    if(pen===""){

        alert("Enter Pen Number");

        return;
    }


    const {data,error}=await supabaseClient

        .from("feeding_records")

        .select("*")

        // FARM SECURITY
        .eq("farm_id", farmID)

        .eq("pen_number",pen);


    if(error){

        alert(error.message);

        return;
    }


    displayFeedingRecords(data);

}


// ==========================================
// EDIT RECORD
// ==========================================

async function editFeedingRecord(id){

    const farmID = getFarmID();


    if(!farmID){

        alert("Farm information not found. Please login again.");

        return;
    }


    const {data,error}=await supabaseClient

        .from("feeding_records")

        .select("*")

        // FARM SECURITY
        .eq("id",id)

        .eq("farm_id",farmID)

        .single();


    if(error){

        alert(error.message);

        return;
    }


    editID=id;


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
        data.morning_feeding || "";


    document.getElementById("eveningFeeding").value =
        data.evening_feeding || "";


    document.getElementById("waterAvailable").value =
        data.water_available || "";


    document.getElementById("feedSupplier").value =
        data.feed_supplier || "";


    document.getElementById("responsiblePerson").value =
        data.responsible_person || "";


    document.getElementById("remarks").value =
        data.remarks || "";


    window.scrollTo(0,0);

}


// ==========================================
// UPDATE FEEDING RECORD
// ==========================================

async function updateFeedingRecord(){

    if(editID === null){

        alert("Select record first");

        return;
    }


    const loggedUser = getLoggedUser();

    const farmID = getFarmID();


    if(!loggedUser){

        alert("No logged-in user found. Please login again.");

        return;
    }


    if(!farmID){

        alert("Farm information not found. Please login again.");

        return;
    }


    let updated = {

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
        Number(document.getElementById("quantity").value),

        feed_price:
        Number(document.getElementById("feedPrice").value),

        feed_cost:
        Number(document.getElementById("feedCost").value),

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

        // UPDATE INFORMATION
        updated_by:
        loggedUser.full_name,

        updated_at:
        new Date().toISOString()
    };


    const {error} = await supabaseClient

        .from("feeding_records")

        .update(updated)

        // FARM SECURITY
        .eq("id", editID)

        .eq("farm_id", farmID);


    if(error){

        console.log(error);

        alert(error.message);

        return;
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

        "Feeding Records",

        "Updated feeding record for Pen: " +
        updated.pen_number

    );


    alert("Record updated successfully");


    editID = null;


    document
        .getElementById("feedingForm")
        .reset();


    generateRecordID();


    loadFeedingRecords();

}


// ==========================================
// DELETE RECORD
// ==========================================

async function deleteFeedingRecord(id){

    if(!confirm("Delete this feeding record?"))

        return;


    const farmID = getFarmID();


    const loggedUser = getLoggedUser();


    if(!farmID){

        alert("Farm information not found. Please login again.");

        return;
    }


    const {error}=await supabaseClient

        .from("feeding_records")

        .delete()

        // FARM SECURITY
        .eq("id",id)

        .eq("farm_id",farmID);


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

            "Deleted feeding record ID: " + id

        );

    }


    loadFeedingRecords();

}


// ==========================================
// PART 5 - REPORT & STATISTICS
// ==========================================


// ==========================================
// GENERATE FEEDING REPORT
// ==========================================

async function generateReport(){

    const farmID = getFarmID();


    if(!farmID){

        alert("Farm information not found. Please login again.");

        return;
    }


    const {data,error}=await supabaseClient

        .from("feeding_records")

        .select("*")

        // FARM SECURITY
        .eq("farm_id",farmID);


    if(error){

        alert(error.message);

        return;
    }


    let totalQuantity = 0;

    let totalCost = 0;

    let feedCount = data.length;


    let feedTypes = {};


    data.forEach(record=>{

        totalQuantity +=
            Number(record.quantity || 0);


        totalCost +=
            Number(record.feed_cost || 0);


        let type = record.feed_type;


        if(type){

            if(feedTypes[type]){

                feedTypes[type]++;

            }
            else{

                feedTypes[type]=1;

            }

        }

    });


    let mostUsedFeed = "None";

    let highest = 0;


    for(let feed in feedTypes){

        if(feedTypes[feed] > highest){

            highest =
                feedTypes[feed];

            mostUsedFeed =
                feed;

        }

    }


    alert(

        "MUNKA PIGGERY FEEDING REPORT\n\n"+

        "Total Records: "+
        feedCount+"\n\n"+

        "Total Feed Used: "+
        totalQuantity.toFixed(2)+
        " Kg\n\n"+

        "Total Feed Cost: ZMW "+
        totalCost.toFixed(2)+"\n\n"+

        "Most Used Feed: "+
        mostUsedFeed

    );

}