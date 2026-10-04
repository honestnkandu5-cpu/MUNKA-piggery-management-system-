// =====================================
// MUNKA PIGGERY TECHNOLOGY
// SUPABASE AUTH LOGIN SYSTEM
// CLOUDFLARE TURNSTILE CAPTCHA
// SUPER ADMIN MFA LOGIN
// NORMAL USERS REQUIRE ROLE SELECTION
// AUTOMATIC ROLE IDENTIFICATION
// FARM SUBSCRIPTION CHECKING
// LAST LOGIN TRACKING
// ACTIVITY LOGGING
// DIRECT DASHBOARD REDIRECT
// =====================================


// =====================================
// HELPER: RESET TURNSTILE
// =====================================

function resetTurnstile(){

    if(
        typeof window.turnstile !== "undefined"
    ){

        try{

            window.turnstile.reset();

        }
        catch(error){

            console.error(
                "TURNSTILE RESET ERROR:",
                error
            );

        }

    }

}


// =====================================
// HELPER: SHOW LOGIN MESSAGE
// =====================================

function showLoginMessage(message){

    const messageElement =
        document.getElementById("message");

    if(messageElement){

        messageElement.textContent =
            message;

    }

}


// =====================================
// CREATE SUPER ADMIN MFA PANEL
// =====================================

function createSuperAdminMFAPanel(){

    let panel =
        document.getElementById(
            "superAdminMFAPanel"
        );


    if(panel){

        return panel;

    }


    panel =
        document.createElement("div");


    panel.id =
        "superAdminMFAPanel";


    panel.style.marginTop =
        "20px";

    panel.style.padding =
        "20px";

    panel.style.border =
        "1px solid #d9d9d9";

    panel.style.borderRadius =
        "12px";

    panel.style.background =
        "#f8faf8";


    panel.innerHTML = `

        <h3 style="
            text-align:center;
            margin-top:0;
            color:#14532d;
        ">
            Super Admin MFA Verification
        </h3>

        <p style="
            text-align:center;
            font-size:15px;
        ">
            Enter the 6-digit verification code
            from your authenticator app.
        </p>

        <input
            type="text"
            id="superAdminMFACode"
            inputmode="numeric"
            maxlength="6"
            autocomplete="one-time-code"
            placeholder="6-digit MFA code"
            style="
                width:100%;
                box-sizing:border-box;
                padding:12px;
                font-size:18px;
                text-align:center;
                letter-spacing:4px;
                margin-bottom:10px;
            "
        >

        <button
            type="button"
            id="verifySuperAdminMFA"
            style="
                width:100%;
                padding:12px;
                font-size:16px;
                cursor:pointer;
            "
        >
            Verify MFA
        </button>

        <p
            id="mfaVerificationMessage"
            style="
                text-align:center;
                margin-top:10px;
            "
        ></p>

    `;


    const form =
        document.getElementById(
            "loginForm"
        );


    if(form){

        form.appendChild(panel);

    }


    return panel;

}


// =====================================
// VERIFY SUPER ADMIN MFA
// =====================================

