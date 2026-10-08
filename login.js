/* =========================================================
   MUNKA PIGGERY TECHNOLOGY
   LOGIN SYSTEM
   Supabase + Turnstile + Role Selection + MFA
========================================================= */


/* =========================================================
   GLOBAL VARIABLES
========================================================= */

let selectedRole = "";

let currentUser = null;
let currentUserData = null;

let currentMfaFactor = null;
let currentMfaChallenge = null;


/* =========================================================
   DOM ELEMENTS
========================================================= */

const loginForm = document.getElementById("loginForm");

const emailInput = document.getElementById("email");

const passwordInput = document.getElementById("password");

const togglePassword =
    document.getElementById("togglePassword");

const loginButton =
    document.getElementById("loginButton");

const loginButtonText =
    document.getElementById("loginButtonText");

const message =
    document.getElementById("message");

const selectedRoleInput =
    document.getElementById("selectedRole");

const roleSelectedText =
    document.getElementById("roleSelectedText");

const roleButtons =
    document.querySelectorAll(".role-button");

const roleSection =
    document.getElementById("roleSection");

const securitySection =
    document.querySelector(".security-section");

const forgotRow =
    document.querySelector(".forgot-row");

const mfaPanel =
    document.getElementById("mfaPanel");

const mfaCode =
    document.getElementById("mfaCode");

const verifyMfaButton =
    document.getElementById("verifyMfaButton");

const cancelMfaButton =
    document.getElementById("cancelMfaButton");

const mfaMessage =
    document.getElementById("mfaMessage");


/* =========================================================
   ROLE MAPPING
========================================================= */

const roleMapping = {

    "owner/admin":
        "owner/admin",

    "farm manager":
        "farm manager",

    "serviceman":
        "serviceman (gestation pen)",

    "farrowman":
        "farrowman (farrowing pen)",

    "sales officer":
        "sales officer",

    "veterinary officer":
        "veterinary officer",

    "farm worker":
        "farm worker"
};


/* =========================================================
   PAGE READY
========================================================= */

document.addEventListener("DOMContentLoaded", () => {

    setupRoleButtons();

    setupPasswordToggle();

    setupMfa();

});


/* =========================================================
   ROLE BUTTONS
========================================================= */

function setupRoleButtons() {

    roleButtons.forEach(button => {

        button.addEventListener("click", () => {

            roleButtons.forEach(item => {

                item.classList.remove("selected");

            });

            button.classList.add("selected");

            selectedRole =
                button.dataset.role;

            selectedRoleInput.value =
                selectedRole;

            roleSelectedText.textContent =
                "SELECTED: " +
                button.innerText.trim();

            roleSelectedText.classList.add("active");

            clearMessage();

        });

    });

}


/* =========================================================
   PASSWORD SHOW / HIDE
========================================================= */

function setupPasswordToggle() {

    togglePassword.addEventListener("click", () => {

        const isPassword =
            passwordInput.type === "password";

        passwordInput.type =
            isPassword ? "text" : "password";

        togglePassword.textContent =
            isPassword ? "🙈" : "👁";

        togglePassword.setAttribute(
            "aria-label",
            isPassword
                ? "Hide password"
                : "Show password"
        );

    });

}


/* =========================================================
   LOGIN SUBMIT
========================================================= */

