// ==========================================
// MUNKA PIGGERY TECHNOLOGY
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
// GET REGISTERED FARM NAME
// ==========================================

async function getRegisteredFarmName(){

    try{

        if(typeof supabaseClient === "undefined"){
            return "REGISTERED FARM";
        }

        const loggedUser =
            getLoggedUser();

        if(!loggedUser){
            return "REGISTERED FARM";
        }

        const farmID =
            loggedUser.farm_id;

        if(
            farmID === null ||
            farmID === undefined ||
            farmID === ""
        ){
            return "REGISTERED FARM";
        }

        const { data: farm, error } =
            await supabaseClient

            .from("farms")

            .select("farm_name")

            .eq("id", farmID)

            .maybeSingle();

        if(error){

            console.error(
                "GET FARM NAME ERROR:",
                error
            );

            return "REGISTERED FARM";
        }

        if(
            farm &&
            farm.farm_name
        ){

            return String(
                farm.farm_name
            ).trim();

        }

        return "REGISTERED FARM";

    }catch(error){

        console.error(
            "FARM NAME ERROR:",
            error
        );

        return "REGISTERED FARM";
    }

}


// ==========================================
// HTML ESCAPE
// ==========================================

function escapeHTML(value){

    if(
        value === null ||
        value === undefined
    ){
        return "";
    }

    return String(value)

        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}


// ==========================================
// DISEASE INFORMATION DATABASE
// ==========================================

const healthDatabase = {

    diarrhoea: {

        cause:
            "Contaminated feed or water, bacteria, parasites or sudden feed changes",

        prevention:
            "Clean water, proper hygiene, quality feed and regular pen cleaning",

        medicine:
            "Electrolytes and veterinary diarrhoea treatment",

        route:
            "Oral"

    },

    coughing: {

        cause:
            "Respiratory infection, dust, poor ventilation or overcrowding",

        prevention:
            "Improve ventilation and reduce dust",

        medicine:
            "Veterinary respiratory treatment",

        route:
            "Injection"

    },

    fever: {

        cause:
            "Viral infection, bacterial infection or disease condition",

        prevention:
            "Vaccination, hygiene and isolation of sick pigs",

        medicine:
            "Veterinary fever treatment",

        route:
            "Injection"

    },

    mange: {

        cause:
            "External parasites such as mites",

        prevention:
            "Regular cleaning and parasite control",

        medicine:
            "Anti-parasitic treatment",

        route:
            "Topical"

    },

    worms: {

        cause:
            "Internal parasite infestation",

        prevention:
            "Routine deworming and sanitation",

        medicine:
            "Deworming medicine",

        route:
            "Oral"

    },

    lameness: {

        cause:
            "Injury, joint problem or mineral deficiency",

        prevention:
            "Good flooring and proper nutrition",

        medicine:
            "Anti-inflammatory treatment",

        route:
            "Injection"

    },

    loss_appetite: {

        cause:
            "Disease, stress or poor feed quality",

        prevention:
            "Good feeding programme and clean water",

        medicine:
            "Treatment according to veterinary diagnosis",

        route:
            "Oral"

    },

    african_swine_fever: {

        cause:
            "African Swine Fever virus",

        prevention:
            "Strict biosecurity and quarantine",

        medicine:
            "No specific cure; veterinary support required",

        route:
            "Other"

    },

    foot_mouth: {

        cause:
            "Foot and Mouth Disease virus",

        prevention:
            "Vaccination and farm hygiene",

        medicine:
            "Supportive treatment",

        route:
            "Injection"

    },

    other: {

        cause:
            "Requires veterinary assessment",

        prevention:
            "Monitor pig and maintain hygiene",

        medicine:
            "According to diagnosis",

        route:
            "Other"

    }

};


// ==========================================
// AUTOMATIC DISEASE INFORMATION
// ==========================================

