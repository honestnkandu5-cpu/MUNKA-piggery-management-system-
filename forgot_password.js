// ============================================================
// MUNKA PIGGERY MANAGEMENT SYSTEM
// SECURE FORGOT PASSWORD
// SUPABASE AUTH + CLOUDFLARE TURNSTILE
// COMPLETE UPDATED VERSION
// ============================================================

"use strict";

(function () {

    // --------------------------------------------------------
    // PAGE ELEMENTS
    // --------------------------------------------------------

    const form = document.getElementById("forgotPasswordForm");
    const emailInput = document.getElementById("email");
    const message = document.getElementById("message");
    const resetButton = document.getElementById("resetButton");
    const widgetContainer = document.getElementById("turnstileWidget");

    // --------------------------------------------------------
    // CONFIGURATION
    // --------------------------------------------------------

    const TURNSTILE_SITE_KEY = "0x4AAAAAAFMo7xO_ThI6laYl";

    // Always use the official MUNKA custom domain.
    const RESET_REDIRECT_URL =
        "https://munkapiggery.co.zm/reset_password.html";

    // --------------------------------------------------------
    // SECURITY STATE
    // --------------------------------------------------------

    let turnstileWidgetId = null;
    let captchaToken = "";
    let isSubmitting = false;
    let captchaReady = false;

    // --------------------------------------------------------
    // CHECK REQUIRED PAGE ELEMENTS
    // --------------------------------------------------------

    if (
        !form ||
        !emailInput ||
        !message ||
        !resetButton ||
        !widgetContainer
    ) {
        console.error(
            "Forgot password page is missing one or more required HTML elements."
        );
        return;
    }

    // --------------------------------------------------------
    // DISPLAY MESSAGES
    // --------------------------------------------------------

    function showMessage(text, type) {
        message.textContent = text;
        message.className = type || "";
    }

    // --------------------------------------------------------
    // BUTTON STATE
    // --------------------------------------------------------

    function setButtonState() {

        resetButton.disabled =
            isSubmitting || !captchaReady;

        if (isSubmitting) {

            resetButton.textContent =
                "Processing Request...";

        } else if (!captchaReady) {

            resetButton.textContent =
                "Complete Security Verification";

        } else {

            resetButton.textContent =
                "Send Password Reset Link";
        }
    }

    // --------------------------------------------------------
    // RESET CLOUDFLARE CAPTCHA
    // --------------------------------------------------------

    function resetCaptcha() {

        captchaToken = "";
        captchaReady = false;

        setButtonState();

        if (
            window.turnstile &&
            turnstileWidgetId !== null
        ) {

            try {

                window.turnstile.reset(
                    turnstileWidgetId
                );

            } catch (error) {

                console.error(
                    "Turnstile reset failed:",
                    error
                );
            }
        }
    }

    // --------------------------------------------------------
    // RENDER CLOUDFLARE TURNSTILE
    // --------------------------------------------------------

    function renderTurnstile() {

        if (
            !window.turnstile ||
            turnstileWidgetId !== null
        ) {
            return;
        }

        try {

            turnstileWidgetId =
                window.turnstile.render(
                    widgetContainer,
                    {
                        sitekey: TURNSTILE_SITE_KEY,

                        theme: "light",

                        callback: function (token) {

                            captchaToken = token || "";

                            captchaReady =
                                Boolean(captchaToken);

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

            setButtonState();

        } catch (error) {

            console.error(
                "Turnstile rendering failed:",
                error
            );

            showMessage(
                "Security verification could not load. Please refresh the page.",
                "error"
            );
        }
    }

    // --------------------------------------------------------
    // LOAD CLOUDFLARE SCRIPT
    // --------------------------------------------------------

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

            captchaReady = false;

            resetButton.disabled = true;

            resetButton.textContent =
                "Verification Unavailable";
        }

    }, 300);

    // --------------------------------------------------------
    // PASSWORD RESET REQUEST
    // --------------------------------------------------------

    form.addEventListener("submit", async function (event) {

        event.preventDefault();

        if (isSubmitting) {
            return;
        }

        // ----------------------------------------------------
        // VALIDATE EMAIL
        // ----------------------------------------------------

        const email =
            emailInput.value.trim().toLowerCase();

        if (!email) {

            showMessage(
                "Please enter your registered email address.",
                "error"
            );

            emailInput.focus();

            return;
        }

        const emailPattern =
            /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

        if (!emailPattern.test(email)) {

            showMessage(
                "Please enter a valid email address.",
                "error"
            );

            emailInput.focus();

            return;
        }

        // ----------------------------------------------------
        // VALIDATE CAPTCHA
        // ----------------------------------------------------

        if (!captchaToken) {

            showMessage(
                "Please complete the Cloudflare security verification first.",
                "error"
            );

            return;
        }

        // ----------------------------------------------------
        // CHECK SUPABASE
        // ----------------------------------------------------

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

        // ----------------------------------------------------
        // START REQUEST
        // ----------------------------------------------------

        isSubmitting = true;

        setButtonState();

        showMessage(
            "Submitting your request securely...",
            "info"
        );

        try {

            const tokenToSubmit = captchaToken;

            // ------------------------------------------------
            // SUPABASE PASSWORD RESET
            // ALWAYS REDIRECT TO CUSTOM DOMAIN
            // ------------------------------------------------

            const { error } =
                await supabaseClient.auth.resetPasswordForEmail(
                    email,
                    {
                        redirectTo: RESET_REDIRECT_URL,
                        captchaToken: tokenToSubmit
                    }
                );

            // CAPTCHA TOKENS MUST NOT BE REUSED.
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

            // ------------------------------------------------
            // SUCCESS MESSAGE
            // ------------------------------------------------

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

    // --------------------------------------------------------
    // INITIAL BUTTON STATE
    // --------------------------------------------------------

    setButtonState();

})();