/* ==========================================================
   MUNKA PIGGERY
   SUPER ADMIN - RECORD SUBSCRIPTION PAYMENT
   ========================================================== */

let currentUser = null;
let farms = [];
let plans = [];


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

        window.location.href =
            "login.html";

        return false;
    }


    const {
        data: user,
        error: userError
    } = await supabaseClient
        .from("users")
        .select("*")
        .eq(
            "auth_user_id",
            session.user.id
        )
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

        alert(
            "Access denied."
        );

        window.location.href =
            "login.html";

        return false;
    }


    currentUser = user;

    return true;
}


/* ==========================================================
   LOAD FARMS
========================================================== */

async function loadFarms() {

    const {
        data,
        error
    } = await supabaseClient
        .from("farms")
        .select(
            "id, farm_name, status, subscription_start, subscription_end"
        )
        .order(
            "farm_name",
            {
                ascending: true
            }
        );


    if (error) {

        console.error(
            "FARMS ERROR:",
            error
        );

        showMessage(
            "Unable to load farms.",
            "error"
        );

        return;
    }


    farms =
        data || [];


    const farmSelect =
        document.getElementById(
            "farm"
        );


    if (!farmSelect) return;


    farmSelect.innerHTML = `

        <option value="">

            Select Farm

        </option>

    `;


    farms.forEach(
        farm => {

            const option =
                document.createElement(
                    "option"
                );


            option.value =
                farm.id;


            option.textContent =
                `${farm.farm_name} (ID: ${farm.id})`;


            farmSelect.appendChild(
                option
            );

        }
    );
}


/* ==========================================================
   LOAD SUBSCRIPTION PLANS
========================================================== */

async function loadPlans() {

    const {
        data,
        error
    } = await supabaseClient
        .from("subscription_plans")
        .select(
            "id, plan_name, duration_days, amount, currency, status"
        )
        .eq(
            "status",
            "Active"
        )
        .order(
            "duration_days",
            {
                ascending: true
            }
        );


    if (error) {

        console.error(
            "PLANS ERROR:",
            error
        );

        showMessage(
            "Unable to load subscription plans.",
            "error"
        );

        return;
    }


    plans =
        data || [];


    const planSelect =
        document.getElementById(
            "plan"
        );


    if (!planSelect) return;


    planSelect.innerHTML = `

        <option value="">

            Select Plan

        </option>

    `;


    plans.forEach(
        plan => {

            const option =
                document.createElement(
                    "option"
                );


            option.value =
                plan.id;


            option.textContent =
                `${plan.plan_name} - ${formatCurrency(plan.amount)}`;


            planSelect.appendChild(
                option
            );

        }
    );
}


/* ==========================================================
   DISPLAY PLAN AMOUNT
========================================================== */

function updateAmount() {

    const planSelect =
        document.getElementById(
            "plan"
        );


    const amountInput =
        document.getElementById(
            "amount"
        );


    if (
        !planSelect ||
        !amountInput
    ) {
        return;
    }


    const selectedPlan =
        plans.find(
            plan =>
                String(
                    plan.id
                ) ===
                String(
                    planSelect.value
                )
        );


    if (!selectedPlan) {

        amountInput.value =
            "";

        return;
    }


    amountInput.value =
        Number(
            selectedPlan.amount
        ).toFixed(2);
}


/* ==========================================================
   GET SELECTED FARM
========================================================== */

function getSelectedFarm() {

    const farmSelect =
        document.getElementById(
            "farm"
        );


    if (!farmSelect) {

        return null;
    }


    return farms.find(
        farm =>
            String(
                farm.id
            ) ===
            String(
                farmSelect.value
            )
    ) || null;
}


/* ==========================================================
   GET SELECTED PLAN
========================================================== */

function getSelectedPlan() {

    const planSelect =
        document.getElementById(
            "plan"
        );


    if (!planSelect) {

        return null;
    }


    return plans.find(
        plan =>
            String(
                plan.id
            ) ===
            String(
                planSelect.value
            )
    ) || null;
}


/* ==========================================================
   RECORD PAYMENT
========================================================== */

