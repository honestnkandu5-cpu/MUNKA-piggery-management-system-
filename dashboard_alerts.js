/* =========================================================
   MUNKA PIGGERY MANAGEMENT SYSTEM
   FARM DASHBOARD ALERTS
   =========================================================
   IMPORTANT:
   - Uses supabaseClient
   - Zambia local date handling
   - Action Day: today = Urgent
   - Action Day: next 7 days = Important
   - Overdue Action Day = Urgent
   - Weaning alerts
   - Not Serviced alerts
   - Feeding alerts
   - Water alerts
   ========================================================= */


/* =========================================================
   GLOBAL VARIABLES
   ========================================================= */

let dashboardFarmAlerts = [];
let dashboardAlertsSectionCreated = false;


/* =========================================================
   DATE HELPERS
   ========================================================= */

/*
   Convert YYYY-MM-DD into a LOCAL date.

   Do NOT use:
   new Date("2026-10-01")

   because JavaScript can interpret date-only strings as UTC.

   This function keeps the date in the user's local timezone.
*/
function alertDateOnly(value) {
    if (!value) return null;

    if (value instanceof Date) {
        if (isNaN(value.getTime())) return null;

        return new Date(
            value.getFullYear(),
            value.getMonth(),
            value.getDate()
        );
    }

    const text = String(value).trim();

    // Handle YYYY-MM-DD
    const match = text.match(/^(\d{4})-(\d{2})-(\d{2})/);

    if (match) {
        const year = Number(match[1]);
        const month = Number(match[2]);
        const day = Number(match[3]);

        return new Date(year, month - 1, day);
    }

    // Fallback for timestamp values
    const parsed = new Date(text);

    if (isNaN(parsed.getTime())) {
        return null;
    }

    return new Date(
        parsed.getFullYear(),
        parsed.getMonth(),
        parsed.getDate()
    );
}


/*
   Get today's local date.
*/
function alertToday() {
    const now = new Date();

    return new Date(
        now.getFullYear(),
        now.getMonth(),
        now.getDate()
    );
}


/*
   Add days to a local date.
*/
function alertDaysFromToday(days) {
    const date = alertToday();

    date.setDate(date.getDate() + days);

    return date;
}


/*
   Compare two dates without time.
*/
function alertDateDifference(date1, date2) {
    const first = new Date(
        date1.getFullYear(),
        date1.getMonth(),
        date1.getDate()
    );

    const second = new Date(
        date2.getFullYear(),
        date2.getMonth(),
        date2.getDate()
    );

    const difference =
        first.getTime() - second.getTime();

    return Math.round(
        difference / (1000 * 60 * 60 * 24)
    );
}


/*
   Is date today?
*/
function alertIsToday(date) {
    if (!date) return false;

    return alertDateDifference(
        date,
        alertToday()
    ) === 0;
}


/*
   Is date within the next number of days?

   Includes today.

   Example:
   today = October 1
   days = 7

   Valid:
   October 1
   October 2
   ...
   October 8
*/
function alertIsWithinNextDays(date, days) {
    if (!date) return false;

    const today = alertToday();

    const lastAllowedDate =
        alertDaysFromToday(days);

    const differenceFromToday =
        alertDateDifference(date, today);

    return (
        differenceFromToday >= 0 &&
        differenceFromToday <= days
    );
}


/*
   Is date overdue?
*/
function alertIsOverdue(date) {
    if (!date) return false;

    return alertDateDifference(
        date,
        alertToday()
    ) < 0;
}


/*
   Format date for display.
*/
function formatAlertDate(value) {
    const date = alertDateOnly(value);

    if (!date) {
        return "Date not recorded";
    }

    return date.toLocaleDateString(
        "en-ZM",
        {
            year: "numeric",
            month: "short",
            day: "numeric"
        }
    );
}


