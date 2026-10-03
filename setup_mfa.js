/* =========================================================
   MUNKA PIGGERY
   SUPER ADMIN MFA SETUP / VERIFICATION
   TOTP AUTHENTICATOR
   ========================================================= */

let activeFactorId = null;
let currentChallengeId = null;


/* =========================================================
   ELEMENTS
   ========================================================= */

const loadingMessage =
    document.getElementById("loadingMessage");

const setupContent =
    document.getElementById("setupContent");

const alreadyEnabled =
    document.getElementById("alreadyEnabled");

const qrCode =
    document.getElementById("qrCode");

const secretElement =
    document.getElementById("secret");

const verificationCode =
    document.getElementById("verificationCode");

const verifyButton =
    document.getElementById("verifyButton");

const message =
    document.getElementById("message");


/* =========================================================
   MESSAGE
   ========================================================= */

function showMessage(text, type) {

    message.textContent = text;

    message.className = "message " + type;
}


/* =========================================================
   STOP LOADING
   ========================================================= */

function stopLoading() {

    if (loadingMessage) {
        loadingMessage.style.display = "none";
    }
}


/* =========================================================
   GET CURRENT USER
   ========================================================= */

async function getCurrentMUNKAUser() {

    const {
        data: sessionData,
        error: sessionError
    } = await supabaseClient.auth.getSession();

    if (sessionError) {
        throw sessionError;
    }

    const session = sessionData.session;

    if (!session || !session.user) {

        throw new Error(
            "You must be logged in before setting up MFA."
        );
    }

    const authUserId = session.user.id;


    const {
        data: user,
        error: userError
    } = await supabaseClient
        .from("users")
        .select("*")
        .eq("auth_user_id", authUserId)
        .single();


    if (userError) {
        throw userError;
    }


    if (!user) {

        throw new Error(
            "MUNKA user profile could not be found."
        );
    }


    /* -----------------------------------------------------
       SUPER ADMIN CHECK
       ----------------------------------------------------- */

    if (
        String(user.role || "")
            .trim()
            .toLowerCase() !== "super admin"
    ) {

        throw new Error(
            "Only the Super Admin can set up MFA."
        );
    }


    /* -----------------------------------------------------
       ACTIVE CHECK
       ----------------------------------------------------- */

    if (
        String(user.status || "")
            .trim()
            .toLowerCase() !== "active"
    ) {

        throw new Error(
            "This Super Admin account is not active."
        );
    }


    return user;
}


/* =========================================================
   LIST MFA FACTORS
   ========================================================= */

async function listMFAFactors() {

    const {
        data,
        error
    } = await supabaseClient.auth.mfa.listFactors();


    if (error) {
        throw error;
    }


    return data || {
        totp: [],
        phone: []
    };
}


/* =========================================================
   FIND TOTP FACTOR
   ========================================================= */

function findTotpFactor(factors) {

    if (
        !factors ||
        !Array.isArray(factors.totp)
    ) {
        return null;
    }


    /*
       Prefer a verified factor.
    */

    const verifiedFactor =
        factors.totp.find(
            factor =>
                String(factor.status || "")
                    .toLowerCase() === "verified"
        );


    if (verifiedFactor) {
        return verifiedFactor;
    }


    /*
       Otherwise use the existing factor.
    */

    if (factors.totp.length > 0) {
        return factors.totp[0];
    }


    return null;
}


/* =========================================================
   SHOW VERIFICATION UI
   ========================================================= */

function showVerificationUI() {

    stopLoading();


    if (alreadyEnabled) {
        alreadyEnabled.style.display = "none";
    }


    if (setupContent) {
        setupContent.style.display = "block";
    }


    if (secretElement) {

        secretElement.textContent =
            "An existing MUNKA PIGGERY MFA factor was found. Use the code currently shown in Google Authenticator.";
    }


    if (qrCode) {

        qrCode.style.display = "none";
    }


    if (verifyButton) {

        verifyButton.disabled = false;

        verifyButton.textContent =
            "VERIFY MFA";
    }


    if (verificationCode) {

        verificationCode.disabled = false;

        verificationCode.value = "";

        verificationCode.focus();
    }


    showMessage(
        "Your existing MFA factor was found. Enter the current 6-digit code from Google Authenticator.",
        "success"
    );
}


/* =========================================================
   CREATE NEW MFA FACTOR
   ========================================================= */

async function createNewMFAFactor() {

    const {
        data,
        error
    } = await supabaseClient.auth.mfa.enroll({

        factorType: "totp",

        friendlyName:
            "MUNKA PIGGERY Super Admin"

    });


    if (error) {
        throw error;
    }


    if (!data || !data.id) {

        throw new Error(
            "Supabase did not return the MFA factor."
        );
    }


    activeFactorId = data.id;


    /* -----------------------------------------------------
       SECRET
       ----------------------------------------------------- */

    if (
        data.totp &&
        data.totp.secret
    ) {

        secretElement.textContent =
            data.totp.secret;

    } else {

        secretElement.textContent =
            "Secret was not returned.";
    }


    /* -----------------------------------------------------
       QR CODE
       ----------------------------------------------------- */

    if (
        data.totp &&
        data.totp.qr_code
    ) {

        const svgDataUrl =
            "data:image/svg+xml;charset=utf-8," +
            encodeURIComponent(
                data.totp.qr_code
            );


        qrCode.src = svgDataUrl;

        qrCode.style.display = "block";

    } else {

        throw new Error(
            "Supabase did not return the MFA QR code."
        );
    }


    stopLoading();


    setupContent.style.display =
        "block";


    verifyButton.disabled = false;

    verifyButton.textContent =
        "ENABLE MFA";
}


