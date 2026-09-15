// ==========================================
// MUNKA PIGGERY FARM LIMITED
// VACCINATION & TREATMENT MODULE
// FARM-SECURED VERSION
// ==========================================

let editID = null;


// ==========================================
// GET LOGGED-IN USER
// ==========================================

function getLoggedUser(){

    let user = JSON.parse(
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


// ==========================================
// GET FARM ID
// ==========================================

function getFarmID(){

    const loggedUser = getLoggedUser();

    if(!loggedUser){
        return null;
    }

    if(!loggedUser.farm_id){

        alert(
            "Your account is not linked to a farm. Please contact the administrator."
        );

        return null;
    }

    return loggedUser.farm_id;
}


// ==========================================
// DISEASE INFORMATION DATABASE
// ==========================================

const healthDatabase = {

    diarrhoea: {
        cause: "Contaminated feed or water, bacteria, parasites or sudden feed changes",
        prevention: "Clean water, proper hygiene, quality feed and regular pen cleaning",
        medicine: "Electrolytes and veterinary diarrhoea treatment",
        route: "Oral"
    },

    coughing: {
        cause: "Respiratory infection, dust, poor ventilation or overcrowding",
        prevention: "Improve ventilation and reduce dust",
        medicine: "Veterinary respiratory treatment",
        route: "Injection"
    },

    fever: {
        cause: "Viral infection, bacterial infection or disease condition",
        prevention: "Vaccination, hygiene and isolation of sick pigs",
        medicine: "Veterinary fever treatment",
        route: "Injection"
    },

    mange: {
        cause: "External parasites such as mites",
        prevention: "Regular cleaning and parasite control",
        medicine: "Anti-parasitic treatment",
        route: "Topical"
    },

    worms: {
        cause: "Internal parasite infestation",
        prevention: "Routine deworming and sanitation",
        medicine: "Deworming medicine",
        route: "Oral"
    },

    lameness: {
        cause: "Injury, joint problem or mineral deficiency",
        prevention: "Good flooring and proper nutrition",
        medicine: "Anti-inflammatory treatment",
        route: "Injection"
    },

    loss_appetite: {
        cause: "Disease, stress or poor feed quality",
        prevention: "Good feeding programme and clean water",
        medicine: "Treatment according to veterinary diagnosis",
        route: "Oral"
    },

    african_swine_fever: {
        cause: "African Swine Fever virus",
        prevention: "Strict biosecurity and quarantine",
        medicine: "No specific cure; veterinary support required",
        route: "Other"
    },

    foot_mouth: {
        cause: "Foot and Mouth Disease virus",
        prevention: "Vaccination and farm hygiene",
        medicine: "Supportive treatment",
        route: "Injection"
    },

    other: {
        cause: "Requires veterinary assessment",
        prevention: "Monitor pig and maintain hygiene",
        medicine: "According to diagnosis",
        route: "Other"
    }

};


// ==========================================
// AUTOMATIC DISEASE INFORMATION
// ==========================================

document.addEventListener(
    "DOMContentLoaded",
    function(){

        const symptom =
            document.getElementById("symptom");


        if(symptom){

            symptom.addEventListener(
                "change",
                function(){

                    const info =
                        healthDatabase[this.value];


                    if(info){

                        document.getElementById(
                            "possibleCause"
                        ).value = info.cause;


                        document.getElementById(
                            "prevention"
                        ).value = info.prevention;


                        document.getElementById(
                            "medicine"
                        ).value = info.medicine;


                        document.getElementById(
                            "route"
                        ).value = info.route;

                    }

                }
            );

        }

    }
);


// ==========================================
// AUTOMATIC NEXT DATE CALCULATION
// ==========================================

function calculateNextDate(){

    let treatmentDate =
        document.getElementById(
            "treatmentDate"
        ).value;


    let interval =
        Number(
            document.getElementById(
                "interval"
            ).value
        );


    if(treatmentDate && interval){

        let date =
            new Date(treatmentDate);


        date.setDate(
            date.getDate() + interval
        );


        document.getElementById(
            "nextDate"
        ).value =
            date.toISOString()
            .split("T")[0];

    }

}


document.addEventListener(
    "DOMContentLoaded",
    function(){

        const treatmentDate =
            document.getElementById(
                "treatmentDate"
            );

        const interval =
            document.getElementById(
                "interval"
            );


        if(treatmentDate){

            treatmentDate.addEventListener(
                "change",
                calculateNextDate
            );

        }


        if(interval){

            interval.addEventListener(
                "change",
                calculateNextDate
            );

        }

    }
);


// ==========================================
// SAVE TREATMENT RECORD
// ==========================================

document.addEventListener(
    "DOMContentLoaded",
    function(){

        const saveButton =
            document.getElementById(
                "saveBtn"
            );


        if(saveButton){

            saveButton.addEventListener(
                "click",
                saveRecord
            );

        }

    }
);


// ==========================================
// SAVE RECORD
// ==========================================

async function saveRecord(){

    let loggedUser =
        getLoggedUser();


    if(!loggedUser) return;


    const farmID =
        getFarmID();


    if(!farmID) return;


    let data = {

        farm_id: farmID,

        pig_id:
            document.getElementById(
                "pigID"
            ).value.trim(),

        breed:
            document.getElementById(
                "breed"
            ).value,

        sex:
            document.getElementById(
                "sex"
            ).value,

        age:
            Number(
                document.getElementById(
                    "age"
                ).value
            ) || 0,

        age_unit:
            document.getElementById(
                "ageUnit"
            ).value,

        treatment_date:
            document.getElementById(
                "treatmentDate"
            ).value,

        symptom:
            document.getElementById(
                "symptom"
            ).value,

        possible_cause:
            document.getElementById(
                "possibleCause"
            ).value,

        prevention:
            document.getElementById(
                "prevention"
            ).value,

        medicine:
            document.getElementById(
                "medicine"
            ).value,

        route:
            document.getElementById(
                "route"
            ).value,

        dosage:
            document.getElementById(
                "dosage"
            ).value,

        interval_days:
            Number(
                document.getElementById(
                    "interval"
                ).value
            ) || 0,

        next_administration_date:
            document.getElementById(
                "nextDate"
            ).value,

        administered_by:
            document.getElementById(
                "administeredBy"
            ).value,

        remarks:
            document.getElementById(
                "remarks"
            ).value,

        created_by:
            loggedUser.full_name,

        created_at:
            new Date().toISOString(),

        updated_by:
            null,

        updated_at:
            null

    };


    // =====================================
    // CHECK REQUIRED DATES
    // =====================================

    if(!data.treatment_date){

        alert(
            "Please select treatment date"
        );

        return;

    }


    if(!data.next_administration_date){

        alert(
            "Next administration date not calculated"
        );

        return;

    }


    console.log(
        "DATA TO SAVE:",
        data
    );


    try{

        const { error } =
            await supabaseClient

            .from("treatment_records")

            .insert([data]);


        if(error) throw error;


        // =====================================
        // ACTIVITY LOG - ADD
        // =====================================

        await saveActivity(

            loggedUser.full_name +
            " (" +
            loggedUser.role +
            ")",

            "Added",

            "Vaccination & Treatment",

            "Saved treatment record for Pig ID: " +
            data.pig_id

        );


        alert(
            "Treatment record saved successfully"
        );


        document
            .getElementById("treatmentForm")
            .reset();


        loadRecords();


    }catch(error){

        console.error(error);

        alert(error.message);

    }

}


// ==========================================
// LOAD TREATMENT RECORDS
// ==========================================

async function loadRecords(){

    const farmID =
        getFarmID();


    if(!farmID) return;


    try{

        const {data,error} =
            await supabaseClient

            .from("treatment_records")

            .select("*")

            .eq("farm_id", farmID)

            .order(
                "id",
                {ascending:false}
            );


        if(error) throw error;


        let table =
            document.getElementById(
                "treatmentTable"
            );


        if(!table) return;


        table.innerHTML = "";


        data.forEach(function(row){

            table.innerHTML += `

            <tr>

                <td>${row.pig_id || ""}</td>

                <td>${row.breed || ""}</td>

                <td>${row.symptom || ""}</td>

                <td>${row.medicine || ""}</td>

                <td>${row.route || ""}</td>

                <td>${row.dosage || ""}</td>

                <td>${row.treatment_date || ""}</td>

                <td>${row.next_administration_date || ""}</td>

                <td>${row.administered_by || ""}</td>

                <td>

                    <button onclick="editTreatment(${row.id})">
                        Edit
                    </button>

                    <button onclick="deleteTreatment(${row.id})">
                        Delete
                    </button>

                </td>

            </tr>

            `;

        });


    }catch(error){

        console.error(error);

        alert(error.message);

    }

}


// ==========================================
// SEARCH TREATMENT RECORDS
// ==========================================

async function searchPig(){

    let pigID =
        document.getElementById(
            "searchPig"
        ).value.trim();


    if(!pigID){

        alert("Enter Pig ID");

        return;

    }


    const farmID =
        getFarmID();


    if(!farmID) return;


    try{

        const {data,error} =
            await supabaseClient

            .from("treatment_records")

            .select("*")

            .eq("farm_id", farmID)

            .eq("pig_id", pigID);


        if(error) throw error;


        let table =
            document.getElementById(
                "treatmentTable"
            );


        table.innerHTML = "";


        data.forEach(function(row){

            table.innerHTML += `

            <tr>

                <td>${row.pig_id || ""}</td>

                <td>${row.breed || ""}</td>

                <td>${row.symptom || ""}</td>

                <td>${row.medicine || ""}</td>

                <td>${row.route || ""}</td>

                <td>${row.dosage || ""}</td>

                <td>${row.treatment_date || ""}</td>

                <td>${row.next_administration_date || ""}</td>

                <td>${row.administered_by || ""}</td>

                <td>

                    <button onclick="editTreatment(${row.id})">
                        Edit
                    </button>

                    <button onclick="deleteTreatment(${row.id})">
                        Delete
                    </button>

                </td>

            </tr>

            `;

        });


    }catch(error){

        console.error(error);

        alert(error.message);

    }

}


// ==========================================
// LOAD RECORDS WHEN PAGE OPENS
// ==========================================

document.addEventListener(
    "DOMContentLoaded",
    function(){

        loadRecords();

    }
);


// ==========================================
// EDIT TREATMENT RECORD
// ==========================================

async function editTreatment(id){

    const farmID =
        getFarmID();


    if(!farmID) return;


    try{

        const {data,error} =
            await supabaseClient

            .from("treatment_records")

            .select("*")

            .eq("id", id)

            .eq("farm_id", farmID)

            .single();


        if(error) throw error;


        editID = id;


        document.getElementById(
            "pigID"
        ).value =
            data.pig_id || "";


        document.getElementById(
            "breed"
        ).value =
            data.breed || "";


        document.getElementById(
            "sex"
        ).value =
            data.sex || "";


        document.getElementById(
            "age"
        ).value =
            data.age || 0;


        document.getElementById(
            "ageUnit"
        ).value =
            data.age_unit || "";


        document.getElementById(
            "treatmentDate"
        ).value =
            data.treatment_date || "";


        document.getElementById(
            "symptom"
        ).value =
            data.symptom || "";


        document.getElementById(
            "possibleCause"
        ).value =
            data.possible_cause || "";


        document.getElementById(
            "prevention"
        ).value =
            data.prevention || "";


        document.getElementById(
            "medicine"
        ).value =
            data.medicine || "";


        document.getElementById(
            "route"
        ).value =
            data.route || "";


        document.getElementById(
            "dosage"
        ).value =
            data.dosage || "";


        document.getElementById(
            "interval"
        ).value =
            data.interval_days || 0;


        document.getElementById(
            "nextDate"
        ).value =
            data.next_administration_date || "";


        document.getElementById(
            "administeredBy"
        ).value =
            data.administered_by || "";


        document.getElementById(
            "remarks"
        ).value =
            data.remarks || "";


    }catch(error){

        console.error(error);

        alert(error.message);

    }

}


// ==========================================
// UPDATE TREATMENT RECORD
// ==========================================

document.addEventListener(
    "DOMContentLoaded",
    function(){

        const updateBtn =
            document.getElementById(
                "updateBtn"
            );


        if(updateBtn){

            updateBtn.addEventListener(
                "click",
                updateRecord
            );

        }

    }
);


// ==========================================
// UPDATE RECORD
// ==========================================

async function updateRecord(){

    if(editID === null){

        alert(
            "Select a record to update first"
        );

        return;

    }


    let loggedUser =
        getLoggedUser();


    if(!loggedUser) return;


    const farmID =
        getFarmID();


    if(!farmID) return;


    let updatedData = {

        pig_id:
            document.getElementById(
                "pigID"
            ).value,

        breed:
            document.getElementById(
                "breed"
            ).value,

        sex:
            document.getElementById(
                "sex"
            ).value,

        age:
            Number(
                document.getElementById(
                    "age"
                ).value
            ) || 0,

        age_unit:
            document.getElementById(
                "ageUnit"
            ).value,

        treatment_date:
            document.getElementById(
                "treatmentDate"
            ).value,

        symptom:
            document.getElementById(
                "symptom"
            ).value,

        possible_cause:
            document.getElementById(
                "possibleCause"
            ).value,

        prevention:
            document.getElementById(
                "prevention"
            ).value,

        medicine:
            document.getElementById(
                "medicine"
            ).value,

        route:
            document.getElementById(
                "route"
            ).value,

        dosage:
            document.getElementById(
                "dosage"
            ).value,

        interval_days:
            Number(
                document.getElementById(
                    "interval"
                ).value
            ) || 0,

        next_administration_date:
            document.getElementById(
                "nextDate"
            ).value,

        administered_by:
            document.getElementById(
                "administeredBy"
            ).value,

        remarks:
            document.getElementById(
                "remarks"
            ).value,

        updated_by:
            loggedUser.full_name,

        updated_at:
            new Date().toISOString()

    };


    try{

        const {data,error} =
            await supabaseClient

            .from("treatment_records")

            .update(updatedData)

            .eq("id", editID)

            .eq("farm_id", farmID)

            .select();


        if(error) throw error;


        console.log(
            "UPDATED RESULT:",
            data
        );


        await saveActivity(

            loggedUser.full_name +
            " (" +
            loggedUser.role +
            ")",

            "Updated",

            "Vaccination & Treatment",

            "Updated treatment record for Pig ID: " +
            updatedData.pig_id

        );


        alert(
            "Treatment record updated successfully"
        );


        editID = null;


        document
            .getElementById("treatmentForm")
            .reset();


        loadRecords();


    }catch(error){

        console.error(error);

        alert(error.message);

    }

}


// ==========================================
// DELETE TREATMENT RECORD
// ==========================================

async function deleteTreatment(id){

    if(!confirm(
        "Delete this treatment record?"
    )){

        return;

    }


    let loggedUser =
        getLoggedUser();


    if(!loggedUser) return;


    const farmID =
        getFarmID();


    if(!farmID) return;


    try{

        const {error} =
            await supabaseClient

            .from("treatment_records")

            .delete()

            .eq("id", id)

            .eq("farm_id", farmID);


        if(error) throw error;


        // =====================================
        // ACTIVITY LOG - DELETE
        // =====================================

        await saveActivity(

            loggedUser.full_name +
            " (" +
            loggedUser.role +
            ")",

            "Deleted",

            "Vaccination & Treatment",

            "Deleted treatment record ID: " +
            id

        );


        alert(
            "Treatment record deleted successfully"
        );


        loadRecords();


    }catch(error){

        console.error(error);

        alert(error.message);

    }

}


// ==========================================
// GENERATE TREATMENT REPORT
// ==========================================

async function generateTreatmentReport(){

    const farmID =
        getFarmID();


    if(!farmID) return;


    try{

        const {count,error} =
            await supabaseClient

            .from("treatment_records")

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


        if(error) throw error;


        alert(

            "Vaccination & Treatment Report\n\n" +

            "Total Treatment Records: " +
            count

        );


    }catch(error){

        console.error(error);

        alert(error.message);

    }

}


// ==========================================
// PRINT REPORT
// ==========================================

function printTreatmentReport(){

    window.print();

}


// ==========================================
// CLEAR FORM
// ==========================================

function clearTreatmentForm(){

    document
        .getElementById(
            "treatmentForm"
        )
        .reset();


    editID = null;

}


// ==========================================
// AUTO REFRESH TABLE
// ==========================================

document.addEventListener(
    "DOMContentLoaded",
    function(){

        loadRecords();

    }
);


// ==========================================
// END OF VACCINATION & TREATMENT MODULE
// ==========================================