function loadDiseaseInformation(){

    const symptom =
        document.getElementById("symptom");

    if(!symptom){
        return;
    }

    const info =
        healthDatabase[symptom.value];

    const otherDiseaseGroup =
        document.getElementById(
            "otherDiseaseGroup"
        );

    if(otherDiseaseGroup){

        otherDiseaseGroup.style.display =
            symptom.value === "other"
            ? "flex"
            : "none";

    }

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


document.addEventListener(
    "DOMContentLoaded",
    function(){

        const symptom =
            document.getElementById(
                "symptom"
            );

        if(symptom){

            symptom.addEventListener(
                "change",
                loadDiseaseInformation
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

    if(
        treatmentDate &&
        interval
    ){

        let date =
            new Date(
                treatmentDate +
                "T00:00:00"
            );

        date.setDate(
            date.getDate() +
            interval
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
// SAVE BUTTON
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

        farm_id:
            farmID,

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

    if(!data.pig_id){

        alert(
            "Please enter Pig ID."
        );

        return;
    }

    if(!data.treatment_date){

        alert(
            "Please select treatment date."
        );

        return;
    }

    if(!data.next_administration_date){

        alert(
            "Next administration date was not calculated."
        );

        return;
    }

    try{

        const { error } =
            await supabaseClient

            .from("treatment_records")

            .insert([data]);

        if(error) throw error;

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
            "Treatment record saved successfully."
        );

        document
            .getElementById(
                "treatmentForm"
            )
            .reset();

        document.getElementById(
            "otherDiseaseGroup"
        ).style.display = "none";

        editID = null;

        loadRecords();

    }catch(error){

        console.error(
            "SAVE ERROR:",
            error
        );

        alert(
            error.message
        );

    }

}


// ==========================================
// BUILD TABLE ROW
// ==========================================

function createTreatmentRow(row){

    return `

        <tr>

            <td>${escapeHTML(row.pig_id)}</td>

            <td>${escapeHTML(row.breed)}</td>

            <td>${escapeHTML(row.symptom)}</td>

            <td>${escapeHTML(row.medicine)}</td>

            <td>${escapeHTML(row.route)}</td>

            <td>${escapeHTML(row.dosage)}</td>

            <td>${escapeHTML(row.treatment_date)}</td>

            <td>${escapeHTML(row.next_administration_date)}</td>

            <td>${escapeHTML(row.administered_by)}</td>

            <td class="action-cell">

                <button
                    type="button"
                    class="edit-btn"
                    onclick="editTreatment(${row.id})">
                    ✏️ Edit
                </button>

                <button
                    type="button"
                    class="delete-btn"
                    onclick="deleteTreatment(${row.id})">
                    🗑️ Delete
                </button>

            </td>

        </tr>

    `;

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

            .eq(
                "farm_id",
                farmID
            )

            .order(
                "id",
                {
                    ascending:false
                }
            );

        if(error) throw error;

        let table =
            document.getElementById(
                "treatmentTable"
            );

        if(!table) return;

        table.innerHTML = "";

        if(
            !data ||
            data.length === 0
        ){

            table.innerHTML = `

                <tr>

                    <td
                        colspan="10"
                        class="no-records">

                        No treatment records found.

                    </td>

                </tr>

            `;

            return;
        }

        data.forEach(
            function(row){

                table.innerHTML +=
                    createTreatmentRow(row);

            }
        );

    }catch(error){

        console.error(
            "LOAD ERROR:",
            error
        );

        alert(
            error.message
        );

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

        loadRecords();

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

            .eq(
                "farm_id",
                farmID
            )

            .eq(
                "pig_id",
                pigID
            )

            .order(
                "id",
                {
                    ascending:false
                }
            );

        if(error) throw error;

        let table =
            document.getElementById(
                "treatmentTable"
            );

        table.innerHTML = "";

        if(
            !data ||
            data.length === 0
        ){

            table.innerHTML = `

                <tr>

                    <td
                        colspan="10"
                        class="no-records">

                        No records found for Pig ID:
                        ${escapeHTML(pigID)}

                    </td>

                </tr>

            `;

            return;
        }

        data.forEach(
            function(row){

                table.innerHTML +=
                    createTreatmentRow(row);

            }
        );

    }catch(error){

        console.error(
            "SEARCH ERROR:",
            error
        );

        alert(
            error.message
        );

    }

}


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

            .eq(
                "id",
                id
            )

            .eq(
                "farm_id",
                farmID
            )

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
            data.age_unit || "Days";

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
            data.interval_days || 1;

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

        const otherDiseaseGroup =
            document.getElementById(
                "otherDiseaseGroup"
            );

        if(otherDiseaseGroup){

            otherDiseaseGroup.style.display =
                data.symptom === "other"
                ? "flex"
                : "none";

        }

        document
            .getElementById(
                "treatmentForm"
            )
            .scrollIntoView({

                behavior:"smooth",

                block:"start"

            });

    }catch(error){

        console.error(
            "EDIT ERROR:",
            error
        );

        alert(
            error.message
        );

    }

}


// ==========================================
// UPDATE BUTTON
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
            "Select a record to update first."
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

        updated_by:
            loggedUser.full_name,

        updated_at:
            new Date().toISOString()

    };

    if(!updatedData.pig_id){

        alert(
            "Please enter Pig ID."
        );

        return;
    }

    if(!updatedData.treatment_date){

        alert(
            "Please select treatment date."
        );

        return;
    }

    if(!updatedData.next_administration_date){

        alert(
            "Next administration date was not calculated."
        );

        return;
    }

    try{

        const {data,error} =
            await supabaseClient

            .from("treatment_records")

            .update(updatedData)

            .eq(
                "id",
                editID
            )

            .eq(
                "farm_id",
                farmID
            )

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
            "Treatment record updated successfully."
        );

        editID = null;

        document
            .getElementById(
                "treatmentForm"
            )
            .reset();

        document.getElementById(
            "otherDiseaseGroup"
        ).style.display = "none";

        loadRecords();

    }catch(error){

        console.error(
            "UPDATE ERROR:",
            error
        );

        alert(
            error.message
        );

    }

}


