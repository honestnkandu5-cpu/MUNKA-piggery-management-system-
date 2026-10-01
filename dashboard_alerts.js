// ============================================================
// MUNKA PIGGERY MANAGEMENT SYSTEM
// DASHBOARD FARM ALERTS
// ============================================================

let dashboardFarmAlerts = [];


// ============================================================
// BASIC HELPERS
// ============================================================

function alertDateOnly(value) {

    if (!value) return null;

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
        return null;
    }

    date.setHours(0, 0, 0, 0);

    return date;
}


function alertToday() {

    const date = new Date();

    date.setHours(0, 0, 0, 0);

    return date;
}


function alertDaysFromToday(days) {

    const date = alertToday();

    date.setDate(date.getDate() + days);

    return date;
}


function alertIsToday(date) {

    if (!date) return false;

    return date.getTime() === alertToday().getTime();
}


function alertIsWithinNextDays(date, days) {

    if (!date) return false;

    const today = alertToday();

    const future = alertDaysFromToday(days);

    return date >= today && date <= future;
}


function formatAlertDate(value) {

    if (!value) {
        return "Date not available";
    }

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
        return "Date not available";
    }

    return date.toLocaleDateString("en-ZM", {
        day: "2-digit",
        month: "short",
        year: "numeric"
    });
}


function formatAlertTime(value) {

    if (!value) {
        return "Time not set";
    }

    const parts = String(value).split(":");

    if (parts.length < 2) {
        return value;
    }

    let hours = Number(parts[0]);

    const minutes = parts[1];

    if (Number.isNaN(hours)) {
        return value;
    }

    const suffix = hours >= 12 ? "PM" : "AM";

    hours = hours % 12;

    if (hours === 0) {
        hours = 12;
    }

    return `${hours}:${minutes} ${suffix}`;
}


// ============================================================
// GET LOGGED-IN USER
// ============================================================

function getAlertsLoggedInUser() {

    try {

        const storedUser =
            localStorage.getItem("loggedInUser");

        if (!storedUser) {
            return null;
        }

        return JSON.parse(storedUser);

    } catch (error) {

        console.error(
            "Could not read loggedInUser:",
            error
        );

        return null;
    }
}


// ============================================================
// GET FARM ID
// ============================================================

function getAlertsFarmId() {

    const user =
        getAlertsLoggedInUser();

    if (!user) {
        return null;
    }

    const farmId =
        user.farm_id ||
        window.dashboardCurrentFarmId;

    if (!farmId) {
        return null;
    }

    return Number(farmId);
}


// ============================================================
// CREATE ALERT PANEL
// ============================================================

function createDashboardAlertsPanel() {

    if (
        document.getElementById(
            "farmAlertsSection"
        )
    ) {
        return;
    }

    const section =
        document.createElement("section");

    section.id =
        "farmAlertsSection";

    section.className =
        "farm-alerts-section";

    section.innerHTML = `

        <div class="alerts-heading">

            <div>

                <h2>
                    Farm Alerts

                    <span
                        id="farmAlertsCount"
                        class="alerts-count"
                    >
                        0
                    </span>

                </h2>

                <p>
                    Important farm activities requiring attention.
                </p>

            </div>

            <button
                type="button"
                id="refreshFarmAlertsButton"
                class="secondary-button"
            >
                Refresh Alerts
            </button>

        </div>

        <div
            id="farmAlertsStatus"
            class="farm-alerts-status"
        >
            Checking farm activities...
        </div>

        <div
            id="farmAlertsContainer"
            class="farm-alerts-container"
        ></div>

    `;

    const statisticsSection =
        document.getElementById(
            "farmStatisticsSection"
        );

    const announcementsSection =
        document.getElementById(
            "announcementsSection"
        );

    if (statisticsSection) {

        statisticsSection.insertAdjacentElement(
            "afterend",
            section
        );

    } else if (announcementsSection) {

        announcementsSection.insertAdjacentElement(
            "afterend",
            section
        );

    } else {

        document.body.appendChild(section);
    }


    const refreshButton =
        document.getElementById(
            "refreshFarmAlertsButton"
        );

    if (refreshButton) {

        refreshButton.addEventListener(
            "click",
            loadDashboardFarmAlerts
        );
    }
}


