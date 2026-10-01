/* ============================================================
   MUNKA PIGGERY MANAGEMENT SYSTEM
   PLATFORM FARM ALERTS
   Super Admin - All Farms
   ============================================================ */

let platformFarmAlerts = [];


/* ============================================================
   BASIC HELPERS
   ============================================================ */

function escapePlatformAlertHTML(value) {
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


function getPlatformToday() {
    const now = new Date();

    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, "0");
    const day = String(now.getDate()).padStart(2, "0");

    return `${year}-${month}-${day}`;
}


function dateFromString(dateString) {
    if (!dateString) {
        return null;
    }

    const parts = String(dateString).split("-");

    if (parts.length !== 3) {
        return null;
    }

    const year = Number(parts[0]);
    const month = Number(parts[1]) - 1;
    const day = Number(parts[2]);

    return new Date(year, month, day);
}


function addDaysToDate(dateString, days) {
    const date = dateFromString(dateString);

    if (!date) {
        return null;
    }

    date.setDate(date.getDate() + days);

    return date;
}


function formatPlatformDate(dateString) {
    if (!dateString) {
        return "N/A";
    }

    const date = dateFromString(dateString);

    if (!date || isNaN(date.getTime())) {
        return dateString;
    }

    return date.toLocaleDateString("en-ZM", {
        year: "numeric",
        month: "short",
        day: "numeric"
    });
}


function daysDifference(dateString, todayString) {
    const targetDate = dateFromString(dateString);
    const todayDate = dateFromString(todayString);

    if (!targetDate || !todayDate) {
        return null;
    }

    const difference =
        (targetDate.getTime() - todayDate.getTime()) /
        (1000 * 60 * 60 * 24);

    return Math.round(difference);
}


/* ============================================================
   PRIORITY
   ============================================================ */

function platformPriorityRank(priority) {
    const value = String(priority || "").toLowerCase();

    if (value === "urgent") {
        return 1;
    }

    if (value === "important") {
        return 2;
    }

    return 3;
}


/* ============================================================
   ADD ALERT
   ============================================================ */

function addPlatformFarmAlert({
    farmId,
    farmName,
    type,
    title,
    message,
    priority = "Important",
    details = ""
}) {
    platformFarmAlerts.push({
        farmId,
        farmName,
        type,
        title,
        message,
        priority,
        details,
        createdAt: new Date()
    });
}


/* ============================================================
   21-DAY CHECK
   ============================================================ */

async function loadPlatform21DayCheckAlerts(farm) {

    const today = getPlatformToday();
    const sevenDaysLater = addDaysToDate(today, 7);

    const { data, error } = await supabaseClient
        .from("gestation_records")
        .select(`
            id,
            sow_id,
            service_date,
            check21,
            farm_id
        `)
        .eq("farm_id", farm.id)
        .not("check21", "is", null)
        .gte("check21", today)
        .lte(
            "check21",
            `${sevenDaysLater.getFullYear()}-${String(
                sevenDaysLater.getMonth() + 1
            ).padStart(2, "0")}-${String(
                sevenDaysLater.getDate()
            ).padStart(2, "0")}`
        );

    if (error) {
        console.error(
            `Platform 21-Day Check error for ${farm.farm_name}:`,
            error
        );
        return;
    }

    (data || []).forEach(record => {

        const days = daysDifference(record.check21, today);

        let priority = "Important";

        if (days === 0) {
            priority = "Urgent";
        }

        addPlatformFarmAlert({
            farmId: farm.id,
            farmName: farm.farm_name,
            type: "Gestation",
            title: "21-Day Pregnancy Check",
            message:
                days === 0
                    ? `21-day pregnancy check is due today for Sow ${record.sow_id}.`
                    : `21-day pregnancy check is due in ${days} day${days === 1 ? "" : "s"} for Sow ${record.sow_id}.`,
            priority,
            details:
                `Sow ID: ${record.sow_id} | Check Date: ${formatPlatformDate(record.check21)}`
        });
    });
}


/* ============================================================
   90-DAY FEED UP
   ============================================================ */

