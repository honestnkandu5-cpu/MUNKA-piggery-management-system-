
// ============================================================
// MUNKA PIGGERY MANAGEMENT SYSTEM
// SECURE PASSWORD RESET
// SUPABASE AUTH - PKCE + TOKEN RECOVERY
// COMPLETE UPDATED VERSION
// ============================================================

"use strict";

(function () {

    const form = document.getElementById("resetPasswordForm");
    const newPasswordInput = document.getElementById("newPassword");
    const confirmPasswordInput = document.getElementById("confirmPassword");
    const message = document.getElementById("message");
    const resetButton = document.getElementById("resetButton");

    let isSubmitting = false;
    let recoveryReady = false;
    let recoveryCheckStarted = false;

    // ========================================================
    // MESSAGE DISPLAY
    // ========================================================

    function showMessage(text, type = "error") {

        if (!message) return;

        message.textContent = text;
        message.className = "message " + type;
    }

    // ========================================================
    // BUTTON STATE
    // ========================================================

    function setButtonState() {

        if (!resetButton) return;

        resetButton.disabled =
            isSubmitting || !recoveryReady;

        if (isSubmitting) {

            resetButton.textContent = "Updating Password...";

        } else if (recoveryReady) {

            resetButton.textContent = "Update Password";

        } else {

            resetButton.textContent = "Verifying Reset Link...";
        }
    }

    // ========================================================
    // PASSWORD VALIDATION
    // ========================================================

    function isStrongPassword(password) {

        return (
            password.length >= 8 &&
            /[A-Z]/.test(password) &&
            /[a-z]/.test(password) &&
            /[0-9]/.test(password)
        );
    }

    // ========================================================
    // GET CURRENT SESSION
    // ========================================================

    async function getCurrentSession(auth) {

        const { data, error } = await auth.getSession();

        if (error) {
            throw error;
        }

        return data.session;
    }

    // ========================================================
    // VERIFY PASSWORD RECOVERY LINK
    // ========================================================

    async function verifyRecoverySession() {

        if (
            typeof supabaseClient === "undefined" ||
            !supabaseClient.auth
        ) {

            throw new Error(
                "Supabase password recovery service is unavailable. Please contact the administrator."
            );
        }

        const auth = supabaseClient.auth;

        const currentUrl = new URL(window.location.href);

        const params = currentUrl.searchParams;

        const hashParams = new URLSearchParams(
            window.location.hash.replace(/^#/, "")
        );

        // ----------------------------------------------------
        // CHECK URL ERRORS
        // ----------------------------------------------------

        const urlError =
            params.get("error_description") ||
            hashParams.get("error_description") ||
            params.get("error") ||
            hashParams.get("error");

        if (urlError) {

            console.error("RECOVERY URL ERROR:", urlError);

            throw new Error(
                "Your password reset link is invalid or expired. Please request a new link."
            );
        }

        // ----------------------------------------------------
        // READ RECOVERY CREDENTIALS
        // ----------------------------------------------------

        const code = params.get("code");

        const tokenHash = params.get("token_hash");

        const queryType = params.get("type");

        const hashType = hashParams.get("type");

        const accessToken =
            hashParams.get("access_token");

        const refreshToken =
            hashParams.get("refresh_token");

        const hashErrorCode =
            hashParams.get("error_code");

        if (hashErrorCode) {

            throw new Error(
                "Your password reset link could not be verified. Please request a new link."
            );
        }

        // A recovery page must receive recovery credentials.
        const hasRecoveryCredentials = Boolean(
            code ||
            tokenHash ||
            (accessToken && refreshToken)
        );

        if (!hasRecoveryCredentials) {

            throw new Error(
                "No password recovery information was found in this link. Please request a new password reset email."
            );
        }

        if (
            tokenHash &&
            queryType !== "recovery"
        ) {

            throw new Error(
                "This is not a valid password recovery link."
            );
        }

        if (
            hashType &&
            hashType !== "recovery"
        ) {

            throw new Error(
                "This link is not intended for password recovery."
            );
        }

        // ----------------------------------------------------
        // INITIALISE SUPABASE AUTH
        // ----------------------------------------------------

        // Supabase may automatically process PKCE codes or
        // implicit tokens when detectSessionInUrl is enabled.

        if (typeof auth.initialize === "function") {

            try {

                await auth.initialize();

            } catch (initialiseError) {

                console.warn(
                    "Supabase initialisation notice:",
                    initialiseError
                );
            }
        }

        // ----------------------------------------------------
        // METHOD 1: TOKEN HASH RECOVERY
        // ----------------------------------------------------

        if (tokenHash) {

            const { error } = await auth.verifyOtp({

                token_hash: tokenHash,

                type: "recovery"

            });

            if (error) {

                console.error(
                    "RECOVERY OTP ERROR:",
                    error
                );

                throw new Error(
                    "Your password reset link is invalid, expired or already used. Please request another link."
                );
            }
        }

        // ----------------------------------------------------
        // CHECK WHETHER SUPABASE ALREADY CREATED A SESSION
        // ----------------------------------------------------

        let session = await getCurrentSession(auth);

        // ----------------------------------------------------
        // METHOD 2: PKCE CODE EXCHANGE
        // ----------------------------------------------------

        // If automatic URL processing did not establish a
        // session, explicitly exchange the recovery code.

        if (!session && code) {

            console.log(
                "Attempting PKCE recovery code exchange..."
            );

            const { data, error } =
                await auth.exchangeCodeForSession(code);

            if (error) {

                console.error(
                    "PKCE CODE EXCHANGE ERROR:",
                    error
                );

                // Check again in case automatic processing
                // completed while the exchange was running.

                session = await getCurrentSession(auth);

                if (!session) {

                    throw new Error(
                        "The recovery code could not be exchanged. The link may have expired or already been used. Please request a new link."
                    );
                }

            } else {

                session = data.session ||
                    await getCurrentSession(auth);
            }
        }

        // ----------------------------------------------------
        // METHOD 3: ACCESS TOKEN + REFRESH TOKEN
        // ----------------------------------------------------

        // Supports older implicit-flow recovery links.

        if (
            !session &&
            accessToken &&
            refreshToken
        ) {

            console.log(
                "Attempting token-based recovery..."
            );

            const { data, error } =
                await auth.setSession({

                    access_token: accessToken,

                    refresh_token: refreshToken

                });

            if (error) {

                console.error(
                    "RECOVERY SESSION ERROR:",
                    error
                );

                throw new Error(
                    "Your password recovery session could not be established. Please request another reset link."
                );
            }

            session = data.session;
        }

        // ----------------------------------------------------
        // FINAL SESSION VERIFICATION
        // ----------------------------------------------------

        if (!session) {

            session = await getCurrentSession(auth);
        }

        if (!session) {

            throw new Error(
                "No valid recovery session was established. Please request a new password reset link."
            );
        }

        // ----------------------------------------------------
        // CLEAN URL AFTER SUCCESSFUL VERIFICATION
        // ----------------------------------------------------

        try {

            window.history.replaceState(
                {},
                document.title,
                window.location.pathname
            );

        } catch (error) {

            console.warn(
                "URL cleanup warning:",
                error
            );
        }

        console.log(
            "Password recovery session successfully verified."
        );

        return session;
    }

    // ========================================================
    // INITIALISE RESET PAGE
    // ========================================================

    async function initialiseResetPage() {

        if (recoveryCheckStarted) return;

        recoveryCheckStarted = true;

        newPasswordInput.disabled = true;
        confirmPasswordInput.disabled = true;
        resetButton.disabled = true;

        showMessage(
            "Verifying your secure password reset link. Please wait...",
            "info"
        );

        try {

            await verifyRecoverySession();

            recoveryReady = true;

            newPasswordInput.disabled = false;
            confirmPasswordInput.disabled = false;

            setButtonState();

            showMessage(
                "Your password reset link has been verified. You may now create your new password.",
                "success"
            );

        } catch (error) {

            console.error(
                "RECOVERY INITIALISATION ERROR:",
                error
            );

            recoveryReady = false;

            newPasswordInput.disabled = true;
            confirmPasswordInput.disabled = true;

            resetButton.disabled = true;

            resetButton.textContent =
                "Reset Link Not Verified";

            showMessage(
                error.message ||
                "Password recovery could not be verified. Please request another reset link.",
                "error"
            );
        }
    }

    // ========================================================
    // UPDATE PASSWORD
    // ========================================================

    form.addEventListener("submit", async function (event) {

        event.preventDefault();

        if (isSubmitting) return;

        if (!recoveryReady) {

            showMessage(
                "Your recovery link has not been verified. Please request a new link if necessary.",
                "error"
            );

            return;
        }

        const newPassword = newPasswordInput.value;

        const confirmPassword = confirmPasswordInput.value;

        // ----------------------------------------------------
        // CHECK PASSWORD MATCH
        // ----------------------------------------------------

        if (newPassword !== confirmPassword) {

            showMessage(
                "Your passwords do not match.",
                "error"
            );

            confirmPasswordInput.focus();

            return;
        }

        // ----------------------------------------------------
        // CHECK PASSWORD STRENGTH
        // ----------------------------------------------------

        if (!isStrongPassword(newPassword)) {

            showMessage(
                "Your password must contain at least 8 characters, an uppercase letter, a lowercase letter and a number.",
                "error"
            );

            newPasswordInput.focus();

            return;
        }

        isSubmitting = true;

        setButtonState();

        showMessage(
            "Updating your password securely...",
            "info"
        );

        try {

            // ------------------------------------------------
            // CONFIRM RECOVERY SESSION
            // ------------------------------------------------

            const { data, error: sessionError } =
                await supabaseClient.auth.getSession();

            if (sessionError || !data.session) {

                throw new Error(
                    "Your recovery session has expired. Please request a new reset link."
                );
            }

            // ------------------------------------------------
            // UPDATE SUPABASE AUTH PASSWORD
            // ------------------------------------------------

            const { data: updateData, error: updateError } =
                await supabaseClient.auth.updateUser({

                    password: newPassword

                });

            if (updateError) {

                console.error(
                    "PASSWORD UPDATE ERROR:",
                    updateError
                );

                throw new Error(
                    updateError.message ||
                    "Your password could not be updated."
                );
            }

            if (!updateData || !updateData.user) {

                throw new Error(
                    "Supabase did not confirm the password update. Please try again."
                );
            }

            // ------------------------------------------------
            // OPTIONAL AUDIT LOGGING
            // ------------------------------------------------

            try {

                const { error: logError } =
                    await supabaseClient.rpc(
                        "log_password_reset"
                    );

                if (logError) {

                    console.warn(
                        "Password audit log unavailable:",
                        logError.message
                    );
                }

            } catch (logError) {

                console.warn(
                    "Password audit logging failed:",
                    logError
                );
            }

            // ------------------------------------------------
            // CLEAR PASSWORD FIELDS
            // ------------------------------------------------

            newPasswordInput.value = "";
            confirmPasswordInput.value = "";

            recoveryReady = false;

            newPasswordInput.disabled = true;
            confirmPasswordInput.disabled = true;

            setButtonState();

            // ------------------------------------------------
            // SUCCESS MESSAGE
            // ------------------------------------------------

            showMessage(
                "SUCCESS! Your password has been changed. You can now log in using your new password.",
                "success"
            );

            // ------------------------------------------------
            // SIGN OUT
            // ------------------------------------------------

            try {

                await supabaseClient.auth.signOut();

            } catch (signOutError) {

                console.warn(
                    "Sign-out warning:",
                    signOutError
                );
            }

            // ------------------------------------------------
            // RETURN TO LOGIN
            // ------------------------------------------------

            window.setTimeout(function () {

                window.location.replace("login.html");

            }, 3000);

        } catch (error) {

            console.error(
                "PASSWORD RESET ERROR:",
                error
            );

            showMessage(
                error.message ||
                "Unable to update your password. Please try again.",
                "error"
            );

        } finally {

            isSubmitting = false;

            setButtonState();
        }
    });

    // ========================================================
    // START RECOVERY PROCESS
    // ========================================================

    setButtonState();

    initialiseResetPage();

})();