// ============================================================
// PRIORITY CLASS
// ============================================================

function getFarmAlertPriorityClass(priority) {

    const value =
        String(priority || "Normal")
            .toLowerCase();

    if (value === "urgent") {
        return "urgent";
    }

    if (value === "important") {
        return "important";
    }

    return "normal";
}


// ============================================================
// CREATE ALERT CARD
// ============================================================

function createFarmAlertCard(alert) {

    const card =
        document.createElement("div");

    card.className =
        `farm-alert-card ${getFarmAlertPriorityClass(
            alert.priority
        )}`;

    card.innerHTML = `

        <div class="farm-alert-top">

            <div class="farm-alert-icon">
                ${alert.icon || "⚠️"}
            </div>

            <div>

                <h3 class="farm-alert-heading">
                    ${alert.title || "Farm Alert"}
                </h3>

                <div class="farm-alert-type">
                    ${alert.type || "Farm Alert"}
                </div>

            </div>

            <span class="farm-alert-priority">
                ${alert.priority || "Normal"}
            </span>

        </div>

        <div class="farm-alert-body">

            <p class="farm-alert-message">
                ${alert.message || ""}
            </p>

            ${
                alert.details
                    ? `
                        <div class="farm-alert-detail">
                            ${alert.details}
                        </div>
                    `
                    : ""
            }

            ${
                alert.action
                    ? `
                        <div class="farm-alert-action">
                            ${alert.action}
                        </div>
                    `
                    : ""
            }

        </div>
    `;

    return card;
}


// ============================================================
// DISPLAY ALERTS
// ============================================================

function displayDashboardFarmAlerts() {

    const container =
        document.getElementById(
            "farmAlertsContainer"
        );

    const countElement =
        document.getElementById(
            "farmAlertsCount"
        );

    const statusElement =
        document.getElementById(
            "farmAlertsStatus"
        );

    if (!container) {
        return;
    }

    container.innerHTML = "";


    if (countElement) {

        countElement.textContent =
            dashboardFarmAlerts.length;
    }


    if (statusElement) {

        statusElement.textContent =
            `${dashboardFarmAlerts.length} alert${
                dashboardFarmAlerts.length === 1
                    ? ""
                    : "s"
            } requiring attention`;
    }


    if (
        dashboardFarmAlerts.length === 0
    ) {

        container.innerHTML = `

            <div class="no-farm-alerts">

                <div class="farm-alert-icon">
                    ✓
                </div>

                <h3>
                    No active alerts
                </h3>

                <p>
                    There are currently no farm activities
                    requiring immediate attention.
                </p>

            </div>
        `;

        return;
    }


    dashboardFarmAlerts.forEach(
        alert => {

            container.appendChild(
                createFarmAlertCard(alert)
            );

        }
    );
}


// ============================================================
// WEANING ALERTS
// ============================================================

