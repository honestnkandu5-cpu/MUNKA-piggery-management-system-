// =========================================================
// MUNKA PIGGERY FARM
// CHANGE PASSWORD SYSTEM
// =========================================================
// Uses the existing supabase.js WITHOUT modifying it.
// Supports all authenticated farm users and Super Admin.
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
// GET EXISTING SUPABASE CLIENT
// =========================================================

function getSupabaseClient() {

    // supabaseClient is declared as a top-level const
    // in the existing supabase.js file.
    //
    // This function can access it without changing
    // supabase.js because both scripts run on this page.

    try {

        if (
            typeof supabaseClient !== "undefined" &&
            supabaseClient
        ) {
            return supabaseClient;
        }

    } catch (error) {

        console.error(
            "Unable to access Supabase client:",
            error
        );

    }

    return null;

}


// =========================================================
// GET CURRENT SESSION
// =========================================================

async function getCurrentSession(client) {

    const {
        data,
        error
    } = await client.auth.getSession();

    if (error) {

        console.error("Session error:", error);

        throw new Error(
            "Unable to verify your login session. Please try again."
        );

    }

    if (!data || !data.session) {

        throw new Error(
            "Your session has expired. Please log in again."
        );

    }

    return data.session;

}


// =========================================================
// GET CORRECT DASHBOARD
// =========================================================

async function redirectToDashboard(client) {

    try {

        const session = await getCurrentSession(client);

        const {
            data: profile,
            error
        } = await client
            .from("users")
            .select("role")
            .eq("auth_user_id", session.user.id)
            .single();

        if (
            !error &&
            profile &&
            String(profile.role).trim().toLowerCase() ===
                "super admin"
        ) {

            window.location.href = "superadmin.html";

        } else {

            window.location.href = "dashboard.html";

        }

    } catch (error) {

        console.error("Dashboard redirect error:", error);

        window.location.href = "login.html";

    }

}


// =========================================================
// CHANGE PASSWORD
// =========================================================

async function changePassword(event) {

    if (event) {

        event.preventDefault();

    }

    const client = getSupabaseClient();

    if (!client) {

        showMessage(
            "Supabase is not initialized. Check that supabase.js loads before change_password.js.",
            "red"
        );

        return;

    }


    const oldPassword =
        document.getElementById("oldPassword").value;

    const newPassword =
        document.getElementById("newPassword").value;

    const confirmPassword =
        document.getElementById("confirmPassword").value;

    const updateButton =
        document.getElementById("updatePasswordBtn");


    // =====================================================
    // VALIDATE INPUTS
    // =====================================================

    if (
        !oldPassword ||
        !newPassword ||
        !confirmPassword
    ) {

        showMessage(
            "Please fill in all password fields.",
            "red"
        );

        return;

    }


    if (newPassword !== confirmPassword) {

        showMessage(
            "The new passwords do not match.",
            "red"
        );

        return;

    }


    if (newPassword.length < 6) {

        showMessage(
            "Your new password must contain at least 6 characters.",
            "red"
        );

        return;

    }


    if (oldPassword === newPassword) {

        showMessage(
            "Your new password must be different from your current password.",
            "red"
        );

        return;

    }


    // =====================================================
    // DISABLE BUTTON
    // =====================================================

    if (updateButton) {

        updateButton.disabled = true;

        updateButton.textContent = "Verifying password...";

    }


    try {

        // =================================================
        // GET EXISTING AUTHENTICATED SESSION
        // =================================================

        const session = await getCurrentSession(client);

        const email = session.user.email;

        if (!email) {

            throw new Error(
                "Your authenticated account does not have an email address."
            );

        }


        // =================================================
        // VERIFY CURRENT PASSWORD
        // =================================================
        // Use a separate, temporary Supabase client.
        // This avoids replacing the main client's session.
        //
        // The existing supabase.js remains unchanged.
        // =================================================

        const verificationClient =
            window.supabase.createClient(
                "https://esbbplcndwkhkrkghayw.supabase.co",
                "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVzYmJwbGNuZHdraGtya2doYXl3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODU0MzkzOTQsImV4cCI6MjEwMTAxNTM5fQ.REPLACE_WITH_YOUR_EXISTING_PUBLIC_ANON_KEY",
                {
                    auth: {
                        persistSession: false,
                        autoRefreshToken: false,
                        detectSessionInUrl: false
                    }
                }
            );


        const {
            data: verificationData,
            error: verificationError
        } = await verificationClient.auth.signInWithPassword({

            email: email,

            password: oldPassword

        });


        if (
            verificationError ||
            !verificationData ||
            !verificationData.user ||
            verificationData.user.id !== session.user.id
        ) {

            console.error(
                "Password verification failed:",
                verificationError
            );

            showMessage(
                "Current password could not be verified. Check your password and try again.",
                "red"
            );

            return;

        }


        // =================================================
        // CONFIRM THE MAIN SESSION IS STILL VALID
        // =================================================

        const {
            data: { user },
            error: userError
        } = await client.auth.getUser();

        if (
            userError ||
            !user ||
            user.id !== session.user.id
        ) {

            throw new Error(
                "Your login session has changed. Please log in again."
            );

        }


        // =================================================
        // UPDATE AUTHENTICATED USER PASSWORD
        // =================================================

        if (updateButton) {

            updateButton.textContent = "Updating password...";

        }


        const {
            data: updateData,
            error: updateError
        } = await client.auth.updateUser({

            password: newPassword

        });


        if (updateError) {

            console.error(
                "Supabase password update error:",
                updateError
            );

            throw new Error(updateError.message);

        }


        if (!updateData || !updateData.user) {

            throw new Error(
                "Supabase did not confirm the password update."
            );

        }


        // =================================================
        // SUCCESS
        // =================================================

        showMessage(
            "Password changed successfully!",
            "green"
        );


        document
            .getElementById("passwordForm")
            .reset();


        // =================================================
        // RETURN TO APPROPRIATE DASHBOARD
        // =================================================

        setTimeout(function () {

            redirectToDashboard(client);

        }, 1800);


    } catch (error) {

        console.error(
            "Change password error:",
            error
        );

        showMessage(
            error.message ||
                "An unexpected error occurred. Please try again.",
            "red"
        );

    } finally {

        if (updateButton) {

            updateButton.disabled = false;

            updateButton.textContent = "Update Password";

        }

    }

}


// =========================================================
// INITIALIZE PAGE
// =========================================================

document.addEventListener(
    "DOMContentLoaded",
    async function () {

        const client = getSupabaseClient();

        if (!client) {

            showMessage(
                "Supabase is not initialized. Check that supabase.js loads before change_password.js.",
                "red"
            );

            return;

        }


        try {

            await getCurrentSession(client);

        } catch (error) {

            showMessage(
                "Please log in before changing your password.",
                "red"
            );

            setTimeout(function () {

                window.location.href = "login.html";

            }, 1800);

            return;

        }


        // -----------------------------------------------
        // FORM SUBMISSION
        // -----------------------------------------------

        const form =
            document.getElementById("passwordForm");

        if (form) {

            form.addEventListener(
                "submit",
                changePassword
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
                function () {

                    redirectToDashboard(client);

                }
            );

        }

    }
);