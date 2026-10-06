/* =========================================================
   MUNKA PIGGERY TECHNOLOGY
   SUPER ADMIN - PLATFORM ANNOUNCEMENT CENTRE
   ========================================================= */

"use strict";


/* =========================================================
   GLOBAL VARIABLES
   ========================================================= */

let currentUser = null;
let currentProfile = null;

let farms = [];
let users = [];
let announcements = [];

let isEditing = false;


/* =========================================================
   DOM READY
   ========================================================= */

document.addEventListener("DOMContentLoaded", async () => {

    console.log("PLATFORM ANNOUNCEMENTS JS LOADING...");

    try {

        await waitForSupabase();

        await verifySuperAdmin();

        setupEventListeners();

        await loadFarms();

        await loadAnnouncements();

        updateTargetInterface();

    } catch (error) {

        console.error(
            "Announcement Centre initialization error:",
            error
        );

        showStatus(
            error.message ||
            "Unable to load Announcement Centre.",
            "error"
        );

    }

});


/* =========================================================
   WAIT FOR SUPABASE
   ========================================================= */

async function waitForSupabase() {

    let attempts = 0;

    while (
        typeof supabaseClient === "undefined" ||
        !supabaseClient
    ) {

        attempts++;

        if (attempts >= 50) {

            throw new Error(
                "Supabase could not be initialized."
            );

        }

        await new Promise(resolve =>
            setTimeout(resolve, 100)
        );

    }

}


/* =========================================================
   VERIFY SUPER ADMIN
   ========================================================= */

async function verifySuperAdmin() {

    const {
        data: {
            session
        },
        error: sessionError
    } = await supabaseClient.auth.getSession();


    if (sessionError) {

        throw new Error(
            "Unable to verify your login session."
        );

    }


    if (!session) {

        window.location.href = "login.html";

        return;

    }


    currentUser = session.user;


    const {
        data: profile,
        error: profileError
    } = await supabaseClient
        .from("users")
        .select(`
            id,
            full_name,
            username,
            email,
            role,
            status,
            auth_user_id,
            farm_id
        `)
        .eq(
            "auth_user_id",
            currentUser.id
        )
        .maybeSingle();


    if (profileError) {

        console.error(
            "Profile error:",
            profileError
        );

        throw new Error(
            "Unable to load your user profile."
        );

    }


    if (!profile) {

        throw new Error(
            "Your user profile could not be found."
        );

    }


    if (
        profile.role !== "Super Admin"
    ) {

        alert(
            "Access denied. This page is only available to Super Admin."
        );

        window.location.href =
            "dashboard.html";

        return;

    }


    if (
        profile.status !== "Active"
    ) {

        alert(
            "Your Super Admin account is not active."
        );

        await supabaseClient.auth.signOut();

        localStorage.removeItem(
            "loggedInUser"
        );

        window.location.href =
            "login.html";

        return;

    }


    currentProfile = profile;


    updateUserDisplay();


    const badge =
        document.getElementById(
            "announcementAccessBadge"
        );

    if (badge) {

        badge.textContent =
            "SUPER ADMIN ACCESS";

        badge.classList.add(
            "active"
        );

    }

}


/* =========================================================
   USER DISPLAY
   ========================================================= */

function updateUserDisplay() {

    const element =
        document.getElementById(
            "announcementUserName"
        );


    if (!element) {
        return;
    }


    element.textContent =
        currentProfile?.full_name ||
        currentProfile?.username ||
        "Super Admin";

}


/* =========================================================
   EVENT LISTENERS
   ========================================================= */

function setupEventListeners() {


    /* Target type radios */

    document
        .querySelectorAll(
            'input[name="targetType"]'
        )
        .forEach(radio => {

            radio.addEventListener(
                "change",
                updateTargetInterface
            );

        });


    /* Farm selector */

    const farmSelect =
        document.getElementById(
            "announcementFarm"
        );

    if (farmSelect) {

        farmSelect.addEventListener(
            "change",
            async () => {

                await handleFarmChange();

            }
        );

    }


    /* Form */

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


    /* Clear */

    const clearButton =
        document.getElementById(
            "clearAnnouncementBtn"
        );

    if (clearButton) {

        clearButton.addEventListener(
            "click",
            clearAnnouncementForm
        );

    }


    /* Refresh */

    const refreshButton =
        document.getElementById(
            "refreshAnnouncementsBtn"
        );

    if (refreshButton) {

        refreshButton.addEventListener(
            "click",
            loadAnnouncements
        );

    }


    /* Filters */

    const farmFilter =
        document.getElementById(
            "announcementFarmFilter"
        );

    if (farmFilter) {

        farmFilter.addEventListener(
            "change",
            applyAnnouncementFilters
        );

    }


    const priorityFilter =
        document.getElementById(
            "announcementPriorityFilter"
        );

    if (priorityFilter) {

        priorityFilter.addEventListener(
            "change",
            applyAnnouncementFilters
        );

    }


    const targetFilter =
        document.getElementById(
            "announcementTargetFilter"
        );

    if (targetFilter) {

        targetFilter.addEventListener(
            "change",
            applyAnnouncementFilters
        );

    }


    /* Modal */

    const closeModal =
        document.getElementById(
            "closeAnnouncementModal"
        );

    if (closeModal) {

        closeModal.addEventListener(
            "click",
            closeAnnouncementModal
        );

    }

}


