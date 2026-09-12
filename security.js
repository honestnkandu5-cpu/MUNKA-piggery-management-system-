// ==========================================================
// MUNKA PIGGERY FARM
// SECURITY.JS - DIAGNOSTIC VERSION
// ==========================================================

let currentUser = null;
let currentRole = null;
let currentPermissions = [];


// ==========================================================
// PAGE → MODULE
// ==========================================================

const pageModules = {

    "dashboard.html": null,

    "pig_registration.html": "Pig Registration",
    "gestation.html": "Gestation",
    "farrowing.html": "Farrowing",
    "weaning.html": "Weaning",
    "feeding.html": "Feeding",

    "vaccination.html": "Vaccination & Treatment",

    "sales.html": "Sales",
    "expenses.html": "Expenses",

    "reports.html": "Reports & Analytics",

    "users.html": "Users",
    "activity.html": "Activity Logs"

};


// ==========================================================
// GET CURRENT PAGE
// ==========================================================

function getCurrentPage(){

    let page =
        window.location.pathname
        .split("/")
        .pop();

    if(!page){

        page = "dashboard.html";

    }

    return page;

}


// ==========================================================
// GET AUTHENTICATED USER
// ==========================================================

async function getAuthenticatedUser(){

    console.log("Checking Supabase session...");

    const {
        data,
        error
    } = await supabaseClient.auth.getSession();


    if(error){

        console.error(
            "SESSION ERROR:",
            error
        );

        throw error;

    }


    console.log(
        "SESSION RESULT:",
        data
    );


    if(
        !data ||
        !data.session
    ){

        return null;

    }


    return data.session.user;

}


// ==========================================================
// GET USER PROFILE
// ==========================================================

async function getUserProfile(authUserId){

    console.log(
        "Searching users table for auth_user_id:",
        authUserId
    );


    const {
        data,
        error
    } =
        await supabaseClient

            .from("users")

            .select("*")

            .eq(
                "auth_user_id",
                authUserId
            )

            .single();


    console.log(
        "USER PROFILE RESULT:",
        data
    );


    if(error){

        console.error(
            "USER PROFILE DATABASE ERROR:",
            error
        );

        throw error;

    }


    return data;

}


// ==========================================================
// GET ROLE PERMISSIONS
// ==========================================================

async function getRolePermissions(role){

    console.log(
        "Loading permissions for role:",
        role
    );


    const {
        data,
        error
    } =
        await supabaseClient

            .from("role_permissions")

            .select(
                "id,role,module,can_view,can_add,can_edit,can_delete,can_report"
            )

            .eq(
                "role",
                role
            );


    console.log(
        "ROLE PERMISSIONS RESULT:",
        data
    );


    if(error){

        console.error(
            "ROLE PERMISSIONS DATABASE ERROR:",
            error
        );

        throw error;

    }


    return data || [];

}


// ==========================================================
// FIND PERMISSION
// ==========================================================

