// =====================================================
// MUNKA PIGGERY - MFA QR FORMAT DIAGNOSTIC
// READ ONLY - DOES NOT RESET OR CREATE MFA
// =====================================================

async function runMFADiagnostic() {

    const message = document.getElementById("message");

    function show(text) {
        if (message) {
            message.textContent = text;
            message.style.whiteSpace = "pre-wrap";
        }
    }

    try {

        show("Checking Supabase MFA information...");

        // Get current session
        const {
            data: sessionData,
            error: sessionError
        } = await supabaseClient.auth.getSession();

        if (sessionError) {
            throw sessionError;
        }

        if (!sessionData.session) {
            throw new Error(
                "You are not logged in. Please log in as Super Admin first."
            );
        }

        // Get MFA factors
        const {
            data: factorsData,
            error: factorsError
        } = await supabaseClient.auth.mfa.listFactors();

        if (factorsError) {
            throw factorsError;
        }

        const totpFactors = factorsData?.totp || [];

        let output = "";

        output += "MUNKA PIGGERY MFA DIAGNOSTIC\n";
        output += "============================\n\n";

        output += "TOTP factors found: ";
        output += totpFactors.length;
        output += "\n\n";


        if (totpFactors.length === 0) {

            output +=
                "No TOTP factor is currently returned by Supabase.\n";

            show(output);

            return;
        }


        totpFactors.forEach((factor, index) => {

            output +=
                "FACTOR " + (index + 1) + "\n";

            output +=
                "Status: " +
                (factor.status || "unknown") +
                "\n";

            output +=
                "Friendly name: " +
                (factor.friendly_name || "none") +
                "\n";

            output +=
                "Factor type: " +
                (factor.factor_type || "unknown") +
                "\n";

            output +=
                "Factor ID exists: " +
                (factor.id ? "YES" : "NO") +
                "\n\n";
        });


        output +=
            "IMPORTANT:\n";

        output +=
            "This diagnostic does NOT display your QR code,\n";

        output +=
            "setup secret, URI, or authentication code.\n";

        output +=
            "It also does not modify your MFA settings.\n";


        show(output);


    } catch (error) {

        console.error(
            "MFA diagnostic error:",
            error
        );

        show(
            "DIAGNOSTIC ERROR\n\n" +
            (error.message || "Unknown error")
        );
    }
}


// Start diagnostic
document.addEventListener(
    "DOMContentLoaded",
    runMFADiagnostic
);