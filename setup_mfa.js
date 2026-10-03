/* =========================================================
   MUNKA PIGGERY
   MFA DIAGNOSTIC — READ ONLY
   ========================================================= */

async function runMFADiagnostic() {

    const message =
        document.getElementById("message");

    function show(text, type = "success") {

        if (!message) return;

        message.textContent = text;
        message.className = "message " + type;
    }

    try {

        show(
            "Checking your Supabase MFA configuration...",
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
                "No active login session was found. Please log in as Super Admin first."
            );
        }


        const authUserId =
            sessionData.session.user.id;


        /* =================================================
           CHECK USER
           ================================================= */

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
                "Super Admin profile was not found."
            );
        }


        if (
            String(user.role || "")
                .trim()
                .toLowerCase() !== "super admin"
        ) {

            throw new Error(
                "The logged-in account is not Super Admin."
            );
        }


        /* =================================================
           GET MFA FACTORS
           ================================================= */

        const {
            data: factors,
            error: factorError
        } =
            await supabaseClient.auth.mfa.listFactors();


        if (factorError) {
            throw factorError;
        }


        console.log(
            "MFA FACTOR DATA:",
            factors
        );


        /* =================================================
           SAFE DISPLAY
           ================================================= */

        const totp =
            Array.isArray(factors?.totp)
                ? factors.totp
                : [];


        const phone =
            Array.isArray(factors?.phone)
                ? factors.phone
                : [];


        let result = "";


        result +=
            "MFA DIAGNOSTIC RESULT\n\n";


        result +=
            "Super Admin: " +
            (user.full_name || "Yes") +
            "\n";


        result +=
            "Role: " +
            user.role +
            "\n\n";


        result +=
            "TOTP FACTORS FOUND: " +
            totp.length +
            "\n";


        result +=
            "PHONE FACTORS FOUND: " +
            phone.length +
            "\n\n";


        if (totp.length > 0) {

            result +=
                "Existing TOTP information:\n\n";


            totp.forEach(
                (factor, index) => {

                    result +=
                        "Factor " +
                        (index + 1) +
                        "\n";

                    result +=
                        "ID: " +
                        (factor.id || "not returned") +
                        "\n";

                    result +=
                        "Friendly name: " +
                        (factor.friendly_name || "not returned") +
                        "\n";

                    result +=
                        "Status: " +
                        (factor.status || "not returned") +
                        "\n\n";
                }
            );


            result +=
                "IMPORTANT: Do NOT create another factor yet.";
        }

        else {

            result +=
                "No TOTP factor is being returned by listFactors().\n\n";

            result +=
                "We need to investigate why Supabase is rejecting the new enrollment.";
        }


        show(
            result,
            "success"
        );


    } catch (error) {

        console.error(
            "MFA diagnostic error:",
            error
        );


        show(
            "MFA DIAGNOSTIC ERROR:\n\n" +
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
        runMFADiagnostic
    );

} else {

    runMFADiagnostic();
}