// =====================================
// MUNKA PIGGERY
// FORGOT PASSWORD
// SUPABASE AUTH
// =====================================

document
.getElementById("forgotPasswordForm")
.addEventListener("submit", async function(e){

    e.preventDefault();

    const email =
        document
        .getElementById("email")
        .value
        .trim();

    const message =
        document
        .getElementById("message");


    message.innerHTML =
        "Sending password reset link...";


    try{

        const resetUrl =
            window.location.origin +
            "/reset_password.html";


        const { error } =
            await supabaseClient
            .auth
            .resetPasswordForEmail(
                email,
                {
                    redirectTo: resetUrl
                }
            );


        if(error){

            console.error(
                "PASSWORD RESET ERROR:",
                error
            );

            message.innerHTML =
                "Unable to send password reset link. Please try again.";

            return;
        }


        message.innerHTML =
            "Password reset link has been sent to your email. Please check your inbox.";


    }
    catch(error){

        console.error(
            "FORGOT PASSWORD ERROR:",
            error
        );

        message.innerHTML =
            "System error. Please try again.";

    }

});

