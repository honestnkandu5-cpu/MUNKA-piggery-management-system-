/* ============================================================
   MUNKA PIGGERY MANAGEMENT SYSTEM
   FARM DASHBOARD ALERTS - COMPLETE VERSION
   ============================================================

   FEATURES
   --------
   • Gestation Alerts
   • Farrowing Alerts
   • Weaning Alerts
   • Not Serviced Alerts
   • Feeding Alerts
   • Water Alerts
   • Owner/Admin Alert Dismissal
   • Farm-Scoped Dismissals
   • Persistent Dismissals
   • Secure Role Checking

   IMPORTANT
   ----------
   Uses supabaseClient
   Uses local browser dates
   Farm-scoped
   Does NOT delete farm records
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

    if (!value) {
        return null;
    }

    if (value instanceof Date) {

        if (isNaN(value.getTime())) {
            return null;
        }

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

        const year = Number(match[1]);
        const month = Number(match[2]);
        const day = Number(match[3]);

        return new Date(
            year,
            month - 1,
            day
        );
    }

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


function alertToday() {

    const now = new Date();

    return new Date(
        now.getFullYear(),
        now.getMonth(),
        now.getDate()
    );
}


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
        first.getTime() -
        second.getTime();

    return Math.round(
        difference /
        (1000 * 60 * 60 * 24)
    );
}


function addDaysToDate(date, days) {

    if (!date) {
        return null;
    }

    const result = new Date(
        date.getFullYear(),
        date.getMonth(),
        date.getDate()
    );

    result.setDate(
        result.getDate() + days
    );

    return new Date(
        result.getFullYear(),
        result.getMonth(),
        result.getDate()
    );
}


function formatAlertDate(value) {

    const date =
        alertDateOnly(value);

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


function formatAlertTime(value) {

    if (!value) {
        return "Time not recorded";
    }

    const match =
        String(value).match(
            /^(\d{1,2}):(\d{2})/
        );

    if (!match) {
        return String(value);
    }

    const hour =
        Number(match[1]);

    const minute =
        Number(match[2]);

    const date = new Date();

    date.setHours(
        hour,
        minute,
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


/* ============================================================
   HTML SECURITY
   ============================================================ */

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


/* ============================================================
   USER / FARM
   ============================================================ */

