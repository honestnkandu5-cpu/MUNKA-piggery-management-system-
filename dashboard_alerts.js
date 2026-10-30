
/* ============================================================
   MUNKA PIGGERY MANAGEMENT SYSTEM
   COMPLETE FARM DASHBOARD ALERTS - UPDATED VERSION
   ============================================================

   EXISTING ALERTS PRESERVED:
   1. Gestation - 21-day check
   2. Gestation - 90-day feed-up
   3. Gestation - 101-day dewormer
   4. Gestation - 101-day litter guard
   5. Gestation - action day
   6. Gestation - expected farrowing
   7. Farrowing - iron, teeth and tail
   8. Weaning
   9. Not serviced
   10. Feeding
   11. Water

   NEW ALERTS:
   12. Pig registration irregularities
   13. Duplicate pig identification
   14. Pig mortality
   15. Farrowing mortality
   16. Weaning mortality
   17. Vaccination and treatment dates
   18. Monthly sales
   19. Monthly expenses
   20. Profit and loss
   21. Farm performance analytics

   IMPORTANT:
   - Uses supabaseClient
   - Uses loggedInUser from localStorage
   - Uses local browser dates
   - Farm-scoped database queries
   - Preserves persistent alert dismissals
   - Does not delete farm records
   ============================================================ */


/* ============================================================
   GLOBAL VARIABLES
   ============================================================ */

let dashboardFarmAlerts = [];
let dashboardAlertsSectionCreated = false;
let dashboardDismissedAlertKeys = new Set();


/* ============================================================
   DATE HELPERS
   ============================================================ */

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

    const match = text.match(
        /^(\d{4})-(\d{2})-(\d{2})/
    );

    if (match) {

        return new Date(
            Number(match[1]),
            Number(match[2]) - 1,
            Number(match[3])
        );
    }

    const parsed = new Date(text);

    if (isNaN(parsed.getTime())) return null;

    return new Date(
        parsed.getFullYear(),
        parsed.getMonth(),
        parsed.getDate()
    );
}


function alertToday() {

    const now = new Date();

    return new Date(
        now.getFullYear(),
        now.getMonth(),
        now.getDate()
    );
}


function alertDateDifference(date1, date2) {

    const first = alertDateOnly(date1);
    const second = alertDateOnly(date2);

    if (!first || !second) return 0;

    return Math.round(
        (first.getTime() - second.getTime()) /
        86400000
    );
}


function addDaysToDate(date, days) {

    const result = alertDateOnly(date);

    if (!result) return null;

    result.setDate(result.getDate() + Number(days));

    return result;
}


function formatAlertDate(value) {

    const date = alertDateOnly(value);

    if (!date) return "Date not recorded";

    return date.toLocaleDateString(
        "en-ZM",
        {
            year: "numeric",
            month: "short",
            day: "numeric"
        }
    );
}


function formatAlertTime(value) {

    if (!value) return "Time not recorded";

    const match = String(value).match(
        /^(\d{1,2}):(\d{2})/
    );

    if (!match) return String(value);

    const date = new Date();

    date.setHours(
        Number(match[1]),
        Number(match[2]),
        0,
        0
    );

    return date.toLocaleTimeString(
        "en-ZM",
        {
            hour: "2-digit",
            minute: "2-digit"
        }
    );
}


function getAlertMonthStart() {

    const today = alertToday();

    return new Date(
        today.getFullYear(),
        today.getMonth(),
        1
    );
}


function getAlertMonthEnd() {

    const today = alertToday();

    return new Date(
        today.getFullYear(),
        today.getMonth() + 1,
        0
    );
}


function isAlertInCurrentMonth(value) {

    const date = alertDateOnly(value);

    if (!date) return false;

    const start = getAlertMonthStart();
    const end = getAlertMonthEnd();

    return date >= start && date <= end;
}


function formatAlertMoney(value) {

    const amount = Number(value) || 0;

    return "K" + amount.toLocaleString(
        "en-ZM",
        {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        }
    );
}


/* ============================================================
   HTML SECURITY
   ============================================================ */

function escapeAlertHTML(value) {

    if (value === null || value === undefined) {
        return "";
    }

    return String(value)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}


/* ============================================================
   USER / FARM
   ============================================================ */

function getDashboardAlertUser() {

    try {

        const stored = localStorage.getItem(
            "loggedInUser"
        );

        return stored ? JSON.parse(stored) : null;

    } catch (error) {

        console.error(
            "Could not read loggedInUser:",
            error
        );

        return null;
    }
}


function getDashboardAlertFarmId() {

    const user = getDashboardAlertUser();

    if (user && user.farm_id) {
        return Number(user.farm_id);
    }

    if (
        typeof window.dashboardCurrentFarmId !== "undefined" &&
        window.dashboardCurrentFarmId
    ) {
        return Number(window.dashboardCurrentFarmId);
    }

    return null;
}


function dashboardUserCanDismissAlerts() {

    const user = getDashboardAlertUser();

    if (!user) return false;

    return (
        String(user.role || "").trim() === "Owner/Admin" &&
        String(user.status || "").trim() === "Active"
    );
}


/* ============================================================
   UNIQUE ALERT KEYS
   ============================================================ */

function createFarmAlertKey(alert) {

    const type = String(
        alert.type || "General"
    ).trim();

    const title = String(
        alert.title || "Farm Alert"
    ).trim();

    let datePart = "";

    if (alert.date) {

        const date = alertDateOnly(alert.date);

        if (date) {

            datePart =
                `${date.getFullYear()}-${String(
                    date.getMonth() + 1
                ).padStart(2, "0")}-${String(
                    date.getDate()
                ).padStart(2, "0")}`;
        }
    }

    const sourceId =
        alert.source_id ||
        alert.record_id ||
        alert.sow_id ||
        "";

    return [
        type,
        title,
        sourceId,
        datePart
    ]
        .map(value =>
            String(value)
                .trim()
                .replace(/\s+/g, "_")
        )
        .join("|");
}


/* ============================================================
   LOAD DISMISSED ALERTS
   ============================================================ */

async function loadDismissedFarmAlerts(farmId) {

    dashboardDismissedAlertKeys = new Set();

    if (!farmId) return;

    try {

        const { data, error } = await supabaseClient
            .from("dismissed_farm_alerts")
            .select(
                "id,farm_id,alert_key,dismissed_by,dismissed_at"
            )
            .eq("farm_id", farmId);

        if (error) {

            console.error(
                "DISMISSED ALERTS LOAD ERROR:",
                error
            );

            return;
        }

        (data || []).forEach(record => {

            if (record.alert_key) {

                dashboardDismissedAlertKeys.add(
                    String(record.alert_key)
                );
            }
        });

    } catch (error) {

        console.error(
            "DISMISSED ALERTS EXCEPTION:",
            error
        );
    }
}


function filterDismissedFarmAlerts(alerts) {

    return alerts.filter(alert => {

        const key =
            alert.alert_key ||
            createFarmAlertKey(alert);

        alert.alert_key = key;

        return !dashboardDismissedAlertKeys.has(key);
    });
}


