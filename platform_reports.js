/* ==========================================================
   MUNKA PIGGERY
   SUPER ADMIN - SUBSCRIPTION REPORTS
   ========================================================== */

let currentUser = null;


/* ==========================================================
   CHECK SUPER ADMIN
========================================================== */

async function checkSuperAdmin() {

    const {
        data: { session },
        error
    } = await supabaseClient.auth.getSession();


    if (error || !session) {

        console.error(
            "SESSION ERROR:",
            error
        );

        window.location.href = "login.html";

        return false;
    }


    const {
        data: user,
        error: userError
    } = await supabaseClient
        .from("users")
        .select("*")
        .eq("auth_user_id", session.user.id)
        .single();


    if (userError) {

        console.error(
            "USER PROFILE ERROR:",
            userError
        );

        alert(
            "Unable to load Super Admin profile."
        );

        return false;
    }


    if (
        !user ||
        user.role !== "Super Admin" ||
        user.status !== "Active"
    ) {

        alert("Access denied.");

        window.location.href = "login.html";

        return false;
    }


    currentUser = user;

    return true;
}


/* ==========================================================
   LOAD SUBSCRIPTION REPORTS
========================================================== */

async function loadSubscriptionReports() {

    console.log(
        "SUBSCRIPTION REPORTS: Loading..."
    );


    setLoadingState();


    /* ======================================================
       LOAD FARMS
    ====================================================== */

    const farmsResult =
        await supabaseClient
            .from("farms")
            .select(
                "id, farm_name, status, subscription_start, subscription_end"
            );


    if (farmsResult.error) {

        console.error(
            "FARMS ERROR:",
            farmsResult.error
        );

        showPageError(
            "Unable to load farm subscription information."
        );

        return;
    }


    const farms =
        farmsResult.data || [];


    /* ======================================================
       LOAD PAYMENTS
    ====================================================== */

    const paymentsResult =
        await supabaseClient
            .from("subscription_payments")
            .select(
                "id, farm_id, plan_name, duration_days, amount, currency, payment_method, customer_phone, transaction_reference, payment_status, payment_provider, subscription_start, subscription_end, paid_at, created_at"
            )
            .order(
                "created_at",
                {
                    ascending: false
                }
            );


    if (paymentsResult.error) {

        console.error(
            "PAYMENTS ERROR:",
            paymentsResult.error
        );

        showPageError(
            "Unable to load subscription payment information."
        );

        return;
    }


    const payments =
        paymentsResult.data || [];


    /* ======================================================
       CALCULATE PAYMENT STATISTICS
    ====================================================== */

    const paidPayments =
        payments.filter(
            payment =>
                normalize(
                    payment.payment_status
                ) === "paid"
        );


    const pendingPayments =
        payments.filter(
            payment =>
                normalize(
                    payment.payment_status
                ) === "pending"
        );


    const totalRevenue =
        paidPayments.reduce(
            (
                total,
                payment
            ) => {

                return (
                    total +
                    Number(
                        payment.amount || 0
                    )
                );

            },
            0
        );


    /* ======================================================
       ACTIVE SUBSCRIPTIONS
    ====================================================== */

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


                const end =
                    new Date(
                        farm.subscription_end
                    );


                return end > now;
            }
        ).length;


    /* ======================================================
       EXPIRING WITHIN 30 DAYS
    ====================================================== */

    const expiringSubscriptions =
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


                const days =
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
                    days > 0 &&
                    days <= 30
                );
            }
        ).length;


    /* ======================================================
       DISPLAY MAIN STATISTICS
    ====================================================== */

    setText(
        "totalRevenue",
        formatCurrency(
            totalRevenue
        )
    );


    setText(
        "totalPayments",
        payments.length
    );


    setText(
        "paidPayments",
        paidPayments.length
    );


    setText(
        "pendingPayments",
        pendingPayments.length
    );


    setText(
        "activeSubscriptions",
        activeSubscriptions
    );


    setText(
        "expiringSubscriptions",
        expiringSubscriptions
    );


    /* ======================================================
       PLAN REPORTS
    ====================================================== */

    loadPlanReports(
        paidPayments
    );


    /* ======================================================
       FARM SUMMARY
    ====================================================== */

    loadSubscriptionSummary(
        farms,
        payments
    );


    /* ======================================================
       EXPIRING LIST
    ====================================================== */

    loadExpiringSubscriptions(
        farms
    );


    /* ======================================================
       PAYMENT REPORT
    ====================================================== */

    loadPaymentReport(
        farms,
        payments
    );


    console.log(
        "SUBSCRIPTION REPORTS: Loaded successfully."
    );
}


