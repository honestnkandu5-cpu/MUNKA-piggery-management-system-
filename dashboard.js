// ==========================================================
// MUNKA PIGGERY TECHNOLOGY
// DASHBOARD.JS
// ==========================================================
//
// RESPONSIBILITIES:
// 1. Display logged-in user
// 2. Display registered farm
// 3. Display Zambia time
// 4. Dashboard navigation
// 5. Logout
// 6. Dashboard announcements
// 7. Dashboard notifications
// 8. Owner/Admin announcement management
// 9. Secure automatic notification creation
// 10. Notification read/unread management
// 11. Professional notification centre
// 12. Live Farm Statistics
// ==========================================================


// ==========================================================
// GLOBAL STORAGE
// ==========================================================

let dashboardAnnouncements = [];

let dashboardNotifications = [];

let managedAnnouncements = [];

let dashboardCurrentUser = null;

let dashboardCurrentFarmId = null;


// ==========================================================
// LIVE FARM STATISTICS STORAGE
// ==========================================================

let dashboardFarmStatistics = {

    totalPigs: 0,

    pregnantSows: 0,

    expectedFarrowings: 0,

    pigletsWeaned: 0,

    treatmentsThisMonth: 0,

    salesThisMonth: 0,

    expensesThisMonth: 0,

    netBalance: 0

};


// ==========================================================
// GET LOGGED-IN USER
// ==========================================================

function getDashboardLoggedInUser(){

    try{

        const storedUser =
            localStorage.getItem("loggedInUser");

        if(!storedUser){

            return null;

        }

        return JSON.parse(storedUser);

    }
    catch(error){

        console.error(
            "DASHBOARD USER READ ERROR:",
            error
        );

        return null;

    }

}


// ==========================================================
// CHECK ADMIN ACCESS
// ==========================================================

function isDashboardAdmin(){

    const user =
        dashboardCurrentUser ||
        getDashboardLoggedInUser();

    if(!user){

        return false;

    }

    const role =
        String(user.role || "")
        .trim()
        .toLowerCase();

    const status =
        String(user.status || "")
        .trim()
        .toLowerCase();

    if(status !== "active"){

        return false;

    }

    return (
        role === "owner/admin" ||
        role === "super admin"
    );

}


// ==========================================================
// DISPLAY LOGGED-IN USER
// ==========================================================

function displayLoggedInUser(){

    try{

        const loggedInUser =
            getDashboardLoggedInUser();

        if(!loggedInUser){

            return;

        }

        dashboardCurrentUser =
            loggedInUser;


        const welcomeUser =
            document.getElementById(
                "welcomeUser"
            );

        if(welcomeUser){

            welcomeUser.textContent =
                "Welcome " +
                (
                    loggedInUser.full_name ||
                    loggedInUser.username ||
                    "User"
                );

        }


        const userDetails =
            document.getElementById(
                "userDetails"
            );

        if(userDetails){

            userDetails.innerHTML =

                "Username: " +
                (
                    loggedInUser.username ||
                    "N/A"
                ) +

                "<br>Role: " +

                (
                    loggedInUser.role ||
                    "N/A"
                );

        }


        const lastLogin =
            document.getElementById(
                "lastLogin"
            );

        if(lastLogin){

            const loginValue =

                loggedInUser.last_login ||

                loggedInUser.lastLogin ||

                loggedInUser.last_login_at;


            if(loginValue){

                const loginDate =
                    new Date(loginValue);


                if(
                    !isNaN(
                        loginDate.getTime()
                    )
                ){

                    lastLogin.textContent =

                        "Last Login: " +

                        loginDate.toLocaleString(
                            "en-GB",
                            {
                                timeZone:
                                    "Africa/Lusaka",

                                day:
                                    "2-digit",

                                month:
                                    "2-digit",

                                year:
                                    "numeric",

                                hour:
                                    "2-digit",

                                minute:
                                    "2-digit",

                                second:
                                    "2-digit",

                                hour12:
                                    false
                            }
                        );

                }
                else{

                    lastLogin.textContent =
                        "Last Login: Not available";

                }

            }
            else{

                lastLogin.textContent =
                    "Last Login: Not available";

            }

        }

    }
    catch(error){

        console.error(
            "DASHBOARD USER ERROR:",
            error
        );

    }

}


// ==========================================================
// DISPLAY FARM NAME
// ==========================================================

async function displayFarmName(){

    const farmNameElement =
        document.getElementById(
            "farmName"
        );

    if(!farmNameElement){

        return;

    }

    farmNameElement.textContent =
        "Loading farm...";


    try{

        if(
            typeof supabaseClient ===
            "undefined"
        ){

            throw new Error(
                "supabaseClient is not available."
            );

        }


        const {

            data: sessionData,

            error: sessionError

        } =
            await supabaseClient
                .auth
                .getSession();


        if(sessionError){

            throw sessionError;

        }


        const session =
            sessionData.session;


        if(
            !session ||
            !session.user
        ){

            farmNameElement.textContent =
                "Farm";

            return;

        }


        const authUserId =
            session.user.id;


        const {

            data: userProfile,

            error: userError

        } =
            await supabaseClient
                .from("users")
                .select(
                    "id, farm_id, role, status, full_name, username"
                )
                .eq(
                    "auth_user_id",
                    authUserId
                )
                .maybeSingle();


        if(userError){

            throw userError;

        }


        if(userProfile){

            dashboardCurrentUser = {

                ...(dashboardCurrentUser || {}),

                ...userProfile

            };

        }


        if(
            userProfile &&
            String(
                userProfile.role || ""
            )
            .trim()
            .toLowerCase()
            ===
            "super admin"
        ){

            farmNameElement.textContent =
                "MUNKA PIGGERY PLATFORM";

            dashboardCurrentFarmId = null;

            prepareAnnouncementManagement();

            return;

        }


        if(
            !userProfile ||
            !userProfile.farm_id
        ){

            farmNameElement.textContent =
                "Farm";

            dashboardCurrentFarmId =
                null;

            prepareAnnouncementManagement();

            return;

        }


        dashboardCurrentFarmId =
            userProfile.farm_id;


        const {

            data: farm,

            error: farmError

        } =
            await supabaseClient
                .from("farms")
                .select(
                    "id, farm_name"
                )
                .eq(
                    "id",
                    userProfile.farm_id
                )
                .maybeSingle();


        if(farmError){

            throw farmError;

        }


        if(
            !farm ||
            !farm.farm_name
        ){

            farmNameElement.textContent =
                "Farm";

            return;

        }


        farmNameElement.textContent =
            farm.farm_name;


        prepareAnnouncementManagement();

    }
    catch(error){

        console.error(
            "FARM NAME ERROR:",
            error
        );

        farmNameElement.textContent =
            "Farm";

        prepareAnnouncementManagement();

    }

}


// ==========================================================
// PREPARE MANAGEMENT SECTION
// ==========================================================

function prepareAnnouncementManagement(){

    const section =
        document.getElementById(
            "announcementManagementSection"
        );

    if(!section){

        return;

    }


    if(!isDashboardAdmin()){

        section.style.display =
            "none";

        return;

    }


    section.style.display =
        "block";


    loadAnnouncementTargetUsers();

    loadManagedAnnouncements();

}


// ==========================================================
// ==========================================================
// LIVE FARM STATISTICS
// ==========================================================
// ==========================================================


// ==========================================================
// FORMAT MONEY
// ==========================================================

function formatDashboardMoney(amount){

    const numericAmount =
        Number(amount) || 0;


    return numericAmount.toLocaleString(
        "en-ZM",
        {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        }
    );

}


// ==========================================================
// GET ZAMBIA CURRENT MONTH RANGE
// ==========================================================
//
// Returns UTC ISO values representing the current
// calendar month in Africa/Lusaka.
// ==========================================================

function getDashboardCurrentMonthRange(){

    const now =
        new Date();


    const zambiaParts =
        new Intl.DateTimeFormat(
            "en-GB",
            {
                timeZone:
                    "Africa/Lusaka",

                year:
                    "numeric",

                month:
                    "2-digit",

                day:
                    "2-digit"
            }
        ).formatToParts(now);


    const values = {};


    zambiaParts.forEach(
        function(part){

            if(part.type !== "literal"){

                values[part.type] =
                    part.value;

            }

        }
    );


    const year =
        Number(values.year);

    const month =
        Number(values.month);


    // Africa/Lusaka is UTC+2.
    // The range is converted to UTC for Supabase.
    const monthStart =
        new Date(
            Date.UTC(
                year,
                month - 1,
                1,
                -2,
                0,
                0
            )
        );


    const nextMonthStart =
        month === 12

            ? new Date(
                Date.UTC(
                    year + 1,
                    0,
                    1,
                    -2,
                    0,
                    0
                )
            )

            : new Date(
                Date.UTC(
                    year,
                    month,
                    1,
                    -2,
                    0,
                    0
                )
            );


    return {

        start:
            monthStart.toISOString(),

        end:
            nextMonthStart.toISOString()

    };

}


