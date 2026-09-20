/* =========================================================
   MUNKA PIGGERY
   SUPER ADMIN - PLATFORM ACTIVITY LOGS
   platform_activity.js
========================================================= */

let allActivities = [];
let allFarms = [];


/* =========================================================
   GET LOGGED-IN SUPER ADMIN
========================================================= */

async function getSuperAdmin() {

    const {
        data: { session },
        error: sessionError
    } = await supabaseClient.auth.getSession();

    if (sessionError) {
        throw new Error(
            "Session error: " + sessionError.message
        );
    }

    if (!session) {
        window.location.href = "login.html";
        return null;
    }

    const { data: user, error: userError } =
        await supabaseClient
            .from("users")
            .select("*")
            .eq("auth_user_id", session.user.id)
            .maybeSingle();

    if (userError) {
        throw new Error(
            "User profile error: " +
            userError.message
        );
    }

    if (!user) {
        throw new Error(
            "Super Admin profile was not found."
        );
    }

    if (
        user.role !== "Super Admin" ||
        user.status !== "Active"
    ) {
        alert(
            "Access denied. Super Admin access is required."
        );

        window.location.href = "login.html";
        return null;
    }

    return user;
}


/* =========================================================
   DISPLAY SUPER ADMIN INFORMATION
========================================================= */

function displayAdminInfo(user) {

    const welcomeUser =
        document.getElementById("welcomeUser");

    const userDetails =
        document.getElementById("userDetails");

    const lastLogin =
        document.getElementById("lastLogin");


    if (welcomeUser) {

        welcomeUser.textContent =
            `Welcome, ${user.full_name || "Super Admin"}`;
    }


    if (userDetails) {

        userDetails.textContent =
            `${user.role} • Platform Administration`;
    }


    if (lastLogin) {

        if (user.last_login) {

            lastLogin.textContent =
                "Last login: " +
                formatZambiaDateTime(
                    user.last_login
                );

        } else {

            lastLogin.textContent =
                "Last login: Not available";
        }
    }
}


/* =========================================================
   ZAMBIA DATE / TIME
========================================================= */

function formatZambiaDateTime(dateValue) {

    if (!dateValue) {
        return "—";
    }

    const date = new Date(dateValue);

    if (Number.isNaN(date.getTime())) {
        return "—";
    }

    return date.toLocaleString("en-ZM", {

        timeZone: "Africa/Lusaka",

        day: "2-digit",
        month: "short",
        year: "numeric",

        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",

        hour12: false
    });
}


/* =========================================================
   LOAD FARMS
========================================================= */

async function loadFarms() {

    console.log("Loading farms...");

    const {
        data,
        error
    } = await supabaseClient
        .from("farms")
        .select("id, farm_name")
        .order("farm_name", {
            ascending: true
        });


    if (error) {

        console.error(
            "Farm loading error:",
            error
        );

        throw new Error(
            "Could not load farms: " +
            error.message
        );
    }


    allFarms = data || [];


    console.log(
        "Farms loaded:",
        allFarms.length,
        allFarms
    );


    populateFarmFilter();
}


/* =========================================================
   FARM NAME LOOKUP
========================================================= */

function getFarmName(farmID) {

    if (
        farmID === null ||
        farmID === undefined ||
        farmID === ""
    ) {
        return "Unassigned";
    }


    const farm = allFarms.find(
        farm =>
            String(farm.id) ===
            String(farmID)
    );


    if (farm) {

        return farm.farm_name;
    }


    return `Farm #${farmID}`;
}


/* =========================================================
   FARM FILTER
========================================================= */

function populateFarmFilter() {

    const filter =
        document.getElementById("farmFilter");


    if (!filter) {
        return;
    }


    filter.innerHTML =
        `<option value="">All Farms</option>`;


    allFarms.forEach(farm => {

        const option =
            document.createElement("option");

        option.value = farm.id;
        option.textContent = farm.farm_name;

        filter.appendChild(option);
    });
}


/* =========================================================
   LOAD ACTIVITY LOGS
========================================================= */

