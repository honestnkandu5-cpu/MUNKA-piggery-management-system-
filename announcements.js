/* ============================================================
   MUNKA PIGGERY TECHNOLOGY
   ANNOUNCEMENTS - DIRECT LOADING VERSION
============================================================ */
alert("ANNOUNCEMENTS JS IS LOADING");
let currentUser = null;
let currentProfile = null;
let allAnnouncements = [];
let editingAnnouncementId = null;


/* ============================================================
   PAGE START
============================================================ */

document.addEventListener("DOMContentLoaded", function () {

    console.log("ANNOUNCEMENTS: DOM READY");

    // Start the page immediately.
    setDefaultFarmName();

    setupFormEvents();

    // Load announcements independently.
    loadAnnouncements();

    // Load profile information separately.
    loadProfileInBackground();

});


/* ============================================================
   DEFAULT FARM NAME
============================================================ */

function setDefaultFarmName() {

    const farmName =
        document.getElementById("farmName");

    if (farmName) {
        farmName.textContent =
            "MUNKA PIGGERY TECHNOLOGY";
    }
}


/* ============================================================
   GET LOCAL USER
============================================================ */

function getLoggedInUser() {

    try {

        const saved =
            localStorage.getItem("loggedInUser");

        if (!saved) {
            return null;
        }

        return JSON.parse(saved);

    } catch (error) {

        console.error(
            "Could not read loggedInUser:",
            error
        );

        return null;
    }
}


/* ============================================================
   LOAD PROFILE IN BACKGROUND
   IMPORTANT:
   This does NOT block announcements.
============================================================ */

async function loadProfileInBackground() {

    try {

        currentUser =
            getLoggedInUser();

        if (!currentUser) {

            console.warn(
                "No loggedInUser found."
            );

            return;
        }

        console.log(
            "Local logged-in user:",
            currentUser
        );

        /*
         * If auth_user_id exists, get the latest
         * profile from Supabase.
         */
        if (currentUser.auth_user_id) {

            const { data, error } =
                await supabaseClient
                    .from("users")
                    .select("*")
                    .eq(
                        "auth_user_id",
                        currentUser.auth_user_id
                    )
                    .maybeSingle();

            if (!error && data) {

                currentProfile = data;

                console.log(
                    "Profile loaded:",
                    currentProfile
                );

                updateFarmName();

                loadTargetData();

                return;
            }

            console.warn(
                "Could not retrieve full profile:",
                error
            );
        }

        // Use localStorage profile as fallback.
        currentProfile =
            currentUser;

        updateFarmName();

        loadTargetData();

    } catch (error) {

        console.error(
            "Background profile loading error:",
            error
        );

        /*
         * IMPORTANT:
         * We deliberately do NOT stop the announcements page.
         */
    }
}


/* ============================================================
   UPDATE FARM NAME
============================================================ */

async function updateFarmName() {

    const farmName =
        document.getElementById("farmName");

    if (!farmName || !currentProfile) {
        return;
    }

    const role =
        String(currentProfile.role || "")
            .trim()
            .toLowerCase();

    if (
        role === "super admin" &&
        !currentProfile.farm_id
    ) {

        farmName.textContent =
            "MUNKA PIGGERY TECHNOLOGY • PLATFORM";

        return;
    }

    if (!currentProfile.farm_id) {
        return;
    }

    try {

        const { data, error } =
            await supabaseClient
                .from("farms")
                .select("farm_name")
                .eq(
                    "id",
                    currentProfile.farm_id
                )
                .maybeSingle();

        if (
            !error &&
            data &&
            data.farm_name
        ) {

            farmName.textContent =
                data.farm_name;
        }

    } catch (error) {

        console.warn(
            "Farm name could not be loaded:",
            error
        );
    }
}


/* ============================================================
   LOAD ANNOUNCEMENTS
   THIS IS NOW INDEPENDENT
============================================================ */

async function loadAnnouncements() {

    console.log(
        "ANNOUNCEMENTS: Loading database records..."
    );

    showLoading(true);

    try {

        /*
         * First perform the same simple query
         * that we already proved works.
         */
        const { data, error } =
            await supabaseClient
                .from("announcements")
                .select("*")
                .order(
                    "created_at",
                    {
                        ascending: false
                    }
                );

        if (error) {

            console.error(
                "Announcement query error:",
                error
            );

            throw error;
        }

        allAnnouncements =
            data || [];

        console.log(
            "ANNOUNCEMENTS LOADED:",
            allAnnouncements
        );

        renderAnnouncements();

    } catch (error) {

        console.error(
            "Could not load announcements:",
            error
        );

        showSecurityMessage(
            "Unable to load announcements: " +
            error.message
        );

    } finally {

        showLoading(false);
    }
}


