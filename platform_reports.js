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


    const revenueElement =
        document.getElementById(
            "totalRevenue"
        );

    const totalPaymentsElement =
        document.getElementById(
            "totalPayments"
        );

    const paidPaymentsElement =
        document.getElementById(
            "paidPayments"
        );

    const pendingPaymentsElement =
        document.getElementById(
            "pendingPayments"
        );

    const activeSubscriptionsElement =
        document.getElementById(
            "activeSubscriptions"
        );


    if (revenueElement)
        revenueElement.textContent = "…";

    if (totalPaymentsElement)
        totalPaymentsElement.textContent = "…";

    if (paidPaymentsElement)
        paidPaymentsElement.textContent = "…";

    if (pendingPaymentsElement)
        pendingPaymentsElement.textContent = "…";

    if (activeSubscriptionsElement)
        activeSubscriptionsElement.textContent = "…";


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

        alert(
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

        alert(
            "Unable to load subscription payments."
        );

        return;
    }


    const payments =
        paymentsResult.data || [];


    /* ======================================================
       CALCULATE STATISTICS
    ====================================================== */

    const paidPayments =
        payments.filter(
            payment =>
                String(
                    payment.payment_status
                ).toLowerCase() === "paid"
        );


    const pendingPayments =
        payments.filter(
            payment =>
                String(
                    payment.payment_status
                ).toLowerCase() === "pending"
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
       DISPLAY STATISTICS
    ====================================================== */

    if (revenueElement) {

        revenueElement.textContent =
            formatCurrency(
                totalRevenue
            );

    }


    if (totalPaymentsElement) {

        totalPaymentsElement.textContent =
            payments.length;

    }


    if (paidPaymentsElement) {

        paidPaymentsElement.textContent =
            paidPayments.length;

    }


    if (pendingPaymentsElement) {

        pendingPaymentsElement.textContent =
            pendingPayments.length;

    }


    if (activeSubscriptionsElement) {

        activeSubscriptionsElement.textContent =
            activeSubscriptions;

    }


    /* ======================================================
       DISPLAY SUMMARY
    ====================================================== */

    loadSubscriptionSummary(
        farms,
        payments
    );


    /* ======================================================
       DISPLAY PAYMENT TABLE
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
   SUBSCRIPTION SUMMARY
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


            let subscriptionStatus =
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
                    farm.status === "Active" &&
                    end > new Date()
                ) {

                    subscriptionStatus =
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

                }

                else {

                    subscriptionStatus =
                        "Expired";

                    expiry =
                        "Expired";
                }
            }


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


            const farmRevenue =
                farmPayments
                    .filter(
                        payment =>
                            String(
                                payment.payment_status
                            ).toLowerCase() ===
                            "paid"
                    )
                    .reduce(
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
                    ${escapeHTML(
                        farm.status ||
                        "N/A"
                    )}
                </p>


                <p>
                    <strong>Subscription:</strong>
                    ${escapeHTML(
                        subscriptionStatus
                    )}
                </p>


                <p>
                    <strong>Expiry:</strong>
                    ${escapeHTML(
                        expiry
                    )}
                </p>


                <p>
                    <strong>Paid Revenue:</strong>
                    ${formatCurrency(
                        farmRevenue
                    )}
                </p>


                <p>
                    <strong>Payments:</strong>
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
                    colspan="7">

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
                String(
                    payment.payment_status ||
                    "N/A"
                ).toLowerCase();


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

