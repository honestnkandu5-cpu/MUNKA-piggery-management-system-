// =========================================================
// MUNKA PIGGERY FARM
// SHARED CHANGE PASSWORD SYSTEM
// =========================================================
// Works for:
// - Super Admin
// - Owner/Admin
// - Farm Manager
// - Serviceman
// - Farrowman
// - Sales Officer
// - Veterinary Officer
// - Farm Worker
//
// Password authentication is handled by SUPABASE AUTH.
// The users.password column is NOT used to verify passwords.
// =========================================================


// =========================================================
// SHOW MESSAGE
// =========================================================

function showMessage(text, color = "red") {

    const message = document.getElementById("message");

    if (!message) return;

    message.textContent = text;
    message.style.color = color;

}


// =========================================================
// GET LOGGED-IN USER PROFILE
// =========================================================

async function getLoggedInProfile() {

    try {

        // Get current Supabase session
        const {
            data: {
                session
            },
            error: sessionError
        } = await supabaseClient.auth.getSession();


        if (sessionError) {

            console.error("Session error:", sessionError);

            return null;

        }


        if (!session) {

            return null;

        }


        // Get profile from users table
        const {
            data: profile,
            error: profileError
        } = await supabaseClient
            .from("users")
            .select("*")
            .eq("auth_user_id", session.user.id)
            .single();


        if (profileError) {

            console.error("Profile error:", profileError);

            return null;

        }


        return {

            session: session,

            authUser: session.user,

            profile: profile

        };

    }

    catch (error) {

        console.error("getLoggedInProfile error:", error);

        return null;

    }

}


// =========================================================
// CHANGE PASSWORD
// =========================================================

async function changePassword() {

    const oldPassword =
        document.getElementById("oldPassword").value.trim();


    const newPassword =
        document.getElementById("newPassword").value.trim();


    const confirmPassword =
        document.getElementById("confirmPassword").value.trim();


    const updateButton =
        document.getElementById("updatePasswordBtn");


    // =====================================================
    // BASIC VALIDATION
    // =====================================================

    if (
        oldPassword === "" ||
        newPassword === "" ||
        confirmPassword === ""
    ) {

        showMessage(
            "Please fill in all password fields.",
            "red"
        );

        return;

    }


    // =====================================================
    // CHECK NEW PASSWORDS MATCH
    // =====================================================

    if (newPassword !== confirmPassword) {

        showMessage(
            "New passwords do not match.",
            "red"
        );

        return;

    }


    // =====================================================
    // PASSWORD LENGTH
    // =====================================================

    if (newPassword.length < 6) {

        showMessage(
            "New password must be at least 6 characters.",
            "red"
        );

        return;

    }


    // =====================================================
    // PREVENT SAME PASSWORD
    // =====================================================

    if (oldPassword === newPassword) {

        showMessage(
            "New password must be different from the current password.",
            "red"
        );

        return;

    }


    // =====================================================
    // DISABLE BUTTON
    // =====================================================

    if (updateButton) {

        updateButton.disabled = true;
        updateButton.textContent = "Verifying...";

    }


    try {

        // =================================================
        // GET CURRENT SESSION
        // =================================================

        const {
            data: {
                session
            },
            error: sessionError
        } = await supabaseClient.auth.getSession();


        if (sessionError) {

            console.error(sessionError);

            showMessage(
                "Unable to verify your login session.",
                "red"
            );

            return;

        }


        if (!session) {

            showMessage(
                "Your session has expired. Please login again.",
                "red"
            );

            setTimeout(() => {

                window.location.href = "login.html";

            }, 1500);

            return;

        }


        // =================================================
        // GET AUTH EMAIL
        // =================================================

        const email = session.user.email;


        if (!email) {

            showMessage(
                "Your account email could not be identified.",
                "red"
            );

            return;

        }


        // =================================================
        // VERIFY CURRENT PASSWORD
        // =================================================
        // We use Supabase Auth here.
        // We DO NOT compare against users.password.
        // =================================================

        const {
            data: verifyData,
            error: verifyError
        } = await supabaseClient.auth.signInWithPassword({

            email: email,

            password: oldPassword

        });


        if (verifyError) {

            console.error(
                "Current password verification error:",
                verifyError
            );


            showMessage(
                "Current password is incorrect.",
                "red"
            );

            return;

        }


        if (!verifyData || !verifyData.user) {

            showMessage(
                "Current password could not be verified.",
                "red"
            );

            return;

        }


        // =================================================
        // CURRENT PASSWORD CORRECT
        // =================================================

        if (updateButton) {

            updateButton.textContent = "Updating...";

        }


        // =================================================
        // UPDATE SUPABASE AUTH PASSWORD
        // =================================================

        const {
            data: updateData,
            error: updateError
        } = await supabaseClient.auth.updateUser({

            password: newPassword

        });


        if (updateError) {

            console.error(
                "Password update error:",
                updateError
            );


            showMessage(
                updateError.message,
                "red"
            );

            return;

        }


        if (!updateData || !updateData.user) {

            showMessage(
                "Password update could not be completed.",
                "red"
            );

            return;

        }


        // =================================================
        // SUCCESS
        // =================================================

        showMessage(
            "Password changed successfully.",
            "green"
        );


        // Clear form
        document
            .getElementById("passwordForm")
            .reset();


        // =================================================
        // UPDATE LOCAL STORAGE
        // =================================================
        // IMPORTANT:
        // We do NOT store the password anymore.
        // Remove the old password property if it exists.
        // =================================================

        const loggedInUser =
            JSON.parse(
                localStorage.getItem("loggedInUser")
            );


        if (loggedInUser) {

            delete loggedInUser.password;

            localStorage.setItem(
                "loggedInUser",
                JSON.stringify(loggedInUser)
            );

        }


        // =================================================
        // RECOMMENDED: RETURN TO CORRECT DASHBOARD
        // =================================================

        setTimeout(async () => {

            const {
                data: {
                    session: currentSession
                }
            } = await supabaseClient.auth.getSession();


            if (!currentSession) {

                window.location.href = "login.html";

                return;

            }


            const {
                data: currentProfile,
                error: currentProfileError
            } = await supabaseClient
                .from("users")
                .select("role")
                .eq(
                    "auth_user_id",
                    currentSession.user.id
                )
                .single();


            if (
                !currentProfileError &&
                currentProfile &&
                currentProfile.role === "Super Admin"
            ) {

                window.location.href =
                    "superadmin.html";

            }
            else {

                window.location.href =
                    "dashboard.html";

            }

        }, 1500);

    }

    catch (error) {

        console.error(
            "Unexpected change password error:",
            error
        );


        showMessage(
            "An unexpected error occurred. Please try again.",
            "red"
        );

    }

    finally {

        if (updateButton) {

            updateButton.disabled = false;
            updateButton.textContent = "Update Password";

        }

    }

}


