/* ============================================================
   MUNKA PIGGERY MANAGEMENT SYSTEM
   DASHBOARD FARM ALERTS
   ============================================================ */

let dashboardFarmAlerts = [];

/* ============================================================
   DATE HELPERS
   ============================================================ */

function getTodayDate() {
    const now = new Date();

    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, "0");
    const day = String(now.getDate()).padStart(2, "0");

    return `${year}-${month}-${day}`;
}

function parseDate(dateValue) {
    if (!dateValue) return null;

    const date = new Date(dateValue);

    if (isNaN(date.getTime())) {
        return null;
    }

    return date;
}

function formatAlertDate(dateValue) {
    if (!dateValue) return "N/A";

    const date = parseDate(dateValue);

    if (!date) return "N/A";

    return date.toLocaleDateString("en-ZM", {
        day: "2-digit",
        month: "short",
        year: "numeric"
    });
}

function getDaysDifference(targetDate, todayDate = getTodayDate()) {
    const target = new Date(`${targetDate}T00:00:00`);
    const today = new Date(`${todayDate}T00:00:00`);

    return Math.round(
        (target - today) / (1000 * 60 * 60 * 24)
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
   USER / FARM HELPERS
   ============================================================ */

function getLoggedInUserForAlerts() {
    try {
        const storedUser = localStorage.getItem("loggedInUser");

        if (!storedUser) {
            return null;
        }

        return JSON.parse(storedUser);
    } catch (error) {
        console.error("Unable to read loggedInUser:", error);
        return null;
    }
}

function getFarmIdForAlerts() {
    const user = getLoggedInUserForAlerts();

    if (!user) {
        return null;
    }

    return user.farm_id || null;
}

/* ============================================================
   CREATE FARM ALERT SECTION
   ============================================================ */

function createFarmAlertsSection() {
    const existingSection = document.getElementById("farmAlertsSection");

    if (existingSection) {
        return existingSection;
    }

    const section = document.createElement("section");

    section.id = "farmAlertsSection";
    section.className = "farm-alerts-section";

    section.innerHTML = `
        <div class="farm-alerts-header">
            <div>
                <h2>Farm Alerts</h2>
                <p>Important farm activities and upcoming actions</p>
            </div>

            <div id="farmAlertsCount" class="farm-alerts-count">
                0
            </div>
        </div>

        <div id="farmAlertsContainer" class="farm-alerts-container">
            <div class="farm-alerts-loading">
                Loading farm alerts...
            </div>
        </div>
    `;

    const dashboard =
        document.querySelector(".dashboard-container") ||
        document.querySelector("main") ||
        document.body;

    dashboard.appendChild(section);

    return section;
}

/* ============================================================
   DISPLAY FARM ALERTS
   ============================================================ */

function displayFarmAlerts(alerts) {
    const container = document.getElementById("farmAlertsContainer");
    const countElement = document.getElementById("farmAlertsCount");

    if (!container) {
        console.warn("Farm alerts container not found.");
        return;
    }

    if (countElement) {
        countElement.textContent = alerts.length;
    }

    if (!alerts || alerts.length === 0) {
        container.innerHTML = `
            <div class="farm-alerts-empty">
                <div class="empty-alert-icon">✓</div>
                <h3>No Farm Alerts</h3>
                <p>There are no important farm activities requiring attention at the moment.</p>
            </div>
        `;

        return;
    }

    container.innerHTML = alerts
        .map(alert => createFarmAlertCard(alert))
        .join("");
}

/* ============================================================
   CREATE FARM ALERT CARD
   ============================================================ */

function createFarmAlertCard(alert) {
    const priority = alert.priority || "Important";

    let priorityClass = "important";

    if (priority.toLowerCase() === "urgent") {
        priorityClass = "urgent";
    }

    if (priority.toLowerCase() === "normal") {
        priorityClass = "normal";
    }

    return `
        <div class="farm-alert-card ${priorityClass}">

            <div class="farm-alert-icon">
                ${alert.icon || "🔔"}
            </div>

            <div class="farm-alert-content">

                <div class="farm-alert-top">
                    <h3>${escapeAlertHTML(alert.title)}</h3>

                    <span class="farm-alert-priority ${priorityClass}">
                        ${escapeAlertHTML(priority)}
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

            </div>
        </div>
    `;
}

/* ============================================================
   GESTATION CLOSED CHECK
   ============================================================ */

function gestationStatusIsClosed(record) {
    if (!record) {
        return false;
    }

    const status = String(record.status || "")
        .trim()
        .toLowerCase();

    return [
        "closed",
        "completed",
        "complete",
        "farrowed",
        "cancelled",
        "canceled"
    ].includes(status);
}

/* ============================================================
   21-DAY CHECK ALERTS
   ============================================================ */

async function load21DayCheckAlerts(farmId) {
    try {
        const { data, error } = await supabaseClient
            .from("gestation_records")
            .select(`
                id,
                sow_id,
                service_date,
                check_21_day,
                status,
                farm_id
            `)
            .eq("farm_id", farmId);

        if (error) {
            console.error("21-Day Check alerts error:", error);
            return [];
        }

        const today = getTodayDate();

        return (data || [])
            .filter(record => {
                if (gestationStatusIsClosed(record)) {
                    return false;
                }

                return record.check_21_day === today;
            })
            .map(record => ({
                type: "21-Day Check",
                title: "21-Day Pregnancy Check",
                message: `Pregnancy check is due for Sow ${record.sow_id}.`,
                priority: "Urgent",
                icon: "🩺",
                details: `
                    <strong>Sow ID:</strong> ${escapeAlertHTML(record.sow_id)}
                    &nbsp; | &nbsp;
                    <strong>Check Date:</strong> ${formatAlertDate(record.check_21_day)}
                `
            }));

    } catch (error) {
        console.error("Unexpected 21-Day Check error:", error);
        return [];
    }
}

/* ============================================================
   90-DAY FEED UP ALERTS
   ============================================================ */

async function load90DayFeedUpAlerts(farmId) {
    try {
        const { data, error } = await supabaseClient
            .from("gestation_records")
            .select(`
                id,
                sow_id,
                feed_up_date,
                status,
                farm_id
            `)
            .eq("farm_id", farmId);

        if (error) {
            console.error("90-Day Feed Up alerts error:", error);
            return [];
        }

        const today = getTodayDate();

        return (data || [])
            .filter(record => {
                if (gestationStatusIsClosed(record)) {
                    return false;
                }

                return record.feed_up_date === today;
            })
            .map(record => ({
                type: "90-Day Feed Up",
                title: "90-Day Feed Up",
                message: `Feed-up activity is due for Sow ${record.sow_id}.`,
                priority: "Important",
                icon: "🌾",
                details: `
                    <strong>Sow ID:</strong> ${escapeAlertHTML(record.sow_id)}
                    &nbsp; | &nbsp;
                    <strong>Date:</strong> ${formatAlertDate(record.feed_up_date)}
                `
            }));

    } catch (error) {
        console.error("Unexpected 90-Day Feed Up error:", error);
        return [];
    }
}

/* ============================================================
   101-DAY DEWORMER ALERTS
   ============================================================ */

async function load101DayDewormerAlerts(farmId) {
    try {
        const { data, error } = await supabaseClient
            .from("gestation_records")
            .select(`
                id,
                sow_id,
                dewormer_date,
                status,
                farm_id
            `)
            .eq("farm_id", farmId);

        if (error) {
            console.error("101-Day Dewormer alerts error:", error);
            return [];
        }

        const today = getTodayDate();

        return (data || [])
            .filter(record => {
                if (gestationStatusIsClosed(record)) {
                    return false;
                }

                return record.dewormer_date === today;
            })
            .map(record => ({
                type: "101-Day Dewormer",
                title: "101-Day Dewormer",
                message: `Dewormer activity is due for Sow ${record.sow_id}.`,
                priority: "Important",
                icon: "💊",
                details: `
                    <strong>Sow ID:</strong> ${escapeAlertHTML(record.sow_id)}
                    &nbsp; | &nbsp;
                    <strong>Date:</strong> ${formatAlertDate(record.dewormer_date)}
                `
            }));

    } catch (error) {
        console.error("Unexpected 101-Day Dewormer error:", error);
        return [];
    }
}

/* ============================================================
   101-DAY LITTER GUARD ALERTS
   ============================================================ */

async function load101DayLitterGuardAlerts(farmId) {
    try {
        const { data, error } = await supabaseClient
            .from("gestation_records")
            .select(`
                id,
                sow_id,
                litter_guard_date,
                status,
                farm_id
            `)
            .eq("farm_id", farmId);

        if (error) {
            console.error("101-Day Litter Guard alerts error:", error);
            return [];
        }

        const today = getTodayDate();

        return (data || [])
            .filter(record => {
                if (gestationStatusIsClosed(record)) {
                    return false;
                }

                return record.litter_guard_date === today;
            })
            .map(record => ({
                type: "101-Day Litter Guard",
                title: "101-Day Litter Guard",
                message: `Litter Guard activity is due for Sow ${record.sow_id}.`,
                priority: "Important",
                icon: "🛡️",
                details: `
                    <strong>Sow ID:</strong> ${escapeAlertHTML(record.sow_id)}
                    &nbsp; | &nbsp;
                    <strong>Date:</strong> ${formatAlertDate(record.litter_guard_date)}
                `
            }));

    } catch (error) {
        console.error("Unexpected 101-Day Litter Guard error:", error);
        return [];
    }
}

/* ============================================================
   107-DAY ACTION DAY ALERTS
   ============================================================ */

async function loadActionDayAlerts(farmId) {
    try {
        const { data, error } = await supabaseClient
            .from("gestation_records")
            .select(`
                id,
                sow_id,
                action_date,
                status,
                farm_id
            `)
            .eq("farm_id", farmId);

        if (error) {
            console.error("107-Day Action Day alerts error:", error);
            return [];
        }

        const today = getTodayDate();

        return (data || [])
            .filter(record => {
                if (gestationStatusIsClosed(record)) {
                    return false;
                }

                return record.action_date === today;
            })
            .map(record => ({
                type: "107-Day Action Day",
                title: "107-Day Action Day",
                message: `Action-day preparations are due for Sow ${record.sow_id}.`,
                priority: "Urgent",
                icon: "⚠️",
                details: `
                    <strong>Sow ID:</strong> ${escapeAlertHTML(record.sow_id)}
                    &nbsp; | &nbsp;
                    <strong>Date:</strong> ${formatAlertDate(record.action_date)}
                `
            }));

    } catch (error) {
        console.error("Unexpected Action Day error:", error);
        return [];
    }
}

/* ============================================================
   114-DAY EXPECTED FARROWING ALERTS
   ============================================================ */

async function load114DayAlerts(farmId) {
    try {
        const { data, error } = await supabaseClient
            .from("gestation_records")
            .select(`
                id,
                sow_id,
                expected_farrowing_date,
                status,
                farm_id
            `)
            .eq("farm_id", farmId);

        if (error) {
            console.error("114-Day alerts error:", error);
            return [];
        }

        const today = getTodayDate();

        return (data || [])
            .filter(record => {
                if (gestationStatusIsClosed(record)) {
                    return false;
                }

                return record.expected_farrowing_date === today;
            })
            .map(record => ({
                type: "114-Day Farrowing",
                title: "Expected Farrowing Today",
                message: `Sow ${record.sow_id} is expected to farrow today.`,
                priority: "Urgent",
                icon: "🐖",
                details: `
                    <strong>Sow ID:</strong> ${escapeAlertHTML(record.sow_id)}
                    &nbsp; | &nbsp;
                    <strong>Expected Date:</strong>
                    ${formatAlertDate(record.expected_farrowing_date)}
                `
            }));

    } catch (error) {
        console.error("Unexpected 114-Day error:", error);
        return [];
    }
}

/* ============================================================
   FARROWING DAY 3 ALERTS
   ============================================================ */

async function loadFarrowingDay3Alerts(farmId) {
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
                weaning_date,
                farm_id
            `)
            .eq("farm_id", farmId);

        if (error) {
            console.error("Farrowing alerts error:", error);
            return [];
        }

        const today = getTodayDate();
        const alerts = [];

        (data || []).forEach(record => {

            if (record.iron_date === today) {
                alerts.push({
                    type: "Iron Injection",
                    title: "Iron Injection Due",
                    message: `Iron injection is due for Sow ${record.sow_id}.`,
                    priority: "Urgent",
                    icon: "💉",
                    details: `
                        <strong>Sow ID:</strong>
                        ${escapeAlertHTML(record.sow_id)}
                        &nbsp; | &nbsp;
                        <strong>Iron Date:</strong>
                        ${formatAlertDate(record.iron_date)}
                    `
                });
            }

            if (record.teeth_date === today) {
                alerts.push({
                    type: "Teeth Clipping",
                    title: "Teeth Clipping Due",
                    message: `Teeth clipping is scheduled for Sow ${record.sow_id}'s litter.`,
                    priority: "Important",
                    icon: "🦷",
                    details: `
                        <strong>Sow ID:</strong>
                        ${escapeAlertHTML(record.sow_id)}
                        &nbsp; | &nbsp;
                        <strong>Date:</strong>
                        ${formatAlertDate(record.teeth_date)}
                    `
                });
            }

            if (record.tail_date === today) {
                alerts.push({
                    type: "Tail Docking",
                    title: "Tail Docking Due",
                    message: `Tail docking is scheduled for Sow ${record.sow_id}'s litter.`,
                    priority: "Important",
                    icon: "🐷",
                    details: `
                        <strong>Sow ID:</strong>
                        ${escapeAlertHTML(record.sow_id)}
                        &nbsp; | &nbsp;
                        <strong>Date:</strong>
                        ${formatAlertDate(record.tail_date)}
                    `
                });
            }

            if (record.weaning_date === today) {
                alerts.push({
                    type: "Weaning",
                    title: "Weaning Due Today",
                    message: `Weaning is scheduled for Sow ${record.sow_id}.`,
                    priority: "Urgent",
                    icon: "🐖",
                    details: `
                        <strong>Sow ID:</strong>
                        ${escapeAlertHTML(record.sow_id)}
                        &nbsp; | &nbsp;
                        <strong>Weaning Date:</strong>
                        ${formatAlertDate(record.weaning_date)}
                    `
                });
            }
        });

        return alerts;

    } catch (error) {
        console.error("Unexpected Farrowing Day 3 error:", error);
        return [];
    }
}

