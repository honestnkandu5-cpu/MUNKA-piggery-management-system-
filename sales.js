// ==========================================================
// MUNKA PIGGERY TECHNOLOGY
// SALES RECORDS MODULE
// PROFESSIONAL VERSION
// FARM-SECURED + PERMISSION-CONTROLLED
// DYNAMIC FARM BRANDING
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
// GET FARM ID
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
// GET REGISTERED FARM NAME
// ==========================================================

async function getRegisteredFarmName(){

    try{

        if(
            typeof supabaseClient === "undefined"
        ){

            return "Registered Farm";

        }


        const {
            data: sessionData,
            error: sessionError
        } =
            await supabaseClient.auth.getSession();


        if(sessionError){

            throw sessionError;

        }


        const session =
            sessionData.session;


        if(
            !session ||
            !session.user
        ){

            return "Registered Farm";

        }


        const {
            data: userProfile,
            error: userError
        } =
            await supabaseClient

                .from("users")

                .select("farm_id")

                .eq(
                    "auth_user_id",
                    session.user.id
                )

                .maybeSingle();


        if(userError){

            throw userError;

        }


        if(
            !userProfile ||
            !userProfile.farm_id
        ){

            return "Registered Farm";

        }


        const {
            data: farm,
            error: farmError
        } =
            await supabaseClient

                .from("farms")

                .select("farm_name")

                .eq(
                    "id",
                    userProfile.farm_id
                )

                .maybeSingle();


        if(farmError){

            throw farmError;

        }


        if(
            !farm ||
            !farm.farm_name
        ){

            return "Registered Farm";

        }


        return farm.farm_name;

    }

    catch(error){

        console.error(
            "GET FARM NAME ERROR:",
            error
        );

        return "Registered Farm";

    }

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


    /*
       Total Amount =
       Weight × Price Per Kg
    */

    const total =
        weight * pricePerKg;


    document.getElementById(
        "totalAmount"
    ).value = total.toFixed(2);

}


