/* =========================================================
   MUNKA PIGGERY
   SUPER ADMIN — FINAL MFA ENROLLMENT
   QR CODE FIXED VERSION
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


    return data || {
        all: [],
        totp: [],
        phone: []
    };
}


/* =========================================================
   LOAD QR CODE LIBRARY
   ========================================================= */

function loadQRCodeLibrary() {

    return new Promise(
        (resolve, reject) => {

            if (
                typeof QRCode !== "undefined"
            ) {

                resolve();

                return;
            }


            const script =
                document.createElement("script");


            script.src =
                "https://cdn.jsdelivr.net/npm/qrcode@1.5.4/build/qrcode.min.js";


            script.onload =
                () => resolve();


            script.onerror =
                () =>
                    reject(
                        new Error(
                            "The QR code library could not be loaded. Check your internet connection."
                        )
                    );


            document.head.appendChild(script);
        }
    );
}


/* =========================================================
   GENERATE QR CODE
   ========================================================= */

async function generateQRCode(uri) {

    if (!uri) {

        throw new Error(
            "Supabase did not return the MFA setup URI."
        );
    }


    if (!qrCode) {

        throw new Error(
            "QR code image element was not found."
        );
    }


    await loadQRCodeLibrary();


    const generatedQR =
        await QRCode.toDataURL(
            uri,
            {
                width: 300,
                margin: 2,
                errorCorrectionLevel: "M"
            }
        );


    qrCode.src =
        generatedQR;


    qrCode.style.display =
        "block";


    qrCode.style.width =
        "300px";


    qrCode.style.height =
        "300px";


    qrCode.style.objectFit =
        "contain";


    qrCode.alt =
        "MUNKA PIGGERY Super Admin MFA QR Code";


    console.log(
        "QR code generated successfully."
    );
}


/* =========================================================
   CREATE REAL MFA
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
            "MFA ENROLLMENT ERROR:",
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

        throw new Error(
            "Supabase did not return the MFA setup secret."
        );
    }


    /* =====================================================
       QR CODE
       ===================================================== */

    if (
        data.totp &&
        data.totp.uri
    ) {

        await generateQRCode(
            data.totp.uri
        );

    } else {

        /*
           Some Supabase responses may provide
           qr_code instead of uri.

           Try the returned QR SVG as a fallback.
        */

        if (
            data.totp &&
            data.totp.qr_code
        ) {

            const svg =
                data.totp.qr_code;


            qrCode.src =
                "data:image/svg+xml;charset=utf-8," +
                encodeURIComponent(svg);


            qrCode.style.display =
                "block";

        } else {

            throw new Error(
                "Supabase did not return an MFA QR code or setup URI."
            );
        }
    }


    /* =====================================================
       SHOW SETUP
       ===================================================== */

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
        "Your NEW MFA has been created. Scan the QR code with Google Authenticator, then enter the current 6-digit code.",
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

        await createChallenge();


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
            "MFA VERIFICATION SUCCESS:",
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
            "MFA has been successfully enabled for your Super Admin account.",
            "success"
        );


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
            "MFA VERIFICATION ERROR:",
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
   VERIFY BUTTON
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
           CHECK EXISTING FACTORS
           ------------------------------------------------- */

        const factors =
            await getFactors();


        const totpFactors =
            Array.isArray(factors.totp)
                ? factors.totp
                : [];


        /*
           We expect no TOTP here because the test factor
           should have been removed before final enrollment.
        */

        if (totpFactors.length > 0) {

            stopLoading();


            if (setupContent) {
                setupContent.style.display = "block";
            }


            showMessage(
                "A TOTP MFA factor already exists. No additional factor was created.",
                "error"
            );


            return;
        }


        /* -------------------------------------------------
           CREATE REAL FACTOR
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