/*
   Format time for display.
*/
function formatAlertTime(value) {
    if (!value) {
        return "Time not recorded";
    }

    /*
       PostgreSQL time may look like:
       08:00:00
    */

    const match = String(value).match(
        /^(\d{1,2}):(\d{2})/
    );

    if (!match) {
        return String(value);
    }

    const hour = Number(match[1]);
    const minute = Number(match[2]);

    const tempDate = new Date();

    tempDate.setHours(
        hour,
        minute,
        0,
        0
    );

    return tempDate.toLocaleTimeString(
        "en-ZM",
        {
            hour: "2-digit",
            minute: "2-digit"
        }
    );
}


/* =========================================================
   USER / FARM
   ========================================================= */

function getDashboardAlertUser() {
    try {
        const stored =
            localStorage.getItem("loggedInUser");

        if (!stored) {
            return null;
        }

        return JSON.parse(stored);

    } catch (error) {
        console.error(
            "Could not read loggedInUser:",
            error
        );

        return null;
    }
}


function getDashboardAlertFarmId() {
    const user =
        getDashboardAlertUser();

    if (user && user.farm_id) {
        return Number(user.farm_id);
    }

    if (
        typeof window.dashboardCurrentFarmId !==
        "undefined" &&
        window.dashboardCurrentFarmId
    ) {
        return Number(
            window.dashboardCurrentFarmId
        );
    }

    return null;
}


/* =========================================================
   CREATE ALERT SECTION
   ========================================================= */

function createFarmAlertsSection() {

    if (dashboardAlertsSectionCreated) {
        return;
    }

    const existingSection =
        document.getElementById(
            "farmAlertsSection"
        );

    if (existingSection) {
        dashboardAlertsSectionCreated = true;
        return;
    }

    /*
       Try to place alerts after announcements.
    */
    const announcementsSection =
        document.querySelector(
            ".announcements-section"
        ) ||
        document.querySelector(
            "#announcementsSection"
        ) ||
        document.querySelector(
            "[id*='announcement']"
        );

    const section =
        document.createElement("section");

    section.id =
        "farmAlertsSection";

    section.className =
        "dashboard-section farm-alerts-section";

    section.innerHTML = `
        <div class="section-heading">
            <div>
                <h2>🚨 Farm Alerts</h2>
                <p class="section-description">
                    Important activities and records that require attention.
                </p>
            </div>

            <div class="farm-alert-heading-actions">
                <span
                    id="farmAlertsCount"
                    class="farm-alerts-count"
                >
                    0
                </span>

                <button
                    type="button"
                    id="refreshFarmAlerts"
                    class="farm-refresh-alerts-btn"
                >
                    🔄 Refresh
                </button>
            </div>
        </div>

        <div
            id="farmAlertsStatus"
            class="farm-alerts-status"
        >
            Checking farm records...
        </div>

        <div
            id="farmAlertsContainer"
            class="farm-alerts-container"
        >
            <div class="farm-alert-loading">
                Checking farm records...
            </div>
        </div>
    `;

    /*
       Place after announcements when possible.
    */
    if (
        announcementsSection &&
        announcementsSection.parentNode
    ) {
        announcementsSection.parentNode.insertBefore(
            section,
            announcementsSection.nextSibling
        );
    } else {
        const main =
            document.querySelector("main") ||
            document.body;

        main.appendChild(section);
    }

    dashboardAlertsSectionCreated = true;

    const refreshButton =
        document.getElementById(
            "refreshFarmAlerts"
        );

    if (refreshButton) {
        refreshButton.addEventListener(
            "click",
            loadDashboardFarmAlerts
        );
    }
}


/* =========================================================
   DISPLAY ALERTS
   ========================================================= */

function displayFarmAlerts(alerts) {

    const container =
        document.getElementById(
            "farmAlertsContainer"
        );

    const status =
        document.getElementById(
            "farmAlertsStatus"
        );

    const count =
        document.getElementById(
            "farmAlertsCount"
        );

    if (!container) {
        console.error(
            "farmAlertsContainer not found."
        );
        return;
    }

    if (count) {
        count.textContent = alerts.length;
    }

    if (!alerts.length) {

        if (status) {
            status.textContent =
                "No active alerts at the moment.";
        }

        container.innerHTML = `
            <div class="farm-alert-empty">
                <div class="farm-alert-empty-icon">
                    ✅
                </div>

                <h3>No Active Alerts</h3>

                <p>
                    There are currently no farm activities
                    requiring immediate attention.
                </p>
            </div>
        `;

        return;
    }

    if (status) {
        status.textContent =
            `${alerts.length} alert${alerts.length === 1 ? "" : "s"} require attention.`;
    }

    container.innerHTML =
        alerts.map(
            alert => createFarmAlertCard(alert)
        ).join("");
}