// ==========================================================
// CREATE STATISTICS PANEL
// ==========================================================
//
// The panel is created dynamically so that the existing
// dashboard.html does not have to be changed at this stage.
// ==========================================================

function createDashboardStatisticsPanel(){

    let panel =
        document.getElementById(
            "dashboardFarmStatistics"
        );


    if(panel){

        return panel;

    }


    const announcementContainer =
        document.getElementById(
            "dashboardAnnouncements"
        );


    if(!announcementContainer){

        console.warn(
            "Statistics panel could not find dashboardAnnouncements."
        );

        return null;

    }


    // Try to place the statistics after the announcement
    // section rather than inside the announcement cards.
    let insertionPoint =
        announcementContainer.closest(
            "section"
        );


    if(!insertionPoint){

        insertionPoint =
            announcementContainer.parentElement;

    }


    if(!insertionPoint){

        return null;

    }


    panel =
        document.createElement(
            "section"
        );


    panel.id =
        "dashboardFarmStatistics";


    panel.setAttribute(
        "aria-label",
        "Live Farm Statistics"
    );


    panel.innerHTML = `

        <div style="
            background:linear-gradient(135deg,#ffffff,#f7faf8);
            border-radius:18px;
            padding:22px;
            margin:24px 0;
            border:1px solid #e2e8e5;
            box-shadow:0 8px 25px rgba(0,0,0,0.06);
        ">

            <div style="
                display:flex;
                justify-content:space-between;
                align-items:center;
                gap:15px;
                flex-wrap:wrap;
                margin-bottom:18px;
            ">

                <div>

                    <div style="
                        font-size:12px;
                        font-weight:700;
                        letter-spacing:1px;
                        text-transform:uppercase;
                        color:#64806f;
                        margin-bottom:5px;
                    ">
                        Farm Overview
                    </div>

                    <h2 style="
                        margin:0;
                        color:#174d32;
                        font-size:22px;
                    ">
                        Live Farm Statistics
                    </h2>

                    <p style="
                        margin:5px 0 0;
                        color:#68756e;
                        font-size:13px;
                    ">
                        Current performance figures for your farm
                    </p>

                </div>

                <button
                    type="button"
                    id="refreshFarmStatisticsButton"
                    style="
                        border:none;
                        border-radius:10px;
                        padding:10px 15px;
                        background:#174d32;
                        color:#ffffff;
                        cursor:pointer;
                        font-weight:600;
                    "
                >
                    ↻ Refresh
                </button>

            </div>


            <div
                id="farmStatisticsStatus"
                style="
                    display:none;
                    margin-bottom:15px;
                    padding:10px 12px;
                    border-radius:9px;
                    background:#f1f6f3;
                    color:#496457;
                    font-size:13px;
                "
            ></div>


            <div
                id="farmStatisticsGrid"
                style="
                    display:grid;
                    grid-template-columns:repeat(auto-fit,minmax(180px,1fr));
                    gap:15px;
                "
            >

                ${createStatisticsCardHTML(
                    "totalPigs",
                    "🐖",
                    "Total Pigs",
                    "0"
                )}

                ${createStatisticsCardHTML(
                    "pregnantSows",
                    "🤰",
                    "Pregnant Sows",
                    "0"
                )}

                ${createStatisticsCardHTML(
                    "expectedFarrowings",
                    "🐷",
                    "Expected Farrowings",
                    "0"
                )}

                ${createStatisticsCardHTML(
                    "pigletsWeaned",
                    "🍼",
                    "Piglets Weaned",
                    "0"
                )}

                ${createStatisticsCardHTML(
                    "treatmentsThisMonth",
                    "💉",
                    "Treatments This Month",
                    "0"
                )}

                ${createStatisticsCardHTML(
                    "salesThisMonth",
                    "💰",
                    "Sales This Month",
                    "K0.00"
                )}

                ${createStatisticsCardHTML(
                    "expensesThisMonth",
                    "💸",
                    "Expenses This Month",
                    "K0.00"
                )}

                ${createStatisticsCardHTML(
                    "netBalance",
                    "📊",
                    "Net Balance",
                    "K0.00"
                )}

            </div>

        </div>

    `;


    insertionPoint.insertAdjacentElement(
        "afterend",
        panel
    );


    const refreshButton =
        document.getElementById(
            "refreshFarmStatisticsButton"
        );


    if(refreshButton){

        refreshButton.addEventListener(
            "click",
            async function(){

                await loadDashboardFarmStatistics();

            }
        );

    }


    return panel;

}


// ==========================================================
// STATISTICS CARD HTML
// ==========================================================

function createStatisticsCardHTML(
    id,
    icon,
    title,
    value
){

    return `

        <div
            class="dashboard-stat-card"
            data-stat-card="${id}"
            style="
                background:#ffffff;
                border:1px solid #e4ebe7;
                border-radius:14px;
                padding:17px;
                min-height:105px;
                box-sizing:border-box;
            "
        >

            <div style="
                display:flex;
                justify-content:space-between;
                align-items:flex-start;
                gap:10px;
            ">

                <div>

                    <div style="
                        font-size:12px;
                        color:#718078;
                        font-weight:600;
                        margin-bottom:8px;
                    ">
                        ${title}
                    </div>

                    <div
                        id="stat-${id}"
                        style="
                            font-size:25px;
                            font-weight:800;
                            color:#174d32;
                            line-height:1.2;
                        "
                    >
                        ${value}
                    </div>

                </div>

                <div style="
                    width:38px;
                    height:38px;
                    display:flex;
                    align-items:center;
                    justify-content:center;
                    border-radius:11px;
                    background:#eef6f1;
                    font-size:20px;
                ">
                    ${icon}
                </div>

            </div>

        </div>

    `;

}


// ==========================================================
// UPDATE STATISTICS CARD
// ==========================================================

function updateDashboardStatistic(
    id,
    value
){

    const element =
        document.getElementById(
            "stat-" + id
        );


    if(element){

        element.textContent =
            value;

    }

}


// ==========================================================
// DISPLAY FARM STATISTICS
// ==========================================================

function displayDashboardFarmStatistics(){

    updateDashboardStatistic(
        "totalPigs",
        dashboardFarmStatistics.totalPigs
    );


    updateDashboardStatistic(
        "pregnantSows",
        dashboardFarmStatistics.pregnantSows
    );


    updateDashboardStatistic(
        "expectedFarrowings",
        dashboardFarmStatistics.expectedFarrowings
    );


    updateDashboardStatistic(
        "pigletsWeaned",
        dashboardFarmStatistics.pigletsWeaned
    );


    updateDashboardStatistic(
        "treatmentsThisMonth",
        dashboardFarmStatistics.treatmentsThisMonth
    );


    updateDashboardStatistic(
        "salesThisMonth",
        "K" +
        formatDashboardMoney(
            dashboardFarmStatistics.salesThisMonth
        )
    );


    updateDashboardStatistic(
        "expensesThisMonth",
        "K" +
        formatDashboardMoney(
            dashboardFarmStatistics.expensesThisMonth
        )
    );


    const net =
        Number(
            dashboardFarmStatistics.netBalance
        ) || 0;


    updateDashboardStatistic(
        "netBalance",
        (net < 0 ? "-K" : "K") +
        formatDashboardMoney(
            Math.abs(net)
        )
    );


    const netElement =
        document.getElementById(
            "stat-netBalance"
        );


    if(netElement){

        netElement.style.color =
            net < 0
                ? "#b42318"
                : "#174d32";

    }

}


// ==========================================================
// LOAD LIVE FARM STATISTICS
// ==========================================================

