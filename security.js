/* ============================================================
   MUNKA PIGGERY TECHNOLOGY
   SECURITY & PAGE PROTECTION
   ------------------------------------------------------------
   CENTRAL SECURITY SYSTEM
   ------------------------------------------------------------
   This version automatically loads role_permissions.js
   when necessary so protected modules do not fail simply
   because the permission script was not manually included.
============================================================ */


/* ============================================================
   GLOBAL SECURITY VARIABLES
============================================================ */

let currentUser = null;
let currentRole = null;


/* ============================================================
   MODULE → PAGE PROTECTION MAP
============================================================ */

const pageModules = {

    "pig_registration.html": "Pig Registration",

    "gestation.html": "Gestation",

    "farrowing.html": "Farrowing",

    "weaning.html": "Weaning",

    "vaccination.html": "Vaccination & Treatment",

    "treatment.html": "Vaccination & Treatment",

    "feeding.html": "Feeding",

    "sales.html": "Sales",

    "expenses.html": "Expenses",

    "reports.html": "Reports & Analytics",

    "platform_users.html": "Platform Users",

    "activity.html": "Activity Logs",

    "users.html": "Users"

};


/* ============================================================
   GET CURRENT PAGE
============================================================ */

function getCurrentPage() {

    let page = window.location.pathname
        .split("/")
        .pop();

    if (!page) {
        page = "index.html";
    }

    return page.toLowerCase();
}


/* ============================================================
   GET AUTHENTICATED SUPABASE USER
============================================================ */

async function getAuthenticatedUser() {

    const {
        data,
        error
    } = await supabaseClient.auth.getSession();


    if (error) {

        console.error(
            "Session error:",
            error
        );

        return null;
    }


    return data?.session?.user || null;
}


/* ============================================================
   GET USER PROFILE
============================================================ */

async function getUserProfile(authUserId) {

    const {
        data,
        error
    } = await supabaseClient
        .from("users")
        .select("*")
        .eq("auth_user_id", authUserId)
        .single();


    if (error) {

        console.error(
            "User profile error:",
            error
        );

        return null;
    }


    return data;
}


/* ============================================================
   SAVE USER TO LOCAL STORAGE
============================================================ */

function saveSecurityUser(profile) {

    if (!profile) {
        return;
    }


    localStorage.setItem(
        "loggedInUser",
        JSON.stringify(profile)
    );
}


/* ============================================================
   CLEAR LOGIN DATA
============================================================ */

function clearLoginData() {

    localStorage.removeItem(
        "loggedInUser"
    );
}


/* ============================================================
   CHECK ACCOUNT STATUS
============================================================ */

function isAccountActive(profile) {

    if (!profile) {
        return false;
    }


    return String(
        profile.status || ""
    )
        .trim()
        .toLowerCase() === "active";
}


/* ============================================================
   CHECK FARM SUBSCRIPTION
============================================================ */

async function checkFarmSubscription(profile) {

    const role = String(
        profile.role || ""
    )
        .trim()
        .toLowerCase();


    /* --------------------------------------------------------
       SUPER ADMIN BYPASS
    -------------------------------------------------------- */

    if (role === "super admin") {

        return {
            allowed: true,
            reason: "Super Admin"
        };
    }


    /* --------------------------------------------------------
       FARM ID REQUIRED
    -------------------------------------------------------- */

    if (!profile.farm_id) {

        return {
            allowed: false,
            reason: "No farm assigned to this user."
        };
    }


    /* --------------------------------------------------------
       GET FARM
    -------------------------------------------------------- */

    const {
        data: farm,
        error
    } = await supabaseClient
        .from("farms")
        .select(
            "id, farm_name, status, subscription_start, subscription_end"
        )
        .eq("id", profile.farm_id)
        .single();


    if (error) {

        console.error(
            "Farm subscription error:",
            error
        );

        return {
            allowed: false,
            reason: "Unable to verify farm subscription."
        };
    }


    if (!farm) {

        return {
            allowed: false,
            reason: "Farm record not found."
        };
    }


    /* --------------------------------------------------------
       FARM STATUS
    -------------------------------------------------------- */

    if (
        farm.status &&
        String(farm.status)
            .trim()
            .toLowerCase() !== "active"
    ) {

        return {
            allowed: false,
            reason: "Farm account is not active."
        };
    }


    /* --------------------------------------------------------
       SUBSCRIPTION EXPIRY
    -------------------------------------------------------- */

    if (farm.subscription_end) {

        const today = new Date();

        const endDate = new Date(
            farm.subscription_end
        );


        if (
            !isNaN(endDate.getTime()) &&
            today > endDate
        ) {

            return {
                allowed: false,
                reason: "Farm subscription has expired."
            };
        }
    }


    return {
        allowed: true,
        farm: farm
    };
}


