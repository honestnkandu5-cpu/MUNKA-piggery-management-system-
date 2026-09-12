// =====================================
// MUNKA PIGGERY
// FARROWING RECORDS - SUPABASE
// PART 1
// =====================================

let farrowingRecords = [];
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
// LOAD ALL RECORDS
// =====================================

async function loadRecords() {

    try {

        const { data, error } = await supabaseClient
            .from("farrowing_records")
            .select("*")
            .order("id", { ascending: true });

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

document.getElementById("farrowDate").addEventListener("change", function () {

    let farrowDate = new Date(this.value);

    if (isNaN(farrowDate)) return;

    function addDays(days) {

        let date = new Date(farrowDate);

        date.setDate(date.getDate() + days);

        return date.toISOString().split("T")[0];

    }

    document.getElementById("teethDate").value = addDays(3);
    document.getElementById("tailDate").value = addDays(3);
    document.getElementById("ironDate").value = addDays(3);
    document.getElementById("weaningDate").value = addDays(33);

});

// =====================================
// TOTAL BORN CALCULATION
// =====================================

function calculateTotalBorn() {

    let bornAlive = Number(document.getElementById("bornAlive").value) || 0;

    let stillborn = Number(document.getElementById("stillborn").value) || 0;

    let mummified = Number(document.getElementById("mummified").value) || 0;

    document.getElementById("totalBorn").value =
        bornAlive + stillborn + mummified;

}

document.getElementById("bornAlive").addEventListener("input", calculateTotalBorn);
document.getElementById("stillborn").addEventListener("input", calculateTotalBorn);
document.getElementById("mummified").addEventListener("input", calculateTotalBorn);

// =====================================
// SAVE / UPDATE RECORD
// =====================================

document.getElementById("farrowingForm").addEventListener("submit", async function (e) {

    e.preventDefault();

let loggedUser = getLoggedUser();

if(!loggedUser) return;

let record = {

        sow_id: document.getElementById("sowID").value.trim(),

        breed: document.getElementById("breed").value,

        farrow_date: document.getElementById("farrowDate").value,

        teeth_date: document.getElementById("teethDate").value,

        tail_date: document.getElementById("tailDate").value,

        iron_date: document.getElementById("ironDate").value,

        weaning_date: document.getElementById("weaningDate").value,

        born_alive: Number(document.getElementById("bornAlive").value) || 0,

        stillborn: Number(document.getElementById("stillborn").value) || 0,

        mummified: Number(document.getElementById("mummified").value) || 0,

        total_born: Number(document.getElementById("totalBorn").value) || 0,

        male_piglets: Number(document.getElementById("malePiglets").value) || 0,

        female_piglets: Number(document.getElementById("femalePiglets").value) || 0,

        total_weaned: Number(document.getElementById("totalWeaned").value) || 0,

        birth_weight: Number(document.getElementById("birthWeight").value) || 0,

        mortality: Number(document.getElementById("mortality").value) || 0,

        mortality_reason: document.getElementById("mortalityReason").value,

        sow_condition: document.getElementById("sowCondition").value,

        notes: document.getElementById("notes").value.trim(),

created_by: loggedUser.full_name,

updated_by: null,

updated_at: null

    };

    try {

        if (editID === null) {

    const { error } = await supabaseClient
        .from("farrowing_records")
        .insert([record]);

    if (error) throw error;

    await saveActivity(
        loggedUser.full_name + " (" + loggedUser.role + ")",
        "Added",
        "Farrowing Records",
        "Saved farrowing record for Sow ID: " + record.sow_id
    );

    alert("Farrowing record saved successfully.");

        } else {

    record.updated_by = loggedUser.full_name;

    record.updated_at = new Date().toISOString();

    const { error } = await supabaseClient
        .from("farrowing_records")
        .update(record)
        .eq("id", editID);

if (error) throw error;


// ===============================
// ACTIVITY LOG - UPDATE
// ===============================
            

if(loggedUser){

    await saveActivity(

        loggedUser.full_name + " (" + loggedUser.role + ")",

        "Updated",

        "Farrowing Records",

        "Updated farrowing record for Sow ID: " + record.sow_id

    );

}


alert("Farrowing record updated successfully.");

            editID = null;

        }

        document.getElementById("farrowingForm").reset();

        loadRecords();

    } catch (error) {

        console.error(error);

        alert(error.message);

    }

});
// =====================================
// DISPLAY RECORDS
// =====================================

function displayRecords(records = farrowingRecords) {

    const table = document.getElementById("farrowingTable");

    table.innerHTML = "";

    records.forEach(function (record) {

        table.innerHTML += `

        <tr>

            <td>${record.sow_id}</td>

            <td>${record.breed}</td>

            <td>${record.farrow_date}</td>

            <td>${record.total_born}</td>

            <td>${record.weaning_date}</td>

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
// DELETE RECORD
// =====================================

async function deleteRecord(id) {

    if (!confirm("Delete this farrowing record?")) return;

    try {

        const { error } = await supabaseClient
            .from("farrowing_records")
            .delete()
            .eq("id", id);

        if (error) throw error;

        // ===============================
// ACTIVITY LOG - DELETE
// ===============================

let loggedUser = getLoggedUser();

if(loggedUser){

    await saveActivity(

        loggedUser.full_name + " (" + loggedUser.role + ")",

        "Deleted",

        "Farrowing Records",

        "Deleted farrowing record ID: " + id

    );

}

        alert("Record deleted successfully.");

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

    try {

        const { data, error } = await supabaseClient
            .from("farrowing_records")
            .select("*")
            .eq("id", id)
            .single();

        if (error) throw error;

        document.getElementById("sowID").value = data.sow_id;
        document.getElementById("breed").value = data.breed;
        document.getElementById("farrowDate").value = data.farrow_date;

        document.getElementById("teethDate").value = data.teeth_date;
        document.getElementById("tailDate").value = data.tail_date;
        document.getElementById("ironDate").value = data.iron_date;
        document.getElementById("weaningDate").value = data.weaning_date;

        document.getElementById("bornAlive").value = data.born_alive;
        document.getElementById("stillborn").value = data.stillborn;
        document.getElementById("mummified").value = data.mummified;
        document.getElementById("totalBorn").value = data.total_born;

        document.getElementById("malePiglets").value = data.male_piglets;
        document.getElementById("femalePiglets").value = data.female_piglets;
        document.getElementById("totalWeaned").value = data.total_weaned;

        document.getElementById("birthWeight").value = data.birth_weight;

        document.getElementById("mortality").value = data.mortality;
        document.getElementById("mortalityReason").value = data.mortality_reason;

        document.getElementById("sowCondition").value = data.sow_condition;

        document.getElementById("notes").value = data.notes;

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

    const keyword = document.getElementById("searchFarrowing").value.trim();

    try {

        const { data, error } = await supabaseClient
            .from("farrowing_records")
            .select("*")
            .ilike("sow_id", `%${keyword}%`)
            .order("id");

        if (error) throw error;

        displayRecords(data);

    } catch (error) {

        console.error(error);

        alert(error.message);

    }

}

document.getElementById("searchFarrowing").addEventListener("keyup", searchRecord);
// =====================================
// GENERATE REPORT
// =====================================

async function generateReport(){

    try{

        const { count, error } = await supabaseClient
            .from("farrowing_records")
            .select("*", { count: "exact", head: true });

        if(error) throw error;

        alert(
            "FARROWING REPORT\n\n" +
            "Total Farrowing Records: " + count
        );

    }catch(error){

        console.error(error);

        alert(error.message);

    }

}

// =====================================
// PRINT REPORT
// =====================================

function printReport(){

    window.print();

}

// =====================================
// CLEAR FORM
// =====================================

function clearForm(){

    document.getElementById("farrowingForm").reset();

    editID = null;

}

// =====================================
// SEARCH WHILE TYPING
// =====================================

const searchBox = document.getElementById("searchFarrowing");

if(searchBox){

    searchBox.addEventListener("keyup", searchRecord);

}

// =====================================
// LOAD RECORDS WHEN PAGE OPENS
// =====================================

document.addEventListener("DOMContentLoaded", function(){

    loadRecords();

});

// =====================================
// END OF FARROWING MODULE
// =====================================