async function loadDashboardFarmStatistics(){

    createDashboardStatisticsPanel();


    const statusElement =
        document.getElementById(
            "farmStatisticsStatus"
        );


    if(statusElement){

        statusElement.style.display =
            "block";

        statusElement.textContent =
            "Updating live farm statistics...";

    }


    // ------------------------------------------------------
    // RESET VALUES
    // ------------------------------------------------------

    dashboardFarmStatistics = {

        totalPigs: 0,

        pregnantSows: 0,

        expectedFarrowings: 0,

        pigletsWeaned: 0,

        treatmentsThisMonth: 0,

        salesThisMonth: 0,

        expensesThisMonth: 0,

        netBalance: 0

    };


    displayDashboardFarmStatistics();


    // ------------------------------------------------------
    // SUPABASE CHECK
    // ------------------------------------------------------

    if(
        typeof supabaseClient ===
        "undefined"
    ){

        console.error(
            "STATISTICS ERROR: supabaseClient is not available."
        );

        if(statusElement){

            statusElement.textContent =
                "Farm statistics are unavailable.";

        }

        return;

    }


    // ------------------------------------------------------
    // SUPER ADMIN
    // ------------------------------------------------------
    //
    // The statistics are farm-specific. Therefore, a
    // Super Admin without a farm_id will not be shown
    // farm statistics until a farm context is selected.
    // ------------------------------------------------------

    if(!dashboardCurrentFarmId){

        if(statusElement){

            statusElement.textContent =
                "Select or enter a farm context to view farm statistics.";

        }

        return;

    }


    const farmId =
        Number(
            dashboardCurrentFarmId
        );


    if(
        !Number.isFinite(farmId)
    ){

        if(statusElement){

            statusElement.textContent =
                "Invalid farm identification.";

        }

        return;

    }


    try{

        const monthRange =
            getDashboardCurrentMonthRange();


        // ==================================================
        // 1. TOTAL PIGS
        // ==================================================

        const pigsResult =
            await supabaseClient
                .from("pigs")
                .select(
                    "id",
                    {
                        count:
                            "exact",
                        head:
                            true
                    }
                )
                .eq(
                    "farm_id",
                    farmId
                );


        if(pigsResult.error){

            throw pigsResult.error;

        }


        dashboardFarmStatistics.totalPigs =
            Number(
                pigsResult.count || 0
            );


        // ==================================================
        // 2. GESTATION RECORDS
        // ==================================================

        const gestationResult =
            await supabaseClient
                .from("gestation_records")
                .select(
                    "id, delivery_date, status"
                )
                .eq(
                    "farm_id",
                    farmId
                );


        if(gestationResult.error){

            throw gestationResult.error;

        }


        const gestationRecords =
            gestationResult.data || [];


        const now =
            new Date();


        // Current pregnant records:
        //
        // We consider a sow currently pregnant when:
        // - delivery_date exists and is today/future
        // - status is not a clearly completed/cancelled
        //   status.
        //
        // This avoids counting old completed pregnancies.

        dashboardFarmStatistics.pregnantSows =
            gestationRecords.filter(
                function(record){

                    if(!record.delivery_date){

                        return false;

                    }


                    const deliveryDate =
                        new Date(
                            record.delivery_date
                        );


                    if(
                        isNaN(
                            deliveryDate.getTime()
                        )
                    ){

                        return false;

                    }


                    const status =
                        String(
                            record.status || ""
                        )
                        .trim()
                        .toLowerCase();


                    const closedStatuses = [

                        "completed",
                        "complete",
                        "farrowed",
                        "farrow",
                        "closed",
                        "cancelled",
                        "canceled",
                        "failed",
                        "aborted"

                    ];


                    if(
                        closedStatuses.includes(
                            status
                        )
                    ){

                        return false;

                    }


                    return deliveryDate >= now;

                }
            ).length;


        // ==================================================
        // 3. EXPECTED FARROWINGS
        // ==================================================
        //
        // Future delivery dates are counted.
        // ==================================================

        dashboardFarmStatistics.expectedFarrowings =
            gestationRecords.filter(
                function(record){

                    if(!record.delivery_date){

                        return false;

                    }


                    const deliveryDate =
                        new Date(
                            record.delivery_date
                        );


                    if(
                        isNaN(
                            deliveryDate.getTime()
                        )
                    ){

                        return false;

                    }


                    const status =
                        String(
                            record.status || ""
                        )
                        .trim()
                        .toLowerCase();


                    const closedStatuses = [

                        "completed",
                        "complete",
                        "farrowed",
                        "farrow",
                        "closed",
                        "cancelled",
                        "canceled",
                        "failed",
                        "aborted"

                    ];


                    if(
                        closedStatuses.includes(
                            status
                        )
                    ){

                        return false;

                    }


                    return deliveryDate >= now;

                }
            ).length;


        // ==================================================
        // 4. PIGLETS WEANED
        // ==================================================

        const farrowingResult =
            await supabaseClient
                .from("farrowing_records")
                .select(
                    "total_weaned"
                )
                .eq(
                    "farm_id",
                    farmId
                );


        if(farrowingResult.error){

            throw farrowingResult.error;

        }


        dashboardFarmStatistics.pigletsWeaned =
            (farrowingResult.data || [])
                .reduce(
                    function(total, record){

                        return total +
                            (
                                Number(
                                    record.total_weaned
                                ) || 0
                            );

                    },
                    0
                );


        // ==================================================
        // 5. TREATMENTS THIS MONTH
        // ==================================================

        const treatmentResult =
            await supabaseClient
                .from("treatment_records")
                .select(
                    "id",
                    {
                        count:
                            "exact",
                        head:
                            true
                    }
                )
                .eq(
                    "farm_id",
                    farmId
                )
                .gte(
                    "treatment_date",
                    monthRange.start.slice(
                        0,
                        10
                    )
                )
                .lt(
                    "treatment_date",
                    monthRange.end.slice(
                        0,
                        10
                    )
                );


        if(treatmentResult.error){

            throw treatmentResult.error;

        }


        dashboardFarmStatistics.treatmentsThisMonth =
            Number(
                treatmentResult.count || 0
            );


        // ==================================================
        // 6. SALES THIS MONTH
        // ==================================================

        const salesResult =
            await supabaseClient
                .from("sales_records")
                .select(
                    "total_amount, sale_date"
                )
                .eq(
                    "farm_id",
                    farmId
                )
                .gte(
                    "sale_date",
                    monthRange.start.slice(
                        0,
                        10
                    )
                )
                .lt(
                    "sale_date",
                    monthRange.end.slice(
                        0,
                        10
                    )
                );


        if(salesResult.error){

            throw salesResult.error;

        }


        dashboardFarmStatistics.salesThisMonth =
            (salesResult.data || [])
                .reduce(
                    function(total, record){

                        return total +
                            (
                                Number(
                                    record.total_amount
                                ) || 0
                            );

                    },
                    0
                );


        // ==================================================
        // 7. EXPENSES THIS MONTH
        // ==================================================

        const expensesResult =
            await supabaseClient
                .from("expenses_records")
                .select(
                    "total_amount, expense_date"
                )
                .eq(
                    "farm_id",
                    farmId
                )
                .gte(
                    "expense_date",
                    monthRange.start.slice(
                        0,
                        10
                    )
                )
                .lt(
                    "expense_date",
                    monthRange.end.slice(
                        0,
                        10
                    )
                );


        if(expensesResult.error){

            throw expensesResult.error;

        }


        dashboardFarmStatistics.expensesThisMonth =
            (expensesResult.data || [])
                .reduce(
                    function(total, record){

                        return total +
                            (
                                Number(
                                    record.total_amount
                                ) || 0
                            );

                    },
                    0
                );


        // ==================================================
        // 8. NET BALANCE
        // ==================================================

        dashboardFarmStatistics.netBalance =

            dashboardFarmStatistics.salesThisMonth -

            dashboardFarmStatistics.expensesThisMonth;


        // ==================================================
        // DISPLAY
        // ==================================================

        displayDashboardFarmStatistics();


        if(statusElement){

            statusElement.textContent =
                "Statistics updated successfully.";

            setTimeout(
                function(){

                    if(statusElement){

                        statusElement.style.display =
                            "none";

                    }

                },
                2500
            );

        }


        console.log(
            "LIVE FARM STATISTICS:",
            dashboardFarmStatistics
        );

    }
    catch(error){

        console.error(
            "LOAD FARM STATISTICS ERROR:",
            error
        );


        if(statusElement){

            statusElement.style.display =
                "block";

            statusElement.textContent =
                "Some farm statistics could not be loaded. Please check your database permissions.";

        }

    }

}


// ==========================================================
// FORMAT DATE
// ==========================================================

function formatDashboardDate(dateValue){

    if(!dateValue){

        return "Date not available";

    }


    const date =
        new Date(dateValue);


    if(
        isNaN(
            date.getTime()
        )
    ){

        return "Date not available";

    }


    return date.toLocaleString(
        "en-GB",
        {
            timeZone:
                "Africa/Lusaka",

            day:
                "2-digit",

            month:
                "short",

            year:
                "numeric",

            hour:
                "2-digit",

            minute:
                "2-digit",

            hour12:
                false
        }
    );

}


// ==========================================================
// CONVERT DATE TO DATETIME-LOCAL
// ==========================================================

function toDashboardDateTimeLocal(
    dateValue
){

    if(!dateValue){

        return "";

    }


    const date =
        new Date(dateValue);


    if(
        isNaN(
            date.getTime()
        )
    ){

        return "";

    }


    const parts =
        new Intl.DateTimeFormat(
            "en-GB",
            {
                timeZone:
                    "Africa/Lusaka",

                year:
                    "numeric",

                month:
                    "2-digit",

                day:
                    "2-digit",

                hour:
                    "2-digit",

                minute:
                    "2-digit",

                hourCycle:
                    "h23"
            }
        ).formatToParts(date);


    const values = {};

    parts.forEach(
        function(part){

            if(part.type !== "literal"){

                values[part.type] =
                    part.value;

            }

        }
    );


    return (
        values.year +
        "-" +
        values.month +
        "-" +
        values.day +
        "T" +
        values.hour +
        ":" +
        values.minute
    );

}


