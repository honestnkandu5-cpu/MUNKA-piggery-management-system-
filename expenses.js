// =====================================
// MUNKA PIGGERY FARM
// EXPENSES RECORDS MODULE
// FARM-SECURED VERSION
// PROFESSIONAL UPGRADE
// =====================================

let editID = null;


// =====================================
// GET LOGGED-IN USER
// =====================================

function getLoggedUser(){

    return JSON.parse(
        localStorage.getItem("loggedInUser")
    );

}


// =====================================
// GET CURRENT FARM ID
// =====================================

function getFarmID(){

    const loggedUser = getLoggedUser();

    if(!loggedUser || !loggedUser.farm_id){

        console.error("No farm_id found for logged-in user.");

        return null;
    }

    return loggedUser.farm_id;

}


// =====================================
// ESCAPE HTML
// =====================================

function escapeHTML(value){

    if(value === null || value === undefined){

        return "";

    }

    return String(value)

        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");

}


// =====================================
// DESCRIPTION OPTIONS
// DEPEND ON EXPENSE CATEGORY
// =====================================

const descriptionOptions = {

    "Feed": [

        "Piglet Feed",
        "Weaner Feed",
        "Grower Feed",
        "Finisher Feed",
        "Sow Feed",
        "Boar Feed",
        "Maize",
        "Soybean Meal",
        "Premix",
        "Bran",
        "Other Feed"

    ],


    "Medicine": [

        "Dewormer",
        "Antibiotics",
        "Vitamins",
        "Mineral Supplement",
        "Pain Relief Medicine",
        "Treatment Medicine",
        "Disinfectant",
        "Other Medicine"

    ],


    "Vaccination": [

        "Vaccination",
        "Vaccine Dose",
        "Vaccination Service",
        "Cold Chain / Vaccine Transport",
        "Other Vaccination Expense"

    ],


    "Labour": [

        "Farm Worker Wages",
        "Casual Labour",
        "Cleaning Labour",
        "Feeding Labour",
        "Construction Labour",
        "Other Labour"

    ],


    "Transport": [

        "Feed Transportation",
        "Pig Transportation",
        "Medicine Transportation",
        "Vaccine Transportation",
        "Farm Supply Delivery",
        "Fuel / Transport Charge",
        "Other Transport"

    ],


    "Repairs & Maintenance": [

        "Pig Pen Repair",
        "Fence Repair",
        "Roof Repair",
        "Water System Repair",
        "Electrical Repair",
        "Equipment Repair",
        "Plumbing Repair",
        "Other Repair"

    ],


    "Utilities": [

        "Electricity",
        "Water",
        "Internet",
        "Communication",
        "Waste Management",
        "Other Utility"

    ],


    "Equipment": [

        "Feeding Equipment",
        "Watering Equipment",
        "Weighing Equipment",
        "Farm Tools",
        "Protective Equipment",
        "Breeding Equipment",
        "Cleaning Equipment",
        "Other Equipment"

    ],


    "Breeding / Artificial Insemination": [

        "Semen",
        "Artificial Insemination Service",
        "Breeding Service",
        "Breeding Supplies",
        "Hormonal Product",
        "Other Breeding Expense"

    ],


    "Cleaning & Disinfection": [

        "Disinfectant",
        "Detergent",
        "Bleach",
        "Cleaning Equipment",
        "Protective Clothing",
        "Other Cleaning Expense"

    ],


    "Marketing": [

        "Advertising",
        "Printing",
        "Social Media Promotion",
        "Transport for Marketing",
        "Market Levy",
        "Other Marketing Expense"

    ],


    "Other": [

        "General Farm Expense",
        "Administrative Expense",
        "Bank Charges",
        "Other"

    ]

};


// =====================================
// REMARKS / RECOMMENDATIONS
// DEPEND ON EXPENSE CATEGORY
// =====================================

