// =====================================
// MUNKA PIGGERY TECHNOLOGY
// SUPABASE AUTH LOGIN SYSTEM
// AUTOMATIC ROLE IDENTIFICATION
// FARM SUBSCRIPTION CHECKING
// LAST LOGIN TRACKING
// DIRECT DASHBOARD REDIRECT
// =====================================


document
    .getElementById("loginForm")
    .addEventListener("submit", async function(e){

        e.preventDefault();


        // =====================================
        // GET LOGIN DETAILS
        // =====================================

        const email =
            document
                .getElementById("email")
                .value
                .trim();


        const password =
            document
                .getElementById("password")
                .value
                .trim();


        const message =
            document.getElementById("message");


        message.textContent =
            "Checking login...";


        try{


            // =====================================
            // 1. SUPABASE AUTHENTICATION
            // =====================================

            const {
                data: authData,
                error: authError
            } =
                await supabaseClient
                    .auth
                    .signInWithPassword({

                        email: email,

                        password: password

                    });


            if(authError){

                message.textContent =
                    "Invalid email or password.";

                return;

            }


            const uid =
                authData.user.id;


            // =====================================
            // 2. GET USER PROFILE
            // =====================================

            const {

                data: userData,

                error: userError

            } =
                await supabaseClient

                    .from("users")

                    .select("*")

                    .eq(
                        "auth_user_id",
                        uid
                    )

                    .single();


            if(
                userError ||
                !userData
            ){

                await supabaseClient
                    .auth
                    .signOut();


                message.textContent =
                    "User profile not found.";

                return;

            }


            // =====================================
            // 3. ACCOUNT STATUS
            // =====================================

            if(
                String(
                    userData.status || ""
                )
                .trim()
                .toLowerCase()
                !==
                "active"
            ){

                await supabaseClient
                    .auth
                    .signOut();


                message.textContent =
                    "Your account is not active. Please contact the administrator.";

                return;

            }


            // =====================================
            // 4. USER ROLE
            // =====================================

            const userRole =
                userData.role;


            if(!userRole){

                await supabaseClient
                    .auth
                    .signOut();


                message.textContent =
                    "User role is not assigned. Please contact the administrator.";

                return;

            }


            // =====================================
            // 5. CHECK SUPER ADMIN
            // =====================================

            const isSuperAdmin =
                String(userRole)
                    .trim()
                    .toLowerCase()
                    ===
                    "super admin";


            // =====================================
            // 6. FARM SUBSCRIPTION CHECK
            // =====================================

            if(!isSuperAdmin){


                if(!userData.farm_id){

                    await supabaseClient
                        .auth
                        .signOut();


                    message.textContent =
                        "Your account is not linked to a farm. Please contact the administrator.";

                    return;

                }


                const {

                    data: farmData,

                    error: farmError

                } =
                    await supabaseClient

                        .from("farms")

                        .select(
                            "id, farm_name, status, subscription_start, subscription_end"
                        )

                        .eq(
                            "id",
                            userData.farm_id
                        )

                        .single();


                if(
                    farmError ||
                    !farmData
                ){

                    console.error(
                        "FARM CHECK ERROR:",
                        farmError
                    );


                    await supabaseClient
                        .auth
                        .signOut();


                    message.textContent =
                        "Your farm could not be found. Please contact the administrator.";

                    return;

                }


                // =====================================
                // FARM STATUS
                // =====================================

                if(
                    String(
                        farmData.status || ""
                    )
                    .trim()
                    .toLowerCase()
                    !==
                    "active"
                ){

                    await supabaseClient
                        .auth
                        .signOut();


                    message.textContent =
                        "Your farm subscription is inactive or expired. Please contact the administrator to renew your subscription.";

                    return;

                }


                // =====================================
                // SUBSCRIPTION END
                // =====================================

                if(
                    farmData.subscription_end &&
                    new Date(
                        farmData.subscription_end
                    ) <= new Date()
                ){

                    await supabaseClient
                        .auth
                        .signOut();


                    message.textContent =
                        "Your farm subscription has expired. Please contact the administrator to renew your subscription.";

                    return;

                }


                // =====================================
                // SUBSCRIPTION START
                // =====================================

                if(
                    farmData.subscription_start &&
                    new Date(
                        farmData.subscription_start
                    ) > new Date()
                ){

                    await supabaseClient
                        .auth
                        .signOut();


                    message.textContent =
                        "Your farm subscription has not started yet.";

                    return;

                }


                // =====================================
                // ADD FARM INFORMATION
                // =====================================

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
            // 7. UPDATE LAST LOGIN
            // =====================================

            const {

                data: lastLoginTime,

                error: lastLoginError

            } =
                await supabaseClient
                    .rpc(
                        "update_my_last_login"
                    );


            if(lastLoginError){

                console.error(
                    "LAST LOGIN UPDATE ERROR:",
                    lastLoginError
                );

            }
            else if(lastLoginTime){

                userData.last_login =
                    lastLoginTime;

            }


            // =====================================
            // 8. SAVE USER LOCALLY
            // =====================================

            localStorage.setItem(
                "loggedInUser",
                JSON.stringify(userData)
            );


            // =====================================
            // 9. SAVE ACTIVITY LOG
            // =====================================

            try{

                await saveActivity(

                    userData.full_name +
                    " (" +
                    userRole +
                    ")",

                    "Login",

                    "Authentication",

                    "User logged into the system"

                );

            }
            catch(activityError){

                console.error(
                    "LOGIN ACTIVITY ERROR:",
                    activityError
                );

            }


            // =====================================
            // 10. DIRECT REDIRECT
            // =====================================
            //
            // IMPORTANT:
            // No alert.
            // No browser popup.
            // No "MUNKA PIGGERY says".
            //
            // The user goes directly to
            // the correct dashboard.
            // =====================================

            message.textContent =
                "Login successful. Opening dashboard...";


            if(isSuperAdmin){

                window.location.replace(
                    "superadmin.html"
                );

            }
            else{

                window.location.replace(
                    "dashboard.html"
                );

            }

        }


        // =====================================
        // SYSTEM ERROR
        // =====================================

        catch(error){

            console.error(
                "LOGIN SYSTEM ERROR:",
                error
            );


            message.textContent =
                "System error. Please try again.";

        }

    });