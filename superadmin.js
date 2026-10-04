// ==========================================================
// MUNKA PIGGERY
// SUPER ADMIN CONTROL CENTRE
// PHASE 3 - MFA PROTECTED ACCESS
// ==========================================================

let superAdminPermissions = [];

let superAdminSecurityVerified = false;


// ==========================================================
// SECURITY — CHECK SESSION + SUPER ADMIN + MFA
// ==========================================================

async function verifySuperAdminSecurity() {

    try {

        console.log(
            "SUPER ADMIN SECURITY: Starting verification..."
        );


        // --------------------------------------------------
        // 1. CHECK SUPABASE SESSION
        // --------------------------------------------------

        const {
            data: sessionData,
            error: sessionError
        } =
            await supabaseClient
                .auth
                .getSession();


        if (sessionError) {

            console.error(
                "SESSION CHECK ERROR:",
                sessionError
            );

            throw new Error(
                "Unable to verify your login session."
            );
        }


        const session =
            sessionData?.session;


        if (!session) {

            console.warn(
                "SUPER ADMIN SECURITY: No active session."
            );

            redirectToLogin();

            return false;
        }


        const authUser =
            session.user;


        if (!authUser) {

            redirectToLogin();

            return false;
        }


        // --------------------------------------------------
        // 2. GET USER PROFILE
        // --------------------------------------------------

        const {
            data: profile,
            error: profileError
        } =
            await supabaseClient
                .from("users")
                .select(
                    `
                    id,
                    full_name,
                    username,
                    role,
                    status,
                    auth_user_id,
                    farm_id,
                    last_login,
                    email
                    `
                )
                .eq(
                    "auth_user_id",
                    authUser.id
                )
                .maybeSingle();


        if (profileError) {

            console.error(
                "SUPER ADMIN PROFILE ERROR:",
                profileError
            );

            throw new Error(
                "Unable to verify administrator profile."
            );
        }


        if (!profile) {

            console.warn(
                "SUPER ADMIN SECURITY: Profile not found."
            );

            await safeSignOut();

            redirectToLogin();

            return false;
        }


        // --------------------------------------------------
        // 3. VERIFY SUPER ADMIN ROLE
        // --------------------------------------------------

        const userRole =
            String(
                profile.role || ""
            )
            .trim()
            .toLowerCase();


        if (
            userRole !==
            "super admin"
        ) {

            console.warn(
                "SUPER ADMIN SECURITY: Unauthorized role:",
                profile.role
            );

            await safeSignOut();

            alert(
                "Access denied. Super Administrator privileges are required."
            );

            redirectToLogin();

            return false;
        }


        // --------------------------------------------------
        // 4. VERIFY ACCOUNT STATUS
        // --------------------------------------------------

        const userStatus =
            String(
                profile.status || ""
            )
            .trim()
            .toLowerCase();


        if (
            userStatus !==
            "active"
        ) {

            console.warn(
                "SUPER ADMIN SECURITY: Account is not active."
            );

            await safeSignOut();

            alert(
                "Your Super Admin account is not active."
            );

            redirectToLogin();

            return false;
        }


        // --------------------------------------------------
        // 5. VERIFY MFA / AAL2
        // --------------------------------------------------
        //
        // Supabase MFA elevates the authenticated session
        // to AAL2 after successful MFA verification.
        //
        // We deliberately use:
        //
        // auth.mfa.getAuthenticatorAssuranceLevel()
        //
        // NOT:
        //
        // auth.getAuthenticatorAssuranceLevel()
        //
        // --------------------------------------------------

        const {
            data: assuranceData,
            error: assuranceError
        } =
            await supabaseClient
                .auth
                .mfa
                .getAuthenticatorAssuranceLevel();


        if (assuranceError) {

            console.error(
                "MFA ASSURANCE LEVEL ERROR:",
                assuranceError
            );

            throw new Error(
                "Unable to verify MFA security level."
            );
        }


        const currentLevel =
            assuranceData?.currentLevel;


        console.log(
            "SUPER ADMIN MFA CURRENT LEVEL:",
            currentLevel
        );


        // --------------------------------------------------
        // MFA MUST BE AAL2
        // --------------------------------------------------

        if (
            currentLevel !==
            "aal2"
        ) {

            console.warn(
                "SUPER ADMIN SECURITY: MFA verification required."
            );

            await safeSignOut();

            alert(
                "Super Admin MFA verification is required. Please log in again and complete MFA verification."
            );

            redirectToLogin();

            return false;
        }


        // --------------------------------------------------
        // SECURITY VERIFIED
        // --------------------------------------------------

        superAdminSecurityVerified =
            true;


        // --------------------------------------------------
        // UPDATE LOCAL USER INFORMATION
        // --------------------------------------------------

        const storedUser =
            localStorage.getItem(
                "loggedInUser"
            );


        let localUser = {};


        if (storedUser) {

            try {

                localUser =
                    JSON.parse(
                        storedUser
                    );

            } catch (error) {

                console.warn(
                    "LOCAL USER DATA COULD NOT BE READ."
                );
            }
        }


        const updatedUser = {

            ...localUser,

            id:
                profile.id,

            full_name:
                profile.full_name,

            username:
                profile.username,

            role:
                profile.role,

            status:
                profile.status,

            auth_user_id:
                profile.auth_user_id,

            farm_id:
                profile.farm_id,

            last_login:
                profile.last_login,

            email:
                profile.email

        };


        localStorage.setItem(
            "loggedInUser",
            JSON.stringify(
                updatedUser
            )
        );


        console.log(
            "SUPER ADMIN SECURITY: VERIFIED ✓"
        );


        return true;

    } catch (error) {

        console.error(
            "SUPER ADMIN SECURITY ERROR:",
            error
        );


        superAdminSecurityVerified =
            false;


        await safeSignOut();


        alert(
            error?.message ||
            "Super Admin security verification failed."
        );


        redirectToLogin();


        return false;
    }
}