/* ============================================================
   WEANING ALERTS
   USING weaning_records TABLE
   ============================================================ */

async function loadWeaningAlerts(farmId) {
    try {
        const { data, error } = await supabaseClient
            .from("weaning_records")
            .select(`
                id,
                sow_id,
                farrow_date,
                weaning_date,
                total_born,
                male_weaned,
                female_weaned,
                total_weaned,
                average_weight,
                mortality,
                destination_pen,
                remarks,
                farm_id
            `)
            .eq("farm_id", farmId);

        if (error) {
            console.error("Weaning alerts error:", error);
            return [];
        }

        const today = getTodayDate();

        return (data || [])
            .filter(record => {

                if (!record.weaning_date) {
                    return false;
                }

                const daysDifference = getDaysDifference(
                    record.weaning_date,
                    today
                );

                /*
                    Show:
                    - overdue up to 7 days
                    - today
                    - upcoming within 7 days
                */

                return daysDifference >= -7 && daysDifference <= 7;
            })
            .map(record => {

                const daysDifference = getDaysDifference(
                    record.weaning_date,
                    today
                );

                let title;
                let message;
                let priority;
                let icon = "🐖";

                if (daysDifference < 0) {
                    title = "Overdue Weaning";

                    message =
                        `Weaning for Sow ${record.sow_id} is overdue by ` +
                        `${Math.abs(daysDifference)} day(s).`;

                    priority = "Urgent";
                    icon = "⚠️";

                } else if (daysDifference === 0) {
                    title = "Weaning Due Today";

                    message =
                        `Weaning is due today for Sow ${record.sow_id}.`;

                    priority = "Urgent";

                } else {
                    title = "Upcoming Weaning";

                    message =
                        `Weaning for Sow ${record.sow_id} is due in ` +
                        `${daysDifference} day(s).`;

                    priority = "Important";
                }

                return {
                    type: "Weaning",
                    title,
                    message,
                    priority,
                    icon,

                    details: `
                        <strong>Sow ID:</strong>
                        ${escapeAlertHTML(record.sow_id)}
                        &nbsp; | &nbsp;

                        <strong>Weaning Date:</strong>
                        ${formatAlertDate(record.weaning_date)}
                        &nbsp; | &nbsp;

                        <strong>Total Weaned:</strong>
                        ${record.total_weaned ?? 0}
                    `
                };
            });

    } catch (error) {
        console.error("Unexpected Weaning error:", error);
        return [];
    }
}

