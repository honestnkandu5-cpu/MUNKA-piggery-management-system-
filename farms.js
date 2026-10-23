// ============================================================
// MUNKA PIGGERY TECHNOLOGY
// SUPER ADMIN - FARM MANAGEMENT
// ============================================================
// Uses the existing global supabaseClient from supabase.js.
// Does not permanently delete farms.
// ============================================================

"use strict";

const FARM_FIELDS = [
    "id",
    "farm_name",
    "owner_name",
    "phone",
    "email",
    "location",
    "status",
    "created_at",
    "subscription_start",
    "subscription_end"
].join(",");

let farmsCache = [];
let farmPageUser = null;
let farmActionInProgress = false;

// ------------------------------------------------------------
// BASIC HELPERS
// ------------------------------------------------------------

function byId(id) {
    return document.getElementById(id);
}

function escapeHTML(value) {
    return String(value ?? "").replace(/[&<>"']/g, function (char) {
        const entities = {
            "&": "&amp;",
            "<": "&lt;",
            ">": "&gt;",
            '"': "&quot;",
            "'": "&#39;"
        };
        return entities[char];
    });
}

function normalise(value) {
    return String(value ?? "").trim().toLowerCase();
}

function formatDate(value) {
    if (!value) return "Not set";

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
        return "Not set";
    }

    return new Intl.DateTimeFormat("en-ZM", {
        timeZone: "Africa/Lusaka",
        day: "2-digit",
        month: "short",
        year: "numeric"
    }).format(date);
}

function farmIsActive(farm) {
    return normalise(farm.status) === "active";
}

function showMessage(message, type = "info") {
    const box = byId("pageMessage");

    box.textContent = message;
    box.className = "message " + type;
    box.scrollIntoView({
        behavior: "smooth",
        block: "nearest"
    });
}

function clearMessage() {
    const box = byId("pageMessage");
    box.textContent = "";
    box.className = "message hidden";
}

function setLoading(isLoading) {
    byId("loadingMessage").classList.toggle("hidden", !isLoading);
    byId("refreshBtn").disabled = isLoading || farmActionInProgress;
}

function setActionButtonsDisabled(disabled) {
    document.querySelectorAll("[data-farm-action]").forEach(function (button) {
        button.disabled = disabled;
    });
}

// ------------------------------------------------------------
// NIGHT MODE
// ------------------------------------------------------------

function applySavedTheme() {
    let theme = "light";

    try {
        theme = localStorage.getItem("munkaFarmTheme") || "light";
    } catch (error) {
        // Continue with light mode if storage is unavailable.
    }

    document.body.classList.toggle("dark-mode", theme === "dark");
    updateThemeButton();
}

function updateThemeButton() {
    const isDark = document.body.classList.contains("dark-mode");

    byId("themeToggle").textContent = isDark
        ? "☀️ Light Mode"
        : "🌙 Night Mode";
}

function toggleTheme() {
    const isDark = document.body.classList.toggle("dark-mode");

    try {
        localStorage.setItem("munkaFarmTheme", isDark ? "dark" : "light");
    } catch (error) {
        // Theme still works for this page session.
    }

    updateThemeButton();
}

// ------------------------------------------------------------
// AUTHENTICATION AND SUPER ADMIN SECURITY
// ------------------------------------------------------------

async function safeSignOut(message) {
    try {
        await supabaseClient.auth.signOut();
    } catch (error) {
        console.error("Sign-out error:", error);
    }

    if (message) {
        alert(message);
    }

    window.location.replace("login.html");
}