/* ==========================================================
   PLAN REPORTS
========================================================== */

function loadPlanReports(
    paidPayments
) {

    const monthly =
        getPlanPayments(
            paidPayments,
            "monthly"
        );


    const sixMonths =
        getPlanPayments(
            paidPayments,
            "6"
        );


    const annual =
        getPlanPayments(
            paidPayments,
            "annual"
        );


    setText(
        "monthlyCount",
        monthly.count
    );


    setText(
        "monthlyRevenue",
        formatCurrency(
            monthly.revenue
        )
    );


    setText(
        "sixMonthCount",
        sixMonths.count
    );


    setText(
        "sixMonthRevenue",
        formatCurrency(
            sixMonths.revenue
        )
    );


    setText(
        "annualCount",
        annual.count
    );


    setText(
        "annualRevenue",
        formatCurrency(
            annual.revenue
        )
    );
}


/* ==========================================================
   FIND PLAN PAYMENTS
========================================================== */

function getPlanPayments(
    payments,
    planType
) {

    const matchingPayments =
        payments.filter(
            payment => {

                const name =
                    normalize(
                        payment.plan_name
                    );


                const days =
                    Number(
                        payment.duration_days ||
                        0
                    );


                if (
                    planType === "monthly"
                ) {

                    return (
                        name === "monthly" ||
                        days === 30
                    );
                }


                if (
                    planType === "6"
                ) {

                    return (
                        name === "6 months" ||
                        name === "6 month" ||
                        days === 180
                    );
                }


                if (
                    planType === "annual"
                ) {

                    return (
                        name === "annual" ||
                        name === "yearly" ||
                        days === 365
                    );
                }


                return false;
            }
        );


    const revenue =
        matchingPayments.reduce(
            (
                total,
                payment
            ) =>
                total +
                Number(
                    payment.amount ||
                    0
                ),
            0
        );


    return {

        count:
            matchingPayments.length,

        revenue:
            revenue

    };
}


/* ==========================================================
   FARM SUBSCRIPTION SUMMARY
========================================================== */