/* ============================================================
   RENDER ANNOUNCEMENTS
============================================================ */

function renderAnnouncements() {

    const body =
        document.getElementById(
            "announcementTableBody"
        );

    const wrapper =
        document.getElementById(
            "announcementTableWrapper"
        );

    const empty =
        document.getElementById(
            "emptyAnnouncements"
        );

    if (!body) {

        console.error(
            "announcementTableBody was not found."
        );

        return;
    }

    body.innerHTML = "";

    if (!allAnnouncements.length) {

        if (wrapper) {
            wrapper.style.display = "none";
        }

        if (empty) {
            empty.style.display = "";
        }

        return;
    }

    if (wrapper) {
        wrapper.style.display = "";
    }

    if (empty) {
        empty.style.display = "none";
    }

    allAnnouncements.forEach(
        function (announcement) {

            const row =
                document.createElement("tr");

            row.innerHTML = `
                <td>
                    ${escapeHtml(
                        announcement.title || ""
                    )}
                </td>

                <td>
                    ${escapeHtml(
                        announcement.priority || ""
                    )}
                </td>

                <td>
                    ${escapeHtml(
                        announcement.target_type || ""
                    )}
                </td>

                <td>
                    ${formatDate(
                        announcement.created_at
                    )}
                </td>

                <td>
                    ${
                        announcement.is_active
                            ? "Active"
                            : "Inactive"
                    }
                </td>

                <td>

                    <button
                        type="button"
                        onclick="viewAnnouncement(${announcement.id})"
                    >
                        View
                    </button>

                    <button
                        type="button"
                        onclick="editAnnouncement(${announcement.id})"
                    >
                        Edit
                    </button>

                    <button
                        type="button"
                        onclick="toggleAnnouncement(${announcement.id})"
                    >
                        ${
                            announcement.is_active
                                ? "Deactivate"
                                : "Activate"
                        }
                    </button>

                    <button
                        type="button"
                        onclick="deleteAnnouncement(${announcement.id})"
                    >
                        Delete
                    </button>

                </td>
            `;

            body.appendChild(row);
        }
    );
}


/* ============================================================
   FORM EVENTS
============================================================ */

function setupFormEvents() {

    const form =
        document.getElementById(
            "announcementForm"
        );

    if (form) {

        form.addEventListener(
            "submit",
            handleSubmit
        );
    }

    const refresh =
        document.getElementById(
            "refreshButton"
        );

    if (refresh) {

        refresh.addEventListener(
            "click",
            function () {

                loadAnnouncements();
            }
        );
    }

    const targetType =
        document.getElementById(
            "targetType"
        );

    if (targetType) {

        targetType.addEventListener(
            "change",
            handleTargetTypeChange
        );
    }

    const clear =
        document.getElementById(
            "clearFormButton"
        );

    if (clear) {

        clear.addEventListener(
            "click",
            clearForm
        );
    }

    const cancel =
        document.getElementById(
            "cancelEditButton"
        );

    if (cancel) {

        cancel.addEventListener(
            "click",
            clearForm
        );
    }
}


/* ============================================================
   TARGET TYPE
============================================================ */

function handleTargetTypeChange() {

    const type =
        document.getElementById(
            "targetType"
        )?.value;

    const farm =
        document.getElementById(
            "farmTargetGroup"
        );

    const role =
        document.getElementById(
            "roleTargetGroup"
        );

    const user =
        document.getElementById(
            "userTargetGroup"
        );

    if (farm) {
        farm.style.display =
            type === "Farm" ? "" : "none";
    }

    if (role) {
        role.style.display =
            type === "Role" ? "" : "none";
    }

    if (user) {
        user.style.display =
            type === "User" ? "" : "none";
    }
}


/* ============================================================
   TARGET DATA
============================================================ */

async function loadTargetData() {

    try {

        await loadFarms();

        await loadUsers();

        handleTargetTypeChange();

    } catch (error) {

        console.warn(
            "Target data could not be loaded:",
            error
        );
    }
}


/* ============================================================
   FARMS
============================================================ */

