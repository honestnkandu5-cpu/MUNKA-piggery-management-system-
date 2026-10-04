/* ============================================================
   MUNKA PIGGERY TECHNOLOGY
   ANNOUNCEMENTS MODULE
   PHASE 1 - SUPER ADMIN TARGETING
============================================================ */

let currentUser = null;
let currentProfile = null;

let allAnnouncements = [];
let editingAnnouncementId = null;

let availableFarms = [];
let availableUsers = [];

let isSuperAdmin = false;


/* ============================================================
   PAGE START
============================================================ */

document.addEventListener("DOMContentLoaded", function () {

    console.log("ANNOUNCEMENTS: DOM READY");

    setDefaultFarmName();

    setupFormEvents();

    loadAnnouncements();

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
   GET LOGGED-IN USER
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
   LOAD PROFILE
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


        /* ====================================================
           GET FRESH PROFILE FROM SUPABASE
        ==================================================== */

        if (currentUser.auth_user_id) {

            const {
                data,
                error
            } =
                await supabaseClient
                    .from("users")
                    .select("*")
                    .eq(
                        "auth_user_id",
                        currentUser.auth_user_id
                    )
                    .maybeSingle();

            if (!error && data) {

                currentProfile =
                    data;

            } else {

                console.warn(
                    "Could not retrieve full profile:",
                    error
                );

                currentProfile =
                    currentUser;
            }

        } else {

            currentProfile =
                currentUser;
        }


        /* ====================================================
           IDENTIFY ROLE
        ==================================================== */

        const role =
            String(
                currentProfile?.role || ""
            )
                .trim()
                .toLowerCase();

        isSuperAdmin =
            role === "super admin";


        console.log(
            "CURRENT PROFILE:",
            currentProfile
        );

        console.log(
            "IS SUPER ADMIN:",
            isSuperAdmin
        );


        updateFarmName();

        await loadTargetData();

    } catch (error) {

        console.error(
            "Background profile loading error:",
            error
        );
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
        String(
            currentProfile.role || ""
        )
            .trim()
            .toLowerCase();


    /* ========================================================
       SUPER ADMIN
    ======================================================== */

    if (
        role === "super admin" &&
        !currentProfile.farm_id
    ) {

        farmName.textContent =
            "MUNKA PIGGERY TECHNOLOGY • PLATFORM";

        return;
    }


    /* ========================================================
       FARM USER
    ======================================================== */

    if (!currentProfile.farm_id) {
        return;
    }


    try {

        const {
            data,
            error
        } =
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
============================================================ */

async function loadAnnouncements() {

    console.log(
        "ANNOUNCEMENTS: Loading database records..."
    );

    showLoading(true);

    try {

        const {
            data,
            error
        } =
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
                        getTargetDisplayText(
                            announcement
                        )
                    )}
                </td>

                <td>
                    ${formatDate(
                        announcement.start_at ||
                        announcement.created_at
                    )}
                </td>

                <td>
                    ${formatDate(
                        announcement.expires_at
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
                        onclick="viewAnnouncement(${announcement.id})">

                        View

                    </button>

                    <button
                        type="button"
                        onclick="editAnnouncement(${announcement.id})">

                        Edit

                    </button>

                    <button
                        type="button"
                        onclick="toggleAnnouncement(${announcement.id})">

                        ${
                            announcement.is_active
                                ? "Deactivate"
                                : "Activate"
                        }

                    </button>

                    <button
                        type="button"
                        onclick="deleteAnnouncement(${announcement.id})">

                        Delete

                    </button>

                </td>
            `;

            body.appendChild(row);
        }
    );
}


/* ============================================================
   TARGET DISPLAY
============================================================ */

function getTargetDisplayText(announcement) {

    const type =
        announcement.target_type;


    if (type === "Platform") {

        return "Entire Platform";
    }


    if (type === "Farm") {

        return (
            getFarmName(
                announcement.farm_id
            ) ||
            "Whole Farm"
        );
    }


    if (type === "Role") {

        return (
            getFarmName(
                announcement.farm_id
            ) +
            " • " +
            (
                announcement.target_role ||
                "Specific Role"
            )
        );
    }


    if (type === "User") {

        const user =
            availableUsers.find(
                u =>
                    Number(u.id) ===
                    Number(
                        announcement.target_user_id
                    )
            );

        if (user) {

            return (
                getFarmName(
                    user.farm_id
                ) +
                " • " +
                (
                    user.full_name ||
                    user.username ||
                    "User"
                )
            );
        }

        return (
            "Specific User • ID " +
            (
                announcement.target_user_id ||
                "Unknown"
            )
        );
    }


    return type || "Unknown";
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
            loadAnnouncements
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


    const targetFarm =
        document.getElementById(
            "targetFarm"
        );

    if (targetFarm) {

        targetFarm.addEventListener(
            "change",
            handleTargetFarmChange
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


    const closeModal =
        document.getElementById(
            "closeModal"
        );

    if (closeModal) {

        closeModal.addEventListener(
            "click",
            closeMessageModal
        );
    }
}


/* ============================================================
   TARGET TYPE CHANGE
============================================================ */

function handleTargetTypeChange() {

    const type =
        document.getElementById(
            "targetType"
        )?.value;


    const farmGroup =
        document.getElementById(
            "farmTargetGroup"
        );

    const roleGroup =
        document.getElementById(
            "roleTargetGroup"
        );

    const userGroup =
        document.getElementById(
            "userTargetGroup"
        );


    /* ========================================================
       HIDE EVERYTHING FIRST
    ======================================================== */

    if (farmGroup) {
        farmGroup.style.display = "none";
    }

    if (roleGroup) {
        roleGroup.style.display = "none";
    }

    if (userGroup) {
        userGroup.style.display = "none";
    }


    /* ========================================================
       ENTIRE PLATFORM
    ======================================================== */

    if (type === "Platform") {

        return;
    }


    /* ========================================================
       WHOLE FARM
    ======================================================== */

    if (type === "Farm") {

        if (farmGroup) {
            farmGroup.style.display = "";
        }

        return;
    }


    /* ========================================================
       SPECIFIC ROLE
       Farm + Role
    ======================================================== */

    if (type === "Role") {

        if (farmGroup) {
            farmGroup.style.display = "";
        }

        if (roleGroup) {
            roleGroup.style.display = "";
        }

        populateRolesForSelectedFarm();

        return;
    }


    /* ========================================================
       SPECIFIC USER
       Farm + User
    ======================================================== */

    if (type === "User") {

        if (farmGroup) {
            farmGroup.style.display = "";
        }

        if (userGroup) {
            userGroup.style.display = "";
        }

        populateUsersForSelectedFarm();

        return;
    }
}


/* ============================================================
   FARM CHANGE
============================================================ */

function handleTargetFarmChange() {

    const type =
        document.getElementById(
            "targetType"
        )?.value;


    if (type === "Role") {

        populateRolesForSelectedFarm();
    }


    if (type === "User") {

        populateUsersForSelectedFarm();
    }
}


/* ============================================================
   LOAD TARGET DATA
============================================================ */

async function loadTargetData() {

    try {

        await loadFarms();

        await loadUsers();

        configureTargetPermissions();

        handleTargetTypeChange();

    } catch (error) {

        console.warn(
            "Target data could not be loaded:",
            error
        );
    }
}


/* ============================================================
   CONFIGURE TARGET PERMISSIONS
============================================================ */

function configureTargetPermissions() {

    const targetType =
        document.getElementById(
            "targetType"
        );

    if (!targetType) {
        return;
    }


    /* ========================================================
       SUPER ADMIN
    ======================================================== */

    if (isSuperAdmin) {

        targetType.innerHTML = `

            <option value="Platform">
                Entire Platform
            </option>

            <option value="Farm">
                Whole Farm
            </option>

            <option value="Role">
                Specific Role
            </option>

            <option value="User">
                Specific User
            </option>

        `;

        console.log(
            "Super Admin announcement targeting enabled."
        );

        return;
    }


    /* ========================================================
       OWNER / ADMIN
    ======================================================== */

    const role =
        String(
            currentProfile?.role || ""
        )
            .trim()
            .toLowerCase();


    if (role === "owner/admin") {

        targetType.innerHTML = `

            <option value="Farm">
                Whole Farm
            </option>

            <option value="Role">
                Specific Role
            </option>

            <option value="User">
                Specific User
            </option>

        `;

        console.log(
            "Owner/Admin announcement targeting enabled."
        );

        return;
    }


    /* ========================================================
       OTHER ROLES
    ======================================================== */

    targetType.innerHTML = `

        <option value="Farm">
            Whole Farm
        </option>

    `;
}


/* ============================================================
   LOAD FARMS
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

        let query =
            supabaseClient
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


        /* ====================================================
           OWNER/ADMIN = ONLY THEIR OWN FARM
        ==================================================== */

        const role =
            String(
                currentProfile?.role || ""
            )
                .trim()
                .toLowerCase();


        if (
            role === "owner/admin" &&
            currentProfile?.farm_id
        ) {

            query =
                query.eq(
                    "id",
                    currentProfile.farm_id
                );
        }


        const {
            data,
            error
        } =
            await query;


        if (error) {
            throw error;
        }


        availableFarms =
            data || [];


        availableFarms.forEach(
            function (farm) {

                const option =
                    document.createElement(
                        "option"
                    );

                option.value =
                    farm.id;

                option.textContent =
                    farm.farm_name ||
                    `Farm ${farm.id}`;

                select.appendChild(
                    option
                );
            }
        );


        /* ====================================================
           SUPER ADMIN
           Leave farm blank until selected.
        ==================================================== */

        if (!isSuperAdmin) {

            if (
                currentProfile?.farm_id
            ) {

                select.value =
                    String(
                        currentProfile.farm_id
                    );
            }
        }


        console.log(
            "Available farms:",
            availableFarms
        );

    } catch (error) {

        console.warn(
            "Farms could not be loaded:",
            error
        );
    }
}


/* ============================================================
   LOAD USERS
============================================================ */

async function loadUsers() {

    try {

        const {
            data,
            error
        } =
            await supabaseClient
                .from("users")
                .select(
                    "id, full_name, username, role, farm_id, status"
                )
                .order(
                    "full_name",
                    {
                        ascending: true
                    }
                );


        if (error) {
            throw error;
        }


        availableUsers =
            data || [];


        console.log(
            "Users loaded:",
            availableUsers
        );


    } catch (error) {

        console.warn(
            "Users could not be loaded:",
            error
        );

        availableUsers = [];
    }
}


/* ============================================================
   POPULATE ROLES FOR SELECTED FARM
============================================================ */

function populateRolesForSelectedFarm() {

    const roleSelect =
        document.getElementById(
            "targetRole"
        );

    const farmSelect =
        document.getElementById(
            "targetFarm"
        );


    if (!roleSelect || !farmSelect) {
        return;
    }


    const farmId =
        farmSelect.value;


    roleSelect.innerHTML =
        '<option value="">Select role</option>';


    if (!farmId) {
        return;
    }


    const roles =
        [
            ...new Set(
                availableUsers
                    .filter(
                        user =>
                            String(
                                user.farm_id
                            ) ===
                            String(farmId) &&
                            String(
                                user.status || ""
                            )
                                .toLowerCase() ===
                            "active"
                    )
                    .map(
                        user =>
                            user.role
                    )
                    .filter(
                        role =>
                            role &&
                            String(
                                role
                            ).trim() !== ""
                    )
            )
        ]
            .sort();


    roles.forEach(
        function (role) {

            const option =
                document.createElement(
                    "option"
                );

            option.value =
                role;

            option.textContent =
                role;

            roleSelect.appendChild(
                option
            );
        }
    );


    console.log(
        "Roles for farm " +
        farmId +
        ":",
        roles
    );
}


/* ============================================================
   POPULATE USERS FOR SELECTED FARM
============================================================ */

function populateUsersForSelectedFarm() {

    const userSelect =
        document.getElementById(
            "targetUser"
        );

    const farmSelect =
        document.getElementById(
            "targetFarm"
        );


    if (!userSelect || !farmSelect) {
        return;
    }


    const farmId =
        farmSelect.value;


    userSelect.innerHTML =
        '<option value="">Select user</option>';


    if (!farmId) {
        return;
    }


    const users =
        availableUsers
            .filter(
                user =>
                    String(
                        user.farm_id
                    ) ===
                    String(farmId) &&
                    String(
                        user.status || ""
                    )
                        .toLowerCase() ===
                    "active"
            )
            .sort(
                function (a, b) {

                    const nameA =
                        String(
                            a.full_name ||
                            a.username ||
                            ""
                        ).toLowerCase();

                    const nameB =
                        String(
                            b.full_name ||
                            b.username ||
                            ""
                        ).toLowerCase();

                    return nameA.localeCompare(
                        nameB
                    );
                }
            );


    users.forEach(
        function (user) {

            const option =
                document.createElement(
                    "option"
                );

            option.value =
                user.id;

            option.textContent =
                `${user.full_name || user.username || "User"} — ${user.role || ""}`;

            userSelect.appendChild(
                option
            );
        }
    );


    console.log(
        "Users for farm " +
        farmId +
        ":",
        users
    );
}


/* ============================================================
   SAVE ANNOUNCEMENT
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
        )?.value ||
        "Normal";


    const targetType =
        document.getElementById(
            "targetType"
        )?.value ||
        "Farm";


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
        )?.checked ??
        true;


    /* ========================================================
       BASIC VALIDATION
    ======================================================== */

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


    /* ========================================================
       PLATFORM
    ======================================================== */

    if (
        targetType === "Platform"
    ) {

        if (!isSuperAdmin) {

            alert(
                "Only Super Admin can publish platform-wide announcements."
            );

            return;
        }
    }


    /* ========================================================
       FARM TARGET VALIDATION
    ======================================================== */

    if (
        targetType === "Farm" ||
        targetType === "Role" ||
        targetType === "User"
    ) {

        if (!farmValue) {

            alert(
                "Please select the target farm."
            );

            return;
        }
    }


    /* ========================================================
       ROLE TARGET VALIDATION
    ======================================================== */

    if (
        targetType === "Role"
    ) {

        if (!roleValue) {

            alert(
                "Please select the target role."
            );

            return;
        }


        const roleExists =
            availableUsers.some(
                user =>
                    String(
                        user.farm_id
                    ) ===
                    String(farmValue) &&
                    String(
                        user.role || ""
                    ) ===
                    String(roleValue) &&
                    String(
                        user.status || ""
                    )
                        .toLowerCase() ===
                    "active"
            );


        if (!roleExists) {

            alert(
                "The selected role does not currently exist in the selected farm."
            );

            return;
        }
    }


    /* ========================================================
       USER TARGET VALIDATION
    ======================================================== */

    if (
        targetType === "User"
    ) {

        if (!userValue) {

            alert(
                "Please select the target user."
            );

            return;
        }


        const selectedUser =
            availableUsers.find(
                user =>
                    Number(user.id) ===
                    Number(userValue)
            );


        if (
            !selectedUser ||
            String(
                selectedUser.farm_id
            ) !==
            String(farmValue)
        ) {

            alert(
                "The selected user does not belong to the selected farm."
            );

            return;
        }
    }


    /* ========================================================
       PREPARE PAYLOAD
    ======================================================== */

    const payload = {

        title: title,

        message: message,

        priority: priority,

        target_type: targetType,

        farm_id:
            targetType === "Platform"
                ? null
                : (
                    farmValue
                        ? Number(farmValue)
                        : null
                ),

        target_role:
            targetType === "Role"
                ? roleValue
                : null,

        target_user_id:
            targetType === "User"
                ? Number(userValue)
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

        is_active:
            active
    };


    console.log(
        "ANNOUNCEMENT PAYLOAD:",
        payload
    );


    try {


        /* ====================================================
           UPDATE EXISTING
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
           CREATE NEW
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
                "Announcement was saved, but the database record could not be returned."
            );
        }


        console.log(
            "ANNOUNCEMENT CREATED:",
            announcement
        );


        /* ====================================================
           CREATE SECURE NOTIFICATIONS
        ==================================================== */

        let notificationResult = {

            success: true,

            created: 0
        };


        if (
            announcement.is_active === true
        ) {

            let shouldCreateNotifications =
                true;


            if (
                announcement.start_at
            ) {

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
                        "Announcement is scheduled for later."
                    );
                }
            }


            if (
                shouldCreateNotifications
            ) {

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


                    notificationResult = {

                        success: false,

                        created: 0,

                        error:
                            error.message ||
                            "Notification creation failed."
                    };

                } else {

                    let createdCount =
                        0;


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
                            Number(data) ||
                            0;

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

                        createdCount =
                            0;
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
           FINAL MESSAGE
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
   VIEW ANNOUNCEMENT
============================================================ */

function viewAnnouncement(id) {

    const item =
        allAnnouncements.find(
            announcement =>
                Number(
                    announcement.id
                ) ===
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
   CLOSE MESSAGE MODAL
============================================================ */

function closeMessageModal() {

    const modal =
        document.getElementById(
            "messageModal"
        );

    if (modal) {

        modal.style.display =
            "none";
    }
}


/* ============================================================
   EDIT
============================================================ */

function editAnnouncement(id) {

    const item =
        allAnnouncements.find(
            announcement =>
                Number(
                    announcement.id
                ) ===
                Number(id)
        );


    if (!item) {
        return;
    }


    editingAnnouncementId =
        item.id;


    document.getElementById(
        "announcementId"
    ).value =
        item.id;


    document.getElementById(
        "title"
    ).value =
        item.title || "";


    document.getElementById(
        "message"
    ).value =
        item.message || "";


    document.getElementById(
        "priority"
    ).value =
        item.priority ||
        "Normal";


    document.getElementById(
        "targetType"
    ).value =
        item.target_type ||
        "Farm";


    /* ========================================================
       SET FARM FIRST
    ======================================================== */

    const farmSelect =
        document.getElementById(
            "targetFarm"
        );


    if (farmSelect) {

        farmSelect.value =
            item.farm_id || "";
    }


    /* ========================================================
       THEN POPULATE ROLE/USER
    ======================================================== */

    if (
        item.target_type ===
        "Role"
    ) {

        populateRolesForSelectedFarm();

        document.getElementById(
            "targetRole"
        ).value =
            item.target_role || "";
    }


    if (
        item.target_type ===
        "User"
    ) {

        populateUsersForSelectedFarm();

        document.getElementById(
            "targetUser"
        ).value =
            item.target_user_id || "";
    }


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

        cancel.style.display =
            "";
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
                Number(
                    announcement.id
                ) ===
                Number(id)
        );


    if (!item) {
        return;
    }


    try {

        const {
            error
        } =
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

        const {
            error
        } =
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


    editingAnnouncementId =
        null;


    const id =
        document.getElementById(
            "announcementId"
        );


    if (id) {

        id.value =
            "";
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


    /* ========================================================
       RESTORE OWNER/ADMIN FARM
    ======================================================== */

    const farmSelect =
        document.getElementById(
            "targetFarm"
        );


    if (
        farmSelect &&
        !isSuperAdmin &&
        currentProfile?.farm_id
    ) {

        farmSelect.value =
            String(
                currentProfile.farm_id
            );
    }


    handleTargetTypeChange();
}


/* ============================================================
   FARM NAME
============================================================ */

function getFarmName(farmId) {

    const farm =
        availableFarms.find(
            farm =>
                Number(farm.id) ===
                Number(farmId)
        );


    if (farm) {

        return (
            farm.farm_name ||
            `Farm ${farm.id}`
        );
    }


    return (
        farmId
            ? `Farm ${farmId}`
            : "Platform"
    );
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
            show
                ? ""
                : "none";
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

    return String(
        value ?? ""
    )
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
   GLOBAL FUNCTIONS
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

window.closeMessageModal =
    closeMessageModal;


console.log(
    "MUNKA ANNOUNCEMENTS MODULE READY - PHASE 1"
);