function getPermission(moduleName){

    return currentPermissions.find(
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
// PERMISSION FUNCTIONS
// ==========================================================

function canView(moduleName){

    const permission =
        getPermission(moduleName);

    return !!(
        permission &&
        permission.can_view === true
    );

}


function canAdd(moduleName){

    const permission =
        getPermission(moduleName);

    return !!(
        permission &&
        permission.can_add === true
    );

}


function canEdit(moduleName){

    const permission =
        getPermission(moduleName);

    return !!(
        permission &&
        permission.can_edit === true
    );

}


function canDelete(moduleName){

    const permission =
        getPermission(moduleName);

    return !!(
        permission &&
        permission.can_delete === true
    );

}


function canReport(moduleName){

    const permission =
        getPermission(moduleName);

    return !!(
        permission &&
        permission.can_report === true
    );

}


// ==========================================================
// APPLY DASHBOARD PERMISSIONS
// ==========================================================

function applyDashboardPermissions(){

    const buttons =
        document.querySelectorAll(
            "#dashboardButtons button[data-permission-module]"
        );


    buttons.forEach(button => {

        const module =
            button.getAttribute(
                "data-permission-module"
            );


        const permissionType =
            button.getAttribute(
                "data-permission-type"
            );


        let allowed = false;


        if(
            permissionType === "can_view"
        ){

            allowed =
                canView(module);

        }


        if(allowed){

            button.style.display =
                "block";

        }

        else{

            button.style.display =
                "none";

        }

    });

}


// ==========================================================
// PROTECT CURRENT PAGE
// ==========================================================

function protectCurrentPage(){

    const page =
        getCurrentPage();


    const module =
        pageModules[page];


    if(!module){

        return true;

    }


    if(!canView(module)){

        alert(
            "Access Denied.\n\n" +
            "You do not have permission to view this module."
        );


        window.location.href =
            "dashboard.html";


        return false;

    }


    return true;

}


// ==========================================================
// MAIN SECURITY CHECK
// ==========================================================

async function checkPageSecurity(){

    console.log(
        "=========================================="
    );

    console.log(
        "MUNKA PIGGERY SECURITY CHECK"
    );

    console.log(
        "=========================================="
    );


    try{

        // ==================================================
        // 1. AUTHENTICATION
        // ==================================================

        const authUser =
            await getAuthenticatedUser();


        if(!authUser){

            console.error(
                "NO AUTHENTICATED USER FOUND."
            );


            localStorage.removeItem(
                "loggedInUser"
            );


            alert(
                "Please login first."
            );


            window.location.href =
                "login.html";


            return;

        }


        console.log(
            "AUTHENTICATED USER ID:",
            authUser.id
        );


        console.log(
            "AUTHENTICATED EMAIL:",
            authUser.email
        );


        // ==================================================
        // 2. USER PROFILE
        // ==================================================

        const userData =
            await getUserProfile(
                authUser.id
            );


        if(!userData){

            throw new Error(
                "User profile was not found."
            );

        }


        console.log(
            "USER PROFILE:",
            userData
        );


        // ==================================================
        // 3. ACCOUNT STATUS
        // ==================================================

        console.log(
            "ACCOUNT STATUS:",
            userData.status
        );


        if(
            String(userData.status)
                .trim()
                .toLowerCase()
            !==
            "active"
        ){

            alert(
                "Your account is not active."
            );


            await supabaseClient
                .auth
                .signOut();


            localStorage.removeItem(
                "loggedInUser"
            );


            window.location.href =
                "login.html";


            return;

        }


        // ==================================================
        // 4. ROLE
        // ==================================================

        currentUser =
            userData;


        currentRole =
            userData.role;


        console.log(
            "USER ROLE:",
            currentRole
        );


        if(!currentRole){

            throw new Error(
                "The user profile has no role."
            );

        }


        // ==================================================
        // 5. SAVE USER
        // ==================================================

        localStorage.setItem(
            "loggedInUser",
            JSON.stringify(userData)
        );


        // ==================================================
        // 6. LOAD ROLE PERMISSIONS
        // ==================================================

        currentPermissions =
            await getRolePermissions(
                currentRole
            );


        console.log(
            "TOTAL PERMISSIONS:",
            currentPermissions.length
        );


        if(
            currentPermissions.length === 0
        ){

            alert(
                "No permissions have been assigned to your role."
            );


            return;

        }


        // ==================================================
        // 7. PROTECT PAGE
        // ==================================================

        const allowed =
            protectCurrentPage();


        if(!allowed){

            return;

        }


        // ==================================================
        // 8. DASHBOARD BUTTONS
        // ==================================================

        if(
            getCurrentPage()
            ===
            "dashboard.html"
        ){

            applyDashboardPermissions();

        }


        // ==================================================
        // SUCCESS
        // ==================================================

        console.log(
            "=========================================="
        );

        console.log(
            "SECURITY CHECK PASSED"
        );

        console.log(
            "ROLE:",
            currentRole
        );

        console.log(
            "PERMISSIONS:",
            currentPermissions
        );

        console.log(
            "=========================================="
        );

    }

    catch(error){

        console.error(
            "=========================================="
        );

        console.error(
            "SECURITY VERIFICATION FAILED"
        );

        console.error(
            "ACTUAL ERROR:",
            error
        );

        console.error(
            "ERROR MESSAGE:",
            error?.message
        );

        console.error(
            "ERROR DETAILS:",
            error?.details
        );

        console.error(
            "ERROR HINT:",
            error?.hint
        );

        console.error(
            "ERROR CODE:",
            error?.code
        );

        console.error(
            "=========================================="
        );


        alert(
            "Security error:\n\n" +
            (
                error?.message ||
                "Unknown security error."
            )
        );

    }

}


// ==========================================================
// START
// ==========================================================

document.addEventListener(
    "DOMContentLoaded",
    function(){

        checkPageSecurity();

    }
);