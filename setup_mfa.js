// =====================================
// MUNKA PIGGERY TECHNOLOGY
// SUPER ADMIN MFA ENROLLMENT
// SUPABASE TOTP MFA
// =====================================

let enrolledFactorId = null;


// =====================================
// ELEMENTS
// =====================================

const qrCode =
    document.getElementById("qrCode");

const secret =
    document.getElementById("secret");

const verificationCode =
    document.getElementById("verificationCode");

const verifyButton =
    document.getElementById("verifyButton");

const message =
    document.getElementById("message");


// =====================================
// MESSAGE HELPER
// =====================================

function showMessage(text, type = "error") {

    message.textContent = text;

    message.className = type;

}


// =====================================
// GENERATE QR CODE
// =====================================

function generateQRCode(text) {

    const encoded =
        encodeURIComponent(text);

    qrCode.src =
        "https://api.qrserver.com/v1/create-qr-code/?size=260x260&data=" +
        encoded;

}


// =====================================
// CHECK SUPABASE SESSION
// =====================================

async function initializeMFA() {

    try {

        if (
            typeof supabaseClient ===
            "undefined"
        ) {

            showMessage(
                "Supabase connection is not available."
            );

            return;

        }


        const {
            data: sessionData,
            error: sessionError
        } =
            await supabaseClient
                .auth
                .getSession();


        if (
            sessionError ||
            !sessionData.session
        ) {

            showMessage(
                "Please log in as Super Admin before setting up MFA."
            );

            return;

        }


        // =====================================
        // CHECK CURRENT USER PROFILE
        // =====================================

        const authUser =
            sessionData.session.user;


        const {
            data: userData,
            error: userError
        } =
            await supabaseClient
                .from("users")
                .select(
                    "id, full_name, role, status"
                )
                .eq(
                    "auth_user_id",
                    authUser.id
                )
                .single();


        if (
            userError ||
            !userData
        ) {

            showMessage(
                "Super Admin profile could not be found."
            );

            return;

        }


        // =====================================
        // VERIFY SUPER ADMIN
        // =====================================

        const role =
            String(
                userData.role || ""
            )
            .trim()
            .toLowerCase();


        const status =
            String(
                userData.status || ""
            )
            .trim()
            .toLowerCase();


        if (
            role !== "super admin"
        ) {

            showMessage(
                "Only the Super Admin can configure MFA."
            );

            return;

        }


        if (
            status !== "active"
        ) {

            showMessage(
                "Your Super Admin account is not active."
            );

            return;

        }


        // =====================================
        // CHECK EXISTING MFA FACTORS
        // =====================================

        const {
            data: factorsData,
            error: factorsError
        } =
            await supabaseClient
                .auth
                .mfa
                .listFactors();


        if (factorsError) {

            console.error(
                "MFA FACTOR ERROR:",
                factorsError
            );

            showMessage(
                "Unable to check MFA status."
            );

            return;

        }


        const verifiedFactors =
            factorsData &&
            factorsData.totp
                ? factorsData.totp.filter(
                    factor =>
                        factor.status ===
                        "verified"
                )
                : [];


        // =====================================
        // ALREADY ENABLED
        // =====================================

        if (
            verifiedFactors.length > 0
        ) {

            showMessage(
                "MFA is already enabled for this Super Admin account.",
                "success"
            );

            verifyButton.disabled =
                true;

            return;

        }


        // =====================================
        // ENROLL TOTP FACTOR
        // =====================================

        showMessage(
            "Generating your MFA setup..."
        );


        const {
            data: enrollData,
            error: enrollError
        } =
            await supabaseClient
                .auth
                .mfa
                .enroll({

                    factorType: "totp",

                    friendlyName:
                        "MUNKA PIGGERY Super Admin"

                });


        if (enrollError) {

            console.error(
                "MFA ENROLLMENT ERROR:",
                enrollError
            );

            showMessage(
                "MFA enrollment could not be started."
            );

            return;

        }


        enrolledFactorId =
            enrollData.id;


        // =====================================
        // DISPLAY SECRET
        // =====================================

        secret.textContent =
            enrollData.totp.secret;


        // =====================================
        // DISPLAY QR CODE
        // =====================================

        generateQRCode(
            enrollData.totp.uri
        );


        showMessage(
            "Scan the QR code with your authenticator app, then enter the 6-digit code.",
            "success"
        );

    }

    catch(error) {

        console.error(
            "MFA SETUP ERROR:",
            error
        );

        showMessage(
            "An unexpected error occurred while setting up MFA."
        );

    }

}


// =====================================
// VERIFY MFA
// =====================================

verifyButton.addEventListener(
    "click",
    async function() {

        const code =
            verificationCode
                .value
                .trim();


        if(!enrolledFactorId) {

            showMessage(
                "MFA enrollment has not been started."
            );

            return;

        }


        if(
            !/^\d{6}$/.test(code)
        ) {

            showMessage(
                "Please enter the 6-digit code from your authenticator app."
            );

            return;

        }


        verifyButton.disabled =
            true;

        verifyButton.textContent =
            "VERIFYING...";


        try {

            // =====================================
            // CREATE MFA CHALLENGE
            // =====================================

            const {
                data: challengeData,
                error: challengeError
            } =
                await supabaseClient
                    .auth
                    .mfa
                    .challenge({

                        factorId:
                            enrolledFactorId

                    });


            if(challengeError) {

                console.error(
                    "MFA CHALLENGE ERROR:",
                    challengeError
                );

                showMessage(
                    "Could not create the MFA verification challenge."
                );

                verifyButton.disabled =
                    false;

                verifyButton.textContent =
                    "ENABLE MFA";

                return;

            }


            // =====================================
            // VERIFY CODE
            // =====================================

            const {
                data: verifyData,
                error: verifyError
            } =
                await supabaseClient
                    .auth
                    .mfa
                    .verify({

                        factorId:
                            enrolledFactorId,

                        challengeId:
                            challengeData.id,

                        code:
                            code

                    });


            if(verifyError) {

                console.error(
                    "MFA VERIFICATION ERROR:",
                    verifyError
                );

                showMessage(
                    "The verification code is incorrect. Please try again."
                );

                verifyButton.disabled =
                    false;

                verifyButton.textContent =
                    "ENABLE MFA";

                verificationCode.value =
                    "";

                return;

            }


            // =====================================
            // SUCCESS
            // =====================================

            showMessage(
                "MFA has been successfully enabled for your Super Admin account.",
                "success"
            );


            verifyButton.textContent =
                "MFA ENABLED";


            verifyButton.disabled =
                true;


            verificationCode.disabled =
                true;


            console.log(
                "MFA ENABLED SUCCESSFULLY:",
                verifyData
            );

        }

        catch(error) {

            console.error(
                "MFA VERIFICATION SYSTEM ERROR:",
                error
            );

            showMessage(
                "An unexpected error occurred during MFA verification."
            );

            verifyButton.disabled =
                false;

            verifyButton.textContent =
                "ENABLE MFA";

        }

    }
);


// =====================================
// START
// =====================================

initializeMFA();