async function loadPlatform90DayFeedAlerts(farm) {

    const today = getPlatformToday();
    const sevenDaysLater = addDaysToDate(today, 7);

    const sevenDaysLaterString =
        `${sevenDaysLater.getFullYear()}-${String(
            sevenDaysLater.getMonth() + 1
        ).padStart(2, "0")}-${String(
            sevenDaysLater.getDate()
        ).padStart(2, "0")}`;

    const { data, error } = await supabaseClient
        .from("gestation_records")
        .select(`
            id,
            sow_id,
            feed90,
            farm_id
        `)
        .eq("farm_id", farm.id)
        .not("feed90", "is", null)
        .gte("feed90", today)
        .lte("feed90", sevenDaysLaterString);

    if (error) {
        console.error(
            `Platform 90-Day Feed error for ${farm.farm_name}:`,
            error
        );
        return;
    }

    (data || []).forEach(record => {

        const days = daysDifference(record.feed90, today);

        let priority = "Important";

        if (days === 0) {
            priority = "Urgent";
        }

        addPlatformFarmAlert({
            farmId: farm.id,
            farmName: farm.farm_name,
            type: "Gestation",
            title: "90-Day Feed Up",
            message:
                days === 0
                    ? `90-day feed-up action is due today for Sow ${record.sow_id}.`
                    : `90-day feed-up action is due in ${days} day${days === 1 ? "" : "s"} for Sow ${record.sow_id}.`,
            priority,
            details:
                `Sow ID: ${record.sow_id} | Feed-Up Date: ${formatPlatformDate(record.feed90)}`
        });
    });
}


/* ============================================================
   101-DAY DEWORMER
   ============================================================ */

async function loadPlatform101DayDewormerAlerts(farm) {

    const today = getPlatformToday();
    const sevenDaysLater = addDaysToDate(today, 7);

    const sevenDaysLaterString =
        `${sevenDaysLater.getFullYear()}-${String(
            sevenDaysLater.getMonth() + 1
        ).padStart(2, "0")}-${String(
            sevenDaysLater.getDate()
        ).padStart(2, "0")}`;

    const { data, error } = await supabaseClient
        .from("gestation_records")
        .select(`
            id,
            sow_id,
            deworm101,
            farm_id
        `)
        .eq("farm_id", farm.id)
        .not("deworm101", "is", null)
        .gte("deworm101", today)
        .lte("deworm101", sevenDaysLaterString);

    if (error) {
        console.error(
            `Platform 101-Day Dewormer error for ${farm.farm_name}:`,
            error
        );
        return;
    }

    (data || []).forEach(record => {

        const days = daysDifference(record.deworm101, today);

        addPlatformFarmAlert({
            farmId: farm.id,
            farmName: farm.farm_name,
            type: "Gestation",
            title: "101-Day Dewormer",
            message:
                days === 0
                    ? `101-day dewormer is due today for Sow ${record.sow_id}.`
                    : `101-day dewormer is due in ${days} day${days === 1 ? "" : "s"} for Sow ${record.sow_id}.`,
            priority: days === 0 ? "Urgent" : "Important",
            details:
                `Sow ID: ${record.sow_id} | Dewormer Date: ${formatPlatformDate(record.deworm101)}`
        });
    });
}


/* ============================================================
   101-DAY LITTER GUARD
   ============================================================ */

async function loadPlatform101DayLitterGuardAlerts(farm) {

    const today = getPlatformToday();
    const sevenDaysLater = addDaysToDate(today, 7);

    const sevenDaysLaterString =
        `${sevenDaysLater.getFullYear()}-${String(
            sevenDaysLater.getMonth() + 1
        ).padStart(2, "0")}-${String(
            sevenDaysLater.getDate()
        ).padStart(2, "0")}`;

    const { data, error } = await supabaseClient
        .from("gestation_records")
        .select(`
            id,
            sow_id,
            litter101,
            farm_id
        `)
        .eq("farm_id", farm.id)
        .not("litter101", "is", null)
        .gte("litter101", today)
        .lte("litter101", sevenDaysLaterString);

    if (error) {
        console.error(
            `Platform 101-Day Litter Guard error for ${farm.farm_name}:`,
            error
        );
        return;
    }

    (data || []).forEach(record => {

        const days = daysDifference(record.litter101, today);

        addPlatformFarmAlert({
            farmId: farm.id,
            farmName: farm.farm_name,
            type: "Gestation",
            title: "101-Day Litter Guard",
            message:
                days === 0
                    ? `101-day Litter Guard action is due today for Sow ${record.sow_id}.`
                    : `101-day Litter Guard action is due in ${days} day${days === 1 ? "" : "s"} for Sow ${record.sow_id}.`,
            priority: days === 0 ? "Urgent" : "Important",
            details:
                `Sow ID: ${record.sow_id} | Litter Guard Date: ${formatPlatformDate(record.litter101)}`
        });
    });
}


