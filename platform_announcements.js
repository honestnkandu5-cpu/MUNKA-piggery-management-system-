/* ============================================================
   MUNKA PIGGERY TECHNOLOGY
   SUPER ADMIN PLATFORM ANNOUNCEMENTS
   ============================================================ */

let platformAnnouncements = [];
let platformAnnouncementFarms = [];


/* ============================================================
   DATE FORMAT
   ============================================================ */

function platformAnnouncementFormatDate(value) {
    if (!value) return "Date not available";

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
        return "Date not available";
    }

    return date.toLocaleString("en-ZM", {
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
   LOAD FARMS
   ============================================================ */

async function loadPlatformAnnouncementFarms() {

    const select =
        document.getElementById(
            "platformAnnouncementFarmFilter"
        );

    try {

        const { data, error } =
            await supabaseClient
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


    try {

        /*
         * IMPORTANT:
         * This project uses supabaseClient,
         * not the Supabase CDN namespace.
         */

        const { data, error } =
            await supabaseClient
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
                "Platform announcements error:",
                error
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
                            Database error:
                            ${escapePlatformAnnouncementHTML(
                                error.message ||
                                "Unknown database error"
                            )}
                        </p>

                    </div>
                `;
            }

            return;
        }


        platformAnnouncements =
            data || [];

        displayPlatformAnnouncements();


    } catch (error) {

        console.error(
            "Unexpected platform announcements error:",
            error
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
                            error.message ||
                            "Unexpected error occurred."
                        )}
                    </p>

                </div>
            `;
        }
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

            const farmMatches =
                farmFilter === "all" ||
                String(
                    announcement.farm_id
                ) === String(farmFilter);


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

        return getPlatformAnnouncementFarmName(
            announcement.farm_id
        );
    }


    if (target === "Role") {

        return (
            announcement.target_role ||
            "Specific Role"
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

                refreshButton.textContent =
                    "⏳ Refreshing...";


                await loadPlatformAnnouncementFarms();

                await loadPlatformAnnouncements();


                refreshButton.disabled = false;

                refreshButton.textContent =
                    "🔄 Refresh";
            }
        );
    }
}


/* ============================================================
   INITIALIZE
   ============================================================ */

async function initializePlatformAnnouncements() {

    console.log(
        "Initializing Platform Announcements..."
    );


    /*
     * Farms are loaded first for the filter.
     *
     * If farm loading fails, announcement
     * loading still continues.
     */

    await loadPlatformAnnouncementFarms();


    /*
     * Always load announcements.
     */

    await loadPlatformAnnouncements();


    setupPlatformAnnouncementFilters();


    console.log(
        "Platform Announcements initialized."
    );
}


/* ============================================================
   START
   ============================================================ */

document.addEventListener(
    "DOMContentLoaded",
    initializePlatformAnnouncements
);