/* =========================================================
   LOAD FARMS
   ========================================================= */

async function loadFarms() {

    const {
        data,
        error
    } = await supabaseClient
        .from("farms")
        .select(`
            id,
            farm_name,
            status
        `)
        .order(
            "farm_name",
            {
                ascending: true
            }
        );


    if (error) {

        console.error(
            "Farm loading error:",
            error
        );

        throw new Error(
            "Unable to load farms."
        );

    }


    farms = data || [];


    populateFarmSelector();

    populateFarmFilter();

}


/* =========================================================
   POPULATE FARM SELECTOR
   ========================================================= */

function populateFarmSelector() {

    const select =
        document.getElementById(
            "announcementFarm"
        );


    if (!select) {
        return;
    }


    select.innerHTML = `
        <option value="">
            Select a farm
        </option>
    `;


    farms.forEach(farm => {

        const option =
            document.createElement(
                "option"
            );

        option.value =
            farm.id;

        option.textContent =
            farm.farm_name +
            (
                farm.status
                    ? ` (${farm.status})`
                    : ""
            );

        select.appendChild(
            option
        );

    });

}


/* =========================================================
   POPULATE FARM FILTER
   ========================================================= */

function populateFarmFilter() {

    const select =
        document.getElementById(
            "announcementFarmFilter"
        );


    if (!select) {
        return;
    }


    select.innerHTML = `
        <option value="">
            All Farms
        </option>
    `;


    farms.forEach(farm => {

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

    });

}


/* =========================================================
   TARGET INTERFACE
   ========================================================= */

function updateTargetInterface() {

    const selected =
        document.querySelector(
            'input[name="targetType"]:checked'
        );


    const targetType =
        selected
            ? selected.value
            : "";


    const platformInfo =
        document.getElementById(
            "platformTargetInfo"
        );

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


    hideElement(
        platformInfo
    );

    hideElement(
        farmGroup
    );

    hideElement(
        roleGroup
    );

    hideElement(
        userGroup
    );


    if (targetType === "Platform") {

        showElement(
            platformInfo
        );

    }


    if (targetType === "Farm") {

        showElement(
            farmGroup
        );

    }


    if (targetType === "Role") {

        showElement(
            farmGroup
        );

        showElement(
            roleGroup
        );

    }


    if (targetType === "User") {

        showElement(
            farmGroup
        );

        showElement(
            userGroup
        );

    }


    updateTargetSummary();

}


/* =========================================================
   HANDLE FARM CHANGE
   ========================================================= */

async function handleFarmChange() {

    const selected =
        document.querySelector(
            'input[name="targetType"]:checked'
        );


    if (!selected) {
        return;
    }


    const targetType =
        selected.value;


    if (
        targetType !== "Role" &&
        targetType !== "User"
    ) {

        updateTargetSummary();

        return;

    }


    const farmId =
        document.getElementById(
            "announcementFarm"
        )?.value;


    if (!farmId) {

        resetRoleSelector();

        resetUserSelector();

        updateTargetSummary();

        return;

    }


    if (targetType === "Role") {

        await loadRolesForFarm(
            farmId
        );

    }


    if (targetType === "User") {

        await loadUsersForFarm(
            farmId
        );

    }


    updateTargetSummary();

}


/* =========================================================
   LOAD ROLES FOR FARM
   ========================================================= */

async function loadRolesForFarm(
    farmId
) {

    const select =
        document.getElementById(
            "announcementRole"
        );


    if (!select) {
        return;
    }


    select.disabled = true;


    select.innerHTML = `
        <option value="">
            Loading roles...
        </option>
    `;


    const {
        data,
        error
    } = await supabaseClient
        .from("users")
        .select(`
            role
        `)
        .eq(
            "farm_id",
            farmId
        )
        .eq(
            "status",
            "Active"
        )
        .not(
            "role",
            "is",
            null
        );


    if (error) {

        console.error(
            "Role loading error:",
            error
        );

        select.innerHTML = `
            <option value="">
                Unable to load roles
            </option>
        `;

        return;

    }


    const roles =
        [
            ...new Set(
                (data || [])
                    .map(user =>
                        user.role
                    )
                    .filter(Boolean)
            )
        ]
        .sort();


    select.innerHTML = `
        <option value="">
            Select a role
        </option>
    `;


    roles.forEach(role => {

        const option =
            document.createElement(
                "option"
            );

        option.value =
            role;

        option.textContent =
            role;

        select.appendChild(
            option
        );

    });


    select.disabled =
        roles.length === 0;


    select.onchange =
        updateTargetSummary;

}