loginForm.addEventListener("submit", async (event) => {

    event.preventDefault();

    clearMessage();

    const email =
        emailInput.value.trim();

    const password =
        passwordInput.value;


    /* -----------------------------------------
       BASIC VALIDATION
    ----------------------------------------- */

    if (!email || !password) {

        showMessage(
            "Please enter your email address and password.",
            "error"
        );

        return;
    }


    /* -----------------------------------------
       TURNSTILE
    ----------------------------------------- */

    let captchaToken = "";

    try {

        if (
            window.turnstile &&
            typeof window.turnstile.getResponse === "function"
        ) {

            captchaToken =
                window.turnstile.getResponse();

        }

    } catch (error) {

        console.error(
            "Turnstile error:",
            error
        );

    }


    if (!captchaToken) {

        showMessage(
            "Please complete the security verification.",
            "error"
        );

        return;
    }


    /* -----------------------------------------
       DISABLE LOGIN
    ----------------------------------------- */

    setLoginLoading(true);


    try {

        /* =====================================
           SUPABASE LOGIN
        ===================================== */

        const loginResult =
            await supabaseClient.auth.signInWithPassword({

                email: email,

                password: password,

                options: {
                    captchaToken: captchaToken
                }

            });


        if (loginResult.error) {

            throw loginResult.error;

        }


        currentUser =
            loginResult.data.user;


        if (!currentUser) {

            throw new Error(
                "Unable to identify the logged-in user."
            );

        }


        /* =====================================
           GET USER PROFILE
        ===================================== */

        const profileResult =
            await supabaseClient
                .from("users")
                .select("*")
                .eq(
                    "auth_user_id",
                    currentUser.id
                )
                .maybeSingle();


        if (profileResult.error) {

            throw profileResult.error;

        }


        currentUserData =
            profileResult.data;


        if (!currentUserData) {

            throw new Error(
                "Your account profile could not be found."
            );

        }


        /* =====================================
           ACCOUNT STATUS
        ===================================== */

        if (
            String(currentUserData.status || "")
                .toLowerCase() !== "active"
        ) {

            throw new Error(
                "Your account is not active. Please contact the administrator."
            );

        }


        /* =====================================
           IDENTIFY ROLE
        ===================================== */

        const databaseRole =
            String(currentUserData.role || "")
                .trim()
                .toLowerCase();


        /* =====================================
           SUPER ADMIN
        ===================================== */

        if (databaseRole === "super admin") {

            await handleSuperAdminLogin();

            return;
        }


        /* =====================================
           NORMAL USER ROLE
        ===================================== */

        if (!selectedRole) {

            await signOutUser();

            showMessage(
                "Please select your role before logging in.",
                "error"
            );

            resetTurnstile();

            setLoginLoading(false);

            return;
        }


        const expectedRole =
            roleMapping[selectedRole];


        if (
            databaseRole !==
            String(expectedRole).toLowerCase()
        ) {

            await signOutUser();

            showMessage(
                "The selected role does not match your account.",
                "error"
            );

            resetTurnstile();

            setLoginLoading(false);

            return;
        }


        /* =====================================
           FARM VALIDATION
        ===================================== */

        if (!currentUserData.farm_id) {

            throw new Error(
                "Your account has not been assigned to a farm."
            );

        }


        const farmResult =
            await supabaseClient
                .from("farms")
                .select(
                    "id, farm_name, status, subscription_start, subscription_end"
                )
                .eq(
                    "id",
                    currentUserData.farm_id
                )
                .maybeSingle();


        if (farmResult.error) {

            throw farmResult.error;

        }


        const farm =
            farmResult.data;


        if (!farm) {

            throw new Error(
                "Your assigned farm could not be found."
            );

        }


        /* =====================================
           FARM STATUS
        ===================================== */

        const farmStatus =
            String(farm.status || "")
                .toLowerCase();


        if (
            farmStatus !== "active"
        ) {

            throw new Error(
                "Your farm account is currently inactive."
            );

        }


        /* =====================================
           SUBSCRIPTION CHECK
        ===================================== */

        const now =
            new Date();


        if (
            farm.subscription_start &&
            new Date(farm.subscription_start) > now
        ) {

            throw new Error(
                "Your farm subscription has not started yet."
            );

        }


        if (
            farm.subscription_end &&
            new Date(farm.subscription_end) < now
        ) {

            throw new Error(
                "Your farm subscription has expired."
            );

        }


        /* =====================================
           UPDATE LAST LOGIN
        ===================================== */

        try {

            await supabaseClient.rpc(
                "update_my_last_login"
            );

        } catch (error) {

            console.warn(
                "Last login update failed:",
                error
            );

        }


        /* =====================================
           BUILD LOGIN DATA
        ===================================== */

        const loggedInUser = {

            ...currentUserData,

            auth_user_id:
                currentUser.id,

            farm_name:
                farm.farm_name,

            farm_status:
                farm.status,

            subscription_start:
                farm.subscription_start,

            subscription_end:
                farm.subscription_end

        };


        /* =====================================
           SAVE SESSION
        ===================================== */

        localStorage.setItem(
            "loggedInUser",
            JSON.stringify(loggedInUser)
        );


        /* =====================================
           ACTIVITY LOG
        ===================================== */

        try {

            if (
                typeof saveActivity === "function"
            ) {

                await saveActivity(
                    "Login",
                    "User logged into MUNKA Piggery Management System"
                );

            }

        } catch (error) {

            console.warn(
                "Activity log failed:",
                error
            );

        }


        /* =====================================
           REDIRECT
        ===================================== */

        window.location.replace(
            "dashboard.html"
        );

    }

    catch (error) {

        console.error(
            "Login error:",
            error
        );


        await signOutUser();


        const errorMessage =
            getFriendlyErrorMessage(error);


        showMessage(
            errorMessage,
            "error"
        );


        resetTurnstile();

        setLoginLoading(false);

    }

});