async function loadFarms() {

    const select =
        document.getElementById(
            "targetFarm"
        );

    if (!select) {
        return;
    }

    select.innerHTML =
        '<option value="">Select farm</option>';

    try {

        const { data, error } =
            await supabaseClient
                .from("farms")
                .select(
                    "id, farm_name"
                )
                .order("farm_name");

        if (error) {
            throw error;
        }

        (data || []).forEach(
            function (farm) {

                const option =
                    document.createElement(
                        "option"
                    );

                option.value =
                    farm.id;

                option.textContent =
                    farm.farm_name;

                select.appendChild(
                    option
                );
            }
        );

    } catch (error) {

        console.warn(
            "Farms could not be loaded:",
            error
        );
    }
}


/* ============================================================
   USERS
============================================================ */

async function loadUsers() {

    const select =
        document.getElementById(
            "targetUser"
        );

    if (!select) {
        return;
    }

    select.innerHTML =
        '<option value="">Select user</option>';

    try {

        const { data, error } =
            await supabaseClient
                .from("users")
                .select(
                    "id, full_name, username, role, farm_id"
                )
                .order("full_name");

        if (error) {
            throw error;
        }

        (data || []).forEach(
            function (user) {

                const option =
                    document.createElement(
                        "option"
                    );

                option.value =
                    user.id;

                option.textContent =
                    `${user.full_name || user.username || "User"} — ${user.role || ""}`;

                select.appendChild(
                    option
                );
            }
        );

    } catch (error) {

        console.warn(
            "Users could not be loaded:",
            error
        );
    }
}

/* ============================================================
   SAVE ANNOUNCEMENT + CREATE SECURE NOTIFICATIONS
============================================================ */

