// =====================================
// MUNKA PIGGERY
// SECURE FORGOT PASSWORD
// SUPABASE AUTH
// =====================================


document
.getElementById("forgotPasswordForm")
.addEventListener("submit", async function(e) {

    e.preventDefault();


    const email =
        document
        .getElementById("email")
        .value
        .trim()
        .toLowerCase();


    const message =
        document
        .getElementById("message");


    // =====================================
    // BASIC EMAIL CHECK
    // =====================================

    if(!email) {

        message.innerHTML =
            "Please enter your email address.";

        return;
    }


    const emailPattern =
        /^[^\s@]+@[^\s@]+\.[^\s@]+$/;


    if(!emailPattern.test(email)) {

        message.innerHTML =
            "Please enter a valid email address.";

        return;
    }


    message.innerHTML =
        "Processing your request...";


    try {


        // =====================================
        // PASSWORD RESET REQUEST
        // =====================================

        const resetUrl =
            window.location.origin +
            "/reset_password.html";


        const {
            error
        } =
        await supabaseClient
            .auth
            .resetPasswordForEmail(
                email,
                {
                    redirectTo:
                        resetUrl
                }
            );


        // =====================================
        // LOG INTERNAL ERROR
        // =====================================

        if(error) {

            console.error(
                "PASSWORD RESET REQUEST ERROR:",
                error
            );

        }


        // =====================================
        // GENERIC RESPONSE
        // =====================================
        // Do NOT reveal whether the email
        // exists in the system.

        message.innerHTML =
            "If an account exists for this email, a password reset link has been sent. Please check your inbox and spam folder.";


    }
    catch(error) {

        console.error(
            "FORGOT PASSWORD ERROR:",
            error
        );


        // Give the same safe response
        // even if an unexpected error occurs.

        message.innerHTML =
            "If an account exists for this email, a password reset link has been sent. Please check your inbox and spam folder.";

    }

});