/* =========================================================
   SUPER ADMIN LOGIN
========================================================= */

async function handleSuperAdminLogin() {

    try {

        setLoginLoading(false);

        showMfaPanel();

        mfaMessage.textContent =
            "Preparing secure verification...";


        /* -----------------------------------------
           GET VERIFIED TOTP FACTORS
        ----------------------------------------- */

        const factorResult =
            await supabaseClient.auth.mfa.listFactors();


        if (factorResult.error) {

            throw factorResult.error;

        }


        const verifiedFactors =
            factorResult.data?.totp?.filter(
                factor =>
                    factor.status === "verified"
            ) || [];


        if (!verifiedFactors.length) {

            throw new Error(
                "No verified authenticator is registered for this Super Admin account."
            );

        }


        currentMfaFactor =
            verifiedFactors[0];


        /* -----------------------------------------
           CREATE MFA CHALLENGE
        ----------------------------------------- */

        const challengeResult =
            await supabaseClient.auth.mfa.challenge({

                factorId:
                    currentMfaFactor.id

            });


        if (challengeResult.error) {

            throw challengeResult.error;

        }


        currentMfaChallenge =
            challengeResult.data;


        mfaMessage.textContent =
            "Enter your 6-digit authenticator code.";

        mfaMessage.style.color =
            "#56a7ff";

        mfaCode.focus();

    }

    catch (error) {

        console.error(
            "MFA setup error:",
            error
        );


        await signOutUser();

        hideMfaPanel();

        showMessage(
            getFriendlyErrorMessage(error),
            "error"
        );

        resetTurnstile();

    }

}


/* =========================================================
   MFA SETUP
========================================================= */

function setupMfa() {

    verifyMfaButton.addEventListener(
        "click",
        verifyMfa
    );


    cancelMfaButton.addEventListener(
        "click",
        async () => {

            await signOutUser();

            hideMfaPanel();

            resetLoginInterface();

            resetTurnstile();

        }
    );


    mfaCode.addEventListener(
        "input",
        () => {

            mfaCode.value =
                mfaCode.value
                    .replace(/\D/g, "")
                    .slice(0, 6);

        }
    );


    mfaCode.addEventListener(
        "keydown",
        event => {

            if (
                event.key === "Enter"
            ) {

                event.preventDefault();

                verifyMfa();

            }

        }
    );

}


/* =========================================================
   VERIFY MFA
========================================================= */

async function verifyMfa() {

    const code =
        mfaCode.value.trim();


    if (!/^\d{6}$/.test(code)) {

        mfaMessage.textContent =
            "Enter the complete 6-digit authentication code.";

        mfaMessage.style.color =
            "#ff4b4b";

        return;
    }


    if (
        !currentMfaFactor ||
        !currentMfaChallenge
    ) {

        mfaMessage.textContent =
            "MFA session is not ready. Please try logging in again.";

        mfaMessage.style.color =
            "#ff4b4b";

        return;
    }


    verifyMfaButton.disabled =
        true;

    verifyMfaButton.textContent =
        "VERIFYING...";


    try {

        const verifyResult =
            await supabaseClient.auth.mfa.verify({

                factorId:
                    currentMfaFactor.id,

                challengeId:
                    currentMfaChallenge.id,

                code: code

            });


        if (verifyResult.error) {

            throw verifyResult.error;

        }


        /* =====================================
           UPDATE LAST LOGIN
        ===================================== */

        try {

            await supabaseClient.rpc(
                "update_my_last_login"
            );

        } catch (error) {

            console.warn(
                "Last login update failed:",
                error
            );

        }


        /* =====================================
           SAVE SUPER ADMIN SESSION
        ===================================== */

        const loggedInUser = {

            ...currentUserData,

            auth_user_id:
                currentUser.id

        };


        localStorage.setItem(
            "loggedInUser",
            JSON.stringify(loggedInUser)
        );


        /* =====================================
           ACTIVITY LOG
        ===================================== */

        try {

            if (
                typeof saveActivity === "function"
            ) {

                await saveActivity(
                    "Super Admin Login",
                    "Super Admin logged into MUNKA Piggery Management System"
                );

            }

        } catch (error) {

            console.warn(
                "Activity log failed:",
                error
            );

        }


        /* =====================================
           REDIRECT
        ===================================== */

        window.location.replace(
            "superadmin.html"
        );

    }

    catch (error) {

        console.error(
            "MFA verification error:",
            error
        );


        mfaMessage.textContent =
            "Invalid authentication code. Please try again.";

        mfaMessage.style.color =
            "#ff4b4b";

        mfaCode.value = "";

        mfaCode.focus();

    }

    finally {

        verifyMfaButton.disabled =
            false;

        verifyMfaButton.textContent =
            "VERIFY MFA";

    }

}


