// =====================================
// MUNKA PIGGERY TECHNOLOGY
// WEANING RECORDS - SUPABASE
// FARM-SECURED VERSION
// =====================================

let weaningRecords = [];
let editID = null;


// =====================================
// GET LOGGED-IN USER
// =====================================

function getLoggedUser(){

    const user = JSON.parse(
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


// =====================================
// GET FARM ID
// =====================================

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


// =====================================
// GET REGISTERED FARM NAME
// =====================================

async function getRegisteredFarmName(){

    try{

        if(
            typeof supabaseClient === "undefined"
        ){

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

    }
    catch(error){

        console.error(
            "FARM NAME ERROR:",
            error
        );

        return "REGISTERED FARM";

    }

}


// =====================================
// FORMAT LOCAL DATE
// =====================================

function formatLocalDate(date){

    const year =
        date.getFullYear();

    const month =
        String(
            date.getMonth() + 1
        ).padStart(2, "0");

    const day =
        String(
            date.getDate()
        ).padStart(2, "0");

    return `${year}-${month}-${day}`;
}


// =====================================
// CALCULATE WEANING DATE
// 33 DAYS AFTER FARROWING
// =====================================

function calculateWeaningDate(){

    const farrowDate =
        document.getElementById(
            "farrowDate"
        ).value;

    if(!farrowDate){

        document.getElementById(
            "weaningDate"
        ).value = "";

        return;

    }


    const date =
        new Date(
            farrowDate + "T00:00:00"
        );


    if(
        isNaN(
            date.getTime()
        )
    ){

        return;

    }


    date.setDate(
        date.getDate() + 33
    );


    document.getElementById(
        "weaningDate"
    ).value =
        formatLocalDate(date);

}


// =====================================
// LOAD ALL WEANING RECORDS
// =====================================

async function loadRecords(){

    try{

        const farmID =
            getFarmID();

        if(!farmID) return;


        const { data, error } =
            await supabaseClient
            .from("weaning_records")
            .select("*")
            .eq("farm_id", farmID)
            .order(
                "id",
                {
                    ascending:true
                }
            );


        if(error) throw error;


        weaningRecords =
            data || [];


        displayRecords();

    }
    catch(error){

        console.error(error);

        alert(error.message);

    }

}


// =====================================
// LOAD FARROWING DETAILS
// USING SOW ID
// =====================================

async function loadFarrowingDetails(){

    const sowID =
        document.getElementById(
            "sowID"
        ).value.trim();


    if(sowID === ""){

        alert(
            "Please enter a Sow ID."
        );

        return;

    }


    const farmID =
        getFarmID();

    if(!farmID) return;


    try{

        const { data, error } =
            await supabaseClient
            .from("farrowing_records")
            .select("*")
            .eq("sow_id", sowID)
            .eq("farm_id", farmID)
            .order(
                "id",
                {
                    ascending:false
                }
            )
            .limit(1)
            .single();


        if(
            error ||
            !data
        ){

            alert(
                "No farrowing record found for this Sow ID."
            );

            return;

        }


        document.getElementById(
            "farrowDate"
        ).value =
            data.farrow_date || "";


        document.getElementById(
            "totalBorn"
        ).value =
            data.total_born || 0;


        calculateWeaningDate();


        alert(
            "Farrowing information loaded successfully."
        );

    }
    catch(error){

        console.error(error);

        alert(error.message);

    }

}


// =====================================
// SEARCH SOW BUTTON
// =====================================

function loadFarrowingSow(){

    loadFarrowingDetails();

}


// =====================================
// AUTOMATIC WEANING DATE
// =====================================

document.getElementById(
    "farrowDate"
)
.addEventListener(
    "change",
    calculateWeaningDate
);


// =====================================
// AUTOMATIC TOTAL WEANED
// =====================================

function calculateTotalWeaned(){

    const male =
        Number(
            document.getElementById(
                "maleWeaned"
            ).value
        ) || 0;


    const female =
        Number(
            document.getElementById(
                "femaleWeaned"
            ).value
        ) || 0;


    document.getElementById(
        "totalWeaned"
    ).value =
        male + female;

}


document.getElementById(
    "maleWeaned"
)
.addEventListener(
    "change",
    calculateTotalWeaned
);


document.getElementById(
    "femaleWeaned"
)
.addEventListener(
    "change",
    calculateTotalWeaned
);


// =====================================
// OTHER MORTALITY REASON
// =====================================

document.getElementById(
    "mortalityReason"
)
.addEventListener(
    "change",
    function(){

        const otherGroup =
            document.getElementById(
                "otherReasonGroup"
            );

        const otherInput =
            document.getElementById(
                "otherReason"
            );


        if(
            this.value === "Other"
        ){

            otherGroup.style.display =
                "flex";

        }
        else{

            otherGroup.style.display =
                "none";

            otherInput.value = "";

        }

    }
);


// =====================================
// START WHEN PAGE LOADS
// =====================================

document.addEventListener(
    "DOMContentLoaded",
    function(){

        document.getElementById(
            "sowID"
        )
        .addEventListener(
            "change",
            loadFarrowingDetails
        );


        loadRecords();

        calculateTotalWeaned();

    }
);


// =====================================
// SAVE / UPDATE WEANING RECORDS
// =====================================

document.getElementById(
    "weaningForm"
)
.addEventListener(
    "submit",
    async function(e){

        e.preventDefault();


        const loggedUser =
            getLoggedUser();

        if(!loggedUser) return;


        const farmID =
            getFarmID();

        if(!farmID) return;


        const sowID =
            document.getElementById(
                "sowID"
            ).value.trim();


        if(!sowID){

            alert(
                "Please enter a Sow ID."
            );

            return;

        }


        const maleWeaned =
            Number(
                document.getElementById(
                    "maleWeaned"
                ).value
            ) || 0;


        const femaleWeaned =
            Number(
                document.getElementById(
                    "femaleWeaned"
                ).value
            ) || 0;


        const totalWeaned =
            maleWeaned +
            femaleWeaned;


        const totalBorn =
            Number(
                document.getElementById(
                    "totalBorn"
                ).value
            ) || 0;


        const mortality =
            Number(
                document.getElementById(
                    "mortality"
                ).value
            ) || 0;


        // ===============================
        // MORTALITY REASON
        // ===============================

        let reason =
            document.getElementById(
                "mortalityReason"
            ).value;


        if(
            reason === "Other"
        ){

            reason =
                document.getElementById(
                    "otherReason"
                ).value.trim();

        }


        // ===============================
        // RECORD
        // ===============================

        const record = {

            farm_id:
                farmID,

            sow_id:
                sowID,

            farrow_date:
                document.getElementById(
                    "farrowDate"
                ).value,

            weaning_date:
                document.getElementById(
                    "weaningDate"
                ).value,

            total_born:
                totalBorn,

            male_weaned:
                maleWeaned,

            female_weaned:
                femaleWeaned,

            total_weaned:
                totalWeaned,

            average_weight:
                Number(
                    document.getElementById(
                        "averageWeight"
                    ).value
                ) || 0,

            mortality:
                mortality,

            mortality_reason:
                reason,

            destination_pen:
                document.getElementById(
                    "destinationPen"
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

            // ===============================
            // ADD NEW RECORD
            // ===============================

            if(editID === null){

                const { error } =
                    await supabaseClient
                    .from(
                        "weaning_records"
                    )
                    .insert([
                        record
                    ]);


                if(error) throw error;


                await saveActivity(

                    loggedUser.full_name +
                    " (" +
                    loggedUser.role +
                    ")",

                    "Added",

                    "Weaning Records",

                    "Added weaning record for Sow ID: " +
                    record.sow_id

                );


                alert(
                    "Weaning record saved successfully."
                );

            }


            // ===============================
            // UPDATE EXISTING RECORD
            // ===============================

            else{

                record.updated_by =
                    loggedUser.full_name;


                record.updated_at =
                    new Date().toISOString();


                delete record.farm_id;

                delete record.created_at;

                delete record.created_by;


                const { error } =
                    await supabaseClient
                    .from(
                        "weaning_records"
                    )
                    .update(record)
                    .eq(
                        "id",
                        editID
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

                    "Updated",

                    "Weaning Records",

                    "Updated weaning record for Sow ID: " +
                    record.sow_id

                );


                alert(
                    "Weaning record updated successfully."
                );


                editID = null;

            }


            clearForm();

            await loadRecords();

        }
        catch(error){

            console.error(error);

            alert(error.message);

        }

    }
);


// =====================================
// ESCAPE HTML
// =====================================

function escapeHTML(value){

    return String(
        value ?? ""
    )
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


// =====================================
// DISPLAY RECORDS
// =====================================

function displayRecords(
    records = weaningRecords
){

    const table =
        document.getElementById(
            "weaningTable"
        );


    table.innerHTML = "";


    if(
        !records ||
        records.length === 0
    ){

        table.innerHTML = `
            <tr>
                <td colspan="11" class="no-records">
                    No weaning records found.
                </td>
            </tr>
        `;

        return;

    }


    records.forEach(
        function(record){

            table.innerHTML += `

                <tr>

                    <td>
                        ${escapeHTML(
                            record.sow_id
                        )}
                    </td>

                    <td>
                        ${escapeHTML(
                            record.farrow_date || ""
                        )}
                    </td>

                    <td>
                        ${escapeHTML(
                            record.weaning_date || ""
                        )}
                    </td>

                    <td>
                        ${record.total_born || 0}
                    </td>

                    <td>
                        ${record.male_weaned || 0}
                    </td>

                    <td>
                        ${record.female_weaned || 0}
                    </td>

                    <td>
                        <strong>
                            ${record.total_weaned || 0}
                        </strong>
                    </td>

                    <td>
                        ${record.average_weight || 0} Kg
                    </td>

                    <td>
                        ${record.mortality || 0}
                    </td>

                    <td>
                        ${escapeHTML(
                            record.destination_pen || ""
                        )}
                    </td>

                    <td class="action-buttons">

                        <button
                            type="button"
                            class="edit-btn"
                            onclick="editRecord(${record.id})"
                        >
                            Edit
                        </button>

                        <button
                            type="button"
                            class="delete-btn"
                            onclick="deleteRecord(${record.id})"
                        >
                            Delete
                        </button>

                    </td>

                </tr>

            `;

        }
    );

}


// =====================================
// EDIT RECORD
// =====================================

async function editRecord(id){

    const farmID =
        getFarmID();

    if(!farmID) return;


    try{

        const { data, error } =
            await supabaseClient
            .from(
                "weaning_records"
            )
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


        document.getElementById(
            "sowID"
        ).value =
            data.sow_id || "";


        document.getElementById(
            "farrowDate"
        ).value =
            data.farrow_date || "";


        document.getElementById(
            "weaningDate"
        ).value =
            data.weaning_date || "";


        document.getElementById(
            "totalBorn"
        ).value =
            data.total_born || 0;


        document.getElementById(
            "maleWeaned"
        ).value =
            data.male_weaned || "";


        document.getElementById(
            "femaleWeaned"
        ).value =
            data.female_weaned || "";


        document.getElementById(
            "totalWeaned"
        ).value =
            data.total_weaned || 0;


        document.getElementById(
            "averageWeight"
        ).value =
            data.average_weight || "";


        document.getElementById(
            "mortality"
        ).value =
            data.mortality || "";


        // ===============================
        // MORTALITY REASON
        // ===============================

        const mortalityReason =
            document.getElementById(
                "mortalityReason"
            );


        const savedReason =
            data.mortality_reason || "";


        const matchingOption =
            Array.from(
                mortalityReason.options
            ).find(
                option =>
                    option.value === savedReason
            );


        if(matchingOption){

            mortalityReason.value =
                savedReason;

            document.getElementById(
                "otherReasonGroup"
            ).style.display =
                "none";

        }
        else if(savedReason){

            mortalityReason.value =
                "Other";

            document.getElementById(
                "otherReasonGroup"
            ).style.display =
                "flex";

            document.getElementById(
                "otherReason"
            ).value =
                savedReason;

        }
        else{

            mortalityReason.value =
                "";

            document.getElementById(
                "otherReasonGroup"
            ).style.display =
                "none";

        }


        document.getElementById(
            "destinationPen"
        ).value =
            data.destination_pen || "";


        document.getElementById(
            "remarks"
        ).value =
            data.remarks || "";


        editID = id;


        calculateTotalWeaned();


        window.scrollTo({

            top: 0,

            behavior: "smooth"

        });

    }
    catch(error){

        console.error(error);

        alert(error.message);

    }

}


// =====================================
// DELETE RECORD
// =====================================

async function deleteRecord(id){

    if(
        !confirm(
            "Delete this weaning record?"
        )
    ) return;


    const loggedUser =
        getLoggedUser();

    if(!loggedUser) return;


    const farmID =
        getFarmID();

    if(!farmID) return;


    try{

        const { error } =
            await supabaseClient
            .from(
                "weaning_records"
            )
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

            "Weaning Records",

            "Deleted weaning record ID: " +
            id

        );


        alert(
            "Record deleted successfully."
        );


        await loadRecords();

    }
    catch(error){

        console.error(error);

        alert(error.message);

    }

}


// =====================================
// SEARCH WEANING RECORDS
// =====================================

async function searchRecord(){

    const keyword =
        document.getElementById(
            "searchWeaning"
        ).value.trim();


    const farmID =
        getFarmID();

    if(!farmID) return;


    try{

        if(keyword === ""){

            displayRecords();

            return;

        }


        const { data, error } =
            await supabaseClient
            .from(
                "weaning_records"
            )
            .select("*")
            .eq(
                "farm_id",
                farmID
            )
            .ilike(
                "sow_id",
                `%${keyword}%`
            )
            .order("id");


        if(error) throw error;


        displayRecords(
            data || []
        );

    }
    catch(error){

        console.error(error);

        alert(error.message);

    }

}


document.getElementById(
    "searchWeaning"
)
.addEventListener(
    "keyup",
    searchRecord
);


// =====================================
// CLEAR FORM
// =====================================

function clearForm(){

    document.getElementById(
        "weaningForm"
    ).reset();


    document.getElementById(
        "otherReasonGroup"
    ).style.display =
        "none";


    document.getElementById(
        "otherReason"
    ).value =
        "";


    document.getElementById(
        "totalWeaned"
    ).value =
        "";


    editID = null;

}


// =====================================
// GENERATE REPORT
// =====================================

async function generateReport(){

    const farmID =
        getFarmID();

    if(!farmID) return;


    try{

        const { data, error } =
            await supabaseClient
            .from(
                "weaning_records"
            )
            .select("*")
            .eq(
                "farm_id",
                farmID
            );


        if(error) throw error;


        const records =
            data || [];


        let totalWeaned = 0;

        let totalMale = 0;

        let totalFemale = 0;

        let totalMortality = 0;

        let totalBorn = 0;


        records.forEach(
            function(record){

                totalBorn +=
                    Number(
                        record.total_born
                    ) || 0;

                totalMale +=
                    Number(
                        record.male_weaned
                    ) || 0;

                totalFemale +=
                    Number(
                        record.female_weaned
                    ) || 0;

                totalWeaned +=
                    Number(
                        record.total_weaned
                    ) || 0;

                totalMortality +=
                    Number(
                        record.mortality
                    ) || 0;

            }
        );


        const farmName =
            await getRegisteredFarmName();


        alert(

            farmName +
            " - WEANING REPORT\n\n" +

            "Total Records: " +
            records.length +

            "\nTotal Born: " +
            totalBorn +

            "\nMale Weaned: " +
            totalMale +

            "\nFemale Weaned: " +
            totalFemale +

            "\nTotal Weaned Piglets: " +
            totalWeaned +

            "\nTotal Mortality: " +
            totalMortality

        );

    }
    catch(error){

        console.error(error);

        alert(error.message);

    }

}


// =====================================
// DOWNLOAD PDF
// =====================================

async function downloadPDF(){

    const farmID =
        getFarmID();

    if(!farmID) return;


    const loggedUser =
        getLoggedUser();

    if(!loggedUser) return;


    try{

        if(!window.jspdf){

            alert(
                "PDF library could not be loaded. Please check your internet connection and try again."
            );

            return;

        }


        const farmName =
            await getRegisteredFarmName();


        const { jsPDF } =
            window.jspdf;


        const { data, error } =
            await supabaseClient
            .from(
                "weaning_records"
            )
            .select("*")
            .eq(
                "farm_id",
                farmID
            )
            .order(
                "id",
                {
                    ascending:true
                }
            );


        if(error) throw error;


        const records =
            data || [];


        const doc =
            new jsPDF({

                orientation:
                    "landscape",

                unit:
                    "mm",

                format:
                    "a4"

            });


        // ===============================
        // HEADER
        // ===============================

        doc.setFontSize(20);

        doc.setFont(
            undefined,
            "bold"
        );


        doc.text(

            farmName,

            148,

            15,

            {
                align:
                    "center"
            }

        );


        doc.setFontSize(14);

        doc.setFont(
            undefined,
            "normal"
        );


        doc.text(

            "WEANING RECORDS REPORT",

            148,

            23,

            {
                align:
                    "center"
            }

        );


        // ===============================
        // REPORT INFORMATION
        // ===============================

        doc.setFontSize(9);


        const today =
            new Date().toLocaleDateString(
                "en-ZM"
            );


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

            "Report Date: " +
            today,

            14,

            44

        );


        // ===============================
        // SUMMARY
        // ===============================

        let totalBorn = 0;

        let male = 0;

        let female = 0;

        let totalWeaned = 0;

        let mortality = 0;


        records.forEach(
            function(record){

                totalBorn +=
                    Number(
                        record.total_born
                    ) || 0;

                male +=
                    Number(
                        record.male_weaned
                    ) || 0;

                female +=
                    Number(
                        record.female_weaned
                    ) || 0;

                totalWeaned +=
                    Number(
                        record.total_weaned
                    ) || 0;

                mortality +=
                    Number(
                        record.mortality
                    ) || 0;

            }
        );


        doc.setFont(
            undefined,
            "bold"
        );


        doc.text(
            "Summary",
            14,
            53
        );


        doc.setFont(
            undefined,
            "normal"
        );


        doc.text(

            "Records: " +
            records.length +

            "   |   Total Born: " +
            totalBorn +

            "   |   Male Weaned: " +
            male +

            "   |   Female Weaned: " +
            female +

            "   |   Total Weaned: " +
            totalWeaned +

            "   |   Mortality: " +
            mortality,

            14,

            59

        );


        // ===============================
        // TABLE
        // ===============================

        const tableData =
            records.map(
                function(record){

                    return [

                        record.sow_id ||
                        "",

                        record.farrow_date ||
                        "",

                        record.weaning_date ||
                        "",

                        record.total_born ||
                        0,

                        record.male_weaned ||
                        0,

                        record.female_weaned ||
                        0,

                        record.total_weaned ||
                        0,

                        (
                            record.average_weight ||
                            0
                        ) +
                        " Kg",

                        record.mortality ||
                        0,

                        record.mortality_reason ||
                        "",

                        record.destination_pen ||
                        "",

                        record.remarks ||
                        ""

                    ];

                }
            );


        doc.autoTable({

            startY:
                66,

            head: [[

                "Sow ID",

                "Farrow Date",

                "Weaning Date",

                "Born",

                "Male",

                "Female",

                "Weaned",

                "Avg Weight",

                "Mortality",

                "Mortality Reason",

                "Destination Pen",

                "Remarks"

            ]],

            body:
                tableData,

            theme:
                "grid",

            styles: {

                fontSize:
                    6,

                cellPadding:
                    2,

                overflow:
                    "linebreak",

                valign:
                    "middle"

            },

            headStyles: {

                fontSize:
                    6,

                fontStyle:
                    "bold"

            },

            columnStyles: {

                0: {
                    cellWidth:
                        17
                },

                1: {
                    cellWidth:
                        20
                },

                2: {
                    cellWidth:
                        20
                },

                3: {
                    cellWidth:
                        12
                },

                4: {
                    cellWidth:
                        12
                },

                5: {
                    cellWidth:
                        12
                },

                6: {
                    cellWidth:
                        13
                },

                7: {
                    cellWidth:
                        18
                },

                8: {
                    cellWidth:
                        15
                },

                9: {
                    cellWidth:
                        34
                },

                10: {
                    cellWidth:
                        25
                },

                11: {
                    cellWidth:
                        45
                }

            },

            margin: {

                left:
                    10,

                right:
                    10

            }

        });


        // ===============================
        // FOOTER
        // ===============================

        const pageCount =
            doc.internal.getNumberOfPages();


        for(
            let page = 1;
            page <= pageCount;
            page++
        ){

            doc.setPage(page);


            const pageHeight =
                doc.internal.pageSize.height;


            doc.setFontSize(8);


            doc.text(

                farmName +
                " - Weaning Records",

                14,

                pageHeight - 8

            );


            doc.text(

                "Page " +
                page +
                " of " +
                pageCount,

                280,

                pageHeight - 8,

                {
                    align:
                        "right"
                }

            );

        }


        // ===============================
        // SAVE PDF
        // ===============================

        const date =
            new Date()
            .toISOString()
            .split("T")[0];


        const safeFarmName =
            farmName
            .replace(
                /[^a-z0-9]+/gi,
                "-"
            )
            .replace(
                /^-+|-+$/g,
                ""
            );


        doc.save(

            safeFarmName +
            "-Weaning-Records-" +
            date +
            ".pdf"

        );

    }
    catch(error){

        console.error(error);

        alert(

            "Unable to generate PDF: " +
            error.message

        );

    }

}


// =====================================
// PRINT REPORT
// =====================================

async function printReport(){

    const farmName =
        await getRegisteredFarmName();


    const softwareBrand =
        document.querySelector(
            ".software-brand"
        );


    const systemDescription =
        document.querySelector(
            ".page-header p"
        );


    const farmLabel =
        document.querySelector(
            ".farm-label"
        );


    const farmNameElement =
        document.querySelector(
            "[data-farm-name]"
        );


    const pigIcon =
        document.querySelector(
            ".pig-icon"
        );


    // =====================================
    // SAVE ORIGINAL VALUES
    // =====================================

    const original = {

        softwareDisplay:
            softwareBrand
                ? softwareBrand.style.display
                : "",

        descriptionDisplay:
            systemDescription
                ? systemDescription.style.display
                : "",

        farmLabelDisplay:
            farmLabel
                ? farmLabel.style.display
                : "",

        pigIconDisplay:
            pigIcon
                ? pigIcon.style.display
                : "",

        farmNameText:
            farmNameElement
                ? farmNameElement.textContent
                : "",

        farmNameFontSize:
            farmNameElement
                ? farmNameElement.style.fontSize
                : "",

        farmNameFontWeight:
            farmNameElement
                ? farmNameElement.style.fontWeight
                : "",

        farmNameTextAlign:
            farmNameElement
                ? farmNameElement.style.textAlign
                : "",

        farmNameDisplay:
            farmNameElement
                ? farmNameElement.style.display
                : "",

        farmNameMargin:
            farmNameElement
                ? farmNameElement.style.margin
                : ""

    };


    // =====================================
    // PREPARE PRINT VERSION
    // =====================================

    if(softwareBrand){

        softwareBrand.style.display =
            "none";

    }


    if(systemDescription){

        systemDescription.style.display =
            "none";

    }


    if(farmLabel){

        farmLabel.style.display =
            "none";

    }


    if(pigIcon){

        pigIcon.style.display =
            "none";

    }


    if(farmNameElement){

        farmNameElement.textContent =
            farmName;

        farmNameElement.style.display =
            "block";

        farmNameElement.style.fontSize =
            "30px";

        farmNameElement.style.fontWeight =
            "800";

        farmNameElement.style.textAlign =
            "center";

        farmNameElement.style.margin =
            "0 0 12px 0";

    }


    // =====================================
    // TEMPORARY PRINT CSS
    // =====================================

    const printStyle =
        document.createElement(
            "style"
        );


    printStyle.id =
        "temporary-weaning-print-style";


    printStyle.innerHTML = `

        @media print {

            .software-brand {
                display: none !important;
            }

            .page-header p {
                display: none !important;
            }

            .farm-label {
                display: none !important;
            }

            .pig-icon {
                display: none !important;
            }

            [data-farm-name] {
                display: block !important;
                font-size: 30px !important;
                font-weight: 800 !important;
                text-align: center !important;
                margin: 0 0 12px 0 !important;
            }

        }

    `;


    document.head.appendChild(
        printStyle
    );


    // =====================================
    // PRINT
    // =====================================

    let restored = false;


    function restorePrintVersion(){

        if(restored) return;

        restored = true;


        if(softwareBrand){

            softwareBrand.style.display =
                original.softwareDisplay;

        }


        if(systemDescription){

            systemDescription.style.display =
                original.descriptionDisplay;

        }


        if(farmLabel){

            farmLabel.style.display =
                original.farmLabelDisplay;

        }


        if(pigIcon){

            pigIcon.style.display =
                original.pigIconDisplay;

        }


        if(farmNameElement){

            farmNameElement.textContent =
                original.farmNameText;

            farmNameElement.style.fontSize =
                original.farmNameFontSize;

            farmNameElement.style.fontWeight =
                original.farmNameFontWeight;

            farmNameElement.style.textAlign =
                original.farmNameTextAlign;

            farmNameElement.style.display =
                original.farmNameDisplay;

            farmNameElement.style.margin =
                original.farmNameMargin;

        }


        if(printStyle){

            printStyle.remove();

        }

    }


    window.addEventListener(
        "afterprint",
        restorePrintVersion,
        {
            once:true
        }
    );


    window.print();


    // Backup restoration
    setTimeout(
        restorePrintVersion,
        3000
    );

}


// =====================================
// END OF WEANING MODULE
// =====================================

Replace the whole contents of "weaning.js" with that version.

Now test Weaning Records

Please test these before we move on:

1. Normal page
   
   - Registered farm name appears correctly.
   - MUNKA PIGGERY TECHNOLOGY remains visible.
   - Weaning records still load.

2. Existing functions
   
   - Search by Sow ID.
   - Search/load Farrowing information.
   - Save a record.
   - Edit a record.
   - Delete a record.
   - Automatic 33-day weaning date.
   - Male + Female = Total Weaned.
   - Mortality reason → Other still works.

3. Report
   
   - Click Report.
   - It should now say:
     "YOUR FARM NAME - WEANING REPORT"
   - It should no longer say MUNKA PIGGERY as the report heading.

4. PDF
   
   - Farm name should be the large main heading.
   - "WEANING RECORDS REPORT" remains underneath.
   - MUNKA PIGGERY should not appear as the PDF heading/footer.
   - Footer should contain the registered farm name.
   - Filename should look like:
     "GRAMUS-PIGGERY-FARM-Weaning-Records-2026-09-22.pdf"

5. Print
   
   - Farm name should appear large and centered.
   - MUNKA PIGGERY TECHNOLOGY should disappear from the printed report.
   - The actual Weaning report content should remain.

Once you test it and say “Done,” Weaning Records will be completed and we can move to the next module: Vaccination & Treatment.