/* ============================================================
   NOT SERVICED ALERTS
   ============================================================ */

async function loadNotServicedAlerts(farmId) {
    try {
        const { data, error } = await supabaseClient
            .from("pigs")
            .select(`
                id,
                pig_id,
                sex,
                status,
                farm_id
            `)
            .eq("farm_id", farmId);

        if (error) {
            console.error("Not Serviced alerts error:", error);
            return [];
        }

        return (data || [])
            .filter(pig => {
                const sex = String(pig.sex || "")
                    .trim()
                    .toLowerCase();

                const status = String(pig.status || "")
                    .trim()
                    .toLowerCase();

                return (
                    sex === "female" &&
                    (
                        status === "not serviced" ||
                        status === "not_serviced"
                    )
                );
            })
            .map(pig => ({
                type: "Not Serviced",
                title: "Sow Not Serviced",
                message: `Female pig ${pig.pig_id} has not been serviced.`,
                priority: "Important",
                icon: "🐖",
                details: `
                    <strong>Pig ID:</strong>
                    ${escapeAlertHTML(pig.pig_id)}
                    &nbsp; | &nbsp;

                    <strong>Status:</strong>
                    Not Serviced
                `
            }));

    } catch (error) {
        console.error("Unexpected Not Serviced error:", error);
        return [];
    }
}