/* ============================================================
   107-DAY ACTION DAY
   ============================================================ */

async function loadPlatformActionDayAlerts(farm) {

    const today = getPlatformToday();
    const sevenDaysLater = addDaysToDate(today, 7);

    const sevenDaysLaterString =
        `${sevenDaysLater.getFullYear()}-${String(
            sevenDaysLater.getMonth() + 1
        ).padStart(2, "0")}-${String(
            sevenDaysLater.getDate()
        ).padStart(2, "0")}`;

    const { data, error } = await supabaseClient
        .from("gestation_records")
        .select(`
            id,
            sow_id,
            action_day,
            farm_id
        `)
        .eq("farm_id", farm.id)
        .not("action_day", "is", null)
        .gte("action_day", today)
        .lte("action_day", sevenDaysLaterString);

    if (error) {
        console.error(
            `Platform Action Day error for ${farm.farm_name}:`,
            error
        );
        return;
    }

    (data || []).forEach(record => {

        const days = daysDifference(record.action_day, today);

        addPlatformFarmAlert({
            farmId: farm.id,
            farmName: farm.farm_name,
            type: "Gestation",
            title: "107-Day Action Day",
            message:
                days === 0
                    ? `107-day action day is due today for Sow ${record.sow_id}.`
                    : `107-day action day is due in ${days} day${days === 1 ? "" : "s"} for Sow ${record.sow_id}.`,
            priority: days === 0 ? "Urgent" : "Important",
            details:
                `Sow ID: ${record.sow_id} | Action Date: ${formatPlatformDate(record.action_day)}`
        });
    });
}


/* ============================================================
   114-DAY FARROWSURE
   ============================================================ */

async function loadPlatform114DayAlerts(farm) {

    const today = getPlatformToday();
    const sevenDaysLater = addDaysToDate(today, 7);

    const sevenDaysLaterString =
        `${sevenDaysLater.getFullYear()}-${String(
            sevenDaysLater.getMonth() + 1
        ).padStart(2, "0")}-${String(
            sevenDaysLater.getDate()
        ).padStart(2, "0")}`;

    const { data, error } = await supabaseClient
        .from("gestation_records")
        .select(`
            id,
            sow_id,
            farrowsure,
            farm_id
        `)
        .eq("farm_id", farm.id)
        .not("farrowsure", "is", null)
        .gte("farrowsure", today)
        .lte("farrowsure", sevenDaysLaterString);

    if (error) {
        console.error(
            `Platform FarrowSure error for ${farm.farm_name}:`,
            error
        );
        return;
    }

    (data || []).forEach(record => {

        const days = daysDifference(record.farrowsure, today);

        addPlatformFarmAlert({
            farmId: farm.id,
            farmName: farm.farm_name,
            type: "Gestation",
            title: "114-Day FarrowSure",
            message:
                days === 0
                    ? `114-day FarrowSure action is due today for Sow ${record.sow_id}.`
                    : `114-day FarrowSure action is due in ${days} day${days === 1 ? "" : "s"} for Sow ${record.sow_id}.`,
            priority: days === 0 ? "Urgent" : "Important",
            details:
                `Sow ID: ${record.sow_id} | FarrowSure Date: ${formatPlatformDate(record.farrowsure)}`
        });
    });
}


/* ============================================================
   EXPECTED FARROWING / DELIVERY
   ============================================================ */