function loadSubscriptionSummary(
    farms,
    payments
) {

    const container =
        document.getElementById(
            "subscriptionSummary"
        );


    if (!container) return;


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
                "summary-card";


            const farmPayments =
                payments.filter(
                    payment =>
                        Number(
                            payment.farm_id
                        ) ===
                        Number(
                            farm.id
                        )
                );


            const paidFarmPayments =
                farmPayments.filter(
                    payment =>
                        normalize(
                            payment.payment_status
                        ) === "paid"
                );


            const farmRevenue =
                paidFarmPayments.reduce(
                    (
                        total,
                        payment
                    ) =>
                        total +
                        Number(
                            payment.amount ||
                            0
                        ),
                    0
                );


            let subscriptionStatus =
                "No subscription";


            let expiryText =
                "N/A";


            let daysRemaining =
                null;


            if (
                farm.subscription_end
            ) {

                const end =
                    new Date(
                        farm.subscription_end
                    );


                const difference =
                    end.getTime() -
                    new Date().getTime();


                daysRemaining =
                    Math.ceil(
                        difference /
                        (
                            1000 *
                            60 *
                            60 *
                            24
                        )
                    );


                if (
                    farm.status === "Active" &&
                    end > new Date()
                ) {

                    subscriptionStatus =
                        "Active";


                    expiryText =
                        end.toLocaleDateString(
                            "en-ZM",
                            {
                                day: "2-digit",
                                month: "long",
                                year: "numeric"
                            }
                        );

                }

                else {

                    subscriptionStatus =
                        "Expired";


                    expiryText =
                        "Expired";
                }
            }


            let statusClass =
                "";


            if (
                subscriptionStatus === "Active"
            ) {

                statusClass =
                    "status-active";

            }

            else {

                statusClass =
                    "status-expired";
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
                    <strong>Farm Status:</strong>
                    ${escapeHTML(
                        farm.status ||
                        "N/A"
                    )}
                </p>


                <p>
                    <strong>Subscription:</strong>

                    <span
                        class="${statusClass}">

                        ${escapeHTML(
                            subscriptionStatus
                        )}

                    </span>
                </p>


                <p>
                    <strong>Expiry:</strong>
                    ${escapeHTML(
                        expiryText
                    )}
                </p>


                ${
                    daysRemaining !== null &&
                    daysRemaining > 0
                        ? `
                            <p>
                                <strong>
                                    Days Remaining:
                                </strong>
                                ${daysRemaining}
                            </p>
                          `
                        : ""
                }


                <p>
                    <strong>
                        Paid Revenue:
                    </strong>

                    ${formatCurrency(
                        farmRevenue
                    )}
                </p>


                <p>
                    <strong>
                        Payment Records:
                    </strong>

                    ${farmPayments.length}
                </p>

            `;


            container.appendChild(
                card
            );

        }
    );
}


/* ==========================================================
   EXPIRING SUBSCRIPTIONS
========================================================== */

function loadExpiringSubscriptions(
    farms
) {

    const container =
        document.getElementById(
            "expiringList"
        );


    if (!container) return;


    const now =
        new Date();


    const expiring =
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


                const days =
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
                    days > 0 &&
                    days <= 30
                );
            }
        );


    if (!expiring.length) {

        container.innerHTML = `

            <p>
                No active subscriptions are
                expiring within 30 days.
            </p>

        `;

        return;
    }


    container.innerHTML = "";


    expiring.sort(
        (
            a,
            b
        ) =>
            new Date(
                a.subscription_end
            ) -
            new Date(
                b.subscription_end
            )
    );


    expiring.forEach(
        farm => {

            const end =
                new Date(
                    farm.subscription_end
                );


            const days =
                Math.ceil(
                    (
                        end.getTime() -
                        now.getTime()
                    ) /
                    (
                        1000 *
                        60 *
                        60 *
                        24
                    )
                );


            const card =
                document.createElement(
                    "div"
                );


            card.className =
                "expiring-card";


            card.innerHTML = `

                <h3>
                    ${escapeHTML(
                        farm.farm_name ||
                        "Unnamed Farm"
                    )}
                </h3>


                <p>
                    <strong>
                        Farm ID:
                    </strong>

                    ${farm.id}
                </p>


                <p>
                    <strong>
                        Expiry Date:
                    </strong>

                    ${end.toLocaleDateString(
                        "en-ZM",
                        {
                            day: "2-digit",
                            month: "long",
                            year: "numeric"
                        }
                    )}
                </p>


                <p class="expiring-days">

                    ${days}
                    day${days === 1 ? "" : "s"}
                    remaining

                </p>

            `;


            container.appendChild(
                card
            );

        }
    );
}


/* ==========================================================
   PAYMENT REPORT TABLE
========================================================== */

function loadPaymentReport(
    farms,
    payments
) {

    const container =
        document.getElementById(
            "paymentReport"
        );


    if (!container) return;


    if (!payments.length) {

        container.innerHTML = `

            <tr>

                <td
                    colspan="8">

                    No subscription payments found.

                </td>

            </tr>

        `;

        return;
    }


    container.innerHTML = "";


    payments.forEach(
        payment => {

            const row =
                document.createElement(
                    "tr"
                );


            const farm =
                farms.find(
                    item =>
                        Number(
                            item.id
                        ) ===
                        Number(
                            payment.farm_id
                        )
                );


            const farmName =
                farm
                    ? farm.farm_name
                    : "Unknown Farm";


            const date =
                payment.paid_at ||
                payment.created_at;


            const status =
                normalize(
                    payment.payment_status
                );


            let statusClass =
                "";


            if (
                status === "paid"
            ) {

                statusClass =
                    "status-paid";

            }

            else if (
                status === "pending"
            ) {

                statusClass =
                    "status-pending";

            }

            else if (
                status === "failed"
            ) {

                statusClass =
                    "status-failed";
            }


            row.innerHTML = `

                <td>

                    ${
                        date
                            ? new Date(
                                date
                              ).toLocaleString(
                                "en-ZM"
                              )
                            : "N/A"
                    }

                </td>


                <td>

                    ${escapeHTML(
                        farmName ||
                        "Unknown Farm"
                    )}

                </td>


                <td>

                    ${escapeHTML(
                        payment.plan_name ||
                        "Subscription"
                    )}

                </td>


                <td>

                    ${escapeHTML(
                        payment.currency ||
                        "ZMW"
                    )}

                    ${Number(
                        payment.amount ||
                        0
                    ).toFixed(2)}

                </td>


                <td>

                    ${escapeHTML(
                        payment.payment_method ||
                        "N/A"
                    )}

                </td>


                <td>

                    ${escapeHTML(
                        payment.payment_provider ||
                        "N/A"
                    )}

                </td>


                <td>

                    ${escapeHTML(
                        payment.transaction_reference ||
                        "N/A"
                    )}

                </td>


                <td>

                    <span
                        class="${statusClass}">

                        ${escapeHTML(
                            payment.payment_status ||
                            "N/A"
                        )}

                    </span>

                </td>

            `;


            container.appendChild(
                row
            );

        }
    );
}


/* ==========================================================
   LOADING STATE
========================================================== */

function setLoadingState() {

    const ids = [

        "totalRevenue",
        "totalPayments",
        "paidPayments",
        "pendingPayments",
        "activeSubscriptions",
        "expiringSubscriptions"

    ];


    ids.forEach(
        id =>
            setText(
                id,
                "…"
            )
    );


    const summary =
        document.getElementById(
            "subscriptionSummary"
        );


    if (summary) {

        summary.innerHTML =
            "<p>Loading subscription information...</p>";
    }


    const expiring =
        document.getElementById(
            "expiringList"
        );


    if (expiring) {

        expiring.innerHTML =
            "<p>Loading expiry information...</p>";
    }


    const table =
        document.getElementById(
            "paymentReport"
        );


    if (table) {

        table.innerHTML = `

            <tr>

                <td colspan="8">

                    Loading payment records...

                </td>

            </tr>

        `;
    }
}


/* ==========================================================
   PAGE ERROR
========================================================== */

function showPageError(
    message
) {

    const summary =
        document.getElementById(
            "subscriptionSummary"
        );


    if (summary) {

        summary.innerHTML =
            `<p>${escapeHTML(message)}</p>`;
    }


    const expiring =
        document.getElementById(
            "expiringList"
        );


    if (expiring) {

        expiring.innerHTML =
            `<p>${escapeHTML(message)}</p>`;
    }


    const table =
        document.getElementById(
            "paymentReport"
        );


    if (table) {

        table.innerHTML = `

            <tr>

                <td colspan="8">

                    ${escapeHTML(message)}

                </td>

            </tr>

        `;
    }
}


/* ==========================================================
   SET TEXT
========================================================== */

function setText(
    id,
    value
) {

    const element =
        document.getElementById(id);


    if (element) {

        element.textContent =
            value;

    }
}


/* ==========================================================
   NORMALIZE TEXT
========================================================== */

function normalize(
    value
) {

    return String(
        value || ""
    )
        .trim()
        .toLowerCase();
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
   LOGOUT
========================================================== */

async function logout() {

    try {

        await supabaseClient
            .auth
            .signOut();

    }

    catch(error) {

        console.error(
            "LOGOUT ERROR:",
            error
        );

    }


    localStorage.removeItem(
        "loggedInUser"
    );


    window.location.href =
        "login.html";
}


/* ==========================================================
   INITIALIZE
========================================================== */

document.addEventListener(
    "DOMContentLoaded",
    async function() {

        console.log(
            "SUBSCRIPTION REPORTS: Initializing..."
        );


        const allowed =
            await checkSuperAdmin();


        if (!allowed) return;


        await loadSubscriptionReports();

    }
);