/* ============================================================
   LOAD PERMISSION ENGINE AUTOMATICALLY
============================================================ */

async function ensurePermissionEngineLoaded() {

    /* --------------------------------------------------------
       IF PERMISSION ENGINE ALREADY EXISTS
    -------------------------------------------------------- */

    if (
        typeof window.initializePermissions === "function" &&
        typeof window.canView === "function"
    ) {

        console.log(
            "MUNKA permission engine already loaded."
        );

        return true;
    }


    console.log(
        "Permission engine not found. Loading role_permissions.js..."
    );


    /* --------------------------------------------------------
       CHECK WHETHER SCRIPT TAG ALREADY EXISTS
    -------------------------------------------------------- */

    const existingScript =
        document.querySelector(
            'script[src="role_permissions.js"]'
        );


    if (existingScript) {

        console.log(
            "role_permissions.js tag already exists. Waiting for it..."
        );

        return new Promise(resolve => {

            let attempts = 0;

            const timer = setInterval(() => {

                attempts++;


                if (
                    typeof window.initializePermissions === "function" &&
                    typeof window.canView === "function"
                ) {

                    clearInterval(timer);

                    console.log(
                        "Permission engine became available."
                    );

                    resolve(true);

                    return;
                }


                if (attempts >= 50) {

                    clearInterval(timer);

                    console.error(
                        "Permission engine failed to become available."
                    );

                    resolve(false);
                }

            }, 100);

        });
    }


    /* --------------------------------------------------------
       CREATE SCRIPT ELEMENT
    -------------------------------------------------------- */

    return new Promise(resolve => {

        const script =
            document.createElement("script");


        script.src =
            "role_permissions.js";


        script.async = false;


        script.onload = function () {

            console.log(
                "role_permissions.js loaded successfully."
            );


            if (
                typeof window.initializePermissions === "function" &&
                typeof window.canView === "function"
            ) {

                resolve(true);

            } else {

                console.error(
                    "role_permissions.js loaded but permission functions are missing."
                );

                resolve(false);
            }
        };


        script.onerror = function () {

            console.error(
                "Unable to load role_permissions.js."
            );


            resolve(false);
        };


        document.head.appendChild(script);

    });
}


/* ============================================================
   PROTECT CURRENT PAGE
============================================================ */

async function protectCurrentPage() {

    const page =
        getCurrentPage();


    /* --------------------------------------------------------
       MAIN DASHBOARD / SUPER ADMIN PAGES
       DO NOT BLOCK HERE
    -------------------------------------------------------- */

    if (

        page === "dashboard.html" ||

        page === "superadmin.html" ||

        page === "platform_dashboard.html"

    ) {

        return true;
    }


    /* --------------------------------------------------------
       FIND REQUIRED MODULE
    -------------------------------------------------------- */

    const requiredModule =
        pageModules[page];


    /* --------------------------------------------------------
       PAGE DOES NOT REQUIRE MODULE PROTECTION
    -------------------------------------------------------- */

    if (!requiredModule) {

        return true;
    }


    /* --------------------------------------------------------
       PERMISSION ENGINE CHECK
    -------------------------------------------------------- */

    if (
        typeof window.canView !== "function"
    ) {

        console.error(
            "Permission engine is not available."
        );

        return false;
    }


    /* --------------------------------------------------------
       CHECK VIEW PERMISSION
    -------------------------------------------------------- */

    if (
        !window.canView(requiredModule)
    ) {

        alert(
            "You do not have permission to access this module."
        );


        window.location.replace(
            "dashboard.html"
        );


        return false;
    }


    return true;
}


/* ============================================================
   MAIN SECURITY CHECK
============================================================ */