async function loadActivityLogs() {

    const table =
        document.getElementById(
            "activityTable"
        );

    const emptyState =
        document.getElementById(
            "emptyState"
        );

    const summary =
        document.getElementById(
            "activitySummary"
        );


    try {

        if (summary) {

            summary.textContent =
                "Loading platform activity...";
        }


        console.log(
            "Starting platform activity loading..."
        );


        const admin =
            await getSuperAdmin();


        if (!admin) {
            return;
        }


        displayAdminInfo(admin);


        await loadFarms();


        console.log(
            "Requesting activity logs..."
        );


        const {
            data,
            error
        } = await supabaseClient
            .from("activity_logs")
            .select(`
                id,
                farm_id,
                actor_name,
                actor_role,
                action,
                module,
                description,
                created_at
            `)
            .order("created_at", {
                ascending: false
            })
            .limit(500);


        if (error) {

            console.error(
                "ACTIVITY LOG ERROR:",
                error
            );

            throw new Error(
                "Could not load activity logs: " +
                error.message
            );
        }


        allActivities =
            data || [];


        console.log(
            "Activity logs successfully loaded:",
            allActivities.length
        );


        console.table(
            allActivities
        );


        updateStatistics();


        renderActivityLogs(
            allActivities
        );


        if (summary) {

            summary.textContent =
                `${allActivities.length} activity record(s) found`;
        }


    } catch (error) {

        console.error(
            "PLATFORM ACTIVITY ERROR:",
            error
        );


        if (summary) {

            summary.textContent =
                "Error loading activity logs";
        }


        if (table) {

            table.innerHTML = `

                <tr>

                    <td
                        colspan="8"
                        style="
                            text-align:center;
                            padding:30px;
                            color:#b42318;
                        "
                    >

                        ${escapeHTML(
                            error.message
                        )}

                    </td>

                </tr>

            `;
        }


        if (emptyState) {

            emptyState.style.display =
                "none";
        }


        alert(
            "Platform Activity Error:\n\n" +
            error.message
        );
    }
}


/* =========================================================
   UPDATE STATISTICS
========================================================= */

function updateStatistics() {

    const totalActivities =
        document.getElementById(
            "totalActivities"
        );

    const totalFarms =
        document.getElementById(
            "totalFarms"
        );

    const totalUsers =
        document.getElementById(
            "totalUsers"
        );

    const latestActivity =
        document.getElementById(
            "latestActivity"
        );


    /* TOTAL ACTIVITIES */

    if (totalActivities) {

        totalActivities.textContent =
            allActivities.length;
    }


    /* UNIQUE FARMS */

    const farmIDs =
        new Set();


    allActivities.forEach(
        activity => {

            if (
                activity.farm_id !== null &&
                activity.farm_id !== undefined
            ) {

                farmIDs.add(
                    String(
                        activity.farm_id
                    )
                );
            }
        }
    );


    if (totalFarms) {

        totalFarms.textContent =
            farmIDs.size;
    }


    /* UNIQUE USERS */

    const users =
        new Set();


    allActivities.forEach(
        activity => {

            const name =
                activity.actor_name ||
                activity.username ||
                activity.user_name ||
                activity.performed_by;


            if (name) {

                users.add(
                    String(name).trim()
                );
            }
        }
    );


    if (totalUsers) {

        totalUsers.textContent =
            users.size;
    }


    /* LATEST ACTIVITY */

    if (latestActivity) {

        if (
            allActivities.length > 0
        ) {

            latestActivity.textContent =
                formatZambiaDateTime(
                    allActivities[0]
                        .created_at
                );

        } else {

            latestActivity.textContent =
                "—";
        }
    }
}


/* =========================================================
   RENDER ACTIVITY TABLE
========================================================= */