// ==========================================================
// LOCAL DATETIME TO ISO
// ==========================================================

function dashboardLocalDateTimeToISO(
    value
){

    if(!value){

        return null;

    }


    const date =
        new Date(value);


    if(
        isNaN(
            date.getTime()
        )
    ){

        return null;

    }


    return date.toISOString();

}


// ==========================================================
// ACTIVE ANNOUNCEMENT CHECK
// ==========================================================

function isDashboardAnnouncementActive(
    announcement
){

    if(
        !announcement ||
        announcement.is_active !== true
    ){

        return false;

    }


    const now =
        new Date();


    if(
        announcement.start_at
    ){

        const start =
            new Date(
                announcement.start_at
            );


        if(
            !isNaN(
                start.getTime()
            ) &&
            now < start
        ){

            return false;

        }

    }


    if(
        announcement.expires_at
    ){

        const expiry =
            new Date(
                announcement.expires_at
            );


        if(
            !isNaN(
                expiry.getTime()
            ) &&
            now > expiry
        ){

            return false;

        }

    }


    return true;

}


// ==========================================================
// PRIORITY
// ==========================================================

function getPriorityInformation(
    priority
){

    const normalized =
        String(
            priority || "Normal"
        )
        .trim()
        .toLowerCase();


    if(
        normalized === "urgent"
    ){

        return {

            label:
                "URGENT",

            className:
                "priority-urgent",

            icon:
                "🚨"

        };

    }


    if(
        normalized === "important"
    ){

        return {

            label:
                "IMPORTANT",

            className:
                "priority-important",

            icon:
                "⚠️"

        };

    }


    return {

        label:
            "NORMAL",

        className:
            "priority-normal",

        icon:
            "📢"

    };

}


// ==========================================================
// CREATE ANNOUNCEMENT CARD
// ==========================================================

function createAnnouncementCard(
    announcement,
    index
){

    const card =
        document.createElement(
            "article"
        );


    card.className =
        "announcement-card";


    const priorityInfo =
        getPriorityInformation(
            announcement.priority
        );


    card.classList.add(
        priorityInfo.className
    );


    const header =
        document.createElement(
            "div"
        );

    header.className =
        "announcement-card-header";


    const priority =
        document.createElement(
            "span"
        );

    priority.className =
        "announcement-priority " +
        priorityInfo.className;

    priority.textContent =
        priorityInfo.icon +
        " " +
        priorityInfo.label;


    const date =
        document.createElement(
            "span"
        );

    date.className =
        "announcement-date";

    date.textContent =
        formatDashboardDate(
            announcement.created_at
        );


    header.appendChild(priority);

    header.appendChild(date);


    const title =
        document.createElement(
            "h4"
        );

    title.className =
        "announcement-card-title";

    title.textContent =
        announcement.title ||
        "Announcement";


    const message =
        document.createElement(
            "p"
        );

    message.className =
        "announcement-card-message";


    const messageText =
        announcement.message ||
        "";


    message.textContent =
        messageText.length > 150
            ? messageText.substring(0, 150) + "..."
            : messageText;


    const footer =
        document.createElement(
            "div"
        );

    footer.className =
        "announcement-card-footer";


    const target =
        document.createElement(
            "span"
        );

    target.className =
        "announcement-target";


    let targetText =
        "Farm Announcement";


    if(
        announcement.target_type ===
        "Platform"
    ){

        targetText =
            "Platform Announcement";

    }
    else if(
        announcement.target_type ===
        "Role"
    ){

        targetText =
            "Role: " +
            (
                announcement.target_role ||
                "Specified role"
            );

    }
    else if(
        announcement.target_type ===
        "User"
    ){

        targetText =
            "Personal Announcement";

    }


    target.textContent =
        targetText;


    const viewButton =
        document.createElement(
            "button"
        );

    viewButton.type =
        "button";

    viewButton.className =
        "announcement-view-btn";

    viewButton.textContent =
        "View Details";


    viewButton.addEventListener(
        "click",
        function(){

            openAnnouncementModal(
                index
            );

        }
    );


    footer.appendChild(target);

    footer.appendChild(viewButton);


    card.appendChild(header);

    card.appendChild(title);

    card.appendChild(message);

    card.appendChild(footer);


    return card;

}


// ==========================================================
// DISPLAY ANNOUNCEMENTS
// ==========================================================

function displayDashboardAnnouncements(){

    const container =
        document.getElementById(
            "dashboardAnnouncements"
        );

    const status =
        document.getElementById(
            "announcementStatus"
        );


    if(!container){

        return;

    }


    container.innerHTML = "";


    const activeAnnouncements =
        dashboardAnnouncements.filter(
            isDashboardAnnouncementActive
        );


    if(
        activeAnnouncements.length === 0
    ){

        if(status){

            status.textContent =
                "There are currently no active announcements.";

        }


        const empty =
            document.createElement(
                "div"
            );

        empty.className =
            "announcement-empty";


        empty.innerHTML =
            "<div class=\"announcement-empty-icon\">📢</div>" +
            "<strong>No active announcements</strong>" +
            "<span>Important farm messages will appear here.</span>";


        container.appendChild(empty);

        return;

    }


    if(status){

        status.textContent =
            activeAnnouncements.length +
            (
                activeAnnouncements.length === 1
                    ? " active announcement"
                    : " active announcements"
            );

    }


    activeAnnouncements
        .slice(0, 5)
        .forEach(
            function(announcement){

                const originalIndex =
                    dashboardAnnouncements.indexOf(
                        announcement
                    );


                container.appendChild(
                    createAnnouncementCard(
                        announcement,
                        originalIndex
                    )
                );

            }
        );

}


// ==========================================================
// LOAD DASHBOARD ANNOUNCEMENTS
// ==========================================================

async function loadDashboardAnnouncements(){

    const status =
        document.getElementById(
            "announcementStatus"
        );

    const container =
        document.getElementById(
            "dashboardAnnouncements"
        );


    if(status){

        status.textContent =
            "Loading announcements...";

    }


    if(container){

        container.innerHTML = "";

    }


    try{

        if(
            typeof supabaseClient ===
            "undefined"
        ){

            throw new Error(
                "supabaseClient is not available."
            );

        }


        const {

            data,

            error

        } =
            await supabaseClient
                .from("announcements")
                .select(
                    `
                    id,
                    title,
                    message,
                    priority,
                    target_type,
                    farm_id,
                    target_role,
                    target_user_id,
                    created_by,
                    created_at,
                    start_at,
                    expires_at,
                    is_active
                    `
                )
                .order(
                    "created_at",
                    {
                        ascending: false
                    }
                );


        if(error){

            throw error;

        }


        dashboardAnnouncements =
            data || [];


        displayDashboardAnnouncements();


    }
    catch(error){

        console.error(
            "DASHBOARD ANNOUNCEMENT ERROR:",
            error
        );


        if(status){

            status.textContent =
                "Unable to load announcements.";

        }


        if(container){

            const errorBox =
                document.createElement(
                    "div"
                );

            errorBox.className =
                "announcement-error";

            errorBox.textContent =
                "Announcements could not be loaded. Please try again.";

            container.appendChild(
                errorBox
            );

        }

    }

}


// ==========================================================
// OPEN ANNOUNCEMENT MODAL
// ==========================================================

function openAnnouncementModal(index){

    const announcement =
        dashboardAnnouncements[index];


    if(!announcement){

        return;

    }


    const modal =
        document.getElementById(
            "announcementModal"
        );


    if(!modal){

        return;

    }


    const priority =
        document.getElementById(
            "modalPriority"
        );

    const title =
        document.getElementById(
            "modalAnnouncementTitle"
        );

    const message =
        document.getElementById(
            "modalAnnouncementMessage"
        );

    const date =
        document.getElementById(
            "modalAnnouncementDate"
        );


    const priorityInfo =
        getPriorityInformation(
            announcement.priority
        );


    if(priority){

        priority.className =
            "modal-priority " +
            priorityInfo.className;

        priority.textContent =
            priorityInfo.icon +
            " " +
            priorityInfo.label;

    }


    if(title){

        title.textContent =
            announcement.title ||
            "Announcement";

    }


    if(message){

        message.textContent =
            announcement.message ||
            "";

    }


    if(date){

        date.textContent =
            formatDashboardDate(
                announcement.created_at
            );

    }


    modal.classList.add("show");

    modal.setAttribute(
        "aria-hidden",
        "false"
    );

}


// ==========================================================
// CLOSE ANNOUNCEMENT MODAL
// ==========================================================

function closeAnnouncementModal(){

    const modal =
        document.getElementById(
            "announcementModal"
        );


    if(!modal){

        return;

    }


    modal.classList.remove("show");

    modal.setAttribute(
        "aria-hidden",
        "true"
    );

}


