// =========================================================
// MUNKA PIGGERY TECHNOLOGY
// CHANGE PASSWORD SYSTEM
// SUPABASE AUTHENTICATION
// CLOUDFLARE TURNSTILE CAPTCHA
// =========================================================
//
// IMPORTANT:
// 1. Uses the existing supabase.js.
// 2. Does not modify login.js.
// 3. Verifies the current password.
// 4. Requires a valid Cloudflare CAPTCHA token.
// 5. Updates the password through Supabase.
// 6. Preserves dashboard redirects.
// =========================================================


// =========================================================
// CLOUDFLARE SITE KEY
// =========================================================

// Replace the placeholder below with your PUBLIC
// Cloudflare Turnstile Site Key.
//
// Do NOT put your Cloudflare Secret Key here.

const TURNSTILE_SITE_KEY =
    "0x4AAAAAAFMo7xO_ThI6laYl";


// =========================================================
// GLOBAL VARIABLES
// =========================================================

let changePasswordCaptchaWidgetId = null;

let changePasswordCaptchaToken = "";

let changePasswordSubmissionRunning = false;


// =========================================================
// SHOW MESSAGE
// =========================================================

function showMessage(text, color = "red") {

    const message =
        document.getElementById("message");

    if (!message) {
        return;
    }

    message.textContent = text;

    message.style.color = color;

}


// =========================================================
// GET SUPABASE CLIENT
// =========================================================

