/* =========================================================
   MUNKA PIGGERY
   SUPER ADMIN MFA SETUP
   EXISTING TOTP FACTOR SUPPORT
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

    message.className =
        "message " + type;
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
            "MUNKA Super Admin profile could not be found."
        );
    }


    const role =
        String(user.role || "")
            .trim()
            .toLowerCase();


    if (role !== "super admin") {

        throw new Error(
            "Only the Super Admin can access MFA setup."
        );
    }


    const status =
        String(user.status || "")
            .trim()
            .toLowerCase();


    if (status !== "active") {

        throw new Error(
            "The Super Admin account is not active."
        );
    }


    return user;
}


/* =========================================================
   GET MFA FACTORS
   ========================================================= */

async function getMFAFactors() {

    const {
        data,
        error
    } = await supabaseClient.auth.mfa.listFactors();


    if (error) {
        throw error;
    }


    console.log(
        "MUNKA MFA factors:",
        data
    );


    return data || {
        all: [],
        totp: [],
        phone: []
    };
}


/* =========================================================
   FIND EXISTING TOTP
   ========================================================= */

function getExistingTOTP(factors) {

    if (!factors) {
        return null;
    }


    /*
       Supabase normally provides:

       factors.totp
    */

    if (
        Array.isArray(factors.totp) &&
        factors.totp.length > 0
    ) {

        console.log(
            "Existing TOTP factor found:",
            factors.totp[0]
        );

        return factors.totp[0];
    }


    /*
       Backup check using factors.all.
    */

    if (Array.isArray(factors.all)) {

        const totp =
            factors.all.find(
                factor =>
                    String(
                        factor.factor_type || ""
                    ).toLowerCase() === "totp"
            );


        if (totp) {

            console.log(
                "Existing TOTP found in all factors:",
                totp
            );

            return totp;
        }
    }


    return null;
}


/* =========================================================
   SHOW EXISTING FACTOR
   ========================================================= */

function showExistingFactor(factor) {

    activeFactorId =
        factor.id;


    stopLoading();


    if (setupContent) {

        setupContent.style.display =
            "block";
    }


    /*
       Hide QR because this factor
       already exists.
    */

    if (qrCode) {

        qrCode.style.display =
            "none";

        qrCode.removeAttribute("src");
    }


    /*
       Tell the user to use the
       existing Google Authenticator.
    */

    if (secretElement) {

        secretElement.textContent =
            "Existing MFA is connected. Use the current 6-digit code shown in Google Authenticator.";
    }


    if (verificationCode) {

        verificationCode.value = "";

        verificationCode.disabled = false;

        verificationCode.focus();
    }


    if (verifyButton) {

        verifyButton.disabled = false;

        verifyButton.textContent =
            "VERIFY MFA";
    }


    showMessage(
        "Your existing MFA factor was found. Enter the current 6-digit code from Google Authenticator.",
        "success"
    );
}


/* =========================================================
   CREATE NEW TOTP
   ========================================================= */

async function createNewTOTP() {

    console.log(
        "No existing TOTP factor found."
    );


    /*
       ONLY HERE do we enroll.

       This function is NOT called when
       an existing TOTP factor exists.
    */

    const {
        data,
        error
    } =
        await supabaseClient.auth.mfa.enroll({

            factorType: "totp",

            friendlyName:
                "MUNKA PIGGERY Super Admin"
        });


    if (error) {
        throw error;
    }


    if (!data || !data.id) {

        throw new Error(
            "Supabase did not return a new MFA factor."
        );
    }


    activeFactorId =
        data.id;


    console.log(
        "New MFA factor created:",
        data
    );


    /* -----------------------------------------------------
       SECRET
       ----------------------------------------------------- */

    if (
        data.totp &&
        data.totp.secret
    ) {

        if (secretElement) {

            secretElement.textContent =
                data.totp.secret;
        }

    } else {

        if (secretElement) {

            secretElement.textContent =
                "Secret unavailable.";
        }
    }


    /* -----------------------------------------------------
       QR CODE
       ----------------------------------------------------- */

    if (
        data.totp &&
        data.totp.qr_code
    ) {

        const svg =
            data.totp.qr_code;


        const dataUrl =
            "data:image/svg+xml;charset=utf-8," +
            encodeURIComponent(svg);


        if (qrCode) {

            qrCode.src =
                dataUrl;

            qrCode.style.display =
                "block";
        }

    } else {

        throw new Error(
            "Supabase did not return the MFA QR code."
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
            "ENABLE MFA";
    }


    showMessage(
        "Scan the QR code with your authenticator app, then enter the 6-digit code.",
        "success"
    );
}


/* =========================================================
   CREATE MFA CHALLENGE
   ========================================================= */

async function createChallenge() {

    if (!activeFactorId) {

        throw new Error(
            "No MFA factor is available."
        );
    }


    console.log(
        "Creating MFA challenge for factor:",
        activeFactorId
    );


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
   VERIFY CODE
   ========================================================= */

async function verifyMFA() {

    if (!verificationCode) {
        return;
    }


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
            "Please enter the current 6-digit code from Google Authenticator.",
            "error"
        );

        verificationCode.focus();

        return;
    }


    if (verifyButton) {

        verifyButton.disabled =
            true;

        verifyButton.textContent =
            "VERIFYING...";
    }


    try {

        /* -------------------------------------------------
           CHALLENGE
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


        /* -------------------------------------------------
           SUCCESS
           ------------------------------------------------- */

        verificationCode.disabled =
            true;


        if (verifyButton) {

            verifyButton.disabled =
                true;

            verifyButton.textContent =
                "MFA VERIFIED ✓";
        }


        showMessage(
            "MFA has been successfully verified for your Super Admin account.",
            "success"
        );


        /* -------------------------------------------------
           CHECK ASSURANCE LEVEL
           ------------------------------------------------- */

        try {

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

            console.warn(
                "Could not read assurance level:",
                error
            );
        }


    } catch (error) {

        console.error(
            "MFA verification failed:",
            error
        );


        currentChallengeId =
            null;


        if (verifyButton) {

            verifyButton.disabled =
                false;

            verifyButton.textContent =
                "VERIFY MFA";
        }


        showMessage(
            error.message ||
            "The MFA code could not be verified. Please enter the current code from Google Authenticator.",
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
   INITIALIZE
   ========================================================= */

async function initializeMFA() {

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
           SUPER ADMIN CHECK
           ------------------------------------------------- */

        await getSuperAdmin();


        /* -------------------------------------------------
           GET EXISTING FACTORS
           ------------------------------------------------- */

        const factors =
            await getMFAFactors();


        /* -------------------------------------------------
           FIND TOTP
           ------------------------------------------------- */

        const existingTOTP =
            getExistingTOTP(factors);


        /* =================================================
           IMPORTANT
           =================================================

           IF A TOTP FACTOR EXISTS:

           DO NOT CALL enroll().

           USE THE EXISTING FACTOR.
           ================================================= */

        if (existingTOTP) {

            console.log(
                "USING EXISTING MFA FACTOR:",
                existingTOTP.id
            );


            showExistingFactor(
                existingTOTP
            );


            return;
        }


        /* =================================================
           NO TOTP EXISTS

           Only now can we create one.
           ================================================= */

        await createNewTOTP();


    } catch (error) {

        console.error(
            "MUNKA MFA initialization error:",
            error
        );


        stopLoading();


        showMessage(
            error.message ||
            "Unable to prepare MFA.",
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