async function loadPlatformDeliveryAlerts(farm) {

    const today = getPlatformToday();
    const sevenDaysLater = addDaysToDate(today, 7);

    const sevenDaysLaterString =
        `${sevenDaysLater.getFullYear()}-${String(
            sevenDaysLater.getMonth() + 1
        ).padStart(2, "0")}-${String(
            sevenDaysLater.getDate()
        ).padStart(2, "0")}`;

    const { data, error } = await supabaseClient
        .from("gestation_records")
        .select(`
            id,
            sow_id,
            delivery_date,
            farm_id
        `)
        .eq("farm_id", farm.id)
        .not("delivery_date", "is", null)
        .gte("delivery_date", today)
        .lte("delivery_date", sevenDaysLaterString);

    if (error) {
        console.error(
            `Platform Delivery Date error for ${farm.farm_name}:`,
            error
        );
        return;
    }

    (data || []).forEach(record => {

        const days = daysDifference(record.delivery_date, today);

        addPlatformFarmAlert({
            farmId: farm.id,
            farmName: farm.farm_name,
            type: "Gestation",
            title: "Expected Farrowing",
            message:
                days === 0
                    ? `Expected farrowing is today for Sow ${record.sow_id}.`
                    : `Expected farrowing is in ${days} day${days === 1 ? "" : "s"} for Sow ${record.sow_id}.`,
            priority: days === 0 ? "Urgent" : "Important",
            details:
                `Sow ID: ${record.sow_id} | Expected Date: ${formatPlatformDate(record.delivery_date)}`
        });
    });
}


/* ============================================================
   FARROWING INTERVENTIONS
   ============================================================ */

async function loadPlatformFarrowingInterventionAlerts(farm) {

    const today = getPlatformToday();
    const sevenDaysLater = addDaysToDate(today, 7);

    const sevenDaysLaterString =
        `${sevenDaysLater.getFullYear()}-${String(
            sevenDaysLater.getMonth() + 1
        ).padStart(2, "0")}-${String(
            sevenDaysLater.getDate()
        ).padStart(2, "0")}`;

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
        .eq("farm_id", farm.id);

    if (error) {
        console.error(
            `Platform Farrowing Intervention error for ${farm.farm_name}:`,
            error
        );
        return;
    }

    (data || []).forEach(record => {

        const interventions = [
            {
                field: "iron_date",
                title: "Iron Injection",
                label: "Iron injection",
                date: record.iron_date
            },
            {
                field: "teeth_date",
                title: "Teeth Clipping",
                label: "Teeth clipping",
                date: record.teeth_date
            },
            {
                field: "tail_date",
                title: "Tail Docking",
                label: "Tail docking",
                date: record.tail_date
            }
        ];

        interventions.forEach(intervention => {

            if (!intervention.date) {
                return;
            }

            const days = daysDifference(
                intervention.date,
                today
            );

            if (
                days === null ||
                days < 0 ||
                days > 7
            ) {
                return;
            }

            addPlatformFarmAlert({
                farmId: farm.id,
                farmName: farm.farm_name,
                type: "Farrowing",
                title: intervention.title,
                message:
                    days === 0
                        ? `${intervention.label} is due today for Sow ${record.sow_id}.`
                        : `${intervention.label} is due in ${days} day${days === 1 ? "" : "s"} for Sow ${record.sow_id}.`,
                priority: days === 0 ? "Urgent" : "Important",
                details:
                    `Sow ID: ${record.sow_id} | Date: ${formatPlatformDate(intervention.date)}`
            });
        });
    });
}


/* ============================================================
   WEANING ALERTS
   ============================================================ */

