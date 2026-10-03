/* =========================================================
   MUNKA PIGGERY
   SUPER ADMIN MFA SETUP
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

function showMessage(text, type = "success") {

    if (!message) return;

    message.textContent = text;
    message.className = "message " + type;
}


/* =========================================================
   LOADING
   ========================================================= */

function stopLoading() {

    if (loadingMessage) {
        loadingMessage.style.display = "none";
    }
}


/* =========================================================
   GET SUPER ADMIN
   ========================================================= */

async function getSuperAdmin() {

    const {
        data,
        error
    } = await supabaseClient.auth.getSession();

    if (error) {
        throw error;
    }

    if (
        !data ||
        !data.session ||
        !data.session.user
    ) {
        throw new Error(
            "You must be logged in as Super Admin."
        );
    }

    const authUserId =
        data.session.user.id;


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
            "Super Admin profile could not be found."
        );
    }


    if (
        String(user.role || "")
            .trim()
            .toLowerCase() !== "super admin"
    ) {
        throw new Error(
            "Only the Super Admin can manage MFA."
        );
    }


    if (
        String(user.status || "")
            .trim()
            .toLowerCase() !== "active"
    ) {
        throw new Error(
            "The Super Admin account is not active."
        );
    }


    return user;
}


/* =========================================================
   GET MFA FACTORS
   ========================================================= */

async function getFactors() {

    const {
        data,
        error
    } =
        await supabaseClient.auth.mfa.listFactors();


    if (error) {
        throw error;
    }


    console.log(
        "SUPABASE MFA FACTORS:",
        data
    );


    return data || {
        all: [],
        totp: [],
        phone: []
    };
}


/* =========================================================
   CREATE NEW TOTP
   ========================================================= */

async function createNewTOTP() {

    showMessage(
        "Creating your new Super Admin MFA setup...",
        "success"
    );


    const {
        data,
        error
    } =
        await supabaseClient.auth.mfa.enroll({

            factorType: "totp",

            friendlyName:
                "MUNKA PIGGERY Super Admin",

            issuer:
                "MUNKA PIGGERY"
        });


    if (error) {

        console.error(
            "TOTP enrollment error:",
            error
        );

        throw error;
    }


    if (!data || !data.id) {

        throw new Error(
            "Supabase did not return the new MFA factor."
        );
    }


    activeFactorId =
        data.id;


    console.log(
        "NEW TOTP FACTOR:",
        data
    );


    /* =====================================================
       SECRET
       ===================================================== */

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


    /* =====================================================
       QR CODE
       ===================================================== */

    if (
        data.totp &&
        data.totp.qr_code
    ) {

        const svg =
            data.totp.qr_code;


        const dataUrl =
            "data:image/svg+xml;charset=utf-8," +
            encodeURIComponent(svg);


        qrCode.src =
            dataUrl;


        qrCode.style.display =
            "block";

    } else {

        throw new Error(
            "Supabase did not return the QR code."
        );
    }


    stopLoading();


    if (setupContent) {

        setupContent.style.display =
            "block";
    }


    if (verificationCode) {

        verificationCode.disabled =
            false;
    }


    if (verifyButton) {

        verifyButton.disabled =
            false;

        verifyButton.textContent =
            "VERIFY & ENABLE MFA";
    }


    showMessage(
        "Scan the NEW QR code with Google Authenticator, then enter the current 6-digit code.",
        "success"
    );
}


/* =========================================================
   HANDLE EXISTING TOTP
   ========================================================= */

async function handleExistingTOTP(totpFactors) {

    console.log(
        "Existing TOTP factors:",
        totpFactors
    );


    if (!Array.isArray(totpFactors)) {
        return false;
    }


    if (totpFactors.length === 0) {

        return false;
    }


    /*
       We have found an existing factor.

       Do NOT enroll another one because Supabase
       will reject the duplicate friendly name.
    */

    const factor =
        totpFactors[0];


    activeFactorId =
        factor.id;


    console.log(
        "Using existing TOTP factor:",
        factor
    );


    stopLoading();


    if (setupContent) {

        setupContent.style.display =
            "block";
    }


    /*
       IMPORTANT:

       Supabase does not normally return the original
       secret/QR code again for an already-created factor.

       Therefore we cannot reconstruct the original QR
       code from listFactors().
    */

    if (secretElement) {

        secretElement.textContent =
            "Existing MFA setup detected.";
    }


    if (qrCode) {

        qrCode.style.display =
            "none";
    }


    if (verificationCode) {

        verificationCode.disabled =
            false;
    }


    if (verifyButton) {

        verifyButton.disabled =
            false;

        verifyButton.textContent =
            "VERIFY EXISTING MFA";
    }


    showMessage(
        "An existing Super Admin MFA factor was found. Open Google Authenticator and enter the current 6-digit code for MUNKA PIGGERY Super Admin.",
        "success"
    );


    return true;
}


