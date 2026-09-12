// ==========================================================
// MUNKA PIGGERY FARM LIMITED
// DASHBOARD.JS
// ==========================================================
//
// RESPONSIBILITIES:
//
// 1. Display logged-in user
// 2. Navigation
// 3. Logout
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
    function(){

        displayLoggedInUser();

    }
);