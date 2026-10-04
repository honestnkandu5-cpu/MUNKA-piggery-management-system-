/* ==========================================================
MUNKA PIGGERY
SUPER ADMIN - PLATFORM DASHBOARD
PHASE 4A - MFA PROTECTED ACCESS
========================================================== */

let currentUser = null;

let platformDashboardSecurityVerified = false;


/* ==========================================================
SECURITY — CHECK SESSION + SUPER ADMIN + MFA
========================================================== */

async function checkSuperAdmin() {

    try {

        console.log(
            "PLATFORM DASHBOARD SECURITY: Starting..."
        );


        /* --------------------------------------------------
           1. CHECK ACTIVE SESSION
        -------------------------------------------------- */

        const {
            data: sessionData,
            error: sessionError
        } =
            await supabaseClient
                .auth
                .getSession();


        if (sessionError) {

            console.error(
                "SESSION ERROR:",
                sessionError
            );

            window.location.replace(
                "login.html"
            );

            return false;
        }


        const session =
            sessionData?.session;


        if (!session) {

            console.warn(
                "No active Supabase session."
            );

            window.location.replace(
                "login.html"
            );

            return false;
        }


        /* --------------------------------------------------
           2. GET USER PROFILE
        -------------------------------------------------- */

        const {
            data: user,
            error: userError
        } =
            await supabaseClient
                .from("users")
                .select("*")
                .eq(
                    "auth_user_id",
                    session.user.id
                )
                .maybeSingle();


        if (userError) {

            console.error(
                "USER PROFILE ERROR:",
                userError
            );

            await safePlatformSignOut();

            alert(
                "Unable to verify Super Admin profile."
            );

            window.location.replace(
                "login.html"
            );

            return false;
        }


        if (!user) {

            console.warn(
                "Super Admin profile not found."
            );

            await safePlatformSignOut();

            window.location.replace(
                "login.html"
            );

            return false;
        }


        /* --------------------------------------------------
           3. VERIFY SUPER ADMIN ROLE
        -------------------------------------------------- */

        const role =
            String(
                user.role || ""
            )
            .trim()
            .toLowerCase();


        if (
            role !==
            "super admin"
        ) {

            console.warn(
                "Unauthorized role:",
                user.role
            );

            await safePlatformSignOut();

            alert(
                "Access denied. Super Administrator privileges are required."
            );

            window.location.replace(
                "login.html"
            );

            return false;
        }


        /* --------------------------------------------------
           4. VERIFY ACCOUNT STATUS
        -------------------------------------------------- */

        const status =
            String(
                user.status || ""
            )
            .trim()
            .toLowerCase();


        if (
            status !==
            "active"
        ) {

            console.warn(
                "Super Admin account is not active."
            );

            await safePlatformSignOut();

            alert(
                "Your Super Admin account is not active."
            );

            window.location.replace(
                "login.html"
            );

            return false;
        }


        /* --------------------------------------------------
           5. VERIFY MFA / AAL2
        -------------------------------------------------- */

        const {
            data: assuranceData,
            error: assuranceError
        } =
            await supabaseClient
                .auth
                .mfa
                .getAuthenticatorAssuranceLevel();


        if (assuranceError) {

            console.error(
                "MFA ASSURANCE LEVEL ERROR:",
                assuranceError
            );

            await safePlatformSignOut();

            alert(
                "Unable to verify Super Admin MFA security."
            );

            window.location.replace(
                "login.html"
            );

            return false;
        }


        const currentLevel =
            assuranceData?.currentLevel;


        console.log(
            "PLATFORM DASHBOARD MFA LEVEL:",
            currentLevel
        );


        /* --------------------------------------------------
           MFA MUST BE COMPLETED
        -------------------------------------------------- */

        if (
            currentLevel !==
            "aal2"
        ) {

            console.warn(
                "MFA verification has not been completed."
            );

            await safePlatformSignOut();

            alert(
                "MFA verification is required before accessing the Super Admin Platform Dashboard."
            );

            window.location.replace(
                "login.html"
            );

            return false;
        }


        /* --------------------------------------------------
           SECURITY VERIFIED
        -------------------------------------------------- */

        currentUser =
            user;

        platformDashboardSecurityVerified =
            true;


        console.log(
            "PLATFORM DASHBOARD SECURITY: VERIFIED ✓"
        );


        return true;


    } catch (error) {

        console.error(
            "PLATFORM DASHBOARD SECURITY ERROR:",
            error
        );


        platformDashboardSecurityVerified =
            false;


        await safePlatformSignOut();


        window.location.replace(
            "login.html"
        );


        return false;
    }
}


/* ==========================================================
SAFE SIGN OUT
========================================================== */