const recommendationOptions = {

    "Feed": [

        "Feed Cost Reasonable - Maintain Current Supplier",
        "Feed Cost High - Compare Suppliers",
        "Consider Bulk Feed Purchasing",
        "Monitor Feed Prices",
        "Review Feed Consumption",
        "Reduce Feed Wastage",
        "Maintain Current Feeding Programme",
        "Review Feed Formulation"

    ],


    "Medicine": [

        "Medicine Cost Reasonable - Maintain Supplier",
        "Medicine Cost High - Compare Suppliers",
        "Maintain Adequate Medicine Stock",
        "Review Preventive Health Programme",
        "Use Medicine According to Veterinary Advice",
        "Monitor Medicine Consumption",
        "Consider Bulk Purchasing Where Appropriate"

    ],


    "Vaccination": [

        "Vaccination Cost Reasonable",
        "Maintain Regular Vaccination Programme",
        "Review Vaccination Schedule",
        "Maintain Adequate Vaccine Stock",
        "Plan Vaccination in Advance",
        "Monitor Vaccination Costs"

    ],


    "Labour": [

        "Labour Cost Reasonable",
        "Labour Cost High - Review Labour Planning",
        "Improve Worker Productivity",
        "Review Staff Allocation",
        "Maintain Efficient Labour Scheduling",
        "Monitor Labour Costs"

    ],


    "Transport": [

        "Transport Cost Reasonable",
        "Transport Cost High - Compare Providers",
        "Combine Deliveries Where Possible",
        "Plan Transport in Advance",
        "Consider Bulk Transportation",
        "Monitor Transport Costs"

    ],


    "Repairs & Maintenance": [

        "Repair Cost Reasonable",
        "Repair Cost High - Compare Service Providers",
        "Schedule Preventive Maintenance",
        "Inspect Equipment Regularly",
        "Prioritise Critical Repairs",
        "Monitor Maintenance Costs"

    ],


    "Utilities": [

        "Utility Cost Reasonable",
        "Utility Cost High - Review Consumption",
        "Monitor Electricity Usage",
        "Monitor Water Usage",
        "Reduce Unnecessary Utility Consumption",
        "Review Monthly Utility Costs"

    ],


    "Equipment": [

        "Equipment Cost Reasonable",
        "Compare Equipment Prices Before Purchase",
        "Prioritise Essential Equipment",
        "Maintain Equipment Properly",
        "Consider Durable Equipment",
        "Monitor Equipment Costs"

    ],


    "Breeding / Artificial Insemination": [

        "Breeding Cost Reasonable",
        "Maintain Accurate Breeding Records",
        "Plan Breeding Services in Advance",
        "Compare Breeding Service Costs",
        "Monitor Breeding Programme Costs",
        "Maintain Good Breeding Management"

    ],


    "Cleaning & Disinfection": [

        "Cleaning Cost Reasonable",
        "Maintain Regular Cleaning Programme",
        "Maintain Proper Disinfection",
        "Compare Cleaning Supply Prices",
        "Monitor Cleaning Supply Consumption",
        "Avoid Unnecessary Wastage"

    ],


    "Marketing": [

        "Marketing Cost Reasonable",
        "Monitor Marketing Results",
        "Use Cost-Effective Marketing Channels",
        "Review Marketing Expenses",
        "Increase Market Search",
        "Maintain Effective Marketing Activities"

    ],


    "Other": [

        "Expense Reasonable - Maintain Current Practice",
        "Expense High - Review Cost",
        "Compare Prices Before Purchase",
        "Seek Alternative Suppliers",
        "Improve Expense Planning",
        "Monitor Farm Operating Costs",
        "Consider Cost Reduction Measures"

    ]

};


// =====================================
// LOAD DESCRIPTION OPTIONS
// =====================================

function loadDescriptionOptions(selectedValue = ""){

    const category =
        document.getElementById("category").value;

    const description =
        document.getElementById("description");


    description.innerHTML = "";

    const firstOption =
        document.createElement("option");

    firstOption.value = "";

    firstOption.textContent =
        category
            ? "Select Description"
            : "Select Expense Category First";

    description.appendChild(firstOption);


    if(!category){

        return;
    }


    const options =
        descriptionOptions[category] || [];


    options.forEach(function(item){

        const option =
            document.createElement("option");

        option.value = item;

        option.textContent = item;

        if(item === selectedValue){

            option.selected = true;

        }

        description.appendChild(option);

    });

}


// =====================================
// LOAD REMARKS OPTIONS
// =====================================

function loadRecommendationOptions(selectedValue = ""){

    const category =
        document.getElementById("category").value;

    const remarks =
        document.getElementById("remarks");


    remarks.innerHTML = "";


    const firstOption =
        document.createElement("option");

    firstOption.value = "";

    firstOption.textContent =
        category
            ? "Select Recommendation"
            : "Select Expense Category First";

    remarks.appendChild(firstOption);


    if(!category){

        return;
    }


    const options =
        recommendationOptions[category] || [];


    options.forEach(function(item){

        const option =
            document.createElement("option");

        option.value = item;

        option.textContent = item;

        if(item === selectedValue){

            option.selected = true;

        }

        remarks.appendChild(option);

    });

}