async function verifySuperAdmin() {
    if (typeof supabaseClient === "undefined" || !supabaseClient) {
        throw new Error(
            "Supabase is not initialized. Check supabase.js and its script order."
        );
    }

    const { data: sessionData, error: sessionError } =
        await supabaseClient.auth.getSession();

    if (sessionError) {
        throw new Error("Unable to verify your login session.");
    }

    const session = sessionData?.session;

    if (!session?.user?.id) {
        window.location.replace("login.html");
        return false;
    }

    const { data: profile, error: profileError } = await supabaseClient
        .from("users")
        .select("id, full_name, username, role, status, auth_user_id")
        .eq("auth_user_id", session.user.id)
        .maybeSingle();

    if (profileError) {
        throw new Error("Unable to verify your platform user profile.");
    }

    if (
        !profile ||
        normalise(profile.role) !== "super admin" ||
        normalise(profile.status) !== "active"
    ) {
        await safeSignOut(
            "Access denied. This page is only available to an active Super Admin."
        );
        return false;
    }

    // Require a verified MFA session, matching platform_dashboard.js.
    const { data: assuranceData, error: assuranceError } =
        await supabaseClient.auth.mfa.getAuthenticatorAssuranceLevel();

    if (assuranceError) {
        throw new Error(
            "Unable to verify your MFA security level. Please sign in again."
        );
    }

    if (assuranceData?.currentLevel !== "aal2") {
        window.location.replace("login.html");
        return false;
    }

    farmPageUser = profile;
    return true;
}

// ------------------------------------------------------------
// LOAD FARM RECORDS
// ------------------------------------------------------------

async function loadFarms() {
    clearMessage();
    setLoading(true);
    byId("farmTableWrapper").classList.add("hidden");
    byId("emptyMessage").classList.add("hidden");

    try {
        const { data, error } = await supabaseClient
            .from("farms")
            .select(FARM_FIELDS)
            .order("created_at", { ascending: false });

        if (error) {
            throw error;
        }

        farmsCache = Array.isArray(data) ? data : [];
        updateStatistics();
        renderFarms();

    } catch (error) {
        console.error("Farm loading error:", error);

        showMessage(
            "Unable to load farm records. Check your internet connection, " +
            "Supabase configuration, and farms table permissions. " +
            (error.message || ""),
            "error"
        );

        byId("farmTableBody").innerHTML = "";
        byId("farmTableWrapper").classList.add("hidden");
        byId("emptyMessage").classList.add("hidden");

    } finally {
        setLoading(false);
    }
}

function updateStatistics() {
    const active = farmsCache.filter(farmIsActive).length;

    byId("totalFarms").textContent = farmsCache.length;
    byId("activeFarms").textContent = active;
    byId("inactiveFarms").textContent = farmsCache.length - active;
}

// ------------------------------------------------------------
// SUBSCRIPTION DISPLAY
// ------------------------------------------------------------

function getSubscriptionInfo(farm) {
    const start = farm.subscription_start;
    const end = farm.subscription_end;

    if (!start && !end) {
        return {
            label: "Not configured",
            className: "status-warning"
        };
    }

    if (end) {
        const endDate = new Date(end);

        if (!Number.isNaN(endDate.getTime())) {
            const now = new Date();
            const todayInLusaka = new Intl.DateTimeFormat("en-CA", {
                timeZone: "Africa/Lusaka",
                year: "numeric",
                month: "2-digit",
                day: "2-digit"
            }).format(now);

            const endInLusaka = new Intl.DateTimeFormat("en-CA", {
                timeZone: "Africa/Lusaka",
                year: "numeric",
                month: "2-digit",
                day: "2-digit"
            }).format(endDate);

            if (endInLusaka < todayInLusaka) {
                return {
                    label: "Expired · " + formatDate(end),
                    className: "status-inactive"
                };
            }
        }
    }

    return {
        label: end
            ? "Valid until " + formatDate(end)
            : "No end date",
        className: "status-active"
    };
}

// ------------------------------------------------------------
// DISPLAY / FILTER FARMS
// ------------------------------------------------------------