// =========================================================
// PAGE INITIALIZATION
// =========================================================

document.addEventListener(
    "DOMContentLoaded",
    async function () {

        // -----------------------------------------------
        // Check login session
        // -----------------------------------------------

        const {
            data: {
                session
            },
            error
        } = await supabaseClient.auth.getSession();


        if (error || !session) {

            showMessage(
                "Please login before changing your password.",
                "red"
            );


            setTimeout(() => {

                window.location.href =
                    "login.html";

            }, 1500);


            return;

        }


        // -----------------------------------------------
        // FORM SUBMIT
        // -----------------------------------------------

        const form =
            document.getElementById("passwordForm");


        if (form) {

            form.addEventListener(
                "submit",
                function (event) {

                    event.preventDefault();

                    changePassword();

                }
            );

        }


        // -----------------------------------------------
        // BACK BUTTON
        // -----------------------------------------------

        const backButton =
            document.getElementById("backButton");


        if (backButton) {

            backButton.addEventListener(
                "click",
                async function () {

                    const {
                        data: {
                            session
                        }
                    } =
                        await supabaseClient.auth.getSession();


                    if (!session) {

                        window.location.href =
                            "login.html";

                        return;

                    }


                    const {
                        data: profile,
                        error: profileError
                    } =
                        await supabaseClient
                            .from("users")
                            .select("role")
                            .eq(
                                "auth_user_id",
                                session.user.id
                            )
                            .single();


                    if (
                        !profileError &&
                        profile &&
                        profile.role === "Super Admin"
                    ) {

                        window.location.href =
                            "superadmin.html";

                    }
                    else {

                        window.location.href =
                            "dashboard.html";

                    }

                }
            );

        }

    }
);