// =====================================
// CATEGORY CHANGE
// =====================================

document
.getElementById("category")
.addEventListener("change", function(){

    loadDescriptionOptions();

    loadRecommendationOptions();

});


// =====================================
// AUTOMATIC EXPENSE CALCULATION
// Quantity × Unit Cost
// =====================================

function calculateExpenseTotal(){

    const quantity =
        Number(
            document.getElementById("quantity").value
        ) || 0;


    const unitCost =
        Number(
            document.getElementById("unitCost").value
        ) || 0;


    const total =
        quantity * unitCost;


    document.getElementById("totalAmount").value =
        total.toFixed(2);

}


document
.getElementById("quantity")
.addEventListener(
    "change",
    calculateExpenseTotal
);


document
.getElementById("unitCost")
.addEventListener(
    "change",
    calculateExpenseTotal
);


// =====================================
// SAVE EXPENSE RECORD
// =====================================

document
.getElementById("expensesForm")
.addEventListener("submit", async function(e){

    e.preventDefault();


    const loggedUser =
        getLoggedUser();


    if(!loggedUser){

        alert(
            "No logged-in user found. Please login again."
        );

        return;

    }


    const farmID =
        getFarmID();


    if(!farmID){

        alert(
            "Your account is not linked to a farm. Please contact the administrator."
        );

        return;

    }


    const totalAmount =
        Number(
            document.getElementById("totalAmount").value
        ) || 0;


    if(totalAmount <= 0){

        alert(
            "Please select a valid quantity and unit cost."
        );

        return;

    }


    const expense = {

        farm_id:
            farmID,


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
            totalAmount,


        payment_method:
            document.getElementById("paymentMethod").value,


        supplier_name:
            document.getElementById("supplierName").value.trim(),


        supplier_contact:
            document.getElementById("supplierContact").value.trim(),


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


    try{

        const {error} =
            await supabaseClient

                .from("expenses_records")

                .insert([expense]);


        if(error) throw error;


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


        alert(
            "Expense record saved successfully."
        );


        clearExpenseForm();

        loadExpensesRecords();


    }catch(error){

        console.error(error);

        alert(error.message);

    }

});


// =====================================
// LOAD EXPENSE RECORDS
// =====================================

async function loadExpensesRecords(){

    const farmID =
        getFarmID();


    if(!farmID){

        console.error(
            "Cannot load expenses: farm_id missing."
        );

        return;

    }


    try{

        const {data,error} =
            await supabaseClient

                .from("expenses_records")

                .select("*")

                .eq("farm_id", farmID)

                .order(
                    "id",
                    {ascending:false}
                );


        if(error) throw error;


        displayExpensesRecords(
            data || []
        );


    }catch(error){

        console.error(error);

        alert(error.message);

    }

}


// =====================================
// DISPLAY EXPENSE RECORDS
// =====================================

function displayExpensesRecords(records){

    const table =
        document.getElementById("expensesTable");


    const recordCount =
        document.getElementById("recordCount");


    table.innerHTML = "";


    if(!records.length){

        table.innerHTML = `

            <tr>

                <td colspan="9" class="no-records">
                    No expense records found.
                </td>

            </tr>

        `;

        recordCount.textContent =
            "0 Records";

        return;

    }


    recordCount.textContent =
        records.length +
        (records.length === 1
            ? " Record"
            : " Records");


    records.forEach(function(expense){

        table.innerHTML += `

        <tr>

            <td>
                ${escapeHTML(expense.expense_date || "")}
            </td>

            <td>
                ${escapeHTML(expense.category || "")}
            </td>

            <td>
                ${escapeHTML(expense.description || "")}
            </td>

            <td>
                ${escapeHTML(expense.quantity || 0)}
                ${escapeHTML(expense.unit || "")}
            </td>

            <td>
                ZMW ${Number(
                    expense.unit_cost || 0
                ).toFixed(2)}
            </td>

            <td class="amount-cell">
                ZMW ${Number(
                    expense.total_amount || 0
                ).toFixed(2)}
            </td>

            <td>
                ${escapeHTML(
                    expense.supplier_name || ""
                )}
            </td>

            <td>
                ${escapeHTML(
                    expense.payment_method || ""
                )}
            </td>

            <td class="action-cell">

                <button
                    class="edit-btn"
                    onclick="editExpense(${expense.id})">

                    Edit

                </button>


                <button
                    class="delete-btn"
                    onclick="deleteExpense(${expense.id})">

                    Delete

                </button>

            </td>

        </tr>

        `;

    });

}


// =====================================
// LOAD PAGE
// =====================================

window.addEventListener(
    "load",
    function(){

        const dateField =
            document.getElementById("expenseDate");


        if(dateField && !dateField.value){

            dateField.value =
                new Date()
                .toISOString()
                .split("T")[0];

        }


        loadExpensesRecords();

    }
);


// =====================================
// EDIT EXPENSE
// =====================================

async function editExpense(id){

    const farmID =
        getFarmID();


    if(!farmID){

        alert(
            "Your account is not linked to a farm."
        );

        return;

    }


    try{

        const {data,error} =
            await supabaseClient

                .from("expenses_records")

                .select("*")

                .eq("id", id)

                .eq("farm_id", farmID)

                .single();


        if(error) throw error;


        editID = id;


        document.getElementById("expenseID").value =
            data.expense_id || "";


        document.getElementById("expenseDate").value =
            data.expense_date || "";


        document.getElementById("category").value =
            data.category || "";


        loadDescriptionOptions(
            data.description || ""
        );


        loadRecommendationOptions(
            data.remarks || ""
        );


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


        window.scrollTo({
            top: 0,
            behavior: "smooth"
        });


    }catch(error){

        console.error(error);

        alert(error.message);

    }

}


// =====================================
// UPDATE EXPENSE
// =====================================

async function updateExpenseRecord(){

    if(editID === null){

        alert(
            "Please select an expense record first."
        );

        return;

    }


    const loggedUser =
        getLoggedUser();


    if(!loggedUser){

        alert(
            "No logged-in user found. Please login again."
        );

        return;

    }


    const farmID =
        getFarmID();


    if(!farmID){

        alert(
            "Your account is not linked to a farm."
        );

        return;

    }


    calculateExpenseTotal();


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
            document.getElementById("supplierName").value.trim(),


        supplier_contact:
            document.getElementById("supplierContact").value.trim(),


        responsible_person:
            document.getElementById("responsiblePerson").value,


        remarks:
            document.getElementById("remarks").value,


        updated_by:
            loggedUser.full_name,


        updated_at:
            new Date().toISOString()

    };


    try{

        const {error} =
            await supabaseClient

                .from("expenses_records")

                .update(updatedExpense)

                .eq("id", editID)

                .eq("farm_id", farmID);


        if(error) throw error;


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


        alert(
            "Expense record updated successfully."
        );


        editID = null;


        clearExpenseForm();

        loadExpensesRecords();


    }catch(error){

        console.error(error);

        alert(error.message);

    }

}


