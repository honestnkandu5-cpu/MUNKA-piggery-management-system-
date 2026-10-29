
/* =====================================================
   MUNKA PIGGERY MANAGEMENT SYSTEM
   SECURE FORGOT PASSWORD
   SUPABASE AUTH + CLOUDFLARE TURNSTILE
   ===================================================== */

document.addEventListener("DOMContentLoaded", function () {
    const form = document.getElementById("forgotPasswordForm");
    const emailInput = document.getElementById("email");
    const message = document.getElementById("message");
    const resetButton = document.getElementById("resetButton");

    if (!form || !emailInput || !message || !resetButton) {
        console.error("Forgot password page elements are missing.");
        return;
    }

    form.addEventListener("submit", async function (event) {
        event.preventDefault();

        const email = emailInput.value.trim().toLowerCase();

        message.textContent = "";

        // Validate email
        if (!email) {
            message.textContent = "Please enter your email address.";
            return;
        }

        const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

        if (!emailPattern.test(email)) {
            message.textContent = "Please enter a valid email address.";
            return;
        }

        // Require a completed Turnstile challenge
        const captchaToken = window.munkaTurnstileToken;

        if (!captchaToken) {
            message.textContent =
                "Please complete the security verification before continuing.";
            return;
        }

        if (
            typeof supabaseClient === "undefined" ||
            !supabaseClient.auth
        ) {
            console.error("Supabase client is not available.");
            message.textContent =
                "The service is temporarily unavailable. Please try again later.";
            return;
        }

        resetButton.disabled = true;
        resetButton.textContent = "Processing...";
        message.textContent = "Processing your request...";

        try {
            const resetUrl = new URL(
                "reset_password.html",
                window.location.href
            ).href;

            const { error } = await supabaseClient.auth.resetPasswordForEmail(
                email,
                {
                    redirectTo: resetUrl,
                    captchaToken: captchaToken
                }
            );

            if (error) {
                console.error(
                    "PASSWORD RESET REQUEST ERROR:",
                    error.message
                );

                message.textContent =
                    "We could not process your request. Please refresh the page, complete security verification again, and retry.";
                return;
            }

            message.textContent =
                "If an account exists for this email, a password reset link has been sent. Please check your inbox and spam folder.";

            emailInput.value = "";

        } catch (error) {
            console.error(
                "FORGOT PASSWORD ERROR:",
                error.message || error
            );

            message.textContent =
                "We could not process your request. Please refresh the page, complete security verification again, and retry.";

        } finally {
            resetButton.disabled = false;
            resetButton.textContent = "Send Reset Link";

            // Turnstile tokens should not be reused.
            window.munkaTurnstileToken = "";

            if (window.turnstile) {
                try {
                    window.turnstile.reset();
                } catch (resetError) {
                    console.warn(
                        "Turnstile reset notice:",
                        resetError
                    );
                }
            }
        }
    });
});