/* =========================================================
   LOAD USERS FOR FARM
   ========================================================= */

async function loadUsersForFarm(
    farmId
) {

    const select =
        document.getElementById(
            "announcementUser"
        );


    if (!select) {
        return;
    }


    select.disabled = true;


    select.innerHTML = `
        <option value="">
            Loading users...
        </option>
    `;


    const {
        data,
        error
    } = await supabaseClient
        .from("users")
        .select(`
            id,
            full_name,
            username,
            email,
            role,
            status,
            farm_id
        `)
        .eq(
            "farm_id",
            farmId
        )
        .eq(
            "status",
            "Active"
        )
        .order(
            "full_name",
            {
                ascending: true
            }
        );


    if (error) {

        console.error(
            "User loading error:",
            error
        );

        select.innerHTML = `
            <option value="">
                Unable to load users
            </option>
        `;

        return;

    }


    users =
        data || [];


    select.innerHTML = `
        <option value="">
            Select a user
        </option>
    `;


    users.forEach(user => {

        const option =
            document.createElement(
                "option"
            );

        option.value =
            user.id;


        const name =
            user.full_name ||
            user.username ||
            user.email ||
            "Unnamed User";


        option.textContent =
            user.role
                ? `${name} — ${user.role}`
                : name;


        select.appendChild(
            option
        );

    });


    select.disabled =
        users.length === 0;


    select.onchange =
        updateTargetSummary;

}


/* =========================================================
   RESET ROLE SELECTOR
   ========================================================= */

function resetRoleSelector() {

    const select =
        document.getElementById(
            "announcementRole"
        );


    if (!select) {
        return;
    }


    select.innerHTML = `
        <option value="">
            Select a farm first
        </option>
    `;


    select.disabled =
        true;

}


/* =========================================================
   RESET USER SELECTOR
   ========================================================= */

function resetUserSelector() {

    const select =
        document.getElementById(
            "announcementUser"
        );


    if (!select) {
        return;
    }


    select.innerHTML = `
        <option value="">
            Select a farm first
        </option>
    `;


    select.disabled =
        true;

}


/* =========================================================
   TARGET SUMMARY
   ========================================================= */

function updateTargetSummary() {

    const summary =
        document.getElementById(
            "targetSummary"
        );

    const text =
        document.getElementById(
            "targetSummaryText"
        );


    if (!summary || !text) {
        return;
    }


    const selected =
        document.querySelector(
            'input[name="targetType"]:checked'
        );


    if (!selected) {

        hideElement(
            summary
        );

        return;

    }


    const targetType =
        selected.value;


    let message = "";


    if (
        targetType === "Platform"
    ) {

        message =
            "🌍 This announcement will be sent across the entire MUNKA PIGGERY TECHNOLOGY platform.";

    }


    if (
        targetType === "Farm"
    ) {

        const farm =
            getSelectedFarm();


        if (!farm) {

            message =
                "🏠 Select a farm to continue.";

        } else {

            message =
                `🏠 Everyone in ${farm.farm_name} will receive this announcement.`;

        }

    }


    if (
        targetType === "Role"
    ) {

        const farm =
            getSelectedFarm();


        const role =
            document.getElementById(
                "announcementRole"
            )?.value;


        if (!farm) {

            message =
                "👥 Select a farm first.";

        } else if (!role) {

            message =
                `👥 Select a role in ${farm.farm_name}.`;

        } else {

            message =
                `👥 All active ${role} users in ${farm.farm_name} will receive this announcement.`;

        }

    }


    if (
        targetType === "User"
    ) {

        const farm =
            getSelectedFarm();


        const userId =
            document.getElementById(
                "announcementUser"
            )?.value;


        const user =
            users.find(
                item =>
                    String(item.id) ===
                    String(userId)
            );


        if (!farm) {

            message =
                "👤 Select a farm first.";

        } else if (!user) {

            message =
                `👤 Select a user in ${farm.farm_name}.`;

        } else {

            const name =
                user.full_name ||
                user.username ||
                user.email ||
                "Selected user";


            message =
                `👤 Only ${name} will receive this announcement.`;

        }

    }


    text.textContent =
        message;


    showElement(
        summary
    );

}


/* =========================================================
   GET SELECTED FARM
   ========================================================= */

function getSelectedFarm() {

    const farmId =
        document.getElementById(
            "announcementFarm"
        )?.value;


    if (!farmId) {
        return null;
    }


    return farms.find(
        farm =>
            String(farm.id) ===
            String(farmId)
    ) || null;

}


/* =========================================================
   HANDLE SUBMIT
   ========================================================= */

