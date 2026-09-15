// ==========================================
// MUNKA PIGGERY MANAGEMENT SYSTEM
// ACTIVITY LOGS MODULE
// FARM-SECURED VERSION
// ==========================================


// ==========================================
// GET LOGGED-IN USER
// ==========================================

function getLoggedUser(){

    return JSON.parse(
        localStorage.getItem("loggedInUser")
    );

}


// ==========================================
// GET CURRENT FARM ID
// ==========================================

function getFarmID(){

    const loggedUser = getLoggedUser();

    if(!loggedUser || !loggedUser.farm_id){

        console.error(
            "No farm_id found for logged-in user."
        );

        return null;
    }

    return loggedUser.farm_id;

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
// ONLY CURRENT FARM
// ==========================================

async function loadActivityLogs(){

    const farmID = getFarmID();


    if(!farmID){

        console.error(
            "Cannot load activity logs: farm_id missing."
        );

        return;
    }


    try{

        const {data,error} = await supabaseClient

            .from("activity_logs")

            .select("*")

            // ==========================================
            // FARM SECURITY
            // ==========================================

            .eq("farm_id", farmID)

            .order(
                "created_at",
                {ascending:false}
            );


        if(error){

            console.log(error);

            return;

        }


        let rows = "";


        data.forEach(log=>{

            rows += `

            <tr>

            <td>
                ${new Date(
                    new Date(log.created_at).toISOString()
                ).toLocaleString("en-GB", {

                    timeZone: "Africa/Lusaka",

                    year: "numeric",

                    month: "2-digit",

                    day: "2-digit",

                    hour: "2-digit",

                    minute: "2-digit",

                    second: "2-digit",

                    hour12: false

                })}
            </td>


            <td>
                ${log.username || "System"}
            </td>


            <td>
                ${log.action || ""}
            </td>


            <td>
                ${log.module || ""}
            </td>


            <td>
                ${log.description || ""}
            </td>

            </tr>

            `;

        });


        document.getElementById(
            "activityTable"
        ).innerHTML = rows;


    }catch(error){

        console.error(
            "Activity Log Load Error:",
            error
        );

    }

}



// ==========================================
// FUNCTION USED BY OTHER MODULES
// TO SAVE ACTIVITIES
// ==========================================

async function saveActivity(

    username,

    action,

    module,

    description

){

    // ==========================================
    // GET FARM ID
    // ==========================================

    const farmID = getFarmID();


    if(!farmID){

        console.error(
            "Activity Error: farm_id is missing."
        );

        return;

    }


    // ==========================================
    // SAVE ACTIVITY
    // ==========================================

    const {error}=await supabaseClient

        .from("activity_logs")

        .insert([{

            // ==========================================
            // FARM ISOLATION
            // ==========================================

            farm_id: farmID,

            username: username,

            action: action,

            module: module,

            description: description

        }]);


    if(error){

        console.log(
            "Activity Error:",
            error
        );

    }

}