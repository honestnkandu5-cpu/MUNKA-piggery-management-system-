/* =========================================================
   MUNKA PIGGERY
   MFA ENROLLMENT DIAGNOSTIC TEST
   ========================================================= */

async function testMFAEnrollment() {

    const message =
        document.getElementById("message");

    function show(text, type = "success") {

        if (!message) return;

        message.textContent = text;
        message.className = "message " + type;
    }

    try {

        show(
            "Testing MFA enrollment...",
            "success"
        );


        /* =================================================
           CHECK SUPABASE
           ================================================= */

        if (
            typeof supabaseClient === "undefined" ||
            !supabaseClient
        ) {

            throw new Error(
                "Supabase client is not available."
            );
        }


        /* =================================================
           CHECK SESSION
           ================================================= */

        const {
            data: sessionData,
            error: sessionError
        } =
            await supabaseClient.auth.getSession();


        if (sessionError) {
            throw sessionError;
        }


        if (
            !sessionData ||
            !sessionData.session
        ) {

            throw new Error(
                "No active Super Admin session was found."
            );
        }


        /* =================================================
           CHECK FACTORS AGAIN
           ================================================= */

        const {
            data: factors,
            error: factorError
        } =
            await supabaseClient.auth.mfa.listFactors();


        if (factorError) {
            throw factorError;
        }


        const totp =
            Array.isArray(factors?.totp)
                ? factors.totp
                : [];


        if (totp.length > 0) {

            show(
                "A TOTP factor is now visible. Do not create another factor.",
                "error"
            );

            return;
        }


        /* =================================================
           TEST ENROLLMENT
           ================================================= */

        show(
            "No TOTP factor is visible. Testing enrollment with a temporary name...",
            "success"
        );


        const {
            data,
            error
        } =
            await supabaseClient.auth.mfa.enroll({

                factorType: "totp",

                friendlyName:
                    "MUNKA PIGGERY MFA TEST",

                issuer:
                    "MUNKA PIGGERY"
            });


        if (error) {

            console.error(
                "MFA TEST ENROLLMENT ERROR:",
                error
            );


            show(
                "MFA ENROLLMENT TEST FAILED:\n\n" +
                error.message,
                "error"
            );

            return;
        }


        console.log(
            "MFA TEST ENROLLMENT RESULT:",
            data
        );


        if (!data || !data.id) {

            show(
                "Supabase accepted the request but did not return a factor.",
                "error"
            );

            return;
        }


        show(
            "SUCCESS!\n\n" +
            "Supabase created a TOTP factor using the temporary test name.\n\n" +
            "This proves the original friendly name was the problem.\n\n" +
            "DO NOT scan the QR code or use this test factor yet.",
            "success"
        );


    } catch (error) {

        console.error(
            "MFA TEST ERROR:",
            error
        );


        show(
            "ERROR:\n\n" +
            (error.message || error),
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
        testMFAEnrollment
    );

} else {

    testMFAEnrollment();
}