/* ============================================================
   FEEDING ALERTS
   USING CORRECT feeding_records SCHEMA
   ============================================================ */

async function loadFeedingAlerts(farmId) {
    try {
        const { data, error } = await supabaseClient
            .from("feeding_records")
            .select(`
                id,
                record_id,
                feeding_date,
                pen_number,
                pig_category,
                breed,
                feed_type,
                feed_brand,
                quantity,
                morning_feeding,
                evening_feeding,
                water_available,
                responsible_person,
                remarks,
                farm_id
            `)
            .eq("farm_id", farmId);

        if (error) {
            console.error("Feeding alerts error:", error);
            return [];
        }

        const today = getTodayDate();
        const alerts = [];

        (data || []).forEach(record => {

            /*
             * Only show feeding schedules recorded for TODAY.
             */

            if (record.feeding_date !== today) {
                return;
            }

            /* ------------------------------------------------
               MORNING FEEDING
               ------------------------------------------------ */

            if (record.morning_feeding) {

                alerts.push({
                    type: "Feeding",
                    title: "Morning Feeding",
                    message:
                        `Morning feeding is scheduled for ` +
                        `${record.pen_number || "the pen"}.`,
                    priority: "Important",
                    icon: "🌅",

                    details: `
                        <strong>Pen:</strong>
                        ${escapeAlertHTML(record.pen_number || "N/A")}
                        &nbsp; | &nbsp;

                        <strong>Pig Category:</strong>
                        ${escapeAlertHTML(record.pig_category || "N/A")}
                        &nbsp; | &nbsp;

                        <strong>Feed:</strong>
                        ${escapeAlertHTML(record.feed_type || "N/A")}
                        &nbsp; | &nbsp;

                        <strong>Feed Brand:</strong>
                        ${escapeAlertHTML(record.feed_brand || "N/A")}
                        &nbsp; | &nbsp;

                        <strong>Quantity:</strong>
                        ${record.quantity ?? "N/A"}
                        &nbsp; | &nbsp;

                        <strong>Time:</strong>
                        ${escapeAlertHTML(record.morning_feeding)}
                    `
                });
            }

            /* ------------------------------------------------
               EVENING FEEDING
               ------------------------------------------------ */

            if (record.evening_feeding) {

                alerts.push({
                    type: "Feeding",
                    title: "Evening Feeding",
                    message:
                        `Evening feeding is scheduled for ` +
                        `${record.pen_number || "the pen"}.`,
                    priority: "Important",
                    icon: "🌙",

                    details: `
                        <strong>Pen:</strong>
                        ${escapeAlertHTML(record.pen_number || "N/A")}
                        &nbsp; | &nbsp;

                        <strong>Pig Category:</strong>
                        ${escapeAlertHTML(record.pig_category || "N/A")}
                        &nbsp; | &nbsp;

                        <strong>Feed:</strong>
                        ${escapeAlertHTML(record.feed_type || "N/A")}
                        &nbsp; | &nbsp;

                        <strong>Feed Brand:</strong>
                        ${escapeAlertHTML(record.feed_brand || "N/A")}
                        &nbsp; | &nbsp;

                        <strong>Quantity:</strong>
                        ${record.quantity ?? "N/A"}
                        &nbsp; | &nbsp;

                        <strong>Time:</strong>
                        ${escapeAlertHTML(record.evening_feeding)}
                    `
                });
            }
        });

        return alerts;

    } catch (error) {
        console.error("Unexpected Feeding error:", error);
        return [];
    }
}