/* =========================================================
   CREATE CHALLENGE
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
    } =
        await supabaseClient.auth.mfa.challenge({

            factorId:
                activeFactorId
        });


    if (error) {
        throw error;
    }


    if (!data || !data.id) {

        throw new Error(
            "MFA challenge could not be created."
        );
    }


    currentChallengeId =
        data.id;


    return data.id;
}


/* =========================================================
   VERIFY MFA
   ========================================================= */

async function verifyMFA() {

    const code =
        verificationCode.value
            .replace(/\D/g, "")
            .slice(0, 6);


    if (!activeFactorId) {

        showMessage(
            "No MFA factor is available.",
            "error"
        );

        return;
    }


    if (!/^\d{6}$/.test(code)) {

        showMessage(
            "Enter the current 6-digit code from Google Authenticator.",
            "error"
        );

        verificationCode.focus();

        return;
    }


    verifyButton.disabled =
        true;


    verifyButton.textContent =
        "VERIFYING...";


    try {

        /* =================================================
           CREATE CHALLENGE
           ================================================= */

        await createChallenge();


        /* =================================================
           VERIFY
           ================================================= */

        const {
            data,
            error
        } =
            await supabaseClient.auth.mfa.verify({

                factorId:
                    activeFactorId,

                challengeId:
                    currentChallengeId,

                code:
                    code
            });


        if (error) {
            throw error;
        }


        console.log(
            "MFA verification successful:",
            data
        );


        if (verificationCode) {

            verificationCode.disabled =
                true;
        }


        verifyButton.disabled =
            true;


        verifyButton.textContent =
            "MFA ENABLED ✓";


        showMessage(
            "MFA has been successfully verified and enabled for your Super Admin account.",
            "success"
        );


        /* =================================================
           CHECK ASSURANCE LEVEL
           ================================================= */

        const {
            data: assurance,
            error: assuranceError
        } =
            await supabaseClient.auth.mfa
                .getAuthenticatorAssuranceLevel();


        if (!assuranceError) {

            console.log(
                "AUTHENTICATOR ASSURANCE LEVEL:",
                assurance
            );
        }


    } catch (error) {

        console.error(
            "MFA verification error:",
            error
        );


        currentChallengeId =
            null;


        verifyButton.disabled =
            false;


        verifyButton.textContent =
            "VERIFY EXISTING MFA";


        showMessage(
            error.message ||
            "The MFA code could not be verified.",
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

async function initializeMFA() {

    try {

        /* -------------------------------------------------
           CHECK SUPABASE
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
           CHECK SUPER ADMIN
           ------------------------------------------------- */

        await getSuperAdmin();


        /* -------------------------------------------------
           CHECK EXISTING FACTORS
           ------------------------------------------------- */

        showMessage(
            "Checking your existing MFA configuration...",
            "success"
        );


        const factors =
            await getFactors();


        const totpFactors =
            Array.isArray(factors.totp)
                ? factors.totp
                : [];


        console.log(
            "TOTP FACTOR COUNT:",
            totpFactors.length
        );


        /* -------------------------------------------------
           EXISTING FACTOR
           ------------------------------------------------- */

        if (totpFactors.length > 0) {

            await handleExistingTOTP(
                totpFactors
            );

            return;
        }


        /* -------------------------------------------------
           NO FACTOR — CREATE NEW ONE
           ------------------------------------------------- */

        console.log(
            "No TOTP factor exists. Creating a new one..."
        );


        await createNewTOTP();


    } catch (error) {

        console.error(
            "MFA SETUP ERROR:",
            error
        );


        stopLoading();


        showMessage(
            error.message ||
            "Unable to set up MFA.",
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
        initializeMFA
    );

} else {

    initializeMFA();
}