
// ============================================================
// MUNKA PIGGERY MANAGEMENT SYSTEM
// SECURE FORGOT PASSWORD
// SUPABASE AUTH + CLOUDFLARE TURNSTILE
// ============================================================

"use strict";

(function () {
    const form = document.getElementById("forgotPasswordForm");
    const emailInput = document.getElementById("email");
    const message = document.getElementById("message");
    const resetButton = document.getElementById("resetButton");
    const widgetContainer = document.getElementById("turnstileWidget");

    // Same public Turnstile site key used on login.html.
    const TURNSTILE_SITE_KEY = "0x4AAAAAAFMo7xO_ThI6laYl";

    let turnstileWidgetId = null;
    let captchaToken = "";
    let isSubmitting = false;
    let captchaReady = false;

    function showMessage(text, type) {
        message.textContent = text;
        message.className = type || "";
    }

    function setButtonState() {
        resetButton.disabled = isSubmitting || !captchaReady;

        if (isSubmitting) {
            resetButton.textContent = "Processing Request...";
        } else if (!captchaReady) {
            resetButton.textContent = "Loading Security Verification...";
        } else {
            resetButton.textContent = "Send Password Reset Link";
        }
    }

    function resetCaptcha() {
        captchaToken = "";
        captchaReady = false;
        setButtonState();

        if (
            window.turnstile &&
            turnstileWidgetId !== null
        ) {
            try {
                window.turnstile.reset(turnstileWidgetId);
            } catch (error) {
                console.error("Turnstile reset failed:", error);
            }
        }
    }

    function renderTurnstile() {
        if (!window.turnstile || turnstileWidgetId !== null) {
            return;
        }

        try {
            turnstileWidgetId = window.turnstile.render(
                widgetContainer,
                {
                    sitekey: TURNSTILE_SITE_KEY,
                    theme: "light",
                    callback: function (token) {
                        captchaToken = token || "";
                        captchaReady = Boolean(captchaToken);

                        if (captchaReady) {
                            showMessage("", "");
                        }

                        setButtonState();
                    },
                    "expired-callback": function () {
                        captchaToken = "";
                        captchaReady = false;

                        showMessage(
                            "Your security verification expired. Please verify again.",
                            "error"
                        );

                        setButtonState();
                    },
                    "error-callback": function (errorCode) {
                        captchaToken = "";
                        captchaReady = false;

                        console.error(
                            "Turnstile error code:",
                            errorCode
                        );

                        showMessage(
                            "Security verification could not complete. Please refresh the page and try again.",
                            "error"
                        );

                        setButtonState();
                    }
                }
            );

            // The widget is rendered, but the user must still
            // complete verification before submitting.
            resetButton.textContent = "Complete Security Verification";
            resetButton.disabled = true;
        } catch (error) {
            console.error("Turnstile rendering failed:", error);

            showMessage(
                "Security verification could not load. Please refresh the page.",
                "error"
            );
        }
    }

    // Cloudflare's script loads asynchronously.
    let attempts = 0;

    const turnstileLoader = setInterval(function () {
        attempts++;

        if (window.turnstile) {
            clearInterval(turnstileLoader);
            renderTurnstile();
            return;
        }

        if (attempts >= 100) {
            clearInterval(turnstileLoader);

            showMessage(
                "Security verification did not load. Check your internet connection and refresh the page.",
                "error"
            );

            resetButton.disabled = true;
            resetButton.textContent = "Verification Unavailable";
        }
    }, 300);

    form.addEventListener("submit", async function (event) {
        event.preventDefault();

        if (isSubmitting) {
            return;
        }

        const email = emailInput.value.trim().toLowerCase();

        if (!email) {
            showMessage(
                "Please enter your registered email address.",
                "error"
            );
            emailInput.focus();
            return;
        }

        const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

        if (!emailPattern.test(email)) {
            showMessage(
                "Please enter a valid email address.",
                "error"
            );
            emailInput.focus();
            return;
        }

        if (!captchaToken) {
            showMessage(
                "Please complete the Cloudflare security verification first.",
                "error"
            );
            return;
        }

        if (
            typeof supabaseClient === "undefined" ||
            !supabaseClient.auth
        ) {
            showMessage(
                "The password reset service is unavailable. Please try again later.",
                "error"
            );

            console.error(
                "supabaseClient is unavailable. Check supabase.js."
            );
            return;
        }

        isSubmitting = true;
        setButtonState();

        showMessage("Submitting your request securely...", "info");

        try {
            const resetUrl =
                window.location.origin + "/reset_password.html";

            const tokenToSubmit = captchaToken;

            const { error } =
                await supabaseClient.auth.resetPasswordForEmail(
                    email,
                    {
                        redirectTo: resetUrl,
                        captchaToken: tokenToSubmit
                    }
                );

            // CAPTCHA tokens should not be reused.
            resetCaptcha();

            if (error) {
                console.error(
                    "SUPABASE PASSWORD RESET ERROR:",
                    error
                );

                showMessage(
                    "We could not submit your reset request. Please verify again and retry. If the problem continues, contact the system administrator.",
                    "error"
                );

                return;
            }

            showMessage(
                "If an account exists for this email, a password reset link has been requested. Please check your inbox and spam folder.",
                "success"
            );
        } catch (error) {
            console.error(
                "FORGOT PASSWORD REQUEST FAILED:",
                error
            );

            resetCaptcha();

            showMessage(
                "The request could not be completed. Please check your internet connection, verify again, and retry.",
                "error"
            );
        } finally {
            isSubmitting = false;
            setButtonState();
        }
    });

    setButtonState();
})();
