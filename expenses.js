// =====================================
// MUNKA PIGGERY FARM
// EXPENSES RECORDS MODULE
// PART 3A
// SETUP + CALCULATION + SAVE
// =====================================


let editID = null;


// =====================================
// AUTOMATIC EXPENSE CALCULATION
// Quantity × Unit Cost
// =====================================


function calculateExpenseTotal(){


    let quantity =
    Number(document.getElementById("quantity").value) || 0;



    let unitCost =
    Number(document.getElementById("unitCost").value) || 0;



    let total =
    quantity * unitCost;



    document.getElementById("totalAmount").value =
    total.toFixed(2);


}






// =====================================
// SAVE EXPENSE RECORD
// =====================================

document
.getElementById("expensesForm")
.addEventListener("submit", async function(e){

    e.preventDefault();


    // =====================================
    // GET LOGGED-IN USER
    // =====================================

    const loggedUser =
        JSON.parse(localStorage.getItem("loggedInUser"));


    if(!loggedUser){

        alert("No logged-in user found. Please login again.");

        return;
    }


    // =====================================
    // PREPARE EXPENSE RECORD
    // =====================================

    const expense = {

        expense_id:
        "EXP-" + Date.now(),

        expense_date:
        document.getElementById("expenseDate").value,

        category:
        document.getElementById("category").value,

        description:
        document.getElementById("description").value,

        quantity:
        Number(
            document.getElementById("quantity").value
        ) || 0,

        unit:
        document.getElementById("unit").value,

        unit_cost:
        Number(
            document.getElementById("unitCost").value
        ) || 0,

        total_amount:
        Number(
            document.getElementById("totalAmount").value
        ) || 0,

        payment_method:
        document.getElementById("paymentMethod").value,

        supplier_name:
        document.getElementById("supplierName").value,

        supplier_contact:
        document.getElementById("supplierContact").value,

        responsible_person:
        document.getElementById("responsiblePerson").value,

        remarks:
        document.getElementById("remarks").value,


        // =====================================
        // CREATION INFORMATION
        // =====================================

        created_by:
        loggedUser.full_name,

        created_at:
        new Date().toISOString(),


        // =====================================
        // NEW RECORD HAS NOT BEEN UPDATED
        // =====================================

        updated_by: null,

        updated_at: null
    };


    // =====================================
    // SAVE TO SUPABASE
    // =====================================

    try{

        const {error} = await supabaseClient

        .from("expenses_records")

        .insert([expense]);


        if(error) throw error;


        // =====================================
        // ACTIVITY LOG
        // =====================================

        await saveActivity(

            loggedUser.full_name +
            " (" +
            loggedUser.role +
            ")",

            "Added",

            "Expenses Records",

            "Added expense record: " +
            expense.description

        );


        alert("Expense record saved successfully");


        document
        .getElementById("expensesForm")
        .reset();


        loadExpensesRecords();


    }catch(error){

        console.error(error);

        alert(error.message);

    }

});
// =====================================
// PART 3B
// LOAD EXPENSES RECORDS
// DISPLAY IN TABLE
// =====================================



async function loadExpensesRecords(){



    try{



        const {data,error} = await supabaseClient

        .from("expenses_records")

        .select("*")

        .order("id",{ascending:false});



        if(error) throw error;



        displayExpensesRecords(data);



    }catch(error){



        console.error(error);


        alert(error.message);



    }



}






// =====================================
// DISPLAY EXPENSE RECORDS
// =====================================


function displayExpensesRecords(records){



    let table =
    document.getElementById("expensesTable");



    table.innerHTML = "";



    records.forEach(function(expense){



        table.innerHTML += `


        <tr>


        <td>${expense.expense_date || ""}</td>


        <td>${expense.category || ""}</td>


        <td>${expense.description || ""}</td>


        <td>${expense.quantity || 0} ${expense.unit || ""}</td>


        <td>ZMW ${expense.total_amount || 0}</td>


        <td>${expense.supplier_name || ""}</td>


        <td>${expense.payment_method || ""}</td>



        <td>


        <button onclick="editExpense(${expense.id})">

        Edit

        </button>



        <button onclick="deleteExpense(${expense.id})">

        Delete

        </button>



        </td>



        </tr>


        `;



    });



}







// =====================================
// LOAD RECORDS WHEN PAGE OPENS
// =====================================


window.addEventListener("load", function(){


    loadExpensesRecords();


});
// =====================================
// PART 3C
// EDIT, UPDATE & DELETE EXPENSE RECORDS
// =====================================



// =====================================
// EDIT EXPENSE RECORD
// =====================================


async function editExpense(id){



    try{



        const {data,error} = await supabaseClient

        .from("expenses_records")

        .select("*")

        .eq("id",id)

        .single();



        if(error) throw error;



        editID = id;



        document.getElementById("expenseID").value =
        data.expense_id || "";



        document.getElementById("expenseDate").value =
        data.expense_date || "";



        document.getElementById("category").value =
        data.category || "";



        document.getElementById("description").value =
        data.description || "";



        document.getElementById("quantity").value =
        data.quantity || "";



        document.getElementById("unit").value =
        data.unit || "";



        document.getElementById("unitCost").value =
        data.unit_cost || "";



        document.getElementById("totalAmount").value =
        data.total_amount || "";



        document.getElementById("paymentMethod").value =
        data.payment_method || "";



        document.getElementById("supplierName").value =
        data.supplier_name || "";



        document.getElementById("supplierContact").value =
        data.supplier_contact || "";



        document.getElementById("responsiblePerson").value =
        data.responsible_person || "";



        document.getElementById("remarks").value =
        data.remarks || "";



    }catch(error){



        console.error(error);


        alert(error.message);



    }


}






