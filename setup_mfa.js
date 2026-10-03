/* =========================================================
   MUNKA PIGGERY
   SUPER ADMIN — FINAL MFA ENROLLMENT
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
   CHECK SUPER ADMIN
   ========================================================= */

async function checkSuperAdmin() {

    const {
        data,
        error
    } =
        await supabaseClient.auth.getSession();

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
    } =
        await supabaseClient
            .from("users")
            .select("full_name, role, status, auth_user_id")
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
            "Only the Super Admin can set up MFA."
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
        "CURRENT MFA FACTORS:",
        data
    );


    return data || {
        all: [],
        totp: [],
        phone: []
    };
}


/* =========================================================
   REMOVE ONLY THE TEST FACTOR
   ========================================================= */

async function removeTestFactor() {

    const factors =
        await getFactors();


    const totpFactors =
        Array.isArray(factors.totp)
            ? factors.totp
            : [];


    const testFactors =
        totpFactors.filter(
            factor =>
                String(
                    factor.friendly_name || ""
                ).trim() ===
                "MUNKA PIGGERY MFA TEST"
        );


    if (testFactors.length === 0) {

        console.log(
            "No temporary test factor found."
        );

        return;
    }


    showMessage(
        "Removing the temporary MFA test factor...",
        "success"
    );


    for (const factor of testFactors) {

        if (!factor.id) {
            continue;
        }


        const {
            error
        } =
            await supabaseClient.auth.mfa.unenroll({
                factorId: factor.id
            });


        if (error) {

            throw new Error(
                "Could not remove the temporary test factor: " +
                error.message
            );
        }
    }


    console.log(
        "Temporary test factor removed."
    );
}


/* =========================================================
   CREATE REAL MFA FACTOR
   ========================================================= */

async function createRealMFA() {

    showMessage(
        "Creating the real MUNKA PIGGERY Super Admin MFA factor...",
        "success"
    );


    const {
        data,
        error
    } =
        await supabaseClient.auth.mfa.enroll({

            factorType: "totp",

            friendlyName:
                "MUNKA PIGGERY Super Admin MFA",

            issuer:
                "MUNKA PIGGERY"
        });


    if (error) {

        console.error(
            "REAL MFA ENROLLMENT ERROR:",
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
        "REAL MFA FACTOR CREATED:",
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
        "NEW MFA CREATED. Scan this NEW QR code with Google Authenticator, then enter the current 6-digit code.",
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
            "Enter the current 6-digit Google Authenticator code.",
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

        await createChallenge();


        const {
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


        verificationCode.disabled =
            true;


        verifyButton.disabled =
            true;


        verifyButton.textContent =
            "MFA ENABLED ✓";


        showMessage(
            "MFA has been successfully enabled for the Super Admin account.",
            "success"
        );


        console.log(
            "SUPER ADMIN MFA ENABLED."
        );


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

        await checkSuperAdmin();


        /* -------------------------------------------------
           REMOVE ONLY TEST FACTOR
           ------------------------------------------------- */

        await removeTestFactor();


        /* -------------------------------------------------
           CHECK AGAIN
           ------------------------------------------------- */

        const factors =
            await getFactors();


        const totpFactors =
            Array.isArray(factors.totp)
                ? factors.totp
                : [];


        /*
           If another TOTP factor exists, stop.
           We don't want to accidentally create duplicates.
        */

        if (totpFactors.length > 0) {

            stopLoading();


            if (setupContent) {
                setupContent.style.display = "block";
            }


            showMessage(
                "A TOTP MFA factor already exists. No new factor was created.",
                "error"
            );


            return;
        }


        /* -------------------------------------------------
           CREATE REAL MFA
           ------------------------------------------------- */

        await createRealMFA();


    } catch (error) {

        console.error(
            "FINAL MFA SETUP ERROR:",
            error
        );


        stopLoading();


        showMessage(
            error.message ||
            "Unable to complete MFA setup.",
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