/* ============================================================
   DISMISS ALERT
   ============================================================ */

async function dismissFarmAlert(alertKey) {

    if (!alertKey) return;

    if (!dashboardUserCanDismissAlerts()) {

        alert(
            "Only an active Owner/Admin can dismiss farm alerts."
        );

        return;
    }

    const user = getDashboardAlertUser();
    const farmId = getDashboardAlertFarmId();

    if (!user || !farmId) {

        alert(
            "Your farm or user session could not be identified."
        );

        return;
    }

    if (typeof supabaseClient === "undefined") {

        alert("Database connection is not available.");

        return;
    }

    let button = null;

    try {

        button = Array.from(
            document.querySelectorAll(
                "[data-dismiss-alert]"
            )
        ).find(element =>
            element.getAttribute("data-dismiss-alert") ===
            String(alertKey)
        );

        if (button) {

            button.disabled = true;
            button.innerHTML = "⏳ Dismissing...";
        }

        const { error } = await supabaseClient
            .from("dismissed_farm_alerts")
            .insert({

                farm_id: Number(farmId),

                alert_key: String(alertKey),

                dismissed_by: user.id
                    ? Number(user.id)
                    : null
            });

        if (error) {

            const message = String(
                error.message || ""
            ).toLowerCase();

            if (
                !message.includes("duplicate") &&
                !message.includes("unique")
            ) {

                console.error(
                    "DISMISS ALERT ERROR:",
                    error
                );

                if (button) {

                    button.disabled = false;
                    button.innerHTML = "🗑️ Dismiss Alert";
                }

                alert(
                    "The alert could not be dismissed. Please try again."
                );

                return;
            }
        }

        dashboardDismissedAlertKeys.add(
            String(alertKey)
        );

        dashboardFarmAlerts =
            dashboardFarmAlerts.filter(alert => {

                const key =
                    alert.alert_key ||
                    createFarmAlertKey(alert);

                return key !== String(alertKey);
            });

        displayFarmAlerts(dashboardFarmAlerts);

    } catch (error) {

        console.error(
            "DISMISS ALERT EXCEPTION:",
            error
        );

        if (button) {

            button.disabled = false;
            button.innerHTML = "🗑️ Dismiss Alert";
        }

        alert(
            "An unexpected error occurred while dismissing the alert."
        );
    }
}


window.dismissFarmAlert = dismissFarmAlert;


/* ============================================================
   CREATE FARM ALERT SECTION
   ============================================================ */

function createFarmAlertsSection() {

    if (dashboardAlertsSectionCreated) return;

    const existing = document.getElementById(
        "farmAlertsSection"
    );

    if (existing) {

        dashboardAlertsSectionCreated = true;

        return;
    }

    const announcementsSection =
        document.querySelector(".announcements-section") ||
        document.querySelector("#announcementsSection");

    const section = document.createElement("section");

    section.id = "farmAlertsSection";

    section.className =
        "dashboard-section farm-alerts-section";

    section.innerHTML = `

        <div class="section-heading">

            <div>

                <h2>🚨 Farm Alerts</h2>

                <p class="section-description">
                    Important farm activities requiring attention.
                </p>

            </div>

            <div class="farm-alert-heading-actions">

                <span
                    id="farmAlertsCount"
                    class="farm-alerts-count"
                >0</span>

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

    const refreshButton = document.getElementById(
        "refreshFarmAlerts"
    );

    if (refreshButton) {

        refreshButton.addEventListener(
            "click",
            loadDashboardFarmAlerts
        );
    }
}


/* ============================================================
   DISPLAY ALERTS
   ============================================================ */

function displayFarmAlerts(alerts) {

    const container = document.getElementById(
        "farmAlertsContainer"
    );

    const status = document.getElementById(
        "farmAlertsStatus"
    );

    const count = document.getElementById(
        "farmAlertsCount"
    );

    if (!container) return;

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
                    requiring attention.
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
        alerts.map(createFarmAlertCard).join("");
}


/* ============================================================
   ALERT CARD
   ============================================================ */

function createFarmAlertCard(alert) {

    const priority = String(
        alert.priority || "Normal"
    ).toLowerCase();

    const alertKey =
        alert.alert_key ||
        createFarmAlertKey(alert);

    alert.alert_key = alertKey;

    const canDismiss =
        dashboardUserCanDismissAlerts();

    const dismissButton = canDismiss
        ? `
            <button
                type="button"
                class="farm-alert-dismiss-btn"
                data-dismiss-alert="${escapeAlertHTML(alertKey)}"
                onclick="dismissFarmAlert(this.getAttribute('data-dismiss-alert'))"
                title="Dismiss this alert"
            >
                🗑️ Dismiss Alert
            </button>
          `
        : "";

    return `

        <article
            class="farm-alert-card farm-alert-${priority}"
            data-alert-key="${escapeAlertHTML(alertKey)}"
        >

            <div class="farm-alert-card-top">

                <div class="farm-alert-icon">
                    ${escapeAlertHTML(alert.icon || "⚠️")}
                </div>

                <div class="farm-alert-main">

                    <div class="farm-alert-title-row">

                        <h3>
                            ${escapeAlertHTML(
                                alert.title || "Farm Alert"
                            )}
                        </h3>

                        <span
                            class="
                                farm-alert-priority
                                farm-alert-priority-${priority}
                            "
                        >
                            ${escapeAlertHTML(
                                alert.priority || "Normal"
                            )}
                        </span>

                    </div>

                    <p class="farm-alert-message">
                        ${escapeAlertHTML(alert.message || "")}
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
                                    ${escapeAlertHTML(alert.action)}
                                </div>
                              `
                            : ""
                    }

                    ${dismissButton}

                </div>

            </div>

        </article>
    `;
}


/* ============================================================
   COMMON ALERT CREATOR
   ============================================================ */

function createScheduledAlert(options) {

    const difference = options.difference;

    let title = options.title;
    let message = options.message;
    let priority = "Important";

    if (difference < 0) {

        title = "Overdue " + options.title;

        message =
            options.subject +
            " has an overdue " +
            options.activity +
            " activity.";

        priority = "Urgent";

    } else if (difference === 0) {

        title = options.title + " Due Today";

        message =
            options.subject +
            " is due for " +
            options.activity +
            " today.";

        priority = "Urgent";

    } else {

        title = "Upcoming " + options.title;

        message =
            options.subject +
            " has an upcoming " +
            options.activity +
            " activity.";
    }

    return {

        type: options.type,

        title,

        message,

        details: `

            <strong>Identification:</strong>
            ${escapeAlertHTML(options.subject)}

            <br>

            <strong>Scheduled Date:</strong>
            ${formatAlertDate(options.date)}

            <br>

            <strong>${difference < 0 ? "Days Overdue" : "Days Remaining"}:</strong>
            ${Math.abs(difference)}

        `,

        action: options.action,

        priority,

        icon: options.icon,

        date: options.date,

        source_id: options.sourceId
    };
}


/* ============================================================
   GESTATION STATUS
   ============================================================ */

