/* ==========================================================
   MUNKA PIGGERY
   PLATFORM FARM ALERTS
   SUPER ADMIN
   ==========================================================

   PURPOSE:
   - Super Admin can see alerts from ALL farms
   - Uses the actual database schemas
   - Does NOT depend on Super Admin farm_id
   - Does NOT use incorrect fields such as:
       pig_id
       farrowing_date
       expected_farrowing_date
       morning_time
       evening_time
   - Uses the actual fields from the database
   ========================================================== */

let platformFarmAlerts = [];

/* ==========================================================
   BASIC HELPERS
   ========================================================== */

function platformEscapeHTML(value) {
    if (value === null || value === undefined) return "";

    return String(value)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}


/* ==========================================================
   DATE HELPERS
   ========================================================== */

function platformToday() {
    const now = new Date();

    return new Date(
        now.getFullYear(),
        now.getMonth(),
        now.getDate()
    );
}


function platformDateOnly(value) {
    if (!value) return null;

    const d = new Date(value);

    if (isNaN(d.getTime())) return null;

    return new Date(
        d.getFullYear(),
        d.getMonth(),
        d.getDate()
    );
}


function platformDateString(value) {
    const d = platformDateOnly(value);

    if (!d) return "";

    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");

    return `${year}-${month}-${day}`;
}


function platformDaysDifference(dateValue) {
    const target = platformDateOnly(dateValue);
    const today = platformToday();

    if (!target) return null;

    return Math.round(
        (target - today) / (1000 * 60 * 60 * 24)
    );
}


function platformFormatDate(value) {
    const d = platformDateOnly(value);

    if (!d) return "No date";

    return d.toLocaleDateString("en-ZM", {
        day: "2-digit",
        month: "short",
        year: "numeric"
    });
}


/* ==========================================================
   PRIORITY
   ========================================================== */

function platformPriorityRank(priority) {
    if (priority === "Urgent") return 1;
    if (priority === "Important") return 2;
    return 3;
}


/* ==========================================================
   ADD ALERT
   ========================================================== */

function addPlatformFarmAlert({
    farmId,
    farmName,
    type,
    title,
    message,
    date = null,
    priority = "Important"
}) {
    platformFarmAlerts.push({
        farmId,
        farmName,
        type,
        title,
        message,
        date,
        priority
    });
}


/* ==========================================================
   21-DAY CHECK
   ========================================================== */

async function loadPlatform21DayAlerts(farms) {

    const { data, error } = await supabaseClient
        .from("gestation_records")
        .select(`
            id,
            sow_id,
            check21,
            farm_id
        `)
        .in(
            "farm_id",
            farms.map(f => f.id)
        )
        .not("check21", "is", null);

    if (error) {
        console.error("Platform 21-Day Check error:", error);
        return;
    }

    data.forEach(record => {

        const days = platformDaysDifference(record.check21);

        if (days === null) return;

        if (days < 0 || days > 7) return;

        const farm = farms.find(
            f => Number(f.id) === Number(record.farm_id)
        );

        if (!farm) return;

        addPlatformFarmAlert({
            farmId: farm.id,
            farmName: farm.farm_name,
            type: "Gestation",
            title: "21-Day Check",
            message:
                `Sow ${record.sow_id} has a 21-day pregnancy check due.`,
            date: record.check21,
            priority: days <= 1 ? "Urgent" : "Important"
        });
    });
}


/* ==========================================================
   90-DAY FEED
   ========================================================== */

async function loadPlatform90DayAlerts(farms) {

    const { data, error } = await supabaseClient
        .from("gestation_records")
        .select(`
            id,
            sow_id,
            feed90,
            farm_id
        `)
        .in(
            "farm_id",
            farms.map(f => f.id)
        )
        .not("feed90", "is", null);

    if (error) {
        console.error("Platform 90-Day Feed error:", error);
        return;
    }

    data.forEach(record => {

        const days = platformDaysDifference(record.feed90);

        if (days === null) return;

        if (days < 0 || days > 7) return;

        const farm = farms.find(
            f => Number(f.id) === Number(record.farm_id)
        );

        if (!farm) return;

        addPlatformFarmAlert({
            farmId: farm.id,
            farmName: farm.farm_name,
            type: "Gestation",
            title: "90-Day Feed Up",
            message:
                `Sow ${record.sow_id} has reached the 90-day feed-up stage.`,
            date: record.feed90,
            priority: days <= 1 ? "Urgent" : "Important"
        });
    });
}