async function handleSubmit(
    event
) {

    event.preventDefault();


    clearFormMessage();


    if (!currentProfile) {

        showFormMessage(
            "Your Super Admin profile is not loaded.",
            "error"
        );

        return;

    }


    const title =
        document.getElementById(
            "announcementTitle"
        )?.value.trim();


    const message =
        document.getElementById(
            "announcementMessageText"
        )?.value.trim();


    const priority =
        document.getElementById(
            "announcementPriority"
        )?.value ||
        "Normal";


    const selectedTarget =
        document.querySelector(
            'input[name="targetType"]:checked'
        );


    const startAt =
        document.getElementById(
            "startAt"
        )?.value;


    const expiresAt =
        document.getElementById(
            "expiresAt"
        )?.value;


    const isActive =
        document.getElementById(
            "isActive"
        )?.checked !== false;


    if (!title) {

        showFormMessage(
            "Please enter an announcement title.",
            "error"
        );

        return;

    }


    if (!message) {

        showFormMessage(
            "Please enter the announcement message.",
            "error"
        );

        return;

    }


    if (!selectedTarget) {

        showFormMessage(
            "Please select a target audience.",
            "error"
        );

        return;

    }


    const targetType =
        selectedTarget.value;


    const farmId =
        document.getElementById(
            "announcementFarm"
        )?.value || null;


    const role =
        document.getElementById(
            "announcementRole"
        )?.value || null;


    const userId =
        document.getElementById(
            "announcementUser"
        )?.value || null;


    /* ==========================================
       VALIDATE TARGET
       ========================================== */

    if (
        targetType === "Farm" &&
        !farmId
    ) {

        showFormMessage(
            "Please select the farm that should receive this announcement.",
            "error"
        );

        return;

    }


    if (
        targetType === "Role" &&
        !farmId
    ) {

        showFormMessage(
            "Please select a farm for the role announcement.",
            "error"
        );

        return;

    }


    if (
        targetType === "Role" &&
        !role
    ) {

        showFormMessage(
            "Please select the role that should receive this announcement.",
            "error"
        );

        return;

    }


    if (
        targetType === "User" &&
        !farmId
    ) {

        showFormMessage(
            "Please select a farm for the user announcement.",
            "error"
        );

        return;

    }


    if (
        targetType === "User" &&
        !userId
    ) {

        showFormMessage(
            "Please select the user that should receive this announcement.",
            "error"
        );

        return;

    }


    /* ==========================================
       VERIFY TARGET BELONGS TO FARM
       ========================================== */

    if (
        targetType === "Role"
    ) {

        const roleExists =
            users.some(
                user =>
                    String(user.farm_id) ===
                    String(farmId) &&
                    user.status === "Active" &&
                    user.role === role
            );


        if (!roleExists) {

            showFormMessage(
                "The selected role could not be verified for this farm.",
                "error"
            );

            return;

        }

    }


    if (
        targetType === "User"
    ) {

        const selectedUser =
            users.find(
                user =>
                    String(user.id) ===
                    String(userId)
            );


        if (
            !selectedUser ||
            String(selectedUser.farm_id) !==
            String(farmId)
        ) {

            showFormMessage(
                "The selected user does not belong to the selected farm.",
                "error"
            );

            return;

        }

    }


    /* ==========================================
       DATE VALIDATION
       ========================================== */

    if (
        startAt &&
        expiresAt
    ) {

        const start =
            new Date(startAt);

        const expiry =
            new Date(expiresAt);


        if (
            expiry <= start
        ) {

            showFormMessage(
                "Expiry date and time must be later than the start date and time.",
                "error"
            );

            return;

        }

    }


    /* ==========================================
       BUILD SECURE PAYLOAD
       ========================================== */

    const payload = {

        title: title,

        message: message,

        priority: priority,

        target_type: targetType,

        farm_id:
            targetType === "Platform"
                ? null
                : farmId
                    ? Number(farmId)
                    : null,

        target_role:
            targetType === "Role"
                ? role
                : null,

        target_user_id:
            targetType === "User"
                ? Number(userId)
                : null,

        created_by:
            currentProfile.id,

        start_at:
            startAt
                ? new Date(startAt).toISOString()
                : null,

        expires_at:
            expiresAt
                ? new Date(expiresAt).toISOString()
                : null,

        is_active:
            isActive

    };


    console.log(
        "Announcement payload:",
        payload
    );


    /* ==========================================
       BUTTON STATE
       ========================================== */

    const publishButton =
        document.getElementById(
            "publishAnnouncementBtn"
        );


    if (publishButton) {

        publishButton.disabled =
            true;

        publishButton.textContent =
            isEditing
                ? "Updating..."
                : "Publishing...";

    }


    try {

        let announcementId =
            document.getElementById(
                "announcementId"
            )?.value;


        /* ======================================
           EDIT EXISTING
           ====================================== */

        if (
            isEditing &&
            announcementId
        ) {

            const {
                error
            } = await supabaseClient
                .from("announcements")
                .update(payload)
                .eq(
                    "id",
                    announcementId
                );


            if (error) {

                throw error;

            }


            showFormMessage(
                "Announcement updated successfully.",
                "success"
            );

        }


        /* ======================================
           CREATE NEW
           ====================================== */

        else {

            const {
                data,
                error
            } = await supabaseClient
                .from("announcements")
                .insert(
                    payload
                )
                .select()
                .single();


            if (error) {

                throw error;

            }


            announcementId =
                data.id;


            /* ==================================
               CREATE NOTIFICATIONS
               ================================== */

            const {
                error: rpcError
            } = await supabaseClient
                .rpc(
                    "create_announcement_notifications",
                    {
                        p_announcement_id:
                            announcementId
                    }
                );


            if (rpcError) {

                console.error(
                    "Notification RPC error:",
                    rpcError
                );


                showFormMessage(
                    "Announcement was created, but notifications could not be generated. Please check the notification function.",
                    "warning"
                );

            } else {

                showFormMessage(
                    "Announcement published successfully and notifications were created.",
                    "success"
                );

            }

        }


        await loadAnnouncements();


        if (
            !isEditing
        ) {

            setTimeout(
                clearAnnouncementForm,
                1200
            );

        } else {

            setTimeout(
                clearAnnouncementForm,
                1500
            );

        }


    } catch (error) {

        console.error(
            "Announcement save error:",
            error
        );


        let errorMessage =
            error?.message ||
            "Unable to save the announcement.";


        if (
            errorMessage.includes(
                "row-level security"
            ) ||
            errorMessage.includes(
                "permission denied"
            )
        ) {

            errorMessage =
                "Supabase security policy rejected this announcement.";

        }


        showFormMessage(
            errorMessage,
            "error"
        );

    } finally {

        if (publishButton) {

            publishButton.disabled =
                false;

            publishButton.textContent =
                isEditing
                    ? "Update Announcement"
                    : "Publish Announcement";

        }

    }

}