async function verifySuperAdminMFA(){

    const panel =
        createSuperAdminMFAPanel();


    const codeInput =
        document.getElementById(
            "superAdminMFACode"
        );


    const verifyButton =
        document.getElementById(
            "verifySuperAdminMFA"
        );


    const mfaMessage =
        document.getElementById(
            "mfaVerificationMessage"
        );


    if(
        !codeInput ||
        !verifyButton ||
        !mfaMessage
    ){

        throw new Error(
            "MFA verification panel could not be created."
        );

    }


    // =====================================
    // GET VERIFIED TOTP FACTOR
    // =====================================

    const {

        data: factorsData,

        error: factorsError

    } =
        await supabaseClient
            .auth
            .mfa
            .listFactors();


    if(factorsError){

        console.error(
            "MFA FACTOR ERROR:",
            factorsError
        );

        throw new Error(
            "Could not load MFA settings."
        );

    }


    const verifiedFactors =
        (
            factorsData &&
            factorsData.totp
        )
        ?
        factorsData.totp.filter(
            factor =>
                factor.status ===
                "verified"
        )
        :
        [];


    if(
        verifiedFactors.length === 0
    ){

        throw new Error(
            "No verified Super Admin MFA factor was found. Please complete MFA setup first."
        );

    }


    const factor =
        verifiedFactors[0];


    // =====================================
    // CREATE MFA CHALLENGE
    // =====================================

    const {

        data: challengeData,

        error: challengeError

    } =
        await supabaseClient
            .auth
            .mfa
            .challenge({

                factorId:
                    factor.id

            });


    if(challengeError){

        console.error(
            "MFA CHALLENGE ERROR:",
            challengeError
        );

        throw new Error(
            "Could not start MFA verification."
        );

    }


    const challengeId =
        challengeData.id;


    // =====================================
    // SHOW MFA PANEL
    // =====================================

    panel.style.display =
        "block";


    codeInput.focus();


    // =====================================
    // PREVENT MULTIPLE SUBMISSIONS
    // =====================================

    return new Promise(
        (resolve, reject) => {


            let verificationRunning =
                false;


            verifyButton.onclick =
                async function(){


                    if(
                        verificationRunning
                    ){

                        return;

                    }


                    const code =
                        codeInput
                            .value
                            .trim();


                    // =====================================
                    // CHECK CODE
                    // =====================================

                    if(
                        !/^\d{6}$/.test(
                            code
                        )
                    ){

                        mfaMessage.textContent =
                            "Please enter the 6-digit MFA code.";

                        return;

                    }


                    verificationRunning =
                        true;


                    verifyButton.disabled =
                        true;


                    codeInput.disabled =
                        true;


                    mfaMessage.textContent =
                        "Verifying MFA...";


                    try{


                        // =====================================
                        // VERIFY MFA
                        // =====================================

                        const {

                            data: verifyData,

                            error: verifyError

                        } =
                            await supabaseClient
                                .auth
                                .mfa
                                .verify({

                                    factorId:
                                        factor.id,

                                    challengeId:
                                        challengeId,

                                    code:
                                        code

                                });


                        if(verifyError){

                            console.error(
                                "MFA VERIFY ERROR:",
                                verifyError
                            );


                            throw new Error(
                                "Invalid MFA code. Please try again."
                            );

                        }


                        // =====================================
                        // CONFIRM AUTHENTICATOR
                        // ASSURANCE LEVEL
                        // =====================================

                        const {

                            data: assuranceData,

                            error:
                                assuranceError

                        } =
                            await supabaseClient
                                .auth
                                .getAuthenticatorAssuranceLevel();


                        if(assuranceError){

                            console.error(
                                "AAL CHECK ERROR:",
                                assuranceError
                            );

                        }


                        if(
                            assuranceData &&
                            assuranceData.currentLevel &&
                            assuranceData.currentLevel !==
                            "aal2"
                        ){

                            throw new Error(
                                "MFA verification did not complete successfully."
                            );

                        }


                        mfaMessage.textContent =
                            "MFA verified successfully.";


                        resolve(
                            verifyData
                        );


                    }
                    catch(error){

                        console.error(
                            "MFA VERIFICATION ERROR:",
                            error
                        );


                        verificationRunning =
                            false;


                        verifyButton.disabled =
                            false;


                        codeInput.disabled =
                            false;


                        codeInput.value =
                            "";


                        codeInput.focus();


                        mfaMessage.textContent =
                            error.message ||
                            "Invalid MFA code. Please try again.";

                    }

                };


            // =====================================
            // ALLOW ENTER KEY
            // =====================================

            codeInput.addEventListener(
                "keydown",
                function(event){

                    if(
                        event.key ===
                        "Enter"
                    ){

                        event.preventDefault();

                        verifyButton.click();

                    }

                }
            );

        }
    );

}