function getDashboardAlertUser() {

    try {

        const stored =
            localStorage.getItem(
                "loggedInUser"
            );

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

    if (
        user &&
        user.farm_id
    ) {

        return Number(
            user.farm_id
        );
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


/* ============================================================
   OWNER / ADMIN CHECK
   ============================================================ */

function dashboardUserCanDismissAlerts() {

    const user =
        getDashboardAlertUser();

    if (!user) {
        return false;
    }

    const role =
        String(
            user.role || ""
        )
            .trim();

    const status =
        String(
            user.status || ""
        )
            .trim();

    return (
        role === "Owner/Admin" &&
        status === "Active"
    );
}


/* ============================================================
   CREATE UNIQUE ALERT KEY
   ============================================================ */

function createFarmAlertKey(alert) {

    const type =
        String(
            alert.type || "General"
        ).trim();

    const title =
        String(
            alert.title || "Farm Alert"
        ).trim();

    let datePart = "";

    if (alert.date) {

        const date =
            alertDateOnly(
                alert.date
            );

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

    dashboardDismissedAlertKeys =
        new Set();

    if (!farmId) {
        return;
    }

    try {

        const {
            data,
            error
        } = await supabaseClient
            .from("dismissed_farm_alerts")
            .select(
                "id,farm_id,alert_key,dismissed_by,dismissed_at"
            )
            .eq(
                "farm_id",
                farmId
            );


        if (error) {

            console.error(
                "DISMISSED ALERTS LOAD ERROR:",
                error
            );

            return;
        }


        (data || []).forEach(record => {

            if (
                record.alert_key
            ) {

                dashboardDismissedAlertKeys.add(
                    String(
                        record.alert_key
                    )
                );
            }
        });


        console.log(
            "DISMISSED ALERT KEYS:",
            dashboardDismissedAlertKeys
        );

    } catch (error) {

        console.error(
            "DISMISSED ALERTS EXCEPTION:",
            error
        );
    }
}


/* ============================================================
   FILTER DISMISSED ALERTS
   ============================================================ */

function filterDismissedFarmAlerts(alerts) {

    if (
        !dashboardDismissedAlertKeys ||
        !dashboardDismissedAlertKeys.size
    ) {

        return alerts;
    }


    return alerts.filter(alert => {

        const key =
            alert.alert_key ||
            createFarmAlertKey(
                alert
            );

        alert.alert_key =
            key;

        return !dashboardDismissedAlertKeys.has(
            key
        );
    });
}


/* ============================================================
   DISMISS ALERT
   ============================================================ */

async function dismissFarmAlert(alertKey) {

    if (!alertKey) {

        console.error(
            "Cannot dismiss alert: alert key missing."
        );

        return;
    }


    if (
        !dashboardUserCanDismissAlerts()
    ) {

        alert(
            "Only an active Owner/Admin can dismiss farm alerts."
        );

        return;
    }


    const user =
        getDashboardAlertUser();

    const farmId =
        getDashboardAlertFarmId();


    if (!user) {

        alert(
            "Your user session could not be identified."
        );

        return;
    }


    if (!farmId) {

        alert(
            "The farm connected to this account could not be identified."
        );

        return;
    }


    if (
        typeof supabaseClient ===
        "undefined"
    ) {

        alert(
            "Database connection is not available."
        );

        return;
    }


    const button =
        document.querySelector(
            `[data-dismiss-alert="${CSS.escape(
                alertKey
            )}"]`
        );


    if (button) {

        button.disabled =
            true;

        button.innerHTML =
            "⏳ Dismissing...";
    }


    try {

        const {
            error
        } = await supabaseClient
            .from("dismissed_farm_alerts")
            .insert({

                farm_id:
                    Number(farmId),

                alert_key:
                    String(alertKey),

                dismissed_by:
                    user.id
                        ? Number(user.id)
                        : null
            });


        /*
           If the record already exists,
           treat it as already dismissed.
        */

        if (error) {

            const errorText =
                String(
                    error.message ||
                    error.details ||
                    ""
                ).toLowerCase();


            if (
                !errorText.includes(
                    "duplicate"
                ) &&
                !errorText.includes(
                    "unique"
                )
            ) {

                console.error(
                    "DISMISS ALERT ERROR:",
                    error
                );

                if (button) {

                    button.disabled =
                        false;

                    button.innerHTML =
                        "🗑️ Dismiss Alert";
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
            dashboardFarmAlerts.filter(
                alert => {

                    const key =
                        alert.alert_key ||
                        createFarmAlertKey(
                            alert
                        );

                    return (
                        key !==
                        String(alertKey)
                    );
                }
            );


        displayFarmAlerts(
            dashboardFarmAlerts
        );


        console.log(
            "Farm alert dismissed:",
            alertKey
        );

    } catch (error) {

        console.error(
            "DISMISS ALERT EXCEPTION:",
            error
        );


        if (button) {

            button.disabled =
                false;

            button.innerHTML =
                "🗑️ Dismiss Alert";
        }


        alert(
            "An unexpected error occurred while dismissing the alert."
        );
    }
}


/* ============================================================
   MAKE DISMISS FUNCTION AVAILABLE TO HTML BUTTONS
   ============================================================ */

window.dismissFarmAlert =
    dismissFarmAlert;


/* ============================================================
   CREATE FARM ALERT SECTION
   ============================================================ */

function createFarmAlertsSection() {

    if (
        dashboardAlertsSectionCreated
    ) {
        return;
    }


    const existing =
        document.getElementById(
            "farmAlertsSection"
        );


    if (existing) {

        dashboardAlertsSectionCreated =
            true;

        return;
    }


    const announcementsSection =
        document.querySelector(
            ".announcements-section"
        ) ||
        document.querySelector(
            "#announcementsSection"
        );


    const section =
        document.createElement(
            "section"
        );


    section.id =
        "farmAlertsSection";


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
            document.querySelector(
                "main"
            ) ||
            document.body;

        main.appendChild(
            section
        );
    }


    dashboardAlertsSectionCreated =
        true;


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


/* ============================================================
   DISPLAY ALERTS
   ============================================================ */

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

        count.textContent =
            alerts.length;
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

                <h3>
                    No Active Alerts
                </h3>

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
        alerts
            .map(createFarmAlertCard)
            .join("");
}


/* ============================================================
   ALERT CARD
   ============================================================ */

function createFarmAlertCard(alert) {

    const priority =
        String(
            alert.priority ||
            "Normal"
        ).toLowerCase();


    const alertKey =
        alert.alert_key ||
        createFarmAlertKey(
            alert
        );


    alert.alert_key =
        alertKey;


    const canDismiss =
        dashboardUserCanDismissAlerts();


    const dismissButton =
        canDismiss
            ? `
                <button
                    type="button"
                    class="farm-alert-dismiss-btn"
                    data-dismiss-alert="${escapeAlertHTML(
                        alertKey
                    )}"
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
            data-alert-key="${escapeAlertHTML(
                alertKey
            )}"
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
                            class="
                                farm-alert-priority
                                farm-alert-priority-${priority}
                            "
                        >
                            ${escapeAlertHTML(
                                alert.priority ||
                                "Normal"
                            )}
                        </span>

                    </div>


                    <p class="farm-alert-message">
                        ${escapeAlertHTML(
                            alert.message ||
                            ""
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


                    ${
                        dismissButton
                    }

                </div>

            </div>

        </article>
    `;
}


/* ============================================================
   GESTATION STATUS
   ============================================================ */

function gestationStatusIsClosed(status) {

    const value =
        String(
            status || ""
        )
            .toLowerCase()
            .trim();


    return (
        value === "completed" ||
        value === "farrowed" ||
        value === "cancelled" ||
        value === "closed"
    );
}


/* ============================================================
   GESTATION - 21 DAY CHECK
   ============================================================ */

async function load21DayCheckAlerts(farmId) {

    const alerts = [];

    try {

        const {
            data,
            error
        } = await supabaseClient
            .from("gestation_records")
            .select(
                "id,sow_id,service_date,status,farm_id"
            )
            .eq(
                "farm_id",
                farmId
            )
            .not(
                "service_date",
                "is",
                null
            );


        if (error) {

            console.error(
                "21-DAY CHECK ERROR:",
                error
            );

            return alerts;
        }


        (data || []).forEach(record => {

            if (
                gestationStatusIsClosed(
                    record.status
                )
            ) {
                return;
            }


            const serviceDate =
                alertDateOnly(
                    record.service_date
                );


            if (!serviceDate) {
                return;
            }


            const checkDate =
                addDaysToDate(
                    serviceDate,
                    21
                );


            const difference =
                alertDateDifference(
                    checkDate,
                    alertToday()
                );


            if (difference < 0) {

                alerts.push({

                    type: "Gestation",

                    title:
                        "Overdue 21-Day Check",

                    message:
                        `Sow ${record.sow_id || "Unknown"} has an overdue 21-day pregnancy check.`,

                    details: `

                        <strong>Sow ID:</strong>
                        ${escapeAlertHTML(
                            record.sow_id ||
                            "Not recorded"
                        )}

                        <br>

                        <strong>Service Date:</strong>
                        ${formatAlertDate(
                            record.service_date
                        )}

                        <br>

                        <strong>21-Day Check:</strong>
                        ${formatAlertDate(
                            checkDate
                        )}

                    `,

                    action:
                        "Check the sow and complete the pregnancy check.",

                    priority: "Urgent",

                    icon: "🔎",

                    date: checkDate,

                    source_id:
                        record.id
                });

                return;
            }


            if (difference === 0) {

                alerts.push({

                    type: "Gestation",

                    title:
                        "21-Day Check Due Today",

                    message:
                        `Sow ${record.sow_id || "Unknown"} is due for the 21-day pregnancy check today.`,

                    details: `

                        <strong>Sow ID:</strong>
                        ${escapeAlertHTML(
                            record.sow_id ||
                            "Not recorded"
                        )}

                        <br>

                        <strong>Service Date:</strong>
                        ${formatAlertDate(
                            record.service_date
                        )}

                        <br>

                        <strong>Check Date:</strong>
                        ${formatAlertDate(
                            checkDate
                        )}

                    `,

                    action:
                        "Carry out the required 21-day pregnancy check.",

                    priority: "Urgent",

                    icon: "🔎",

                    date: checkDate,

                    source_id:
                        record.id
                });

                return;
            }


            if (
                difference > 0 &&
                difference <= 7
            ) {

                alerts.push({

                    type: "Gestation",

                    title:
                        "Upcoming 21-Day Check",

                    message:
                        `Sow ${record.sow_id || "Unknown"} has a 21-day pregnancy check coming up.`,

                    details: `

                        <strong>Sow ID:</strong>
                        ${escapeAlertHTML(
                            record.sow_id ||
                            "Not recorded"
                        )}

                        <br>

                        <strong>Check Date:</strong>
                        ${formatAlertDate(
                            checkDate
                        )}

                        <br>

                        <strong>Days Remaining:</strong>
                        ${difference}

                    `,

                    action:
                        "Prepare for the 21-day pregnancy check.",

                    priority: "Important",

                    icon: "🔎",

                    date: checkDate,

                    source_id:
                        record.id
                });
            }

        });

    } catch (error) {

        console.error(
            "21-DAY CHECK EXCEPTION:",
            error
        );
    }

    return alerts;
}


/* ============================================================
   GESTATION - 90 DAY FEED UP
   ============================================================ */

async function load90DayFeedUpAlerts(farmId) {

    const alerts = [];

    try {

        const {
            data,
            error
        } = await supabaseClient
            .from("gestation_records")
            .select(
                "id,sow_id,service_date,status,farm_id"
            )
            .eq(
                "farm_id",
                farmId
            )
            .not(
                "service_date",
                "is",
                null
            );


        if (error) {

            console.error(
                "90-DAY FEED UP ERROR:",
                error
            );

            return alerts;
        }


        (data || []).forEach(record => {

            if (
                gestationStatusIsClosed(
                    record.status
                )
            ) {
                return;
            }


            const serviceDate =
                alertDateOnly(
                    record.service_date
                );


            if (!serviceDate) {
                return;
            }


            const feedUpDate =
                addDaysToDate(
                    serviceDate,
                    90
                );


            const difference =
                alertDateDifference(
                    feedUpDate,
                    alertToday()
                );


            if (difference < 0) {

                alerts.push({

                    type: "Gestation",

                    title:
                        "Overdue 90-Day Feed Up",

                    message:
                        `Sow ${record.sow_id || "Unknown"} has an overdue 90-day feed-up activity.`,

                    details: `

                        <strong>Sow ID:</strong>
                        ${escapeAlertHTML(
                            record.sow_id ||
                            "Not recorded"
                        )}

                        <br>

                        <strong>Feed-Up Date:</strong>
                        ${formatAlertDate(
                            feedUpDate
                        )}

                    `,

                    action:
                        "Review the sow's feeding programme and complete the required feed-up activity.",

                    priority: "Urgent",

                    icon: "🌾",

                    date: feedUpDate,

                    source_id:
                        record.id
                });

                return;
            }


            if (difference === 0) {

                alerts.push({

                    type: "Gestation",

                    title:
                        "90-Day Feed Up Due Today",

                    message:
                        `Sow ${record.sow_id || "Unknown"} is due for the 90-day feed-up activity today.`,

                    details: `

                        <strong>Sow ID:</strong>
                        ${escapeAlertHTML(
                            record.sow_id ||
                            "Not recorded"
                        )}

                        <br>

                        <strong>Feed-Up Date:</strong>
                        ${formatAlertDate(
                            feedUpDate
                        )}

                    `,

                    action:
                        "Carry out the planned 90-day feed-up programme.",

                    priority: "Urgent",

                    icon: "🌾",

                    date: feedUpDate,

                    source_id:
                        record.id
                });

                return;
            }


            if (
                difference > 0 &&
                difference <= 7
            ) {

                alerts.push({

                    type: "Gestation",

                    title:
                        "Upcoming 90-Day Feed Up",

                    message:
                        `Sow ${record.sow_id || "Unknown"} has a 90-day feed-up activity coming up.`,

                    details: `

                        <strong>Feed-Up Date:</strong>
                        ${formatAlertDate(
                            feedUpDate
                        )}

                        <br>

                        <strong>Days Remaining:</strong>
                        ${difference}

                    `,

                    action:
                        "Prepare the required feeding programme.",

                    priority: "Important",

                    icon: "🌾",

                    date: feedUpDate,

                    source_id:
                        record.id
                });
            }

        });

    } catch (error) {

        console.error(
            "90-DAY FEED UP EXCEPTION:",
            error
        );
    }

    return alerts;
}


/* ============================================================
   GESTATION - 101 DAY DEWORMER
   ============================================================ */

async function load101DayDewormerAlerts(farmId) {

    const alerts = [];

    try {

        const {
            data,
            error
        } = await supabaseClient
            .from("gestation_records")
            .select(
                "id,sow_id,service_date,status,farm_id"
            )
            .eq(
                "farm_id",
                farmId
            )
            .not(
                "service_date",
                "is",
                null
            );


        if (error) {

            console.error(
                "101-DAY DEWORMER ERROR:",
                error
            );

            return alerts;
        }


        (data || []).forEach(record => {

            if (
                gestationStatusIsClosed(
                    record.status
                )
            ) {
                return;
            }


            const serviceDate =
                alertDateOnly(
                    record.service_date
                );


            if (!serviceDate) {
                return;
            }


            const dewormerDate =
                addDaysToDate(
                    serviceDate,
                    101
                );


            const difference =
                alertDateDifference(
                    dewormerDate,
                    alertToday()
                );


            if (difference < 0) {

                alerts.push({

                    type: "Gestation",

                    title:
                        "Overdue Dewormer",

                    message:
                        `Sow ${record.sow_id || "Unknown"} has an overdue 101-day dewormer activity.`,

                    details: `

                        <strong>Sow ID:</strong>
                        ${escapeAlertHTML(
                            record.sow_id ||
                            "Not recorded"
                        )}

                        <br>

                        <strong>Dewormer Date:</strong>
                        ${formatAlertDate(
                            dewormerDate
                        )}

                    `,

                    action:
                        "Review the sow record and follow the farm veterinary programme.",

                    priority: "Urgent",

                    icon: "💊",

                    date: dewormerDate,

                    source_id:
                        record.id
                });

                return;
            }


            if (difference === 0) {

                alerts.push({

                    type: "Gestation",

                    title:
                        "101-Day Dewormer Due Today",

                    message:
                        `Sow ${record.sow_id || "Unknown"} is due for the 101-day dewormer activity today.`,

                    details: `

                        <strong>Sow ID:</strong>
                        ${escapeAlertHTML(
                            record.sow_id ||
                            "Not recorded"
                        )}

                        <br>

                        <strong>Dewormer Date:</strong>
                        ${formatAlertDate(
                            dewormerDate
                        )}

                    `,

                    action:
                        "Carry out the required deworming procedure according to the farm veterinary programme.",

                    priority: "Urgent",

                    icon: "💊",

                    date: dewormerDate,

                    source_id:
                        record.id
                });

                return;
            }


            if (
                difference > 0 &&
                difference <= 7
            ) {

                alerts.push({

                    type: "Gestation",

                    title:
                        "Upcoming 101-Day Dewormer",

                    message:
                        `Sow ${record.sow_id || "Unknown"} has a 101-day dewormer activity coming up.`,

                    details: `

                        <strong>Dewormer Date:</strong>
                        ${formatAlertDate(
                            dewormerDate
                        )}

                        <br>

                        <strong>Days Remaining:</strong>
                        ${difference}

                    `,

                    action:
                        "Prepare for the required deworming procedure.",

                    priority: "Important",

                    icon: "💊",

                    date: dewormerDate,

                    source_id:
                        record.id
                });
            }

        });

    } catch (error) {

        console.error(
            "101-DAY DEWORMER EXCEPTION:",
            error
        );
    }

    return alerts;
}


/* ============================================================
   GESTATION - 101 DAY LITTER GUARD
   ============================================================ */

async function load101DayLitterGuardAlerts(farmId) {

    const alerts = [];

    try {

        const {
            data,
            error
        } = await supabaseClient
            .from("gestation_records")
            .select(
                "id,sow_id,service_date,status,farm_id"
            )
            .eq(
                "farm_id",
                farmId
            )
            .not(
                "service_date",
                "is",
                null
            );


        if (error) {

            console.error(
                "101-DAY LITTER GUARD ERROR:",
                error
            );

            return alerts;
        }


        (data || []).forEach(record => {

            if (
                gestationStatusIsClosed(
                    record.status
                )
            ) {
                return;
            }


            const serviceDate =
                alertDateOnly(
                    record.service_date
                );


            if (!serviceDate) {
                return;
            }


            const litterGuardDate =
                addDaysToDate(
                    serviceDate,
                    101
                );


            const difference =
                alertDateDifference(
                    litterGuardDate,
                    alertToday()
                );


            if (difference < 0) {

                alerts.push({

                    type: "Gestation",

                    title:
                        "Overdue Litter Guard",

                    message:
                        `Sow ${record.sow_id || "Unknown"} has an overdue 101-day Litter Guard activity.`,

                    details: `

                        <strong>Sow ID:</strong>
                        ${escapeAlertHTML(
                            record.sow_id ||
                            "Not recorded"
                        )}

                        <br>

                        <strong>Litter Guard Date:</strong>
                        ${formatAlertDate(
                            litterGuardDate
                        )}

                    `,

                    action:
                        "Review the sow record and follow the planned farm programme.",

                    priority: "Urgent",

                    icon: "🛡️",

                    date: litterGuardDate,

                    source_id:
                        record.id
                });

                return;
            }


            if (difference === 0) {

                alerts.push({

                    type: "Gestation",

                    title:
                        "101-Day Litter Guard Due Today",

                    message:
                        `Sow ${record.sow_id || "Unknown"} is due for Litter Guard today.`,

                    details: `

                        <strong>Sow ID:</strong>
                        ${escapeAlertHTML(
                            record.sow_id ||
                            "Not recorded"
                        )}

                        <br>

                        <strong>Litter Guard Date:</strong>
                        ${formatAlertDate(
                            litterGuardDate
                        )}

                    `,

                    action:
                        "Carry out the planned Litter Guard procedure.",

                    priority: "Urgent",

                    icon: "🛡️",

                    date: litterGuardDate,

                    source_id:
                        record.id
                });

                return;
            }


            if (
                difference > 0 &&
                difference <= 7
            ) {

                alerts.push({

                    type: "Gestation",

                    title:
                        "Upcoming Litter Guard",

                    message:
                        `Sow ${record.sow_id || "Unknown"} has a 101-day Litter Guard activity coming up.`,

                    details: `

                        <strong>Litter Guard Date:</strong>
                        ${formatAlertDate(
                            litterGuardDate
                        )}

                        <br>

                        <strong>Days Remaining:</strong>
                        ${difference}

                    `,

                    action:
                        "Prepare for the planned Litter Guard procedure.",

                    priority: "Important",

                    icon: "🛡️",

                    date: litterGuardDate,

                    source_id:
                        record.id
                });
            }

        });

    } catch (error) {

        console.error(
            "101-DAY LITTER GUARD EXCEPTION:",
            error
        );
    }

    return alerts;
}


/* ============================================================
   GESTATION - 107 DAY ACTION DAY
   ============================================================ */

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
            .eq(
                "farm_id",
                farmId
            )
            .not(
                "action_day",
                "is",
                null
            );


        if (error) {

            console.error(
                "ACTION DAY ERROR:",
                error
            );

            return alerts;
        }


        (data || []).forEach(record => {

            if (
                gestationStatusIsClosed(
                    record.status
                )
            ) {
                return;
            }


            const actionDate =
                alertDateOnly(
                    record.action_day
                );


            if (!actionDate) {
                return;
            }


            const difference =
                alertDateDifference(
                    actionDate,
                    alertToday()
                );


            if (difference < 0) {

                alerts.push({

                    type: "Gestation",

                    title:
                        "Overdue Action Day",

                    message:
                        `Sow ${record.sow_id || "Unknown"} has an overdue Action Day.`,

                    details: `

                        <strong>Sow ID:</strong>
                        ${escapeAlertHTML(
                            record.sow_id ||
                            "Not recorded"
                        )}

                        <br>

                        <strong>Action Day:</strong>
                        ${formatAlertDate(
                            actionDate
                        )}

                    `,

                    action:
                        "Review the sow record and complete the required Action Day procedures if still applicable.",

                    priority: "Urgent",

                    icon: "⚠️",

                    date: actionDate,

                    source_id:
                        record.id
                });

                return;
            }


            if (difference === 0) {

                alerts.push({

                    type: "Gestation",

                    title:
                        "Action Day is Ready",

                    message:
                        `Sow ${record.sow_id || "Unknown"} is ready for Action Day today.`,

                    details: `

                        <strong>Sow ID:</strong>
                        ${escapeAlertHTML(
                            record.sow_id ||
                            "Not recorded"
                        )}

                        <br>

                        <strong>Action Day:</strong>
                        ${formatAlertDate(
                            actionDate
                        )}

                    `,

                    action:
                        "Carry out the required Action Day procedures.",

                    priority: "Urgent",

                    icon: "📅",

                    date: actionDate,

                    source_id:
                        record.id
                });

                return;
            }


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
                            actionDate
                        )}

                        <br>

                        <strong>Days Remaining:</strong>
                        ${difference}

                    `,

                    action:
                        "Prepare for the Action Day activities.",

                    priority: "Important",

                    icon: "📅",

                    date: actionDate,

                    source_id:
                        record.id
                });
            }

        });

    } catch (error) {

        console.error(
            "ACTION DAY EXCEPTION:",
            error
        );
    }

    return alerts;
}


/* ============================================================
   GESTATION - 114 DAY EXPECTED FARROWING
   ============================================================ */

async function load114DayAlerts(farmId) {

    const alerts = [];

    try {

        const {
            data,
            error
        } = await supabaseClient
            .from("gestation_records")
            .select(
                "id,sow_id,service_date,expected_farrowing_date,status,farm_id"
            )
            .eq(
                "farm_id",
                farmId
            )
            .not(
                "service_date",
                "is",
                null
            );


        if (error) {

            console.error(
                "114-DAY ALERT ERROR:",
                error
            );

            return alerts;
        }


        (data || []).forEach(record => {

            if (
                gestationStatusIsClosed(
                    record.status
                )
            ) {
                return;
            }


            const serviceDate =
                alertDateOnly(
                    record.service_date
                );


            if (!serviceDate) {
                return;
            }


            let expectedDate =
                alertDateOnly(
                    record.expected_farrowing_date
                );


            if (!expectedDate) {

                expectedDate =
                    addDaysToDate(
                        serviceDate,
                        114
                    );
            }


            const difference =
                alertDateDifference(
                    expectedDate,
                    alertToday()
                );


            if (
                difference < 0 ||
                difference > 7
            ) {
                return;
            }


            alerts.push({

                type: "Gestation",

                title:
                    difference === 0
                        ? "Expected Farrowing is Today"
                        : "Upcoming Expected Farrowing",

                message:
                    difference === 0
                        ? `Sow ${record.sow_id || "Unknown"} is expected to farrow today.`
                        : `Sow ${record.sow_id || "Unknown"} is expected to farrow soon.`,

                details: `

                    <strong>Sow ID:</strong>
                    ${escapeAlertHTML(
                        record.sow_id ||
                        "Not recorded"
                    )}

                    <br>

                    <strong>Expected Farrowing:</strong>
                    ${formatAlertDate(
                        expectedDate
                    )}

                    ${
                        difference > 0
                            ? `
                                <br>
                                <strong>Days Remaining:</strong>
                                ${difference}
                              `
                            : ""
                    }

                `,

                action:
                    "Prepare the farrowing area and monitor the sow closely.",

                priority:
                    difference === 0
                        ? "Urgent"
                        : "Important",

                icon: "🐷",

                date: expectedDate,

                source_id:
                    record.id
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

    try {

        const {
            data,
            error
        } = await supabaseClient
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
            .eq(
                "farm_id",
                farmId
            );


        if (error) {

            console.error(
                "FARROWING DAY 3 ERROR:",
                error
            );

            return alerts;
        }


        (data || []).forEach(record => {

            const sow =
                record.sow_id ||
                "Unknown Sow";


            /* =================================================
               IRON INJECTION
               ================================================= */

            if (record.iron_date) {

                const ironDate =
                    alertDateOnly(
                        record.iron_date
                    );


                if (ironDate) {

                    const difference =
                        alertDateDifference(
                            ironDate,
                            alertToday()
                        );


                    if (
                        difference >= 0 &&
                        difference <= 7
                    ) {

                        alerts.push({

                            type: "Farrowing",

                            title:
                                difference === 0
                                    ? "Iron Injection Due Today"
                                    : "Upcoming Iron Injection",

                            message:
                                difference === 0
                                    ? `Sow ${sow} has an iron injection scheduled today.`
                                    : `Sow ${sow} has an iron injection coming up.`,

                            details: `

                                <strong>Sow ID:</strong>
                                ${escapeAlertHTML(
                                    sow
                                )}

                                <br>

                                <strong>Iron Injection Date:</strong>
                                ${formatAlertDate(
                                    ironDate
                                )}

                                ${
                                    difference > 0
                                        ? `
                                            <br>
                                            <strong>Days Remaining:</strong>
                                            ${difference}
                                          `
                                        : ""
                                }

                            `,

                            action:
                                "Check the farrowing record and follow the farm/veterinary programme for the scheduled activity.",

                            priority:
                                difference === 0
                                    ? "Urgent"
                                    : "Important",

                            icon: "🩸",

                            date: ironDate,

                            source_id:
                                record.id
                        });
                    }


                    if (
                        difference < 0 &&
                        difference >= -7
                    ) {

                        alerts.push({

                            type: "Farrowing",

                            title:
                                "Overdue Iron Injection",

                            message:
                                `Sow ${sow} has an overdue iron injection activity.`,

                            details: `

                                <strong>Sow ID:</strong>
                                ${escapeAlertHTML(
                                    sow
                                )}

                                <br>

                                <strong>Scheduled Date:</strong>
                                ${formatAlertDate(
                                    ironDate
                                )}

                                <br>

                                <strong>Days Overdue:</strong>
                                ${Math.abs(
                                    difference
                                )}

                            `,

                            action:
                                "Review the farrowing record and follow the farm/veterinary programme.",

                            priority: "Urgent",

                            icon: "🩸",

                            date: ironDate,

                            source_id:
                                record.id
                        });
                    }
                }
            }


            /* =================================================
               TEETH CLIPPING
               ================================================= */

            if (record.teeth_date) {

                const teethDate =
                    alertDateOnly(
                        record.teeth_date
                    );


                if (teethDate) {

                    const difference =
                        alertDateDifference(
                            teethDate,
                            alertToday()
                        );


                    if (
                        difference >= 0 &&
                        difference <= 7
                    ) {

                        alerts.push({

                            type: "Farrowing",

                            title:
                                difference === 0
                                    ? "Teeth Clipping Due Today"
                                    : "Upcoming Teeth Clipping",

                            message:
                                difference === 0
                                    ? `Sow ${sow} has teeth clipping scheduled today.`
                                    : `Sow ${sow} has teeth clipping coming up.`,

                            details: `

                                <strong>Sow ID:</strong>
                                ${escapeAlertHTML(
                                    sow
                                )}

                                <br>

                                <strong>Teeth Clipping Date:</strong>
                                ${formatAlertDate(
                                    teethDate
                                )}

                                ${
                                    difference > 0
                                        ? `
                                            <br>
                                            <strong>Days Remaining:</strong>
                                            ${difference}
                                          `
                                        : ""
                                }

                            `,

                            action:
                                "Check the farrowing record and follow the farm programme for the scheduled activity.",

                            priority:
                                difference === 0
                                    ? "Urgent"
                                    : "Important",

                            icon: "🦷",

                            date: teethDate,

                            source_id:
                                record.id
                        });
                    }


                    if (
                        difference < 0 &&
                        difference >= -7
                    ) {

                        alerts.push({

                            type: "Farrowing",

                            title:
                                "Overdue Teeth Clipping",

                            message:
                                `Sow ${sow} has an overdue teeth clipping activity.`,

                            details: `

                                <strong>Sow ID:</strong>
                                ${escapeAlertHTML(
                                    sow
                                )}

                                <br>

                                <strong>Scheduled Date:</strong>
                                ${formatAlertDate(
                                    teethDate
                                )}

                                <br>

                                <strong>Days Overdue:</strong>
                                ${Math.abs(
                                    difference
                                )}

                            `,

                            action:
                                "Review the farrowing record and follow the farm programme.",

                            priority: "Urgent",

                            icon: "🦷",

                            date: teethDate,

                            source_id:
                                record.id
                        });
                    }
                }
            }


            /* =================================================
               TAIL DOCKING
               ================================================= */

            if (record.tail_date) {

                const tailDate =
                    alertDateOnly(
                        record.tail_date
                    );


                if (tailDate) {

                    const difference =
                        alertDateDifference(
                            tailDate,
                            alertToday()
                        );


                    if (
                        difference >= 0 &&
                        difference <= 7
                    ) {

                        alerts.push({

                            type: "Farrowing",

                            title:
                                difference === 0
                                    ? "Tail Docking Due Today"
                                    : "Upcoming Tail Docking",

                            message:
                                difference === 0
                                    ? `Sow ${sow} has tail docking scheduled today.`
                                    : `Sow ${sow} has tail docking coming up.`,

                            details: `

                                <strong>Sow ID:</strong>
                                ${escapeAlertHTML(
                                    sow
                                )}

                                <br>

                                <strong>Tail Docking Date:</strong>
                                ${formatAlertDate(
                                    tailDate
                                )}

                                ${
                                    difference > 0
                                        ? `
                                            <br>
                                            <strong>Days Remaining:</strong>
                                            ${difference}
                                          `
                                        : ""
                                }

                            `,

                            action:
                                "Check the farrowing record and follow the farm programme for the scheduled activity.",

                            priority:
                                difference === 0
                                    ? "Urgent"
                                    : "Important",

                            icon: "✂️",

                            date: tailDate,

                            source_id:
                                record.id
                        });
                    }


                    if (
                        difference < 0 &&
                        difference >= -7
                    ) {

                        alerts.push({

                            type: "Farrowing",

                            title:
                                "Overdue Tail Docking",

                            message:
                                `Sow ${sow} has an overdue tail docking activity.`,

                            details: `

                                <strong>Sow ID:</strong>
                                ${escapeAlertHTML(
                                    sow
                                )}

                                <br>

                                <strong>Scheduled Date:</strong>
                                ${formatAlertDate(
                                    tailDate
                                )}

                                <br>

                                <strong>Days Overdue:</strong>
                                ${Math.abs(
                                    difference
                                )}

                            `,

                            action:
                                "Review the farrowing record and follow the farm programme.",

                            priority: "Urgent",

                            icon: "✂️",

                            date: tailDate,

                            source_id:
                                record.id
                        });
                    }
                }
            }

        });

    } catch (error) {

        console.error(
            "FARROWING DAY 3 EXCEPTION:",
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

        console.log(
            "Loading WEANING alerts for farm:",
            farmId
        );


        const {
            data,
            error
        } = await supabaseClient
            .from("weaning_records")
            .select(`
                id,
                sow_id,
                weaning_date,
                total_weaned,
                farm_id
            `)
            .eq(
                "farm_id",
                farmId
            )
            .not(
                "weaning_date",
                "is",
                null
            );


        if (error) {

            console.error(
                "WEANING DATABASE ERROR:",
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


            const difference =
                alertDateDifference(
                    weaningDate,
                    alertToday()
                );


            if (
                difference < -7 ||
                difference > 7
            ) {
                return;
            }


            if (difference < 0) {

                alerts.push({

                    type: "Weaning",

                    title:
                        "Overdue Weaning",

                    message:
                        `Sow ${record.sow_id || "Unknown"} has an overdue weaning activity.`,

                    details: `

                        <strong>Sow ID:</strong>
                        ${escapeAlertHTML(
                            record.sow_id ||
                            "Not recorded"
                        )}

                        <br>

                        <strong>Weaning Date:</strong>
                        ${formatAlertDate(
                            weaningDate
                        )}

                        <br>

                        <strong>Days Overdue:</strong>
                        ${Math.abs(
                            difference
                        )}

                        ${
                            record.total_weaned !== null &&
                            record.total_weaned !== undefined
                                ? `
                                    <br>
                                    <strong>Total Weaned:</strong>
                                    ${escapeAlertHTML(
                                        record.total_weaned
                                    )}
                                  `
                                : ""
                        }

                    `,

                    action:
                        "Review the weaning record and update the record after the weaning activity is completed.",

                    priority:
                        "Urgent",

                    icon:
                        "🍼",

                    date:
                        weaningDate,

                    source_id:
                        record.id
                });

                return;
            }


            if (difference === 0) {

                alerts.push({

                    type: "Weaning",

                    title:
                        "Weaning Due Today",

                    message:
                        `Sow ${record.sow_id || "Unknown"} has a litter scheduled for weaning today.`,

                    details: `

                        <strong>Sow ID:</strong>
                        ${escapeAlertHTML(
                            record.sow_id ||
                            "Not recorded"
                        )}

                        <br>

                        <strong>Weaning Date:</strong>
                        ${formatAlertDate(
                            weaningDate
                        )}

                        ${
                            record.total_weaned !== null &&
                            record.total_weaned !== undefined
                                ? `
                                    <br>
                                    <strong>Total Weaned:</strong>
                                    ${escapeAlertHTML(
                                        record.total_weaned
                                    )}
                                  `
                                : ""
                        }

                    `,

                    action:
                        "Prepare for the weaning activity and update the weaning record after completion.",

                    priority:
                        "Urgent",

                    icon:
                        "🍼",

                    date:
                        weaningDate,

                    source_id:
                        record.id
                });

                return;
            }


            if (
                difference > 0 &&
                difference <= 7
            ) {

                alerts.push({

                    type: "Weaning",

                    title:
                        "Upcoming Weaning",

                    message:
                        `Sow ${record.sow_id || "Unknown"} has a litter scheduled for weaning.`,

                    details: `

                        <strong>Sow ID:</strong>
                        ${escapeAlertHTML(
                            record.sow_id ||
                            "Not recorded"
                        )}

                        <br>

                        <strong>Weaning Date:</strong>
                        ${formatAlertDate(
                            weaningDate
                        )}

                        <br>

                        <strong>Days Remaining:</strong>
                        ${difference}

                        ${
                            record.total_weaned !== null &&
                            record.total_weaned !== undefined
                                ? `
                                    <br>
                                    <strong>Total Weaned:</strong>
                                    ${escapeAlertHTML(
                                        record.total_weaned
                                    )}
                                  `
                                : ""
                        }

                    `,

                    action:
                        "Prepare for the upcoming weaning activity.",

                    priority:
                        "Important",

                    icon:
                        "🍼",

                    date:
                        weaningDate,

                    source_id:
                        record.id
                });
            }

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
   NOT SERVICED
   ============================================================ */

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
            .eq(
                "farm_id",
                farmId
            );


        if (error) {

            console.error(
                "NOT SERVICED ERROR:",
                error
            );

            return alerts;
        }


        (data || []).forEach(record => {

            if (record.service_date) {
                return;
            }


            if (
                gestationStatusIsClosed(
                    record.status
                )
            ) {
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
                    ${escapeAlertHTML(
                        record.sow_id ||
                        "Not recorded"
                    )}

                    <br>

                    <strong>Registration Date:</strong>
                    ${formatAlertDate(
                        registrationDate
                    )}

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

                source_id:
                    record.id
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
   ============================================================

   CORRECT TABLE FIELDS
   --------------------
   pen_number
   feed_type
   quantity
   morning_feeding
   evening_feeding
   feeding_date
   farm_id

   ============================================================ */

async function loadFeedingAlerts(farmId) {

    const alerts = [];

    try {

        const {
            data,
            error
        } = await supabaseClient
            .from("feeding_records")
            .select(
                "id,record_id,feeding_date,pen_number,pig_category,breed,feed_type,feed_brand,quantity,morning_feeding,evening_feeding,farm_id"
            )
            .eq(
                "farm_id",
                farmId
            );


        if (error) {

            console.error(
                "FEEDING ERROR:",
                error
            );

            return alerts;
        }


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
                    alertToday()
                ) !== 0
            ) {
                return;
            }


            if (
                record.morning_feeding
            ) {

                alerts.push({

                    type: "Feeding",

                    title:
                        "Morning Feeding",

                    message:
                        `Morning feeding is scheduled for ${record.pen_number || "the pen"}.`,

                    details: `

                        <strong>Pen:</strong>
                        ${escapeAlertHTML(
                            record.pen_number ||
                            "Not recorded"
                        )}

                        <br>

                        <strong>Feed:</strong>
                        ${escapeAlertHTML(
                            record.feed_type ||
                            "Not recorded"
                        )}

                        <br>

                        <strong>Feed Brand:</strong>
                        ${escapeAlertHTML(
                            record.feed_brand ||
                            "Not recorded"
                        )}

                        <br>

                        <strong>Quantity:</strong>
                        ${escapeAlertHTML(
                            record.quantity ??
                            "Not recorded"
                        )}

                        <br>

                        <strong>Time:</strong>
                        ${formatAlertTime(
                            record.morning_feeding
                        )}

                    `,

                    action:
                        "Check the feed and complete the morning feeding as scheduled.",

                    priority: "Important",

                    icon: "🌅",

                    date: feedingDate,

                    source_id:
                        `${record.id}-morning`
                });
            }


            if (
                record.evening_feeding
            ) {

                alerts.push({

                    type: "Feeding",

                    title:
                        "Evening Feeding",

                    message:
                        `Evening feeding is scheduled for ${record.pen_number || "the pen"}.`,

                    details: `

                        <strong>Pen:</strong>
                        ${escapeAlertHTML(
                            record.pen_number ||
                            "Not recorded"
                        )}

                        <br>

                        <strong>Feed:</strong>
                        ${escapeAlertHTML(
                            record.feed_type ||
                            "Not recorded"
                        )}

                        <br>

                        <strong>Feed Brand:</strong>
                        ${escapeAlertHTML(
                            record.feed_brand ||
                            "Not recorded"
                        )}

                        <br>

                        <strong>Quantity:</strong>
                        ${escapeAlertHTML(
                            record.quantity ??
                            "Not recorded"
                        )}

                        <br>

                        <strong>Time:</strong>
                        ${formatAlertTime(
                            record.evening_feeding
                        )}

                    `,

                    action:
                        "Check the feed and complete the evening feeding as scheduled.",

                    priority: "Important",

                    icon: "🌙",

                    date: feedingDate,

                    source_id:
                        `${record.id}-evening`
                });
            }

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

        const {
            data,
            error
        } = await supabaseClient
            .from("feeding_records")
            .select(
                "id,feeding_date,pen_number,water_available,farm_id"
            )
            .eq(
                "farm_id",
                farmId
            );


        if (error) {

            console.error(
                "WATER ERROR:",
                error
            );

            return alerts;
        }


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
                    alertToday()
                ) !== 0
            ) {
                return;
            }


            const water =
                String(
                    record.water_available ||
                    ""
                )
                    .toLowerCase()
                    .trim();


            if (
                water === "yes" ||
                water === "available"
            ) {
                return;
            }


            alerts.push({

                type: "Water",

                title:
                    "Water Availability Check",

                message:
                    `Water availability has not been confirmed for ${record.pen_number || "the pen"}.`,

                details: `

                    <strong>Pen:</strong>
                    ${escapeAlertHTML(
                        record.pen_number ||
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
                    "Check the water supply and ensure clean water is available.",

                priority: "Urgent",

                icon: "💧",

                date: feedingDate,

                source_id:
                    record.id
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
   SORT ALERTS
   ============================================================ */

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
                🔄 Checking gestation, farrowing,
                weaning, feeding and farm records...
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
        "ALERT FARM ID:",
        farmId
    );


    if (!farmId) {

        console.error(
            "NO FARM ID FOUND."
        );


        if (status) {

            status.textContent =
                "Farm information could not be identified.";
        }


        if (container) {

            container.innerHTML = `

                <div class="farm-alert-error">

                    <h3>
                        ⚠️ Farm Information Missing
                    </h3>

                    <p>
                        The system could not identify
                        the farm connected to this account.
                    </p>

                </div>

            `;
        }

        return;
    }


    if (
        typeof supabaseClient ===
        "undefined"
    ) {

        console.error(
            "supabaseClient is not available."
        );


        if (status) {

            status.textContent =
                "Database connection is not available.";
        }

        return;
    }


    try {

        /*
           First load the alerts that the current
           Owner/Admin or user has already dismissed.
        */

        await loadDismissedFarmAlerts(
            farmId
        );


        const results =
            await Promise.all([

                /* =================================================
                   GESTATION
                   ================================================= */

                load21DayCheckAlerts(
                    farmId
                ),

                load90DayFeedUpAlerts(
                    farmId
                ),

                load101DayDewormerAlerts(
                    farmId
                ),

                load101DayLitterGuardAlerts(
                    farmId
                ),

                loadActionDayAlerts(
                    farmId
                ),

                load114DayAlerts(
                    farmId
                ),


                /* =================================================
                   FARROWING
                   ================================================= */

                loadFarrowingDay3Alerts(
                    farmId
                ),


                /* =================================================
                   WEANING
                   ================================================= */

                loadWeaningAlerts(
                    farmId
                ),


                /* =================================================
                   OTHER
                   ================================================= */

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


        /*
           Give every alert its unique key.
        */

        dashboardFarmAlerts =
            dashboardFarmAlerts.map(
                alert => {

                    alert.alert_key =
                        createFarmAlertKey(
                            alert
                        );

                    return alert;
                }
            );


        /*
           Remove alerts that have already
           been dismissed by Owner/Admin.
        */

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


    setTimeout(
        () => {

            loadDashboardFarmAlerts();

        },
        700
    );
}


/* ============================================================
   DOM READY
   ============================================================ */

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