/* =========================================================
   ALERT CARD
   ========================================================= */

function createFarmAlertCard(alert) {

    const priority =
        String(
            alert.priority || "Normal"
        ).toLowerCase();

    return `
        <article
            class="farm-alert-card farm-alert-${priority}"
        >

            <div class="farm-alert-card-top">

                <div class="farm-alert-icon">
                    ${alert.icon || "⚠️"}
                </div>

                <div class="farm-alert-main">

                    <div class="farm-alert-title-row">

                        <h3>
                            ${escapeAlertHTML(
                                alert.title ||
                                "Farm Alert"
                            )}
                        </h3>

                        <span
                            class="farm-alert-priority
                            farm-alert-priority-${priority}"
                        >
                            ${escapeAlertHTML(
                                alert.priority ||
                                "Normal"
                            )}
                        </span>

                    </div>

                    <p class="farm-alert-message">
                        ${escapeAlertHTML(
                            alert.message || ""
                        )}
                    </p>

                    ${
                        alert.details
                            ? `
                                <div class="farm-alert-details">
                                    ${alert.details}
                                </div>
                              `
                            : ""
                    }

                    ${
                        alert.action
                            ? `
                                <div class="farm-alert-action">
                                    <strong>Action:</strong>
                                    ${escapeAlertHTML(
                                        alert.action
                                    )}
                                </div>
                              `
                            : ""
                    }

                </div>

            </div>

        </article>
    `;
}


/* =========================================================
   HTML ESCAPE
   ========================================================= */

function escapeAlertHTML(value) {

    if (
        value === null ||
        value === undefined
    ) {
        return "";
    }

    return String(value)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}


/* =========================================================
   1. WEANING ALERTS
   ========================================================= */

async function loadWeaningAlerts(farmId) {

    const alerts = [];

    try {

        const {
            data,
            error
        } = await supabaseClient
            .from("farrowing_records")
            .select(
                "id,sow_id,weaning_date,status,farm_id"
            )
            .eq("farm_id", farmId)
            .not(
                "weaning_date",
                "is",
                null
            );

        if (error) {
            console.error(
                "WEANING ALERT ERROR:",
                error
            );

            return alerts;
        }

        (data || []).forEach(record => {

            const weaningDate =
                alertDateOnly(
                    record.weaning_date
                );

            if (!weaningDate) {
                return;
            }

            /*
               Only today through next 7 days.
            */
            if (
                !alertIsWithinNextDays(
                    weaningDate,
                    7
                )
            ) {
                return;
            }

            const status =
                String(
                    record.status || ""
                )
                    .toLowerCase()
                    .trim();

            if (
                status === "completed" ||
                status === "weaned" ||
                status === "cancelled" ||
                status === "closed"
            ) {
                return;
            }

            const today =
                alertIsToday(
                    weaningDate
                );

            alerts.push({

                type: "Weaning",

                title:
                    today
                        ? "Weaning is Due Today"
                        : "Upcoming Weaning",

                message:
                    today
                        ? `Sow ${record.sow_id || "Unknown"} is due for weaning today.`
                        : `Sow ${record.sow_id || "Unknown"} has an upcoming weaning date.`,

                details: `
                    <strong>Weaning Date:</strong>
                    ${formatAlertDate(
                        record.weaning_date
                    )}
                    <br>

                    <strong>Sow ID:</strong>
                    ${escapeAlertHTML(
                        record.sow_id ||
                        "Not recorded"
                    )}
                    <br>

                    <strong>Status:</strong>
                    ${escapeAlertHTML(
                        record.status ||
                        "Not recorded"
                    )}
                `,

                action:
                    today
                        ? "Check the litter and complete the weaning procedure."
                        : "Prepare for the upcoming weaning procedure.",

                priority:
                    today
                        ? "Urgent"
                        : "Important",

                icon: "🐷",

                date: weaningDate
            });

        });

    } catch (error) {

        console.error(
            "WEANING ALERT EXCEPTION:",
            error
        );
    }

    return alerts;
}