function gestationStatusIsClosed(status) {

    const value = String(
        status || ""
    ).toLowerCase().trim();

    return [
        "completed",
        "farrowed",
        "cancelled",
        "closed"
    ].includes(value);
}


/* ============================================================
   GESTATION - COMMON LOADER
   ============================================================ */

async function loadGestationScheduleAlerts(
    farmId,
    days,
    title,
    activity,
    icon,
    action
) {

    const alerts = [];

    try {

        const { data, error } = await supabaseClient
            .from("gestation_records")
            .select(
                "id,sow_id,service_date,status,farm_id"
            )
            .eq("farm_id", farmId)
            .not("service_date", "is", null);

        if (error) {

            console.error(
                title + " ERROR:",
                error
            );

            return alerts;
        }

        (data || []).forEach(record => {

            if (gestationStatusIsClosed(record.status)) {
                return;
            }

            const serviceDate =
                alertDateOnly(record.service_date);

            if (!serviceDate) return;

            const scheduledDate =
                addDaysToDate(serviceDate, days);

            const difference =
                alertDateDifference(
                    scheduledDate,
                    alertToday()
                );

            if (difference < 0 || difference > 7) {

                if (difference >= -365) {

                    if (difference < 0) {

                        alerts.push(
                            createScheduledAlert({

                                type: "Gestation",
                                title,
                                activity,
                                subject: "Sow " + (
                                    record.sow_id || "Unknown"
                                ),
                                date: scheduledDate,
                                difference,
                                icon,
                                action,
                                sourceId: record.id
                            })
                        );
                    }
                }

                return;
            }

            alerts.push(
                createScheduledAlert({

                    type: "Gestation",
                    title,
                    activity,
                    subject: "Sow " + (
                        record.sow_id || "Unknown"
                    ),
                    date: scheduledDate,
                    difference,
                    icon,
                    action,
                    sourceId: record.id
                })
            );
        });

    } catch (error) {

        console.error(
            title + " EXCEPTION:",
            error
        );
    }

    return alerts;
}


/* ============================================================
   GESTATION - 21 DAY CHECK
   ============================================================ */

async function load21DayCheckAlerts(farmId) {

    return loadGestationScheduleAlerts(
        farmId,
        21,
        "21-Day Check",
        "21-day pregnancy check",
        "🔎",
        "Check the sow and complete the pregnancy check."
    );
}


/* ============================================================
   GESTATION - 90 DAY FEED UP
   ============================================================ */

async function load90DayFeedUpAlerts(farmId) {

    return loadGestationScheduleAlerts(
        farmId,
        90,
        "90-Day Feed Up",
        "90-day feed-up",
        "🌾",
        "Review the sow's feeding programme and complete the planned activity."
    );
}


/* ============================================================
   GESTATION - 101 DAY DEWORMER
   ============================================================ */

async function load101DayDewormerAlerts(farmId) {

    return loadGestationScheduleAlerts(
        farmId,
        101,
        "101-Day Dewormer",
        "deworming",
        "💊",
        "Follow the farm veterinary programme for the required procedure."
    );
}


/* ============================================================
   GESTATION - 101 DAY LITTER GUARD
   ============================================================ */

async function load101DayLitterGuardAlerts(farmId) {

    return loadGestationScheduleAlerts(
        farmId,
        101,
        "101-Day Litter Guard",
        "Litter Guard",
        "🛡️",
        "Review the sow record and follow the planned farm programme."
    );
}


/* ============================================================
   GESTATION - ACTION DAY
   ============================================================ */

async function loadActionDayAlerts(farmId) {

    const alerts = [];

    try {

        const { data, error } = await supabaseClient
            .from("gestation_records")
            .select(
                "id,sow_id,action_day,status,farm_id"
            )
            .eq("farm_id", farmId)
            .not("action_day", "is", null);

        if (error) {

            console.error("ACTION DAY ERROR:", error);

            return alerts;
        }

        (data || []).forEach(record => {

            if (gestationStatusIsClosed(record.status)) {
                return;
            }

            const date = alertDateOnly(record.action_day);

            if (!date) return;

            const difference =
                alertDateDifference(date, alertToday());

            if (difference < -7 || difference > 7) return;

            alerts.push(
                createScheduledAlert({

                    type: "Gestation",
                    title: "Action Day",
                    activity: "Action Day",
                    subject: "Sow " + (
                        record.sow_id || "Unknown"
                    ),
                    date,
                    difference,
                    icon: "📅",
                    action:
                        "Carry out the required Action Day procedures.",
                    sourceId: record.id
                })
            );
        });

    } catch (error) {

        console.error("ACTION DAY EXCEPTION:", error);
    }

    return alerts;
}


/* ============================================================
   GESTATION - EXPECTED FARROWING
   ============================================================ */

async function load114DayAlerts(farmId) {

    const alerts = [];

    try {

        const { data, error } = await supabaseClient
            .from("gestation_records")
            .select(
                "id,sow_id,service_date,delivery_date,status,farm_id"
            )
            .eq("farm_id", farmId)
            .not("service_date", "is", null);

        if (error) {

            console.error(
                "114-DAY ALERT ERROR:",
                error
            );

            return alerts;
        }

        (data || []).forEach(record => {

            if (gestationStatusIsClosed(record.status)) {
                return;
            }

            const serviceDate =
                alertDateOnly(record.service_date);

            if (!serviceDate) return;

            const expectedDate =
                alertDateOnly(record.delivery_date) ||
                addDaysToDate(serviceDate, 114);

            if (!expectedDate) return;

            const difference =
                alertDateDifference(
                    expectedDate,
                    alertToday()
                );

            if (difference < 0 || difference > 7) return;

            alerts.push({

                type: "Gestation",

                title: difference === 0
                    ? "Expected Farrowing is Today"
                    : "Upcoming Expected Farrowing",

                message: difference === 0
                    ? `Sow ${record.sow_id || "Unknown"} is expected to farrow today.`
                    : `Sow ${record.sow_id || "Unknown"} is expected to farrow soon.`,

                details: `

                    <strong>Sow ID:</strong>
                    ${escapeAlertHTML(record.sow_id || "Not recorded")}

                    <br>

                    <strong>Expected Farrowing:</strong>
                    ${formatAlertDate(expectedDate)}

                    <br>

                    <strong>Days Remaining:</strong>
                    ${difference}

                `,

                action:
                    "Prepare the farrowing area and monitor the sow closely.",

                priority: difference === 0
                    ? "Urgent"
                    : "Important",

                icon: "🐷",

                date: expectedDate,

                source_id: record.id
            });
        });

    } catch (error) {

        console.error(
            "114-DAY ALERT EXCEPTION:",
            error
        );
    }

    return alerts;
}


/* ============================================================
   FARROWING - IRON / TEETH / TAIL
   ============================================================ */