/* ============================================================
   WATER ALERTS
   USING CORRECT feeding_records SCHEMA
   ============================================================ */

async function loadWaterAlerts(farmId) {
    try {
        const { data, error } = await supabaseClient
            .from("feeding_records")
            .select(`
                id,
                feeding_date,
                pen_number,
                water_available,
                farm_id
            `)
            .eq("farm_id", farmId);

        if (error) {
            console.error("Water alerts error:", error);
            return [];
        }

        const today = getTodayDate();
        const alerts = [];

        (data || []).forEach(record => {

            if (record.feeding_date !== today) {
                return;
            }

            const waterStatus = String(
                record.water_available || ""
            )
                .trim()
                .toLowerCase();

            /*
             * "Yes" and "Available" mean water is available.
             * Anything else is treated as requiring attention.
             */

            const waterConfirmed =
                waterStatus === "yes" ||
                waterStatus === "available";

            if (!waterConfirmed) {

                alerts.push({
                    type: "Water",
                    title: "Water Availability Check",
                    message:
                        `Water availability needs attention for ` +
                        `${record.pen_number || "the pen"}.`,
                    priority: "Urgent",
                    icon: "💧",

                    details: `
                        <strong>Pen:</strong>
                        ${escapeAlertHTML(record.pen_number || "N/A")}
                        &nbsp; | &nbsp;

                        <strong>Water Status:</strong>
                        ${escapeAlertHTML(record.water_available || "Not Available")}
                    `
                });
            }
        });

        return alerts;

    } catch (error) {
        console.error("Unexpected Water error:", error);
        return [];
    }
}

