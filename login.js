// =====================================
// MUNKA PIGGERY
// SUPABASE AUTH LOGIN SYSTEM
// AUTOMATIC ROLE IDENTIFICATION
// SUBSCRIPTION CHECKING
// LAST LOGIN TRACKING
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
        // GET USER PROFILE
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

            await supabaseClient.auth.signOut();

            message.innerHTML =
                "User profile not found";

            return;
        }


        // =====================================
        // CHECK ACCOUNT STATUS
        // =====================================

        if (userData.status !== "Active") {

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
        // SUPER ADMIN CHECK
        // =====================================
        // Super Admin is platform-level and does
        // not belong to a farm.
        // Therefore subscription checking is
        // NOT applied to Super Admin.

        const isSuperAdmin =
            String(userRole)
                .trim()
                .toLowerCase() === "super admin";


        // =====================================
        // FARM SUBSCRIPTION CHECK
        // =====================================

        if (!isSuperAdmin) {

            // -------------------------------------
            // CHECK FARM ID
            // -------------------------------------

            if (!userData.farm_id) {

                await supabaseClient.auth.signOut();

                message.innerHTML =
                    "Your account is not linked to a farm. Please contact the administrator.";

                return;
            }


            // -------------------------------------
            // GET FARM INFORMATION
            // -------------------------------------

            const {
                data: farmData,
                error: farmError
            } = await supabaseClient

                .from("farms")

                .select(
                    "id, farm_name, status, subscription_start, subscription_end"
                )

                .eq("id", userData.farm_id)

                .single();


            if (farmError || !farmData) {

                console.error(
                    "FARM CHECK ERROR:",
                    farmError
                );

                await supabaseClient.auth.signOut();

                message.innerHTML =
                    "Your farm could not be found. Please contact the administrator.";

                return;
            }


            // -------------------------------------
            // CHECK FARM STATUS
            // -------------------------------------

            if (farmData.status !== "Active") {

                await supabaseClient.auth.signOut();

                message.innerHTML =
                    "Your farm subscription is inactive or expired. Please contact the administrator to renew your subscription.";

                return;
            }


            // -------------------------------------
            // CHECK SUBSCRIPTION END DATE
            // -------------------------------------

            if (
                farmData.subscription_end &&
                new Date(farmData.subscription_end) <= new Date()
            ) {

                await supabaseClient.auth.signOut();

                message.innerHTML =
                    "Your farm subscription has expired. Please contact the administrator to renew your subscription.";

                return;
            }


            // -------------------------------------
            // CHECK SUBSCRIPTION START DATE
            // -------------------------------------

            if (
                farmData.subscription_start &&
                new Date(farmData.subscription_start) > new Date()
            ) {

                await supabaseClient.auth.signOut();

                message.innerHTML =
                    "Your farm subscription has not started yet.";

                return;
            }


            // -------------------------------------
            // SAVE FARM DETAILS IN LOGIN SESSION
            // -------------------------------------

            userData.farm_name =
                farmData.farm_name;

            userData.subscription_start =
                farmData.subscription_start;

            userData.subscription_end =
                farmData.subscription_end;

            userData.farm_status =
                farmData.status;

        }


        // =====================================
        // RECORD LAST LOGIN
        // =====================================
        // Uses the secure Supabase function
        // update_my_last_login().
        //
        // The database records the time using
        // Africa/Lusaka (Zambia time).

        const {
            data: lastLoginTime,
            error: lastLoginError
        } = await supabaseClient

            .rpc(
                "update_my_last_login"
            );


        if (lastLoginError) {

            console.error(
                "LAST LOGIN UPDATE ERROR:",
                lastLoginError
            );

        } else {

            // Save the recorded login time
            // into the current login session

            userData.last_login =
                lastLoginTime;

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
        // ROLE-BASED REDIRECT
        // =====================================

        if (isSuperAdmin) {

            // Super Admin
            window.location.href =
                "superadmin.html";

        } else {

            // Normal farm user
            window.location.href =
                "dashboard.html";
        }

    }

    catch(error) {

        console.error(
            "LOGIN SYSTEM ERROR:",
            error
        );

        message.innerHTML =
            "System error. Please try again.";

    }

});