async function loadWeaningAlerts(farmId) {

    const alerts = [];

    try {

        const { data, error } =
            await supabase
                .from("farrowing_records")
                .select(
                    "id,sow_id,weaning_date,farm_id"
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


        (data || []).forEach(
            record => {

                const weaningDate =
                    alertDateOnly(
                        record.weaning_date
                    );

                if (
                    !weaningDate ||
                    !alertIsWithinNextDays(
                        weaningDate,
                        7
                    )
                ) {
                    return;
                }

                const today =
                    alertIsToday(
                        weaningDate
                    );

                alerts.push({

                    type: "Weaning",

                    title: today
                        ? "Weaning is Ready"
                        : "Upcoming Weaning",

                    message: today
                        ? `Sow ${
                            record.sow_id ||
                            "Unknown"
                          } is due for weaning today.`
                        : `Sow ${
                            record.sow_id ||
                            "Unknown"
                          } is approaching the weaning date.`,

                    details: `
                        <strong>Weaning Date:</strong>
                        ${formatAlertDate(
                            record.weaning_date
                        )}
                        <br>
                        <strong>Sow ID:</strong>
                        ${
                            record.sow_id ||
                            "Not recorded"
                        }
                    `,

                    action: today
                        ? "Check the litter and complete the weaning record."
                        : "Prepare for the upcoming weaning activity.",

                    priority: today
                        ? "Urgent"
                        : "Important",

                    icon: "🐷",

                    date: weaningDate

                });

            }
        );

    } catch (error) {

        console.error(
            "WEANING ALERT EXCEPTION:",
            error
        );
    }

    return alerts;
}


// ============================================================
// ACTION DAY ALERTS
// ============================================================

async function loadActionDayAlerts(farmId) {

    const alerts = [];

    try {

        const { data, error } =
            await supabase
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


        (data || []).forEach(
            record => {

                const actionDate =
                    alertDateOnly(
                        record.action_day
                    );

                if (
                    !actionDate ||
                    !alertIsWithinNextDays(
                        actionDate,
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
                    status === "farrowed" ||
                    status === "cancelled" ||
                    status === "closed"
                ) {
                    return;
                }


                const today =
                    alertIsToday(
                        actionDate
                    );


                alerts.push({

                    type: "Gestation",

                    title: today
                        ? "Action Day is Ready"
                        : "Upcoming Action Day",

                    message: today
                        ? `Sow ${
                            record.sow_id ||
                            "Unknown"
                          } is ready for Action Day today.`
                        : `Sow ${
                            record.sow_id ||
                            "Unknown"
                          } has an upcoming Action Day.`,

                    details: `
                        <strong>Action Day:</strong>
                        ${formatAlertDate(
                            record.action_day
                        )}
                        <br>
                        <strong>Sow ID:</strong>
                        ${
                            record.sow_id ||
                            "Not recorded"
                        }
                        <br>
                        <strong>Status:</strong>
                        ${
                            record.status ||
                            "Not recorded"
                        }
                    `,

                    action: today
                        ? "Carry out the required Action Day procedures."
                        : "Prepare for the Action Day activities.",

                    priority: today
                        ? "Urgent"
                        : "Important",

                    icon: "📅",

                    date: actionDate

                });

            }
        );

    } catch (error) {

        console.error(
            "ACTION DAY ALERT EXCEPTION:",
            error
        );
    }

    return alerts;
}


// ============================================================
// NOT SERVICED ALERTS
// ============================================================

async function loadNotServicedAlerts(farmId) {

    const alerts = [];

    try {

        const { data, error } =
            await supabase
                .from("gestation_records")
                .select(
                    "id,sow_id,registration_date,service_date,status,farm_id"
                )
                .eq("farm_id", farmId);

        if (error) {

            console.error(
                "NOT SERVICED ALERT ERROR:",
                error
            );

            return alerts;
        }


        const today =
            alertToday();


        (data || []).forEach(
            record => {

                if (record.service_date) {
                    return;
                }


                const registrationDate =
                    alertDateOnly(
                        record.registration_date
                    );

                if (!registrationDate) {
                    return;
                }


                const daysSinceRegistration =
                    Math.floor(
                        (
                            today.getTime() -
                            registrationDate.getTime()
                        ) /
                        (
                            1000 *
                            60 *
                            60 *
                            24
                        )
                    );


                if (
                    daysSinceRegistration < 1
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
                    status === "farrowed" ||
                    status === "cancelled" ||
                    status === "closed"
                ) {
                    return;
                }


                alerts.push({

                    type: "Breeding",

                    title:
                        "Sow Not Serviced",

                    message:
                        `Sow ${
                            record.sow_id ||
                            "Unknown"
                        } has no service date recorded.`,

                    details: `
                        <strong>Sow ID:</strong>
                        ${
                            record.sow_id ||
                            "Not recorded"
                        }
                        <br>
                        <strong>Registration Date:</strong>
                        ${formatAlertDate(
                            record.registration_date
                        )}
                        <br>
                        <strong>Days Since Registration:</strong>
                        ${daysSinceRegistration}
                    `,

                    action:
                        "Check the sow and update the service record when appropriate.",

                    priority:
                        daysSinceRegistration >= 3
                            ? "Urgent"
                            : "Important",

                    icon:
                        "⚠️",

                    date:
                        registrationDate

                });

            }
        );

    } catch (error) {

        console.error(
            "NOT SERVICED ALERT EXCEPTION:",
            error
        );
    }

    return alerts;
}


// ============================================================
// FEEDING ALERTS
// ============================================================

async function loadFeedingAlerts(farmId) {

    const alerts = [];

    try {

        const { data, error } =
            await supabase
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
                    responsible_person,
                    farm_id
                `)
                .eq(
                    "farm_id",
                    farmId
                );


        if (error) {

            console.error(
                "FEEDING ALERT ERROR:",
                error
            );

            return alerts;
        }


        const today =
            alertToday();


        (data || []).forEach(
            record => {

                const feedingDate =
                    alertDateOnly(
                        record.feeding_date
                    );

                if (!feedingDate) {
                    return;
                }


                if (
                    feedingDate.getTime() !==
                    today.getTime()
                ) {
                    return;
                }


                // MORNING FEEDING
                if (
                    record.morning_feeding
                ) {

                    alerts.push({

                        type:
                            "Feeding",

                        title:
                            "Morning Feeding Required",

                        message:
                            `Morning feeding is scheduled for ${
                                formatAlertTime(
                                    record.morning_feeding
                                )
                            }.`,

                        details: `
                            <strong>Pen:</strong>
                            ${
                                record.pen_number ||
                                "Not recorded"
                            }
                            <br>

                            <strong>Pig Category:</strong>
                            ${
                                record.pig_category ||
                                "Not recorded"
                            }
                            <br>

                            <strong>Feed:</strong>
                            ${
                                record.feed_type ||
                                "Not recorded"
                            }
                            <br>

                            <strong>Quantity:</strong>
                            ${
                                record.quantity ??
                                "Not recorded"
                            }
                            <br>

                            <strong>Responsible Person:</strong>
                            ${
                                record.responsible_person ||
                                "Not recorded"
                            }
                        `,

                        action:
                            "Check the feeding schedule and make sure the pigs receive their morning feed.",

                        priority:
                            "Important",

                        icon:
                            "🌾",

                        date:
                            feedingDate

                    });
                }


                // EVENING FEEDING
                if (
                    record.evening_feeding
                ) {

                    alerts.push({

                        type:
                            "Feeding",

                        title:
                            "Evening Feeding Required",

                        message:
                            `Evening feeding is scheduled for ${
                                formatAlertTime(
                                    record.evening_feeding
                                )
                            }.`,

                        details: `
                            <strong>Pen:</strong>
                            ${
                                record.pen_number ||
                                "Not recorded"
                            }
                            <br>

                            <strong>Pig Category:</strong>
                            ${
                                record.pig_category ||
                                "Not recorded"
                            }
                            <br>

                            <strong>Feed:</strong>
                            ${
                                record.feed_type ||
                                "Not recorded"
                            }
                            <br>

                            <strong>Quantity:</strong>
                            ${
                                record.quantity ??
                                "Not recorded"
                            }
                            <br>

                            <strong>Responsible Person:</strong>
                            ${
                                record.responsible_person ||
                                "Not recorded"
                            }
                        `,

                        action:
                            "Check the feeding schedule and make sure the pigs receive their evening feed.",

                        priority:
                            "Important",

                        icon:
                            "🌾",

                        date:
                            feedingDate

                    });
                }

            }
        );

    } catch (error) {

        console.error(
            "FEEDING ALERT EXCEPTION:",
            error
        );
    }

    return alerts;
}


// ============================================================
// WATER ALERTS
// ============================================================

async function loadWaterAlerts(farmId) {

    const alerts = [];

    try {

        const { data, error } =
            await supabase
                .from("feeding_records")
                .select(`
                    id,
                    feeding_date,
                    pen_number,
                    pig_category,
                    water_available,
                    responsible_person,
                    farm_id
                `)
                .eq(
                    "farm_id",
                    farmId
                );


        if (error) {

            console.error(
                "WATER ALERT ERROR:",
                error
            );

            return alerts;
        }


        const today =
            alertToday();


        (data || []).forEach(
            record => {

                const feedingDate =
                    alertDateOnly(
                        record.feeding_date
                    );

                if (!feedingDate) {
                    return;
                }


                if (
                    feedingDate.getTime() !==
                    today.getTime()
                ) {
                    return;
                }


                const waterStatus =
                    String(
                        record.water_available || ""
                    )
                    .trim()
                    .toLowerCase();


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
                        `Water availability needs to be checked for ${
                            record.pen_number ||
                            "the pen"
                        }.`,

                    details: `
                        <strong>Pen:</strong>
                        ${
                            record.pen_number ||
                            "Not recorded"
                        }
                        <br>

                        <strong>Pig Category:</strong>
                        ${
                            record.pig_category ||
                            "Not recorded"
                        }
                        <br>

                        <strong>Recorded Water Status:</strong>
                        ${
                            record.water_available ||
                            "Not recorded"
                        }
                        <br>

                        <strong>Responsible Person:</strong>
                        ${
                            record.responsible_person ||
                            "Not recorded"
                        }
                    `,

                    action:
                        "Check the drinking water supply and update the feeding record after verification.",

                    priority:
                        "Urgent",

                    icon:
                        "💧",

                    date:
                        feedingDate

                });

            }
        );

    } catch (error) {

        console.error(
            "WATER ALERT EXCEPTION:",
            error
        );
    }

    return alerts;
}


// ============================================================
// LOAD EVERYTHING
// ============================================================

async function loadDashboardFarmAlerts() {

    createDashboardAlertsPanel();


    const statusElement =
        document.getElementById(
            "farmAlertsStatus"
        );


    const container =
        document.getElementById(
            "farmAlertsContainer"
        );


    if (statusElement) {

        statusElement.textContent =
            "Checking farm activities...";
    }


    try {

        const farmId =
            getAlertsFarmId();


        console.log(
            "MUNKA ALERTS - FARM ID:",
            farmId
        );


        if (!farmId) {

            throw new Error(
                "No farm_id found for logged-in user."
            );
        }


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


        const priorityOrder = {

            Urgent: 1,

            Important: 2,

            Normal: 3

        };


        dashboardFarmAlerts.sort(
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


                return (
                    (a.date?.getTime?.() || 0) -
                    (b.date?.getTime?.() || 0)
                );
            }
        );


        displayDashboardFarmAlerts();


    } catch (error) {

        console.error(
            "MUNKA DASHBOARD ALERTS ERROR:",
            error
        );


        if (statusElement) {

            statusElement.textContent =
                "There was a problem loading farm alerts.";
        }


        if (container) {

            container.innerHTML = `

                <div class="no-farm-alerts">

                    <div class="farm-alert-icon">
                        ⚠️
                    </div>

                    <h3>
                        Farm alerts could not be loaded
                    </h3>

                    <p>
                        Please refresh the dashboard and try again.
                    </p>

                </div>

            `;
        }
    }
}


// ============================================================
// INITIALIZE
// ============================================================

function initializeDashboardFarmAlerts() {

    createDashboardAlertsPanel();

    loadDashboardFarmAlerts();
}


// ============================================================
// START
// ============================================================

document.addEventListener(
    "DOMContentLoaded",
    function () {

        setTimeout(
            initializeDashboardFarmAlerts,
            500
        );

    }
);