async function checkPageSecurity() {

    try {


        /* ----------------------------------------------------
           1. MAKE SURE PERMISSION ENGINE EXISTS
        ---------------------------------------------------- */

        const permissionEngineReady =
            await ensurePermissionEngineLoaded();


        if (!permissionEngineReady) {

            alert(
                "Permission system could not be loaded."
            );

            console.error(
                "MUNKA permission engine failed to load."
            );

            return;
        }


        /* ----------------------------------------------------
           2. CHECK SUPABASE SESSION
        ---------------------------------------------------- */

        const authUser =
            await getAuthenticatedUser();


        if (!authUser) {

            clearLoginData();


            alert(
                "Please login first."
            );


            window.location.replace(
                "login.html"
            );


            return;
        }


        /* ----------------------------------------------------
           3. GET USER PROFILE
        ---------------------------------------------------- */

        const profile =
            await getUserProfile(
                authUser.id
            );


        if (!profile) {

            clearLoginData();


            alert(
                "User profile not found."
            );


            await supabaseClient.auth.signOut();


            window.location.replace(
                "login.html"
            );


            return;
        }


        /* ----------------------------------------------------
           4. CHECK ACCOUNT STATUS
        ---------------------------------------------------- */

        if (
            !isAccountActive(profile)
        ) {

            alert(
                "Your account is not active. Please contact the administrator."
            );


            await supabaseClient.auth.signOut();


            clearLoginData();


            window.location.replace(
                "login.html"
            );


            return;
        }


        /* ----------------------------------------------------
           5. SAVE USER INFORMATION
        ---------------------------------------------------- */

        currentUser =
            profile;


        currentRole =
            profile.role;


        saveSecurityUser(
            profile
        );


        /* ----------------------------------------------------
           6. CHECK FARM SUBSCRIPTION
        ---------------------------------------------------- */

        const subscription =
            await checkFarmSubscription(
                profile
            );


        if (
            !subscription.allowed
        ) {

            alert(
                subscription.reason
            );


            await supabaseClient.auth.signOut();


            clearLoginData();


            window.location.replace(
                "login.html"
            );


            return;
        }


        /* ----------------------------------------------------
           7. INITIALIZE PERMISSIONS
        ---------------------------------------------------- */

        if (
            typeof window.initializePermissions !== "function"
        ) {

            console.error(
                "initializePermissions() is missing."
            );


            alert(
                "Permission system could not be loaded."
            );


            return;
        }


        const permissionsReady =
            await window.initializePermissions();


        if (!permissionsReady) {

            alert(
                "Your permissions could not be loaded. Please contact the administrator."
            );


            return;
        }


        /* ----------------------------------------------------
           8. PROTECT CURRENT PAGE
        ---------------------------------------------------- */

        const pageAllowed =
            await protectCurrentPage();


        if (!pageAllowed) {

            return;
        }


        /* ----------------------------------------------------
           9. APPLY BUTTON PERMISSIONS
        ---------------------------------------------------- */

        if (
            typeof window.applyPermissionControls === "function"
        ) {

            window.applyPermissionControls();
        }


        /* ----------------------------------------------------
           10. APPLY DASHBOARD PERMISSIONS
        ---------------------------------------------------- */

        if (
            typeof window.applyDashboardPermissions === "function"
        ) {

            window.applyDashboardPermissions();
        }


        /* ----------------------------------------------------
           SECURITY PASSED
        ---------------------------------------------------- */

        console.log(
            "========================================"
        );

        console.log(
            "MUNKA SECURITY CHECK PASSED"
        );

        console.log(
            "Current user:",
            currentUser
        );

        console.log(
            "Current role:",
            currentRole
        );

        console.log(
            "Current page:",
            getCurrentPage()
        );

        console.log(
            "========================================"
        );


    } catch (error) {


        console.error(
            "Security system error:",
            error
        );


        alert(
            "A security error occurred. Please login again."
        );


        clearLoginData();


        try {

            await supabaseClient.auth.signOut();

        } catch (logoutError) {

            console.error(
                "Logout error:",
                logoutError
            );
        }


        window.location.replace(
            "login.html"
        );
    }
}


/* ============================================================
   GLOBAL EXPORTS
============================================================ */

window.currentUser =
    currentUser;

window.currentRole =
    currentRole;

window.getAuthenticatedUser =
    getAuthenticatedUser;

window.getUserProfile =
    getUserProfile;

window.checkFarmSubscription =
    checkFarmSubscription;

window.ensurePermissionEngineLoaded =
    ensurePermissionEngineLoaded;

window.protectCurrentPage =
    protectCurrentPage;

window.checkPageSecurity =
    checkPageSecurity;


/* ============================================================
   START SECURITY AFTER PAGE LOAD
============================================================ */

document.addEventListener(
    "DOMContentLoaded",
    function () {

        checkPageSecurity();

    }
);