// ==========================================================
// LOAD TARGET USERS
// ==========================================================

async function loadAnnouncementTargetUsers(){

    const select =
        document.getElementById(
            "dashboardAnnouncementTargetUser"
        );


    if(!select){

        return;

    }


    select.innerHTML =
        "<option value=\"\">Loading users...</option>";


    if(!dashboardCurrentFarmId){

        select.innerHTML =
            "<option value=\"\">No farm selected</option>";

        return;

    }


    try{

        const {

            data,

            error

        } =
            await supabaseClient
                .from("users")
                .select(
                    "id, full_name, username, role, status"
                )
                .eq(
                    "farm_id",
                    dashboardCurrentFarmId
                )
                .order(
                    "full_name",
                    {
                        ascending: true
                    }
                );


        if(error){

            throw error;

        }


        select.innerHTML =
            "<option value=\"\">Select a user</option>";


        (data || []).forEach(
            function(user){

                const option =
                    document.createElement(
                        "option"
                    );


                option.value =
                    user.id;


                const name =
                    user.full_name ||
                    user.username ||
                    "User " + user.id;


                option.textContent =
                    name +
                    " — " +
                    (
                        user.role ||
                        "No role"
                    );


                if(
                    user.status &&
                    String(user.status)
                        .toLowerCase()
                    !==
                    "active"
                ){

                    option.disabled =
                        true;

                    option.textContent +=
                        " (" +
                        user.status +
                        ")";

                }


                select.appendChild(
                    option
                );

            }
        );

    }
    catch(error){

        console.error(
            "TARGET USER LOAD ERROR:",
            error
        );


        select.innerHTML =
            "<option value=\"\">Unable to load users</option>";

    }

}


// ==========================================================
// TARGET TYPE CHANGE
// ==========================================================

function handleAnnouncementTargetChange(){

    const targetType =
        document.getElementById(
            "dashboardAnnouncementTargetType"
        )?.value;


    const roleGroup =
        document.getElementById(
            "dashboardRoleTargetGroup"
        );

    const userGroup =
        document.getElementById(
            "dashboardUserTargetGroup"
        );


    if(roleGroup){

        roleGroup.style.display =
            targetType === "Role"
                ? "block"
                : "none";

    }


    if(userGroup){

        userGroup.style.display =
            targetType === "User"
                ? "block"
                : "none";

    }


    const roleSelect =
        document.getElementById(
            "dashboardAnnouncementTargetRole"
        );

    const userSelect =
        document.getElementById(
            "dashboardAnnouncementTargetUser"
        );


    if(
        targetType !== "Role" &&
        roleSelect
    ){

        roleSelect.value =
            "";

    }


    if(
        targetType !== "User" &&
        userSelect
    ){

        userSelect.value =
            "";

    }

}


// ==========================================================
// SHOW/HIDE FORM
// ==========================================================

function toggleAnnouncementForm(){

    const wrapper =
        document.getElementById(
            "announcementFormWrapper"
        );


    if(!wrapper){

        return;

    }


    if(
        wrapper.style.display === "none" ||
        wrapper.style.display === ""
    ){

        resetAnnouncementForm();

        wrapper.style.display =
            "block";

        wrapper.scrollIntoView({
            behavior: "smooth",
            block: "start"
        });

    }
    else{

        wrapper.style.display =
            "none";

    }

}


// ==========================================================
// RESET FORM
// ==========================================================

function resetAnnouncementForm(){

    const form =
        document.getElementById(
            "dashboardAnnouncementForm"
        );


    if(form){

        form.reset();

    }


    const id =
        document.getElementById(
            "dashboardAnnouncementId"
        );

    if(id){

        id.value =
            "";

    }


    const title =
        document.getElementById(
            "announcementFormTitle"
        );

    if(title){

        title.textContent =
            "Create New Announcement";

    }


    const active =
        document.getElementById(
            "dashboardAnnouncementActive"
        );

    if(active){

        active.checked =
            true;

    }


    const start =
        document.getElementById(
            "dashboardAnnouncementStartAt"
        );

    if(start){

        const now =
            new Date();


        now.setMinutes(
            now.getMinutes() -
            now.getTimezoneOffset()
        );


        start.value =
            now.toISOString()
                .slice(
                    0,
                    16
                );

    }


    handleAnnouncementTargetChange();

    hideAnnouncementManagementMessage();

}


// ==========================================================
// CANCEL FORM
// ==========================================================

function cancelAnnouncementForm(){

    const wrapper =
        document.getElementById(
            "announcementFormWrapper"
        );


    if(wrapper){

        wrapper.style.display =
            "none";

    }


    resetAnnouncementForm();

}


// ==========================================================
// SHOW MANAGEMENT MESSAGE
// ==========================================================

function showAnnouncementManagementMessage(
    message,
    success
){

    const box =
        document.getElementById(
            "announcementManagementMessage"
        );


    if(!box){

        return;

    }


    box.textContent =
        message;


    box.className =
        success
            ? "announcement-management-message success"
            : "announcement-management-message error";


    box.style.display =
        "block";

}


// ==========================================================
// HIDE MANAGEMENT MESSAGE
// ==========================================================

function hideAnnouncementManagementMessage(){

    const box =
        document.getElementById(
            "announcementManagementMessage"
        );


    if(box){

        box.style.display =
            "none";

        box.textContent =
            "";

    }

}


// ==========================================================
// SECURE AUTOMATIC NOTIFICATION ENGINE
// ==========================================================

async function createNotificationsForAnnouncement(
    announcement
){

    if(!announcement){

        return {

            success:
                false,

            created:
                0,

            skipped:
                0,

            error:
                "Announcement not supplied."

        };

    }


    if(
        announcement.is_active !== true
    ){

        console.log(
            "Notification skipped: announcement is inactive."
        );

        return {

            success:
                true,

            created:
                0,

            skipped:
                0

        };

    }


    if(
        announcement.start_at
    ){

        const start =
            new Date(
                announcement.start_at
            );


        if(
            !isNaN(
                start.getTime()
            ) &&
            new Date() < start
        ){

            console.log(
                "Notification skipped: announcement is scheduled for later."
            );

            return {

                success:
                    true,

                created:
                    0,

                skipped:
                    0,

                scheduled:
                    true

            };

        }

    }


    try{

        const {

            data,

            error

        } =
            await supabaseClient.rpc(
                "create_announcement_notifications",
                {
                    p_announcement_id:
                        announcement.id
                }
            );


        if(error){

            console.error(
                "SECURE NOTIFICATION RPC ERROR:",
                error
            );


            return {

                success:
                    false,

                created:
                    0,

                skipped:
                    0,

                error:
                    error.message ||
                    "Secure notification creation failed."

            };

        }


        let createdCount =
            0;


        if(
            typeof data ===
            "number"
        ){

            createdCount =
                data;

        }
        else if(
            typeof data ===
            "string"
        ){

            createdCount =
                Number(data) || 0;

        }
        else if(
            Array.isArray(data)
        ){

            if(
                data.length > 0
            ){

                const result =
                    data[0];


                createdCount =
                    Number(
                        result.created_count ??
                        result.notification_count ??
                        result.count ??
                        result.created ??
                        0
                    );

            }

        }
        else if(
            data &&
            typeof data ===
            "object"
        ){

            createdCount =
                Number(
                    data.created_count ??
                    data.notification_count ??
                    data.count ??
                    data.created ??
                    0
                );

        }


        if(
            !Number.isFinite(
                createdCount
            ) ||
            createdCount < 0
        ){

            createdCount =
                0;

        }


        createdCount =
            Math.floor(
                createdCount
            );


        console.log(
            "SECURE NOTIFICATIONS CREATED:",
            createdCount
        );


        return {

            success:
                true,

            created:
                createdCount,

            skipped:
                0

        };

    }
    catch(error){

        console.error(
            "SECURE NOTIFICATION CREATION ERROR:",
            error
        );


        return {

            success:
                false,

            created:
                0,

            skipped:
                0,

            error:
                error.message ||
                "Unable to create notifications."

        };

    }

}


// ==========================================================
// SAVE ANNOUNCEMENT
// ==========================================================

