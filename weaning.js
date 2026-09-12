// =====================================
// MUNKA PIGGERY FARM
// WEANING RECORDS - SUPABASE
// PART 1
// =====================================


let weaningRecords = [];
let editID = null;
// =====================================
// GET LOGGED-IN USER
// =====================================

function getLoggedUser(){

    let user = JSON.parse(localStorage.getItem("loggedInUser"));

    if(!user){

        alert("No logged-in user found. Please login again.");

        return null;

    }

    return user;

}

// =====================================
// LOAD ALL WEANING RECORDS
// =====================================

async function loadRecords(){

    try{

        const { data, error } =
        await supabaseClient

        .from("weaning_records")

        .select("*")

        .order("id", { ascending:true });


        if(error) throw error;


        weaningRecords = data || [];


        displayRecords();


    }catch(error){

        console.error(error);

        alert(error.message);

    }

}



// =====================================
// LOAD FARROWING DETAILS
// USING SOW ID
// =====================================

async function loadFarrowingDetails(){

    let sowID =
    document.getElementById("sowID")
    .value.trim();


    if(sowID === "") return;


    try{


        const { data, error } =
        await supabaseClient

        .from("farrowing_records")

        .select("*")

        .eq("sow_id", sowID)

        .order("id", { ascending:false })

        .limit(1)

        .single();



        if(error){

            alert(
            "No farrowing record found for this Sow ID."
            );

            return;

        }



        // Fill farrowing information

        document.getElementById("farrowDate")
        .value =
        data.farrow_date || "";



        document.getElementById("totalBorn")
        .value =
        data.total_born || 0;



        // Calculate weaning date
        // 33 days after farrowing

        let date =
        new Date(data.farrow_date);



        date.setDate(
            date.getDate() + 33
        );



        document.getElementById("weaningDate")
        .value =
        date.toISOString()
        .split("T")[0];



    }catch(error){

        console.error(error);

        alert(error.message);

    }

}



// =====================================
// AUTOMATIC WEANING DATE
// WHEN FARROW DATE CHANGES
// =====================================

document.getElementById("farrowDate")
.addEventListener(
"change",
function(){


    let farrowDate =
    new Date(this.value);



    if(isNaN(farrowDate)) return;



    farrowDate.setDate(
        farrowDate.getDate() + 33
    );



    document.getElementById("weaningDate")
    .value =
    farrowDate.toISOString()
    .split("T")[0];


});



// =====================================
// AUTOMATIC TOTAL WEANED
// =====================================

function calculateTotalWeaned(){


    let male =
    Number(
    document.getElementById("maleWeaned")
    .value
    ) || 0;



    let female =
    Number(
    document.getElementById("femaleWeaned")
    .value
    ) || 0;



    document.getElementById("totalWeaned")
    .value =
    male + female;


}



document.getElementById("maleWeaned")
.addEventListener(
"input",
calculateTotalWeaned
);



document.getElementById("femaleWeaned")
.addEventListener(
"input",
calculateTotalWeaned
);



// =====================================
// START WHEN PAGE LOADS
// =====================================

document.addEventListener(
"DOMContentLoaded",
function(){


    document.getElementById("sowID")
    .addEventListener(
    "change",
    loadFarrowingDetails
    );


    loadRecords();


});
// =====================================
// PART 2
// SAVE / UPDATE WEANING RECORDS
// =====================================


document.getElementById("weaningForm")
.addEventListener(
"submit",
async function(e){


    e.preventDefault();

let loggedUser = getLoggedUser();

if(!loggedUser) return;


let reason =
document.getElementById("mortalityReason")
.value;



    if(reason === "Other"){

        reason =
        document.getElementById("otherReason")
        .value.trim();

    }



    let record = {


        sow_id:
        document.getElementById("sowID")
        .value.trim(),



        farrow_date:
        document.getElementById("farrowDate")
        .value,



        weaning_date:
        document.getElementById("weaningDate")
        .value,



        total_born:
        Number(
        document.getElementById("totalBorn")
        .value
        ) || 0,



        male_weaned:
        Number(
        document.getElementById("maleWeaned")
        .value
        ) || 0,



        female_weaned:
        Number(
        document.getElementById("femaleWeaned")
        .value
        ) || 0,



        total_weaned:
        Number(
        document.getElementById("totalWeaned")
        .value
        ) || 0,



        average_weight:
        Number(
        document.getElementById("averageWeight")
        .value
        ) || 0,



        mortality:
        Number(
        document.getElementById("mortality")
        .value
        ) || 0,



        mortality_reason:
        reason,



        destination_pen:
        document.getElementById("destinationPen")
        .value,



        remarks:
document.getElementById("remarks")
.value.trim(),

created_by: loggedUser.full_name,

created_at: new Date().toISOString(),

updated_by: null,

updated_at: null

};



    try{


        if(editID === null){



            const { error } =
            await supabaseClient

            .from("weaning_records")

            .insert([record]);



            if(error) throw error;


// ACTIVITY LOG - ADD
            

if(loggedUser){

    await saveActivity(

        loggedUser.full_name,

        "Added",

        "Weaning Records",

        "Added weaning record for Sow ID: " + record.sow_id +
        " (" + loggedUser.role + ")"

    );

}


alert(
"Weaning record saved successfully."
);



        }else{


record.updated_by = loggedUser.full_name;

record.updated_at = new Date().toISOString();
            const { error } =
            await supabaseClient

            .from("weaning_records")

            .update(record)

            .eq("id", editID);



            if(error) throw error;


// ACTIVITY LOG - UPDATE

await saveActivity(

loggedUser.full_name + " (" + loggedUser.role + ")",

"Updated",

"Weaning Records",

"Updated weaning record for Sow ID: " + record.sow_id

);
            
            


alert(
"Weaning record updated successfully."
);



            editID = null;

        }



        document.getElementById("weaningForm")
        .reset();



        loadRecords();



    }catch(error){


        console.error(error);

        alert(error.message);


    }


});




