// ==========================================
// MUNKA PIGGERY MANAGEMENT SYSTEM
// ACTIVITY LOGS MODULE
// FARM-SECURED VERSION
// ZAMBIAN TIME + USER ROLE + PDF
// ==========================================



// ==========================================
// GET LOGGED-IN USER
// ==========================================

function getLoggedUser(){

    const storedUser =
        localStorage.getItem("loggedInUser");


    if(!storedUser){

        return null;

    }


    try{

        return JSON.parse(storedUser);

    }catch(error){

        console.error(
            "Logged user error:",
            error
        );

        return null;

    }

}



// ==========================================
// GET CURRENT FARM ID
// ==========================================

function getFarmID(){

    const loggedUser =
        getLoggedUser();


    if(
        !loggedUser ||
        !loggedUser.farm_id
    ){

        console.error(
            "No farm_id found for logged-in user."
        );

        return null;

    }


    return loggedUser.farm_id;

}



// ==========================================
// ZAMBIAN DATE & TIME
// ==========================================

function formatZambianDateTime(dateValue) {

    if (!dateValue) {
        return "";
    }

    try {

        const utcDate = new Date(dateValue);

        // UTC + 2 hours (Zambia time)
        const zambiaDate = new Date(
            utcDate.getTime() + (2 * 60 * 60 * 1000)
        );

        return zambiaDate.toLocaleString(
            "en-GB",
            {
                timeZone: "UTC",

                year: "numeric",
                month: "2-digit",
                day: "2-digit",

                hour: "2-digit",
                minute: "2-digit",
                second: "2-digit",

                hour12: false
            }
        );

    } catch (error) {

        console.error(
            "Date formatting error:",
            error
        );

        return "";

    }

}



// ==========================================
// ESCAPE HTML
// ==========================================

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



// ==========================================
// LOAD ACTIVITY LOGS
// ==========================================

document.addEventListener(
    "DOMContentLoaded",
    function(){

        loadActivityLogs();

    }
);



// ==========================================
// LOAD ACTIVITY LOGS
// CURRENT FARM ONLY
// ==========================================

async function loadActivityLogs(){

    const farmID =
        getFarmID();


    if(!farmID){

        console.error(
            "Cannot load activity logs: farm_id missing."
        );

        return;

    }


    try{

        const {
            data,
            error
        } = await supabaseClient

            .from("activity_logs")

            .select("*")

            .eq(
                "farm_id",
                farmID
            )

            .order(
                "created_at",
                {
                    ascending:false
                }
            );


        if(error){

            console.error(
                "Activity log error:",
                error
            );

            document.getElementById(
                "activityTable"
            ).innerHTML = `

                <tr>

                    <td
                        colspan="6"
                        style="text-align:center;"
                    >

                        Failed to load activity logs.

                    </td>

                </tr>

            `;

            return;

        }


        const table =
            document.getElementById(
                "activityTable"
            );


        table.innerHTML = "";


        // ==========================================
        // COUNT
        // ==========================================

        const count =
            document.getElementById(
                "activityCount"
            );


        if(count){

            count.textContent =
                data.length;

        }


        if(
            !data ||
            data.length === 0
        ){

            table.innerHTML = `

                <tr>

                    <td
                        colspan="6"
                        style="text-align:center;"
                    >

                        No activity records found.

                    </td>

                </tr>

            `;

            return;

        }



        // ==========================================
        // DISPLAY RECORDS
        // ==========================================

        data.forEach(
            log => {


                const actorName =
                    log.actor_name ||
                    extractName(log.username);


                const actorRole =
                    log.actor_role ||
                    extractRole(log.username);


                table.innerHTML += `

                    <tr>

                        <td>
                            ${escapeHTML(
                                formatZambianDateTime(
                                    log.created_at
                                )
                            )}
                        </td>


                        <td>
                            ${escapeHTML(
                                actorName
                            )}
                        </td>


                        <td>
                            ${escapeHTML(
                                actorRole
                            )}
                        </td>


                        <td>
                            ${escapeHTML(
                                log.action ||
                                ""
                            )}
                        </td>


                        <td>
                            ${escapeHTML(
                                log.module ||
                                ""
                            )}
                        </td>


                        <td>
                            ${escapeHTML(
                                log.description ||
                                ""
                            )}
                        </td>

                    </tr>

                `;

            }
        );


    }catch(error){

        console.error(
            "Activity Log Load Error:",
            error
        );

    }

}