function renderFarms() {
    const query = normalise(byId("farmSearch").value);
    const statusFilter = byId("statusFilter").value;

    const filtered = farmsCache.filter(function (farm) {
        const statusMatches =
            statusFilter === "all" ||
            (statusFilter === "active" && farmIsActive(farm)) ||
            (statusFilter === "inactive" && !farmIsActive(farm));

        const searchableText = [
            farm.farm_name,
            farm.owner_name,
            farm.phone,
            farm.email,
            farm.location,
            farm.id
        ].join(" ").toLowerCase();

        return statusMatches && searchableText.includes(query);
    });

    const tbody = byId("farmTableBody");
    tbody.innerHTML = "";

    if (filtered.length === 0) {
        byId("farmTableWrapper").classList.add("hidden");
        byId("emptyMessage").classList.remove("hidden");
        byId("resultCount").textContent = "Showing 0 farms.";
        return;
    }

    byId("emptyMessage").classList.add("hidden");
    byId("farmTableWrapper").classList.remove("hidden");

    filtered.forEach(function (farm) {
        const active = farmIsActive(farm);
        const subscription = getSubscriptionInfo(farm);

        const statusHTML = active
            ? '<span class="status status-active">Active</span>'
            : '<span class="status status-inactive">Inactive</span>';

        const actionHTML = active
            ? `
                <button
                    type="button"
                    class="btn btn-danger"
                    data-farm-action="deactivate"
                    data-farm-id="${escapeHTML(farm.id)}">
                    Deactivate
                </button>
              `
            : `
                <button
                    type="button"
                    class="btn btn-primary"
                    data-farm-action="reactivate"
                    data-farm-id="${escapeHTML(farm.id)}">
                    Reactivate
                </button>
              `;

        const row = document.createElement("tr");

        row.innerHTML = `
            <td>
                <div class="farm-name">${escapeHTML(farm.farm_name)}</div>
                <div class="small-text">Farm ID: ${escapeHTML(farm.id)}</div>
            </td>
            <td>${escapeHTML(farm.owner_name || "Not provided")}</td>
            <td>
                <div>${escapeHTML(farm.phone || "No phone")}</div>
                <div class="small-text">${escapeHTML(farm.email || "No email")}</div>
            </td>
            <td>${statusHTML}</td>
            <td>
                <span class="status ${subscription.className}">
                    ${escapeHTML(subscription.label)}
                </span>
                <div class="small-text">
                    Start: ${escapeHTML(formatDate(farm.subscription_start))}
                </div>
            </td>
            <td>${escapeHTML(formatDate(farm.created_at))}</td>
            <td class="action-cell">${actionHTML}</td>
        `;

        tbody.appendChild(row);
    });

    byId("resultCount").textContent =
        "Showing " + filtered.length + " of " + farmsCache.length + " farms.";
}

// ------------------------------------------------------------
// DEACTIVATE / REACTIVATE
// ------------------------------------------------------------