/* =========================================================
   2. ACTION DAY ALERTS
   ========================================================= */

async function loadActionDayAlerts(farmId) {

    const alerts = [];

    try {

        const {
            data,
            error
        } = await supabaseClient
            .from("gestation_records")
            .select(
                "id,sow_id,action_day,status,farm_id"
            )
            .eq("farm_id", farmId)
            .not(
                "action_day",
                "is",
                null
            );

        if (error) {

            console.error(
                "ACTION DAY ALERT ERROR:",
                error
            );

            return alerts;
        }

        console.log(
            "ACTION DAY RECORDS:",
            data
        );

        (data || []).forEach(record => {

            const actionDate =
                alertDateOnly(
                    record.action_day
                );

            if (!actionDate) {
                return;
            }

            const status =
                String(
                    record.status || ""
                )
                    .toLowerCase()
                    .trim();

            /*
               Do not alert for completed records.
            */
            if (
                status === "completed" ||
                status === "farrowed" ||
                status === "cancelled" ||
                status === "closed"
            ) {
                return;
            }

            const difference =
                alertDateDifference(
                    actionDate,
                    alertToday()
                );

            /*
               =================================================
               OVERDUE
               =================================================
            */

            if (difference < 0) {

                alerts.push({

                    type: "Gestation",

                    title:
                        "Overdue Action Day",

                    message:
                        `Sow ${record.sow_id || "Unknown"} has an overdue Action Day.`,

                    details: `
                        <strong>Action Day:</strong>
                        ${formatAlertDate(
                            record.action_day
                        )}
                        <br>

                        <strong>Sow ID:</strong>
                        ${escapeAlertHTML(
                            record.sow_id ||
                            "Not recorded"
                        )}
                        <br>

                        <strong>Status:</strong>
                        ${escapeAlertHTML(
                            record.status ||
                            "Not recorded"
                        )}
                    `,

                    action:
                        "Review the sow record and complete the required Action Day procedures if still applicable.",

                    priority:
                        "Urgent",

                    icon:
                        "⚠️",

                    date:
                        actionDate

                });

                return;
            }


            /*
               =================================================
               TODAY
               =================================================
            */

            if (difference === 0) {

                alerts.push({

                    type: "Gestation",

                    title:
                        "Action Day is Ready",

                    message:
                        `Sow ${record.sow_id || "Unknown"} is ready for Action Day today.`,

                    details: `
                        <strong>Action Day:</strong>
                        ${formatAlertDate(
                            record.action_day
                        )}
                        <br>

                        <strong>Sow ID:</strong>
                        ${escapeAlertHTML(
                            record.sow_id ||
                            "Not recorded"
                        )}
                        <br>

                        <strong>Status:</strong>
                        ${escapeAlertHTML(
                            record.status ||
                            "Not recorded"
                        )}
                    `,

                    action:
                        "Carry out the required Action Day procedures.",

                    priority:
                        "Urgent",

                    icon:
                        "📅",

                    date:
                        actionDate

                });

                return;
            }


            /*
               =================================================
               NEXT 7 DAYS
               =================================================
            */

            if (
                difference > 0 &&
                difference <= 7
            ) {

                alerts.push({

                    type: "Gestation",

                    title:
                        "Upcoming Action Day",

                    message:
                        `Sow ${record.sow_id || "Unknown"} has an upcoming Action Day.`,

                    details: `
                        <strong>Action Day:</strong>
                        ${formatAlertDate(
                            record.action_day
                        )}
                        <br>

                        <strong>Days Remaining:</strong>
                        ${difference}
                        <br>

                        <strong>Sow ID:</strong>
                        ${escapeAlertHTML(
                            record.sow_id ||
                            "Not recorded"
                        )}
                        <br>

                        <strong>Status:</strong>
                        ${escapeAlertHTML(
                            record.status ||
                            "Not recorded"
                        )}
                    `,

                    action:
                        "Prepare for the Action Day activities.",

                    priority:
                        "Important",

                    icon:
                        "📅",

                    date:
                        actionDate

                });
            }

        });

    } catch (error) {

        console.error(
            "ACTION DAY ALERT EXCEPTION:",
            error
        );
    }

    return alerts;
}