// ==========================================
// EXTRACT NAME FROM OLD USERNAME FORMAT
// Example:
// John Banda (Manager)
// ==========================================

function extractName(username){

    if(!username){

        return "System";

    }


    const position =
        username.lastIndexOf("(");


    if(position === -1){

        return username;

    }


    return username
        .substring(
            0,
            position
        )
        .trim();

}



// ==========================================
// EXTRACT ROLE
// ==========================================

function extractRole(username){

    if(!username){

        return "System";

    }


    const start =
        username.lastIndexOf("(");


    const end =
        username.lastIndexOf(")");


    if(
        start === -1 ||
        end === -1 ||
        end <= start
    ){

        return "";

    }


    return username.substring(
        start + 1,
        end
    );

}



// ==========================================
// SAVE ACTIVITY
// USED BY ALL MODULES
// ==========================================

async function saveActivity(

    username,
    action,
    module,
    description

){

    const loggedUser =
        getLoggedUser();


    const farmID =
        getFarmID();


    if(!farmID){

        console.error(
            "Activity Error: farm_id is missing."
        );

        return;

    }


    // ==========================================
    // GET USER NAME
    // ==========================================

    let actorName =
        loggedUser?.full_name ||
        extractName(username) ||
        "System";


    // ==========================================
    // GET USER ROLE
    // ==========================================

    let actorRole =
        loggedUser?.role ||
        extractRole(username) ||
        "System";


    // ==========================================
    // SAVE ACTIVITY
    // ==========================================

    const {
        error
    } = await supabaseClient

        .from("activity_logs")

        .insert([{

            farm_id:
                farmID,

            username:
                username,

            actor_name:
                actorName,

            actor_role:
                actorRole,

            action:
                action,

            module:
                module,

            description:
                description

        }]);


    if(error){

        console.error(
            "Activity Error:",
            error
        );

    }

}



// ==========================================
// DOWNLOAD ACTIVITY PDF
// ==========================================