async function recordPayment(
    event
) {

    event.preventDefault();


    const saveButton =
        document.getElementById(
            "savePaymentButton"
        );


    const farm =
        getSelectedFarm();


    const plan =
        getSelectedPlan();


    const paymentMethod =
        document.getElementById(
            "paymentMethod"
        ).value.trim();


    const customerPhone =
        document.getElementById(
            "customerPhone"
        ).value.trim();


    const transactionReference =
        document.getElementById(
            "transactionReference"
        ).value.trim();


    const paymentDate =
        document.getElementById(
            "paymentDate"
        ).value;


    const notes =
        document.getElementById(
            "notes"
        ).value.trim();


    /* ======================================================
       VALIDATION
    ====================================================== */

    if (!farm) {

        showMessage(
            "Please select a farm.",
            "error"
        );

        return;
    }


    if (!plan) {

        showMessage(
            "Please select a subscription plan.",
            "error"
        );

        return;
    }


    if (!paymentMethod) {

        showMessage(
            "Please select a payment method.",
            "error"
        );

        return;
    }


    if (!transactionReference) {

        showMessage(
            "Please enter the transaction reference.",
            "error"
        );

        return;
    }


    if (!paymentDate) {

        showMessage(
            "Please select the payment date.",
            "error"
        );

        return;
    }


    /* ======================================================
       PREVENT DUPLICATE TRANSACTION
    ====================================================== */

    const {
        data: existingPayment,
        error: duplicateError
    } = await supabaseClient
        .from("subscription_payments")
        .select("id")
        .eq(
            "transaction_reference",
            transactionReference
        )
        .maybeSingle();


    if (duplicateError) {

        console.error(
            "DUPLICATE CHECK ERROR:",
            duplicateError
        );

        showMessage(
            "Unable to verify the transaction reference.",
            "error"
        );

        return;
    }


    if (existingPayment) {

        showMessage(
            "This transaction reference has already been recorded.",
            "error"
        );

        return;
    }


    /* ======================================================
       CONFIRM PAYMENT
    ====================================================== */

    const confirmed =
        confirm(
            `Confirm payment?\n\n` +
            `Farm: ${farm.farm_name}\n` +
            `Plan: ${plan.plan_name}\n` +
            `Amount: ${formatCurrency(plan.amount)}\n` +
            `Method: ${paymentMethod}\n` +
            `Reference: ${transactionReference}`
        );


    if (!confirmed) {

        return;
    }


    /* ======================================================
       DISABLE BUTTON
    ====================================================== */

    if (saveButton) {

        saveButton.disabled =
            true;

        saveButton.textContent =
            "Saving Payment...";
    }


    showMessage(
        "Recording payment...",
        "info"
    );


    try {

        /* ==================================================
           CALCULATE SUBSCRIPTION DATES
        ================================================== */

        const now =
            new Date();


        let subscriptionStart =
            now;


        /*
           If the farm already has an active subscription,
           continue from its existing expiry date.

           This prevents losing unused subscription days.
        */

        if (
            farm.status === "Active" &&
            farm.subscription_end
        ) {

            const existingEnd =
                new Date(
                    farm.subscription_end
                );


            if (
                existingEnd > now
            ) {

                subscriptionStart =
                    existingEnd;
            }
        }


        const subscriptionEnd =
            new Date(
                subscriptionStart.getTime()
                +
                (
                    Number(
                        plan.duration_days
                    )
                    *
                    24
                    *
                    60
                    *
                    60
                    *
                    1000
                )
            );


        /* ==================================================
           SAVE PAYMENT
        ================================================== */

        const paymentRecord = {

            farm_id:
                farm.id,

            plan_name:
                plan.plan_name,

            duration_days:
                Number(
                    plan.duration_days
                ),

            amount:
                Number(
                    plan.amount
                ),

            currency:
                plan.currency ||
                "ZMW",

            payment_method:
                paymentMethod,

            customer_phone:
                customerPhone ||
                null,

            transaction_reference:
                transactionReference,

            payment_status:
                "Paid",

            payment_provider:
                paymentMethod,

            subscription_start:
                subscriptionStart.toISOString(),

            subscription_end:
                subscriptionEnd.toISOString(),

            paid_at:
                new Date(
                    `${paymentDate}T12:00:00`
                ).toISOString()

        };


        const {
            data: savedPayment,
            error: paymentError
        } = await supabaseClient
            .from("subscription_payments")
            .insert(
                [paymentRecord]
            )
            .select()
            .single();


        if (paymentError) {

            console.error(
                "PAYMENT INSERT ERROR:",
                paymentError
            );

            throw paymentError;
        }


        /* ==================================================
           UPDATE FARM SUBSCRIPTION
        ================================================== */

        const {
            error: farmUpdateError
        } = await supabaseClient
            .from("farms")
            .update({

                status:
                    "Active",

                subscription_start:
                    subscriptionStart.toISOString(),

                subscription_end:
                    subscriptionEnd.toISOString()

            })
            .eq(
                "id",
                farm.id
            );


        if (farmUpdateError) {

            console.error(
                "FARM UPDATE ERROR:",
                farmUpdateError
            );


            /*
               The payment was already saved.

               Do not create another payment record.
               Report the farm update problem clearly.
            */

            showMessage(
                "Payment was recorded, but the farm subscription could not be updated. Please check the farm record.",
                "error"
            );


            return;
        }


        /* ==================================================
           SUCCESS
        ================================================== */

        showMessage(
            `Payment recorded successfully. ${farm.farm_name} subscription has been extended until ${subscriptionEnd.toLocaleDateString(
                "en-ZM",
                {
                    day: "2-digit",
                    month: "long",
                    year: "numeric"
                }
            )}.`,
            "success"
        );


        console.log(
            "PAYMENT SAVED:",
            savedPayment
        );


        /*
           Refresh the selected farm data so that
           the next payment uses the new expiry date.
        */

        await loadFarms();


        resetPaymentForm(
            false
        );


    }

    catch(error) {

        console.error(
            "RECORD PAYMENT ERROR:",
            error
        );


        showMessage(
            "Unable to record the payment. Please check the browser console for details.",
            "error"
        );

    }

    finally {

        if (saveButton) {

            saveButton.disabled =
                false;

            saveButton.textContent =
                "💾 Save Payment";
        }

    }
}