// ==========================================
// DELETE TREATMENT RECORD
// ==========================================

async function deleteTreatment(id){

    if(
        !confirm(
            "Delete this treatment record?"
        )
    ){

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

            .eq(
                "id",
                id
            )

            .eq(
                "farm_id",
                farmID
            );

        if(error) throw error;

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
            "Treatment record deleted successfully."
        );

        loadRecords();

    }catch(error){

        console.error(
            "DELETE ERROR:",
            error
        );

        alert(
            error.message
        );

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

        const {data,error} =
            await supabaseClient

            .from("treatment_records")

            .select("*")

            .eq(
                "farm_id",
                farmID
            );

        if(error) throw error;

        const farmName =
            await getRegisteredFarmName();

        const totalRecords =
            data.length;

        const successful =
            data.filter(
                row =>
                    String(
                        row.remarks || ""
                    )
                    .toLowerCase()
                    .includes(
                        "properly"
                    )
            ).length;

        alert(

            farmName +
            "\n\n" +

            "VACCINATION & TREATMENT REPORT\n\n" +

            "Total Treatment Records: " +
            totalRecords +

            "\nProperly Administered / Positive Remarks: " +
            successful

        );

    }catch(error){

        console.error(
            "REPORT ERROR:",
            error
        );

        alert(
            error.message
        );

    }

}


// ==========================================
// DOWNLOAD PDF REPORT
// ==========================================