// =====================================
// DELETE EXPENSE
// =====================================

async function deleteExpense(id){

    const confirmDelete =
        confirm(
            "Delete this expense record?"
        );


    if(!confirmDelete) return;


    const farmID =
        getFarmID();


    if(!farmID){

        alert(
            "Your account is not linked to a farm."
        );

        return;

    }


    try{

        const {error} =
            await supabaseClient

                .from("expenses_records")

                .delete()

                .eq("id", id)

                .eq("farm_id", farmID);


        if(error) throw error;


        const loggedUser =
            getLoggedUser();


        if(loggedUser){

            await saveActivity(

                loggedUser.full_name +
                " (" +
                loggedUser.role +
                ")",

                "Deleted",

                "Expenses Records",

                "Deleted expense record ID: " +
                id

            );

        }


        alert(
            "Expense record deleted successfully."
        );


        loadExpensesRecords();


    }catch(error){

        console.error(error);

        alert(error.message);

    }

}


// =====================================
// SEARCH EXPENSE
// =====================================

async function searchExpenseRecord(){

    const supplier =
        prompt(
            "Enter Supplier / Payee Name"
        );


    if(!supplier) return;


    const farmID =
        getFarmID();


    if(!farmID){

        alert(
            "Your account is not linked to a farm."
        );

        return;

    }


    try{

        const {data,error} =
            await supabaseClient

                .from("expenses_records")

                .select("*")

                .eq("farm_id", farmID)

                .ilike(
                    "supplier_name",
                    "%" + supplier + "%"
                );


        if(error) throw error;


        if(!data || data.length === 0){

            alert(
                "No expense record found."
            );

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
// GENERATE PRINT REPORT
// =====================================

async function generateExpenseReport(){

    const farmID =
        getFarmID();


    if(!farmID){

        alert(
            "Your account is not linked to a farm."
        );

        return;

    }


    try{

        const {data,error} =
            await supabaseClient

                .from("expenses_records")

                .select("*")

                .eq("farm_id", farmID)

                .order(
                    "id",
                    {ascending:false}
                );


        if(error) throw error;


        const records =
            data || [];


        let totalExpense = 0;


        records.forEach(function(expense){

            totalExpense +=
                Number(
                    expense.total_amount || 0
                );

        });


        const reportWindow =
            window.open(
                "",
                "_blank"
            );


        if(!reportWindow){

            alert(
                "Please allow pop-ups to generate the report."
            );

            return;

        }


        let rows = "";


        records.forEach(function(expense){

            rows += `

            <tr>

                <td>${escapeHTML(
                    expense.expense_date || ""
                )}</td>

                <td>${escapeHTML(
                    expense.category || ""
                )}</td>

                <td>${escapeHTML(
                    expense.description || ""
                )}</td>

                <td>${escapeHTML(
                    expense.quantity || 0
                )} ${escapeHTML(
                    expense.unit || ""
                )}</td>

                <td>
                    ZMW ${Number(
                        expense.unit_cost || 0
                    ).toFixed(2)}
                </td>

                <td>
                    ZMW ${Number(
                        expense.total_amount || 0
                    ).toFixed(2)}
                </td>

                <td>${escapeHTML(
                    expense.supplier_name || ""
                )}</td>

            </tr>

            `;

        });


        reportWindow.document.write(`

        <!DOCTYPE html>

        <html>

        <head>

            <title>
                MUNKA PIGGERY Farm Expense Report
            </title>

            <style>

                body{
                    font-family:Arial,sans-serif;
                    padding:30px;
                }

                h1{
                    text-align:center;
                    color:#1b5e20;
                }

                h2{
                    text-align:center;
                }

                table{
                    width:100%;
                    border-collapse:collapse;
                    margin-top:25px;
                }

                th{
                    background:#2e7d32;
                    color:white;
                    padding:8px;
                }

                td{
                    border:1px solid #ccc;
                    padding:8px;
                    text-align:center;
                }

                .summary{
                    margin-top:20px;
                    font-size:18px;
                    font-weight:bold;
                }

                .print-btn{
                    margin-top:20px;
                    padding:10px 20px;
                    background:#2e7d32;
                    color:white;
                    border:none;
                    cursor:pointer;
                }

                @media print{

                    .print-btn{
                        display:none;
                    }

                }

            </style>

        </head>

        <body>

            <h1>MUNKA PIGGERY FARM</h1>

            <h2>EXPENSE REPORT</h2>

            <p>
                Generated Date:
                ${new Date().toLocaleDateString()}
            </p>

            <p>
                Total Records:
                ${records.length}
            </p>

            <div class="summary">

                Total Expenses:
                ZMW ${totalExpense.toFixed(2)}

            </div>

            <table>

                <thead>

                    <tr>

                        <th>Date</th>
                        <th>Category</th>
                        <th>Description</th>
                        <th>Quantity</th>
                        <th>Unit Cost</th>
                        <th>Total</th>
                        <th>Supplier / Payee</th>

                    </tr>

                </thead>

                <tbody>

                    ${rows}

                </tbody>

            </table>

            <button
                class="print-btn"
                onclick="window.print()">

                Print Report

            </button>

        </body>

        </html>

        `);


        reportWindow.document.close();


    }catch(error){

        console.error(error);

        alert(error.message);

    }

}


// =====================================
// DOWNLOAD PDF
// =====================================

async function downloadExpensesPDF(){

    const farmID =
        getFarmID();


    if(!farmID){

        alert(
            "Your account is not linked to a farm."
        );

        return;

    }


    try{

        const {data,error} =
            await supabaseClient

                .from("expenses_records")

                .select("*")

                .eq("farm_id", farmID)

                .order(
                    "id",
                    {ascending:false}
                );


        if(error) throw error;


        const records =
            data || [];


        if(records.length === 0){

            alert(
                "There are no expense records to download."
            );

            return;

        }


        const {
            jsPDF
        } = window.jspdf;


        const doc =
            new jsPDF({
                orientation:"landscape",
                unit:"mm",
                format:"a4"
            });


        const loggedUser =
            getLoggedUser();


        let totalExpense = 0;
        let totalQuantity = 0;


        records.forEach(function(expense){

            totalExpense +=
                Number(
                    expense.total_amount || 0
                );


            totalQuantity +=
                Number(
                    expense.quantity || 0
                );

        });


        // HEADER

        doc.setFontSize(18);

        doc.setFont(undefined, "bold");

        doc.text(
            "MUNKA PIGGERY FARM",
            148,
            15,
            {align:"center"}
        );


        doc.setFontSize(13);

        doc.text(
            "EXPENSE RECORDS REPORT",
            148,
            23,
            {align:"center"}
        );


        doc.setFontSize(9);

        doc.setFont(undefined, "normal");


        doc.text(
            "Farm ID: " + farmID,
            14,
            32
        );


        doc.text(
            "Generated By: " +
            (loggedUser?.full_name || ""),
            14,
            38
        );


        doc.text(
            "Generated: " +
            new Date().toLocaleString(),
            200,
            32
        );


        doc.text(
            "Total Records: " +
            records.length,
            200,
            38
        );


        // SUMMARY

        doc.setFontSize(10);

        doc.text(
            "Total Quantity: " +
            totalQuantity,
            14,
            48
        );


        doc.text(
            "TOTAL EXPENSES: ZMW " +
            totalExpense.toFixed(2),
            200,
            48
        );


        // TABLE

        const rows =
            records.map(function(expense){

                return [

                    expense.expense_date || "",

                    expense.category || "",

                    expense.description || "",

                    `${expense.quantity || 0} ${expense.unit || ""}`,

                    "ZMW " +
                    Number(
                        expense.unit_cost || 0
                    ).toFixed(2),

                    "ZMW " +
                    Number(
                        expense.total_amount || 0
                    ).toFixed(2),

                    expense.supplier_name || "",

                    expense.payment_method || ""

                ];

            });


        doc.autoTable({

            startY:55,

            head:[[
                "Date",
                "Category",
                "Description",
                "Quantity",
                "Unit Cost",
                "Total",
                "Supplier / Payee",
                "Payment"
            ]],

            body:rows,

            theme:"grid",

            styles:{
                fontSize:7,
                cellPadding:2
            },

            headStyles:{
                fontStyle:"bold"
            },

            columnStyles:{
                0:{cellWidth:23},
                1:{cellWidth:30},
                2:{cellWidth:45},
                3:{cellWidth:25},
                4:{cellWidth:27},
                5:{cellWidth:28},
                6:{cellWidth:45},
                7:{cellWidth:27}
            },

            foot:[[
                "",
                "",
                "",
                "",
                "TOTAL",
                "ZMW " +
                totalExpense.toFixed(2),
                "",
                ""
            ]],

            didDrawPage:function(){

                const pageNumber =
                    doc.internal.getNumberOfPages();


                doc.setFontSize(8);

                doc.text(

                    "MUNKA PIGGERY FARM - Expense Report | Page " +
                    pageNumber,

                    148,

                    202,

                    {align:"center"}

                );

            }

        });


        const today =
            new Date()
            .toISOString()
            .split("T")[0];


        doc.save(
            "MUNKA_PIGGERY_Expense_Report_" +
            today +
            ".pdf"
        );


    }catch(error){

        console.error(error);

        alert(
            "Unable to generate PDF: " +
            error.message
        );

    }

}


// =====================================
// CLEAR FORM
// =====================================

function clearExpenseForm(){

    editID = null;


    document
        .getElementById("expensesForm")
        .reset();


    document.getElementById(
        "expenseID"
    ).value = "";


    document.getElementById(
        "description"
    ).innerHTML = `

        <option value="">
            Select Expense Category First
        </option>

    `;


    document.getElementById(
        "remarks"
    ).innerHTML = `

        <option value="">
            Select Expense Category First
        </option>

    `;


    document.getElementById(
        "totalAmount"
    ).value = "";


    const dateField =
        document.getElementById("expenseDate");


    if(dateField){

        dateField.value =
            new Date()
            .toISOString()
            .split("T")[0];

    }

}


// =====================================
// TOTAL EXPENSES
// =====================================

async function calculateTotalExpenses(){

    const farmID =
        getFarmID();


    if(!farmID){

        alert(
            "Your account is not linked to a farm."
        );

        return;

    }


    try{

        const {data,error} =
            await supabaseClient

                .from("expenses_records")

                .select("total_amount")

                .eq("farm_id", farmID);


        if(error) throw error;


        let total = 0;


        (data || []).forEach(function(expense){

            total +=
                Number(
                    expense.total_amount || 0
                );

        });


        alert(
            "Total Expenses: ZMW " +
            total.toFixed(2)
        );


    }catch(error){

        console.error(error);

        alert(error.message);

    }

}