/* =========================================================
   3. NOT SERVICED ALERTS
   ========================================================= */

async function loadNotServicedAlerts(farmId) {

    const alerts = [];

    try {

        const {
            data,
            error
        } = await supabaseClient
            .from("gestation_records")
            .select(
                "id,sow_id,service_date,registration_date,status,farm_id"
            )
            .eq("farm_id", farmId);

        if (error) {

            console.error(
                "NOT SERVICED ALERT ERROR:",
                error
            );

            return alerts;
        }

        (data || []).forEach(record => {

            const serviceDate =
                alertDateOnly(
                    record.service_date
                );

            /*
               Already serviced.
            */
            if (serviceDate) {
                return;
            }

            const registrationDate =
                alertDateOnly(
                    record.registration_date
                );

            if (!registrationDate) {
                return;
            }

            const daysWaiting =
                alertDateDifference(
                    alertToday(),
                    registrationDate
                );

            if (daysWaiting < 1) {
                return;
            }

            const status =
                String(
                    record.status || ""
                )
                    .toLowerCase()
                    .trim();

            if (
                status === "completed" ||
                status === "farrowed" ||
                status === "cancelled" ||
                status === "closed"
            ) {
                return;
            }

            alerts.push({

                type:
                    "Gestation",

                title:
                    daysWaiting >= 3
                        ? "Sow Not Serviced"
                        : "Sow Awaiting Service",

                message:
                    `Sow ${record.sow_id || "Unknown"} has not been serviced.`,

                details: `
                    <strong>Sow ID:</strong>
                    ${escapeAlertHTML(
                        record.sow_id ||
                        "Not recorded"
                    )}
                    <br>

                    <strong>Registration Date:</strong>
                    ${formatAlertDate(
                        record.registration_date
                    )}
                    <br>

                    <strong>Days Waiting:</strong>
                    ${daysWaiting}
                    <br>

                    <strong>Status:</strong>
                    ${escapeAlertHTML(
                        record.status ||
                        "Not recorded"
                    )}
                `,

                action:
                    "Check the sow and record the service date after successful servicing.",

                priority:
                    daysWaiting >= 3
                        ? "Urgent"
                        : "Important",

                icon:
                    "🐖",

                date:
                    registrationDate

            });

        });

    } catch (error) {

        console.error(
            "NOT SERVICED ALERT EXCEPTION:",
            error
        );
    }

    return alerts;
}


/* =========================================================
   4. FEEDING ALERTS
   ========================================================= */

