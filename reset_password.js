// =====================================
// MUNKA PIGGERY
// RESET PASSWORD
// SUPABASE AUTH
// =====================================

document
.getElementById("resetPasswordForm")
.addEventListener("submit", async function(e) {

    e.preventDefault();


    const newPassword =
        document
        .getElementById("newPassword")
        .value
        .trim();


    const confirmPassword =
        document
        .getElementById("confirmPassword")
        .value
        .trim();


    const message =
        document
        .getElementById("message");


    // =====================================
    // CHECK PASSWORDS
    // =====================================

    if(newPassword !== confirmPassword){

        message.innerHTML =
            "Passwords do not match.";

        return;
    }


    if(newPassword.length < 6){

        message.innerHTML =
            "Password must be at least 6 characters.";

        return;
    }


    message.innerHTML =
        "Updating password...";


    try {


        // =====================================
        // UPDATE SUPABASE AUTH PASSWORD
        // =====================================

        const {
            data,
            error
        } =
        await supabaseClient
        .auth
        .updateUser({

            password:
                newPassword

        });


        if(error){

            console.error(
                "PASSWORD UPDATE ERROR:",
                error
            );

            message.innerHTML =
                "Unable to update password. The reset link may have expired.";

            return;
        }


        // =====================================
        // SUCCESS
        // =====================================

        message.innerHTML =
            "Password updated successfully. Redirecting to login...";


        // =====================================
        // SIGN OUT RESET SESSION
        // =====================================

        await supabaseClient
        .auth
        .signOut();


        // =====================================
        // RETURN TO LOGIN
        // =====================================

        setTimeout(function(){

            window.location.href =
                "login.html";

        }, 2000);


    }
    catch(error){

        console.error(
            "RESET PASSWORD ERROR:",
            error
        );

        message.innerHTML =
            "System error. Please try again.";

    }

});