/* =========================================================
   LOAD ANNOUNCEMENTS
   ========================================================= */

async function loadAnnouncements() {

    const status =
        document.getElementById(
            "announcementsStatus"
        );


    if (status) {

        status.textContent =
            "Loading announcements...";

    }


    try {

        const {
            data,
            error
        } = await supabaseClient
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
            .order(
                "created_at",
                {
                    ascending: false
                }
            );


        if (error) {

            throw error;

        }


        announcements =
            data || [];


        renderAnnouncements(
            announcements
        );


        if (status) {

            status.textContent =
                `${announcements.length} announcement${
                    announcements.length === 1
                        ? ""
                        : "s"
                } found.`;

        }

    } catch (error) {

        console.error(
            "Announcement loading error:",
            error
        );


        if (status) {

            status.textContent =
                "Unable to load announcements.";

        }


        const list =
            document.getElementById(
                "announcementsList"
            );


        if (list) {

            list.innerHTML = `
                <div class="empty-state error-state">
                    Unable to load announcements.
                    <br>
                    <small>
                        ${escapeHtml(
                            error.message ||
                            "Unknown error"
                        )}
                    </small>
                </div>
            `;

        }

    }

}


/* =========================================================
   RENDER ANNOUNCEMENTS
   ========================================================= */

function renderAnnouncements(
    data
) {

    const list =
        document.getElementById(
            "announcementsList"
        );


    if (!list) {
        return;
    }


    if (
        !data ||
        data.length === 0
    ) {

        list.innerHTML = `
            <div class="empty-state">
                📢 No announcements found.
            </div>
        `;

        return;

    }


    list.innerHTML =
        data
            .map(
                announcement =>
                    createAnnouncementCard(
                        announcement
                    )
            )
            .join("");

}


/* =========================================================
   CREATE ANNOUNCEMENT CARD
   ========================================================= */