// =====================================
// UPDATE EXPENSE RECORD
// =====================================

async function updateExpenseRecord(){


    if(editID === null){

        alert("Please select an expense record first");

        return;

    }


    // =====================================
    // GET LOGGED-IN USER
    // =====================================

    const loggedUser =
        JSON.parse(localStorage.getItem("loggedInUser"));


    if(!loggedUser){

        alert("No logged-in user found. Please login again.");

        return;

    }


    // =====================================
    // PREPARE UPDATED EXPENSE
    // =====================================

    const updatedExpense = {

        expense_date:
        document.getElementById("expenseDate").value,

        category:
        document.getElementById("category").value,

        description:
        document.getElementById("description").value,

        quantity:
        Number(
            document.getElementById("quantity").value
        ) || 0,

        unit:
        document.getElementById("unit").value,

        unit_cost:
        Number(
            document.getElementById("unitCost").value
        ) || 0,

        total_amount:
        Number(
            document.getElementById("totalAmount").value
        ) || 0,

        payment_method:
        document.getElementById("paymentMethod").value,

        supplier_name:
        document.getElementById("supplierName").value,

        supplier_contact:
        document.getElementById("supplierContact").value,

        responsible_person:
        document.getElementById("responsiblePerson").value,

        remarks:
        document.getElementById("remarks").value,


        // =====================================
        // UPDATE AUDIT INFORMATION
        // =====================================

        updated_by:
        loggedUser.full_name,

        updated_at:
        new Date().toISOString()

    };


    // =====================================
    // UPDATE SUPABASE RECORD
    // =====================================

    try{

        const {error} = await supabaseClient

        .from("expenses_records")

        .update(updatedExpense)

        .eq("id", editID);


        if(error) throw error;


        // =====================================
        // ACTIVITY LOG
        // =====================================

        await saveActivity(

            loggedUser.full_name +
            " (" +
            loggedUser.role +
            ")",

            "Updated",

            "Expenses Records",

            "Updated expense record ID: " +
            editID

        );


        alert("Expense record updated successfully");


        editID = null;


        document
        .getElementById("expensesForm")
        .reset();


        loadExpensesRecords();


    }catch(error){

        console.error(error);

        alert(error.message);

    }

}






// =====================================
// DELETE EXPENSE RECORD
// =====================================


async function deleteExpense(id){



    let confirmDelete =
    confirm("Delete this expense record?");



    if(!confirmDelete) return;



    try{



        const {error} = await supabaseClient

        .from("expenses_records")

        .delete()

        .eq("id",id);



        if(error) throw error;


// ===============================
// ACTIVITY LOG - DELETE
// ===============================

let loggedUser = JSON.parse(localStorage.getItem("loggedInUser"));

if(loggedUser){

    await saveActivity(

        loggedUser.full_name + " (" + loggedUser.role + ")",

        "Deleted",

        "Expenses Records",

        "Deleted expense record ID: " + id

    );

}



alert("Expense record deleted successfully");



        loadExpensesRecords();



    }catch(error){



        console.error(error);


        alert(error.message);



    }


}
// =====================================
// PART 3D
// SEARCH, REPORT & SUMMARY CALCULATION
// =====================================



// =====================================
// SEARCH EXPENSE RECORD
// =====================================


async function searchExpenseRecord(){



    let supplier =
    prompt("Enter Supplier / Payee Name");



    if(!supplier) return;



    try{



        const {data,error} = await supabaseClient

        .from("expenses_records")

        .select("*")

        .ilike("supplier_name", "%" + supplier + "%");



        if(error) throw error;



        if(data.length === 0){


            alert("No expense record found");


            return;


        }



        displayExpensesRecords(data);



        editExpense(data[0].id);



    }catch(error){



        console.error(error);


        alert(error.message);



    }



}






// =====================================
// GENERATE EXPENSE REPORT
// =====================================


async function generateExpenseReport(){



    try{



        const {data,error} = await supabaseClient

        .from("expenses_records")

        .select("*");



        if(error) throw error;




        let totalExpense = 0;



        data.forEach(function(expense){



            totalExpense += Number(
                expense.total_amount || 0
            );



        });





        let report = `


MUNKA PIGGERY FARM

EXPENSE REPORT



Total Records:
${data.length}



Total Expenses:

ZMW ${totalExpense.toFixed(2)}



Generated Date:

${new Date().toLocaleDateString()}



`;





        let reportWindow =
        window.open("", "_blank");



        reportWindow.document.write(`



        <html>

        <head>

        <title>Expense Report</title>

        </head>



        <body>



        <h1>MUNKA PIGGERY FARM</h1>



        <pre>

        ${report}

        </pre>



        <button onclick="window.print()">

        Print

        </button>



        </body>


        </html>


        `);



    }catch(error){



        console.error(error);


        alert(error.message);



    }


}






// =====================================
// TOTAL EXPENSE CALCULATOR
// =====================================


async function calculateTotalExpenses(){



    try{



        const {data,error} = await supabaseClient

        .from("expenses_records")

        .select("total_amount");



        if(error) throw error;




        let total = 0;



        data.forEach(function(expense){



            total += Number(
                expense.total_amount || 0
            );



        });



        alert(
        "Total Expenses: ZMW "
        + total.toFixed(2)
        );



    }catch(error){



        console.error(error);


        alert(error.message);



    }



}