async function safePlatformSignOut() {

    try {

        await supabaseClient
            .auth
            .signOut();

    } catch (error) {

        console.error(
            "SAFE SIGN OUT ERROR:",
            error
        );
    }


    localStorage.removeItem(
        "loggedInUser"
    );
}


/* ==========================================================
DISPLAY WELCOME
========================================================== */

function displayWelcome() {

    const element =
        document.getElementById(
            "welcomeMessage"
        );


    if (
        !element ||
        !currentUser
    ) {

        return;
    }


    element.textContent =
        "Welcome, " +
        (
            currentUser.full_name ||
            currentUser.username ||
            "Super Admin"
        );
}


/* ==========================================================
LOAD FARMS
========================================================== */

async function loadFarmStatistics() {

    const result =
        await supabaseClient
            .from("farms")
            .select(
                "id, farm_name, status, subscription_start, subscription_end"
            );


    if (result.error) {

        console.error(
            "FARMS ERROR:",
            result.error
        );


        document.getElementById(
            "totalFarms"
        ).textContent = "Error";


        document.getElementById(
            "activeFarms"
        ).textContent = "Error";


        document.getElementById(
            "inactiveFarms"
        ).textContent = "Error";


        throw result.error;
    }


    const farms =
        result.data || [];


    const total =
        farms.length;


    const active =
        farms.filter(
            farm =>
                farm.status === "Active"
        ).length;


    const inactive =
        farms.filter(
            farm =>
                farm.status !== "Active"
        ).length;


    const now =
        new Date();


    const activeSubscriptions =
        farms.filter(
            farm => {

                if (
                    farm.status !== "Active" ||
                    !farm.subscription_end
                ) {

                    return false;
                }


                const start =
                    farm.subscription_start
                        ? new Date(
                            farm.subscription_start
                        )
                        : null;


                const end =
                    new Date(
                        farm.subscription_end
                    );


                return (
                    end > now &&
                    (
                        !start ||
                        start <= now
                    )
                );
            }
        ).length;


    const expiringSoon =
        farms.filter(
            farm => {

                if (
                    farm.status !== "Active" ||
                    !farm.subscription_end
                ) {

                    return false;
                }


                const end =
                    new Date(
                        farm.subscription_end
                    );


                const daysRemaining =
                    (
                        end.getTime() -
                        now.getTime()
                    ) /
                    (
                        1000 *
                        60 *
                        60 *
                        24
                    );


                return (
                    daysRemaining > 0 &&
                    daysRemaining <= 30
                );
            }
        ).length;


    document.getElementById(
        "totalFarms"
    ).textContent =
        total;


    document.getElementById(
        "activeFarms"
    ).textContent =
        active;


    document.getElementById(
        "inactiveFarms"
    ).textContent =
        inactive;


    document.getElementById(
        "activeSubscriptions"
    ).textContent =
        activeSubscriptions;


    document.getElementById(
        "expiringSoon"
    ).textContent =
        expiringSoon;


    loadFarmOverview(
        farms
    );
}


/* ==========================================================
FARM OVERVIEW
========================================================== */

function loadFarmOverview(
    farms
) {

    const container =
        document.getElementById(
            "farmOverview"
        );


    if (!container) {

        return;
    }


    if (!farms.length) {

        container.innerHTML =
            "<p>No farms registered.</p>";

        return;
    }


    container.innerHTML = "";


    farms.forEach(
        farm => {

            const card =
                document.createElement(
                    "div"
                );


            card.className =
                "farm-overview-card";


            let subscription =
                "No subscription";


            let expiry =
                "N/A";


            if (
                farm.subscription_end
            ) {

                const end =
                    new Date(
                        farm.subscription_end
                    );


                if (
                    end > new Date()
                ) {

                    subscription =
                        "Active";


                    expiry =
                        end.toLocaleDateString(
                            "en-ZM",
                            {
                                day: "2-digit",
                                month: "long",
                                year: "numeric"
                            }
                        );

                } else {

                    subscription =
                        "Expired";


                    expiry =
                        "Expired";
                }
            }


            card.innerHTML = `

                <h3>
                    ${escapeHTML(
                        farm.farm_name ||
                        "Unnamed Farm"
                    )}
                </h3>

                <p>
                    <strong>Farm ID:</strong>
                    ${farm.id}
                </p>

                <p>
                    <strong>Status:</strong>
                    <span class="${
                        farm.status === "Active"
                            ? "status-active"
                            : "status-inactive"
                    }">
                        ${escapeHTML(
                            farm.status ||
                            "N/A"
                        )}
                    </span>
                </p>

                <p>
                    <strong>Subscription:</strong>
                    ${subscription}
                </p>

                <p>
                    <strong>Expiry:</strong>
                    ${expiry}
                </p>

            `;


            container.appendChild(
                card
            );
        }
    );
}


/* ==========================================================
LOAD USERS
========================================================== */

