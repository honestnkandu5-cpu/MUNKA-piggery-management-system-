/* =========================================================
   MUNKA PIGGERY
   ONE-TIME SUPER ADMIN MFA RESET
   ========================================================= */

const resetButton =
    document.getElementById("resetButton");

const message =
    document.getElementById("message");


/* =========================================================
   MESSAGE
   ========================================================= */

function showMessage(text, type) {

    message.textContent = text;

    message.className =
        "message " + type;
}


/* =========================================================
   VERIFY SUPER ADMIN
   ========================================================= */

async function verifySuperAdmin() {

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
            .select("id, role, status, auth_user_id")
            .eq(
                "auth_user_id",
                authUserId
            )
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
            .toLowerCase() !==
        "super admin"
    ) {

        throw new Error(
            "Only the Super Admin can reset MFA."
        );
    }


    if (
        String(user.status || "")
            .trim()
            .toLowerCase() !==
        "active"
    ) {

        throw new Error(
            "The Super Admin account is not active."
        );
    }


    return user;
}


/* =========================================================
   RESET MFA
   ========================================================= */

async function resetMFA() {

    resetButton.disabled =
        true;

    resetButton.textContent =
        "CHECKING MFA...";


    try {

        /* -------------------------------------------------
           VERIFY SUPER ADMIN
           ------------------------------------------------- */

        await verifySuperAdmin();


        /* -------------------------------------------------
           GET MFA FACTORS
           ------------------------------------------------- */

        const {
            data,
            error
        } =
            await supabaseClient.auth.mfa.listFactors();


        if (error) {
            throw error;
        }


        console.log(
            "Current MFA factors:",
            data
        );


        const totpFactors =
            data &&
            Array.isArray(data.totp)
                ? data.totp
                : [];


        /* -------------------------------------------------
           NO FACTOR
           ------------------------------------------------- */

        if (totpFactors.length === 0) {

            showMessage(
                "No existing TOTP MFA factor was found. You can proceed directly to the normal MFA setup page.",
                "success"
            );


            resetButton.disabled =
                false;

            resetButton.textContent =
                "NO MFA FACTOR FOUND";


            return;
        }


        /* -------------------------------------------------
           REMOVE FACTORS
           ------------------------------------------------- */

        for (
            const factor
            of totpFactors
        ) {

            if (!factor.id) {
                continue;
            }


            console.log(
                "Removing MFA factor:",
                factor.id
            );


            resetButton.textContent =
                "REMOVING MFA...";


            const {
                error: unenrollError
            } =
                await supabaseClient.auth.mfa.unenroll({

                    factorId:
                        factor.id
                });


            if (unenrollError) {

                throw unenrollError;
            }
        }


        /* -------------------------------------------------
           VERIFY REMOVAL
           ------------------------------------------------- */

        const {
            data: afterData,
            error: afterError
        } =
            await supabaseClient.auth.mfa.listFactors();


        if (afterError) {
            throw afterError;
        }


        const remainingTOTP =
            afterData &&
            Array.isArray(afterData.totp)
                ? afterData.totp
                : [];


        if (remainingTOTP.length > 0) {

            throw new Error(
                "The old MFA factor could not be completely removed."
            );
        }


        /* -------------------------------------------------
           SUCCESS
           ------------------------------------------------- */

        resetButton.disabled =
            true;

        resetButton.textContent =
            "MFA RESET COMPLETE ✓";


        showMessage(
            "The existing Super Admin MFA factor has been removed successfully. You can now create a fresh MFA setup.",
            "success"
        );


        console.log(
            "MUNKA Super Admin MFA reset completed."
        );


    } catch (error) {

        console.error(
            "MFA reset error:",
            error
        );


        resetButton.disabled =
            false;

        resetButton.textContent =
            "REMOVE EXISTING MFA";


        showMessage(
            error.message ||
            "The MFA reset failed.",
            "error"
        );
    }
}


/* =========================================================
   BUTTON
   ========================================================= */

resetButton.addEventListener(
    "click",
    resetMFA
);