async function loadFeedingAlerts(farmId) {

    const alerts = [];

    try {

        const {
            data,
            error
        } = await supabaseClient
            .from("feeding_records")
            .select(
                "id,feeding_date,pen,feed_type,quantity,morning_feeding_time,evening_feeding_time,farm_id"
            )
            .eq("farm_id", farmId);

        if (error) {

            console.error(
                "FEEDING ALERT ERROR:",
                error
            );

            return alerts;
        }

        const today =
            alertToday();

        (data || []).forEach(record => {

            const feedingDate =
                alertDateOnly(
                    record.feeding_date
                );

            if (!feedingDate) {
                return;
            }

            /*
               Only today's feeding records.
            */
            if (
                alertDateDifference(
                    feedingDate,
                    today
                ) !== 0
            ) {
                return;
            }


            /*
               MORNING FEEDING
            */

            if (
                record.morning_feeding_time
            ) {

                alerts.push({

                    type:
                        "Feeding",

                    title:
                        "Morning Feeding",

                    message:
                        `Morning feeding is scheduled for ${record.pen || "the pen"}.`,

                    details: `
                        <strong>Pen:</strong>
                        ${escapeAlertHTML(
                            record.pen ||
                            "Not recorded"
                        )}
                        <br>

                        <strong>Feed:</strong>
                        ${escapeAlertHTML(
                            record.feed_type ||
                            "Not recorded"
                        )}
                        <br>

                        <strong>Quantity:</strong>
                        ${escapeAlertHTML(
                            record.quantity ||
                            "Not recorded"
                        )}
                        <br>

                        <strong>Time:</strong>
                        ${formatAlertTime(
                            record.morning_feeding_time
                        )}
                    `,

                    action:
                        "Check the feed and complete the morning feeding as scheduled.",

                    priority:
                        "Important",

                    icon:
                        "🌅",

                    date:
                        feedingDate

                });
            }


            /*
               EVENING FEEDING
            */

            if (
                record.evening_feeding_time
            ) {

                alerts.push({

                    type:
                        "Feeding",

                    title:
                        "Evening Feeding",

                    message:
                        `Evening feeding is scheduled for ${record.pen || "the pen"}.`,

                    details: `
                        <strong>Pen:</strong>
                        ${escapeAlertHTML(
                            record.pen ||
                            "Not recorded"
                        )}
                        <br>

                        <strong>Feed:</strong>
                        ${escapeAlertHTML(
                            record.feed_type ||
                            "Not recorded"
                        )}
                        <br>

                        <strong>Quantity:</strong>
                        ${escapeAlertHTML(
                            record.quantity ||
                            "Not recorded"
                        )}
                        <br>

                        <strong>Time:</strong>
                        ${formatAlertTime(
                            record.evening_feeding_time
                        )}
                    `,

                    action:
                        "Check the feed and complete the evening feeding as scheduled.",

                    priority:
                        "Important",

                    icon:
                        "🌙",

                    date:
                        feedingDate

                });
            }

        });

    } catch (error) {

        console.error(
            "FEEDING ALERT EXCEPTION:",
            error
        );
    }

    return alerts;
}


/* =========================================================
   5. WATER ALERTS
   ========================================================= */

async function loadWaterAlerts(farmId) {

    const alerts = [];

    try {

        const {
            data,
            error
        } = await supabaseClient
            .from("feeding_records")
            .select(
                "id,feeding_date,pen,water_available,farm_id"
            )
            .eq("farm_id", farmId);

        if (error) {

            console.error(
                "WATER ALERT ERROR:",
                error
            );

            return alerts;
        }

        const today =
            alertToday();

        (data || []).forEach(record => {

            const feedingDate =
                alertDateOnly(
                    record.feeding_date
                );

            if (!feedingDate) {
                return;
            }

            if (
                alertDateDifference(
                    feedingDate,
                    today
                ) !== 0
            ) {
                return;
            }

            const waterStatus =
                String(
                    record.water_available ||
                    ""
                )
                    .toLowerCase()
                    .trim();

            if (
                waterStatus === "yes"
            ) {
                return;
            }

            alerts.push({

                type:
                    "Water",

                title:
                    "Water Availability Check",

                message:
                    `Water availability has not been confirmed for ${record.pen || "the pen"}.`,

                details: `
                    <strong>Pen:</strong>
                    ${escapeAlertHTML(
                        record.pen ||
                        "Not recorded"
                    )}
                    <br>

                    <strong>Water Available:</strong>
                    ${escapeAlertHTML(
                        record.water_available ||
                        "Not recorded"
                    )}
                `,

                action:
                    "Check the drinking water supply and ensure clean water is available.",

                priority:
                    "Urgent",

                icon:
                    "💧",

                date:
                    feedingDate

            });

        });

    } catch (error) {

        console.error(
            "WATER ALERT EXCEPTION:",
            error
        );
    }

    return alerts;
}


/* =========================================================
   SORT ALERTS
   ========================================================= */