function renderActivityLogs(logs) {

    const table =
        document.getElementById(
            "activityTable"
        );

    const emptyState =
        document.getElementById(
            "emptyState"
        );


    if (!table) {
        return;
    }


    table.innerHTML = "";


    if (
        !logs ||
        logs.length === 0
    ) {

        if (emptyState) {

            emptyState.style.display =
                "block";
        }

        return;
    }


    if (emptyState) {

        emptyState.style.display =
            "none";
    }


    logs.forEach(
        (activity, index) => {

            const row =
                document.createElement(
                    "tr"
                );


            const farmName =
                getFarmName(
                    activity.farm_id
                );


            row.innerHTML = `

                <td>
                    ${index + 1}
                </td>

                <td>
                    ${escapeHTML(
                        formatZambiaDateTime(
                            activity.created_at
                        )
                    )}
                </td>

                <td>
                    <span class="farm-badge">
                        ${escapeHTML(
                            farmName
                        )}
                    </span>
                </td>

                <td>
                    <strong>
                        ${escapeHTML(
                            activity.actor_name ||
                            "Unknown"
                        )}
                    </strong>
                </td>

                <td>
                    ${escapeHTML(
                        activity.actor_role ||
                        "—"
                    )}
                </td>

                <td>
                    <span class="action-badge">
                        ${escapeHTML(
                            activity.action ||
                            "—"
                        )}
                    </span>
                </td>

                <td>
                    ${escapeHTML(
                        activity.module ||
                        "—"
                    )}
                </td>

                <td>
                    ${escapeHTML(
                        activity.description ||
                        "—"
                    )}
                </td>

            `;


            table.appendChild(row);
        }
    );
}


/* =========================================================
   FILTER ACTIVITY LOGS
========================================================= */

function filterActivityLogs() {

    const farmFilter =
        document.getElementById(
            "farmFilter"
        );

    const searchInput =
        document.getElementById(
            "activitySearch"
        );


    const selectedFarm =
        farmFilter
            ? farmFilter.value
            : "";


    const searchText =
        searchInput
            ? searchInput.value
                .trim()
                .toLowerCase()
            : "";


    const filtered =
        allActivities.filter(
            activity => {

                /* FARM FILTER */

                if (
                    selectedFarm &&
                    String(
                        activity.farm_id
                    ) !==
                    String(
                        selectedFarm
                    )
                ) {

                    return false;
                }


                /* SEARCH */

                if (searchText) {

                    const farmName =
                        getFarmName(
                            activity.farm_id
                        );


                    const searchableText = [

                        activity.actor_name,
                        activity.actor_role,
                        activity.action,
                        activity.module,
                        activity.description,
                        farmName

                    ]
                    .filter(Boolean)
                    .join(" ")
                    .toLowerCase();


                    if (
                        !searchableText.includes(
                            searchText
                        )
                    ) {

                        return false;
                    }
                }


                return true;
            }
        );


    renderActivityLogs(
        filtered
    );


    const summary =
        document.getElementById(
            "activitySummary"
        );


    if (summary) {

        summary.textContent =
            `${filtered.length} of ${allActivities.length} activity record(s)`;
    }
}


/* =========================================================
   HTML SECURITY
========================================================= */

function escapeHTML(value) {

    if (
        value === null ||
        value === undefined
    ) {
        return "";
    }


    return String(value)
        .replace(
            /&/g,
            "&amp;"
        )
        .replace(
            /</g,
            "&lt;"
        )
        .replace(
            />/g,
            "&gt;"
        )
        .replace(
            /"/g,
            "&quot;"
        )
        .replace(
            /'/g,
            "&#039;"
        );
}


/* =========================================================
   DASHBOARD
========================================================= */

function goToDashboard() {

    window.location.href =
        "platform_dashboard.html";
}


/* =========================================================
   LOGOUT
========================================================= */

async function logout() {

    try {

        await supabaseClient.auth.signOut();

    } catch (error) {

        console.error(
            "Logout error:",
            error
        );
    }


    localStorage.removeItem(
        "loggedInUser"
    );


    window.location.href =
        "login.html";
}


/* =========================================================
   PAGE INITIALIZATION
========================================================= */

document.addEventListener(
    "DOMContentLoaded",
    function () {

        console.log(
            "Platform Activity page initialized."
        );

        loadActivityLogs();

    }
);