function createAnnouncementCard(
    announcement
) {

    const farm =
        farms.find(
            item =>
                String(item.id) ===
                String(announcement.farm_id)
        );


    const farmName =
        farm
            ? farm.farm_name
            : "Platform";


    const targetText =
        getTargetDisplayText(
            announcement
        );


    const active =
        announcement.is_active;


    const priority =
        announcement.priority ||
        "Normal";


    const createdDate =
        formatDate(
            announcement.created_at
        );


    const startDate =
        formatDate(
            announcement.start_at
        );


    const expiryDate =
        formatDate(
            announcement.expires_at
        );


    return `
        <article
            class="announcement-item ${
                active
                    ? "announcement-active"
                    : "announcement-inactive"
            }"
        >

            <div class="announcement-item-header">

                <div>

                    <h3>
                        ${escapeHtml(
                            announcement.title
                        )}
                    </h3>

                    <div class="announcement-meta">

                        <span class="priority-badge priority-${priority.toLowerCase()}">
                            ${escapeHtml(priority)}
                        </span>

                        <span class="status-badge ${
                            active
                                ? "status-active"
                                : "status-inactive"
                        }">

                            ${
                                active
                                    ? "Active"
                                    : "Inactive"
                            }

                        </span>

                    </div>

                </div>

            </div>


            <div class="announcement-item-body">

                <p>
                    ${escapeHtml(
                        announcement.message
                    )}
                </p>

            </div>


            <div class="announcement-target">

                <strong>
                    Target:
                </strong>

                ${escapeHtml(
                    targetText
                )}

            </div>


            <div class="announcement-dates">

                <span>
                    Created:
                    ${createdDate}
                </span>

                ${
                    announcement.start_at
                        ? `
                            <span>
                                Starts:
                                ${startDate}
                            </span>
                        `
                        : ""
                }

                ${
                    announcement.expires_at
                        ? `
                            <span>
                                Expires:
                                ${expiryDate}
                            </span>
                        `
                        : ""
                }

            </div>


            <div class="announcement-actions">

                <button
                    type="button"
                    class="secondary-btn"
                    onclick="viewAnnouncement(${announcement.id})"
                >
                    View
                </button>


                <button
                    type="button"
                    class="secondary-btn"
                    onclick="editAnnouncement(${announcement.id})"
                >
                    Edit
                </button>


                <button
                    type="button"
                    class="secondary-btn"
                    onclick="toggleAnnouncement(${announcement.id})"
                >
                    ${
                        active
                            ? "Deactivate"
                            : "Activate"
                    }
                </button>


                <button
                    type="button"
                    class="danger-btn"
                    onclick="deleteAnnouncement(${announcement.id})"
                >
                    Delete
                </button>

            </div>

        </article>
    `;

}


/* =========================================================
   TARGET DISPLAY
   ========================================================= */

function getTargetDisplayText(
    announcement
) {

    if (
        announcement.target_type ===
        "Platform"
    ) {

        return "Entire Platform";

    }


    const farm =
        farms.find(
            item =>
                String(item.id) ===
                String(announcement.farm_id)
        );


    const farmName =
        farm
            ? farm.farm_name
            : "Unknown Farm";


    if (
        announcement.target_type ===
        "Farm"
    ) {

        return `Whole Farm — ${farmName}`;

    }


    if (
        announcement.target_type ===
        "Role"
    ) {

        return `Role — ${announcement.target_role || "Unknown"} — ${farmName}`;

    }


    if (
        announcement.target_type ===
        "User"
    ) {

        return `Specific User — ${getUserName(
            announcement.target_user_id
        )} — ${farmName}`;

    }


    return "Unknown Target";

}


/* =========================================================
   GET USER NAME
   ========================================================= */

function getUserName(
    userId
) {

    const user =
        users.find(
            item =>
                String(item.id) ===
                String(userId)
        );


    if (user) {

        return (
            user.full_name ||
            user.username ||
            user.email ||
            `User #${userId}`
        );

    }


    return `User #${userId}`;

}


/* =========================================================
   VIEW ANNOUNCEMENT
   ========================================================= */

function viewAnnouncement(
    id
) {

    const announcement =
        announcements.find(
            item =>
                String(item.id) ===
                String(id)
        );


    if (!announcement) {
        return;
    }


    const modal =
        document.getElementById(
            "announcementModal"
        );

    const body =
        document.getElementById(
            "announcementModalBody"
        );


    if (!modal || !body) {
        return;
    }


    const target =
        getTargetDisplayText(
            announcement
        );


    body.innerHTML = `

        <div class="modal-announcement">

            <h3>
                ${escapeHtml(
                    announcement.title
                )}
            </h3>

            <div class="announcement-meta">

                <span>
                    Priority:
                    <strong>
                        ${escapeHtml(
                            announcement.priority
                        )}
                    </strong>
                </span>

                <span>
                    Status:
                    <strong>
                        ${
                            announcement.is_active
                                ? "Active"
                                : "Inactive"
                        }
                    </strong>
                </span>

            </div>


            <hr>


            <p>
                ${escapeHtml(
                    announcement.message
                )}
            </p>


            <hr>


            <p>
                <strong>
                    Target:
                </strong>

                ${escapeHtml(
                    target
                )}
            </p>


            <p>
                <strong>
                    Created:
                </strong>

                ${formatDate(
                    announcement.created_at
                )}
            </p>


            ${
                announcement.start_at
                    ? `
                        <p>
                            <strong>
                                Starts:
                            </strong>

                            ${formatDate(
                                announcement.start_at
                            )}
                        </p>
                    `
                    : ""
            }


            ${
                announcement.expires_at
                    ? `
                        <p>
                            <strong>
                                Expires:
                            </strong>

                            ${formatDate(
                                announcement.expires_at
                            )}
                        </p>
                    `
                    : ""
            }

        </div>

    `;


    showElement(
        modal
    );

}