/* =========================================================
   START MFA CHALLENGE
   ========================================================= */

async function createChallenge() {

    if (!activeFactorId) {

        throw new Error(
            "No MFA factor is available."
        );
    }


    const {
        data,
        error
    } = await supabaseClient.auth.mfa.challenge({

        factorId: activeFactorId

    });


    if (error) {
        throw error;
    }


    if (!data || !data.id) {

        throw new Error(
            "MFA challenge could not be created."
        );
    }


    currentChallengeId = data.id;


    return data.id;
}


/* =========================================================
   VERIFY MFA CODE
   ========================================================= */

async function verifyMFA() {

    const code =
        verificationCode.value
            .replace(/\D/g, "")
            .trim();


    if (!activeFactorId) {

        showMessage(
            "No MFA factor was found.",
            "error"
        );

        return;
    }


    if (!/^\d{6}$/.test(code)) {

        showMessage(
            "Please enter the 6-digit code from Google Authenticator.",
            "error"
        );

        verificationCode.focus();

        return;
    }


    verifyButton.disabled = true;

    verifyButton.textContent =
        "VERIFYING...";


    try {

        /* -------------------------------------------------
           CREATE CHALLENGE
           ------------------------------------------------- */

        await createChallenge();


        /* -------------------------------------------------
           VERIFY CODE
           ------------------------------------------------- */

        const {
            data,
            error
        } = await supabaseClient.auth.mfa.verify({

            factorId: activeFactorId,

            challengeId: currentChallengeId,

            code: code

        });


        if (error) {
            throw error;
        }


        console.log(
            "MFA verification successful:",
            data
        );


        /* -------------------------------------------------
           SUCCESS
           ------------------------------------------------- */

        verificationCode.disabled = true;

        verifyButton.disabled = true;

        verifyButton.textContent =
            "MFA ENABLED ✓";


        showMessage(
            "MFA has been successfully enabled and verified for your Super Admin account.",
            "success"
        );


        /* -------------------------------------------------
           ASSURANCE LEVEL
           ------------------------------------------------- */

        try {

            const {
                data: assuranceData,
                error: assuranceError
            } =
                await supabaseClient.auth.mfa
                    .getAuthenticatorAssuranceLevel();


            if (!assuranceError) {

                console.log(
                    "Authenticator assurance level:",
                    assuranceData
                );
            }

        } catch (assuranceError) {

            console.warn(
                "Could not read assurance level:",
                assuranceError
            );
        }


    } catch (error) {

        console.error(
            "MFA verification error:",
            error
        );


        verifyButton.disabled = false;

        verifyButton.textContent =
            "VERIFY MFA";


        currentChallengeId = null;


        showMessage(
            error.message ||
            "The verification failed. Please enter the current code from Google Authenticator.",
            "error"
        );
    }
}


/* =========================================================
   CODE INPUT
   ========================================================= */

if (verificationCode) {

    verificationCode.addEventListener(
        "input",
        function () {

            this.value =
                this.value
                    .replace(/\D/g, "")
                    .slice(0, 6);

        }
    );
}


/* =========================================================
   BUTTON
   ========================================================= */

if (verifyButton) {

    verifyButton.addEventListener(
        "click",
        verifyMFA
    );
}


/* =========================================================
   INITIALIZATION
   ========================================================= */

async function initializeMFASetup() {

    try {

        /* -------------------------------------------------
           SUPABASE CHECK
           ------------------------------------------------- */

        if (
            typeof supabaseClient === "undefined" ||
            !supabaseClient
        ) {

            throw new Error(
                "Supabase client is not available."
            );
        }


        /* -------------------------------------------------
           USER CHECK
           ------------------------------------------------- */

        await getCurrentMUNKAUser();


        /* -------------------------------------------------
           GET FACTORS
           ------------------------------------------------- */

        const factors =
            await listMFAFactors();


        console.log(
            "Current MFA factors:",
            factors
        );


        /* -------------------------------------------------
           FIND EXISTING TOTP
           ------------------------------------------------- */

        const existingFactor =
            findTotpFactor(factors);


        /* =================================================
           EXISTING FACTOR FOUND
           ================================================= */

        if (existingFactor) {

            activeFactorId =
                existingFactor.id;


            console.log(
                "Existing MFA factor found:",
                existingFactor
            );


            /*
               IMPORTANT:

               Do NOT enroll another factor.

               Instead, show the verification
               interface for the existing factor.
            */

            showVerificationUI();

            return;
        }


        /* =================================================
           NO FACTOR FOUND
           ================================================= */

        await createNewMFAFactor();


    } catch (error) {

        console.error(
            "MFA setup error:",
            error
        );


        stopLoading();


        showMessage(
            error.message ||
            "Unable to prepare MFA setup.",
            "error"
        );
    }
}


/* =========================================================
   START
   ========================================================= */

if (
    document.readyState === "loading"
) {

    document.addEventListener(
        "DOMContentLoaded",
        initializeMFASetup
    );

} else {

    initializeMFASetup();
}