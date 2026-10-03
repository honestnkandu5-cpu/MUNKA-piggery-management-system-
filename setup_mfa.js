/* =========================================================
   MUNKA PIGGERY
   SUPER ADMIN MFA SETUP
   TOTP AUTHENTICATOR
   ========================================================= */

let enrolledFactorId = null;


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
   LOADING
   ========================================================= */

function stopLoading() {

    loadingMessage.style.display = "none";
}


/* =========================================================
   CHECK SUPER ADMIN
   ========================================================= */

async function checkSuperAdmin() {

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


    /* -----------------------------------------------------
       Get MUNKA user profile
       ----------------------------------------------------- */

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
       Check role
       ----------------------------------------------------- */

    if (
        String(user.role || "").trim().toLowerCase()
        !== "super admin"
    ) {

        throw new Error(
            "Only the Super Admin can set up MFA."
        );
    }


    /* -----------------------------------------------------
       Check status
       ----------------------------------------------------- */

    if (
        String(user.status || "").trim().toLowerCase()
        !== "active"
    ) {

        throw new Error(
            "This Super Admin account is not active."
        );
    }


    return user;
}


/* =========================================================
   LOAD EXISTING MFA FACTORS
   ========================================================= */

async function getMFAFactors() {

    const {
        data,
        error
    } = await supabaseClient.auth.mfa.listFactors();

    if (error) {
        throw error;
    }

    return data;
}


/* =========================================================
   REMOVE OLD UNVERIFIED TOTP FACTORS
   ========================================================= */

async function removeOldUnverifiedFactors(factors) {

    if (!factors || !factors.totp) {
        return;
    }

    const unverifiedFactors =
        factors.totp.filter(
            factor =>
                String(factor.status || "").toLowerCase()
                !== "verified"
        );


    for (const factor of unverifiedFactors) {

        try {

            await supabaseClient.auth.mfa.unenroll({
                factorId: factor.id
            });

        } catch (error) {

            console.warn(
                "Could not remove old unverified MFA factor:",
                error
            );
        }
    }
}


/* =========================================================
   START MFA ENROLLMENT
   ========================================================= */

async function startMFAEnrollment() {

    const {
        data,
        error
    } = await supabaseClient.auth.mfa.enroll({
        factorType: "totp",
        friendlyName: "MUNKA PIGGERY Super Admin"
    });


    if (error) {
        throw error;
    }


    if (!data) {

        throw new Error(
            "Supabase did not return MFA enrollment data."
        );
    }


    if (!data.id) {

        throw new Error(
            "MFA factor ID was not returned."
        );
    }


    if (!data.totp) {

        throw new Error(
            "TOTP information was not returned."
        );
    }


    enrolledFactorId = data.id;


    /* -----------------------------------------------------
       SECRET
       ----------------------------------------------------- */

    if (data.totp.secret) {

        secretElement.textContent =
            data.totp.secret;

    } else {

        secretElement.textContent =
            "Secret was not returned.";
    }


    /* -----------------------------------------------------
       QR CODE
       -----------------------------------------------------

       Supabase returns the QR code as SVG text.

       We convert the SVG directly into a browser
       data URL.

       No external QR service is used.
       ----------------------------------------------------- */

    if (data.totp.qr_code) {

        const svgDataUrl =
            "data:image/svg+xml;charset=utf-8," +
            encodeURIComponent(data.totp.qr_code);

        qrCode.src = svgDataUrl;

    } else {

        throw new Error(
            "Supabase did not return the MFA QR code."
        );
    }


    /* -----------------------------------------------------
       SHOW SETUP
       ----------------------------------------------------- */

    setupContent.style.display = "block";

    stopLoading();
}


/* =========================================================
   ENABLE MFA
   ========================================================= */

