
// ============================================================
// MUNKA PIGGERY MANAGEMENT SYSTEM
// SECURE PASSWORD RESET
// SUPABASE AUTH RECOVERY SESSION HANDLING
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

    function showMessage(text, type = "error") {
        message.textContent = text;
        message.className = "message " + type;
    }

    function setButtonBusy(busy) {
        resetButton.disabled = busy || !recoveryReady;
        resetButton.textContent = busy
            ? "Updating Password..."
            : "Update Password";
    }

    function isStrongPassword(password) {
        return (
            password.length >= 8 &&
            /[A-Z]/.test(password) &&
            /[a-z]/.test(password) &&
            /[0-9]/.test(password)
        );
    }

    async function establishRecoverySession() {
        if (
            typeof supabaseClient === "undefined" ||
            !supabaseClient.auth
        ) {
            throw new Error(
                "Supabase is unavailable. Check supabase.js."
            );
        }

        const auth = supabaseClient.auth;
        const currentUrl = new URL(window.location.href);
        const params = currentUrl.searchParams;
        const hashParams = new URLSearchParams(
            window.location.hash.replace(/^#/, "")
        );

        // 1. Handle Supabase PKCE recovery links containing ?code=...
        const code = params.get("code");

        if (code) {
            const { error } = await auth.exchangeCodeForSession(code);

            if (error) {
                console.error(
                    "RECOVERY CODE EXCHANGE ERROR:",
                    error
                );

                throw new Error(
                    "The recovery link could not be verified. Please request a new reset link."
                );
            }
        }

        // 2. Handle links containing token_hash and type=recovery.
        const tokenHash = params.get("token_hash");
        const queryType = params.get("type");

        if (tokenHash) {
            if (queryType !== "recovery") {
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
                    "RECOVERY TOKEN VERIFICATION ERROR:",
                    error
                );

                throw new Error(
                    "The recovery link is invalid or expired. Please request a new reset link."
                );
            }
        }

        // 3. Handle legacy implicit-flow links with URL hash tokens.
        const accessToken = hashParams.get("access_token");
        const refreshToken = hashParams.get("refresh_token");
        const hashType = hashParams.get("type");

        if (accessToken && refreshToken) {
            if (hashType && hashType !== "recovery") {
                throw new Error(
                    "This link is not a password recovery link."
                );
            }

            const { error } = await auth.setSession({
                access_token: accessToken,
                refresh_token: refreshToken
            });

            if (error) {
                console.error(
                    "RECOVERY SESSION ERROR:",
                    error
                );

                throw new Error(
                    "The recovery session could not be established. Please request a new reset link."
                );
            }
        }

        // Check for a session after processing any supported link format.
        const { data, error } = await auth.getSession();

        if (error) {
            console.error(
                "RECOVERY SESSION CHECK ERROR:",
                error
            );

            throw new Error(
                "Unable to verify your recovery session. Please request a new reset link."
            );
        }

        if (!data.session) {
            throw new Error(
                "No valid recovery session was found. The link may have expired, already been used, or failed to open correctly. Please request a new reset link."
            );
        }

        // Remove recovery credentials from the visible address bar.
        // The authenticated session remains managed by Supabase.
        try {
            window.history.replaceState(
                {},
                document.title,
                window.location.pathname
            );
        } catch (error) {
            console.warn(
                "Could not clean the recovery URL:",
                error
            );
        }

        return data.session;
    }

    async function initialiseResetPage() {
        resetButton.disabled = true;
        resetButton.textContent = "Verifying Reset Link...";
        newPasswordInput.disabled = true;
        confirmPasswordInput.disabled = true;

        try {
            await establishRecoverySession();

            recoveryReady = true;

            newPasswordInput.disabled = false;
            confirmPasswordInput.disabled = false;

            setButtonBusy(false);

            showMessage(
                "Your reset link is verified. Enter your new password below.",
                "success"
            );
        } catch (error) {
            console.error(
                "PASSWORD RECOVERY INITIALISATION ERROR:",
                error
            );

            recoveryReady = false;

            showMessage(
                error.message ||
                "Unable to verify the reset link. Please request a new one.",
                "error"
            );

            resetButton.disabled = true;
            resetButton.textContent = "Reset Link Not Verified";

            newPasswordInput.disabled = true;
            confirmPasswordInput.disabled = true;
        }
    }

    form.addEventListener("submit", async function (event) {
        event.preventDefault();

        if (isSubmitting) {
            return;
        }

        if (!recoveryReady) {
            showMessage(
                "Your reset link has not been verified. Please request a new reset link.",
                "error"
            );
            return;
        }

        const newPassword = newPasswordInput.value;
        const confirmPassword = confirmPasswordInput.value;

        if (newPassword !== confirmPassword) {
            showMessage(
                "The passwords do not match. Please try again.",
                "error"
            );
            confirmPasswordInput.focus();
            return;
        }

        if (!isStrongPassword(newPassword)) {
            showMessage(
                "Password must contain at least 8 characters, one uppercase letter, one lowercase letter and one number.",
                "error"
            );
            newPasswordInput.focus();
            return;
        }

        isSubmitting = true;
        setButtonBusy(true);

        showMessage("Updating your password securely...", "info");

        try {
            // Confirm that the recovery session still exists.
            const { data: sessionData, error: sessionError } =
                await supabaseClient.auth.getSession();

            if (sessionError || !sessionData.session) {
                throw new Error(
                    "Your recovery session has expired. Please request a new reset link."
                );
            }

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

            // Optional audit logging. Failure to log must not
            // undo a successful password update.
            try {
                const { error: logError } =
                    await supabaseClient.rpc("log_password_reset");

                if (logError) {
                    console.error(
                        "PASSWORD RESET AUDIT LOG ERROR:",
                        logError
                    );
                }
            } catch (logError) {
                console.error(
                    "PASSWORD RESET AUDIT LOG ERROR:",
                    logError
                );
            }

            showMessage(
                "Your password has been updated successfully. Returning to login...",
                "success"
            );

            newPasswordInput.value = "";
            confirmPasswordInput.value = "";

            // Sign out the recovery session after the update.
            try {
                const { error: signOutError } =
                    await supabaseClient.auth.signOut();

                if (signOutError) {
                    console.warn(
                        "Recovery-session sign-out warning:",
                        signOutError
                    );
                }
            } catch (signOutError) {
                console.warn(
                    "Recovery-session sign-out warning:",
                    signOutError
                );
            }

            window.setTimeout(function () {
                window.location.replace("login.html");
            }, 2000);

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

            if (recoveryReady) {
                setButtonBusy(false);
            }
        }
    });

    // Do not display the password form as ready until the link
    // has been processed and a valid Supabase session is present.
    initialiseResetPage();
})();
