// =====================================================
// MUNKA PIGGERY - SUPER ADMIN MFA SETUP
// Uses Supabase's own QR code - NO external QR library
// =====================================================

let enrolledFactorId = null;

// -----------------------------------------------------
// GET CURRENT SUPER ADMIN
// -----------------------------------------------------
async function getSuperAdmin() {

    const {
        data: sessionData,
        error: sessionError
    } = await supabaseClient.auth.getSession();

    if (sessionError || !sessionData.session) {
        throw new Error("Please log in as Super Admin first.");
    }

    const authUserId = sessionData.session.user.id;

    const {
        data: user,
        error
    } = await supabaseClient
        .from("users")
        .select("*")
        .eq("auth_user_id", authUserId)
        .single();

    if (error || !user) {
        throw new Error("Super Admin profile was not found.");
    }

    if (String(user.role).toLowerCase() !== "super admin") {
        throw new Error("Only the Super Admin can set up MFA.");
    }

    if (String(user.status).toLowerCase() !== "active") {
        throw new Error("The Super Admin account is not active.");
    }

    return user;
}


// -----------------------------------------------------
// SHOW MESSAGE
// -----------------------------------------------------
function showMessage(message, type = "info") {

    const messageBox = document.getElementById("message");

    if (!messageBox) return;

    messageBox.textContent = message;

    messageBox.style.display = "block";

    if (type === "error") {
        messageBox.style.color = "#b91c1c";
    } else if (type === "success") {
        messageBox.style.color = "#15803d";
    } else {
        messageBox.style.color = "#1f2937";
    }
}


// -----------------------------------------------------
// DISPLAY QR CODE FROM SUPABASE
// -----------------------------------------------------
function displaySupabaseQRCode(qrCodeValue) {

    const qrImage = document.getElementById("qrCode");

    if (!qrImage) {
        throw new Error("QR code image element was not found.");
    }

    if (!qrCodeValue) {
        throw new Error("Supabase did not provide a QR code.");
    }

    /*
       Supabase returns the QR code as an SVG string.

       We convert the SVG directly into a browser data URL.
       No QR library is required.
    */

    let svg = qrCodeValue;

    if (!svg.trim().startsWith("<svg")) {
        throw new Error("The QR code returned by Supabase is not a valid SVG.");
    }

    const svgDataUrl =
        "data:image/svg+xml;charset=utf-8," +
        encodeURIComponent(svg);

    qrImage.src = svgDataUrl;

    qrImage.style.display = "block";

    qrImage.onerror = function () {
        showMessage(
            "The QR code could not be displayed. Please refresh the page.",
            "error"
        );
    };
}


// -----------------------------------------------------
// DISPLAY MFA DETAILS
// -----------------------------------------------------
function displayMFASetup(enrollData) {

    const secretElement =
        document.getElementById("secret");

    const qrImage =
        document.getElementById("qrCode");

    const verifyButton =
        document.getElementById("verifyButton");

    const verificationInput =
        document.getElementById("verificationCode");


    // -----------------------------
    // SECRET
    // -----------------------------
    if (secretElement && enrollData.totp.secret) {

        secretElement.textContent =
            enrollData.totp.secret;

        secretElement.style.display = "inline";
    }


    // -----------------------------
    // QR CODE
    // -----------------------------
    if (qrImage && enrollData.totp.qr_code) {

        displaySupabaseQRCode(
            enrollData.totp.qr_code
        );

    } else {

        /*
           If qr_code is unavailable, use the URI
           as a fallback message.
        */

        if (qrImage) {
            qrImage.style.display = "none";
        }

        showMessage(
            "Supabase did not provide a QR image. Use the setup secret shown below in your authenticator app.",
            "info"
        );
    }


    // -----------------------------
    // ENABLE VERIFICATION
    // -----------------------------
    if (verifyButton) {
        verifyButton.disabled = false;
        verifyButton.style.display = "block";
    }

    if (verificationInput) {
        verificationInput.disabled = false;
        verificationInput.style.display = "block";
        verificationInput.focus();
    }
}


