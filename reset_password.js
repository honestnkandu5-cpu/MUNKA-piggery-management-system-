// =====================================
// MUNKA PIGGERY
// SECURE PASSWORD RESET
// SUPABASE AUTH
// =====================================


// =====================================
// PASSWORD STRENGTH CHECK
// =====================================

function isStrongPassword(password) {

    const minimumLength =
        password.length >= 8;

    const hasUppercase =
        /[A-Z]/.test(password);

    const hasLowercase =
        /[a-z]/.test(password);

    const hasNumber =
        /[0-9]/.test(password);

    return (
        minimumLength &&
        hasUppercase &&
        hasLowercase &&
        hasNumber
    );
}


// =====================================
// RESET PASSWORD
// =====================================

document
.getElementById("resetPasswordForm")
.addEventListener("submit", async function(e) {

    e.preventDefault();


    const newPassword =
        document
        .getElementById("newPassword")
        .value;

    const confirmPassword =
        document
        .getElementById("confirmPassword")
        .value;

    const message =
        document
        .getElementById("message");

    const resetButton =
        document
        .getElementById("resetButton");


    message.innerHTML = "";


    // =====================================
    // CHECK PASSWORD MATCH
    // =====================================

    if(newPassword !== confirmPassword) {

        message.innerHTML =
            "Passwords do not match.";

        return;
    }


    // =====================================
    // CHECK PASSWORD STRENGTH
    // =====================================

    if(!isStrongPassword(newPassword)) {

        message.innerHTML =
            "Password must contain at least 8 characters, one uppercase letter, one lowercase letter and one number.";

        return;
    }


    // =====================================
    // DISABLE BUTTON
    // =====================================

    resetButton.disabled = true;

    resetButton.innerHTML =
        "Updating Password...";


    // =====================================
    // CHECK SUPABASE SESSION
    // =====================================

    try {

        const {
            data: sessionData,
            error: sessionError
        } =
        await supabaseClient
            .auth
            .getSession();


        if(
            sessionError ||
            !sessionData.session
        ) {

            message.innerHTML =
                "This password reset link is invalid or has expired. Please request a new reset link.";

            resetButton.disabled = false;

            resetButton.innerHTML =
                "Update Password";

            return;
        }


        // =====================================
        // UPDATE PASSWORD
        // =====================================

        const {
            error: updateError
        } =
        await supabaseClient
            .auth
            .updateUser({
                password:
                    newPassword
            });


        if(updateError) {

            console.error(
                "PASSWORD UPDATE ERROR:",
                updateError
            );

            message.innerHTML =
                "Unable to update password. Please request a new reset link.";

            resetButton.disabled = false;

            resetButton.innerHTML =
                "Update Password";

            return;
        }


        // =====================================
        // RECORD SECURITY EVENT
        // =====================================

        const {
            error: logError
        } =
        await supabaseClient
            .rpc(
                "log_password_reset"
            );


        if(logError) {

            console.error(
                "PASSWORD RESET LOG ERROR:",
                logError
            );

        }


        // =====================================
        // SUCCESS
        // =====================================

        message.innerHTML =
            "Password updated successfully. Redirecting to login...";


        // =====================================
        // SIGN OUT RECOVERY SESSION
        // =====================================

        await supabaseClient
            .auth
            .signOut();


        // =====================================
        // REDIRECT TO LOGIN
        // =====================================

        setTimeout(function() {

            window.location.href =
                "login.html";

        }, 2000);

    }


    // =====================================
    // UNEXPECTED ERROR
    // =====================================

    catch(error) {

        console.error(
            "RESET PASSWORD ERROR:",
            error
        );

        message.innerHTML =
            "Unable to complete password reset. Please try again.";

        resetButton.disabled = false;

        resetButton.innerHTML =
            "Update Password";

    }

});