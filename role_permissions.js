// ==========================================================
// MUNKA PIGGERY FARM LIMITED
// ROLE PERMISSION ENGINE
// role_permissions.js
// ==========================================================
//
// This is the ONLY file responsible for reading permissions
// from the role_permissions table.
//
// DO NOT create another loadRolePermissions() in
// dashboard.js or security.js.
// ==========================================================


let userPermissions = [];


// ==========================================================
// GET LOGGED-IN USER
// ==========================================================

function getCurrentLoggedUser(){

    try{

        const storedUser =
            localStorage.getItem("loggedInUser");

        if(!storedUser){

            return null;

        }

        return JSON.parse(storedUser);

    }

    catch(error){

        console.error(
            "Unable to read logged-in user:",
            error
        );

        return null;

    }

}


// ==========================================================
// GET CURRENT ROLE
// ==========================================================

function getCurrentUserRole(){

    const user =
        getCurrentLoggedUser();

    if(!user){

        return null;

    }

    return user.role || null;

}


// ==========================================================
// LOAD PERMISSIONS FROM SUPABASE
// ==========================================================

async function initializePermissions(){

    try{

        const role =
            getCurrentUserRole();


        if(!role){

            console.error(
                "No user role found."
            );

            userPermissions = [];

            return false;

        }


        if(
            typeof supabaseClient ===
            "undefined"
        ){

            console.error(
                "supabaseClient is not available."
            );

            userPermissions = [];

            return false;

        }


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


        if(error){

            console.error(
                "ROLE PERMISSION DATABASE ERROR:",
                error
            );

            userPermissions = [];

            return false;

        }


        userPermissions =
            data || [];


        console.log(
            "Permissions loaded successfully:"
        );

        console.table(
            userPermissions
        );


        return true;

    }

    catch(error){

        console.error(
            "PERMISSION INITIALIZATION ERROR:",
            error
        );

        userPermissions = [];

        return false;

    }

}


// ==========================================================
// FIND MODULE PERMISSION
// ==========================================================

function getModulePermission(moduleName){

    if(!moduleName){

        return null;

    }


    return userPermissions.find(
        function(permission){

            return (

                String(permission.module)
                    .trim()
                    .toLowerCase()

                ===

                String(moduleName)
                    .trim()
                    .toLowerCase()

            );

        }
    ) || null;

}


// ==========================================================
// GENERAL PERMISSION CHECK
// ==========================================================

function hasPermission(
    moduleName,
    permissionType
){

    const permission =
        getModulePermission(
            moduleName
        );


    if(!permission){

        return false;

    }


    return (
        permission[permissionType] === true
    );

}


// ==========================================================
// VIEW
// ==========================================================

function canView(moduleName){

    return hasPermission(
        moduleName,
        "can_view"
    );

}


// ==========================================================
// ADD
// ==========================================================

function canAdd(moduleName){

    return hasPermission(
        moduleName,
        "can_add"
    );

}


// ==========================================================
// EDIT
// ==========================================================

function canEdit(moduleName){

    return hasPermission(
        moduleName,
        "can_edit"
    );

}


// ==========================================================
// DELETE
// ==========================================================

function canDelete(moduleName){

    return hasPermission(
        moduleName,
        "can_delete"
    );

}


// ==========================================================
// REPORT
// ==========================================================

function canReport(moduleName){

    return hasPermission(
        moduleName,
        "can_report"
    );

}


// ==========================================================
// APPLY DASHBOARD / BUTTON PERMISSIONS
// ==========================================================
//
// HTML example:
//
// data-permission="view"
// data-module="Sales"
//
// ==========================================================

function applyPermissionControls(){

    const elements =
        document.querySelectorAll(
            "[data-permission]"
        );


    elements.forEach(
        function(element){

            const action =
                element.getAttribute(
                    "data-permission"
                );


            const module =
                element.getAttribute(
                    "data-module"
                );


            if(!module){

                return;

            }


            let allowed = false;


            switch(action){

                case "view":

                    allowed =
                        canView(module);

                    break;


                case "add":

                    allowed =
                        canAdd(module);

                    break;


                case "edit":

                    allowed =
                        canEdit(module);

                    break;


                case "delete":

                    allowed =
                        canDelete(module);

                    break;


                case "report":

                    allowed =
                        canReport(module);

                    break;


                default:

                    allowed = false;

            }


            if(!allowed){

                element.style.display =
                    "none";

            }

        }
    );

}


// ==========================================================
// REQUIRE VIEW PERMISSION
// ==========================================================

function requireViewPermission(moduleName){

    if(!canView(moduleName)){

        alert(
            "Access Denied.\n\n" +
            "You do not have permission to view " +
            moduleName +
            "."
        );

        window.location.href =
            "dashboard.html";

        return false;

    }


    return true;

}


// ==========================================================
// REQUIRE ADD PERMISSION
// ==========================================================

function requireAddPermission(moduleName){

    if(!canAdd(moduleName)){

        alert(
            "Access Denied.\n\n" +
            "You do not have permission to add records in " +
            moduleName +
            "."
        );

        return false;

    }


    return true;

}


// ==========================================================
// REQUIRE EDIT PERMISSION
// ==========================================================

function requireEditPermission(moduleName){

    if(!canEdit(moduleName)){

        alert(
            "Access Denied.\n\n" +
            "You do not have permission to edit records in " +
            moduleName +
            "."
        );

        return false;

    }


    return true;

}


// ==========================================================
// REQUIRE DELETE PERMISSION
// ==========================================================

function requireDeletePermission(moduleName){

    if(!canDelete(moduleName)){

        alert(
            "Access Denied.\n\n" +
            "You do not have permission to delete records in " +
            moduleName +
            "."
        );

        return false;

    }


    return true;

}


// ==========================================================
// REQUIRE REPORT PERMISSION
// ==========================================================

function requireReportPermission(moduleName){

    if(!canReport(moduleName)){

        alert(
            "Access Denied.\n\n" +
            "You do not have permission to generate reports for " +
            moduleName +
            "."
        );

        return false;

    }


    return true;

}