/* ==========================================================
   RESET FORM
========================================================== */

function resetPaymentForm(
    showInfo = true
) {

    const form =
        document.getElementById(
            "paymentForm"
        );


    if (form) {

        form.reset();

    }


    const amount =
        document.getElementById(
            "amount"
        );


    if (amount) {

        amount.value =
            "";
    }


    setTodayDate();


    if (showInfo) {

        showMessage(
            "Form cleared.",
            "info"
        );
    }
}


/* ==========================================================
   SET TODAY'S DATE
========================================================== */

function setTodayDate() {

    const dateInput =
        document.getElementById(
            "paymentDate"
        );


    if (!dateInput) return;


    const today =
        new Date();


    const year =
        today.getFullYear();


    const month =
        String(
            today.getMonth() + 1
        ).padStart(
            2,
            "0"
        );


    const day =
        String(
            today.getDate()
        ).padStart(
            2,
            "0"
        );


    dateInput.value =
        `${year}-${month}-${day}`;
}


/* ==========================================================
   MESSAGE
========================================================== */

function showMessage(
    message,
    type
) {

    const element =
        document.getElementById(
            "message"
        );


    if (!element) return;


    element.textContent =
        message;


    element.className =
        `message ${type}`;
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
   EVENT LISTENERS
========================================================== */

document.addEventListener(
    "DOMContentLoaded",
    async function() {

        console.log(
            "RECORD PAYMENT: Initializing..."
        );


        const allowed =
            await checkSuperAdmin();


        if (!allowed) return;


        setTodayDate();


        const planSelect =
            document.getElementById(
                "plan"
            );


        if (planSelect) {

            planSelect.addEventListener(
                "change",
                updateAmount
            );

        }


        const paymentForm =
            document.getElementById(
                "paymentForm"
            );


        if (paymentForm) {

            paymentForm.addEventListener(
                "submit",
                recordPayment
            );

        }


        await Promise.all([

            loadFarms(),

            loadPlans()

        ]);


        console.log(
            "RECORD PAYMENT: Ready."
        );

    }
);

