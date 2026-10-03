/* =========================================================
   MUNKA PIGGERY
   SUPER ADMIN MFA RESET + FRESH TOTP ENROLLMENT
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
   GET FACTORS
   ========================================================= */

async function getFactors() {

    const {
        data,
        error
    } = await supabaseClient.auth.mfa.listFactors();

    if (error) {
        throw error;
    }

    console.log(
        "Current MFA factors:",
        data
    );

    return data || {
        totp: [],
        phone: []
    };
}


/* =========================================================
   REMOVE EXISTING TOTP FACTORS
   ========================================================= */

async function removeExistingTOTPFactors() {

    const factors =
        await getFactors();


    const totpFactors =
        Array.isArray(factors.totp)
            ? factors.totp
            : [];


    if (totpFactors.length === 0) {

        console.log(
            "No existing TOTP factor found."
        );

        return;
    }


    console.log(
        "Existing TOTP factors found:",
        totpFactors
    );


    for (const factor of totpFactors) {

        if (!factor.id) {
            continue;
        }


        console.log(
            "Removing old TOTP factor:",
            factor.id
        );


        const {
            error
        } =
            await supabaseClient.auth.mfa.unenroll({
                factorId: factor.id
            });


        if (error) {

            throw new Error(
                "Could not remove the old MFA factor: " +
                error.message
            );
        }
    }


    console.log(
        "Old TOTP factor(s) removed successfully."
    );
}


/* =========================================================
   ENROLL FRESH TOTP
   ========================================================= */

async function enrollFreshTOTP() {

    console.log(
        "Creating fresh MUNKA PIGGERY TOTP factor..."
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
        "New factor:",
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
            "Supabase did not return a QR code."
        );
    }


    stopLoading();


    setupContent.style.display =
        "block";


    verificationCode.disabled =
        false;


    verifyButton.disabled =
        false;


    verifyButton.textContent =
        "VERIFY & ENABLE MFA";


    showMessage(
        "A fresh MFA factor has been created. Scan the new QR code with Google Authenticator, then enter the 6-digit code.",
        "success"
    );
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
   VERIFY NEW MFA
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

        /* -------------------------------------------------
           CREATE CHALLENGE
           ------------------------------------------------- */

        await createChallenge();


        /* -------------------------------------------------
           VERIFY
           ------------------------------------------------- */

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


        verificationCode.disabled =
            true;


        verifyButton.disabled =
            true;


        verifyButton.textContent =
            "MFA ENABLED ✓";


        showMessage(
            "MFA has been successfully enabled for your Super Admin account.",
            "success"
        );


        /*
           Check the current assurance level.
        */

        const {
            data: assurance,
            error: assuranceError
        } =
            await supabaseClient.auth.mfa
                .getAuthenticatorAssuranceLevel();


        if (!assuranceError) {

            console.log(
                "MFA assurance level:",
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
            "VERIFY & ENABLE MFA";


        showMessage(
            error.message ||
            "The code could not be verified. Make sure you are entering the current code generated from the NEW QR code.",
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

async function initializeMFAReset() {

    try {

        if (
            typeof supabaseClient === "undefined" ||
            !supabaseClient
        ) {

            throw new Error(
                "Supabase client is not available."
            );
        }


        /* -------------------------------------------------
           VERIFY SUPER ADMIN
           ------------------------------------------------- */

        await getSuperAdmin();


        stopLoading();


        /*
           IMPORTANT:

           Remove the old factor first.
           Then create a completely fresh one.
        */

        showMessage(
            "Checking the existing MFA configuration...",
            "success"
        );


        await removeExistingTOTPFactors();


        /*
           Give Supabase a moment before
           creating the new factor.
        */

        await new Promise(
            resolve =>
                setTimeout(resolve, 500)
        );


        /*
           CREATE NEW FACTOR
        */

        await enrollFreshTOTP();


    } catch (error) {

        console.error(
            "MFA reset/setup error:",
            error
        );


        stopLoading();


        showMessage(
            error.message ||
            "Unable to reset MFA.",
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
        initializeMFAReset
    );

} else {

    initializeMFAReset();
}