/* =========================================================
   CLOSE MODAL
   ========================================================= */

function closeAnnouncementModal() {

    const modal =
        document.getElementById(
            "announcementModal"
        );


    if (modal) {

        hideElement(
            modal
        );

    }

}


/* =========================================================
   EDIT ANNOUNCEMENT
   ========================================================= */

async function editAnnouncement(
    id
) {

    const announcement =
        announcements.find(
            item =>
                String(item.id) ===
                String(id)
        );


    if (!announcement) {
        return;
    }


    isEditing = true;


    document.getElementById(
        "announcementId"
    ).value =
        announcement.id;


    document.getElementById(
        "announcementTitle"
    ).value =
        announcement.title || "";


    document.getElementById(
        "announcementMessageText"
    ).value =
        announcement.message || "";


    document.getElementById(
        "announcementPriority"
    ).value =
        announcement.priority ||
        "Normal";


    document.querySelectorAll(
        'input[name="targetType"]'
    )
    .forEach(radio => {

        radio.checked =
            radio.value ===
            announcement.target_type;

    });


    const farmSelect =
        document.getElementById(
            "announcementFarm"
        );


    if (
        announcement.target_type !==
        "Platform"
    ) {

        farmSelect.value =
            announcement.farm_id || "";

    } else {

        farmSelect.value =
            "";

    }


    updateTargetInterface();


    if (
        announcement.target_type ===
        "Role"
    ) {

        await loadRolesForFarm(
            announcement.farm_id
        );


        document.getElementById(
            "announcementRole"
        ).value =
            announcement.target_role || "";

    }


    if (
        announcement.target_type ===
        "User"
    ) {

        await loadUsersForFarm(
            announcement.farm_id
        );


        document.getElementById(
            "announcementUser"
        ).value =
            announcement.target_user_id || "";

    }


    if (announcement.start_at) {

        document.getElementById(
            "startAt"
        ).value =
            toDateTimeLocal(
                announcement.start_at
            );

    } else {

        document.getElementById(
            "startAt"
        ).value =
            "";

    }


    if (announcement.expires_at) {

        document.getElementById(
            "expiresAt"
        ).value =
            toDateTimeLocal(
                announcement.expires_at
            );

    } else {

        document.getElementById(
            "expiresAt"
        ).value =
            "";

    }


    document.getElementById(
        "isActive"
    ).checked =
        announcement.is_active;


    const heading =
        document.getElementById(
            "announcementFormHeading"
        );


    if (heading) {

        heading.textContent =
            "Edit Announcement";

    }


    const button =
        document.getElementById(
            "publishAnnouncementBtn"
        );


    if (button) {

        button.textContent =
            "Update Announcement";

    }


    updateTargetSummary();


    window.scrollTo({
        top: 0,
        behavior: "smooth"
    });

}


/* =========================================================
   TOGGLE ANNOUNCEMENT
   ========================================================= */