// ==========================================================
// REDIRECT TO LOGIN
// ==========================================================

function redirectToLogin() {

    window.location.replace(
        "login.html"
    );
}


// ==========================================================
// SAFE SIGN OUT
// ==========================================================

async function safeSignOut() {

    try {

        await supabaseClient
            .auth
            .signOut();

    } catch (error) {

        console.error(
            "SAFE SIGN OUT ERROR:",
            error
        );
    }


    localStorage.removeItem(
        "loggedInUser"
    );
}


// ==========================================================
// GET SUPER ADMIN PERMISSIONS
// ==========================================================

async function loadSuperAdminPermissions() {

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


    if (error) {

        console.error(
            "SUPER ADMIN PERMISSIONS ERROR:",
            error
        );

        throw error;
    }


    superAdminPermissions =
        data || [];


    console.log(
        "SUPER ADMIN PERMISSIONS:",
        superAdminPermissions
    );
}


// ==========================================================
// FIND PLATFORM PERMISSION
// ==========================================================

function getPlatformPermission(
    moduleName
) {

    if (!moduleName) {

        return null;
    }


    return superAdminPermissions.find(
        permission => {

            const permissionModule =
                String(
                    permission.module || ""
                )
                .trim()
                .toLowerCase();


            const requestedModule =
                String(
                    moduleName
                )
                .trim()
                .toLowerCase();


            return (
                permissionModule ===
                requestedModule
            );
        }
    ) || null;
}


// ==========================================================
// CHECK VIEW PERMISSION
// ==========================================================

function canViewPlatform(
    moduleName
) {

    const permission =
        getPlatformPermission(
            moduleName
        );


    if (!permission) {

        console.warn(
            "No platform permission found for:",
            moduleName
        );

        return false;
    }


    return (
        permission.can_view === true ||
        permission.can_view === "true" ||
        permission.can_view === 1 ||
        permission.can_view === "1"
    );
}


// ==========================================================
// APPLY SUPER ADMIN PERMISSIONS
// ==========================================================

function applySuperAdminPermissions() {

    const buttons =
        document.querySelectorAll(
            "#superAdminButtons button[data-platform-module]"
        );


    console.log(
        "Platform buttons found:",
        buttons.length
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


            if (
                !permissionType ||
                permissionType === "can_view"
            ) {

                allowed =
                    canViewPlatform(
                        module
                    );
            }


            if (allowed) {

                button.style.display =
                    "";

                button.disabled =
                    false;

            } else {

                button.style.display =
                    "none";
            }
        }
    );
}