function getSupabaseClient() {

    try {

        if (
            typeof supabaseClient !== "undefined" &&
            supabaseClient
        ) {

            return supabaseClient;

        }

    } catch (error) {

        console.error(
            "Supabase client error:",
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

        console.error(
            "Session error:",
            error
        );

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
// REDIRECT TO CORRECT DASHBOARD
// =========================================================

async function redirectToDashboard(client) {

    try {

        const session =
            await getCurrentSession(client);

        const {
            data: profile,
            error
        } = await client
            .from("users")
            .select("role")
            .eq(
                "auth_user_id",
                session.user.id
            )
            .single();

        if (error) {

            console.error(
                "Profile lookup error:",
                error
            );

            throw error;

        }

        if (
            profile &&
            String(profile.role)
                .trim()
                .toLowerCase() === "super admin"
        ) {

            window.location.href =
                "superadmin.html";

        } else {

            window.location.href =
                "dashboard.html";

        }

    } catch (error) {

        console.error(
            "Dashboard redirect error:",
            error
        );

        window.location.href =
            "login.html";

    }

}


// =========================================================
// RESET CAPTCHA
// =========================================================

function resetChangePasswordCaptcha() {

    changePasswordCaptchaToken = "";

    if (
        typeof window.turnstile !== "undefined" &&
        changePasswordCaptchaWidgetId !== null
    ) {

        try {

            window.turnstile.reset(
                changePasswordCaptchaWidgetId
            );

        } catch (error) {

            console.error(
                "CAPTCHA reset error:",
                error
            );

        }

    }

}


// =========================================================
// INITIALIZE CLOUDFLARE TURNSTILE
// =========================================================

function initializeChangePasswordCaptcha() {

    if (
        typeof window.turnstile === "undefined"
    ) {

        return false;

    }

    if (
        changePasswordCaptchaWidgetId !== null
    ) {

        return true;

    }

    if (
        !TURNSTILE_SITE_KEY ||
        TURNSTILE_SITE_KEY ===
            "PASTE_YOUR_CLOUDFLARE_SITE_KEY_HERE"
    ) {

        showMessage(
            "Cloudflare Site Key has not been configured.",
            "red"
        );

        console.error(
            "Configure TURNSTILE_SITE_KEY in change_password.js."
        );

        return false;

    }

    const captchaContainer =
        document.getElementById(
            "changePasswordCaptcha"
        );

    if (!captchaContainer) {

        console.error(
            "CAPTCHA container was not found."
        );

        return false;

    }

    try {

        changePasswordCaptchaWidgetId =
            window.turnstile.render(
                captchaContainer,
                {

                    sitekey:
                        TURNSTILE_SITE_KEY,

                    callback: function(token) {

                        changePasswordCaptchaToken =
                            token || "";

                        if (changePasswordCaptchaToken) {

                            showMessage(
                                "Security check completed. You can now update your password.",
                                "green"
                            );

                        }

                    },

                    "expired-callback": function() {

                        changePasswordCaptchaToken = "";

                        showMessage(
                            "Your security check expired. Please complete it again.",
                            "red"
                        );

                    },

                    "error-callback": function(errorCode) {

                        changePasswordCaptchaToken = "";

                        console.error(
                            "Turnstile error:",
                            errorCode
                        );

                        showMessage(
                            "Security verification failed to load. Please refresh the page and try again.",
                            "red"
                        );

                    }

                }
            );

        return true;

    } catch (error) {

        console.error(
            "Unable to initialize Turnstile:",
            error
        );

        showMessage(
            "Unable to initialize security verification. Please refresh the page.",
            "red"
        );

        return false;

    }

}


// =========================================================
// WAIT FOR TURNSTILE SCRIPT
// =========================================================

function waitForChangePasswordCaptcha() {

    let attempts = 0;

    const maximumAttempts = 100;

    const timer = setInterval(function() {

        attempts++;

        if (
            typeof window.turnstile !== "undefined"
        ) {

            clearInterval(timer);

            initializeChangePasswordCaptcha();

            return;

        }

        if (attempts >= maximumAttempts) {

            clearInterval(timer);

            showMessage(
                "Cloudflare security verification could not load. Check your internet connection and refresh the page.",
                "red"
            );

        }

    }, 200);

}


// =========================================================
// CHANGE PASSWORD
// =========================================================

async function changePassword(event) {

    if (event) {

        event.preventDefault();

    }

    if (changePasswordSubmissionRunning) {

        return;

    }

    const client =
        getSupabaseClient();

    if (!client) {

        showMessage(
            "Supabase is not initialized. Please refresh the page.",
            "red"
        );

        return;

    }

    const oldPassword =
        document.getElementById(
            "oldPassword"
        ).value;

    const newPassword =
        document.getElementById(
            "newPassword"
        ).value;

    const confirmPassword =
        document.getElementById(
            "confirmPassword"
        ).value;

    const updateButton =
        document.getElementById(
            "updatePasswordBtn"
        );


    // =====================================================
    // VALIDATE PASSWORD FIELDS
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


    if (
        newPassword !== confirmPassword
    ) {

        showMessage(
            "The new passwords do not match.",
            "red"
        );

        return;

    }


    if (
        newPassword.length < 6
    ) {

        showMessage(
            "Your new password must contain at least 6 characters.",
            "red"
        );

        return;

    }


    if (
        oldPassword === newPassword
    ) {

        showMessage(
            "Your new password must be different from your current password.",
            "red"
        );

        return;

    }


    // =====================================================
    // REQUIRE CAPTCHA TOKEN
    // =====================================================

    if (
        !changePasswordCaptchaToken
    ) {

        showMessage(
            "Please complete the Cloudflare security check before continuing.",
            "red"
        );

        return;

    }


    // =====================================================
    // LOCK SUBMISSION
    // =====================================================

    changePasswordSubmissionRunning = true;

    if (updateButton) {

        updateButton.disabled = true;

        updateButton.textContent =
            "Verifying password...";

    }


    // Temporary verification client is created below.
    // We retain it here so its temporary session can
    // be cleaned up after verification.

    let verificationClient = null;

    try {

        // =================================================
        // GET CURRENT AUTHENTICATED SESSION
        // =================================================

        const session =
            await getCurrentSession(client);

        const email =
            session.user.email;

        if (!email) {

            throw new Error(
                "Your authenticated account does not have an email address."
            );

        }


        // =================================================
        // SAVE THE CAPTCHA TOKEN
        // =================================================

        const captchaToken =
            changePasswordCaptchaToken;

        if (!captchaToken) {

            throw new Error(
                "Your security check is missing. Please complete it again."
            );

        }


        // =================================================
        // CREATE TEMPORARY SUPABASE CLIENT
        // =================================================
        //
        // This client is separate from the main client.
        // It will not persist its session in browser storage.
        // =================================================

        verificationClient =
            window.supabase.createClient(
                SUPABASE_URL,
                SUPABASE_ANON_KEY,
                {

                    auth: {

                        persistSession: false,

                        autoRefreshToken: false,

                        detectSessionInUrl: false

                    }

                }
            );


        // =================================================
        // VERIFY CURRENT PASSWORD WITH CAPTCHA
        // =================================================

        const {
            data: verificationData,
            error: verificationError
        } =
            await verificationClient.auth.signInWithPassword({

                email: email,

                password: oldPassword,

                options: {

                    captchaToken: captchaToken

                }

            });


        // A CAPTCHA token is single-use, so clear it
        // after the verification request.

        changePasswordCaptchaToken = "";


        if (verificationError) {

            console.error(
                "Password verification error:",
                verificationError.message,
                verificationError.status,
                verificationError.code
            );

            resetChangePasswordCaptcha();

            throw new Error(
                "Current password verification failed. Check your password and complete the security check again."
            );

        }


        if (
            !verificationData ||
            !verificationData.user
        ) {

            resetChangePasswordCaptcha();

            throw new Error(
                "Supabase could not confirm your current password."
            );

        }


        // =================================================
        // CONFIRM SAME ACCOUNT
        // =================================================

        if (
            verificationData.user.id !==
            session.user.id
        ) {

            resetChangePasswordCaptcha();

            throw new Error(
                "The verified account does not match your current login."
            );

        }


        // =================================================
        // CONFIRM MAIN SESSION IS STILL VALID
        // =================================================

        const {
            data: currentUserData,
            error: currentUserError
        } = await client.auth.getUser();

        if (
            currentUserError ||
            !currentUserData ||
            !currentUserData.user ||
            currentUserData.user.id !==
                session.user.id
        ) {

            throw new Error(
                "Your login session has changed. Please log in again."
            );

        }


        // =================================================
        // UPDATE PASSWORD
        // =================================================

        if (updateButton) {

            updateButton.textContent =
                "Updating password...";

        }

        const {
            data: updateData,
            error: updateError
        } =
            await client.auth.updateUser({

                password: newPassword

            });


        if (updateError) {

            console.error(
                "Supabase password update error:",
                updateError
            );

            throw new Error(
                updateError.message
            );

        }


        if (
            !updateData ||
            !updateData.user
        ) {

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
        // REDIRECT TO CORRECT DASHBOARD
        // =================================================

        if (updateButton) {

            updateButton.textContent =
                "Password Updated";

        }

        setTimeout(function() {

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

        // =================================================
        // CLEAN UP TEMPORARY CLIENT SESSION
        // =================================================

        if (verificationClient) {

            try {

                await verificationClient.auth.signOut({
                    scope: "local"
                });

            } catch (cleanupError) {

                console.error(
                    "Temporary session cleanup error:",
                    cleanupError
                );

            }

        }


        // =================================================
        // RESTORE BUTTON
        // =================================================

        changePasswordSubmissionRunning = false;

        if (updateButton) {

            updateButton.disabled = false;

            if (
                updateButton.textContent !==
                "Password Updated"
            ) {

                updateButton.textContent =
                    "Update Password";

            }

        }

    }

}


// =========================================================
// INITIALIZE PAGE
// =========================================================

document.addEventListener(
    "DOMContentLoaded",
    async function() {

        const client =
            getSupabaseClient();


        // =================================================
        // CHECK SUPABASE
        // =================================================

        if (!client) {

            showMessage(
                "Supabase is not initialized. Check that supabase.js loads before change_password.js.",
                "red"
            );

            return;

        }


        // =================================================
        // REQUIRE ACTIVE LOGIN SESSION
        // =================================================

        try {

            await getCurrentSession(client);

        } catch (error) {

            showMessage(
                "Please log in before changing your password.",
                "red"
            );

            setTimeout(function() {

                window.location.href =
                    "login.html";

            }, 1800);

            return;

        }


        // =================================================
        // INITIALIZE CAPTCHA
        // =================================================

        waitForChangePasswordCaptcha();


        // =================================================
        // FORM SUBMISSION
        // =================================================

        const form =
            document.getElementById(
                "passwordForm"
            );

        if (form) {

            form.addEventListener(
                "submit",
                changePassword
            );

        }


        // =================================================
        // BACK BUTTON
        // =================================================

        const backButton =
            document.getElementById(
                "backButton"
            );

        if (backButton) {

            backButton.addEventListener(
                "click",
                function() {

                    redirectToDashboard(client);

                }
            );

        }

    }
);