/* ==========================================================
   101-DAY DEWORMER
   ========================================================== */

async function loadPlatformDewormerAlerts(farms) {

    const { data, error } = await supabaseClient
        .from("gestation_records")
        .select(`
            id,
            sow_id,
            deworm101,
            farm_id
        `)
        .in(
            "farm_id",
            farms.map(f => f.id)
        )
        .not("deworm101", "is", null);

    if (error) {
        console.error("Platform Dewormer error:", error);
        return;
    }

    data.forEach(record => {

        const days = platformDaysDifference(record.deworm101);

        if (days === null) return;

        if (days < 0 || days > 7) return;

        const farm = farms.find(
            f => Number(f.id) === Number(record.farm_id)
        );

        if (!farm) return;

        addPlatformFarmAlert({
            farmId: farm.id,
            farmName: farm.farm_name,
            type: "Gestation",
            title: "101-Day Dewormer",
            message:
                `Sow ${record.sow_id} has a 101-day dewormer activity due.`,
            date: record.deworm101,
            priority: days <= 1 ? "Urgent" : "Important"
        });
    });
}


/* ==========================================================
   101-DAY LITTER GUARD
   ========================================================== */

async function loadPlatformLitterGuardAlerts(farms) {

    const { data, error } = await supabaseClient
        .from("gestation_records")
        .select(`
            id,
            sow_id,
            litter101,
            farm_id
        `)
        .in(
            "farm_id",
            farms.map(f => f.id)
        )
        .not("litter101", "is", null);

    if (error) {
        console.error("Platform Litter Guard error:", error);
        return;
    }

    data.forEach(record => {

        const days = platformDaysDifference(record.litter101);

        if (days === null) return;

        if (days < 0 || days > 7) return;

        const farm = farms.find(
            f => Number(f.id) === Number(record.farm_id)
        );

        if (!farm) return;

        addPlatformFarmAlert({
            farmId: farm.id,
            farmName: farm.farm_name,
            type: "Gestation",
            title: "101-Day Litter Guard",
            message:
                `Sow ${record.sow_id} has a 101-day litter guard activity due.`,
            date: record.litter101,
            priority: days <= 1 ? "Urgent" : "Important"
        });
    });
}


/* ==========================================================
   107-DAY ACTION DAY
   ========================================================== */

async function loadPlatformActionDayAlerts(farms) {

    const { data, error } = await supabaseClient
        .from("gestation_records")
        .select(`
            id,
            sow_id,
            action_day,
            farm_id
        `)
        .in(
            "farm_id",
            farms.map(f => f.id)
        )
        .not("action_day", "is", null);

    if (error) {
        console.error("Platform Action Day error:", error);
        return;
    }

    data.forEach(record => {

        const days = platformDaysDifference(record.action_day);

        if (days === null) return;

        if (days < 0 || days > 7) return;

        const farm = farms.find(
            f => Number(f.id) === Number(record.farm_id)
        );

        if (!farm) return;

        addPlatformFarmAlert({
            farmId: farm.id,
            farmName: farm.farm_name,
            type: "Gestation",
            title: "107-Day Action Day",
            message:
                `Sow ${record.sow_id} has reached the 107-day action stage.`,
            date: record.action_day,
            priority: days <= 1 ? "Urgent" : "Important"
        });
    });
}


/* ==========================================================
   114-DAY FARROWSURE
   ========================================================== */

async function loadPlatformFarrowSureAlerts(farms) {

    const { data, error } = await supabaseClient
        .from("gestation_records")
        .select(`
            id,
            sow_id,
            farrowsure,
            farm_id
        `)
        .in(
            "farm_id",
            farms.map(f => f.id)
        )
        .not("farrowsure", "is", null);

    if (error) {
        console.error("Platform FarrowSure error:", error);
        return;
    }

    data.forEach(record => {

        const days = platformDaysDifference(record.farrowsure);

        if (days === null) return;

        if (days < 0 || days > 7) return;

        const farm = farms.find(
            f => Number(f.id) === Number(record.farm_id)
        );

        if (!farm) return;

        addPlatformFarmAlert({
            farmId: farm.id,
            farmName: farm.farm_name,
            type: "Gestation",
            title: "114-Day FarrowSure",
            message:
                `Sow ${record.sow_id} has reached the 114-day FarrowSure stage.`,
            date: record.farrowsure,
            priority: days <= 1 ? "Urgent" : "Important"
        });
    });
}