async function downloadTreatmentPDF(){

    const farmID =
        getFarmID();

    if(!farmID) return;

    const loggedUser =
        getLoggedUser();

    if(!loggedUser) return;

    if(
        !window.jspdf ||
        !window.jspdf.jsPDF
    ){

        alert(
            "PDF library could not be loaded. Please check your internet connection and try again."
        );

        return;
    }

    try{

        const farmName =
            await getRegisteredFarmName();

        const {data,error} =
            await supabaseClient

            .from("treatment_records")

            .select("*")

            .eq(
                "farm_id",
                farmID
            )

            .order(
                "id",
                {
                    ascending:false
                }
            );

        if(error) throw error;

        if(
            !data ||
            data.length === 0
        ){

            alert(
                "No vaccination or treatment records are available for this farm."
            );

            return;
        }

        const {
            jsPDF
        } =
            window.jspdf;

        const doc =
            new jsPDF({

                orientation:"landscape",

                unit:"mm",

                format:"a4"

            });

        const pageWidth =
            doc.internal.pageSize.getWidth();

        const pageHeight =
            doc.internal.pageSize.getHeight();


        // =====================================
        // PDF FARM HEADER
        // =====================================

        doc.setFontSize(18);

        doc.setFont(
            undefined,
            "bold"
        );

        doc.text(
            farmName,
            pageWidth / 2,
            15,
            {
                align:"center"
            }
        );


        doc.setFontSize(13);

        doc.setFont(
            undefined,
            "normal"
        );

        doc.text(
            "Vaccination & Treatment Report",
            pageWidth / 2,
            23,
            {
                align:"center"
            }
        );


        doc.setFontSize(9);

        doc.text(
            "Farm ID: " +
            farmID,
            14,
            32
        );


        doc.text(
            "Generated By: " +
            (
                loggedUser.full_name ||
                "Unknown User"
            ),
            14,
            38
        );


        doc.text(
            "Generated On: " +
            new Date()
            .toLocaleString(
                "en-ZM"
            ),
            14,
            44
        );


        doc.text(
            "Total Records: " +
            data.length,
            pageWidth - 14,
            32,
            {
                align:"right"
            }
        );


        // =====================================
        // TABLE
        // =====================================

        const tableData =
            data.map(
                row => [

                    row.pig_id || "",

                    row.breed || "",

                    row.sex || "",

                    row.symptom || "",

                    row.medicine || "",

                    row.route || "",

                    row.dosage || "",

                    row.treatment_date || "",

                    row.next_administration_date || "",

                    row.administered_by || "",

                    row.remarks || ""

                ]
            );


        if(
            typeof doc.autoTable ===
            "function"
        ){

            doc.autoTable({

                startY:50,

                head:[[

                    "Pig ID",
                    "Breed",
                    "Sex",
                    "Condition",
                    "Medicine",
                    "Route",
                    "Dosage",
                    "Treatment Date",
                    "Next Date",
                    "Administered By",
                    "Remarks"

                ]],

                body:tableData,

                theme:"grid",

                styles:{

                    fontSize:6,

                    cellPadding:2,

                    overflow:"linebreak",

                    valign:"middle"

                },

                headStyles:{

                    fontSize:6,

                    fontStyle:"bold"

                },

                columnStyles:{

                    0:{
                        cellWidth:17
                    },

                    1:{
                        cellWidth:18
                    },

                    2:{
                        cellWidth:10
                    },

                    3:{
                        cellWidth:25
                    },

                    4:{
                        cellWidth:30
                    },

                    5:{
                        cellWidth:17
                    },

                    6:{
                        cellWidth:15
                    },

                    7:{
                        cellWidth:22
                    },

                    8:{
                        cellWidth:22
                    },

                    9:{
                        cellWidth:25
                    },

                    10:{
                        cellWidth:55
                    }

                },

                margin:{

                    left:8,

                    right:8

                },

                didDrawPage:function(){

                    const pageNumber =
                        doc.internal
                        .getNumberOfPages();

                    doc.setFontSize(7);

                    doc.setFont(
                        undefined,
                        "normal"
                    );

                    doc.text(

                        farmName +
                        " - Vaccination & Treatment",

                        8,

                        pageHeight - 7

                    );

                    doc.text(

                        "Page " +
                        pageNumber,

                        pageWidth - 8,

                        pageHeight - 7,

                        {
                            align:"right"
                        }

                    );

                }

            });

        }else{

            alert(
                "PDF table library could not be loaded."
            );

            return;
        }


        // =====================================
        // SAVE PDF
        // =====================================

        const today =
            new Date()
            .toISOString()
            .split("T")[0];


        const safeFarmName =
            farmName

            .replace(
                /[<>:"/\\|?*]+/g,
                ""
            )

            .replace(
                /\s+/g,
                "-"
            )

            .trim();


        doc.save(

            safeFarmName +
            "-Vaccination-Treatment-" +
            today +
            ".pdf"

        );


    }catch(error){

        console.error(
            "PDF ERROR:",
            error
        );

        alert(
            "Unable to generate PDF: " +
            error.message
        );

    }

}


// ==========================================
// PRINT REPORT
// ==========================================

async function printTreatmentReport(){

    const farmName =
        await getRegisteredFarmName();


    const style =
        document.createElement(
            "style"
        );


    style.id =
        "temporaryVaccinationPrintStyle";


    style.innerHTML = `

        @media print {

            body {
                margin: 0 !important;
                padding: 0 !important;
            }

            .software-brand {
                display: none !important;
            }

            .brand-title {
                display: none !important;
            }

            .brand-subtitle {
                display: none !important;
            }

            .farm-label {
                display: none !important;
            }

            .page-header .header-buttons {
                display: none !important;
            }

            .page-header {
                padding: 0 !important;
                margin: 0 0 15px 0 !important;
                border: none !important;
            }

            .farm-branding {
                margin: 0 !important;
                padding: 0 !important;
                border: none !important;
            }

            .farm-branding strong {
                display: block !important;
                font-size: 30px !important;
                font-weight: 800 !important;
                text-align: center !important;
                letter-spacing: 0.5px !important;
                line-height: 1.2 !important;
                margin: 0 0 12px 0 !important;
            }

            .module-intro {
                margin-top: 0 !important;
            }

            footer {
                display: none !important;
            }

            .buttons,
            .search-area,
            .report-buttons {
                display: none !important;
            }

        }

    `;


    document.head.appendChild(
        style
    );


    window.print();


    const removePrintStyle =
        function(){

            const printStyle =
                document.getElementById(
                    "temporaryVaccinationPrintStyle"
                );

            if(printStyle){

                printStyle.remove();

            }

        };


    window.addEventListener(
        "afterprint",
        removePrintStyle,
        {
            once:true
        }
    );


    setTimeout(
        removePrintStyle,
        3000
    );

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

    document.getElementById(
        "otherDiseaseGroup"
    ).style.display = "none";

    editID = null;

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
// END OF VACCINATION & TREATMENT MODULE
// ==========================================