async function loadPlatformWeaningAlerts(farm) {

    const today = getPlatformToday();

    const sevenDaysBack = addDaysToDate(today, -7);
    const sevenDaysForward = addDaysToDate(today, 7);

    const sevenDaysBackString =
        `${sevenDaysBack.getFullYear()}-${String(
            sevenDaysBack.getMonth() + 1
        ).padStart(2, "0")}-${String(
            sevenDaysBack.getDate()
        ).padStart(2, "0")}`;

    const sevenDaysForwardString =
        `${sevenDaysForward.getFullYear()}-${String(
            sevenDaysForward.getMonth() + 1
        ).padStart(2, "0")}-${String(
            sevenDaysForward.getDate()
        ).padStart(2, "0")}`;

    const { data, error } = await supabaseClient
        .from("weaning_records")
        .select(`
            id,
            sow_id,
            farrow_date,
            weaning_date,
            total_weaned,
            farm_id
        `)
        .eq("farm_id", farm.id)
        .not("weaning_date", "is", null)
        .gte("weaning_date", sevenDaysBackString)
        .lte("weaning_date", sevenDaysForwardString);

    if (error) {
        console.error(
            `Platform Weaning error for ${farm.farm_name}:`,
            error
        );
        return;
    }

    (data || []).forEach(record => {

        const days = daysDifference(
            record.weaning_date,
            today
        );

        if (days === null) {
            return;
        }

        if (days < -7 || days > 7) {
            return;
        }

        let priority = "Important";

        if (days <= 0) {
            priority = "Urgent";
        }

        let message = "";

        if (days === 0) {
            message =
                `Weaning is due today for Sow ${record.sow_id}.`;
        } else if (days > 0) {
            message =
                `Weaning is due in ${days} day${days === 1 ? "" : "s"} for Sow ${record.sow_id}.`;
        } else {
            const overdueDays = Math.abs(days);

            message =
                `Weaning for Sow ${record.sow_id} is ${overdueDays} day${overdueDays === 1 ? "" : "s"} overdue.`;
        }

        addPlatformFarmAlert({
            farmId: farm.id,
            farmName: farm.farm_name,
            type: "Weaning",
            title: "Weaning Alert",
            message,
            priority,
            details:
                `Sow ID: ${record.sow_id} | Weaning Date: ${formatPlatformDate(record.weaning_date)} | Total Weaned: ${record.total_weaned ?? 0}`
        });
    });
}


/* ============================================================
   NOT SERVICED
   ============================================================ */

async function loadPlatformNotServicedAlerts(farm) {

    const { data, error } = await supabaseClient
        .from("gestation_records")
        .select(`
            id,
            sow_id,
            status,
            service_date,
            farm_id
        `)
        .eq("farm_id", farm.id)
        .eq("status", "Pregnant")
        .is("service_date", null);

    if (error) {
        console.error(
            `Platform Not Serviced error for ${farm.farm_name}:`,
            error
        );
        return;
    }

    (data || []).forEach(record => {

        addPlatformFarmAlert({
            farmId: farm.id,
            farmName: farm.farm_name,
            type: "Gestation",
            title: "Not Serviced",
            message:
                `Sow ${record.sow_id} is marked Pregnant but has no service date recorded.`,
            priority: "Urgent",
            details:
                `Sow ID: ${record.sow_id} | Status: ${record.status} | Service Date: Not Recorded`
        });
    });
}


/* ============================================================
   FEEDING ALERTS
   ============================================================ */

