// =========================================================
// MUNKA PIGGERY FARM
// SECURE CHANGE PASSWORD SYSTEM
// =========================================================
// Supports:
// Super Admin, Owner/Admin, Farm Manager,
// Serviceman, Farrowman, Sales Officer,
// Veterinary Officer and Farm Worker.
//
// Passwords are managed by Supabase Auth.
// Never verify passwords using users.password.
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
// INITIALIZE PAGE
// =========================================================

document.addEventListener("DOMContentLoaded", async function () {

    const form = document.getElementById("passwordForm");
    const updateButton = document.getElementById("updatePasswordBtn");
    const backButton = document.getElementById("backButton");

    if (!window.supabaseClient) {
        showMessage(
            "Supabase is not initialized. Please reload the page.",
            "red"
        );
        return;
    }

    // Check existing login session.
    const {
        data: { session },
        error
    } = await supabaseClient.auth.getSession();

    if (error || !session) {
        showMessage(
            "Your login session has expired. Please login again.",
            "red"
        );

        setTimeout(() => {
            window.location.href = "login.html";
        }, 1800);

        return;
    }


    // =====================================================
    // PASSWORD FORM
    // =====================================================

    if (form) {
        form.addEventListener("submit", async function (event) {

            event.preventDefault();

            const oldPassword =
                document.getElementById("oldPassword").value;

            const newPassword =
                document.getElementById("newPassword").value;

            const confirmPassword =
                document.getElementById("confirmPassword").value;


            // ---------------------------------------------
            // VALIDATION
            // ---------------------------------------------

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
                    "The new password must contain at least 6 characters.",
                    "red"
                );
                return;
            }

            if (oldPassword === newPassword) {
                showMessage(
                    "Your new password must differ from your current password.",
                    "red"
                );
                return;
            }


            // ---------------------------------------------
            // DISABLE BUTTON
            // ---------------------------------------------

            updateButton.disabled = true;
            updateButton.textContent = "Verifying password...";


            try {

                // -----------------------------------------
                // GET CURRENT SESSION
                // -----------------------------------------

                const {
                    data: { session: currentSession },
                    error: sessionError
                } = await supabaseClient.auth.getSession();

                if (sessionError || !currentSession) {
                    throw new Error(
                        "Your session has expired. Please login again."
                    );
                }

                const email = currentSession.user.email;

                if (!email) {
                    throw new Error(
                        "Your authenticated email could not be identified."
                    );
                }


                // -----------------------------------------
                // CREATE SEPARATE CLIENT FOR VERIFICATION
                // -----------------------------------------
                // This avoids replacing the main client's
                // active session during password verification.
                //
                // Uses the same URL and anon/publishable key
                // as the main Supabase client.
                // -----------------------------------------

                const supabaseUrl =
                    window.SUPABASE_URL ||
                    window.supabaseUrl;

                const supabaseKey =
                    window.SUPABASE_ANON_KEY ||
                    window.SUPABASE_PUBLISHABLE_KEY ||
                    window.supabaseAnonKey;

                if (!supabaseUrl || !supabaseKey) {
                    throw new Error(
                        "Supabase configuration is missing. Check supabase.js."
                    );
                }

                const verificationClient =
                    window.supabase.createClient(
                        supabaseUrl,
                        supabaseKey,
                        {
                            auth: {
                                persistSession: false,
                                autoRefreshToken: false,
                                detectSessionInUrl: false
                            }
                        }
                    );


                // -----------------------------------------
                // VERIFY CURRENT PASSWORD
                // -----------------------------------------

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
                    !verificationData.user
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


                // -----------------------------------------
                // VERIFY MAIN SESSION STILL BELONGS TO USER
                // -----------------------------------------

                const {
                    data: { user: currentUser },
                    error: userError
                } = await supabaseClient.auth.getUser();

                if (
                    userError ||
                    !currentUser ||
                    currentUser.id !== currentSession.user.id
                ) {
                    throw new Error(
                        "Your login session changed. Please reload the page and try again."
                    );
                }


                // -----------------------------------------
                // UPDATE PASSWORD
                // -----------------------------------------

                updateButton.textContent = "Updating password...";

                const {
                    data: updateData,
                    error: updateError
                } = await supabaseClient.auth.updateUser({
                    password: newPassword
                });

                if (updateError) {
                    console.error(
                        "Password update failed:",
                        updateError
                    );

                    throw new Error(updateError.message);
                }

                if (!updateData || !updateData.user) {
                    throw new Error(
                        "Supabase did not confirm the password update."
                    );
                }


                // -----------------------------------------
                // SUCCESS
                // -----------------------------------------

                showMessage(
                    "Password changed successfully!",
                    "green"
                );

                form.reset();


                // -----------------------------------------
                // RETURN TO CORRECT DASHBOARD
                // -----------------------------------------

                setTimeout(async function () {

                    const {
                        data: { session: finalSession }
                    } = await supabaseClient.auth.getSession();

                    if (!finalSession) {
                        window.location.href = "login.html";
                        return;
                    }

                    const {
                        data: profile,
                        error: profileError
                    } = await supabaseClient
                        .from("users")
                        .select("role")
                        .eq("auth_user_id", finalSession.user.id)
                        .single();

                    if (
                        !profileError &&
                        profile &&
                        String(profile.role).trim().toLowerCase() ===
                            "super admin"
                    ) {
                        window.location.href = "superadmin.html";
                    } else {
                        window.location.href = "dashboard.html";
                    }

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

                updateButton.disabled = false;
                updateButton.textContent = "Update Password";

            }

        });
    }


    // =====================================================
    // BACK BUTTON
    // =====================================================

    if (backButton) {

        backButton.addEventListener("click", async function () {

            const {
                data: { session: currentSession }
            } = await supabaseClient.auth.getSession();

            if (!currentSession) {
                window.location.href = "login.html";
                return;
            }

            const {
                data: profile,
                error: profileError
            } = await supabaseClient
                .from("users")
                .select("role")
                .eq("auth_user_id", currentSession.user.id)
                .single();

            if (
                !profileError &&
                profile &&
                String(profile.role).trim().toLowerCase() ===
                    "super admin"
            ) {
                window.location.href = "superadmin.html";
            } else {
                window.location.href = "dashboard.html";
            }

        });

    }

});