/* ==========================================================
   EXPECTED DELIVERY / FARROWING
   ========================================================== */

async function loadPlatformDeliveryAlerts(farms) {

    const { data, error } = await supabaseClient
        .from("gestation_records")
        .select(`
            id,
            sow_id,
            delivery_date,
            farm_id
        `)
        .in(
            "farm_id",
            farms.map(f => f.id)
        )
        .not("delivery_date", "is", null);

    if (error) {
        console.error("Platform Delivery Date error:", error);
        return;
    }

    data.forEach(record => {

        const days = platformDaysDifference(record.delivery_date);

        if (days === null) return;

        if (days < -7 || days > 7) return;

        const farm = farms.find(
            f => Number(f.id) === Number(record.farm_id)
        );

        if (!farm) return;

        let priority = "Important";

        if (days <= 0) {
            priority = "Urgent";
        }

        addPlatformFarmAlert({
            farmId: farm.id,
            farmName: farm.farm_name,
            type: "Gestation",
            title: "Expected Farrowing",
            message:
                days < 0
                    ? `Sow ${record.sow_id} is ${Math.abs(days)} day(s) past the expected farrowing date.`
                    : days === 0
                        ? `Sow ${record.sow_id} is expected to farrow today.`
                        : `Sow ${record.sow_id} is expected to farrow in ${days} day(s).`,
            date: record.delivery_date,
            priority
        });
    });
}


/* ==========================================================
   NOT SERVICED
   ========================================================== */

async function loadPlatformNotServicedAlerts(farms) {

    const { data, error } = await supabaseClient
        .from("gestation_records")
        .select(`
            id,
            sow_id,
            status,
            service_date,
            farm_id
        `)
        .in(
            "farm_id",
            farms.map(f => f.id)
        )
        .eq("status", "Pregnant")
        .is("service_date", null);

    if (error) {
        console.error("Platform Not Serviced error:", error);
        return;
    }

    data.forEach(record => {

        const farm = farms.find(
            f => Number(f.id) === Number(record.farm_id)
        );

        if (!farm) return;

        addPlatformFarmAlert({
            farmId: farm.id,
            farmName: farm.farm_name,
            type: "Gestation",
            title: "Not Serviced",
            message:
                `Sow ${record.sow_id} is marked Pregnant but has no service date.`,
            priority: "Urgent"
        });
    });
}


/* ==========================================================
   FARROWING INTERVENTIONS
   ========================================================== */

async function loadPlatformFarrowingAlerts(farms) {

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
        .in(
            "farm_id",
            farms.map(f => f.id)
        );

    if (error) {
        console.error("Platform Farrowing error:", error);
        return;
    }

    data.forEach(record => {

        const farm = farms.find(
            f => Number(f.id) === Number(record.farm_id)
        );

        if (!farm) return;


        /* IRON */

        if (record.iron_date) {

            const days = platformDaysDifference(record.iron_date);

            if (days !== null && days >= -7 && days <= 7) {

                addPlatformFarmAlert({
                    farmId: farm.id,
                    farmName: farm.farm_name,
                    type: "Farrowing",
                    title: "Iron Injection",
                    message:
                        `Iron injection is due for sow ${record.sow_id}.`,
                    date: record.iron_date,
                    priority: days <= 0 ? "Urgent" : "Important"
                });
            }
        }


        /* TEETH */

        if (record.teeth_date) {

            const days = platformDaysDifference(record.teeth_date);

            if (days !== null && days >= -7 && days <= 7) {

                addPlatformFarmAlert({
                    farmId: farm.id,
                    farmName: farm.farm_name,
                    type: "Farrowing",
                    title: "Teeth Clipping",
                    message:
                        `Teeth clipping is due for sow ${record.sow_id}.`,
                    date: record.teeth_date,
                    priority: days <= 0 ? "Urgent" : "Important"
                });
            }
        }


        /* TAIL */

        if (record.tail_date) {

            const days = platformDaysDifference(record.tail_date);

            if (days !== null && days >= -7 && days <= 7) {

                addPlatformFarmAlert({
                    farmId: farm.id,
                    farmName: farm.farm_name,
                    type: "Farrowing",
                    title: "Tail Docking",
                    message:
                        `Tail docking is due for sow ${record.sow_id}.`,
                    date: record.tail_date,
                    priority: days <= 0 ? "Urgent" : "Important"
                });
            }
        }
    });
}