async function loadPlatformFeedingAlerts(farm) {

    const today = getPlatformToday();

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
            farm_id
        `)
        .eq("farm_id", farm.id)
        .eq("feeding_date", today);

    if (error) {
        console.error(
            `Platform Feeding error for ${farm.farm_name}:`,
            error
        );
        return;
    }

    (data || []).forEach(record => {

        if (record.morning_feeding) {

            addPlatformFarmAlert({
                farmId: farm.id,
                farmName: farm.farm_name,
                type: "Feeding",
                title: "Morning Feeding",
                message:
                    `Morning feeding is scheduled for Pen ${record.pen_number || "N/A"}.`,
                priority: "Important",
                details:
                    `Pen: ${record.pen_number || "N/A"} | Feed: ${record.feed_type || "N/A"} | Quantity: ${record.quantity ?? "N/A"} | Time: ${record.morning_feeding}`
            });
        }

        if (record.evening_feeding) {

            addPlatformFarmAlert({
                farmId: farm.id,
                farmName: farm.farm_name,
                type: "Feeding",
                title: "Evening Feeding",
                message:
                    `Evening feeding is scheduled for Pen ${record.pen_number || "N/A"}.`,
                priority: "Important",
                details:
                    `Pen: ${record.pen_number || "N/A"} | Feed: ${record.feed_type || "N/A"} | Quantity: ${record.quantity ?? "N/A"} | Time: ${record.evening_feeding}`
            });
        }
    });
}


/* ============================================================
   WATER ALERTS
   ============================================================ */

async function loadPlatformWaterAlerts(farm) {

    const today = getPlatformToday();

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
        .eq("farm_id", farm.id)
        .eq("feeding_date", today);

    if (error) {
        console.error(
            `Platform Water error for ${farm.farm_name}:`,
            error
        );
        return;
    }

    (data || []).forEach(record => {

        const waterValue =
            String(record.water_available || "")
                .trim()
                .toLowerCase();

        const waterIsAvailable =
            waterValue === "yes" ||
            waterValue === "available" ||
            waterValue === "true";

        if (!waterIsAvailable) {

            addPlatformFarmAlert({
                farmId: farm.id,
                farmName: farm.farm_name,
                type: "Water",
                title: "Water Availability Check",
                message:
                    `Water availability requires attention for Pen ${record.pen_number || "N/A"}.`,
                priority: "Urgent",
                details:
                    `Pen: ${record.pen_number || "N/A"} | Water Available: ${record.water_available || "Not Recorded"}`
            });
        }
    });
}


/* ============================================================
   LOAD ALERTS FOR ONE FARM
   ============================================================ */

async function loadAlertsForPlatformFarm(farm) {

    await loadPlatform21DayCheckAlerts(farm);

    await loadPlatform90DayFeedAlerts(farm);

    await loadPlatform101DayDewormerAlerts(farm);

    await loadPlatform101DayLitterGuardAlerts(farm);

    await loadPlatformActionDayAlerts(farm);

    await loadPlatform114DayAlerts(farm);

    await loadPlatformDeliveryAlerts(farm);

    await loadPlatformFarrowingInterventionAlerts(farm);

    await loadPlatformWeaningAlerts(farm);

    await loadPlatformNotServicedAlerts(farm);

    await loadPlatformFeedingAlerts(farm);

    await loadPlatformWaterAlerts(farm);
}


/* ============================================================
   LOAD ALL PLATFORM FARM ALERTS
   ============================================================ */

async function loadPlatformFarmAlerts() {

    console.log("==============================================");
    console.log("MUNKA PIGGERY - PLATFORM FARM ALERTS");
    console.log("Loading alerts for all farms...");
    console.log("==============================================");

    platformFarmAlerts = [];

    if (typeof supabaseClient === "undefined" || !supabaseClient) {

        console.error(
            "Supabase client is not available."
        );

        renderPlatformFarmAlerts();

        return;
    }

    try {

        const { data: farms, error: farmsError } =
            await supabaseClient
                .from("farms")
                .select(`
                    id,
                    farm_name,
                    status
                `)
                .order("farm_name", {
                    ascending: true
                });

        if (farmsError) {

            console.error(
                "Could not load farms for platform alerts:",
                farmsError
            );

            renderPlatformFarmAlerts();

            return;
        }

        if (!farms || farms.length === 0) {

            console.log(
                "No farms found."
            );

            renderPlatformFarmAlerts();

            return;
        }

        console.log(
            `Found ${farms.length} farm(s).`
        );


        for (const farm of farms) {

            console.log(
                `Loading alerts for Farm ${farm.id}: ${farm.farm_name}`
            );

            try {

                await loadAlertsForPlatformFarm(farm);

            } catch (farmError) {

                console.error(
                    `Error loading alerts for Farm ${farm.id} - ${farm.farm_name}:`,
                    farmError
                );
            }
        }


        /* ====================================================
           SORT
           ==================================================== */

        platformFarmAlerts.sort((a, b) => {

            const priorityDifference =
                platformPriorityRank(a.priority) -
                platformPriorityRank(b.priority);

            if (priorityDifference !== 0) {
                return priorityDifference;
            }

            const farmDifference =
                String(a.farmName || "")
                    .localeCompare(
                        String(b.farmName || "")
                    );

            if (farmDifference !== 0) {
                return farmDifference;
            }

            return String(a.title || "")
                .localeCompare(
                    String(b.title || "")
                );
        });


        console.log(
            `Platform alerts loaded: ${platformFarmAlerts.length}`
        );

        renderPlatformFarmAlerts();

    } catch (error) {

        console.error(
            "Unexpected error loading platform farm alerts:",
            error
        );

        renderPlatformFarmAlerts();
    }
}


/* ============================================================
   RENDER PLATFORM FARM ALERTS
   ============================================================ */

function renderPlatformFarmAlerts() {

    const container =
        document.getElementById("platformFarmAlerts");

    if (!container) {

        console.warn(
            "Element #platformFarmAlerts was not found."
        );

        return;
    }


    /* ========================================================
       NO ALERTS
       ======================================================== */

    if (
        !platformFarmAlerts ||
        platformFarmAlerts.length === 0
    ) {

        container.innerHTML = `
            <div class="platform-no-alerts">
                <div class="platform-no-alerts-icon">
                    ✅
                </div>

                <div class="platform-no-alerts-title">
                    No Farm Alerts
                </div>

                <div class="platform-no-alerts-text">
                    There are currently no farm alerts requiring attention.
                </div>
            </div>
        `;

        return;
    }


    /* ========================================================
       ALERT COUNT
       ======================================================== */

    const urgentCount =
        platformFarmAlerts.filter(
            alert => alert.priority === "Urgent"
        ).length;

    const importantCount =
        platformFarmAlerts.filter(
            alert => alert.priority === "Important"
        ).length;


    let html = `
        <div class="platform-alert-summary">

            <div class="platform-alert-summary-item">
                <strong>${platformFarmAlerts.length}</strong>
                <span>Total Alerts</span>
            </div>

            <div class="platform-alert-summary-item urgent">
                <strong>${urgentCount}</strong>
                <span>Urgent</span>
            </div>

            <div class="platform-alert-summary-item important">
                <strong>${importantCount}</strong>
                <span>Important</span>
            </div>

        </div>

        <div class="platform-farm-alert-list">
    `;


    /* ========================================================
       ALERT CARDS
       ======================================================== */

    platformFarmAlerts.forEach(alert => {

        const priorityClass =
            String(alert.priority || "Important")
                .toLowerCase()
                .replace(/\s+/g, "-");


        html += `
            <div class="platform-farm-alert-card ${priorityClass}">

                <div class="platform-farm-alert-header">

                    <div class="platform-farm-alert-priority">
                        ${alert.priority === "Urgent" ? "🔴" : "🟡"}
                        ${escapePlatformAlertHTML(alert.priority)}
                    </div>

                    <div class="platform-farm-alert-type">
                        ${escapePlatformAlertHTML(alert.type)}
                    </div>

                </div>


                <div class="platform-farm-alert-farm">

                    🐖
                    <strong>
                        ${escapePlatformAlertHTML(alert.farmName)}
                    </strong>

                    <span>
                        Farm ID:
                        ${escapePlatformAlertHTML(alert.farmId)}
                    </span>

                </div>


                <div class="platform-farm-alert-title">
                    ${escapePlatformAlertHTML(alert.title)}
                </div>


                <div class="platform-farm-alert-message">
                    ${escapePlatformAlertHTML(alert.message)}
                </div>


                ${
                    alert.details
                        ? `
                            <div class="platform-farm-alert-details">
                                ${escapePlatformAlertHTML(alert.details)}
                            </div>
                          `
                        : ""
                }

            </div>
        `;
    });


    html += `
        </div>
    `;


    container.innerHTML = html;
}


/* ============================================================
   REFRESH BUTTON
   ============================================================ */

async function refreshPlatformFarmAlerts() {

    const button =
        document.getElementById("refreshPlatformFarmAlerts");

    if (button) {

        button.disabled = true;

        button.dataset.originalText =
            button.textContent;

        button.textContent =
            "⏳ Refreshing...";
    }


    try {

        await loadPlatformFarmAlerts();

    } finally {

        if (button) {

            button.disabled = false;

            button.textContent =
                button.dataset.originalText ||
                "🔄 Refresh Alerts";
        }
    }
}


/* ============================================================
   GLOBAL FUNCTIONS
   ============================================================ */

window.loadPlatformFarmAlerts =
    loadPlatformFarmAlerts;

window.refreshPlatformFarmAlerts =
    refreshPlatformFarmAlerts;


/* ============================================================
   INITIALIZATION
   ============================================================ */

document.addEventListener(
    "DOMContentLoaded",
    function () {

        console.log(
            "Platform Farm Alerts initialized."
        );

        loadPlatformFarmAlerts();

    }
);