async function enableMFA() {

    const code =
        verificationCode.value
            .replace(/\D/g, "")
            .trim();


    /* -----------------------------------------------------
       Validate code
       ----------------------------------------------------- */

    if (!enrolledFactorId) {

        showMessage(
            "MFA enrollment has not been started.",
            "error"
        );

        return;
    }


    if (!/^\d{6}$/.test(code)) {

        showMessage(
            "Please enter the 6-digit code from your authenticator app.",
            "error"
        );

        verificationCode.focus();

        return;
    }


    /* -----------------------------------------------------
       Disable button
       ----------------------------------------------------- */

    verifyButton.disabled = true;

    verifyButton.textContent =
        "VERIFYING MFA...";


    try {

        /* -------------------------------------------------
           CREATE CHALLENGE
           ------------------------------------------------- */

        const {
            data: challengeData,
            error: challengeError
        } = await supabaseClient.auth.mfa.challenge({
            factorId: enrolledFactorId
        });


        if (challengeError) {
            throw challengeError;
        }


        if (
            !challengeData ||
            !challengeData.id
        ) {

            throw new Error(
                "MFA challenge could not be created."
            );
        }


        /* -------------------------------------------------
           VERIFY CODE
           ------------------------------------------------- */

        const {
            data: verifyData,
            error: verifyError
        } = await supabaseClient.auth.mfa.verify({

            factorId: enrolledFactorId,

            challengeId: challengeData.id,

            code: code

        });


        if (verifyError) {
            throw verifyError;
        }


        /* -------------------------------------------------
           SUCCESS
           ------------------------------------------------- */

        console.log(
            "MFA verification successful:",
            verifyData
        );


        verificationCode.disabled = true;

        verifyButton.disabled = true;

        verifyButton.textContent =
            "MFA ENABLED ✓";


        showMessage(
            "MFA has been successfully enabled for your Super Admin account.",
            "success"
        );


        /* -------------------------------------------------
           Check assurance level
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
                    "MFA assurance level:",
                    assuranceData
                );
            }

        } catch (error) {

            console.warn(
                "Could not read MFA assurance level:",
                error
            );
        }


    } catch (error) {

        console.error(
            "MFA verification error:",
            error
        );


        verifyButton.disabled = false;

        verifyButton.textContent =
            "ENABLE MFA";


        showMessage(
            error.message ||
            "The MFA verification failed. Please check the 6-digit code and try again.",
            "error"
        );
    }
}


/* =========================================================
   CODE INPUT
   ========================================================= */

verificationCode.addEventListener(
    "input",
    function () {

        this.value =
            this.value
                .replace(/\D/g, "")
                .slice(0, 6);

    }
);


/* =========================================================
   ENABLE BUTTON
   ========================================================= */

verifyButton.addEventListener(
    "click",
    enableMFA
);


/* =========================================================
   INITIALIZATION
   ========================================================= */

async function initializeMFASetup() {

    try {

        /* -------------------------------------------------
           Confirm Supabase client
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
           Confirm Super Admin
           ------------------------------------------------- */

        await checkSuperAdmin();


        /* -------------------------------------------------
           Check existing MFA factors
           ------------------------------------------------- */

        let factors =
            await getMFAFactors();


        const verifiedTotp =
            (factors.totp || []).find(
                factor =>
                    String(factor.status || "").toLowerCase()
                    === "verified"
            );


        /* -------------------------------------------------
           MFA ALREADY ENABLED
           ------------------------------------------------- */

        if (verifiedTotp) {

            stopLoading();

            alreadyEnabled.style.display =
                "block";

            return;
        }


        /* -------------------------------------------------
           Remove previous incomplete enrollment
           ------------------------------------------------- */

        await removeOldUnverifiedFactors(
            factors
        );


        /* -------------------------------------------------
           Start NEW enrollment
           ------------------------------------------------- */

        await startMFAEnrollment();


    } catch (error) {

        console.error(
            "MFA setup initialization error:",
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

document.addEventListener(
    "DOMContentLoaded",
    initializeMFASetup
);