let superAdminPermissions = [];

// ==========================================================
// GET SUPER ADMIN PERMISSIONS
// ==========================================================

async function loadSuperAdminPermissions(){

    const {
        data,
        error
    } =
        await supabaseClient
            .from("platform_permissions")
            .select(
                "id, role, module, can_view, can_add, can_edit, can_delete, can_report"
            )
            .eq(
                "role",
                "Super Admin"
            );

    if(error){

        console.error(
            "SUPER ADMIN PERMISSIONS ERROR:",
            error
        );

        throw error;

    }

    superAdminPermissions =
        data || [];

}


// ==========================================================
// FIND PLATFORM PERMISSION
// ==========================================================

function getPlatformPermission(
    moduleName
){

    return superAdminPermissions.find(
        permission =>

            String(permission.module)
                .trim()
                .toLowerCase()

            ===

            String(moduleName)
                .trim()
                .toLowerCase()

    ) || null;

}


// ==========================================================
// CHECK VIEW PERMISSION
// ==========================================================

function canViewPlatform(
    moduleName
){

    const permission =
        getPlatformPermission(
            moduleName
        );

    return !!(
        permission &&
        permission.can_view === true
    );

}


// ==========================================================
// APPLY SUPER ADMIN PERMISSIONS
// ==========================================================

function applySuperAdminPermissions(){

    const buttons =
        document.querySelectorAll(
            "#superAdminButtons button[data-platform-module]"
        );


    buttons.forEach(
        button => {

            const module =
                button.getAttribute(
                    "data-platform-module"
                );


            const permissionType =
                button.getAttribute(
                    "data-platform-permission-type"
                );


            let allowed = false;


            if(
                permissionType ===
                "can_view"
            ){

                allowed =
                    canViewPlatform(
                        module
                    );

            }


            if(allowed){

                button.style.display =
                    "block";

            }

            else{

                button.style.display =
                    "none";

            }

        }
    );

}


// ==========================================================
// DISPLAY SUPER ADMIN
// ==========================================================

function displaySuperAdmin(){

    const storedUser =
        localStorage.getItem(
            "loggedInUser"
        );


    if(!storedUser){

        window.location.href =
            "login.html";

        return;

    }


    try{

        const user =
            JSON.parse(
                storedUser
            );


        const welcomeUser =
            document.getElementById(
                "welcomeUser"
            );


        const userDetails =
            document.getElementById(
                "userDetails"
            );


        const lastLogin =
            document.getElementById(
                "lastLogin"
            );


        if(welcomeUser){

            welcomeUser.textContent =
                "Welcome " +
                (
                    user.full_name ||
                    user.username ||
                    "Super Admin"
                );

        }


        if(userDetails){

            userDetails.innerHTML =
                "Username: " +
                (
                    user.username ||
                    "N/A"
                ) +
                "<br>Role: " +
                (
                    user.role ||
                    "Super Admin"
                );

        }


        if(lastLogin){

            const loginValue =
                user.lastLogin ||
                user.last_login ||
                user.last_login_at;


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
            "SUPER ADMIN DISPLAY ERROR:",
            error
        );

    }

}


// ==========================================================
// NAVIGATION
// ==========================================================

function openSuperAdminDashboard(){

    window.location.href =
        "platform_dashboard.html";

}


function openFarmManagement(){

    window.location.href =
        "farm_management.html";

}


function openPlatformUsers(){

    window.location.href =
        "platform_users.html";

}


function openPlatformActivity(){

    window.location.href =
        "platform_activity.html";

}


function openPlatformReports(){

    window.location.href =
        "platform_reports.html";

}


function openPlatformPermissions(){

    window.location.href =
        "platform_permissions.html";

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
// START
// ==========================================================

document.addEventListener(
    "DOMContentLoaded",
    async function(){

        try{

            displaySuperAdmin();

            await loadSuperAdminPermissions();

            applySuperAdminPermissions();

        }

        catch(error){

            console.error(
                "SUPER ADMIN INITIALIZATION ERROR:",
                error
            );

            alert(
                "Unable to load Super Admin permissions."
            );

        }

    }
);