async function handleSubmit(event) {

    event.preventDefault();

    const title =
        document.getElementById(
            "title"
        )?.value.trim();

    const message =
        document.getElementById(
            "message"
        )?.value.trim();

    const priority =
        document.getElementById(
            "priority"
        )?.value || "Normal";

    const targetType =
        document.getElementById(
            "targetType"
        )?.value || "Farm";

    if (!title) {

        alert(
            "Please enter an announcement title."
        );

        return;
    }

    if (!message) {

        alert(
            "Please enter an announcement message."
        );

        return;
    }

    const farmValue =
        document.getElementById(
            "targetFarm"
        )?.value;

    const roleValue =
        document.getElementById(
            "targetRole"
        )?.value;

    const userValue =
        document.getElementById(
            "targetUser"
        )?.value;

    const startValue =
        document.getElementById(
            "startAt"
        )?.value;

    const expiryValue =
        document.getElementById(
            "expiresAt"
        )?.value;

    const active =
        document.getElementById(
            "isActive"
        )?.checked ?? true;


    /* ========================================================
       PREPARE ANNOUNCEMENT
    ======================================================== */

    const payload = {

        title: title,

        message: message,

        priority: priority,

        target_type: targetType,

        farm_id:
            farmValue
                ? Number(farmValue)
                : null,

        target_role:
            targetType === "Role"
                ? roleValue || null
                : null,

        target_user_id:
            targetType === "User"
                ? (
                    userValue
                        ? Number(userValue)
                        : null
                )
                : null,

        created_by:
            currentProfile?.id ||
            currentUser?.id ||
            null,

        start_at:
            startValue
                ? new Date(
                    startValue
                ).toISOString()
                : new Date().toISOString(),

        expires_at:
            expiryValue
                ? new Date(
                    expiryValue
                ).toISOString()
                : null,

        is_active: active
    };
console.log(
    "C3 DEBUG PAYLOAD:",
    JSON.stringify(payload, null, 2)
);
alert(
    "DEBUG PAYLOAD:\n\n" +
    JSON.stringify(payload, null, 2)
);
    try {

        /* ====================================================
           UPDATE EXISTING ANNOUNCEMENT
        ==================================================== */

        if (editingAnnouncementId) {

            const {
                error
            } =
                await supabaseClient
                    .from("announcements")
                    .update(payload)
                    .eq(
                        "id",
                        editingAnnouncementId
                    );

            if (error) {
                throw error;
            }

            alert(
                "Announcement updated successfully."
            );

            clearForm();

            await loadAnnouncements();

            return;
        }


        /* ====================================================
           CREATE NEW ANNOUNCEMENT
           IMPORTANT:
           We request the inserted row back so that we get
           the announcement ID required by the RPC.
        ==================================================== */

        const {
            data: announcement,
            error: insertError
        } =
            await supabaseClient
                .from("announcements")
                .insert(payload)
                .select("*")
                .single();


        if (insertError) {
            throw insertError;
        }


        if (!announcement) {

            throw new Error(
                "Announcement was saved, but its database record could not be returned."
            );
        }


        console.log(
            "ANNOUNCEMENT CREATED:",
            announcement
        );


        /* ====================================================
           SECURE NOTIFICATION RPC
        ==================================================== */

        let notificationResult = {
            success: true,
            created: 0
        };


        /*
         * Only active announcements that have already started
         * should immediately create notifications.
         */

        if (announcement.is_active === true) {

            let shouldCreateNotifications = true;


            if (announcement.start_at) {

                const start =
                    new Date(
                        announcement.start_at
                    );

                if (
                    !isNaN(
                        start.getTime()
                    ) &&
                    new Date() < start
                ) {

                    shouldCreateNotifications =
                        false;

                    console.log(
                        "Announcement is scheduled for later. Notifications will not be created yet."
                    );
                }
            }


            if (shouldCreateNotifications) {

                console.log(
                    "Calling secure notification RPC..."
                );


                const {
                    data,
                    error
                } =
                    await supabaseClient.rpc(
                        "create_announcement_notifications",
                        {
                            p_announcement_id:
                                announcement.id
                        }
                    );


                if (error) {

                    console.error(
                        "SECURE NOTIFICATION RPC ERROR:",
                        error
                    );

                    /*
                     * The announcement itself was successfully
                     * created. Therefore we don't delete it.
                     * We clearly inform the administrator that
                     * notification creation failed.
                     */

                    notificationResult = {
                        success: false,
                        created: 0,
                        error:
                            error.message ||
                            "Notification creation failed."
                    };

                } else {

                    let createdCount = 0;


                    if (
                        typeof data ===
                        "number"
                    ) {

                        createdCount =
                            data;

                    } else if (
                        typeof data ===
                        "string"
                    ) {

                        createdCount =
                            Number(data) || 0;

                    } else if (
                        Array.isArray(data)
                    ) {

                        if (
                            data.length > 0
                        ) {

                            const result =
                                data[0];

                            createdCount =
                                Number(
                                    result.created_count ??
                                    result.notification_count ??
                                    result.count ??
                                    result.created ??
                                    0
                                );
                        }

                    } else if (
                        data &&
                        typeof data ===
                        "object"
                    ) {

                        createdCount =
                            Number(
                                data.created_count ??
                                data.notification_count ??
                                data.count ??
                                data.created ??
                                0
                            );
                    }


                    if (
                        !Number.isFinite(
                            createdCount
                        ) ||
                        createdCount < 0
                    ) {

                        createdCount = 0;
                    }


                    createdCount =
                        Math.floor(
                            createdCount
                        );


                    notificationResult = {
                        success: true,
                        created:
                            createdCount
                    };


                    console.log(
                        "SECURE NOTIFICATIONS CREATED:",
                        createdCount
                    );
                }
            }
        }


        /* ====================================================
           FINAL RESULT MESSAGE
        ==================================================== */

        if (
            notificationResult.success
        ) {

            if (
                notificationResult.created >
                0
            ) {

                alert(
                    "Announcement published successfully.\n\n" +
                    "Notifications created: " +
                    notificationResult.created
                );

            } else {

                alert(
                    "Announcement published successfully.\n\n" +
                    "No notifications were created immediately."
                );
            }

        } else {

            alert(
                "Announcement published successfully.\n\n" +
                "WARNING: Notifications could not be created.\n\n" +
                notificationResult.error
            );
        }


        clearForm();

        await loadAnnouncements();


    } catch (error) {

        console.error(
            "ANNOUNCEMENT SAVE ERROR:",
            error
        );

        alert(
            "Unable to save announcement:\n\n" +
            (
                error.message ||
                "Unknown error."
            )
        );
    }
}


/* ============================================================
   VIEW
============================================================ */

function viewAnnouncement(id) {

    const item =
        allAnnouncements.find(
            announcement =>
                Number(announcement.id) ===
                Number(id)
        );

    if (!item) {
        return;
    }

    const modal =
        document.getElementById(
            "messageModal"
        );

    const title =
        document.getElementById(
            "modalTitle"
        );

    const message =
        document.getElementById(
            "modalMessage"
        );

    if (title) {
        title.textContent =
            item.title;
    }

    if (message) {
        message.textContent =
            item.message;
    }

    if (modal) {
        modal.style.display =
            "flex";
    }
}


/* ============================================================
   EDIT
============================================================ */

