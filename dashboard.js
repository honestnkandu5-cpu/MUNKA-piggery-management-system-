// ==========================================================
// MUNKA PIGGERY TECHNOLOGY
// DASHBOARD.JS
// ==========================================================
//
// RESPONSIBILITIES:
//
// 1. Display logged-in user
// 2. Display registered farm name
// 3. Navigation
// 4. Logout
//
// PERMISSIONS ARE HANDLED BY:
// security.js + role_permissions.js
// ==========================================================


// ==========================================================
// DISPLAY LOGGED-IN USER
// ==========================================================

function displayLoggedInUser(){

    try{

        const storedUser =
            localStorage.getItem(
                "loggedInUser"
            );


        if(!storedUser){

            return;

        }


        const loggedInUser =
            JSON.parse(
                storedUser
            );


        // ======================================
        // WELCOME
        // ======================================

        const welcomeUser =
            document.getElementById(
                "welcomeUser"
            );


        if(welcomeUser){

            welcomeUser.textContent =
                "Welcome " +
                (
                    loggedInUser.full_name ||
                    loggedInUser.username ||
                    "User"
                );

        }


        // ======================================
        // USER DETAILS
        // ======================================

        const userDetails =
            document.getElementById(
                "userDetails"
            );


        if(userDetails){

            userDetails.innerHTML =

                "Username: " +
                (
                    loggedInUser.username ||
                    "N/A"
                ) +

                "<br>Role: " +

                (
                    loggedInUser.role ||
                    "N/A"
                );

        }


        // ======================================
        // LAST LOGIN
        // ======================================

        const lastLogin =
            document.getElementById(
                "lastLogin"
            );


        if(lastLogin){

            const loginValue =
                loggedInUser.lastLogin ||
                loggedInUser.last_login ||
                loggedInUser.last_login_at;


            if(loginValue){

                lastLogin.textContent =
                    "Last Login: " +
                    new Date(
                        loginValue
                    ).toLocaleString(
                        "en-ZM"
                    );

            }

            else{

                lastLogin.textContent =
                    "Last Login: Not available";

            }

        }

    }

    catch(error){

        console.error(
            "DASHBOARD USER ERROR:",
            error
        );

    }

}


// ==========================================================
// DISPLAY REGISTERED FARM NAME
// ==========================================================

async function displayFarmName(){

    const farmNameElement =
        document.getElementById(
            "farmName"
        );


    if(!farmNameElement){

        return;

    }


    farmNameElement.textContent =
        "Loading farm...";


    try{

        // ======================================
        // MAKE SURE SUPABASE EXISTS
        // ======================================

        if(
            typeof supabaseClient ===
            "undefined"
        ){

            throw new Error(
                "supabaseClient is not available."
            );

        }


        // ======================================
        // GET CURRENT AUTH USER
        // ======================================

        const {
            data: sessionData,
            error: sessionError
        } =
            await supabaseClient
                .auth
                .getSession();


        if(sessionError){

            throw sessionError;

        }


        const session =
            sessionData.session;


        if(
            !session ||
            !session.user
        ){

            farmNameElement.textContent =
                "Farm";

            return;

        }


        const authUserId =
            session.user.id;


        // ======================================
        // GET USER PROFILE
        // ======================================

        const {
            data: userProfile,
            error: userError
        } =
            await supabaseClient

                .from("users")

                .select(
                    "farm_id"
                )

                .eq(
                    "auth_user_id",
                    authUserId
                )

                .maybeSingle();


        if(userError){

            throw userError;

        }


        if(
            !userProfile ||
            !userProfile.farm_id
        ){

            farmNameElement.textContent =
                "Farm";

            console.warn(
                "No farm_id found for authenticated user."
            );

            return;

        }


        const farmId =
            userProfile.farm_id;


        // ======================================
        // GET REGISTERED FARM
        // ======================================

        const {
            data: farm,
            error: farmError
        } =
            await supabaseClient

                .from("farms")

                .select(
                    "id, farm_name"
                )

                .eq(
                    "id",
                    farmId
                )

                .maybeSingle();


        if(farmError){

            throw farmError;

        }


        if(
            !farm ||
            !farm.farm_name
        ){

            farmNameElement.textContent =
                "Farm";

            console.warn(
                "Registered farm not found for farm_id:",
                farmId
            );

            return;

        }


        // ======================================
        // DISPLAY FARM NAME
        // ======================================

        farmNameElement.textContent =
            farm.farm_name;

    }

    catch(error){

        console.error(
            "FARM NAME ERROR:",
            error
        );


        farmNameElement.textContent =
            "Farm";


    }

}


// ==========================================================
// NAVIGATION
// ==========================================================

function openPigRegistration(){

    window.location.href =
        "pig_registration.html";

}


function openGestation(){

    window.location.href =
        "gestation.html";

}


function openFarrowing(){

    window.location.href =
        "farrowing.html";

}


function openWeaning(){

    window.location.href =
        "weaning.html";

}


function openVaccination(){

    window.location.href =
        "vaccination.html";

}


function openFeeding(){

    window.location.href =
        "feeding.html";

}


function openSales(){

    window.location.href =
        "sales.html";

}


function openExpenses(){

    window.location.href =
        "expenses.html";

}


function openReports(){

    window.location.href =
        "reports.html";

}


function openUsers(){

    window.location.href =
        "users.html";

}


function openActivity(){

    window.location.href =
        "activity.html";

}


// ==========================================================
// LOGOUT
// ==========================================================

async function logout(){

    try{

        if(
            typeof supabaseClient !==
            "undefined"
        ){

            await supabaseClient
                .auth
                .signOut();

        }

    }

    catch(error){

        console.error(
            "LOGOUT ERROR:",
            error
        );

    }


    localStorage.removeItem(
        "loggedInUser"
    );


    window.location.href =
        "login.html";

}


// ==========================================================
// START DASHBOARD
// ==========================================================

document.addEventListener(
    "DOMContentLoaded",
    async function(){

        // Display logged-in user
        displayLoggedInUser();

        // Display registered farm
        await displayFarmName();

    }
);