async function changeFarmStatus(farmId, action) {
    if (farmActionInProgress) {
        return;
    }

    const farm = farmsCache.find(function (item) {
        return String(item.id) === String(farmId);
    });

    if (!farm) {
        showMessage("Farm record not found. Refresh and try again.", "error");
        return;
    }

    const isDeactivation = action === "deactivate";
    const newStatus = isDeactivation ? "Inactive" : "Active";
    const farmName = farm.farm_name || ("Farm " + farm.id);

    const confirmation = isDeactivation
        ? "Are you sure you want to DEACTIVATE " + farmName + "?\n\n" +
          "The farm record will be retained. This action should prevent " +
          "farm users from accessing protected farm features once the " +
          "application's farm-status checks are enforced."
        : "Are you sure you want to REACTIVATE " + farmName + "?\n\n" +
          "This changes the farm status to Active. It does not extend or " +
          "renew the subscription.";

    if (!window.confirm(confirmation)) {
        return;
    }

    farmActionInProgress = true;
    setActionButtonsDisabled(true);
    byId("refreshBtn").disabled = true;

    try {
        // Recheck that this browser still has a valid authenticated session.
        const { data: sessionData, error: sessionError } =
            await supabaseClient.auth.getSession();

        if (sessionError || !sessionData?.session?.user?.id) {
            throw new Error("Your session has expired. Please sign in again.");
        }

        // Recheck Super Admin profile before making a status change.
        const { data: profile, error: profileError } = await supabaseClient
            .from("users")
            .select("role, status, auth_user_id")
            .eq("auth_user_id", sessionData.session.user.id)
            .maybeSingle();

        if (
            profileError ||
            !profile ||
            normalise(profile.role) !== "super admin" ||
            normalise(profile.status) !== "active"
        ) {
            throw new Error(
                "Super Admin verification failed. No changes were made."
            );
        }

        const { data: assuranceData, error: assuranceError } =
            await supabaseClient.auth.mfa.getAuthenticatorAssuranceLevel();

        if (
            assuranceError ||
            assuranceData?.currentLevel !== "aal2"
        ) {
            throw new Error(
                "Verified MFA is required. Please sign in again."
            );
        }

        const { data: updatedFarm, error: updateError } = await supabaseClient
            .from("farms")
            .update({ status: newStatus })
            .eq("id", farm.id)
            .select("id, farm_name, status")
            .maybeSingle();

        if (updateError) {
            throw updateError;
        }

        if (!updatedFarm) {
            throw new Error(
                "No farm was updated. Check your farms RLS policies and permissions."
            );
        }

        showMessage(
            farmName + " has been " +
            (isDeactivation ? "deactivated." : "reactivated."),
            "success"
        );

        await loadFarms();

    } catch (error) {
        console.error("Farm status update error:", error);

        showMessage(
            "Could not change the farm status. " +
            (error.message || "Please try again."),
            "error"
        );

    } finally {
        farmActionInProgress = false;
        setActionButtonsDisabled(false);
        byId("refreshBtn").disabled = false;
    }
}

// ------------------------------------------------------------
// EVENTS
// ------------------------------------------------------------

function attachEvents() {
    byId("farmSearch").addEventListener("input", renderFarms);
    byId("statusFilter").addEventListener("change", renderFarms);
    byId("refreshBtn").addEventListener("click", loadFarms);
    byId("themeToggle").addEventListener("click", toggleTheme);

    byId("dashboardBtn").addEventListener("click", function () {
        window.location.href = "platform_dashboard.html";
    });

    byId("logoutBtn").addEventListener("click", async function () {
        const confirmed = window.confirm(
            "Are you sure you want to log out of MUNKA PIGGERY?"
        );

        if (confirmed) {
            await safeSignOut();
        }
    });

    byId("farmTableBody").addEventListener("click", async function (event) {
        const button = event.target.closest("[data-farm-action]");

        if (!button) return;

        const action = button.dataset.farmAction;
        const farmId = button.dataset.farmId;

        if (action !== "deactivate" && action !== "reactivate") {
            return;
        }

        await changeFarmStatus(farmId, action);
    });
}

// ------------------------------------------------------------
// INITIALIZATION
// ------------------------------------------------------------

async function initialiseFarmManagement() {
    byId("currentYear").textContent = new Date().getFullYear();
    applySavedTheme();
    attachEvents();

    try {
        const authorized = await verifySuperAdmin();

        if (!authorized) return;

        const name =
            farmPageUser?.full_name ||
            farmPageUser?.username ||
            "Super Admin";

        showMessage("Welcome, " + name + ". Farm management is ready.", "info");
        await loadFarms();

    } catch (error) {
        console.error("Farm management initialization error:", error);

        showMessage(
            error.message ||
            "Unable to initialize farm management.",
            "error"
        );

        byId("loadingMessage").classList.add("hidden");
    }
}

document.addEventListener("DOMContentLoaded", initialiseFarmManagement);