async function saveDashboardAnnouncement(event){

    event.preventDefault();


    if(!isDashboardAdmin()){

        showAnnouncementManagementMessage(
            "You do not have permission to manage announcements.",
            false
        );

        return;

    }


    const title =
        document.getElementById(
            "dashboardAnnouncementTitle"
        )?.value.trim();


    const message =
        document.getElementById(
            "dashboardAnnouncementMessage"
        )?.value.trim();


    const priority =
        document.getElementById(
            "dashboardAnnouncementPriority"
        )?.value;


    const targetType =
        document.getElementById(
            "dashboardAnnouncementTargetType"
        )?.value;


    const targetRole =
        document.getElementById(
            "dashboardAnnouncementTargetRole"
        )?.value;


    const targetUser =
        document.getElementById(
            "dashboardAnnouncementTargetUser"
        )?.value;


    const startAt =
        document.getElementById(
            "dashboardAnnouncementStartAt"
        )?.value;


    const expiresAt =
        document.getElementById(
            "dashboardAnnouncementExpiresAt"
        )?.value;


    const isActive =
        document.getElementById(
            "dashboardAnnouncementActive"
        )?.checked === true;


    const announcementId =
        document.getElementById(
            "dashboardAnnouncementId"
        )?.value;


    if(!title || !message){

        showAnnouncementManagementMessage(
            "Please enter both a title and message.",
            false
        );

        return;

    }


    if(
        targetType === "Role" &&
        !targetRole
    ){

        showAnnouncementManagementMessage(
            "Please select the target role.",
            false
        );

        return;

    }


    if(
        targetType === "User" &&
        !targetUser
    ){

        showAnnouncementManagementMessage(
            "Please select the target user.",
            false
        );

        return;

    }


    if(
        targetType === "Platform" &&
        String(
            dashboardCurrentUser?.role ||
            ""
        )
        .trim()
        .toLowerCase()
        !==
        "super admin"
    ){

        showAnnouncementManagementMessage(
            "Only Super Admin can create platform announcements.",
            false
        );

        return;

    }


    if(
        expiresAt &&
        startAt &&
        new Date(expiresAt) <=
        new Date(startAt)
    ){

        showAnnouncementManagementMessage(
            "The expiry date must be later than the start date.",
            false
        );

        return;

    }


    if(
        String(
            dashboardCurrentUser?.role ||
            ""
        )
        .trim()
        .toLowerCase()
        !==
        "super admin"
    ){

        if(
            !dashboardCurrentFarmId
        ){

            showAnnouncementManagementMessage(
                "Your farm could not be identified.",
                false
            );

            return;

        }

    }


    const saveButton =
        document.querySelector(
            ".save-announcement-btn"
        );


    if(saveButton){

        saveButton.disabled =
            true;

        saveButton.textContent =
            "Saving...";

    }


    try{

        const payload = {

            title:
                title,

            message:
                message,

            priority:
                priority,

            target_type:
                targetType,

            farm_id:
                targetType === "Platform"
                    ? null
                    : dashboardCurrentFarmId,

            target_role:
                targetType === "Role"
                    ? targetRole
                    : null,

            target_user_id:
                targetType === "User"
                    ? Number(targetUser)
                    : null,

            start_at:
                dashboardLocalDateTimeToISO(
                    startAt
                ) ||
                new Date().toISOString(),

            expires_at:
                dashboardLocalDateTimeToISO(
                    expiresAt
                ),

            is_active:
                isActive

        };


        let result;


        if(announcementId){

            result =
                await supabaseClient
                    .from("announcements")
                    .update(payload)
                    .eq(
                        "id",
                        Number(announcementId)
                    )
                    .select()
                    .single();


            if(result.error){

                throw result.error;

            }


            showAnnouncementManagementMessage(
                "Announcement updated successfully.",
                true
            );

        }
        else{

            payload.created_by =
                dashboardCurrentUser?.id ||
                null;


            result =
                await supabaseClient
                    .from("announcements")
                    .insert(
                        payload
                    )
                    .select()
                    .single();


            if(result.error){

                throw result.error;

            }


            const notificationResult =
                await createNotificationsForAnnouncement(
                    result.data
                );


            if(
                !notificationResult.success
            ){

                console.warn(
                    "Announcement was created, but notifications could not be created:",
                    notificationResult.error
                );


                showAnnouncementManagementMessage(
                    "Announcement created, but notifications could not be delivered yet. " +
                    (
                        notificationResult.error ||
                        "Please check notification permissions."
                    ),
                    false
                );

            }
            else if(
                notificationResult.scheduled
            ){

                showAnnouncementManagementMessage(
                    "Announcement scheduled successfully. Notifications will be created when the announcement becomes active.",
                    true
                );

            }
            else{

                showAnnouncementManagementMessage(
                    "Announcement created successfully. " +
                    notificationResult.created +
                    " notification(s) created.",
                    true
                );

            }

        }


        await loadDashboardAnnouncements();

        await loadDashboardNotifications();

        await loadManagedAnnouncements();


        setTimeout(
            function(){

                cancelAnnouncementForm();

            },
            1500
        );


    }
    catch(error){

        console.error(
            "SAVE ANNOUNCEMENT ERROR:",
            error
        );


        showAnnouncementManagementMessage(
            error.message ||
            "Unable to save announcement.",
            false
        );

    }
    finally{

        if(saveButton){

            saveButton.disabled =
                false;

            saveButton.textContent =
                "Save Announcement";

        }

    }

}


// ==========================================================
// LOAD MANAGED ANNOUNCEMENTS
// ==========================================================

async function loadManagedAnnouncements(){

    const body =
        document.getElementById(
            "managedAnnouncementsBody"
        );


    const status =
        document.getElementById(
            "managedAnnouncementsStatus"
        );


    if(
        !body ||
        !isDashboardAdmin()
    ){

        return;

    }


    if(status){

        status.textContent =
            "Loading announcements...";

    }


    body.innerHTML =
        "";


    try{

        let query =
            supabaseClient
                .from("announcements")
                .select(
                    `
                    id,
                    title,
                    message,
                    priority,
                    target_type,
                    farm_id,
                    target_role,
                    target_user_id,
                    created_by,
                    created_at,
                    start_at,
                    expires_at,
                    is_active
                    `
                )
                .order(
                    "created_at",
                    {
                        ascending: false
                    }
                );


        if(
            String(
                dashboardCurrentUser?.role ||
                ""
            )
            .trim()
            .toLowerCase()
            !==
            "super admin"
        ){

            query =
                query.eq(
                    "farm_id",
                    dashboardCurrentFarmId
                );

        }


        const {

            data,

            error

        } =
            await query;


        if(error){

            throw error;

        }


        managedAnnouncements =
            data || [];


        if(
            managedAnnouncements.length === 0
        ){

            if(status){

                status.textContent =
                    "No announcements have been created yet.";

            }

            return;

        }


        if(status){

            status.textContent =
                managedAnnouncements.length +
                (
                    managedAnnouncements.length === 1
                        ? " announcement"
                        : " announcements"
                );

        }


        managedAnnouncements.forEach(
            function(announcement){

                body.appendChild(
                    createManagedAnnouncementRow(
                        announcement
                    )
                );

            }
        );

    }
    catch(error){

        console.error(
            "MANAGED ANNOUNCEMENTS ERROR:",
            error
        );


        if(status){

            status.textContent =
                "Unable to load managed announcements.";

        }

    }

}


// ==========================================================
// CREATE MANAGEMENT TABLE ROW
// ==========================================================

function createManagedAnnouncementRow(
    announcement
){

    const row =
        document.createElement(
            "tr"
        );


    const titleCell =
        document.createElement(
            "td"
        );


    const titleStrong =
        document.createElement(
            "strong"
        );


    titleStrong.textContent =
        announcement.title ||
        "Untitled";


    const messageSmall =
        document.createElement(
            "small"
        );


    messageSmall.textContent =
        announcement.message || "";


    titleCell.appendChild(
        titleStrong
    );

    titleCell.appendChild(
        messageSmall
    );


    const priorityCell =
        document.createElement(
            "td"
        );


    const priorityInfo =
        getPriorityInformation(
            announcement.priority
        );


    const priorityBadge =
        document.createElement(
            "span"
        );


    priorityBadge.className =
        "management-priority " +
        priorityInfo.className;


    priorityBadge.textContent =
        priorityInfo.label;


    priorityCell.appendChild(
        priorityBadge
    );


    const targetCell =
        document.createElement(
            "td"
        );


    let targetText =
        "Farm";


    if(
        announcement.target_type ===
        "Role"
    ){

        targetText =
            announcement.target_role ||
            "Role";

    }
    else if(
        announcement.target_type ===
        "User"
    ){

        targetText =
            "Individual User";

    }
    else if(
        announcement.target_type ===
        "Platform"
    ){

        targetText =
            "Platform";

    }


    targetCell.textContent =
        targetText;


    const statusCell =
        document.createElement(
            "td"
        );


    const statusBadge =
        document.createElement(
            "span"
        );


    const active =
        isDashboardAnnouncementActive(
            announcement
        );


    statusBadge.className =
        active
            ? "management-status active"
            : "management-status inactive";


    if(
        announcement.is_active !== true
    ){

        statusBadge.textContent =
            "Inactive";

    }
    else if(
        announcement.start_at &&
        new Date(
            announcement.start_at
        ) > new Date()
    ){

        statusBadge.textContent =
            "Scheduled";

    }
    else if(
        announcement.expires_at &&
        new Date(
            announcement.expires_at
        ) < new Date()
    ){

        statusBadge.textContent =
            "Expired";

    }
    else{

        statusBadge.textContent =
            "Active";

    }


    statusCell.appendChild(
        statusBadge
    );


    const createdCell =
        document.createElement(
            "td"
        );


    createdCell.textContent =
        formatDashboardDate(
            announcement.created_at
        );


    const actionsCell =
        document.createElement(
            "td"
        );


    actionsCell.className =
        "management-actions";


    const editButton =
        document.createElement(
            "button"
        );


    editButton.type =
        "button";

    editButton.className =
        "management-edit-btn";

    editButton.textContent =
        "Edit";


    editButton.addEventListener(
        "click",
        function(){

            editDashboardAnnouncement(
                announcement.id
            );

        }
    );


    const deleteButton =
        document.createElement(
            "button"
        );


    deleteButton.type =
        "button";

    deleteButton.className =
        "management-delete-btn";

    deleteButton.textContent =
        "Delete";


    deleteButton.addEventListener(
        "click",
        function(){

            deleteDashboardAnnouncement(
                announcement.id
            );

        }
    );


    actionsCell.appendChild(
        editButton
    );

    actionsCell.appendChild(
        deleteButton
    );


    row.appendChild(titleCell);

    row.appendChild(priorityCell);

    row.appendChild(targetCell);

    row.appendChild(statusCell);

    row.appendChild(createdCell);

    row.appendChild(actionsCell);


    return row;

}


