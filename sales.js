// ==========================================================
// MUNKA PIGGERY FARM
// SALES RECORDS MODULE
// FARM-SECURED + PERMISSION-CONTROLLED VERSION
// ==========================================================
//
// FARM SECURITY:
// Uses loggedInUser.farm_id
//
// PERMISSIONS COME FROM:
// security.js
//
// Uses:
// canView("Sales")
// canAdd("Sales")
// canEdit("Sales")
// canDelete("Sales")
// canReport("Sales")
// ==========================================================


let editID = null;


// ==========================================================
// GET LOGGED-IN USER
// ==========================================================

function getLoggedUser(){

    return JSON.parse(
        localStorage.getItem("loggedInUser")
    );

}


// ==========================================================
// GET CURRENT FARM ID
// ==========================================================

function getFarmID(){

    const loggedUser = getLoggedUser();

    if(!loggedUser){

        console.error(
            "No logged-in user found."
        );

        return null;
    }

    return loggedUser.farm_id;

}


// ==========================================================
// AUTOMATIC TOTAL CALCULATION
// ==========================================================

function calculateTotalAmount(){

    const weight =
        Number(
            document.getElementById("weight").value
        ) || 0;


    const pricePerKg =
        Number(
            document.getElementById("pricePerKg").value
        ) || 0;


    const total =
        weight * pricePerKg;


    document.getElementById("totalAmount").value =
        total.toFixed(2);

}


// ==========================================================
// PAGE LOAD
// ==========================================================

document.addEventListener(
    "DOMContentLoaded",
    function(){

        const weight =
            document.getElementById("weight");


        const pricePerKg =
            document.getElementById("pricePerKg");


        if(weight){

            weight.addEventListener(
                "input",
                calculateTotalAmount
            );

        }


        if(pricePerKg){

            pricePerKg.addEventListener(
                "input",
                calculateTotalAmount
            );

        }

    }
);


// ==========================================================
// SAVE SALES RECORD
// ==========================================================