async function toggleAnnouncement(
    id
) {

    const announcement =
        announcements.find(
            item =>
                String(item.id) ===
                String(id)
        );


    if (!announcement) {
        return;
    }


    const newStatus =
        !announcement.is_active;


    const confirmed =
        confirm(
            newStatus
                ? "Activate this announcement?"
                : "Deactivate this announcement?"
        );


    if (!confirmed) {
        return;
    }


    try {

        const {
            error
        } = await supabaseClient
            .from("announcements")
            .update({
                is_active:
                    newStatus
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

        console.error(
            "Toggle announcement error:",
            error
        );


        alert(
            error.message ||
            "Unable to update announcement."
        );

    }

}


/* =========================================================
   DELETE ANNOUNCEMENT
   ========================================================= */

async function deleteAnnouncement(
    id
) {

    const announcement =
        announcements.find(
            item =>
                String(item.id) ===
                String(id)
        );


    if (!announcement) {
        return;
    }


    const confirmed =
        confirm(
            `Delete "${announcement.title}"?\n\nThis action cannot be undone.`
        );


    if (!confirmed) {
        return;
    }


    try {

        const {
            error
        } = await supabaseClient
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

        console.error(
            "Delete announcement error:",
            error
        );


        alert(
            error.message ||
            "Unable to delete announcement."
        );

    }

}


/* =========================================================
   FILTER ANNOUNCEMENTS
   ========================================================= */

function applyAnnouncementFilters() {

    const farmId =
        document.getElementById(
            "announcementFarmFilter"
        )?.value || "";


    const priority =
        document.getElementById(
            "announcementPriorityFilter"
        )?.value || "";


    const target =
        document.getElementById(
            "announcementTargetFilter"
        )?.value || "";


    let filtered =
        [...announcements];


    if (farmId) {

        filtered =
            filtered.filter(
                announcement =>
                    String(
                        announcement.farm_id
                    ) ===
                    String(farmId)
            );

    }


    if (priority) {

        filtered =
            filtered.filter(
                announcement =>
                    announcement.priority ===
                    priority
            );

    }


    if (target) {

        filtered =
            filtered.filter(
                announcement =>
                    announcement.target_type ===
                    target
            );

    }


    renderAnnouncements(
        filtered
    );


    const status =
        document.getElementById(
            "announcementsStatus"
        );


    if (status) {

        status.textContent =
            `${filtered.length} announcement${
                filtered.length === 1
                    ? ""
                    : "s"
            } found.`;

    }

}


/* =========================================================
   CLEAR FORM
   ========================================================= */

function clearAnnouncementForm() {

    const form =
        document.getElementById(
            "announcementForm"
        );


    if (form) {

        form.reset();

    }


    document.getElementById(
        "announcementId"
    ).value =
        "";


    isEditing =
        false;


    resetRoleSelector();

    resetUserSelector();


    const heading =
        document.getElementById(
            "announcementFormHeading"
        );


    if (heading) {

        heading.textContent =
            "Create Announcement";

    }


    const button =
        document.getElementById(
            "publishAnnouncementBtn"
        );


    if (button) {

        button.textContent =
            "Publish Announcement";

    }


    const platformRadio =
        document.getElementById(
            "targetPlatform"
        );


    if (platformRadio) {

        platformRadio.checked =
            true;

    }


    updateTargetInterface();

    clearFormMessage();

}


/* =========================================================
   FORM MESSAGE
   ========================================================= */

function showFormMessage(
    message,
    type = "info"
) {

    const element =
        document.getElementById(
            "announcementMessage"
        );


    if (!element) {
        return;
    }


    element.textContent =
        message;


    element.className =
        `form-message ${type}`;

}


function clearFormMessage() {

    const element =
        document.getElementById(
            "announcementMessage"
        );


    if (!element) {
        return;
    }


    element.textContent =
        "";


    element.className =
        "form-message";

}


/* =========================================================
   STATUS MESSAGE
   ========================================================= */

function showStatus(
    message,
    type = "info"
) {

    const element =
        document.getElementById(
            "announcementsStatus"
        );


    if (!element) {
        return;
    }


    element.textContent =
        message;


    element.className =
        `announcements-status ${type}`;

}


/* =========================================================
   DATE FORMAT
   ========================================================= */

function formatDate(
    value
) {

    if (!value) {

        return "Not specified";

    }


    const date =
        new Date(value);


    if (
        Number.isNaN(
            date.getTime()
        )
    ) {

        return "Invalid date";

    }


    return new Intl.DateTimeFormat(
        "en-ZM",
        {
            timeZone:
                "Africa/Lusaka",

            dateStyle:
                "medium",

            timeStyle:
                "short"
        }
    ).format(
        date
    );

}


/* =========================================================
   DATETIME LOCAL
   ========================================================= */

function toDateTimeLocal(
    value
) {

    if (!value) {
        return "";
    }


    const date =
        new Date(value);


    if (
        Number.isNaN(
            date.getTime()
        )
    ) {

        return "";

    }


    const parts =
        new Intl.DateTimeFormat(
            "en-CA",
            {
                timeZone:
                    "Africa/Lusaka",

                year:
                    "numeric",

                month:
                    "2-digit",

                day:
                    "2-digit",

                hour:
                    "2-digit",

                minute:
                    "2-digit",

                hourCycle:
                    "h23"
            }
        ).formatToParts(
            date
        );


    const values = {};


    parts.forEach(
        part => {

            values[part.type] =
                part.value;

        }
    );


    return `${values.year}-${values.month}-${values.day}T${values.hour}:${values.minute}`;

}


/* =========================================================
   HTML ESCAPE
   ========================================================= */

function escapeHtml(
    value
) {

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


/* =========================================================
   SHOW / HIDE HELPERS
   ========================================================= */

function showElement(
    element
) {

    if (!element) {
        return;
    }


    element.classList.remove(
        "hidden"
    );

}


function hideElement(
    element
) {

    if (!element) {
        return;
    }


    element.classList.add(
        "hidden"
    );

}


/* =========================================================
   GLOBAL FUNCTIONS
   ========================================================= */

window.viewAnnouncement =
    viewAnnouncement;

window.editAnnouncement =
    editAnnouncement;

window.toggleAnnouncement =
    toggleAnnouncement;

window.deleteAnnouncement =
    deleteAnnouncement;

window.closeAnnouncementModal =
    closeAnnouncementModal;

window.clearAnnouncementForm =
    clearAnnouncementForm;


/* =========================================================
   NAVIGATION
   ========================================================= */

window.goBackToDashboard =
    function () {

        window.location.href =
            "platform_dashboard.html";

    };


window.logoutAnnouncementUser =
    async function () {

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

    };


console.log(
    "PLATFORM ANNOUNCEMENTS JS READY."
);