/* =========================================================
   SHOW MFA PANEL
========================================================= */

function showMfaPanel() {

    mfaPanel.hidden =
        false;

    loginForm.classList.add(
        "mfa-active"
    );


    roleSection.style.display =
        "none";

    securitySection.style.display =
        "none";

    forgotRow.style.display =
        "none";

    loginButton.style.display =
        "none";

    message.style.display =
        "none";

}


/* =========================================================
   HIDE MFA PANEL
========================================================= */

function hideMfaPanel() {

    mfaPanel.hidden =
        true;

    roleSection.style.display =
        "";

    securitySection.style.display =
        "";

    forgotRow.style.display =
        "";

    loginButton.style.display =
        "";

    message.style.display =
        "";

    mfaCode.value = "";

    currentMfaFactor =
        null;

    currentMfaChallenge =
        null;

}


/* =========================================================
   RESET LOGIN INTERFACE
========================================================= */

function resetLoginInterface() {

    selectedRole =
        "";

    selectedRoleInput.value =
        "";

    roleSelectedText.textContent =
        "SELECT YOUR ROLE TO CONTINUE";

    roleSelectedText.classList.remove(
        "active"
    );


    roleButtons.forEach(button => {

        button.classList.remove(
            "selected"
        );

    });


    loginButton.style.display =
        "";

    roleSection.style.display =
        "";

    securitySection.style.display =
        "";

    forgotRow.style.display =
        "";

    setLoginLoading(false);

}


/* =========================================================
   LOGIN LOADING
========================================================= */

function setLoginLoading(isLoading) {

    loginButton.disabled =
        isLoading;


    if (isLoading) {

        loginButtonText.textContent =
            "VERIFYING LOGIN...";

    } else {

        loginButtonText.textContent =
            "LOGIN TO FARM";

    }

}


/* =========================================================
   MESSAGES
========================================================= */

function showMessage(
    text,
    type = "error"
) {

    message.textContent =
        text;

    message.className =
        "message show " + type;

}


function clearMessage() {

    message.textContent =
        "";

    message.className =
        "message";

}


/* =========================================================
   TURNSTILE RESET
========================================================= */

function resetTurnstile() {

    try {

        if (
            window.turnstile &&
            typeof window.turnstile.reset === "function"
        ) {

            window.turnstile.reset();

        }

    } catch (error) {

        console.warn(
            "Unable to reset Turnstile:",
            error
        );

    }

}


/* =========================================================
   SIGN OUT
========================================================= */

async function signOutUser() {

    try {

        await supabaseClient.auth.signOut();

    } catch (error) {

        console.warn(
            "Sign out error:",
            error
        );

    }

}


/* =========================================================
   FRIENDLY ERROR MESSAGES
========================================================= */

function getFriendlyErrorMessage(error) {

    const rawMessage =
        String(
            error?.message ||
            error ||
            ""
        );


    const lower =
        rawMessage.toLowerCase();


    if (
        lower.includes(
            "invalid login credentials"
        )
    ) {

        return "Incorrect email or password.";

    }


    if (
        lower.includes(
            "email not confirmed"
        )
    ) {

        return "Your email address has not been confirmed.";

    }


    if (
        lower.includes(
            "captcha"
        )
    ) {

        return "Security verification failed. Please complete the CAPTCHA again.";

    }


    if (
        lower.includes(
            "too many requests"
        )
    ) {

        return "Too many login attempts. Please wait and try again.";

    }


    if (
        lower.includes(
            "network"
        )
    ) {

        return "Network connection problem. Please check your internet connection.";

    }


    return rawMessage ||
        "Unable to complete login. Please try again.";

}