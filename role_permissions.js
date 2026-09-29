/* ============================================================
   MUNKA PIGGERY TECHNOLOGY
   CENTRAL PERMISSION ENGINE
   ------------------------------------------------------------
   This file is the ONLY file responsible for:
   - Loading permissions
   - Checking permissions
   - Applying permissions to buttons/modules
   - Supporting farm roles
   - Supporting Super Admin platform permissions
============================================================ */


/* ============================================================
   GLOBAL PERMISSION STATE
============================================================ */

let userPermissions = [];


/* ============================================================
   GET CURRENT LOGGED-IN USER
============================================================ */

function getCurrentLoggedUser() {

    try {

        const user = localStorage.getItem("loggedInUser");

        if (!user) {
            return null;
        }

        return JSON.parse(user);

    } catch (error) {

        console.error(
            "Unable to read loggedInUser:",
            error
        );

        return null;
    }
}


/* ============================================================
   GET CURRENT USER ROLE
============================================================ */

function getCurrentUserRole() {

    const user = getCurrentLoggedUser();

    if (!user) {
        return null;
    }

    return user.role || null;
}


/* ============================================================
   NORMALIZE ROLE
============================================================ */

function normalizeRole(role) {

    if (!role) {
        return "";
    }

    return String(role)
        .trim()
        .toLowerCase();

}


/* ============================================================
   CHECK SUPER ADMIN
============================================================ */

function isSuperAdmin() {

    const role = getCurrentUserRole();

    return normalizeRole(role) === "super admin";

}


/* ============================================================
   INITIALIZE PERMISSIONS
============================================================ */

async function initializePermissions() {

    try {

        userPermissions = [];

        const role = getCurrentUserRole();

        if (!role) {

            console.warn(
                "No logged-in user role found."
            );

            return false;
        }


        /* ====================================================
           SUPER ADMIN
        ==================================================== */

        if (isSuperAdmin()) {

            const {
                data,
                error
            } = await supabaseClient
                .from("platform_permissions")
                .select("*")
                .eq("role", "Super Admin");

            if (error) {
                throw error;
            }

            userPermissions = data || [];

            console.log(
                "Platform permissions loaded:",
                userPermissions
            );

        }


        /* ====================================================
           NORMAL FARM USER
        ==================================================== */

        else {

            const {
                data,
                error
            } = await supabaseClient
                .from("role_permissions")
                .select("*")
                .eq("role", role);

            if (error) {
                throw error;
            }

            userPermissions = data || [];

            console.log(
                "Farm permissions loaded:",
                userPermissions
            );

        }


        /* ====================================================
           APPLY PERMISSIONS
        ==================================================== */

        applyPermissionControls();

        applyDashboardPermissions();


        return true;


    } catch (error) {

        console.error(
            "Permission initialization failed:",
            error
        );

        userPermissions = [];

        return false;

    }

}


/* ============================================================
   FIND MODULE PERMISSION
============================================================ */

function getModulePermission(moduleName) {

    if (!moduleName) {
        return null;
    }

    return userPermissions.find(permission => {

        return String(permission.module || "")
            .trim()
            .toLowerCase()
            ===
            String(moduleName)
                .trim()
                .toLowerCase();

    }) || null;

}


/* ============================================================
   GENERIC PERMISSION CHECK
============================================================ */

function hasPermission(
    moduleName,
    permissionType
) {

    const permission =
        getModulePermission(moduleName);

    if (!permission) {
        return false;
    }

    return permission[permissionType] === true;

}


/* ============================================================
   VIEW
============================================================ */

function canView(moduleName) {

    return hasPermission(
        moduleName,
        "can_view"
    );

}


/* ============================================================
   ADD
============================================================ */

function canAdd(moduleName) {

    return hasPermission(
        moduleName,
        "can_add"
    );

}


/* ============================================================
   EDIT
============================================================ */

function canEdit(moduleName) {

    return hasPermission(
        moduleName,
        "can_edit"
    );

}


/* ============================================================
   DELETE
============================================================ */

function canDelete(moduleName) {

    return hasPermission(
        moduleName,
        "can_delete"
    );

}


/* ============================================================
   REPORT
============================================================ */

function canReport(moduleName) {

    return hasPermission(
        moduleName,
        "can_report"
    );

}


/* ============================================================
   PERMISSION TYPE CONVERTER
============================================================ */

function checkPermissionType(
    moduleName,
    permissionType
) {

    switch (
        String(permissionType)
            .toLowerCase()
    ) {

        case "view":
        case "can_view":

            return canView(moduleName);


        case "add":
        case "can_add":

            return canAdd(moduleName);


        case "edit":
        case "can_edit":

            return canEdit(moduleName);


        case "delete":
        case "can_delete":

            return canDelete(moduleName);


        case "report":
        case "can_report":

            return canReport(moduleName);


        default:

            return false;
    }

}