/* ==========================================================
   WEANING
   IMPORTANT:
   USES weaning_records
   ========================================================== */

async function loadPlatformWeaningAlerts(farms) {

    const { data, error } = await supabaseClient
        .from("weaning_records")
        .select(`
            id,
            sow_id,
            weaning_date,
            total_weaned,
            farm_id
        `)
        .in(
            "farm_id",
            farms.map(f => f.id)
        )
        .not("weaning_date", "is", null);

    if (error) {
        console.error("Platform Weaning error:", error);
        return;
    }

    data.forEach(record => {

        const days = platformDaysDifference(record.weaning_date);

        if (days === null) return;

        /*
           Show:
           - up to 7 days overdue
           - today
           - next 7 days
        */

        if (days < -7 || days > 7) return;

        const farm = farms.find(
            f => Number(f.id) === Number(record.farm_id)
        );

        if (!farm) return;

        let priority = "Important";
        let message = "";

        if (days < 0) {

            priority = "Urgent";

            message =
                `Weaning for sow ${record.sow_id} is ${Math.abs(days)} day(s) overdue.`;

        } else if (days === 0) {

            priority = "Urgent";

            message =
                `Weaning for sow ${record.sow_id} is due today.`;

        } else {

            priority = "Important";

            message =
                `Weaning for sow ${record.sow_id} is due in ${days} day(s).`;
        }

        addPlatformFarmAlert({
            farmId: farm.id,
            farmName: farm.farm_name,
            type: "Weaning",
            title: "Weaning Due",
            message:
                `${message} Total Weaned: ${record.total_weaned ?? 0}.`,
            date: record.weaning_date,
            priority
        });
    });
}


/* ==========================================================
   FEEDING
   ========================================================== */

