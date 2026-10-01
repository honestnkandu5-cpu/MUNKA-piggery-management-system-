 /* ============================================================
    MUNKA PIGGERY TECHNOLOGY
    SUPER ADMIN PLATFORM FARM ALERTS
    ============================================================ */

let platformFarmAlerts = [];


/* ============================================================
   HTML SECURITY
   ============================================================ */

function escapePlatformAlertHTML(value) {
    return String(value ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}


/* ============================================================
   DATE HELPERS
   ============================================================ */

function platformAlertStartOfDay(date = new Date()) {
    const result = new Date(date);
    result.setHours(0, 0, 0, 0);
    return result;
}


function platformAlertEndOfDay(date = new Date()) {
    const result = new Date(date);
    result.setHours(23, 59, 59, 999);
    return result;
}


function platformAlertDaysFromToday(value) {

    if (!value) return null;

    const target = new Date(value);

    if (Number.isNaN(target.getTime())) {
        return null;
    }

    const today = platformAlertStartOfDay();

    const targetDay = platformAlertStartOfDay(target);

    const difference =
        targetDay.getTime() -
        today.getTime();

    return Math.round(
        difference / (1000 * 60 * 60 * 24)
    );
}


/* ============================================================
   DATE DISPLAY
   ============================================================ */

function formatPlatformAlertDate(value) {

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


/* ============================================================
   ALERT PRIORITY
   ============================================================ */

function platformAlertPriorityRank(priority) {

    const value =
        String(priority || "Normal")
            .toLowerCase();

    if (value === "urgent") return 1;

    if (value === "important") return 2;

    return 3;
}


/* ============================================================
   ADD ALERT
   ============================================================ */

function addPlatformFarmAlert({
    farmId,
    farmName,
    title,
    message,
    priority = "Normal",
    type = "General"
}) {

    platformFarmAlerts.push({

        farmId,

        farmName:
            farmName ||
            `Farm ${farmId}`,

        title,

        message,

        priority,

        type
    });
}


/* ============================================================
   LOAD PLATFORM FARM ALERTS
   ============================================================ */

async function loadPlatformFarmAlerts() {

    const container =
        document.getElementById(
            "platformFarmAlerts"
        );

    const status =
        document.getElementById(
            "platformFarmAlertsStatus"
        );

    const count =
        document.getElementById(
            "platformFarmAlertsCount"
        );


    if (status) {

        status.textContent =
            "Checking all farms...";
    }


    if (container) {

        container.innerHTML = `
            <div class="platform-alert-loading">
                Checking farm records...
            </div>
        `;
    }


    if (count) {

        count.textContent = "0";
    }


    platformFarmAlerts = [];


    try {

        /*
         * ====================================================
         * STEP 1 — LOAD FARMS
         * ====================================================
         */

        const {
            data: farms,
            error: farmsError
        } = await supabaseClient
            .from("farms")
            .select(
                "id, farm_name, status"
            )
            .order(
                "farm_name",
                {
                    ascending: true
                }
            );


        if (farmsError) {

            console.error(
                "Platform farm alerts - farms error:",
                farmsError
            );

            throw new Error(
                `Unable to load farms: ${
                    farmsError.message ||
                    "Unknown database error"
                }`
            );
        }


        const farmList =
            farms || [];


        /*
         * ====================================================
         * STEP 2 — CHECK EACH FARM
         * ====================================================
         */

        for (const farm of farmList) {

            const farmId =
                farm.id;

            const farmName =
                farm.farm_name ||
                `Farm ${farmId}`;


            /* =================================================
               FARROWING / WEANING ALERTS
               ================================================= */

            try {

                const today =
                    platformAlertStartOfDay();


                const sevenDaysLater =
                    new Date(today);

                sevenDaysLater.setDate(
                    sevenDaysLater.getDate() + 7
                );


                const {
                    data,
                    error
                } = await supabaseClient
                    .from("farrowing_records")
                    .select(`
                        id,
                        pig_id,
                        sow_id,
                        weaning_date,
                        farrowing_date,
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
                    )
                    .gte(
                        "weaning_date",
                        today.toISOString()
                    )
                    .lte(
                        "weaning_date",
                        sevenDaysLater.toISOString()
                    );


                if (error) {

                    console.warn(
                        `Weaning query failed for ${farmName}:`,
                        error
                    );

                } else {

                    (data || []).forEach(
                        record => {

                            const days =
                                platformAlertDaysFromToday(
                                    record.weaning_date
                                );


                            let priority =
                                "Normal";


                            if (
                                days !== null &&
                                days <= 2
                            ) {

                                priority =
                                    "Urgent";

                            } else if (
                                days !== null &&
                                days <= 5
                            ) {

                                priority =
                                    "Important";
                            }


                            addPlatformFarmAlert({

                                farmId,

                                farmName,

                                title:
                                    "Upcoming Weaning",

                                message:
                                    `Weaning is scheduled for ${
                                        formatPlatformAlertDate(
                                            record.weaning_date
                                        )
                                    }.`,

                                priority,

                                type:
                                    "Weaning"
                            });
                        }
                    );
                }

            } catch (error) {

                console.warn(
                    `Weaning alert check failed for ${farmName}:`,
                    error
                );
            }


            /* =================================================
               GESTATION / ACTION DAY ALERTS
               ================================================= */

            try {

                const today =
                    platformAlertStartOfDay();


                const sevenDaysLater =
                    new Date(today);

                sevenDaysLater.setDate(
                    sevenDaysLater.getDate() + 7
                );


                const {
                    data,
                    error
                } = await supabaseClient
                    .from("gestation_records")
                    .select(`
                        id,
                        pig_id,
                        sow_id,
                        status,
                        service_date,
                        action_day,
                        expected_farrowing_date,
                        farm_id
                    `)
                    .eq(
                        "farm_id",
                        farmId
                    )
                    .not(
                        "action_day",
                        "is",
                        null
                    )
                    .gte(
                        "action_day",
                        today.toISOString()
                    )
                    .lte(
                        "action_day",
                        sevenDaysLater.toISOString()
                    );


                if (error) {

                    console.warn(
                        `Action-day query failed for ${farmName}:`,
                        error
                    );

                } else {

                    (data || []).forEach(
                        record => {

                            const days =
                                platformAlertDaysFromToday(
                                    record.action_day
                                );


                            let priority =
                                "Normal";


                            if (
                                days !== null &&
                                days <= 2
                            ) {

                                priority =
                                    "Urgent";

                            } else if (
                                days !== null &&
                                days <= 5
                            ) {

                                priority =
                                    "Important";
                            }


                            addPlatformFarmAlert({

                                farmId,

                                farmName,

                                title:
                                    "Gestation Action Day",

                                message:
                                    `Action day is scheduled for ${
                                        formatPlatformAlertDate(
                                            record.action_day
                                        )
                                    }.`,

                                priority,

                                type:
                                    "Gestation"
                            });
                        }
                    );
                }

            } catch (error) {

                console.warn(
                    `Gestation alert check failed for ${farmName}:`,
                    error
                );
            }


            /* =================================================
               PREGNANT RECORDS WITHOUT SERVICE DATE
               ================================================= */

            try {

                const {
                    data,
                    error
                } = await supabaseClient
                    .from("gestation_records")
                    .select(`
                        id,
                        pig_id,
                        sow_id,
                        status,
                        service_date,
                        farm_id
                    `)
                    .eq(
                        "farm_id",
                        farmId
                    )
                    .eq(
                        "status",
                        "Pregnant"
                    )
                    .is(
                        "service_date",
                        null
                    );


                if (error) {

                    console.warn(
                        `Missing service-date query failed for ${farmName}:`,
                        error
                    );

                } else if (
                    data &&
                    data.length
                ) {

                    data.forEach(
                        record => {

                            addPlatformFarmAlert({

                                farmId,

                                farmName,

                                title:
                                    "Missing Service Date",

                                message:
                                    "A pregnant record does not have a service date.",

                                priority:
                                    "Important",

                                type:
                                    "Gestation"
                            });
                        }
                    );
                }

            } catch (error) {

                console.warn(
                    `Missing service-date check failed for ${farmName}:`,
                    error
                );
            }


            /* =================================================
               TODAY'S FEEDING RECORDS
               ================================================= */

            try {

                const now =
                    new Date();


                const start =
                    platformAlertStartOfDay(
                        now
                    );


                const end =
                    platformAlertEndOfDay(
                        now
                    );


                const {
                    data,
                    error
                } = await supabaseClient
                    .from("feeding_records")
                    .select(`
                        id,
                        feeding_date,
                        pen_number,
                        feed_type,
                        morning_time,
                        evening_time,
                        water_available,
                        farm_id
                    `)
                    .eq(
                        "farm_id",
                        farmId
                    )
                    .gte(
                        "feeding_date",
                        start.toISOString()
                    )
                    .lte(
                        "feeding_date",
                        end.toISOString()
                    );


                if (error) {

                    console.warn(
                        `Feeding query failed for ${farmName}:`,
                        error
                    );

                } else {

                    /*
                     * If today's feeding record exists,
                     * check water availability.
                     */

                    (data || []).forEach(
                        record => {

                            const water =
                                String(
                                    record.water_available ||
                                    ""
                                ).toLowerCase()
                                .trim();


                            if (
                                water &&
                                water !== "yes"
                            ) {

                                addPlatformFarmAlert({

                                    farmId,

                                    farmName,

                                    title:
                                        "Water Availability Issue",

                                    message:
                                        `Water is not marked as available for today's feeding record${
                                            record.pen_number
                                                ? ` in Pen ${record.pen_number}`
                                                : ""
                                        }.`,

                                    priority:
                                        "Urgent",

                                    type:
                                        "Water"
                                });
                            }
                        }
                    );
                }

            } catch (error) {

                console.warn(
                    `Feeding alert check failed for ${farmName}:`,
                    error
                );
            }
        }


        /*
         * ====================================================
         * SORT ALERTS
         * ====================================================
         */

        platformFarmAlerts.sort(
            (a, b) => {

                const priorityDifference =
                    platformAlertPriorityRank(
                        a.priority
                    ) -
                    platformAlertPriorityRank(
                        b.priority
                    );


                if (
                    priorityDifference !== 0
                ) {

                    return priorityDifference;
                }


                return String(
                    a.farmName
                ).localeCompare(
                    String(b.farmName)
                );
            }
        );


        /*
         * ====================================================
         * DISPLAY
         * ====================================================
         */

        renderPlatformFarmAlerts();


    } catch (error) {

        console.error(
            "Platform farm alerts error:",
            error
        );


        if (status) {

            status.textContent =
                "Farm alerts could not be loaded.";
        }


        if (container) {

            container.innerHTML = `

                <div class="platform-announcement-error">

                    <strong>
                        Farm alerts could not be loaded.
                    </strong>

                    <p>
                        ${escapePlatformAlertHTML(
                            error.message ||
                            "Unknown error occurred."
                        )}
                    </p>

                </div>
            `;
        }
    }
}


/* ============================================================
   RENDER FARM ALERTS
   ============================================================ */

function renderPlatformFarmAlerts() {

    const container =
        document.getElementById(
            "platformFarmAlerts"
        );


    const status =
        document.getElementById(
            "platformFarmAlertsStatus"
        );


    const count =
        document.getElementById(
            "platformFarmAlertsCount"
        );


    if (!container) {

        console.warn(
            "platformFarmAlerts element not found."
        );

        return;
    }


    const total =
        platformFarmAlerts.length;


    if (count) {

        count.textContent =
            String(total);
    }


    if (!total) {

        container.innerHTML = `

            <div class="platform-alert-empty">

                <div class="platform-alert-empty-icon">
                    ✅
                </div>

                <h3>
                    No active farm alerts
                </h3>

                <p>
                    No important farm alerts were found
                    across the registered farms.
                </p>

            </div>
        `;


        if (status) {

            status.textContent =
                "No active farm alerts.";
        }


        return;
    }


    container.innerHTML = "";


    platformFarmAlerts.forEach(
        alert => {

            const card =
                document.createElement(
                    "article"
                );


            const priorityClass =
                String(
                    alert.priority ||
                    "Normal"
                )
                .toLowerCase()
                .replace(
                    /\s+/g,
                    "-"
                );


            card.className =
                `platform-farm-alert-card platform-alert-${priorityClass}`;


            card.innerHTML = `

                <div class="platform-farm-alert-header">

                    <div class="platform-farm-alert-farm">

                        🏢

                        <strong>
                            ${escapePlatformAlertHTML(
                                alert.farmName
                            )}
                        </strong>

                    </div>


                    <span class="platform-farm-alert-priority">

                        ${escapePlatformAlertHTML(
                            alert.priority ||
                            "Normal"
                        )}

                    </span>

                </div>


                <div class="platform-farm-alert-body">

                    <h3>
                        ${escapePlatformAlertHTML(
                            alert.title
                        )}
                    </h3>


                    <p>
                        ${escapePlatformAlertHTML(
                            alert.message
                        )}
                    </p>


                    <div class="platform-farm-alert-meta">

                        <span>
                            🏷️
                            ${escapePlatformAlertHTML(
                                alert.type
                            )}
                        </span>


                        <span>
                            Farm ID:
                            ${escapePlatformAlertHTML(
                                alert.farmId
                            )}
                        </span>

                    </div>

                </div>
            `;


            container.appendChild(card);
        }
    );


    if (status) {

        status.textContent =
            `${total} farm alert${
                total === 1
                    ? ""
                    : "s"
            } found across all farms.`;
    }
}


/* ============================================================
   REFRESH BUTTON
   ============================================================ */

function setupPlatformFarmAlerts() {

    const refreshButton =
        document.getElementById(
            "refreshPlatformFarmAlerts"
        );


    if (!refreshButton) {

        console.warn(
            "refreshPlatformFarmAlerts button not found."
        );

        return;
    }


    refreshButton.addEventListener(
        "click",
        async function() {

            refreshButton.disabled = true;

            refreshButton.textContent =
                "⏳ Checking...";


            await loadPlatformFarmAlerts();


            refreshButton.disabled = false;

            refreshButton.textContent =
                "🔄 Refresh";
        }
    );
}


/* ============================================================
   INITIALIZE
   ============================================================ */

async function initializePlatformFarmAlerts() {

    console.log(
        "Initializing Platform Farm Alerts..."
    );


    await loadPlatformFarmAlerts();


    setupPlatformFarmAlerts();


    console.log(
        "Platform Farm Alerts initialized."
    );
}


/* ============================================================
   START
   ============================================================ */

document.addEventListener(
    "DOMContentLoaded",
    initializePlatformFarmAlerts
);