/* ============================================================
   SORT DASHBOARD ALERTS
   ============================================================ */

function sortDashboardAlerts(alerts) {

    const priorityOrder = {
        Urgent: 1,
        Important: 2,
        Normal: 3
    };

    return alerts.sort((a, b) => {

        const priorityA =
            priorityOrder[a.priority] || 99;

        const priorityB =
            priorityOrder[b.priority] || 99;

        return priorityA - priorityB;
    });
}

/* ============================================================
   LOAD ALL DASHBOARD FARM ALERTS
   ============================================================ */

async function loadDashboardFarmAlerts() {

    try {

        const farmId = getFarmIdForAlerts();

        if (!farmId) {

            console.warn(
                "No farm ID found for dashboard alerts."
            );

            displayFarmAlerts([]);

            return;
        }

        createFarmAlertsSection();

        const results = await Promise.all([

            load21DayCheckAlerts(farmId),

            load90DayFeedUpAlerts(farmId),

            load101DayDewormerAlerts(farmId),

            load101DayLitterGuardAlerts(farmId),

            loadActionDayAlerts(farmId),

            load114DayAlerts(farmId),

            loadFarrowingDay3Alerts(farmId),

            loadWeaningAlerts(farmId),

            loadNotServicedAlerts(farmId),

            loadFeedingAlerts(farmId),

            loadWaterAlerts(farmId)

        ]);

        dashboardFarmAlerts = results.flat();

        dashboardFarmAlerts =
            sortDashboardAlerts(dashboardFarmAlerts);

        displayFarmAlerts(dashboardFarmAlerts);

        console.log(
            "Farm alerts loaded:",
            dashboardFarmAlerts
        );

    } catch (error) {

        console.error(
            "Failed to load dashboard farm alerts:",
            error
        );

        displayFarmAlerts([]);
    }
}

/* ============================================================
   INITIALIZE DASHBOARD FARM ALERTS
   ============================================================ */

function initializeDashboardFarmAlerts() {

    console.log(
        "Initializing MUNKA PIGGERY Farm Alerts..."
    );

    createFarmAlertsSection();

    loadDashboardFarmAlerts();
}

/* ============================================================
   DOM READY
   ============================================================ */

document.addEventListener("DOMContentLoaded", function () {

    initializeDashboardFarmAlerts();

});