document
.getElementById("salesForm")
.addEventListener(
    "submit",
    async function(e){

        e.preventDefault();


        // ------------------------------------------
        // ADD PERMISSION
        // ------------------------------------------

        if(
            typeof canAdd === "function" &&
            !canAdd("Sales")
        ){

            alert(
                "Access Denied.\n\n" +
                "You do not have permission to add sales records."
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


        const sale = {

            // --------------------------------------
            // FARM SECURITY
            // --------------------------------------

            farm_id:
                farmID,


            record_id:
                "SALE-" + Date.now(),


            sale_date:
                document.getElementById("saleDate").value,


            pig_id:
                document.getElementById("pigID").value.trim(),


            breed:
                document.getElementById("breed").value,


            category:
                document.getElementById("category").value,


            quantity:
                Number(
                    document.getElementById("quantity").value
                ) || 0,


            weight:
                Number(
                    document.getElementById("weight").value
                ) || 0,


            price_per_kg:
                Number(
                    document.getElementById("pricePerKg").value
                ) || 0,


            total_amount:
                Number(
                    document.getElementById("totalAmount").value
                ) || 0,


            buyer_name:
                document.getElementById("buyerName").value,


            buyer_contact:
                document.getElementById("buyerContact").value,


            payment_method:
                document.getElementById("paymentMethod").value,


            payment_status:
                document.getElementById("paymentStatus").value,


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

            const {
                error
            } =
                await supabaseClient

                    .from("sales_records")

                    .insert([sale]);


            if(error){

                throw error;

            }


            await saveActivity(

                loggedUser.full_name +
                " (" +
                loggedUser.role +
                ")",

                "Added",

                "Sales Records",

                "Added sale record for Pig ID: " +
                sale.pig_id

            );


            alert(
                "Sale record saved successfully."
            );


            document
                .getElementById("salesForm")
                .reset();


            document
                .getElementById("recordID")
                .value = "";


            editID = null;


            loadSalesRecords();

        }

        catch(error){

            console.error(
                "SAVE SALES ERROR:",
                error
            );


            alert(
                error.message
            );

        }

    }
);


// ==========================================================
// LOAD SALES RECORDS
// ==========================================================

async function loadSalesRecords(){

    const farmID =
        getFarmID();


    if(!farmID){

        console.error(
            "Farm ID not found."
        );

        return;

    }


    try{

        const {
            data,
            error
        } =
            await supabaseClient

                .from("sales_records")

                .select("*")

                // ----------------------------------
                // FARM SECURITY
                // ----------------------------------

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


        if(error){

            throw error;

        }


        displaySalesRecords(
            data || []
        );

    }

    catch(error){

        console.error(
            "LOAD SALES ERROR:",
            error
        );


        alert(
            error.message
        );

    }

}


// ==========================================================
// DISPLAY SALES RECORDS
// ==========================================================

function displaySalesRecords(records){

    const table =
        document.getElementById(
            "salesTable"
        );


    if(!table){

        return;

    }


    table.innerHTML = "";


    records.forEach(
        function(sale){

            let actionButtons = "";


            // ------------------------------------------
            // EDIT
            // ------------------------------------------

            if(
                typeof canEdit === "function" &&
                canEdit("Sales")
            ){

                actionButtons += `

                    <button
                        type="button"
                        onclick="editSale(${sale.id})">

                        ✏️ Edit

                    </button>

                `;

            }


            // ------------------------------------------
            // DELETE
            // ------------------------------------------

            if(
                typeof canDelete === "function" &&
                canDelete("Sales")
            ){

                actionButtons += `

                    <button
                        type="button"
                        onclick="deleteSale(${sale.id})">

                        🗑️ Delete

                    </button>

                `;

            }


            // ------------------------------------------
            // IF NO ACTIONS
            // ------------------------------------------

            if(!actionButtons){

                actionButtons =
                    "<span>No actions</span>";

            }


            table.innerHTML += `

                <tr>

                    <td>
                        ${sale.sale_date || ""}
                    </td>

                    <td>
                        ${sale.pig_id || ""}
                    </td>

                    <td>
                        ${sale.breed || ""}
                    </td>

                    <td>
                        ${sale.category || ""}
                    </td>

                    <td>
                        ${sale.quantity || 0}
                    </td>

                    <td>
                        ${sale.weight || 0}
                    </td>

                    <td>
                        ${sale.total_amount || 0}
                    </td>

                    <td>
                        ${sale.buyer_name || ""}
                    </td>

                    <td>
                        ${sale.payment_status || ""}
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
// EDIT SALES RECORD
// ==========================================================

async function editSale(id){

    if(
        typeof canEdit === "function" &&
        !canEdit("Sales")
    ){

        alert(
            "Access Denied.\n\n" +
            "You do not have permission to edit sales records."
        );

        return;

    }


    const farmID =
        getFarmID();


    if(!farmID){

        alert(
            "Farm information not found. Please login again."
        );

        return;

    }


    try{

        const {
            data,
            error
        } =
            await supabaseClient

                .from("sales_records")

                .select("*")

                // ----------------------------------
                // FARM SECURITY
                // ----------------------------------

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


        editID = id;


        document.getElementById("recordID").value =
            data.record_id || "";


        document.getElementById("saleDate").value =
            data.sale_date || "";


        document.getElementById("pigID").value =
            data.pig_id || "";


        document.getElementById("breed").value =
            data.breed || "";


        document.getElementById("category").value =
            data.category || "";


        document.getElementById("quantity").value =
            data.quantity || "";


        document.getElementById("weight").value =
            data.weight || "";


        document.getElementById("pricePerKg").value =
            data.price_per_kg || "";


        document.getElementById("totalAmount").value =
            data.total_amount || "";


        document.getElementById("buyerName").value =
            data.buyer_name || "";


        document.getElementById("buyerContact").value =
            data.buyer_contact || "";


        document.getElementById("paymentMethod").value =
            data.payment_method || "";


        document.getElementById("paymentStatus").value =
            data.payment_status || "";


        document.getElementById("responsiblePerson").value =
            data.responsible_person || "";


        document.getElementById("remarks").value =
            data.remarks || "";

    }

    catch(error){

        console.error(
            "EDIT SALES ERROR:",
            error
        );


        alert(
            error.message
        );

    }

}


// ==========================================================
// UPDATE SALES RECORD
// ==========================================================

async function updateSaleRecord(){

    if(
        typeof canEdit === "function" &&
        !canEdit("Sales")
    ){

        alert(
            "Access Denied.\n\n" +
            "You do not have permission to edit sales records."
        );

        return;

    }


    if(editID === null){

        alert(
            "Please select a record to update."
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


    const updatedSale = {

        sale_date:
            document.getElementById("saleDate").value,


        pig_id:
            document.getElementById("pigID").value,


        breed:
            document.getElementById("breed").value,


        category:
            document.getElementById("category").value,


        quantity:
            Number(
                document.getElementById("quantity").value
            ) || 0,


        weight:
            Number(
                document.getElementById("weight").value
            ) || 0,


        price_per_kg:
            Number(
                document.getElementById("pricePerKg").value
            ) || 0,


        total_amount:
            Number(
                document.getElementById("totalAmount").value
            ) || 0,


        buyer_name:
            document.getElementById("buyerName").value,


        buyer_contact:
            document.getElementById("buyerContact").value,


        payment_method:
            document.getElementById("paymentMethod").value,


        payment_status:
            document.getElementById("paymentStatus").value,


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

        const {
            error
        } =
            await supabaseClient

                .from("sales_records")

                .update(updatedSale)

                // ----------------------------------
                // FARM SECURITY
                // ----------------------------------

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


        await saveActivity(

            loggedUser.full_name +
            " (" +
            loggedUser.role +
            ")",

            "Updated",

            "Sales Records",

            "Updated sale record ID: " +
            editID

        );


        alert(
            "Sale record updated successfully."
        );


        editID = null;


        document
            .getElementById("salesForm")
            .reset();


        document
            .getElementById("recordID")
            .value = "";


        loadSalesRecords();

    }

    catch(error){

        console.error(
            "UPDATE SALES ERROR:",
            error
        );


        alert(
            error.message
        );

    }

}


// ==========================================================
// DELETE SALES RECORD
// ==========================================================

async function deleteSale(id){

    if(
        typeof canDelete === "function" &&
        !canDelete("Sales")
    ){

        alert(
            "Access Denied.\n\n" +
            "You do not have permission to delete sales records."
        );

        return;

    }


    const confirmDelete =
        confirm(
            "Delete this sale record?"
        );


    if(!confirmDelete){

        return;

    }


    const farmID =
        getFarmID();


    if(!farmID){

        alert(
            "Farm information not found. Please login again."
        );

        return;

    }


    try{

        const {
            error
        } =
            await supabaseClient

                .from("sales_records")

                .delete()

                // ----------------------------------
                // FARM SECURITY
                // ----------------------------------

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


        const loggedUser =
            getLoggedUser();


        if(loggedUser){

            await saveActivity(

                loggedUser.full_name +
                " (" +
                loggedUser.role +
                ")",

                "Deleted",

                "Sales Records",

                "Deleted sale record ID: " +
                id

            );

        }


        alert(
            "Sale record deleted successfully."
        );


        loadSalesRecords();

    }

    catch(error){

        console.error(
            "DELETE SALES ERROR:",
            error
        );


        alert(
            error.message
        );

    }

}


// ==========================================================
// SEARCH SALES RECORD
// ==========================================================

async function searchSaleRecord(){

    if(
        typeof canView === "function" &&
        !canView("Sales")
    ){

        alert(
            "Access Denied.\n\n" +
            "You do not have permission to view sales records."
        );

        return;

    }


    const farmID =
        getFarmID();


    if(!farmID){

        alert(
            "Farm information not found. Please login again."
        );

        return;

    }


    const pigID =
        prompt(
            "Enter Pig ID to search"
        );


    if(!pigID){

        return;

    }


    try{

        const {
            data,
            error
        } =
            await supabaseClient

                .from("sales_records")

                .select("*")

                // ----------------------------------
                // FARM SECURITY
                // ----------------------------------

                .eq(
                    "farm_id",
                    farmID
                )

                .eq(
                    "pig_id",
                    pigID
                );


        if(error){

            throw error;

        }


        if(!data || data.length === 0){

            alert(
                "No sales record found."
            );

            return;

        }


        displaySalesRecords(
            data
        );


        // ------------------------------------------
        // Only open the first result for editing if
        // the user has edit permission.
        // ------------------------------------------

        if(
            typeof canEdit === "function" &&
            canEdit("Sales")
        ){

            editSale(
                data[0].id
            );

        }

    }

    catch(error){

        console.error(
            "SEARCH SALES ERROR:",
            error
        );


        alert(
            error.message
        );

    }

}


// ==========================================================
// GENERATE SALES REPORT
// ==========================================================

async function generateSalesReport(){

    if(
        typeof canReport === "function" &&
        !canReport("Sales")
    ){

        alert(
            "Access Denied.\n\n" +
            "You do not have permission to generate sales reports."
        );

        return;

    }


    const farmID =
        getFarmID();


    if(!farmID){

        alert(
            "Farm information not found. Please login again."
        );

        return;

    }


    try{

        const {
            data,
            error
        } =
            await supabaseClient

                .from("sales_records")

                .select("*")

                // ----------------------------------
                // FARM SECURITY
                // ----------------------------------

                .eq(
                    "farm_id",
                    farmID
                );


        if(error){

            throw error;

        }


        if(!data || data.length === 0){

            alert(
                "No sales records available."
            );

            return;

        }


        let totalSales = 0;


        data.forEach(
            function(sale){

                totalSales +=
                    Number(
                        sale.total_amount || 0
                    );

            }
        );


        const report = `

MUNKA PIGGERY FARM

SALES REPORT


Total Records:
${data.length}


Total Sales:
ZMW ${totalSales.toFixed(2)}


Generated Date:
${new Date().toLocaleDateString()}

`;


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


        reportWindow.document.write(`

            <html>

            <head>

                <title>
                    Sales Report
                </title>

            </head>

            <body>

                <h1>
                    MUNKA PIGGERY FARM
                </h1>

                <pre>
${report}
                </pre>

                <button
                    onclick="window.print()">

                    Print

                </button>

            </body>

            </html>

        `);


        reportWindow.document.close();

    }

    catch(error){

        console.error(
            "SALES REPORT ERROR:",
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

function clearSaleForm(){

    const form =
        document.getElementById(
            "salesForm"
        );


    if(form){

        form.reset();

    }


    const recordID =
        document.getElementById(
            "recordID"
        );


    if(recordID){

        recordID.value = "";

    }


    const totalAmount =
        document.getElementById(
            "totalAmount"
        );


    if(totalAmount){

        totalAmount.value = "";

    }


    editID = null;

}


// ==========================================================
// LOAD RECORDS
// ==========================================================

window.addEventListener(
    "load",
    function(){

        loadSalesRecords();

    }
);