// =====================================
// DISPLAY RECORDS IN TABLE
// =====================================


function displayRecords(records = weaningRecords){



    const table =
    document.getElementById("weaningTable");



    table.innerHTML = "";



    records.forEach(function(record){



        table.innerHTML += `


        <tr>


        <td>${record.sow_id}</td>


        <td>${record.farrow_date || ""}</td>


        <td>${record.weaning_date || ""}</td>


        <td>${record.total_born || 0}</td>


        <td>${record.total_weaned || 0}</td>


        <td>${record.average_weight || 0}</td>


        <td>${record.destination_pen || ""}</td>


        <td>


        <button onclick="editRecord(${record.id})">

        Edit

        </button>



        <button onclick="deleteRecord(${record.id})">

        Delete

        </button>


        </td>


        </tr>


        `;


    });


}
// =====================================
// PART 3
// EDIT / DELETE / SEARCH / CLEAR / REPORT
// =====================================


// =====================================
// EDIT RECORD
// =====================================

async function editRecord(id){

    try{


        const { data, error } =
        await supabaseClient

        .from("weaning_records")

        .select("*")

        .eq("id", id)

        .single();



        if(error) throw error;



        document.getElementById("sowID").value =
        data.sow_id || "";

        document.getElementById("farrowDate").value =
        data.farrow_date || "";

        document.getElementById("weaningDate").value =
        data.weaning_date || "";

        document.getElementById("totalBorn").value =
        data.total_born || 0;

        document.getElementById("maleWeaned").value =
        data.male_weaned || 0;

        document.getElementById("femaleWeaned").value =
        data.female_weaned || 0;

        document.getElementById("totalWeaned").value =
        data.total_weaned || 0;

        document.getElementById("averageWeight").value =
        data.average_weight || 0;

        document.getElementById("mortality").value =
        data.mortality || 0;

        document.getElementById("mortalityReason").value =
        data.mortality_reason || "";

        document.getElementById("destinationPen").value =
        data.destination_pen || "";

        document.getElementById("remarks").value =
        data.remarks || "";


        editID = id;


        window.scrollTo({

            top:0,

            behavior:"smooth"

        });



    }catch(error){

        console.error(error);

        alert(error.message);

    }

}



// =====================================
// DELETE RECORD
// =====================================

async function deleteRecord(id){


    if(!confirm(
    "Delete this weaning record?"
    )) return;



    try{


        const { error } =
        await supabaseClient

        .from("weaning_records")

        .delete()

        .eq("id", id);



        if(error) throw error;


// ACTIVITY LOG - DELETE

let loggedUser = getLoggedUser();

if(loggedUser){

    await saveActivity(

        loggedUser.full_name,

        "Deleted",

        "Weaning Records",

        "Deleted weaning record ID: " + id +
        " (" + loggedUser.role + ")"

    );

}


alert(
"Record deleted successfully."
);



        loadRecords();



    }catch(error){


        console.error(error);

        alert(error.message);


    }


}




// =====================================
// SEARCH WEANING RECORDS
// =====================================


async function searchRecord(){


    let keyword =
    document.getElementById("searchWeaning")
    .value.trim();



    const { data, error } =
    await supabaseClient

    .from("weaning_records")

    .select("*")

    .ilike(
    "sow_id",
    `%${keyword}%`
    )

    .order("id");



    if(error){

        console.error(error);

        return;

    }



    displayRecords(data);


}



document.getElementById("searchWeaning")
.addEventListener(
"keyup",
searchRecord
);





// =====================================
// OTHER MORTALITY REASON
// =====================================


document.getElementById("mortalityReason")
.addEventListener(
"change",
function(){


    if(this.value === "Other"){


        document.getElementById(
        "otherReasonGroup"
        )
        .style.display="block";


    }else{


        document.getElementById(
        "otherReasonGroup"
        )
        .style.display="none";


        document.getElementById(
        "otherReason"
        )
        .value="";


    }


});




// =====================================
// CLEAR FORM
// =====================================


function clearForm(){


    document.getElementById(
    "weaningForm"
    )
    .reset();



    document.getElementById(
    "otherReasonGroup"
    )
    .style.display="none";



    editID = null;


}





// =====================================
// GENERATE REPORT
// =====================================


async function generateReport(){


    let totalWeaned = 0;

    let mortality = 0;



    weaningRecords.forEach(function(record){


        totalWeaned +=
        Number(record.total_weaned) || 0;



        mortality +=
        Number(record.mortality) || 0;


    });



    alert(

    "MUNKA PIGGERY WEANING REPORT\n\n"+

    "Total Records: "
    + weaningRecords.length +

    "\nTotal Weaned Piglets: "
    + totalWeaned +

    "\nTotal Mortality: "
    + mortality

    );


}





// =====================================
// PRINT
// =====================================


function printReport(){

    window.print();

}