function sortDashboardAlerts(alerts) {

    const priorityOrder = {
        Urgent: 1,
        Important: 2,
        Normal: 3
    };

    return alerts.sort(
        (a, b) => {

            const priorityDifference =
                (
                    priorityOrder[
                        a.priority
                    ] || 3
                ) -
                (
                    priorityOrder[
                        b.priority
                    ] || 3
                );

            if (
                priorityDifference !== 0
            ) {
                return priorityDifference;
            }

            const dateA =
                a.date instanceof Date
                    ? a.date.getTime()
                    : Number.MAX_SAFE_INTEGER;

            const dateB =
                b.date instanceof Date
                    ? b.date.getTime()
                    : Number.MAX_SAFE_INTEGER;

            return dateA - dateB;
        }
    );
}


/* =========================================================
   LOAD ALL FARM ALERTS
   ========================================================= */

async function loadDashboardFarmAlerts() {

    console.log(
        "===================================="
    );

    console.log(
        "LOADING FARM ALERTS..."
    );

    console.log(
        "===================================="
    );


    createFarmAlertsSection();


    const container =
        document.getElementById(
            "farmAlertsContainer"
        );

    const status =
        document.getElementById(
            "farmAlertsStatus"
        );

    if (container) {

        container.innerHTML = `
            <div class="farm-alert-loading">
                🔄 Checking farm records...
            </div>
        `;
    }

    if (status) {

        status.textContent =
            "Checking farm records...";
    }


    const farmId =
        getDashboardAlertFarmId();

    console.log(
        "Dashboard Alert Farm ID:",
        farmId
    );


    if (!farmId) {

        console.error(
            "NO FARM ID FOUND FOR ALERTS."
        );

        if (status) {

            status.textContent =
                "Farm information could not be identified.";
        }

        if (container) {

            container.innerHTML = `
                <div class="farm-alert-error">
                    <h3>⚠️ Farm Information Missing</h3>

                    <p>
                        The system could not identify
                        the farm connected to this account.
                    </p>
                </div>
            `;
        }

        return;
    }


    /*
       Check that the correct Supabase client exists.
    */

    if (
        typeof supabaseClient ===
        "undefined"
    ) {

        console.error(
            "supabaseClient is not available."
        );

        if (status) {

            status.textContent =
                "Supabase connection is not available.";
        }

        if (container) {

            container.innerHTML = `
                <div class="farm-alert-error">

                    <h3>
                        ⚠️ Connection Error
                    </h3>

                    <p>
                        The farm alert system could not
                        connect to the database.
                    </p>

                </div>
            `;
        }

        return;
    }


    try {

        const results =
            await Promise.all([

                loadWeaningAlerts(
                    farmId
                ),

                loadActionDayAlerts(
                    farmId
                ),

                loadNotServicedAlerts(
                    farmId
                ),

                loadFeedingAlerts(
                    farmId
                ),

                loadWaterAlerts(
                    farmId
                )

            ]);


        dashboardFarmAlerts =
            results.flat();


        dashboardFarmAlerts =
            sortDashboardAlerts(
                dashboardFarmAlerts
            );


        console.log(
            "ALL FARM ALERTS:",
            dashboardFarmAlerts
        );


        displayFarmAlerts(
            dashboardFarmAlerts
        );


    } catch (error) {

        console.error(
            "FARM ALERT SYSTEM ERROR:",
            error
        );


        if (status) {

            status.textContent =
                "Farm alerts could not be loaded.";
        }


        if (container) {

            container.innerHTML = `
                <div class="farm-alert-error">

                    <h3>
                        ⚠️ Alerts Could Not Be Loaded
                    </h3>

                    <p>
                        An error occurred while checking
                        farm records.
                    </p>

                    <p>
                        Please refresh the page and try again.
                    </p>

                </div>
            `;
        }
    }
}


/* =========================================================
   INITIALIZATION
   ========================================================= */

function initializeDashboardFarmAlerts() {

    console.log(
        "Initializing MUNKA PIGGERY Farm Alerts..."
    );


    createFarmAlertsSection();


    /*
       Give dashboard.js time to load the user/farm.
    */

    setTimeout(
        () => {

            loadDashboardFarmAlerts();

        },
        700
    );
}


/*
   DOM READY
*/

if (
    document.readyState ===
    "loading"
) {

    document.addEventListener(
        "DOMContentLoaded",
        initializeDashboardFarmAlerts
    );

} else {

    initializeDashboardFarmAlerts();
}