async function loadFarrowingDay3Alerts(farmId) {

    const alerts = [];

    const activities = [

        {
            field: "iron_date",
            name: "Iron Injection",
            icon: "🩸"
        },

        {
            field: "teeth_date",
            name: "Teeth Clipping",
            icon: "🦷"
        },

        {
            field: "tail_date",
            name: "Tail Docking",
            icon: "✂️"
        }

    ];

    try {

        const { data, error } = await supabaseClient
            .from("farrowing_records")
            .select(`
                id,
                sow_id,
                farrow_date,
                teeth_date,
                tail_date,
                iron_date,
                farm_id
            `)
            .eq("farm_id", farmId);

        if (error) {

            console.error(
                "FARROWING ALERT ERROR:",
                error
            );

            return alerts;
        }

        (data || []).forEach(record => {

            activities.forEach(activity => {

                const scheduledDate =
                    alertDateOnly(record[activity.field]);

                if (!scheduledDate) return;

                const difference =
                    alertDateDifference(
                        scheduledDate,
                        alertToday()
                    );

                if (
                    difference < -7 ||
                    difference > 7
                ) {
                    return;
                }

                alerts.push({

                    type: "Farrowing",

                    title:
                        difference < 0
                            ? "Overdue " + activity.name
                            : difference === 0
                                ? activity.name + " Due Today"
                                : "Upcoming " + activity.name,

                    message:
                        difference < 0
                            ? `Sow ${record.sow_id || "Unknown"} has an overdue ${activity.name.toLowerCase()} activity.`
                            : difference === 0
                                ? `Sow ${record.sow_id || "Unknown"} has ${activity.name.toLowerCase()} scheduled today.`
                                : `Sow ${record.sow_id || "Unknown"} has ${activity.name.toLowerCase()} coming up.`,

                    details: `

                        <strong>Sow ID:</strong>
                        ${escapeAlertHTML(record.sow_id || "Not recorded")}

                        <br>

                        <strong>Scheduled Date:</strong>
                        ${formatAlertDate(scheduledDate)}

                        <br>

                        <strong>${difference < 0 ? "Days Overdue" : "Days Remaining"}:</strong>
                        ${Math.abs(difference)}

                    `,

                    action:
                        "Review the farrowing record and follow the farm veterinary programme.",

                    priority:
                        difference <= 0
                            ? "Urgent"
                            : "Important",

                    icon: activity.icon,

                    date: scheduledDate,

                    source_id:
                        record.id + "-" + activity.field
                });
            });
        });

    } catch (error) {

        console.error(
            "FARROWING ALERT EXCEPTION:",
            error
        );
    }

    return alerts;
}


/* ============================================================
   WEANING ALERTS
   ============================================================ */