async function loadUserStatistics() {

    const result =
        await supabaseClient
            .from("users")
            .select(
                "id, status"
            );


    if (result.error) {

        console.error(
            "USERS ERROR:",
            result.error
        );


        document.getElementById(
            "totalUsers"
        ).textContent =
            "Error";


        document.getElementById(
            "activeUsers"
        ).textContent =
            "Error";


        throw result.error;
    }


    const users =
        result.data || [];


    document.getElementById(
        "totalUsers"
    ).textContent =
        users.length;


    document.getElementById(
        "activeUsers"
    ).textContent =
        users.filter(
            user =>
                user.status === "Active"
        ).length;
}


/* ==========================================================
LOAD PIGS
========================================================== */

async function loadPigStatistics() {

    const result =
        await supabaseClient
            .from("pigs")
            .select(
                "id",
                {
                    count: "exact",
                    head: true
                }
            );


    if (result.error) {

        console.error(
            "PIGS ERROR:",
            result.error
        );


        document.getElementById(
            "totalPigs"
        ).textContent =
            "Error";


        throw result.error;
    }


    document.getElementById(
        "totalPigs"
    ).textContent =
        result.count || 0;
}


/* ==========================================================
LOAD PAYMENTS
========================================================== */

async function loadPaymentStatistics() {

    const result =
        await supabaseClient
            .from("subscription_payments")
            .select(
                "id, farm_id, plan_name, amount, currency, payment_status, payment_provider, created_at, paid_at"
            )
            .order(
                "created_at",
                {
                    ascending: false
                }
            );


    if (result.error) {

        console.error(
            "PAYMENTS ERROR:",
            result.error
        );


        document.getElementById(
            "subscriptionRevenue"
        ).textContent =
            "Error";


        document.getElementById(
            "pendingPayments"
        ).textContent =
            "Error";


        throw result.error;
    }


    const payments =
        result.data || [];


    const paid =
        payments.filter(
            payment =>
                String(
                    payment.payment_status
                ).toLowerCase() ===
                "paid"
        );


    const pending =
        payments.filter(
            payment =>
                String(
                    payment.payment_status
                ).toLowerCase() ===
                "pending"
        );


    const revenue =
        paid.reduce(
            (
                total,
                payment
            ) =>
                total +
                Number(
                    payment.amount || 0
                ),
            0
        );


    document.getElementById(
        "subscriptionRevenue"
    ).textContent =
        formatCurrency(
            revenue
        );


    document.getElementById(
        "pendingPayments"
    ).textContent =
        pending.length;


    loadRecentPayments(
        payments.slice(0, 10)
    );
}


/* ==========================================================
RECENT PAYMENTS
========================================================== */

function loadRecentPayments(
    payments
) {

    const container =
        document.getElementById(
            "recentPayments"
        );


    if (!container) {

        return;
    }


    if (!payments.length) {

        container.innerHTML =
            "<p>No subscription payments found.</p>";

        return;
    }


    container.innerHTML = "";


    payments.forEach(
        payment => {

            const item =
                document.createElement(
                    "div"
                );


            item.className =
                "payment-item";


            const date =
                payment.paid_at ||
                payment.created_at;


            item.innerHTML = `

                <div>

                    <strong>
                        ${escapeHTML(
                            payment.plan_name ||
                            "Subscription"
                        )}
                    </strong>

                    <p>
                        Farm ID:
                        ${payment.farm_id}
                    </p>

                </div>


                <div>

                    <strong>
                        ${escapeHTML(
                            payment.currency ||
                            "ZMW"
                        )}
                        ${Number(
                            payment.amount || 0
                        ).toFixed(2)}
                    </strong>

                    <p>
                        ${escapeHTML(
                            payment.payment_status ||
                            "N/A"
                        )}
                    </p>

                </div>


                <div>

                    <small>
                        ${
                            date
                                ? new Date(
                                    date
                                  ).toLocaleString(
                                    "en-ZM"
                                  )
                                : "N/A"
                        }
                    </small>

                </div>

            `;


            container.appendChild(
                item
            );
        }
    );
}


/* ==========================================================
LOAD ACTIVITY
========================================================== */