// -----------------------------------------------------
// CREATE FRESH MFA FACTOR
// -----------------------------------------------------
async function createMFAFactor() {

    try {

        showMessage(
            "Preparing Super Admin MFA setup..."
        );


        // Check Super Admin
        await getSuperAdmin();


        // ---------------------------------------------
        // CHECK EXISTING FACTORS
        // ---------------------------------------------
        const {
            data: factorsData,
            error: factorsError
        } = await supabaseClient.auth.mfa.listFactors();


        if (factorsError) {

            throw factorsError;
        }


        const totpFactors =
            factorsData?.totp || [];


        /*
           If a verified TOTP already exists,
           do NOT create another one.
        */

        const verifiedFactor =
            totpFactors.find(
                factor =>
                    factor.status === "verified"
            );


        if (verifiedFactor) {

            enrolledFactorId =
                verifiedFactor.id;

            showMessage(
                "MFA is already enabled for this Super Admin account.",
                "success"
            );

            const verifyButton =
                document.getElementById(
                    "verifyButton"
                );

            if (verifyButton) {
                verifyButton.style.display =
                    "none";
            }

            return;
        }


        /*
           If an unverified factor exists,
           use that factor rather than creating
           another duplicate.
        */

        const unverifiedFactor =
            totpFactors.find(
                factor =>
                    factor.status !== "verified"
            );


        if (unverifiedFactor) {

            enrolledFactorId =
                unverifiedFactor.id;

            showMessage(
                "An MFA setup is already in progress. Use the QR code or secret already provided.",
                "info"
            );

            return;
        }


        // ---------------------------------------------
        // ENROLL NEW TOTP
        // ---------------------------------------------
        showMessage(
            "Creating your Super Admin MFA setup..."
        );


        const {
            data: enrollData,
            error: enrollError
        } = await supabaseClient.auth.mfa.enroll({

            factorType: "totp",

            friendlyName:
                "MUNKA PIGGERY Super Admin MFA",

            issuer:
                "MUNKA PIGGERY"
        });


        if (enrollError) {

            throw enrollError;
        }


        if (!enrollData ||
            !enrollData.id ||
            !enrollData.totp) {

            throw new Error(
                "Supabase did not return the MFA setup information."
            );
        }


        enrolledFactorId =
            enrollData.id;


        // ---------------------------------------------
        // DISPLAY QR + SECRET
        // ---------------------------------------------
        displayMFASetup(
            enrollData
        );


        showMessage(
            "MFA setup created. Scan the QR code with Google Authenticator, or use the setup secret.",
            "success"
        );


    } catch (error) {

        console.error(
            "MFA SETUP ERROR:",
            error
        );

        showMessage(
            error.message ||
            "Unable to set up MFA.",
            "error"
        );
    }
}


// -----------------------------------------------------
// VERIFY MFA CODE
// -----------------------------------------------------
async function verifyMFA() {

    const codeInput =
        document.getElementById(
            "verificationCode"
        );

    const verifyButton =
        document.getElementById(
            "verifyButton"
        );


    const code =
        codeInput?.value.trim();


    if (!enrolledFactorId) {

        showMessage(
            "No MFA factor is available for verification.",
            "error"
        );

        return;
    }


    if (!/^\d{6}$/.test(code)) {

        showMessage(
            "Please enter the 6-digit code from your authenticator app.",
            "error"
        );

        return;
    }


    try {

        verifyButton.disabled = true;

        verifyButton.textContent =
            "Verifying...";


        // ---------------------------------------------
        // CREATE CHALLENGE
        // ---------------------------------------------
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


        // ---------------------------------------------
        // VERIFY CODE
        // ---------------------------------------------
        const {
            error: verifyError
        } =
            await supabaseClient.auth.mfa.verify({

                factorId:
                    enrolledFactorId,

                challengeId:
                    challengeData.id,

                code:
                    code
            });


        if (verifyError) {

            throw verifyError;
        }


        // ---------------------------------------------
        // SUCCESS
        // ---------------------------------------------
        showMessage(
            "MFA ENABLED SUCCESSFULLY ✓ Your Super Admin account is now protected with MFA.",
            "success"
        );


        codeInput.disabled = true;

        verifyButton.disabled = true;

        verifyButton.textContent =
            "MFA Enabled ✓";


    } catch (error) {

        console.error(
            "MFA VERIFICATION ERROR:",
            error
        );


        showMessage(
            error.message ||
            "The verification code was not accepted.",
            "error"
        );


        verifyButton.disabled =
            false;

        verifyButton.textContent =
            "Verify & Enable MFA";
    }
}


// -----------------------------------------------------
// BUTTON
// -----------------------------------------------------
function setupMFAButton() {

    const verifyButton =
        document.getElementById(
            "verifyButton"
        );

    if (!verifyButton) return;

    verifyButton.addEventListener(
        "click",
        verifyMFA
    );
}


// -----------------------------------------------------
// INITIALIZE
// -----------------------------------------------------
async function initializeMFA() {

    try {

        setupMFAButton();

        await createMFAFactor();

    } catch (error) {

        console.error(
            "MFA INITIALIZATION ERROR:",
            error
        );

        showMessage(
            error.message ||
            "Unable to initialize MFA.",
            "error"
        );
    }
}


// -----------------------------------------------------
// START
// -----------------------------------------------------
document.addEventListener(
    "DOMContentLoaded",
    initializeMFA
);