// ==========================================================
// EDIT ANNOUNCEMENT
// ==========================================================

function editDashboardAnnouncement(
    announcementId
){

    const announcement =
        managedAnnouncements.find(
            function(item){

                return Number(item.id) ===
                    Number(announcementId);

            }
        );


    if(!announcement){

        return;

    }


    const wrapper =
        document.getElementById(
            "announcementFormWrapper"
        );

    const id =
        document.getElementById(
            "dashboardAnnouncementId"
        );

    const title =
        document.getElementById(
            "dashboardAnnouncementTitle"
        );

    const message =
        document.getElementById(
            "dashboardAnnouncementMessage"
        );

    const priority =
        document.getElementById(
            "dashboardAnnouncementPriority"
        );

    const targetType =
        document.getElementById(
            "dashboardAnnouncementTargetType"
        );

    const targetRole =
        document.getElementById(
            "dashboardAnnouncementTargetRole"
        );

    const targetUser =
        document.getElementById(
            "dashboardAnnouncementTargetUser"
        );

    const startAt =
        document.getElementById(
            "dashboardAnnouncementStartAt"
        );

    const expiresAt =
        document.getElementById(
            "dashboardAnnouncementExpiresAt"
        );

    const active =
        document.getElementById(
            "dashboardAnnouncementActive"
        );

    const formTitle =
        document.getElementById(
            "announcementFormTitle"
        );


    if(id){

        id.value =
            announcement.id;

    }

    if(title){

        title.value =
            announcement.title || "";

    }

    if(message){

        message.value =
            announcement.message || "";

    }

    if(priority){

        priority.value =
            announcement.priority ||
            "Normal";

    }

    if(targetType){

        targetType.value =
            announcement.target_type ||
            "Farm";

    }

    if(targetRole){

        targetRole.value =
            announcement.target_role ||
            "";

    }

    if(targetUser){

        targetUser.value =
            announcement.target_user_id ||
            "";

    }

    if(startAt){

        startAt.value =
            toDashboardDateTimeLocal(
                announcement.start_at
            );

    }

    if(expiresAt){

        expiresAt.value =
            toDashboardDateTimeLocal(
                announcement.expires_at
            );

    }

    if(active){

        active.checked =
            announcement.is_active === true;

    }

    if(formTitle){

        formTitle.textContent =
            "Edit Announcement";

    }


    handleAnnouncementTargetChange();


    if(wrapper){

        wrapper.style.display =
            "block";

        wrapper.scrollIntoView({
            behavior: "smooth",
            block: "start"
        });

    }

}


// ==========================================================
// DELETE ANNOUNCEMENT
// ==========================================================

async function deleteDashboardAnnouncement(
    announcementId
){

    if(!isDashboardAdmin()){

        return;

    }


    const announcement =
        managedAnnouncements.find(
            function(item){

                return Number(item.id) ===
                    Number(announcementId);

            }
        );


    if(!announcement){

        return;

    }


    const confirmed =
        window.confirm(
            "Delete the announcement \"" +
            announcement.title +
            "\"?\n\nThis action cannot be undone."
        );


    if(!confirmed){

        return;

    }


    try{

        const {

            error

        } =
            await supabaseClient
                .from("announcements")
                .delete()
                .eq(
                    "id",
                    Number(announcementId)
                );


        if(error){

            throw error;

        }


        await loadDashboardAnnouncements();

        await loadManagedAnnouncements();

        await loadDashboardNotifications();

    }
    catch(error){

        console.error(
            "DELETE ANNOUNCEMENT ERROR:",
            error
        );


        alert(
            error.message ||
            "Unable to delete announcement."
        );

    }

}


// ==========================================================
// LOAD NOTIFICATIONS
// ==========================================================

async function loadDashboardNotifications(){

    const badge =
        document.getElementById(
            "notificationBadge"
        );


    try{

        if(
            typeof supabaseClient ===
            "undefined"
        ){

            return;

        }


        const loggedInUser =
            getDashboardLoggedInUser();


        if(
            !loggedInUser ||
            !loggedInUser.id
        ){

            return;

        }


        const {

            data,

            error

        } =
            await supabaseClient
                .from("notifications")
                .select(
                    `
                    id,
                    title,
                    message,
                    notification_type,
                    priority,
                    is_read,
                    created_at,
                    read_at,
                    announcement_id
                    `
                )
                .eq(
                    "user_id",
                    loggedInUser.id
                )
                .order(
                    "created_at",
                    {
                        ascending: false
                    }
                )
                .limit(20);


        if(error){

            console.error(
                "NOTIFICATION LOAD ERROR:",
                error
            );

            return;

        }


        dashboardNotifications =
            data || [];


        updateNotificationBadge();

        updateNotificationCentreSummary();


        const modal =
            document.getElementById(
                "notificationModal"
            );


        if(
            modal &&
            modal.classList.contains("show")
        ){

            displayNotificationList();

        }

    }
    catch(error){

        console.error(
            "NOTIFICATION ERROR:",
            error
        );

    }

}


// ==========================================================
// UPDATE NOTIFICATION BADGE
// ==========================================================

function updateNotificationBadge(){

    const badge =
        document.getElementById(
            "notificationBadge"
        );


    if(!badge){

        return;

    }


    const unreadCount =
        dashboardNotifications.filter(
            function(notification){

                return notification.is_read !== true;

            }
        ).length;


    if(unreadCount > 0){

        badge.textContent =
            unreadCount > 99
                ? "99+"
                : unreadCount;

        badge.style.display =
            "flex";

    }
    else{

        badge.style.display =
            "none";

    }


    updateNotificationCentreSummary();

}


// ==========================================================
// UPDATE NOTIFICATION CENTRE SUMMARY
// ==========================================================

function updateNotificationCentreSummary(){

    const unreadCountElement =
        document.getElementById(
            "notificationUnreadCount"
        );


    const statusElement =
        document.getElementById(
            "notificationStatus"
        );


    const markAllButton =
        document.getElementById(
            "markAllNotificationsReadButton"
        );


    const unreadCount =
        dashboardNotifications.filter(
            function(notification){

                return notification.is_read !== true;

            }
        ).length;


    if(unreadCountElement){

        unreadCountElement.textContent =
            unreadCount;

    }


    if(statusElement){

        if(dashboardNotifications.length === 0){

            statusElement.textContent =
                "You have no notifications.";

        }
        else if(unreadCount === 0){

            statusElement.textContent =
                "All notifications have been read.";

        }
        else{

            statusElement.textContent =
                unreadCount +
                (
                    unreadCount === 1
                        ? " unread notification"
                        : " unread notifications"
                );

        }

    }


    if(markAllButton){

        markAllButton.disabled =
            unreadCount === 0;

        markAllButton.style.opacity =
            unreadCount === 0
                ? "0.6"
                : "1";

    }

}


// ==========================================================
// CREATE NOTIFICATION ITEM
// ==========================================================