async function loadWeaningAlerts(farmId) {

    const alerts = [];

    try {

        const { data, error } = await supabaseClient
            .from("weaning_records")
            .select(`
                id,
                sow_id,
                weaning_date,
                total_weaned,
                farm_id
            `)
            .eq("farm_id", farmId)
            .not("weaning_date", "is", null);

        if (error) {

            console.error(
                "WEANING ERROR:",
                error
            );

            return alerts;
        }

        (data || []).forEach(record => {

            const date =
                alertDateOnly(record.weaning_date);

            if (!date) return;

            const difference =
                alertDateDifference(date, alertToday());

            if (difference < -7 || difference > 7) return;

            alerts.push({

                type: "Weaning",

                title:
                    difference < 0
                        ? "Overdue Weaning"
                        : difference === 0
                            ? "Weaning Due Today"
                            : "Upcoming Weaning",

                message:
                    difference < 0
                        ? `Sow ${record.sow_id || "Unknown"} has an overdue weaning activity.`
                        : difference === 0
                            ? `Sow ${record.sow_id || "Unknown"} has a litter scheduled for weaning today.`
                            : `Sow ${record.sow_id || "Unknown"} has a litter scheduled for weaning.`,

                details: `

                    <strong>Sow ID:</strong>
                    ${escapeAlertHTML(record.sow_id || "Not recorded")}

                    <br>

                    <strong>Weaning Date:</strong>
                    ${formatAlertDate(date)}

                    <br>

                    <strong>Total Weaned:</strong>
                    ${escapeAlertHTML(record.total_weaned ?? "Not recorded")}

                `,

                action:
                    "Review the weaning record and update it after the weaning activity is completed.",

                priority:
                    difference <= 0
                        ? "Urgent"
                        : "Important",

                icon: "🍼",

                date,

                source_id: record.id
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


/* ============================================================
   NOT SERVICED ALERTS
   ============================================================ */

async function loadNotServicedAlerts(farmId) {

    const alerts = [];

    try {

        const { data, error } = await supabaseClient
            .from("gestation_records")
            .select(
                "id,sow_id,service_date,registration_date,status,farm_id"
            )
            .eq("farm_id", farmId);

        if (error) {

            console.error(
                "NOT SERVICED ERROR:",
                error
            );

            return alerts;
        }

        (data || []).forEach(record => {

            if (record.service_date) return;

            if (gestationStatusIsClosed(record.status)) {
                return;
            }

            const registrationDate =
                alertDateOnly(record.registration_date);

            if (!registrationDate) return;

            const daysWaiting =
                alertDateDifference(
                    alertToday(),
                    registrationDate
                );

            if (daysWaiting < 1) return;

            alerts.push({

                type: "Gestation",

                title:
                    daysWaiting >= 3
                        ? "Sow Not Serviced"
                        : "Sow Awaiting Service",

                message:
                    `Sow ${record.sow_id || "Unknown"} has not been serviced.`,

                details: `

                    <strong>Sow ID:</strong>
                    ${escapeAlertHTML(record.sow_id || "Not recorded")}

                    <br>

                    <strong>Registration Date:</strong>
                    ${formatAlertDate(registrationDate)}

                    <br>

                    <strong>Days Waiting:</strong>
                    ${daysWaiting}

                `,

                action:
                    "Check the sow and record the service date after successful servicing.",

                priority:
                    daysWaiting >= 3
                        ? "Urgent"
                        : "Important",

                icon: "🐖",

                date: registrationDate,

                source_id: record.id
            });
        });

    } catch (error) {

        console.error(
            "NOT SERVICED EXCEPTION:",
            error
        );
    }

    return alerts;
}


/* ============================================================
   FEEDING ALERTS
   ============================================================ */

async function loadFeedingAlerts(farmId) {

    const alerts = [];

    try {

        const { data, error } = await supabaseClient
            .from("feeding_records")
            .select(
                "id,record_id,feeding_date,pen_number,pig_category,breed,feed_type,feed_brand,quantity,morning_feeding,evening_feeding,farm_id"
            )
            .eq("farm_id", farmId);

        if (error) {

            console.error("FEEDING ERROR:", error);

            return alerts;
        }

        (data || []).forEach(record => {

            const date = alertDateOnly(record.feeding_date);

            if (!date) return;

            if (
                alertDateDifference(date, alertToday()) !== 0
            ) {
                return;
            }

            ["morning_feeding", "evening_feeding"].forEach(
                field => {

                    if (!record[field]) return;

                    const morning =
                        field === "morning_feeding";

                    alerts.push({

                        type: "Feeding",

                        title: morning
                            ? "Morning Feeding"
                            : "Evening Feeding",

                        message:
                            `${morning ? "Morning" : "Evening"} feeding is scheduled for ${record.pen_number || "the pen"}.`,

                        details: `

                            <strong>Pen:</strong>
                            ${escapeAlertHTML(record.pen_number || "Not recorded")}

                            <br>

                            <strong>Feed:</strong>
                            ${escapeAlertHTML(record.feed_type || "Not recorded")}

                            <br>

                            <strong>Feed Brand:</strong>
                            ${escapeAlertHTML(record.feed_brand || "Not recorded")}

                            <br>

                            <strong>Quantity:</strong>
                            ${escapeAlertHTML(record.quantity ?? "Not recorded")}

                            <br>

                            <strong>Time:</strong>
                            ${formatAlertTime(record[field])}

                        `,

                        action:
                            "Check the feed and complete the scheduled feeding.",

                        priority: "Important",

                        icon: morning ? "🌅" : "🌙",

                        date,

                        source_id: record.id + "-" + field
                    });
                }
            );
        });

    } catch (error) {

        console.error(
            "FEEDING EXCEPTION:",
            error
        );
    }

    return alerts;
}


/* ============================================================
   WATER ALERTS
   ============================================================ */

async function loadWaterAlerts(farmId) {

    const alerts = [];

    try {

        const { data, error } = await supabaseClient
            .from("feeding_records")
            .select(
                "id,feeding_date,pen_number,water_available,farm_id"
            )
            .eq("farm_id", farmId);

        if (error) {

            console.error("WATER ERROR:", error);

            return alerts;
        }

        (data || []).forEach(record => {

            const date = alertDateOnly(record.feeding_date);

            if (!date) return;

            if (
                alertDateDifference(date, alertToday()) !== 0
            ) {
                return;
            }

            const water = String(
                record.water_available || ""
            ).toLowerCase().trim();

            if (
                water === "yes" ||
                water === "available"
            ) {
                return;
            }

            alerts.push({

                type: "Water",

                title: "Water Availability Check",

                message:
                    `Water availability has not been confirmed for ${record.pen_number || "the pen"}.`,

                details: `

                    <strong>Pen:</strong>
                    ${escapeAlertHTML(record.pen_number || "Not recorded")}

                    <br>

                    <strong>Water Available:</strong>
                    ${escapeAlertHTML(record.water_available || "Not recorded")}

                `,

                action:
                    "Check the water supply and ensure clean water is available.",

                priority: "Urgent",

                icon: "💧",

                date,

                source_id: record.id
            });
        });

    } catch (error) {

        console.error(
            "WATER EXCEPTION:",
            error
        );
    }

    return alerts;
}


/* ============================================================
   NEW MODULE 1:
   PIG REGISTRATION IRREGULARITIES
   ============================================================ */

async function loadPigRegistrationAlerts(farmId) {

    const alerts = [];

    try {

        const { data, error } = await supabaseClient
            .from("pigs")
            .select(`
                id,
                pig_id,
                breed,
                sex,
                farrow_date,
                source,
                weight,
                health_status,
                category,
                farm_id
            `)
            .eq("farm_id", farmId);

        if (error) {

            console.error(
                "PIG REGISTRATION ALERT ERROR:",
                error
            );

            return alerts;
        }

        const pigs = data || [];

        const idCounts = {};

        pigs.forEach(pig => {

            const pigId = String(
                pig.pig_id || ""
            ).trim().toLowerCase();

            if (!pigId) return;

            idCounts[pigId] =
                (idCounts[pigId] || 0) + 1;
        });

        pigs.forEach(pig => {

            const pigId = String(
                pig.pig_id || ""
            ).trim();

            const missing = [];

            if (!pigId) missing.push("Pig ID");

            if (!String(pig.breed || "").trim()) {
                missing.push("Breed");
            }

            if (!String(pig.sex || "").trim()) {
                missing.push("Sex");
            }

            if (missing.length) {

                alerts.push({

                    type: "Registration",

                    title: "Incomplete Pig Registration",

                    message:
                        `Pig ${pigId || "with no identification"} has incomplete registration information.`,

                    details: `

                        <strong>Pig ID:</strong>
                        ${escapeAlertHTML(pigId || "Not recorded")}

                        <br>

                        <strong>Missing Information:</strong>
                        ${escapeAlertHTML(missing.join(", "))}

                    `,

                    action:
                        "Review the pig registration record and complete the missing information.",

                    priority: "Important",

                    icon: "📋",

                    date: pig.created_at || alertToday(),

                    source_id: "registration-" + pig.id
                });
            }

            if (
                pigId &&
                idCounts[pigId.toLowerCase()] > 1
            ) {

                alerts.push({

                    type: "Registration",

                    title: "Duplicate Pig Identification",

                    message:
                        `Pig ID ${pigId} appears more than once in this farm's registration records.`,

                    details: `

                        <strong>Pig ID:</strong>
                        ${escapeAlertHTML(pigId)}

                        <br>

                        <strong>Number of Records:</strong>
                        ${idCounts[pigId.toLowerCase()]}

                    `,

                    action:
                        "Check the pig records and correct any duplicate identification numbers.",

                    priority: "Urgent",

                    icon: "⚠️",

                    source_id: "duplicate-" + pigId.toLowerCase()
                });
            }
        });

    } catch (error) {

        console.error(
            "PIG REGISTRATION EXCEPTION:",
            error
        );
    }

    return alerts;
}


/* ============================================================
   NEW MODULE 2:
   PIG MORTALITY ALERTS
   ============================================================ */

async function loadPigMortalityAlerts(farmId) {

    const alerts = [];

    try {

        const { data, error } = await supabaseClient
            .from("pig_mortality_records")
            .select(`
                id,
                death_date,
                quantity,
                pig_id,
                category,
                cause,
                notes,
                farm_id
            `)
            .eq("farm_id", farmId);

        if (error) {

            console.error(
                "PIG MORTALITY ERROR:",
                error
            );

            return alerts;
        }

        let monthlyDeaths = 0;

        let recentDeaths = 0;

        const today = alertToday();

        (data || []).forEach(record => {

            const deathDate =
                alertDateOnly(record.death_date);

            const quantity =
                Math.max(0, Number(record.quantity) || 0);

            if (!deathDate || quantity <= 0) return;

            if (isAlertInCurrentMonth(deathDate)) {
                monthlyDeaths += quantity;
            }

            const daysAgo =
                alertDateDifference(today, deathDate);

            if (daysAgo >= 0 && daysAgo <= 7) {

                recentDeaths += quantity;

                alerts.push({

                    type: "Mortality",

                    title: "Recent Pig Mortality",

                    message:
                        `${quantity} pig${quantity === 1 ? "" : "s"} recorded as deceased.`,

                    details: `

                        <strong>Death Date:</strong>
                        ${formatAlertDate(deathDate)}

                        <br>

                        <strong>Pig ID:</strong>
                        ${escapeAlertHTML(record.pig_id || "Not specified")}

                        <br>

                        <strong>Category:</strong>
                        ${escapeAlertHTML(record.category || "Not specified")}

                        <br>

                        <strong>Quantity:</strong>
                        ${quantity}

                        <br>

                        <strong>Cause:</strong>
                        ${escapeAlertHTML(record.cause || "Not recorded")}

                    `,

                    action:
                        "Review the mortality record, investigate the cause and consult the veterinary officer where necessary.",

                    priority: "Urgent",

                    icon: "⚠️",

                    date: deathDate,

                    source_id: "mortality-" + record.id
                });
            }
        });

        if (monthlyDeaths > 0) {

            alerts.push({

                type: "Mortality",

                title: "Monthly Mortality Summary",

                message:
                    `${monthlyDeaths} pig${monthlyDeaths === 1 ? "" : "s"} recorded as deceased this month.`,

                details: `

                    <strong>Current Month:</strong>
                    ${alertToday().toLocaleDateString("en-ZM", {
                        month: "long",
                        year: "numeric"
                    })}

                    <br>

                    <strong>Total Deaths:</strong>
                    ${monthlyDeaths}

                    <br>

                    <strong>Deaths in Last 7 Days:</strong>
                    ${recentDeaths}

                `,

                action:
                    "Review monthly mortality trends and investigate recurring causes.",

                priority: monthlyDeaths >= 5
                    ? "Urgent"
                    : "Important",

                icon: "📊",

                source_id: "monthly-mortality-" +
                    alertToday().getFullYear() + "-" +
                    alertToday().getMonth()
            });
        }

    } catch (error) {

        console.error(
            "PIG MORTALITY EXCEPTION:",
            error
        );
    }

    return alerts;
}


/* ============================================================
   NEW MODULE 3:
   FARROWING AND WEANING MORTALITY
   ============================================================ */

async function loadFarrowingMortalityAlerts(farmId) {

    const alerts = [];

    try {

        const { data, error } = await supabaseClient
            .from("farrowing_records")
            .select(`
                id,
                sow_id,
                farrow_date,
                born_alive,
                stillborn,
                total_born,
                mortality,
                mortality_reason,
                farm_id
            `)
            .eq("farm_id", farmId);

        if (error) {

            console.error(
                "FARROWING MORTALITY ERROR:",
                error
            );

            return alerts;
        }

        (data || []).forEach(record => {

            const mortality =
                Math.max(0, Number(record.mortality) || 0);

            if (mortality <= 0) return;

            const date =
                alertDateOnly(record.farrow_date);

            alerts.push({

                type: "Mortality",

                title: "Farrowing Mortality Recorded",

                message:
                    `${mortality} piglet${mortality === 1 ? "" : "s"} recorded as mortality for sow ${record.sow_id}.`,

                details: `

                    <strong>Sow ID:</strong>
                    ${escapeAlertHTML(record.sow_id)}

                    <br>

                    <strong>Farrowing Date:</strong>
                    ${formatAlertDate(date)}

                    <br>

                    <strong>Total Born:</strong>
                    ${Number(record.total_born) || 0}

                    <br>

                    <strong>Born Alive:</strong>
                    ${Number(record.born_alive) || 0}

                    <br>

                    <strong>Stillborn:</strong>
                    ${Number(record.stillborn) || 0}

                    <br>

                    <strong>Recorded Mortality:</strong>
                    ${mortality}

                    <br>

                    <strong>Reason:</strong>
                    ${escapeAlertHTML(record.mortality_reason || "Not recorded")}

                `,

                action:
                    "Review the farrowing record and investigate the recorded piglet mortality.",

                priority: "Urgent",

                icon: "🐷",

                date,

                source_id: "farrowing-mortality-" + record.id
            });
        });

    } catch (error) {

        console.error(
            "FARROWING MORTALITY EXCEPTION:",
            error
        );
    }

    return alerts;
}


async function loadWeaningMortalityAlerts(farmId) {

    const alerts = [];

    try {

        const { data, error } = await supabaseClient
            .from("weaning_records")
            .select(`
                id,
                sow_id,
                farrow_date,
                weaning_date,
                total_born,
                total_weaned,
                mortality,
                mortality_reason,
                farm_id
            `)
            .eq("farm_id", farmId);

        if (error) {

            console.error(
                "WEANING MORTALITY ERROR:",
                error
            );

            return alerts;
        }

        (data || []).forEach(record => {

            const mortality =
                Math.max(0, Number(record.mortality) || 0);

            if (mortality <= 0) return;

            alerts.push({

                type: "Mortality",

                title: "Weaning Mortality Recorded",

                message:
                    `${mortality} piglet${mortality === 1 ? "" : "s"} recorded as mortality for sow ${record.sow_id}.`,

                details: `

                    <strong>Sow ID:</strong>
                    ${escapeAlertHTML(record.sow_id)}

                    <br>

                    <strong>Farrowing Date:</strong>
                    ${formatAlertDate(record.farrow_date)}

                    <br>

                    <strong>Weaning Date:</strong>
                    ${formatAlertDate(record.weaning_date)}

                    <br>

                    <strong>Total Born:</strong>
                    ${Number(record.total_born) || 0}

                    <br>

                    <strong>Total Weaned:</strong>
                    ${Number(record.total_weaned) || 0}

                    <br>

                    <strong>Mortality:</strong>
                    ${mortality}

                    <br>

                    <strong>Reason:</strong>
                    ${escapeAlertHTML(record.mortality_reason || "Not recorded")}

                `,

                action:
                    "Review the weaning record and investigate the recorded mortality.",

                priority: "Urgent",

                icon: "🍼",

                date: alertDateOnly(record.weaning_date),

                source_id: "weaning-mortality-" + record.id
            });
        });

    } catch (error) {

        console.error(
            "WEANING MORTALITY EXCEPTION:",
            error
        );
    }

    return alerts;
}


/* ============================================================
   NEW MODULE 4:
   VACCINATION AND TREATMENT ALERTS
   ============================================================ */

async function loadTreatmentAlerts(farmId) {

    const alerts = [];

    try {

        const { data, error } = await supabaseClient
            .from("treatment_records")
            .select(`
                id,
                pig_id,
                breed,
                treatment_date,
                symptom,
                possible_cause,
                medicine,
                dosage,
                interval_days,
                next_administration_date,
                administered_by,
                farm_id
            `)
            .eq("farm_id", farmId)
            .not("next_administration_date", "is", null);

        if (error) {

            console.error(
                "TREATMENT ALERT ERROR:",
                error
            );

            return alerts;
        }

        (data || []).forEach(record => {

            const nextDate =
                alertDateOnly(record.next_administration_date);

            if (!nextDate) return;

            const difference =
                alertDateDifference(
                    nextDate,
                    alertToday()
                );

            if (difference < -30 || difference > 7) return;

            const pigId =
                record.pig_id || "Not specified";

            alerts.push({

                type: "Treatment",

                title:
                    difference < 0
                        ? "Overdue Treatment / Vaccination"
                        : difference === 0
                            ? "Treatment / Vaccination Due Today"
                            : "Upcoming Treatment / Vaccination",

                message:
                    difference < 0
                        ? `Pig ${pigId} has an overdue administration date.`
                        : difference === 0
                            ? `Pig ${pigId} is due for the next administration today.`
                            : `Pig ${pigId} has an upcoming administration date.`,

                details: `

                    <strong>Pig ID:</strong>
                    ${escapeAlertHTML(pigId)}

                    <br>

                    <strong>Medicine:</strong>
                    ${escapeAlertHTML(record.medicine || "Not recorded")}

                    <br>

                    <strong>Last Treatment Date:</strong>
                    ${formatAlertDate(record.treatment_date)}

                    <br>

                    <strong>Next Administration:</strong>
                    ${formatAlertDate(nextDate)}

                    <br>

                    <strong>Dosage:</strong>
                    ${escapeAlertHTML(record.dosage || "Not recorded")}

                    <br>

                    <strong>Symptom:</strong>
                    ${escapeAlertHTML(record.symptom || "Not recorded")}

                    <br>

                    <strong>Administered By:</strong>
                    ${escapeAlertHTML(record.administered_by || "Not recorded")}

                    <br>

                    <strong>${difference < 0 ? "Days Overdue" : "Days Remaining"}:</strong>
                    ${Math.abs(difference)}

                `,

                action:
                    "Check the treatment record and consult the veterinary officer before administering any medicine.",

                priority:
                    difference <= 0
                        ? "Urgent"
                        : "Important",

                icon: "💉",

                date: nextDate,

                source_id: "treatment-" + record.id
            });
        });

    } catch (error) {

        console.error(
            "TREATMENT ALERT EXCEPTION:",
            error
        );
    }

    return alerts;
}


/* ============================================================
   NEW MODULE 5:
   MONTHLY SALES, EXPENSES AND PROFIT/LOSS
   ============================================================ */

async function loadFinancialAlerts(farmId) {

    const alerts = [];

    try {

        const [
            salesResult,
            expensesResult
        ] = await Promise.all([

            supabaseClient
                .from("sales_records")
                .select(`
                    id,
                    sale_date,
                    total_amount,
                    payment_status,
                    farm_id
                `)
                .eq("farm_id", farmId),

            supabaseClient
                .from("expenses_records")
                .select(`
                    id,
                    expense_date,
                    category,
                    description,
                    total_amount,
                    farm_id
                `)
                .eq("farm_id", farmId)

        ]);

        if (salesResult.error) {

            console.error(
                "SALES ALERT ERROR:",
                salesResult.error
            );
        }

        if (expensesResult.error) {

            console.error(
                "EXPENSE ALERT ERROR:",
                expensesResult.error
            );
        }

        if (
            salesResult.error ||
            expensesResult.error
        ) {
            return alerts;
        }

        const sales = salesResult.data || [];
        const expenses = expensesResult.data || [];

        let monthlySales = 0;
        let monthlyExpenses = 0;

        let unpaidSales = 0;

        sales.forEach(record => {

            if (!isAlertInCurrentMonth(record.sale_date)) {
                return;
            }

            const amount =
                Number(record.total_amount) || 0;

            monthlySales += amount;

            const paymentStatus = String(
                record.payment_status || ""
            ).toLowerCase().trim();

            if (
                paymentStatus &&
                paymentStatus !== "paid" &&
                paymentStatus !== "completed"
            ) {
                unpaidSales += amount;
            }
        });

        expenses.forEach(record => {

            if (!isAlertInCurrentMonth(record.expense_date)) {
                return;
            }

            monthlyExpenses +=
                Number(record.total_amount) || 0;
        });

        const netBalance =
            monthlySales - monthlyExpenses;

        const monthName =
            alertToday().toLocaleDateString(
                "en-ZM",
                {
                    month: "long",
                    year: "numeric"
                }
            );

        if (
            monthlySales > 0 ||
            monthlyExpenses > 0
        ) {

            alerts.push({

                type: "Finance",

                title: netBalance < 0
                    ? "Monthly Farm Financial Loss"
                    : "Monthly Farm Financial Summary",

                message: netBalance < 0
                    ? "Farm expenses are currently higher than recorded sales this month."
                    : "Your monthly sales and expenses have been calculated.",

                details: `

                    <strong>Reporting Month:</strong>
                    ${escapeAlertHTML(monthName)}

                    <br>

                    <strong>Total Sales:</strong>
                    ${formatAlertMoney(monthlySales)}

                    <br>

                    <strong>Total Expenses:</strong>
                    ${formatAlertMoney(monthlyExpenses)}

                    <br>

                    <strong>Net Balance:</strong>
                    ${formatAlertMoney(netBalance)}

                    <br>

                    <strong>Unpaid Sales:</strong>
                    ${formatAlertMoney(unpaidSales)}

                `,

                action: netBalance < 0
                    ? "Review farm expenditure, identify unnecessary costs and monitor cash flow."
                    : "Continue monitoring sales, expenses and payment collection.",

                priority: netBalance < 0
                    ? "Urgent"
                    : "Important",

                icon: netBalance < 0
                    ? "📉"
                    : "💰",

                source_id:
                    "monthly-finance-" +
                    alertToday().getFullYear() + "-" +
                    alertToday().getMonth()
            });
        }

        if (unpaidSales > 0) {

            alerts.push({

                type: "Finance",

                title: "Outstanding Sales Payments",

                message:
                    "Some sales recorded this month have not been marked as paid.",

                details: `

                    <strong>Reporting Month:</strong>
                    ${escapeAlertHTML(monthName)}

                    <br>

                    <strong>Outstanding Amount:</strong>
                    ${formatAlertMoney(unpaidSales)}

                `,

                action:
                    "Follow up outstanding customer payments and update payment records when received.",

                priority: "Important",

                icon: "🧾",

                source_id:
                    "unpaid-sales-" +
                    alertToday().getFullYear() + "-" +
                    alertToday().getMonth()
            });
        }

    } catch (error) {

        console.error(
            "FINANCIAL ALERT EXCEPTION:",
            error
        );
    }

    return alerts;
}


/* ============================================================
   NEW MODULE 6:
   FARM PERFORMANCE ANALYTICS
   ============================================================ */

async function loadFarmAnalyticsAlerts(farmId) {

    const alerts = [];

    try {

        const [
            pigsResult,
            mortalityResult,
            salesResult,
            expensesResult
        ] = await Promise.all([

            supabaseClient
                .from("pigs")
                .select("id,pig_id,category,farm_id")
                .eq("farm_id", farmId),

            supabaseClient
                .from("pig_mortality_records")
                .select("id,death_date,quantity,farm_id")
                .eq("farm_id", farmId),

            supabaseClient
                .from("sales_records")
                .select("id,sale_date,total_amount,farm_id")
                .eq("farm_id", farmId),

            supabaseClient
                .from("expenses_records")
                .select("id,expense_date,total_amount,farm_id")
                .eq("farm_id", farmId)

        ]);

        const errors = [
            pigsResult.error,
            mortalityResult.error,
            salesResult.error,
            expensesResult.error
        ].filter(Boolean);

        if (errors.length) {

            console.error(
                "FARM ANALYTICS QUERY ERROR:",
                errors
            );

            return alerts;
        }

        const pigs = pigsResult.data || [];
        const mortality = mortalityResult.data || [];
        const sales = salesResult.data || [];
        const expenses = expensesResult.data || [];

        const categoryCounts = {};

        pigs.forEach(pig => {

            const category =
                String(pig.category || "Uncategorised").trim();

            categoryCounts[category] =
                (categoryCounts[category] || 0) + 1;
        });

        let monthlyDeaths = 0;
        let monthlySales = 0;
        let monthlyExpenses = 0;

        mortality.forEach(record => {

            if (isAlertInCurrentMonth(record.death_date)) {

                monthlyDeaths +=
                    Number(record.quantity) || 0;
            }
        });

        sales.forEach(record => {

            if (isAlertInCurrentMonth(record.sale_date)) {

                monthlySales +=
                    Number(record.total_amount) || 0;
            }
        });

        expenses.forEach(record => {

            if (isAlertInCurrentMonth(record.expense_date)) {

                monthlyExpenses +=
                    Number(record.total_amount) || 0;
            }
        });

        const categoryDetails = Object.entries(
            categoryCounts
        )
            .map(([category, quantity]) =>
                `<strong>${escapeAlertHTML(category)}:</strong> ${quantity}`
            )
            .join("<br>");

        const netBalance =
            monthlySales - monthlyExpenses;

        alerts.push({

            type: "Analytics",

            title: "Farm Performance Overview",

            message:
                "Your dashboard has generated an overview of the current farm population and monthly performance.",

            details: `

                <strong>Total Registered Pigs:</strong>
                ${pigs.length}

                <br>

                <strong>Pig Categories:</strong>

                <br>

                ${categoryDetails || "No categories recorded"}

                <br><br>

                <strong>Monthly Mortality:</strong>
                ${monthlyDeaths}

                <br>

                <strong>Monthly Sales:</strong>
                ${formatAlertMoney(monthlySales)}

                <br>

                <strong>Monthly Expenses:</strong>
                ${formatAlertMoney(monthlyExpenses)}

                <br>

                <strong>Monthly Net Balance:</strong>
                ${formatAlertMoney(netBalance)}

            `,

            action:
                "Use the Reports and Analytics module to review detailed farm performance and identify areas requiring improvement.",

            priority: "Normal",

            icon: "📊",

            source_id:
                "farm-analytics-" +
                alertToday().getFullYear() + "-" +
                alertToday().getMonth()
        });

    } catch (error) {

        console.error(
            "FARM ANALYTICS EXCEPTION:",
            error
        );
    }

    return alerts;
}


/* ============================================================
   SORT ALERTS
   ============================================================ */

function sortDashboardAlerts(alerts) {

    const priorityOrder = {

        Urgent: 1,
        Important: 2,
        Normal: 3
    };

    return alerts.sort((a, b) => {

        const priorityDifference =
            (priorityOrder[a.priority] || 3) -
            (priorityOrder[b.priority] || 3);

        if (priorityDifference !== 0) {
            return priorityDifference;
        }

        const dateA = alertDateOnly(a.date);

        const dateB = alertDateOnly(b.date);

        const timeA = dateA
            ? dateA.getTime()
            : Number.MAX_SAFE_INTEGER;

        const timeB = dateB
            ? dateB.getTime()
            : Number.MAX_SAFE_INTEGER;

        return timeA - timeB;
    });
}


/* ============================================================
   LOAD ALL DASHBOARD ALERTS
   ============================================================ */

async function loadDashboardFarmAlerts() {

    console.log(
        "===================================="
    );

    console.log(
        "MUNKA PIGGERY FARM ALERTS"
    );

    console.log(
        "Loading complete alert system..."
    );

    console.log(
        "===================================="
    );

    createFarmAlertsSection();

    const container = document.getElementById(
        "farmAlertsContainer"
    );

    const status = document.getElementById(
        "farmAlertsStatus"
    );

    if (container) {

        container.innerHTML = `

            <div class="farm-alert-loading">
                🔄 Checking gestation, farrowing,
                weaning, mortality, treatments,
                registration and financial records...
            </div>

        `;
    }

    if (status) {
        status.textContent = "Checking farm records...";
    }

    const farmId = getDashboardAlertFarmId();

    console.log("ALERT FARM ID:", farmId);

    if (!farmId) {

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

    if (typeof supabaseClient === "undefined") {

        if (status) {

            status.textContent =
                "Database connection is not available.";
        }

        return;
    }

    try {

        await loadDismissedFarmAlerts(farmId);

        const results = await Promise.all([

            /* EXISTING GESTATION ALERTS */

            load21DayCheckAlerts(farmId),

            load90DayFeedUpAlerts(farmId),

            load101DayDewormerAlerts(farmId),

            load101DayLitterGuardAlerts(farmId),

            loadActionDayAlerts(farmId),

            load114DayAlerts(farmId),

            /* EXISTING FARROWING ALERTS */

            loadFarrowingDay3Alerts(farmId),

            /* EXISTING WEANING ALERTS */

            loadWeaningAlerts(farmId),

            /* EXISTING OTHER ALERTS */

            loadNotServicedAlerts(farmId),

            loadFeedingAlerts(farmId),

            loadWaterAlerts(farmId),

            /* NEW REGISTRATION ALERTS */

            loadPigRegistrationAlerts(farmId),

            /* NEW MORTALITY ALERTS */

            loadPigMortalityAlerts(farmId),

            loadFarrowingMortalityAlerts(farmId),

            loadWeaningMortalityAlerts(farmId),

            /* NEW TREATMENT ALERTS */

            loadTreatmentAlerts(farmId),

            /* NEW FINANCIAL ALERTS */

            loadFinancialAlerts(farmId),

            /* NEW ANALYTICS ALERTS */

            loadFarmAnalyticsAlerts(farmId)

        ]);

        dashboardFarmAlerts = results.flat();

        dashboardFarmAlerts =
            dashboardFarmAlerts.map(alert => {

                alert.alert_key =
                    createFarmAlertKey(alert);

                return alert;
            });

        dashboardFarmAlerts =
            filterDismissedFarmAlerts(
                dashboardFarmAlerts
            );

        dashboardFarmAlerts =
            sortDashboardAlerts(
                dashboardFarmAlerts
            );

        console.log(
            "===================================="
        );

        console.log(
            "ACTIVE FARM ALERTS:",
            dashboardFarmAlerts.length
        );

        console.log(
            "ALL ACTIVE FARM ALERTS:",
            dashboardFarmAlerts
        );

        console.log(
            "===================================="
        );

        displayFarmAlerts(dashboardFarmAlerts);

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
                        the farm records.
                    </p>

                    <p>
                        Please refresh the dashboard
                        and try again.
                    </p>

                </div>

            `;
        }
    }
}


/* ============================================================
   INITIALIZE
   ============================================================ */

function initializeDashboardFarmAlerts() {

    console.log(
        "Initializing MUNKA PIGGERY Farm Alerts..."
    );

    createFarmAlertsSection();

    setTimeout(() => {

        loadDashboardFarmAlerts();

    }, 700);
}


/* ============================================================
   DOM READY
   ============================================================ */

if (document.readyState === "loading") {

    document.addEventListener(
        "DOMContentLoaded",
        initializeDashboardFarmAlerts
    );

} else {

    initializeDashboardFarmAlerts();
}
