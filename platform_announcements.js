/* ============================================================
   MUNKA PIGGERY TECHNOLOGY
   SUPER ADMIN PLATFORM ANNOUNCEMENTS
   ============================================================ */

let platformAnnouncements = [];
let platformAnnouncementFarms = [];

let platformAnnouncementsInitialized = false;


/* ============================================================
   WAIT FOR SUPABASE CLIENT
   ============================================================ */

async function waitForPlatformSupabaseClient(
    maxAttempts = 50,
    delay = 100
) {

    for (let attempt = 0; attempt < maxAttempts; attempt++) {

        if (
            typeof window.supabaseClient !== "undefined" &&
            window.supabaseClient
        ) {
            return window.supabaseClient;
        }

        await new Promise(
            resolve => setTimeout(resolve, delay)
        );
    }

    return null;
}


/* ============================================================
   DATE FORMAT
   ============================================================ */

function platformAnnouncementFormatDate(value) {

    if (!value) {
        return "Date not available";
    }

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
        return "Date not available";
    }

    return date.toLocaleString("en-ZM", {
        timeZone: "Africa/Lusaka",
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit"
    });
}


/* ============================================================
   HTML SECURITY
   ============================================================ */

function escapePlatformAnnouncementHTML(value) {

    return String(value ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}


/* ============================================================
   SHOW ERROR
   ============================================================ */

function showPlatformAnnouncementError(message) {

    const container =
        document.getElementById(
            "platformAnnouncements"
        );

    const status =
        document.getElementById(
            "platformAnnouncementsStatus"
        );


    if (status) {

        status.textContent =
            "Announcements could not be loaded.";
    }


    if (container) {

        container.innerHTML = `

            <div class="platform-announcement-error">

                <strong>
                    Announcements could not be loaded.
                </strong>

                <p>
                    ${escapePlatformAnnouncementHTML(
                        message ||
                        "An unexpected error occurred."
                    )}
                </p>

                <button
                    type="button"
                    onclick="retryPlatformAnnouncements()"
                >
                    🔄 Try Again
                </button>

            </div>
        `;
    }
}


/* ============================================================
   LOAD FARMS
   ============================================================ */

async function loadPlatformAnnouncementFarms() {

    const select =
        document.getElementById(
            "platformAnnouncementFarmFilter"
        );


    const client =
        window.supabaseClient;


    if (!client) {

        console.error(
            "Supabase client is not available."
        );

        platformAnnouncementFarms = [];

        if (select) {

            select.innerHTML = `
                <option value="all">
                    All Farms
                </option>
            `;
        }

        return false;
    }


    try {

        const {
            data,
            error
        } = await client
            .from("farms")
            .select("id, farm_name, status")
            .order("farm_name", {
                ascending: true
            });


        if (error) {

            console.error(
                "Platform announcement farms error:",
                error
            );

            platformAnnouncementFarms = [];

            if (select) {

                select.innerHTML = `
                    <option value="all">
                        All Farms
                    </option>
                `;
            }

            return false;
        }


        platformAnnouncementFarms =
            data || [];


        populatePlatformAnnouncementFarmFilter();


        return true;

    } catch (error) {

        console.error(
            "Unexpected platform farm loading error:",
            error
        );

        platformAnnouncementFarms = [];

        if (select) {

            select.innerHTML = `
                <option value="all">
                    All Farms
                </option>
            `;
        }

        return false;
    }
}


/* ============================================================
   FARM FILTER
   ============================================================ */

function populatePlatformAnnouncementFarmFilter() {

    const select =
        document.getElementById(
            "platformAnnouncementFarmFilter"
        );


    if (!select) {

        console.warn(
            "platformAnnouncementFarmFilter not found."
        );

        return;
    }


    select.innerHTML = `
        <option value="all">
            All Farms
        </option>
    `;


    platformAnnouncementFarms.forEach(
        farm => {

            const option =
                document.createElement("option");


            option.value =
                String(farm.id);


            option.textContent =
                farm.farm_name ||
                `Farm ${farm.id}`;


            select.appendChild(option);
        }
    );
}


/* ============================================================
   FARM NAME
   ============================================================ */

function getPlatformAnnouncementFarmName(
    farmId
) {

    if (!farmId) {

        return "MUNKA PIGGERY PLATFORM";
    }


    const farm =
        platformAnnouncementFarms.find(
            item =>
                Number(item.id) ===
                Number(farmId)
        );


    if (!farm) {

        return `Farm ${farmId}`;
    }


    return (
        farm.farm_name ||
        `Farm ${farmId}`
    );
}


/* ============================================================
   LOAD ANNOUNCEMENTS
   ============================================================ */

async function loadPlatformAnnouncements() {

    const container =
        document.getElementById(
            "platformAnnouncements"
        );


    const status =
        document.getElementById(
            "platformAnnouncementsStatus"
        );


    if (status) {

        status.textContent =
            "Loading platform announcements...";
    }


    if (container) {

        container.innerHTML = `
            <div class="platform-announcement-loading">
                Loading announcements...
            </div>
        `;
    }


    const client =
        await waitForPlatformSupabaseClient();


    if (!client) {

        showPlatformAnnouncementError(
            "Supabase could not be initialized. Please check supabase.js and try again."
        );

        return false;
    }


    try {

        console.log(
            "Loading announcements from Supabase..."
        );


        const {
            data,
            error
        } = await client
            .from("announcements")
            .select(`
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
            `)
            .order("created_at", {
                ascending: false
            });


        if (error) {

            console.error(
                "Platform announcements database error:",
                error
            );


            showPlatformAnnouncementError(
                error.message ||
                "Database error while loading announcements."
            );


            return false;
        }


        platformAnnouncements =
            data || [];


        console.log(
            "Platform announcements loaded:",
            platformAnnouncements.length
        );


        displayPlatformAnnouncements();


        return true;

    } catch (error) {

        console.error(
            "Unexpected platform announcements error:",
            error
        );


        showPlatformAnnouncementError(
            error.message ||
            "Unexpected error occurred."
        );


        return false;
    }
}


/* ============================================================
   FILTER ANNOUNCEMENTS
   ============================================================ */

function filterPlatformAnnouncements() {

    const farmFilter =
        document.getElementById(
            "platformAnnouncementFarmFilter"
        )?.value || "all";


    const priorityFilter =
        document.getElementById(
            "platformAnnouncementPriorityFilter"
        )?.value || "all";


    const targetFilter =
        document.getElementById(
            "platformAnnouncementTargetFilter"
        )?.value || "all";


    return platformAnnouncements.filter(
        announcement => {


            /*
             * PLATFORM ANNOUNCEMENTS
             *
             * If "All Farms" is selected,
             * platform announcements remain visible.
             */

            const farmMatches =
                farmFilter === "all" ||
                (
                    announcement.farm_id !== null &&
                    announcement.farm_id !== undefined &&
                    String(
                        announcement.farm_id
                    ) === String(farmFilter)
                );


            const priorityMatches =
                priorityFilter === "all" ||
                announcement.priority ===
                priorityFilter;


            const targetMatches =
                targetFilter === "all" ||
                announcement.target_type ===
                targetFilter;


            return (
                farmMatches &&
                priorityMatches &&
                targetMatches
            );
        }
    );
}


/* ============================================================
   TARGET TEXT
   ============================================================ */

function getPlatformAnnouncementTargetText(
    announcement
) {

    const target =
        announcement.target_type;


    if (target === "Platform") {

        return "Entire Platform";
    }


    if (target === "Farm") {

        return (
            "Whole Farm: " +
            getPlatformAnnouncementFarmName(
                announcement.farm_id
            )
        );
    }


    if (target === "Role") {

        return (
            "Role: " +
            (
                announcement.target_role ||
                "Specific Role"
            )
        );
    }


    if (target === "User") {

        return (
            `User ID: ${
                announcement.target_user_id ||
                "Unknown"
            }`
        );
    }


    return target || "Unknown";
}


/* ============================================================
   PRIORITY CLASS
   ============================================================ */

function getPlatformAnnouncementPriorityClass(
    priority
) {

    const value =
        String(
            priority || "Normal"
        ).toLowerCase();


    if (value === "urgent") {

        return "platform-announcement-urgent";
    }


    if (value === "important") {

        return "platform-announcement-important";
    }


    return "platform-announcement-normal";
}


/* ============================================================
   CREATE ANNOUNCEMENT CARD
   ============================================================ */

function createPlatformAnnouncementCard(
    announcement
) {

    const card =
        document.createElement("article");


    const priorityClass =
        getPlatformAnnouncementPriorityClass(
            announcement.priority
        );


    const farmName =
        announcement.farm_id
            ? getPlatformAnnouncementFarmName(
                announcement.farm_id
            )
            : "MUNKA PIGGERY PLATFORM";


    const targetText =
        getPlatformAnnouncementTargetText(
            announcement
        );


    const activeText =
        announcement.is_active
            ? "Active"
            : "Inactive";


    card.className =
        `platform-announcement-card ${priorityClass}`;


    card.innerHTML = `

        <div class="platform-announcement-card-header">

            <div class="platform-announcement-farm">

                🏢

                <span>
                    ${escapePlatformAnnouncementHTML(
                        farmName
                    )}
                </span>

            </div>


            <span class="platform-announcement-priority">

                ${escapePlatformAnnouncementHTML(
                    announcement.priority ||
                    "Normal"
                )}

            </span>

        </div>


        <div class="platform-announcement-body">

            <h3>

                ${escapePlatformAnnouncementHTML(
                    announcement.title
                )}

            </h3>


            <p class="platform-announcement-message">

                ${escapePlatformAnnouncementHTML(
                    announcement.message
                )}

            </p>


            <div class="platform-announcement-meta">

                <span>
                    🎯
                    ${escapePlatformAnnouncementHTML(
                        announcement.target_type ||
                        "Unknown"
                    )}
                </span>


                <span>
                    📍
                    ${escapePlatformAnnouncementHTML(
                        targetText
                    )}
                </span>


                <span>
                    🕐
                    ${escapePlatformAnnouncementHTML(
                        platformAnnouncementFormatDate(
                            announcement.created_at
                        )
                    )}
                </span>


                <span>

                    ${
                        announcement.is_active
                            ? "🟢"
                            : "⚪"
                    }

                    ${activeText}

                </span>

            </div>

        </div>
    `;


    return card;
}


/* ============================================================
   DISPLAY ANNOUNCEMENTS
   ============================================================ */

function displayPlatformAnnouncements() {

    const container =
        document.getElementById(
            "platformAnnouncements"
        );


    const status =
        document.getElementById(
            "platformAnnouncementsStatus"
        );


    if (!container) {

        console.warn(
            "platformAnnouncements element not found."
        );

        return;
    }


    const filteredAnnouncements =
        filterPlatformAnnouncements();


    if (!filteredAnnouncements.length) {

        container.innerHTML = `

            <div class="platform-announcement-empty">

                <div class="platform-announcement-empty-icon">
                    📢
                </div>

                <h3>
                    No announcements found
                </h3>

                <p>
                    There are no announcements matching
                    the selected filters.
                </p>

            </div>
        `;


        if (status) {

            status.textContent =
                "No announcements found.";
        }


        return;
    }


    container.innerHTML = "";


    filteredAnnouncements.forEach(
        announcement => {

            container.appendChild(
                createPlatformAnnouncementCard(
                    announcement
                )
            );
        }
    );


    if (status) {

        status.textContent =
            `${filteredAnnouncements.length} announcement` +
            `${
                filteredAnnouncements.length === 1
                    ? ""
                    : "s"
            } displayed.`;
    }
}


/* ============================================================
   FILTER EVENTS
   ============================================================ */

function setupPlatformAnnouncementFilters() {

    const farmFilter =
        document.getElementById(
            "platformAnnouncementFarmFilter"
        );


    const priorityFilter =
        document.getElementById(
            "platformAnnouncementPriorityFilter"
        );


    const targetFilter =
        document.getElementById(
            "platformAnnouncementTargetFilter"
        );


    if (farmFilter) {

        farmFilter.addEventListener(
            "change",
            displayPlatformAnnouncements
        );
    }


    if (priorityFilter) {

        priorityFilter.addEventListener(
            "change",
            displayPlatformAnnouncements
        );
    }


    if (targetFilter) {

        targetFilter.addEventListener(
            "change",
            displayPlatformAnnouncements
        );
    }


    const refreshButton =
        document.getElementById(
            "refreshPlatformAnnouncements"
        );


    if (refreshButton) {

        refreshButton.addEventListener(
            "click",
            async function() {

                refreshButton.disabled = true;

                const originalText =
                    refreshButton.textContent;


                refreshButton.textContent =
                    "⏳ Refreshing...";


                try {

                    await loadPlatformAnnouncementFarms();

                    await loadPlatformAnnouncements();

                } finally {

                    refreshButton.disabled = false;

                    refreshButton.textContent =
                        originalText || "🔄 Refresh";
                }
            }
        );
    }
}


/* ============================================================
   RETRY
   ============================================================ */

async function retryPlatformAnnouncements() {

    console.log(
        "Retrying platform announcements..."
    );


    const container =
        document.getElementById(
            "platformAnnouncements"
        );


    if (container) {

        container.innerHTML = `
            <div class="platform-announcement-loading">
                🔄 Retrying...
            </div>
        `;
    }


    await loadPlatformAnnouncementFarms();

    await loadPlatformAnnouncements();
}


/* ============================================================
   INITIALIZE
   ============================================================ */

async function initializePlatformAnnouncements() {

    if (platformAnnouncementsInitialized) {
        return;
    }


    platformAnnouncementsInitialized = true;


    console.log(
        "Initializing Platform Announcements..."
    );


    try {

        /*
         * Wait for Supabase.
         */

        const client =
            await waitForPlatformSupabaseClient();


        if (!client) {

            showPlatformAnnouncementError(
                "Supabase client is not available. Check that supabase.js loads before platform_announcements.js."
            );

            return;
        }


        /*
         * Farms are loaded first for
         * the announcement filter.
         *
         * Announcement loading continues
         * even if farms fail.
         */

        await loadPlatformAnnouncementFarms();


        await loadPlatformAnnouncements();


        setupPlatformAnnouncementFilters();


        console.log(
            "Platform Announcements initialized successfully."
        );

    } catch (error) {

        console.error(
            "Platform announcements initialization failed:",
            error
        );


        showPlatformAnnouncementError(
            error.message ||
            "Platform announcements failed to initialize."
        );
    }
}


/* ============================================================
   START
   ============================================================ */

document.addEventListener(
    "DOMContentLoaded",
    initializePlatformAnnouncements
);