
// ============================================================
// MUNKA PIGGERY MANAGEMENT SYSTEM
// SECURE PASSWORD RESET
// SUPABASE AUTH - PKCE RECOVERY
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

    function showMessage(text, type = "error") {
        message.textContent = text;
        message.className = "message " + type;
    }

    function setButtonState() {
        resetButton.disabled = isSubmitting || !recoveryReady;

        resetButton.textContent = isSubmitting
            ? "Updating Password..."
            : recoveryReady
                ? "Update Password"
                : "Verifying Reset Link...";
    }

    function isStrongPassword(password) {
        return (
            password.length >= 8 &&
            /[A-Z]/.test(password) &&
            /[a-z]/.test(password) &&
            /[0-9]/.test(password)
        );
    }

    async function verifyRecoverySession() {

        if (
            typeof supabaseClient === "undefined" ||
            !supabaseClient.auth
        ) {
            throw new Error(
                "Password recovery service is unavailable. Please contact the administrator."
            );
        }

        const auth = supabaseClient.auth;

        const currentUrl = new URL(window.location.href);

        const params = currentUrl.searchParams;

        const hashParams = new URLSearchParams(
            window.location.hash.replace(/^#/, "")
        );

        // ----------------------------------------------------
        // CHECK FOR AUTHENTICATION ERRORS IN THE URL
        // ----------------------------------------------------

        const urlError =
            params.get("error_description") ||
            hashParams.get("error_description");

        if (urlError) {
            throw new Error(
                "Your password reset link is invalid or expired. Please request a new link."
            );
        }

        // ----------------------------------------------------
        // WAIT FOR SUPABASE TO PROCESS THE RECOVERY LINK
        // ----------------------------------------------------

        // IMPORTANT:
        // Do not call exchangeCodeForSession() here.
        // Supabase automatically handles PKCE URL codes
        // because detectSessionInUrl is enabled by default.
        //
        // Also do not manually call setSession() for normal
        // PKCE recovery links.

        const code = params.get("code");

        const tokenHash = params.get("token_hash");

        const accessToken = hashParams.get("access_token");

        const refreshToken = hashParams.get("refresh_token");

        const hashError = hashParams.get("error");

        if (hashError) {
            throw new Error(
                "Your password recovery link could not be verified. Please request another link."
            );
        }

        // ----------------------------------------------------
        // HANDLE TOKEN HASH LINKS
        // ----------------------------------------------------

        // OTP token_hash links require explicit verification.
        // Supabase does not automatically verify token_hash
        // links in the same way as PKCE code links.

        if (tokenHash) {

            if (params.get("type") !== "recovery") {
                throw new Error(
                    "This is not a valid password recovery link."
                );
            }

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
                    "Your password reset link is invalid or expired. Please request another link."
                );
            }
        }

        // ----------------------------------------------------
        // CHECK SESSION
        // ----------------------------------------------------

        let session = null;

        // Allow Supabase time to process an incoming PKCE code.
        for (let attempt = 0; attempt < 20; attempt++) {

            const { data, error } = await auth.getSession();

            if (error) {
                console.error(
                    "SESSION CHECK ERROR:",
                    error
                );

                throw new Error(
                    "Unable to verify your password recovery session."
                );
            }

            session = data.session;

            if (session) {
                break;
            }

            if (!code && !(accessToken && refreshToken)) {
                break;
            }

            await new Promise(resolve =>
                setTimeout(resolve, 250)
            );
        }

        if (!session) {
            throw new Error(
                "No valid recovery session was found. Your link may have expired or already been used. Please request a new reset link."
            );
        }

        // ----------------------------------------------------
        // CLEAN THE URL AFTER SESSION ESTABLISHMENT
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

        return session;
    }

    // --------------------------------------------------------
    // INITIALISE RESET PAGE
    // --------------------------------------------------------

    async function initialiseResetPage() {

        if (recoveryCheckStarted) {
            return;
        }

        recoveryCheckStarted = true;

        newPasswordInput.disabled = true;
        confirmPasswordInput.disabled = true;

        resetButton.disabled = true;

        showMessage(
            "Verifying your secure password reset link...",
            "info"
        );

        try {

            await verifyRecoverySession();

            recoveryReady = true;

            newPasswordInput.disabled = false;
            confirmPasswordInput.disabled = false;

            setButtonState();

            showMessage(
                "Your password reset link has been verified. You may now create a new password.",
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

    // --------------------------------------------------------
    // UPDATE PASSWORD
    // --------------------------------------------------------

    form.addEventListener("submit", async function (event) {

        event.preventDefault();

        if (isSubmitting) {
            return;
        }

        if (!recoveryReady) {
            showMessage(
                "Your recovery link has not been verified.",
                "error"
            );

            return;
        }

        const newPassword = newPasswordInput.value;

        const confirmPassword = confirmPasswordInput.value;

        if (newPassword !== confirmPassword) {

            showMessage(
                "Your passwords do not match.",
                "error"
            );

            confirmPasswordInput.focus();

            return;
        }

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

            // Confirm the recovery session still exists.

            const { data, error: sessionError } =
                await supabaseClient.auth.getSession();

            if (sessionError || !data.session) {
                throw new Error(
                    "Your recovery session has expired. Please request a new reset link."
                );
            }

            // Update password through Supabase Authentication.

            const { error: updateError } =
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

            // Optional audit logging.

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

            // Clear password fields.

            newPasswordInput.value = "";
            confirmPasswordInput.value = "";

            recoveryReady = false;

            showMessage(
                "SUCCESS! Your password has been changed. You can now log in using your new password.",
                "success"
            );

            // Sign out after successful password change.

            try {

                await supabaseClient.auth.signOut();

            } catch (signOutError) {

                console.warn(
                    "Sign-out warning:",
                    signOutError
                );
            }

            // Return to login.

            window.setTimeout(function () {

                window.location.replace("login.html");

            }, 2500);

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

    // --------------------------------------------------------
    // START RECOVERY PROCESS
    // --------------------------------------------------------

    setButtonState();

    initialiseResetPage();

})();