function editAnnouncement(id) {

    const item =
        allAnnouncements.find(
            announcement =>
                Number(announcement.id) ===
                Number(id)
        );

    if (!item) {
        return;
    }

    editingAnnouncementId =
        item.id;

    document.getElementById(
        "announcementId"
    ).value = item.id;

    document.getElementById(
        "title"
    ).value = item.title || "";

    document.getElementById(
        "message"
    ).value = item.message || "";

    document.getElementById(
        "priority"
    ).value =
        item.priority || "Normal";

    document.getElementById(
        "targetType"
    ).value =
        item.target_type || "Farm";

    document.getElementById(
        "targetFarm"
    ).value =
        item.farm_id || "";

    document.getElementById(
        "targetRole"
    ).value =
        item.target_role || "";

    document.getElementById(
        "targetUser"
    ).value =
        item.target_user_id || "";

    document.getElementById(
        "isActive"
    ).checked =
        item.is_active !== false;

    const save =
        document.getElementById(
            "saveButton"
        );

    if (save) {
        save.textContent =
            "Update Announcement";
    }

    const cancel =
        document.getElementById(
            "cancelEditButton"
        );

    if (cancel) {
        cancel.style.display = "";
    }

    handleTargetTypeChange();

    window.scrollTo({
        top: 0,
        behavior: "smooth"
    });
}


/* ============================================================
   ACTIVATE / DEACTIVATE
============================================================ */

async function toggleAnnouncement(id) {

    const item =
        allAnnouncements.find(
            announcement =>
                Number(announcement.id) ===
                Number(id)
        );

    if (!item) {
        return;
    }

    try {

        const { error } =
            await supabaseClient
                .from("announcements")
                .update({
                    is_active:
                        !item.is_active
                })
                .eq(
                    "id",
                    id
                );

        if (error) {
            throw error;
        }

        await loadAnnouncements();

    } catch (error) {

        alert(
            "Unable to change status:\n\n" +
            error.message
        );
    }
}


/* ============================================================
   DELETE
============================================================ */

async function deleteAnnouncement(id) {

    if (
        !confirm(
            "Are you sure you want to delete this announcement?"
        )
    ) {
        return;
    }

    try {

        const { error } =
            await supabaseClient
                .from("announcements")
                .delete()
                .eq(
                    "id",
                    id
                );

        if (error) {
            throw error;
        }

        await loadAnnouncements();

    } catch (error) {

        alert(
            "Unable to delete announcement:\n\n" +
            error.message
        );
    }
}


/* ============================================================
   CLEAR FORM
============================================================ */

function clearForm() {

    const form =
        document.getElementById(
            "announcementForm"
        );

    if (form) {
        form.reset();
    }

    editingAnnouncementId = null;

    const id =
        document.getElementById(
            "announcementId"
        );

    if (id) {
        id.value = "";
    }

    const save =
        document.getElementById(
            "saveButton"
        );

    if (save) {
        save.textContent =
            "Publish Announcement";
    }

    const cancel =
        document.getElementById(
            "cancelEditButton"
        );

    if (cancel) {
        cancel.style.display =
            "none";
    }

    handleTargetTypeChange();
}


/* ============================================================
   LOADING
============================================================ */

function showLoading(show) {

    const loading =
        document.getElementById(
            "loadingAnnouncements"
        );

    if (loading) {

        loading.style.display =
            show ? "" : "none";
    }
}


/* ============================================================
   SECURITY MESSAGE
============================================================ */

function showSecurityMessage(message) {

    const element =
        document.getElementById(
            "securityMessage"
        );

    if (!element) {
        return;
    }

    element.textContent =
        message;

    element.style.display =
        "";
}


/* ============================================================
   DATE
============================================================ */

function formatDate(value) {

    if (!value) {
        return "-";
    }

    try {

        return new Intl.DateTimeFormat(
            "en-ZM",
            {
                dateStyle: "medium",
                timeStyle: "short",
                timeZone: "Africa/Lusaka"
            }
        ).format(
            new Date(value)
        );

    } catch (error) {

        return value;
    }
}


/* ============================================================
   HTML SECURITY
============================================================ */

function escapeHtml(value) {

    return String(value ?? "")
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


/* ============================================================
   GLOBALS
============================================================ */

window.loadAnnouncements =
    loadAnnouncements;

window.viewAnnouncement =
    viewAnnouncement;

window.editAnnouncement =
    editAnnouncement;

window.toggleAnnouncement =
    toggleAnnouncement;

window.deleteAnnouncement =
    deleteAnnouncement;

window.clearForm =
    clearForm;

console.log(
    "MUNKA ANNOUNCEMENTS MODULE READY."
);