/* ============================================================
   APPLY PERMISSIONS TO NORMAL PAGE BUTTONS
   ------------------------------------------------------------
   Example:

   data-permission="add"
   data-module="Pig Registration"
============================================================ */

function applyPermissionControls() {

    const controls =
        document.querySelectorAll(
            "[data-permission][data-module]"
        );


    controls.forEach(control => {

        const permissionType =
            control.getAttribute(
                "data-permission"
            );

        const moduleName =
            control.getAttribute(
                "data-module"
            );


        const allowed =
            checkPermissionType(
                moduleName,
                permissionType
            );


        if (!allowed) {

            control.style.display = "none";

            control.setAttribute(
                "data-permission-hidden",
                "true"
            );

        } else {

            control.style.display = "";

            control.removeAttribute(
                "data-permission-hidden"
            );

        }

    });

}


/* ============================================================
   APPLY PERMISSIONS TO DASHBOARD MODULE CARDS
   ------------------------------------------------------------
   Example:

   data-permission-module="Gestation"
   data-permission-type="can_view"
============================================================ */

function applyDashboardPermissions() {

    const dashboardControls =
        document.querySelectorAll(
            "[data-permission-module][data-permission-type]"
        );


    dashboardControls.forEach(control => {

        const moduleName =
            control.getAttribute(
                "data-permission-module"
            );

        const permissionType =
            control.getAttribute(
                "data-permission-type"
            );


        const allowed =
            checkPermissionType(
                moduleName,
                permissionType
            );


        if (!allowed) {

            control.style.display = "none";

            control.setAttribute(
                "data-permission-hidden",
                "true"
            );

        } else {

            control.style.display = "";

            control.removeAttribute(
                "data-permission-hidden"
            );

        }

    });

}


/* ============================================================
   REQUIRE VIEW PERMISSION
============================================================ */

function requireViewPermission(
    moduleName
) {

    if (!canView(moduleName)) {

        alert(
            "You do not have permission to view this module."
        );

        window.location.replace(
            "dashboard.html"
        );

        return false;
    }

    return true;

}


/* ============================================================
   REQUIRE ADD PERMISSION
============================================================ */

function requireAddPermission(
    moduleName
) {

    if (!canAdd(moduleName)) {

        alert(
            "You do not have permission to add records in this module."
        );

        return false;
    }

    return true;

}


/* ============================================================
   REQUIRE EDIT PERMISSION
============================================================ */

function requireEditPermission(
    moduleName
) {

    if (!canEdit(moduleName)) {

        alert(
            "You do not have permission to edit records in this module."
        );

        return false;
    }

    return true;

}


/* ============================================================
   REQUIRE DELETE PERMISSION
============================================================ */

function requireDeletePermission(
    moduleName
) {

    if (!canDelete(moduleName)) {

        alert(
            "You do not have permission to delete records in this module."
        );

        return false;
    }

    return true;

}


/* ============================================================
   REQUIRE REPORT PERMISSION
============================================================ */

function requireReportPermission(
    moduleName
) {

    if (!canReport(moduleName)) {

        alert(
            "You do not have permission to generate reports for this module."
        );

        return false;
    }

    return true;

}


/* ============================================================
   GLOBAL HELPER
============================================================ */

window.userPermissions =
    userPermissions;


/* ============================================================
   MAKE FUNCTIONS AVAILABLE GLOBALLY
============================================================ */

window.getCurrentLoggedUser =
    getCurrentLoggedUser;

window.getCurrentUserRole =
    getCurrentUserRole;

window.initializePermissions =
    initializePermissions;

window.getModulePermission =
    getModulePermission;

window.hasPermission =
    hasPermission;

window.canView =
    canView;

window.canAdd =
    canAdd;

window.canEdit =
    canEdit;

window.canDelete =
    canDelete;

window.canReport =
    canReport;

window.applyPermissionControls =
    applyPermissionControls;

window.applyDashboardPermissions =
    applyDashboardPermissions;

window.requireViewPermission =
    requireViewPermission;

window.requireAddPermission =
    requireAddPermission;

window.requireEditPermission =
    requireEditPermission;

window.requireDeletePermission =
    requireDeletePermission;

window.requireReportPermission =
    requireReportPermission;


/* ============================================================
   PERMISSION ENGINE READY
============================================================ */

console.log(
    "MUNKA permission engine loaded."
);