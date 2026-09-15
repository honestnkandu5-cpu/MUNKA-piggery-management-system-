// =====================================
// MUNKA PIGGERY
// SUPABASE AUTH LOGIN SYSTEM
// AUTOMATIC ROLE IDENTIFICATION
// =====================================

document
.getElementById("loginForm")
.addEventListener("submit", async function(e) {

    e.preventDefault();

    const email =
        document.getElementById("email").value.trim();

    const password =
        document.getElementById("password").value.trim();

    const message =
        document.getElementById("message");

    message.innerHTML = "Checking login...";

    try {

        // =====================================
        // LOGIN USING SUPABASE AUTH
        // =====================================

        const { data: authData, error: authError } =
            await supabaseClient.auth.signInWithPassword({
                email: email,
                password: password
            });


        if (authError) {

            message.innerHTML =
                "Invalid email or password";

            return;
        }


        // =====================================
        // GET AUTHENTICATED USER ID
        // =====================================

        const uid =
            authData.user.id;


        // =====================================
        // GET USER PROFILE FROM DATABASE
        // =====================================

        const {
            data: userData,
            error: userError
        } = await supabaseClient

            .from("users")

            .select("*")

            .eq("auth_user_id", uid)

            .single();


        if (userError || !userData) {

            // Sign out if profile does not exist
            await supabaseClient.auth.signOut();

            message.innerHTML =
                "User profile not found";

            return;
        }


        // =====================================
        // CHECK ACCOUNT STATUS
        // =====================================

        if (userData.status !== "Active") {

            // Sign out inactive users
            await supabaseClient.auth.signOut();

            message.innerHTML =
                "Your account is not active. Please contact the administrator.";

            return;
        }


        // =====================================
        // AUTOMATIC ROLE IDENTIFICATION
        // =====================================

        const userRole =
            userData.role;


        // =====================================
        // CHECK THAT A ROLE EXISTS
        // =====================================

        if (!userRole) {

            await supabaseClient.auth.signOut();

            message.innerHTML =
                "User role is not assigned. Please contact the administrator.";

            return;
        }


        // =====================================
        // SAVE LOGIN SESSION
        // =====================================

        localStorage.setItem(
            "loggedInUser",
            JSON.stringify(userData)
        );


        // =====================================
        // ACTIVITY LOG
        // =====================================

        await saveActivity(

            userData.full_name +
            " (" +
            userRole +
            ")",

            "Login",

            "Authentication",

            "User logged into the system"

        );


        // =====================================
        // WELCOME MESSAGE
        // =====================================

        alert(
            "Welcome " +
            userData.full_name +
            "\nRole: " +
            userRole
        );


        // =====================================
        // GO TO DASHBOARD
        // =====================================

        window.location.href =
            "dashboard.html";


    }

    catch(error) {

        console.log(error);

        message.innerHTML =
            "System error. Please try again.";

    }

});