function createNotificationItem(
    notification
){

    const item =
        document.createElement(
            "article"
        );


    item.className =
        "notification-item";


    if(
        notification.is_read !== true
    ){

        item.classList.add(
            "notification-unread"
        );

    }


    const header =
        document.createElement(
            "div"
        );


    header.className =
        "notification-item-header";


    const priorityInfo =
        getPriorityInformation(
            notification.priority
        );


    const priority =
        document.createElement(
            "span"
        );


    priority.className =
        "notification-priority " +
        priorityInfo.className;


    priority.textContent =
        priorityInfo.icon +
        " " +
        priorityInfo.label;


    const date =
        document.createElement(
            "span"
        );


    date.className =
        "notification-date";


    date.textContent =
        formatDashboardDate(
            notification.created_at
        );


    header.appendChild(
        priority
    );

    header.appendChild(
        date
    );


    const title =
        document.createElement(
            "h4"
        );


    title.className =
        "notification-title";


    title.textContent =
        notification.title ||
        "Notification";


    const message =
        document.createElement(
            "p"
        );


    message.className =
        "notification-message";


    message.textContent =
        notification.message ||
        "";


    const footer =
        document.createElement(
            "div"
        );


    footer.className =
        "notification-item-footer";


    const status =
        document.createElement(
            "span"
        );


    status.className =
        "notification-read-status";


    status.textContent =
        notification.is_read === true
            ? "✓ Read"
            : "● Unread";


    footer.appendChild(
        status
    );


    if(
        notification.is_read !== true
    ){

        const readButton =
            document.createElement(
                "button"
            );


        readButton.type =
            "button";


        readButton.className =
            "notification-mark-read-btn";


        readButton.textContent =
            "Mark as read";


        readButton.addEventListener(
            "click",
            async function(event){

                event.stopPropagation();

                await markSingleDashboardNotificationAsRead(
                    notification.id
                );

            }
        );


        footer.appendChild(
            readButton
        );

    }


    item.appendChild(
        header
    );

    item.appendChild(
        title
    );

    item.appendChild(
        message
    );

    item.appendChild(
        footer
    );


    return item;

}


// ==========================================================
// DISPLAY NOTIFICATION LIST
// ==========================================================

function displayNotificationList(){

    const list =
        document.getElementById(
            "notificationList"
        );


    const emptyState =
        document.getElementById(
            "notificationEmptyState"
        );


    if(!list){

        return;

    }


    list.innerHTML =
        "";


    if(
        dashboardNotifications.length === 0
    ){

        if(emptyState){

            emptyState.style.display =
                "block";

        }

        return;

    }


    if(emptyState){

        emptyState.style.display =
            "none";

    }


    dashboardNotifications.forEach(
        function(notification){

            list.appendChild(
                createNotificationItem(
                    notification
                )
            );

        }
    );


    updateNotificationCentreSummary();

}


// ==========================================================
// MARK ONE NOTIFICATION AS READ
// ==========================================================

async function markSingleDashboardNotificationAsRead(
    notificationId
){

    const loggedInUser =
        getDashboardLoggedInUser();


    if(
        !loggedInUser ||
        !loggedInUser.id ||
        !notificationId
    ){

        return false;

    }


    const notification =
        dashboardNotifications.find(
            function(item){

                return Number(item.id) ===
                    Number(notificationId);

            }
        );


    if(
        !notification ||
        notification.is_read === true
    ){

        return true;

    }


    try{

        const readAt =
            new Date().toISOString();


        const {

            error

        } =
            await supabaseClient
                .from("notifications")
                .update({

                    is_read:
                        true,

                    read_at:
                        readAt

                })
                .eq(
                    "id",
                    Number(notificationId)
                )
                .eq(
                    "user_id",
                    loggedInUser.id
                );


        if(error){

            throw error;

        }


        dashboardNotifications =
            dashboardNotifications.map(
                function(item){

                    if(
                        Number(item.id) ===
                        Number(notificationId)
                    ){

                        return {

                            ...item,

                            is_read:
                                true,

                            read_at:
                                readAt

                        };

                    }


                    return item;

                }
            );


        updateNotificationBadge();

        displayNotificationList();

        return true;

    }
    catch(error){

        console.error(
            "MARK SINGLE NOTIFICATION READ ERROR:",
            error
        );


        return false;

    }

}


// ==========================================================
// MARK ALL NOTIFICATIONS AS READ
// ==========================================================

async function markAllDashboardNotificationsAsRead(){

    const loggedInUser =
        getDashboardLoggedInUser();


    if(
        !loggedInUser ||
        !loggedInUser.id
    ){

        return;

    }


    const unreadNotifications =
        dashboardNotifications.filter(
            function(notification){

                return notification.is_read !== true;

            }
        );


    if(
        unreadNotifications.length === 0
    ){

        updateNotificationCentreSummary();

        return;

    }


    const button =
        document.getElementById(
            "markAllNotificationsReadButton"
        );


    if(button){

        button.disabled =
            true;

        button.textContent =
            "Marking as read...";

    }


    try{

        const readAt =
            new Date().toISOString();


        const {

            error

        } =
            await supabaseClient
                .from("notifications")
                .update({

                    is_read:
                        true,

                    read_at:
                        readAt

                })
                .eq(
                    "user_id",
                    loggedInUser.id
                )
                .eq(
                    "is_read",
                    false
                );


        if(error){

            throw error;

        }


        dashboardNotifications =
            dashboardNotifications.map(
                function(notification){

                    if(
                        notification.is_read !== true
                    ){

                        return {

                            ...notification,

                            is_read:
                                true,

                            read_at:
                                readAt

                        };

                    }


                    return notification;

                }
            );


        updateNotificationBadge();

        displayNotificationList();

    }
    catch(error){

        console.error(
            "MARK ALL NOTIFICATIONS READ ERROR:",
            error
        );

        alert(
            error.message ||
            "Unable to mark notifications as read."
        );

    }
    finally{

        if(button){

            button.textContent =
                "✓ Mark All as Read";

            updateNotificationCentreSummary();

        }

    }

}


// ==========================================================
// BACKWARD-COMPATIBILITY FUNCTION
// ==========================================================

async function markDashboardNotificationsAsRead(){

    await markAllDashboardNotificationsAsRead();

}


// ==========================================================
// OPEN NOTIFICATIONS
// ==========================================================

async function openNotifications(){

    const modal =
        document.getElementById(
            "notificationModal"
        );


    const list =
        document.getElementById(
            "notificationList"
        );


    if(!modal || !list){

        return;

    }


    list.innerHTML =
        "<div class=\"notification-loading\">Loading notifications...</div>";


    const emptyState =
        document.getElementById(
            "notificationEmptyState"
        );


    if(emptyState){

        emptyState.style.display =
            "none";

    }


    modal.classList.add("show");

    modal.setAttribute(
        "aria-hidden",
        "false"
    );


    await loadDashboardNotifications();


    displayNotificationList();

}


// ==========================================================
// CLOSE NOTIFICATIONS
// ==========================================================

function closeNotifications(){

    const modal =
        document.getElementById(
            "notificationModal"
        );


    if(!modal){

        return;

    }


    modal.classList.remove("show");

    modal.setAttribute(
        "aria-hidden",
        "true"
    );

}


// ==========================================================
// MODAL OUTSIDE CLICK
// ==========================================================

document.addEventListener(
    "click",
    function(event){

        const announcementModal =
            document.getElementById(
                "announcementModal"
            );

        const notificationModal =
            document.getElementById(
                "notificationModal"
            );


        if(
            event.target ===
            announcementModal
        ){

            closeAnnouncementModal();

        }


        if(
            event.target ===
            notificationModal
        ){

            closeNotifications();

        }

    }
);


// ==========================================================
// ESC KEY
// ==========================================================

document.addEventListener(
    "keydown",
    function(event){

        if(
            event.key ===
            "Escape"
        ){

            closeAnnouncementModal();

            closeNotifications();

        }

    }
);


// ==========================================================
// NAVIGATION
// ==========================================================

function openPigRegistration(){

    window.location.href =
        "pig_registration.html";

}


function openGestation(){

    window.location.href =
        "gestation.html";

}


function openFarrowing(){

    window.location.href =
        "farrowing.html";

}


function openWeaning(){

    window.location.href =
        "weaning.html";

}


function openVaccination(){

    window.location.href =
        "vaccination.html";

}


function openFeeding(){

    window.location.href =
        "feeding.html";

}


function openSales(){

    window.location.href =
        "sales.html";

}


function openExpenses(){

    window.location.href =
        "expenses.html";

}


function openReports(){

    window.location.href =
        "reports.html";

}


function openUsers(){

    window.location.href =
        "users.html";

}


function openActivity(){

    window.location.href =
        "activity.html";

}


// ==========================================================
// LOGOUT
// ==========================================================

async function logout(){

    try{

        if(
            typeof supabaseClient !==
            "undefined"
        ){

            await supabaseClient
                .auth
                .signOut();

        }

    }
    catch(error){

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


// ==========================================================
// START DASHBOARD
// ==========================================================

document.addEventListener(
    "DOMContentLoaded",
    async function(){

        displayLoggedInUser();

        await displayFarmName();

        // Load live farm statistics after the farm
        // has been identified.
        createDashboardStatisticsPanel();

        await loadDashboardFarmStatistics();

        await loadDashboardAnnouncements();

        await loadDashboardNotifications();

    }
);