// =====================================
// LOGIN FORM
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


            const loginButton =
                document.querySelector(
                    '#loginForm button[type="submit"]'
                );


            // =====================================
            // HIDE OLD MFA PANEL
            // =====================================

            const oldMFAPanel =
                document.getElementById(
                    "superAdminMFAPanel"
                );


            if(oldMFAPanel){

                oldMFAPanel.remove();

            }


            // =====================================
            // CLOUDFLARE TURNSTILE
            // =====================================

            let captchaToken =
                "";


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


            let selectedRole =
                "";


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
                // DISABLE LOGIN BUTTON
                // =====================================

                if(loginButton){

                    loginButton.disabled =
                        true;

                    loginButton.textContent =
                        "Verifying...";

                }


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

                            email:
                                email,

                            password:
                                password,

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


                    throw new Error(
                        "Invalid email or password."
                    );

                }


                if(
                    !authData ||
                    !authData.user
                ){

                    throw new Error(
                        "Login could not be completed."
                    );

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

                    throw new Error(
                        "User profile not found."
                    );

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

                    throw new Error(
                        "Your account is not active. Please contact the administrator."
                    );

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

                    throw new Error(
                        "User role is not assigned. Please contact the administrator."
                    );

                }


                // =====================================
                // 5. CHECK SUPER ADMIN
                // =====================================

                const isSuperAdmin =
                    userRole ===
                    "super admin";


                // =====================================
                // 6. NORMAL USER ROLE CHECK
                // =====================================

                if(!isSuperAdmin){


                    if(!selectedRole){

                        throw new Error(
                            "Please select your role before logging in."
                        );

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


                    const expectedDatabaseRole =
                        roleMap[selectedRole];


                    if(!expectedDatabaseRole){

                        throw new Error(
                            "Invalid role selection."
                        );

                    }


                    // =====================================
                    // COMPARE DATABASE ROLE
                    // =====================================

                    if(
                        userRole !==
                        expectedDatabaseRole
                    ){

                        throw new Error(
                            "The selected role does not match your account role."
                        );

                    }

                }


                // =====================================
                // 7. SUPER ADMIN MFA
                // =====================================

                if(isSuperAdmin){

                    // Hide normal login controls
                    // while MFA is being completed.

                    if(loginButton){

                        loginButton.style.display =
                            "none";

                    }


                    const roleButtons =
                        document.querySelectorAll(
                            ".role-button"
                        );


                    roleButtons.forEach(
                        button => {

                            button.style.display =
                                "none";

                        }
                    );


                    message.textContent =
                        "Password verified. MFA verification required.";


                    // =====================================
                    // WAIT FOR MFA
                    // =====================================

                    await verifySuperAdminMFA();


                    // =====================================
                    // MFA SUCCESS
                    // =====================================

                    message.textContent =
                        "";


                }


                // =====================================
                // 8. FARM SUBSCRIPTION CHECK
                // =====================================

                if(!isSuperAdmin){

                    if(!userData.farm_id){

                        throw new Error(
                            "Your account is not linked to a farm. Please contact the administrator."
                        );

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


                        throw new Error(
                            "Your farm could not be found. Please contact the administrator."
                        );

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

                        throw new Error(
                            "Your farm subscription is inactive or expired. Please contact the administrator to renew your subscription."
                        );

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

                        throw new Error(
                            "Your farm subscription has expired. Please contact the administrator to renew your subscription."
                        );

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

                        throw new Error(
                            "Your farm subscription has not started yet."
                        );

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
                // 9. UPDATE LAST LOGIN
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
                // 10. SAVE USER LOCALLY
                // =====================================

                localStorage.setItem(

                    "loggedInUser",

                    JSON.stringify(
                        userData
                    )

                );


                // =====================================
                // 11. SAVE ACTIVITY LOG
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
                // 12. DIRECT REDIRECT
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
            // LOGIN ERROR
            // =====================================

            catch(error){

                console.error(
                    "LOGIN SYSTEM ERROR:",
                    error
                );


                // =====================================
                // SIGN OUT AFTER FAILED LOGIN
                // =====================================

                try{

                    await supabaseClient
                        .auth
                        .signOut();

                }
                catch(signOutError){

                    console.error(
                        "SIGN OUT ERROR:",
                        signOutError
                    );

                }


                message.textContent =
                    error.message ||
                    "System error. Please try again.";


                // =====================================
                // RESTORE LOGIN BUTTON
                // =====================================

                if(loginButton){

                    loginButton.disabled =
                        false;

                    loginButton.style.display =
                        "";

                    loginButton.textContent =
                        "Login";

                }


                // =====================================
                // RESTORE ROLE BUTTONS
                // =====================================

                const roleButtons =
                    document.querySelectorAll(
                        ".role-button"
                    );


                roleButtons.forEach(
                    button => {

                        button.style.display =
                            "";

                    }
                );


                // =====================================
                // REMOVE MFA PANEL
                // =====================================

                const mfaPanel =
                    document.getElementById(
                        "superAdminMFAPanel"
                    );


                if(mfaPanel){

                    mfaPanel.remove();

                }


                // =====================================
                // RESET CAPTCHA
                // =====================================

                resetTurnstile();

            }

        }
    );