// ==========================================================
// PAGE INITIALIZATION
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
                "change",
                calculateTotalAmount
            );

        }


        if(pricePerKg){

            pricePerKg.addEventListener(
                "change",
                calculateTotalAmount
            );

        }


        const saleDate =
            document.getElementById("saleDate");


        if(
            saleDate &&
            !saleDate.value
        ){

            const today =
                new Date();


            const year =
                today.getFullYear();


            const month =
                String(
                    today.getMonth() + 1
                ).padStart(2, "0");


            const day =
                String(
                    today.getDate()
                ).padStart(2, "0");


            saleDate.value =
                `${year}-${month}-${day}`;

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


        calculateTotalAmount();


        const sale = {

            farm_id:
                farmID,


            record_id:
                "SALE-" + Date.now(),


            sale_date:
                document.getElementById(
                    "saleDate"
                ).value,


            pig_id:
                document.getElementById(
                    "pigID"
                ).value.trim(),


            breed:
                document.getElementById(
                    "breed"
                ).value,


            category:
                document.getElementById(
                    "category"
                ).value,


            quantity:
                Number(
                    document.getElementById(
                        "quantity"
                    ).value
                ) || 0,


            weight:
                Number(
                    document.getElementById(
                        "weight"
                    ).value
                ) || 0,


            price_per_kg:
                Number(
                    document.getElementById(
                        "pricePerKg"
                    ).value
                ) || 0,


            total_amount:
                Number(
                    document.getElementById(
                        "totalAmount"
                    ).value
                ) || 0,


            buyer_name:
                document.getElementById(
                    "buyerName"
                ).value,


            buyer_contact:
                document.getElementById(
                    "buyerContact"
                ).value,


            payment_method:
                document.getElementById(
                    "paymentMethod"
                ).value,


            payment_status:
                document.getElementById(
                    "paymentStatus"
                ).value,


            responsible_person:
                document.getElementById(
                    "responsiblePerson"
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


            const farmName =
                await getRegisteredFarmName();


            alert(
                farmName +
                "\n\nSale record saved successfully."
            );


            clearSaleForm();


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
// ESCAPE HTML
// ==========================================================

function escapeHTML(value){

    if(
        value === null ||
        value === undefined
    ){

        return "";

    }


    return String(value)

        .replace(
            /&/g,
            "&amp;"
        )

        .replace(
            /</g,
            "&lt;"
        )

        .replace(
            />/g,
            "&gt;"
        )

        .replace(
            /"/g,
            "&quot;"
        )

        .replace(
            /'/g,
            "&#039;"
        );

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


    const recordCount =
        document.getElementById(
            "recordCount"
        );


    if(recordCount){

        recordCount.textContent =
            `${records.length} Record${records.length === 1 ? "" : "s"}`;

    }


    if(records.length === 0){

        table.innerHTML = `

            <tr>

                <td
                    colspan="10"
                    class="empty-row">

                    No sales records found.

                </td>

            </tr>

        `;

        return;

    }


    records.forEach(
        function(sale){

            let actionButtons = "";


            if(
                typeof canEdit === "function" &&
                canEdit("Sales")
            ){

                actionButtons += `

                    <button
                        type="button"
                        class="small-edit"
                        onclick="editSale(${sale.id})">

                        ✏️ Edit

                    </button>

                `;

            }


            if(
                typeof canDelete === "function" &&
                canDelete("Sales")
            ){

                actionButtons += `

                    <button
                        type="button"
                        class="small-delete"
                        onclick="deleteSale(${sale.id})">

                        🗑️ Delete

                    </button>

                `;

            }


            if(!actionButtons){

                actionButtons =
                    "<span>No actions</span>";

            }


            table.innerHTML += `

                <tr>

                    <td>
                        ${escapeHTML(
                            sale.sale_date || ""
                        )}
                    </td>

                    <td>
                        ${escapeHTML(
                            sale.pig_id || ""
                        )}
                    </td>

                    <td>
                        ${escapeHTML(
                            sale.breed || ""
                        )}
                    </td>

                    <td>
                        ${escapeHTML(
                            sale.category || ""
                        )}
                    </td>

                    <td>
                        ${sale.quantity || 0}
                    </td>

                    <td>
                        ${sale.weight || 0} kg
                    </td>

                    <td>
                        ZMW ${Number(
                            sale.total_amount || 0
                        ).toFixed(2)}
                    </td>

                    <td>
                        ${escapeHTML(
                            sale.buyer_name || ""
                        )}
                    </td>

                    <td>
                        ${escapeHTML(
                            sale.payment_status || ""
                        )}
                    </td>

                    <td class="action-cell">
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


        document.getElementById(
            "recordID"
        ).value =
            data.record_id || "";


        document.getElementById(
            "saleDate"
        ).value =
            data.sale_date || "";


        document.getElementById(
            "pigID"
        ).value =
            data.pig_id || "";


        document.getElementById(
            "breed"
        ).value =
            data.breed || "";


        document.getElementById(
            "category"
        ).value =
            data.category || "";


        document.getElementById(
            "quantity"
        ).value =
            data.quantity || "";


        document.getElementById(
            "weight"
        ).value =
            data.weight || "";


        document.getElementById(
            "pricePerKg"
        ).value =
            data.price_per_kg || "";


        document.getElementById(
            "totalAmount"
        ).value =
            Number(
                data.total_amount || 0
            ).toFixed(2);


        document.getElementById(
            "buyerName"
        ).value =
            data.buyer_name || "";


        document.getElementById(
            "buyerContact"
        ).value =
            data.buyer_contact || "";


        document.getElementById(
            "paymentMethod"
        ).value =
            data.payment_method || "";


        document.getElementById(
            "paymentStatus"
        ).value =
            data.payment_status || "";


        document.getElementById(
            "responsiblePerson"
        ).value =
            data.responsible_person || "";


        document.getElementById(
            "remarks"
        ).value =
            data.remarks || "";


        window.scrollTo({
            top:0,
            behavior:"smooth"
        });

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


    calculateTotalAmount();


    const updatedSale = {

        sale_date:
            document.getElementById(
                "saleDate"
            ).value,


        pig_id:
            document.getElementById(
                "pigID"
            ).value,


        breed:
            document.getElementById(
                "breed"
            ).value,


        category:
            document.getElementById(
                "category"
            ).value,


        quantity:
            Number(
                document.getElementById(
                    "quantity"
                ).value
            ) || 0,


        weight:
            Number(
                document.getElementById(
                    "weight"
                ).value
            ) || 0,


        price_per_kg:
            Number(
                document.getElementById(
                    "pricePerKg"
                ).value
            ) || 0,


        total_amount:
            Number(
                document.getElementById(
                    "totalAmount"
                ).value
            ) || 0,


        buyer_name:
            document.getElementById(
                "buyerName"
            ).value,


        buyer_contact:
            document.getElementById(
                "buyerContact"
            ).value,


        payment_method:
            document.getElementById(
                "paymentMethod"
            ).value,


        payment_status:
            document.getElementById(
                "paymentStatus"
            ).value,


        responsible_person:
            document.getElementById(
                "responsiblePerson"
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

        const {
            error
        } =
            await supabaseClient

                .from("sales_records")

                .update(updatedSale)

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


        const farmName =
            await getRegisteredFarmName();


        alert(
            farmName +
            "\n\nSale record updated successfully."
        );


        editID = null;


        clearSaleForm();


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


        const farmName =
            await getRegisteredFarmName();


        alert(
            farmName +
            "\n\nSale record deleted successfully."
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


        if(
            !data ||
            data.length === 0
        ){

            alert(
                "No sales record found."
            );

            return;

        }


        displaySalesRecords(
            data
        );


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

                .eq(
                    "farm_id",
                    farmID
                )

                .order(
                    "sale_date",
                    {
                        ascending:false
                    }
                );


        if(error){

            throw error;

        }


        if(
            !data ||
            data.length === 0
        ){

            alert(
                "No sales records available."
            );

            return;

        }


        const farmName =
            await getRegisteredFarmName();


        let totalSales = 0;
        let totalQuantity = 0;
        let totalWeight = 0;


        data.forEach(
            function(sale){

                totalSales +=
                    Number(
                        sale.total_amount || 0
                    );


                totalQuantity +=
                    Number(
                        sale.quantity || 0
                    );


                totalWeight +=
                    Number(
                        sale.weight || 0
                    );

            }
        );


        const report = `

${farmName}

SALES REPORT


Total Records:
${data.length}


Total Quantity Sold:
${totalQuantity}


Total Weight Sold:
${totalWeight.toFixed(2)} kg


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
                    ${escapeHTML(farmName)} - Sales Report
                </title>

                <style>

                    body{
                        font-family:Arial;
                        padding:30px;
                    }

                    h1{
                        color:#2e7d32;
                    }

                    button{
                        padding:10px 20px;
                        background:#2e7d32;
                        color:white;
                        border:none;
                        cursor:pointer;
                    }

                    @media print{

                        button{
                            display:none;
                        }

                    }

                </style>

            </head>

            <body>

                <h1>
                    ${escapeHTML(farmName)}
                </h1>

                <pre>
${escapeHTML(report)}
                </pre>

                <button
                    onclick="window.print()">

                    Print Report

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
// DOWNLOAD SALES PDF
// ==========================================================

async function downloadSalesPDF(){

    if(
        typeof canReport === "function" &&
        !canReport("Sales")
    ){

        alert(
            "Access Denied.\n\n" +
            "You do not have permission to download sales reports."
        );

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


    if(
        typeof window.jspdf === "undefined"
    ){

        alert(
            "PDF library has not loaded yet. Please refresh the page and try again."
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

                .eq(
                    "farm_id",
                    farmID
                )

                .order(
                    "sale_date",
                    {
                        ascending:false
                    }
                );


        if(error){

            throw error;

        }


        if(
            !data ||
            data.length === 0
        ){

            alert(
                "No sales records available for PDF."
            );

            return;

        }


        const farmName =
            await getRegisteredFarmName();


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


        // ==================================================
        // REPORT HEADER
        // ==================================================

        doc.setFontSize(18);

        doc.setFont(
            "helvetica",
            "bold"
        );

        doc.text(
            farmName,
            148,
            15,
            {
                align:"center"
            }
        );


        doc.setFontSize(13);

        doc.setFont(
            "helvetica",
            "normal"
        );

        doc.text(
            "SALES RECORDS REPORT",
            148,
            23,
            {
                align:"center"
            }
        );


        // ==================================================
        // SUMMARY
        // ==================================================

        let totalSales = 0;
        let totalQuantity = 0;
        let totalWeight = 0;


        data.forEach(
            function(sale){

                totalSales +=
                    Number(
                        sale.total_amount || 0
                    );


                totalQuantity +=
                    Number(
                        sale.quantity || 0
                    );


                totalWeight +=
                    Number(
                        sale.weight || 0
                    );

            }
        );


        doc.setFontSize(9);


        doc.text(
            `Farm: ${farmName}`,
            14,
            32
        );


        doc.text(
            `Generated By: ${
                loggedUser
                    ? loggedUser.full_name
                    : ""
            }`,
            14,
            38
        );


        doc.text(
            `Generated: ${
                new Date().toLocaleString()
            }`,
            14,
            44
        );


        doc.text(
            `Total Records: ${data.length}`,
            200,
            32
        );


        doc.text(
            `Total Quantity: ${totalQuantity}`,
            200,
            38
        );


        doc.text(
            `Total Weight: ${totalWeight.toFixed(2)} kg`,
            200,
            44
        );


        doc.text(
            `Total Sales: ZMW ${totalSales.toFixed(2)}`,
            200,
            50
        );


        // ==================================================
        // TABLE
        // ==================================================

        const tableData =
            data.map(
                function(sale){

                    return [

                        sale.sale_date || "",

                        sale.pig_id || "",

                        sale.breed || "",

                        sale.category || "",

                        sale.quantity || 0,

                        `${Number(
                            sale.weight || 0
                        ).toFixed(2)} kg`,

                        `ZMW ${
                            Number(
                                sale.price_per_kg || 0
                            ).toFixed(2)
                        }`,

                        `ZMW ${
                            Number(
                                sale.total_amount || 0
                            ).toFixed(2)
                        }`,

                        sale.buyer_name || "",

                        sale.payment_status || ""

                    ];

                }
            );


        doc.autoTable({

            startY:58,

            head:[[

                "Date",
                "Pig ID",
                "Breed",
                "Category",
                "Qty",
                "Weight",
                "Price/Kg",
                "Total",
                "Buyer",
                "Payment"

            ]],


            body:tableData,


            theme:"grid",


            styles:{

                fontSize:7,

                cellPadding:2

            },


            headStyles:{

                fontStyle:"bold"

            },


            columnStyles:{

                0:{cellWidth:21},
                1:{cellWidth:20},
                2:{cellWidth:27},
                3:{cellWidth:20},
                4:{cellWidth:12},
                5:{cellWidth:20},
                6:{cellWidth:22},
                7:{cellWidth:24},
                8:{cellWidth:32},
                9:{cellWidth:20}

            },


            margin:{

                left:10,
                right:10

            },


            didDrawPage:function(){

                const pageNumber =
                    doc.internal.getNumberOfPages();


                doc.setFontSize(8);


                doc.text(
                    `${farmName} - Sales Records`,
                    10,
                    202
                );


                doc.text(
                    `Page ${pageNumber}`,
                    287,
                    202,
                    {
                        align:"right"
                    }
                );

            }

        });


        // ==================================================
        // SAVE PDF
        // ==================================================

        const today =
            new Date()
                .toISOString()
                .split("T")[0];


        const safeFarmName =
            farmName
                .replace(
                    /[^a-z0-9]/gi,
                    "_"
                )
                .replace(
                    /_+/g,
                    "_"
                )
                .replace(
                    /^_|_$/g,
                    ""
                );


        doc.save(
            safeFarmName +
            "_Sales_Report_" +
            today +
            ".pdf"
        );

    }

    catch(error){

        console.error(
            "SALES PDF ERROR:",
            error
        );


        alert(
            "Unable to generate PDF.\n\n" +
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


    // Restore today's date

    const saleDate =
        document.getElementById(
            "saleDate"
        );


    if(saleDate){

        const today =
            new Date();


        const year =
            today.getFullYear();


        const month =
            String(
                today.getMonth() + 1
            ).padStart(2, "0");


        const day =
            String(
                today.getDate()
            ).padStart(2, "0");


        saleDate.value =
            `${year}-${month}-${day}`;

    }

}


// ==========================================================
// LOAD RECORDS WHEN PAGE OPENS
// ==========================================================

window.addEventListener(
    "load",
    function(){

        loadSalesRecords();

    }
);