// =====================================================
// MUNKA PIGGERY
// SUPER ADMIN MFA SETUP
// COMPLETE REPLACEMENT VERSION
// =====================================================

let enrolledFactorId = null;
let challengeId = null;


// =====================================================
// SHOW MESSAGE
// =====================================================

function showMessage(text, type = "info") {

    const message = document.getElementById("message");

    if (!message) return;

    message.textContent = text;
    message.style.display = "block";

    message.className = "message";

    if (type === "success") {
        message.classList.add("success");
    }

    if (type === "error") {
        message.classList.add("error");
    }
}


// =====================================================
// LOADING MESSAGE
// =====================================================

function setLoading(text) {

    const loading =
        document.getElementById("loadingMessage");

    if (loading) {
        loading.textContent = text;
        loading.style.display = "block";
    }
}


// =====================================================
// HIDE LOADING / SHOW SETUP
// =====================================================

function showSetupContent() {

    const loading =
        document.getElementById("loadingMessage");

    const content =
        document.getElementById("setupContent");

    if (loading) {
        loading.style.display = "none";
    }

    if (content) {
        content.style.display = "block";
    }
}


// =====================================================
// CHECK SUPER ADMIN
// =====================================================

async function checkSuperAdmin() {

    if (
        typeof supabaseClient === "undefined" ||
        !supabaseClient
    ) {
        throw new Error(
            "Supabase connection could not be loaded."
        );
    }


    const {
        data,
        error
    } = await supabaseClient.auth.getSession();


    if (error) {
        throw error;
    }


    if (!data || !data.session) {

        throw new Error(
            "Please log in as Super Admin first."
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


    if (userError || !user) {

        throw new Error(
            "Super Admin profile was not found."
        );
    }


    if (
        String(user.role).toLowerCase() !==
        "super admin"
    ) {

        throw new Error(
            "Only the Super Admin can configure MFA."
        );
    }


    if (
        String(user.status).toLowerCase() !==
        "active"
    ) {

        throw new Error(
            "The Super Admin account is not active."
        );
    }


    return user;
}


// =====================================================
// DISPLAY SECRET
// =====================================================

function displaySecret(secret) {

    const secretBox =
        document.getElementById("secret");

    if (!secretBox) return;

    secretBox.textContent =
        secret || "Not available";
}


// =====================================================
// GENERATE QR CODE FROM TOTP URI
// =====================================================

function generateQRCode(uri) {

    const qrCode =
        document.getElementById("qrCode");


    if (!qrCode) {

        throw new Error(
            "QR code element was not found."
        );
    }


    if (!uri) {

        throw new Error(
            "Supabase did not provide a TOTP URI."
        );
    }


    /*
       We use the TOTP URI returned by Supabase.

       QuickChart converts the URI into a QR image.
    */

    const qrURL =
        "https://quickchart.io/qr" +
        "?text=" +
        encodeURIComponent(uri) +
        "&size=300" +
        "&margin=2";


    qrCode.src = qrURL;

    qrCode.style.display = "block";


    qrCode.onerror = function () {

        showMessage(
            "The QR image could not be loaded. You can use the Manual Setup Secret below.",
            "error"
        );
    };
}


// =====================================================
// ENABLE VERIFICATION CONTROLS
// =====================================================

function enableVerification() {

    const codeInput =
        document.getElementById(
            "verificationCode"
        );

    const button =
        document.getElementById(
            "verifyButton"
        );


    if (codeInput) {

        codeInput.disabled = false;
        codeInput.style.display = "block";
    }


    if (button) {

        button.disabled = false;
        button.style.display = "block";
    }
}


// =====================================================
// DISABLE VERIFICATION CONTROLS
// =====================================================

function disableVerification() {

    const codeInput =
        document.getElementById(
            "verificationCode"
        );

    const button =
        document.getElementById(
            "verifyButton"
        );


    if (codeInput) {
        codeInput.disabled = true;
    }


    if (button) {
        button.disabled = true;
    }
}


// =====================================================
// LOAD EXISTING MFA FACTOR
// =====================================================

async function loadExistingFactor() {

    const {
        data,
        error
    } = await supabaseClient.auth.mfa.listFactors();


    if (error) {
        throw error;
    }


    const totpFactors =
        data?.totp || [];


    // =================================================
    // VERIFIED FACTOR
    // =================================================

    const verified =
        totpFactors.find(
            factor =>
                factor.status === "verified"
        );


    if (verified) {

        enrolledFactorId =
            verified.id;


        setLoading(
            "MFA is already enabled."
        );


        showMessage(
            "Super Admin MFA is already enabled on this account.",
            "success"
        );


        return {
            exists: true,
            verified: true
        };
    }


    // =================================================
    // UNVERIFIED FACTOR
    // =================================================

    const unverified =
        totpFactors.find(
            factor =>
                factor.status !== "verified"
        );


    if (unverified) {

        enrolledFactorId =
            unverified.id;


        setLoading(
            "An existing MFA setup was found."
        );


        /*
           Supabase does not return the original
           secret/URI again for an existing factor.

           Therefore we do not create another factor.
        */

        showMessage(
            "An MFA setup is already waiting for verification. No new factor will be created.",
            "error"
        );


        return {
            exists: true,
            verified: false
        };
    }


    return {
        exists: false,
        verified: false
    };
}


// =====================================================
// CREATE NEW MFA FACTOR
// =====================================================

async function createNewMFA() {

    setLoading(
        "Creating secure MFA setup..."
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
        throw error;
    }


    if (
        !data ||
        !data.id ||
        !data.totp
    ) {

        throw new Error(
            "Supabase did not return the MFA setup information."
        );
    }


    enrolledFactorId =
        data.id;


    // =================================================
    // DISPLAY SECRET
    // =================================================

    displaySecret(
        data.totp.secret
    );


    // =================================================
    // GENERATE QR
    // =================================================

    generateQRCode(
        data.totp.uri
    );


    // =================================================
    // SHOW MFA CONTENT
    // =================================================

    showSetupContent();

    enableVerification();


    showMessage(
        "MFA setup is ready. Scan the QR code with your authenticator app, then enter the 6-digit code.",
        "success"
    );
}


// =====================================================
// VERIFY MFA
// =====================================================

async function verifyMFA() {

    const codeInput =
        document.getElementById(
            "verificationCode"
        );

    const button =
        document.getElementById(
            "verifyButton"
        );


    if (!enrolledFactorId) {

        showMessage(
            "No MFA factor is available for verification.",
            "error"
        );

        return;
    }


    const code =
        codeInput
            ? codeInput.value.trim()
            : "";


    // =================================================
    // CHECK CODE
    // =================================================

    if (!/^\d{6}$/.test(code)) {

        showMessage(
            "Please enter the 6-digit verification code from your authenticator app.",
            "error"
        );

        if (codeInput) {
            codeInput.focus();
        }

        return;
    }


    try {

        if (button) {
            button.disabled = true;
            button.textContent = "VERIFYING...";
        }


        showMessage(
            "Verifying your MFA code..."
        );


        // =================================================
        // CREATE CHALLENGE
        // =================================================

        const {
            data: challengeData,
            error: challengeError
        } =
            await supabaseClient.auth.mfa.challenge({

                factorId:
                    enrolledFactorId
            });


        if (challengeError) {
            throw challengeError;
        }


        if (
            !challengeData ||
            !challengeData.id
        ) {

            throw new Error(
                "Supabase did not create an MFA verification challenge."
            );
        }


        challengeId =
            challengeData.id;


        // =================================================
        // VERIFY CODE
        // =================================================

        const {
            data: verifyData,
            error: verifyError
        } =
            await supabaseClient.auth.mfa.verify({

                factorId:
                    enrolledFactorId,

                challengeId:
                    challengeId,

                code:
                    code
            });


        if (verifyError) {
            throw verifyError;
        }


        // =================================================
        // SUCCESS
        // =================================================

        showMessage(
            "MFA has been successfully enabled for the Super Admin account.",
            "success"
        );


        if (codeInput) {
            codeInput.disabled = true;
            codeInput.value = "";
        }


        if (button) {

            button.disabled = true;

            button.textContent =
                "MFA ENABLED ✓";
        }


        setLoading(
            "MFA setup completed successfully."
        );


    } catch (error) {

        console.error(
            "MFA VERIFICATION ERROR:",
            error
        );


        showMessage(
            error.message ||
            "The MFA verification code was not accepted.",
            "error"
        );


        if (button) {

            button.disabled = false;

            button.textContent =
                "ENABLE MFA";
        }
    }
}


// =====================================================
// BUTTON CONNECTION
// =====================================================

function connectVerifyButton() {

    const button =
        document.getElementById(
            "verifyButton"
        );


    if (!button) {

        console.error(
            "MFA verify button was not found."
        );

        return;
    }


    button.addEventListener(
        "click",
        verifyMFA
    );
}


// =====================================================
// INITIALIZE MFA
// =====================================================

async function initializeMFA() {

    try {

        setLoading(
            "Checking Super Admin MFA..."
        );


        // ---------------------------------------------
        // CHECK SUPER ADMIN
        // ---------------------------------------------

        await checkSuperAdmin();


        // ---------------------------------------------
        // CHECK EXISTING FACTORS
        // ---------------------------------------------

        const existing =
            await loadExistingFactor();


        // ---------------------------------------------
        // EXISTING FACTOR
        // ---------------------------------------------

        if (existing.exists) {

            /*
               Do NOT automatically delete it.
               Do NOT automatically create another one.
            */

            return;
        }


        // ---------------------------------------------
        // CREATE NEW FACTOR
        // ---------------------------------------------

        await createNewMFA();


    } catch (error) {

        console.error(
            "MFA INITIALIZATION ERROR:",
            error
        );


        setLoading(
            "MFA setup could not be completed."
        );


        showMessage(
            error.message ||
            "Unable to configure MFA.",
            "error"
        );
    }
}


// =====================================================
// PAGE START
// =====================================================

document.addEventListener(
    "DOMContentLoaded",
    function () {

        connectVerifyButton();

        initializeMFA();

    }
);