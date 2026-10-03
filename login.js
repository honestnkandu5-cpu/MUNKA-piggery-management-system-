// =====================================
// MUNKA PIGGERY TECHNOLOGY
// SUPABASE AUTH LOGIN SYSTEM
// CLOUDFLARE TURNSTILE CAPTCHA
// SUPER ADMIN LOGIN WITHOUT ROLE SELECTION
// NORMAL USERS REQUIRE ROLE SELECTION
// AUTOMATIC ROLE IDENTIFICATION
// FARM SUBSCRIPTION CHECKING
// LAST LOGIN TRACKING
// DIRECT DASHBOARD REDIRECT
// =====================================


document
    .getElementById("loginForm")
    .addEventListener(
        "submit",
        async function(e){

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
                document.getElementById(
                    "message"
                );


            // =====================================
            // CLOUDFLARE TURNSTILE
            // =====================================

            let captchaToken = "";


            try{

                if(
                    typeof window.turnstile ===
                    "undefined"
                ){

                    message.textContent =
                        "Security verification is not ready. Please wait a moment and try again.";

                    return;

                }


                captchaToken =
                    window.turnstile.getResponse();

            }

            catch(captchaError){

                console.error(
                    "TURNSTILE ERROR:",
                    captchaError
                );


                message.textContent =
                    "Security verification could not be completed.";

                return;

            }


            // =====================================
            // CAPTCHA MUST BE COMPLETED
            // =====================================

            if(!captchaToken){

                message.textContent =
                    "Please complete the security check.";

                return;

            }


            // =====================================
            // GET SELECTED ROLE
            // =====================================

            const selectedRoleButton =
                document.querySelector(
                    ".role-button.selected"
                );


            let selectedRole = "";


            if(selectedRoleButton){

                selectedRole =
                    String(
                        selectedRoleButton
                            .getAttribute(
                                "data-role"
                            ) || ""
                    )
                    .trim()
                    .toLowerCase();

            }


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

                            password: password,

                            options: {

                                captchaToken:
                                    captchaToken

                            }

                        });


                if(authError){

                    console.error(
                        "AUTH LOGIN ERROR:",
                        authError
                    );


                    message.textContent =
                        "Invalid email or password.";


                    // Reset CAPTCHA
                    if(
                        typeof window.turnstile !==
                        "undefined"
                    ){

                        try{

                            window.turnstile.reset();

                        }

                        catch(resetError){

                            console.error(
                                "TURNSTILE RESET ERROR:",
                                resetError
                            );

                        }

                    }


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
                // 4. GET ACTUAL DATABASE ROLE
                // =====================================

                const userRole =
                    String(
                        userData.role || ""
                    )
                    .trim()
                    .toLowerCase();


                if(!userRole){

                    await supabaseClient
                        .auth
                        .signOut();


                    message.textContent =
                        "User role is not assigned. Please contact the administrator.";

                    return;

                }


                // =====================================
                // 5. SUPER ADMIN
                // =====================================

                const isSuperAdmin =
                    userRole ===
                    "super admin";


                /*
                    SUPER ADMIN DOES NOT NEED
                    TO SELECT A ROLE.
                */


                if(!isSuperAdmin){


                    // =====================================
                    // NORMAL USER MUST SELECT ROLE
                    // =====================================

                    if(!selectedRole){

                        await supabaseClient
                            .auth
                            .signOut();


                        message.textContent =
                            "Please select your role before logging in.";

                        return;

                    }


                    // =====================================
                    // ROLE MAPPING
                    // =====================================

                    const roleMap = {

                        "owner/admin":
                            "owner/admin",

                        "farm manager":
                            "farm manager",

                        "serviceman":
                            "serviceman (gestation pen)",

                        "farrowman":
                            "farrowman (farrowing pen)",

                        "sales officer":
                            "sales officer",

                        "veterinary officer":
                            "veterinary officer",

                        "farm worker":
                            "farm worker"

                    };


                    // =====================================
                    // GET EXPECTED DATABASE ROLE
                    // =====================================

                    const expectedDatabaseRole =
                        roleMap[selectedRole];


                    if(!expectedDatabaseRole){

                        await supabaseClient
                            .auth
                            .signOut();


                        message.textContent =
                            "Invalid role selection.";

                        return;

                    }


                    // =====================================
                    // COMPARE DATABASE ROLE
                    // =====================================

                    if(
                        userRole !==
                        expectedDatabaseRole
                    ){

                        await supabaseClient
                            .auth
                            .signOut();


                        message.textContent =
                            "The selected role does not match your account role.";

                        return;

                    }

                }


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

                    JSON.stringify(
                        userData
                    )

                );


                // =====================================
                // 9. SAVE ACTIVITY LOG
                // =====================================

                try{

                    await saveActivity(

                        userData.full_name +
                        " (" +
                        userData.role +
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


                // Reset CAPTCHA
                if(
                    typeof window.turnstile !==
                    "undefined"
                ){

                    try{

                        window.turnstile.reset();

                    }

                    catch(resetError){

                        console.error(
                            "TURNSTILE RESET ERROR:",
                            resetError
                        );

                    }

                }

            }

        }
    );