async function loadPlatformFeedingAlerts(farms) {

    const todayString = platformDateString(new Date());

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
            responsible_person,
            farm_id
        `)
        .in(
            "farm_id",
            farms.map(f => f.id)
        )
        .eq("feeding_date", todayString);

    if (error) {
        console.error("Platform Feeding error:", error);
        return;
    }

    data.forEach(record => {

        const farm = farms.find(
            f => Number(f.id) === Number(record.farm_id)
        );

        if (!farm) return;


        if (record.morning_feeding) {

            addPlatformFarmAlert({
                farmId: farm.id,
                farmName: farm.farm_name,
                type: "Feeding",
                title: "Morning Feeding",
                message:
                    `Pen ${record.pen_number || "N/A"} — ${record.feed_type || "Feed"} — Quantity: ${record.quantity ?? 0}. Morning feeding scheduled for ${record.morning_feeding}.`,
                date: record.feeding_date,
                priority: "Important"
            });
        }


        if (record.evening_feeding) {

            addPlatformFarmAlert({
                farmId: farm.id,
                farmName: farm.farm_name,
                type: "Feeding",
                title: "Evening Feeding",
                message:
                    `Pen ${record.pen_number || "N/A"} — ${record.feed_type || "Feed"} — Quantity: ${record.quantity ?? 0}. Evening feeding scheduled for ${record.evening_feeding}.`,
                date: record.feeding_date,
                priority: "Important"
            });
        }
    });
}


/* ==========================================================
   WATER
   ========================================================== */

async function loadPlatformWaterAlerts(farms) {

    const todayString = platformDateString(new Date());

    const { data, error } = await supabaseClient
        .from("feeding_records")
        .select(`
            id,
            record_id,
            feeding_date,
            pen_number,
            water_available,
            farm_id
        `)
        .in(
            "farm_id",
            farms.map(f => f.id)
        )
        .eq("feeding_date", todayString);

    if (error) {
        console.error("Platform Water error:", error);
        return;
    }

    data.forEach(record => {

        const water =
            String(record.water_available || "")
                .trim()
                .toLowerCase();

        const waterIsAvailable =
            water === "yes" ||
            water === "available" ||
            water === "true";

        if (waterIsAvailable) return;

        const farm = farms.find(
            f => Number(f.id) === Number(record.farm_id)
        );

        if (!farm) return;

        addPlatformFarmAlert({
            farmId: farm.id,
            farmName: farm.farm_name,
            type: "Water",
            title: "Water Availability Check",
            message:
                `Water availability needs attention in ${record.pen_number || "the feeding area"}.`,
            date: record.feeding_date,
            priority: "Urgent"
        });
    });
}


/* ==========================================================
   SORT
   ========================================================== */

function sortPlatformFarmAlerts() {

    platformFarmAlerts.sort((a, b) => {

        const priorityDifference =
            platformPriorityRank(a.priority) -
            platformPriorityRank(b.priority);

        if (priorityDifference !== 0) {
            return priorityDifference;
        }

        const farmDifference =
            String(a.farmName || "")
                .localeCompare(String(b.farmName || ""));

        if (farmDifference !== 0) {
            return farmDifference;
        }

        return String(a.title || "")
            .localeCompare(String(b.title || ""));
    });
}


/* ==========================================================
   RENDER
   ========================================================== */

function renderPlatformFarmAlerts() {

    const container =
        document.getElementById("platformFarmAlertsContainer") ||
        document.querySelector(".platform-farm-alerts-container");

    if (!container) {
        console.warn(
            "Platform Farm Alerts container was not found."
        );
        return;
    }


    const countElement =
        document.getElementById("platformFarmAlertsCount") ||
        document.querySelector(".platform-farm-alerts-count");


    if (countElement) {
        countElement.textContent = platformFarmAlerts.length;
    }


    if (platformFarmAlerts.length === 0) {

        container.innerHTML = `
            <div class="platform-alert-empty">
                <div class="platform-alert-empty-icon">✓</div>
                <h3>No Farm Alerts</h3>
                <p>No current alerts were found across the active farms.</p>
            </div>
        `;

        return;
    }


    container.innerHTML =
        platformFarmAlerts.map(alert => {

            const priorityClass =
                String(alert.priority || "Important")
                    .toLowerCase();

            return `
                <div class="platform-alert-card ${platformEscapeHTML(priorityClass)}">

                    <div class="platform-alert-top">

                        <div class="platform-alert-farm">
                            🏠
                            ${platformEscapeHTML(alert.farmName)}
                        </div>

                        <div class="platform-alert-priority ${platformEscapeHTML(priorityClass)}">
                            ${platformEscapeHTML(alert.priority)}
                        </div>

                    </div>


                    <div class="platform-alert-title">
                        ${platformEscapeHTML(alert.title)}
                    </div>


                    <div class="platform-alert-message">
                        ${platformEscapeHTML(alert.message)}
                    </div>


                    <div class="platform-alert-meta">

                        <span>
                            📌 ${platformEscapeHTML(alert.type)}
                        </span>

                        ${
                            alert.date
                                ? `
                                    <span>
                                        📅 ${platformFormatDate(alert.date)}
                                    </span>
                                  `
                                : ""
                        }

                        <span>
                            Farm ID: ${platformEscapeHTML(alert.farmId)}
                        </span>

                    </div>

                </div>
            `;
        }).join("");
}


/* ==========================================================
   MAIN LOADER
   ========================================================== */

async function loadPlatformFarmAlerts() {

    console.log(
        "=================================================="
    );

    console.log(
        "MUNKA PIGGERY PLATFORM FARM ALERTS"
    );

    console.log(
        "Checking active farms..."
    );


    platformFarmAlerts = [];


    const statusElement =
        document.getElementById("platformFarmAlertsStatus") ||
        document.querySelector(".platform-farm-alerts-status");


    const container =
        document.getElementById("platformFarmAlertsContainer") ||
        document.querySelector(".platform-farm-alerts-container");


    if (statusElement) {
        statusElement.textContent =
            "Checking farm alerts...";
    }


    if (container) {

        container.innerHTML = `
            <div class="platform-alert-loading">
                <div class="platform-alert-loading-spinner"></div>
                <p>Checking farm alerts...</p>
            </div>
        `;
    }


    try {

        /* ==================================================
           GET ALL ACTIVE FARMS
           ================================================== */

        const {
            data: farms,
            error: farmsError
        } = await supabaseClient
            .from("farms")
            .select(`
                id,
                farm_name,
                status
            `)
            .eq("status", "Active")
            .order("farm_name", {
                ascending: true
            });


        if (farmsError) {
            throw farmsError;
        }


        if (!farms || farms.length === 0) {

            console.log(
                "No active farms found."
            );

            renderPlatformFarmAlerts();

            if (statusElement) {
                statusElement.textContent =
                    "0 active farms";
            }

            return;
        }


        console.log(
            `Active farms found: ${farms.length}`
        );


        console.table(
            farms.map(farm => ({
                "Farm ID": farm.id,
                "Farm Name": farm.farm_name,
                "Status": farm.status
            }))
        );


        /* ==================================================
           IMPORTANT:
           WE CHECK THE ALERT TABLES USING farm_id IN (...)
           RATHER THAN REPEATING THE SAME QUERY FOR EACH FARM.
           ================================================== */

        await Promise.all([

            loadPlatform21DayAlerts(farms),

            loadPlatform90DayAlerts(farms),

            loadPlatformDewormerAlerts(farms),

            loadPlatformLitterGuardAlerts(farms),

            loadPlatformActionDayAlerts(farms),

            loadPlatformFarrowSureAlerts(farms),

            loadPlatformDeliveryAlerts(farms),

            loadPlatformNotServicedAlerts(farms),

            loadPlatformFarrowingAlerts(farms),

            loadPlatformWeaningAlerts(farms),

            loadPlatformFeedingAlerts(farms),

            loadPlatformWaterAlerts(farms)

        ]);


        sortPlatformFarmAlerts();


        console.log(
            `Platform alerts found: ${platformFarmAlerts.length}`
        );


        console.table(
            platformFarmAlerts.map(alert => ({
                "Farm": alert.farmName,
                "Farm ID": alert.farmId,
                "Type": alert.type,
                "Alert": alert.title,
                "Priority": alert.priority,
                "Date": alert.date
            }))
        );


        renderPlatformFarmAlerts();


        if (statusElement) {

            statusElement.textContent =
                `${platformFarmAlerts.length} alert(s) across ${farms.length} active farm(s)`;
        }

    } catch (error) {

        console.error(
            "PLATFORM FARM ALERTS FAILED:",
            error
        );


        if (statusElement) {
            statusElement.textContent =
                "Unable to load farm alerts";
        }


        if (container) {

            container.innerHTML = `
                <div class="platform-alert-error">

                    <div class="platform-alert-error-icon">
                        ⚠️
                    </div>

                    <h3>Farm Alerts Could Not Be Loaded</h3>

                    <p>
                        The platform could not retrieve farm alert information.
                    </p>

                    <small>
                        ${platformEscapeHTML(
                            error?.message || "Unknown database error"
                        )}
                    </small>

                </div>
            `;
        }
    }
}


/* ==========================================================
   REFRESH BUTTON
   ========================================================== */

function initializePlatformFarmAlerts() {

    const refreshButton =
        document.getElementById("refreshPlatformFarmAlerts") ||
        document.getElementById("refreshFarmAlerts") ||
        document.querySelector(".platform-refresh-alerts-btn");


    if (refreshButton) {

        refreshButton.addEventListener(
            "click",
            async function () {

                refreshButton.disabled = true;

                const originalText =
                    refreshButton.innerHTML;

                refreshButton.innerHTML =
                    "⏳ Checking...";


                try {

                    await loadPlatformFarmAlerts();

                } finally {

                    refreshButton.disabled = false;

                    refreshButton.innerHTML =
                        originalText;
                }
            }
        );
    }


    /*
       INITIAL CHECK ONLY.

       The dashboard does NOT continuously check farms.
       It checks once when the page loads.
       The Super Admin can manually refresh.
    */

    loadPlatformFarmAlerts();
}


/* ==========================================================
   DOM READY
   ========================================================== */

document.addEventListener(
    "DOMContentLoaded",
    function () {

        /*
           Give the dashboard a moment to create its sections
           before loading the alerts.
        */

        setTimeout(
            initializePlatformFarmAlerts,
            100
        );
    }
);


/* ==========================================================
   GLOBAL ACCESS
   ========================================================== */

window.loadPlatformFarmAlerts =
    loadPlatformFarmAlerts;

window.renderPlatformFarmAlerts =
    renderPlatformFarmAlerts;