// ==========================================================
// DISPLAY SUPER ADMIN
// ==========================================================

function displaySuperAdmin() {

    const storedUser =
        localStorage.getItem(
            "loggedInUser"
        );


    if (!storedUser) {

        redirectToLogin();

        return;
    }


    try {

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


        if (welcomeUser) {

            welcomeUser.textContent =
                "Welcome " +
                (
                    user.full_name ||
                    user.username ||
                    "Super Admin"
                );
        }


        if (userDetails) {

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


        if (lastLogin) {

            const loginValue =
                user.lastLogin ||
                user.last_login ||
                user.last_login_at;


            if (loginValue) {

                lastLogin.textContent =
                    "Last Login: " +
                    new Date(
                        loginValue
                    ).toLocaleString(
                        "en-ZM",
                        {
                            timeZone:
                                "Africa/Lusaka"
                        }
                    );

            } else {

                lastLogin.textContent =
                    "Last Login: Not available";
            }
        }

    } catch (error) {

        console.error(
            "SUPER ADMIN DISPLAY ERROR:",
            error
        );
    }
}


// ==========================================================
// CHANGE PASSWORD
// ==========================================================

function changePassword() {

    if (
        !superAdminSecurityVerified
    ) {

        alert(
            "Super Admin security verification is required."
        );

        return;
    }


    window.location.href =
        "change_password.html";
}


// ==========================================================
// NAVIGATION
// ==========================================================

function openSuperAdminDashboard() {

    if (
        !superAdminSecurityVerified
    ) {

        alert(
            "Super Admin security verification is required."
        );

        return;
    }


    window.location.href =
        "platform_dashboard.html";
}


function openFarmManagement() {

    if (
        !superAdminSecurityVerified
    ) {

        alert(
            "Super Admin security verification is required."
        );

        return;
    }


    window.location.href =
        "farm_management.html";
}


function openPlatformUsers() {

    if (
        !superAdminSecurityVerified
    ) {

        alert(
            "Super Admin security verification is required."
        );

        return;
    }


    window.location.href =
        "platform_users.html";
}


function openPlatformActivity() {

    if (
        !superAdminSecurityVerified
    ) {

        alert(
            "Super Admin security verification is required."
        );

        return;
    }


    window.location.href =
        "platform_activity.html";
}


function openPlatformReports() {

    if (
        !superAdminSecurityVerified
    ) {

        alert(
            "Super Admin security verification is required."
        );

        return;
    }


    window.location.href =
        "platform_reports.html";
}


function openPlatformPermissions() {

    if (
        !superAdminSecurityVerified
    ) {

        alert(
            "Super Admin security verification is required."
        );

        return;
    }


    window.location.href =
        "platform_permissions.html";
}


function openSubscriptionPayment() {

    if (
        !superAdminSecurityVerified
    ) {

        alert(
            "Super Admin security verification is required."
        );

        return;
    }


    window.location.href =
        "records_payment.html";
}


// ==========================================================
// LOGOUT
// ==========================================================

async function logout() {

    try {

        if (
            typeof supabaseClient !==
            "undefined"
        ) {

            await supabaseClient
                .auth
                .signOut();
        }

    } catch (error) {

        console.error(
            "LOGOUT ERROR:",
            error
        );
    }


    localStorage.removeItem(
        "loggedInUser"
    );


    window.location.replace(
        "login.html"
    );
}


// ==========================================================
// START
// ==========================================================

document.addEventListener(
    "DOMContentLoaded",
    async function() {

        try {

            // ------------------------------------------------
            // SECURITY MUST BE VERIFIED FIRST
            // ------------------------------------------------

            const verified =
                await verifySuperAdminSecurity();


            if (!verified) {

                return;
            }


            // ------------------------------------------------
            // ONLY AFTER SECURITY PASSES
            // LOAD SUPER ADMIN PAGE
            // ------------------------------------------------

            displaySuperAdmin();


            await loadSuperAdminPermissions();


            applySuperAdminPermissions();

        } catch (error) {

            console.error(
                "SUPER ADMIN INITIALIZATION ERROR:",
                error
            );


            await safeSignOut();


            redirectToLogin();
        }
    }
);