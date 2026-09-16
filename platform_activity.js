/* ==========================================================
   MUNKA PIGGERY
   SUPER ADMIN - PLATFORM ACTIVITY LOGS
   ========================================================== */

let currentUser = null;


/* ==========================================================
   CHECK SUPER ADMIN
   ========================================================== */

async function checkSuperAdmin() {

    const {
        data: { session },
        error
    } = await supabaseClient.auth.getSession();

    if (error || !session) {

        window.location.href = "login.html";

        return false;
    }


    const {
        data: user,
        error: userError
    } = await supabaseClient
        .from("users")
        .select("*")
        .eq("auth_user_id", session.user.id)
        .single();


    if (
        userError ||
        !user ||
        user.role !== "Super Admin" ||
        user.status !== "Active"
    ) {

        alert("Access denied.");

        window.location.href = "login.html";

        return false;
    }


    currentUser = user;

    return true;
}


/* ==========================================================
   LOAD ACTIVITY LOGS
   ========================================================== */

async function loadActivityLogs() {

    const container =
        document.getElementById("activityList");


    if (!container) return;


    container.innerHTML =
        "<p>Loading activity logs...</p>";


    const {
        data,
        error
    } = await supabaseClient
        .from("activity_logs")
        .select("*")
        .order("created_at", {
            ascending: false
        })
        .limit(100);


    if (error) {

        console.error(
            "ACTIVITY LOG ERROR:",
            error
        );


        container.innerHTML = `
            <p>
                Unable to load activity logs.
            </p>
        `;

        return;
    }


    const activities = data || [];


    if (activities.length === 0) {

        container.innerHTML =
            "<p>No activity logs found.</p>";

        return;
    }


    container.innerHTML = "";


    activities.forEach(
        activity => {

            const item =
                document.createElement("div");


            item.className =
                "activity-item";


            const user =
                activity.user_name ||
                activity.username ||
                activity.performed_by ||
                "System";


            const action =
                activity.action ||
                "Activity";


            const module =
                activity.module ||
                "System";


            const description =
                activity.description ||
                "";


            const date =
                activity.created_at
                    ? new Date(
                        activity.created_at
                    ).toLocaleString("en-ZM")
                    : "N/A";


            item.innerHTML = `

                <div>

                    <strong>
                        ${escapeHTML(action)}
                    </strong>

                    <p>
                        ${escapeHTML(description)}
                    </p>

                </div>


                <div class="activity-details">

                    <span class="activity-module">
                        ${escapeHTML(module)}
                    </span>

                    <span class="activity-user">
                        ${escapeHTML(user)}
                    </span>

                    <span class="activity-date">
                        ${escapeHTML(date)}
                    </span>

                </div>

            `;


            container.appendChild(item);

        }
    );
}


/* ==========================================================
   ESCAPE HTML
   ========================================================== */

function escapeHTML(value) {

    return String(value)

        .replace(/&/g, "&amp;")

        .replace(/</g, "&lt;")

        .replace(/>/g, "&gt;")

        .replace(/"/g, "&quot;")

        .replace(/'/g, "&#039;");
}


/* ==========================================================
   LOGOUT
   ========================================================== */

async function logout() {

    try {

        await supabaseClient
            .auth
            .signOut();

    }

    catch(error) {

        console.error(
            "LOGOUT ERROR:",
            error
        );

    }


    localStorage.removeItem(
        "loggedInUser"
    );


    window.location.href =
        "login.html";
}


/* ==========================================================
   INITIALIZE
   ========================================================== */

document.addEventListener(
    "DOMContentLoaded",
    async function() {

        const allowed =
            await checkSuperAdmin();


        if (!allowed) return;


        await loadActivityLogs();

    }
);

