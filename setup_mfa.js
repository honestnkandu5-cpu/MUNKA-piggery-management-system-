// =====================================================
// MUNKA PIGGERY
// SUPER ADMIN MFA SETUP
// FINAL VERSION - MATCHED TO setup_mfa.html
// =====================================================

let enrolledFactorId = null;


// =====================================================
// SHOW MESSAGE
// =====================================================

function showMessage(text, type = "info") {

    const message =
        document.getElementById("message");

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
// SHOW MFA CONTENT
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

    const {
        data,
        error
    } = await supabaseClient.auth.getSession();

    if (error) {
        throw error;
    }

    if (!data.session) {

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
       The URI is converted into a QR image.

       We are NOT treating Supabase's qr_code
       as an SVG anymore.
    */

    const encodedURI =
        encodeURIComponent(uri);


    const qrURL =
        "https://quickchart.io/qr" +
        "?text=" +
        encodedURI +
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
// ENABLE VERIFICATION
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
// LOAD EXISTING MFA FACTOR
// =====================================================

async function loadExistingFactor() {

    const {
        data,
        error
    } = await supabaseClient.auth.listFactors();


    if (error) {
        throw error;
    }


    const totpFactors =
        data?.totp || [];


    // -----------------------------------------------
    // VERIFIED FACTOR
    // -----------------------------------------------

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


    // -----------------------------------------------
    // UNVERIFIED FACTOR
    // -----------------------------------------------

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


        showMessage(
            "An MFA setup is already waiting for verification. We will not create another factor.",
            "info"
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
    } = await supabaseClient.auth.mfa.enroll({

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


    // -----------------------------------------------
    // SECRET
    // -----------------------------------------------

    displaySecret(
        data.totp.secret
    );


    // -----------------------------------------------
    // QR CODE USING URI
    // -----------------------------------------------

    generateQRCode(
        data.totp.uri
    );


    // -----------------------------------------------
    // SHOW CONTENT
    // -----------------------------------------------

    showSetupContent();

    enableVerification();


    showMessage(
        "MFA setup is ready. Scan the QR code with your authenticator app, then enter the 6-digit code.",
        "success"
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


        // Check Super Admin
        await checkSuperAdmin();


        // Check existing factor
        const existing =
            await loadExistingFactor();


        // If factor already exists,
        // DO NOT create another one.
        if (existing.exists) {

            return;
        }


        // Create fresh factor
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
// VERIFY MFA CODE
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


    const code =
       