async function downloadActivityPDF(){

    const farmID =
        getFarmID();


    if(!farmID){

        alert(
            "Your account is not linked to a farm."
        );

        return;

    }


    if(
        !window.jspdf ||
        !window.jspdf.jsPDF
    ){

        alert(
            "PDF library has not loaded. Please refresh the page."
        );

        return;

    }


    // ==========================================
    // GET DATA
    // ==========================================

    const {
        data,
        error
    } = await supabaseClient

        .from("activity_logs")

        .select("*")

        .eq(
            "farm_id",
            farmID
        )

        .order(
            "created_at",
            {
                ascending:false
            }
        );


    if(error){

        console.error(
            error
        );

        alert(
            "Unable to prepare PDF: " +
            error.message
        );

        return;

    }


    if(
        !data ||
        data.length === 0
    ){

        alert(
            "There are no activity records to download."
        );

        return;

    }


    const {
        jsPDF
    } = window.jspdf;


    const doc =
        new jsPDF(
            "landscape",
            "mm",
            "a4"
        );



    // ==========================================
    // PDF HEADER
    // ==========================================

    doc.setFont(
        "helvetica",
        "bold"
    );


    doc.setFontSize(20);


    doc.text(
        "MUNKA PIGGERY FARM",
        148,
        15,
        {
            align:"center"
        }
    );


    doc.setFontSize(14);


    doc.text(
        "SYSTEM ACTIVITY LOG REPORT",
        148,
        23,
        {
            align:"center"
        }
    );


    doc.setFont(
        "helvetica",
        "normal"
    );


    doc.setFontSize(9);


    doc.text(
        "Generated: " +
        formatZambianDateTime(
            new Date()
        ),
        14,
        32
    );


    doc.text(
        "Total Activities: " +
        data.length,
        14,
        38
    );



    // ==========================================
    // TABLE DATA
    // ==========================================

    const rows =
        data.map(
            (log,index)=>{

                const actorName =
                    log.actor_name ||
                    extractName(
                        log.username
                    );


                const actorRole =
                    log.actor_role ||
                    extractRole(
                        log.username
                    );


                return [

                    index + 1,

                    formatZambianDateTime(
                        log.created_at
                    ),

                    actorName,

                    actorRole,

                    log.action || "",

                    log.module || "",

                    log.description || ""

                ];

            }
        );



    // ==========================================
    // PDF TABLE
    // ==========================================

    doc.autoTable({

        startY:44,

        head:[[

            "#",

            "Date & Time",

            "Name",

            "Role",

            "Action",

            "Module",

            "Description"

        ]],

        body:
            rows,

        theme:
            "grid",

        headStyles:{

            fontStyle:
                "bold",

            halign:
                "center"

        },

        bodyStyles:{

            fontSize:
                8

        },

        columnStyles:{

            0:{
                cellWidth:10,
                halign:"center"
            },

            1:{
                cellWidth:38
            },

            2:{
                cellWidth:35
            },

            3:{
                cellWidth:30
            },

            4:{
                cellWidth:25
            },

            5:{
                cellWidth:30
            },

            6:{
                cellWidth:85
            }

        }

    });



    // ==========================================
    // FOOTER
    // ==========================================

    const pageCount =
        doc.internal
        .getNumberOfPages();


    for(
        let page = 1;
        page <= pageCount;
        page++
    ){

        doc.setPage(page);


        doc.setFont(
            "helvetica",
            "normal"
        );


        doc.setFontSize(8);


        doc.text(

            "MUNKA PIGGERY Management System",

            148,

            200,

            {
                align:"center"
            }

        );


        doc.text(

            "Page " +
            page +
            " of " +
            pageCount,

            280,

            200,

            {
                align:"right"
            }

        );

    }



    // ==========================================
    // SAVE PDF
    // ==========================================

    const date =
        new Date()
        .toISOString()
        .slice(
            0,
            10
        );


    doc.save(

        "MUNKA_PIGGERY_Activity_Log_" +
        date +
        ".pdf"

    );

}// ==========================================
// CLEAR ALL ACTIVITY LOGS
// ADMIN ONLY
// CURRENT FARM ONLY
async function clearAllActivityLogs(){

    const loggedUser = getLoggedUser();

    if(!loggedUser){
        alert("You must be logged in.");
        return;
    }

    // Normalize the role
    const userRole = String(
        loggedUser.role || ""
    )
    .trim()
    .toLowerCase();

    console.log("Logged-in user:", loggedUser);
    console.log("Detected role:", userRole);

    // OWNER/ADMIN ONLY
    if(
        userRole !== "admin" &&
        userRole !== "owner/admin"
    ){

        alert(
            "Only the Owner/Admin can clear activity logs.\n\n" +
            "Current role: " +
            (loggedUser.role || "Not found")
        );

        return;
    }

    const farmID =
        loggedUser.farm_id;

    if(!farmID){
        alert("Farm information is missing.");
        return;
    }

    const confirmed = confirm(
        "WARNING!\n\n" +
        "This will permanently delete ALL activity " +
        "logs belonging to this farm.\n\n" +
        "This action cannot be undone.\n\n" +
        "Do you want to continue?"
    );

    if(!confirmed){
        return;
    }

    try{

        const {
            error
        } = await supabaseClient
            .from("activity_logs")
            .delete()
            .eq(
                "farm_id",
                farmID
            );

        if(error){

            console.error(
                "Clear Activity Logs Error:",
                error
            );

            alert(
                "Failed to clear activity logs:\n\n" +
                error.message
            );

            return;
        }

        alert(
            "All activity logs have been cleared successfully."
        );

        await loadActivityLogs();

    }catch(error){

        console.error(
            "Clear Activity Logs Error:",
            error
        );

        alert(
            "An unexpected error occurred:\n\n" +
            error.message
        );

    }

}// ==========================================