async function loadRecentActivity() {

    const result =
        await supabaseClient
            .from("activity_logs")
            .select("*")
            .order(
                "created_at",
                {
                    ascending: false
                }
            )
            .limit(10);


    const container =
        document.getElementById(
            "recentActivity"
        );


    if (!container) {

        return;
    }


    if (result.error) {

        console.error(
            "ACTIVITY ERROR:",
            result.error
        );


        container.innerHTML = `
            <p>
                Unable to load recent activity.
            </p>
        `;


        return;
    }


    const activities =
        result.data || [];


    if (!activities.length) {

        container.innerHTML =
            "<p>No recent activity found.</p>";

        return;
    }


    container.innerHTML = "";


    activities.forEach(
        activity => {

            const item =
                document.createElement(
                    "div"
                );


            item.className =
                "activity-item";


            const user =
                activity.user_name ||
                activity.username ||
                activity.performed_by ||
                "System";


            const action =
                activity.action ||
                "Activity";


            const module =
                activity.module ||
                "System";


            const description =
                activity.description ||
                "";


            item.innerHTML = `

                <div>

                    <strong>
                        ${escapeHTML(action)}
                    </strong>

                    <p>
                        ${escapeHTML(
                            description
                        )}
                    </p>

                </div>


                <div>

                    <span>
                        ${escapeHTML(module)}
                    </span>

                    <small>
                        ${escapeHTML(user)}
                    </small>

                    <small>
                        ${
                            activity.created_at
                                ? new Date(
                                    activity.created_at
                                  ).toLocaleString(
                                    "en-ZM"
                                  )
                                : "N/A"
                        }
                    </small>

                </div>

            `;


            container.appendChild(
                item
            );
        }
    );
}


/* ==========================================================
FORMAT CURRENCY
========================================================== */

function formatCurrency(
    amount
) {

    return (
        "ZMW " +
        Number(
            amount || 0
        ).toLocaleString(
            "en-ZM",
            {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2
            }
        )
    );
}


/* ==========================================================
ESCAPE HTML
========================================================== */

function escapeHTML(
    value
) {

    return String(value)
        .replace(
            /&/g,
            "&amp;"
        )
        .replace(
            /</g,
            "&lt;"
        )
        .replace(
            />/g,
            "&gt;"
        )
        .replace(
            /"/g,
            "&quot;"
        )
        .replace(
            /'/g,
            "&#039;"
        );
}


/* ==========================================================
LOAD DASHBOARD
========================================================== */

async function loadPlatformDashboard() {

    console.log(
        "PLATFORM DASHBOARD: Starting..."
    );


    document.getElementById(
        "totalFarms"
    ).textContent = "…";


    document.getElementById(
        "activeFarms"
    ).textContent = "…";


    document.getElementById(
        "inactiveFarms"
    ).textContent = "…";


    document.getElementById(
        "totalUsers"
    ).textContent = "…";


    document.getElementById(
        "activeUsers"
    ).textContent = "…";


    document.getElementById(
        "totalPigs"
    ).textContent = "…";


    document.getElementById(
        "activeSubscriptions"
    ).textContent = "…";


    document.getElementById(
        "expiringSoon"
    ).textContent = "…";


    document.getElementById(
        "subscriptionRevenue"
    ).textContent = "…";


    document.getElementById(
        "pendingPayments"
    ).textContent = "…";


    /* ------------------------------------------
       FARMS
    ------------------------------------------ */

    try {

        await loadFarmStatistics();

    } catch (error) {

        console.error(
            "FARM SECTION FAILED:",
            error
        );
    }


    /* ------------------------------------------
       USERS
    ------------------------------------------ */

    try {

        await loadUserStatistics();

    } catch (error) {

        console.error(
            "USER SECTION FAILED:",
            error
        );
    }


    /* ------------------------------------------
       PIGS
    ------------------------------------------ */

    try {

        await loadPigStatistics();

    } catch (error) {

        console.error(
            "PIG SECTION FAILED:",
            error
        );
    }


    /* ------------------------------------------
       PAYMENTS
    ------------------------------------------ */

    try {

        await loadPaymentStatistics();

    } catch (error) {

        console.error(
            "PAYMENT SECTION FAILED:",
            error
        );
    }


    /* ------------------------------------------
       ACTIVITY
    ------------------------------------------ */

    try {

        await loadRecentActivity();

    } catch (error) {

        console.error(
            "ACTIVITY SECTION FAILED:",
            error
        );
    }


    console.log(
        "PLATFORM DASHBOARD: Finished."
    );
}


/* ==========================================================
LOGOUT
========================================================== */

async function logout() {

    try {

        await supabaseClient
            .auth
            .signOut();

    } catch (error) {

        console.error(
            "LOGOUT ERROR:",
            error
        );
    }


    localStorage.removeItem(
        "loggedInUser"
    );


    window.location.replace(
        "login.html"
    );
}


/* ==========================================================
INITIALIZE
========================================================== */

document.addEventListener(
    "DOMContentLoaded",
    async function() {

        console.log(
            "PLATFORM DASHBOARD: Initializing..."
        );


        /* ------------------------------------------
           SECURITY FIRST
        ------------------------------------------ */

        const allowed =
            await checkSuperAdmin();


        if (!allowed) {

            return;
        }


        /* ------------------------------------------
           ONLY AFTER SECURITY PASSES
        ------------------------------------------ */

        displayWelcome();


        await loadPlatformDashboard();

    }
);