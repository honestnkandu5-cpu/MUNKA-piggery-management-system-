(function () {
"use strict";

const form = document.getElementById("openingPopulationForm");
if (!form) return;

const $ = (id) => document.getElementById(id);

const farmNameElement = $("farmName");
const currentUserElement = $("currentUser");
const openingPopulationElement = $("openingPopulation");
const currentPopulationElement = $("currentPopulation");
const verificationStatusElement = $("verificationStatus");
const pageMessage = $("pageMessage");
const openingDateInput = $("openingDate");
const openingCountInput = $("openingCount");
const confirmCountInput = $("confirmCount");
const saveButton = $("saveButton");

let client = null;
let activeUser = null;
let farmId = null;
let verifiedOpening = false;

function showMessage(message, type = "") {
    pageMessage.textContent = message;
    pageMessage.className = "message" + (type ? " " + type : "");
}

function displayNumber(value) {
    if (value === null || value === undefined || value === "") {
        return "Not set";
    }

    const number = Number(value);

    return Number.isFinite(number)
        ? number.toLocaleString()
        : "Not available";
}

/*
 * Use the client created by the existing supabase.js.
 * Do not recreate the client or modify supabase.js.
 */
function getExistingClient() {
    if (
        typeof supabaseClient !== "undefined" &&
        supabaseClient &&
        typeof supabaseClient.auth?.getUser === "function"
    ) {
        return supabaseClient;
    }

    if (
        window.supabaseClient &&
        typeof window.supabaseClient.auth?.getUser === "function"
    ) {
        return window.supabaseClient;
    }

    if (
        window.sb &&
        typeof window.sb.auth?.getUser === "function"
    ) {
        return window.sb;
    }

    return null;
}

function isAllowedRole(role) {
    const normalized = String(role || "").trim().toLowerCase();

    return normalized === "owner/admin" ||
           normalized === "farm manager";
}

function setFormAvailability(enabled) {
    openingDateInput.disabled = !enabled;
    openingCountInput.disabled = !enabled;
    confirmCountInput.disabled = !enabled;
    saveButton.disabled = !enabled;
}

async function getAuthenticatedUser() {
    const { data, error } = await client.auth.getUser();

    if (error) throw error;

    if (!data || !data.user) {
        throw new Error("Please log in before opening this module.");
    }

    return data.user;
}

async function loadUserProfile(authUser) {
    const { data, error } = await client
        .from("users")
        .select("id, full_name, username, role, status, farm_id")
        .eq("auth_user_id", authUser.id)
        .maybeSingle();

    if (error) throw error;

    if (!data) {
        throw new Error("Your user profile could not be found.");
    }

    if (String(data.status || "").trim().toLowerCase() !== "active") {
        throw new Error("Your account is not active.");
    }

    if (!isAllowedRole(data.role)) {
        throw new Error(
            "Only an active Owner/Admin or Farm Manager can establish the opening population."
        );
    }

    if (data.farm_id === null || data.farm_id === undefined) {
        throw new Error("Your account is not linked to a farm.");
    }

    return data;
}

async function loadFarmName() {
    const { data, error } = await client
        .from("farms")
        .select("farm_name")
        .eq("id", farmId)
        .maybeSingle();

    if (error) throw error;

    if (!data) {
        throw new Error("Your registered farm could not be found.");
    }

    farmNameElement.textContent = data.farm_name || "Registered farm";
}

async function loadPopulationSummary() {
    const { data, error } = await client
        .from("farm_population_summary")
        .select(
            "farm_id, opening_date, opening_population, current_population"
        )
        .eq("farm_id", farmId)
        .maybeSingle();

    if (error) throw error;

    if (!data) {
        openingPopulationElement.textContent = "Not set";
        currentPopulationElement.textContent = "Not available";
        verificationStatusElement.textContent = "Not set";
        verifiedOpening = false;

        setFormAvailability(false);

        showMessage(
            "No population summary was found for this farm. Please check the database view.",
            "error"
        );

        return;
    }

    const openingCount = data.opening_population;

    openingPopulationElement.textContent = displayNumber(openingCount);

    currentPopulationElement.textContent =
        data.current_population === null
            ? "Not available"
            : displayNumber(data.current_population);

    verifiedOpening =
        openingCount !== null && openingCount !== undefined;

    verificationStatusElement.textContent =
        verifiedOpening ? "Opening recorded" : "Not verified";

    if (data.opening_date) {
        openingDateInput.value = data.opening_date;
    }

    if (verifiedOpening) {
        openingCountInput.value = openingCount;
        setFormAvailability(false);

        showMessage(
            "An opening population has already been recorded. The form is locked to prevent accidental changes.",
            "success"
        );
    } else {
        setFormAvailability(true);

        showMessage(
            "Enter the starting pig count and confirm the information before saving."
        );
    }
}

async function initialize() {
    setFormAvailability(false);

    try {
        client = getExistingClient();

        if (!client) {
            throw new Error(
                "The existing Supabase client could not be accessed. Confirm that supabase.js loads before opening_population.js."
            );
        }

        const authUser = await getAuthenticatedUser();

        activeUser = await loadUserProfile(authUser);
        farmId = activeUser.farm_id;

        currentUserElement.textContent =
            activeUser.full_name ||
            activeUser.username ||
            authUser.email ||
            "Authenticated user";

        await loadFarmName();
        await loadPopulationSummary();

    } catch (error) {
        console.error("Opening population initialization error:", error);

        showMessage(
            error.message ||
            "Unable to load opening population information.",
            "error"
        );

        setFormAvailability(false);
    }
}

form.addEventListener("submit", async function (event) {
    event.preventDefault();

    if (!client || !activeUser || farmId === null) {
        showMessage(
            "Your farm account has not been verified. Refresh the page or log in again.",
            "error"
        );
        return;
    }

    if (verifiedOpening) {
        showMessage(
            "An opening population has already been recorded. An authorised correction process is required to change it.",
            "error"
        );

        setFormAvailability(false);
        return;
    }

    const openingDate = openingDateInput.value;
    const rawCount = openingCountInput.value.trim();
    const openingCount = Number(rawCount);

    if (!openingDate) {
        showMessage("Please select the opening date.", "error");
        return;
    }

    if (openingDate > new Date().toLocaleDateString("en-CA")) {
        showMessage(
            "The opening date cannot be in the future.",
            "error"
        );
        return;
    }

    if (
        rawCount === "" ||
        !Number.isSafeInteger(openingCount) ||
        openingCount < 0
    ) {
        showMessage(
            "Enter a valid whole number of pigs, zero or greater.",
            "error"
        );
        return;
    }

    if (!confirmCountInput.checked) {
        showMessage(
            "Please confirm that the opening count is accurate.",
            "error"
        );
        return;
    }

    saveButton.disabled = true;
    saveButton.textContent = "Saving...";

    try {
        const { data, error } = await client.rpc(
            "set_farm_opening_population",
            {
                p_opening_date: openingDate,
                p_opening_population: openingCount
            }
        );

        if (error) throw error;

        if (!data || data.success !== true) {
            throw new Error(
                data && data.message
                    ? data.message
                    : "The database did not confirm that the opening population was saved."
            );
        }

        showMessage(
            data.message || "Opening population saved successfully.",
            "success"
        );

        confirmCountInput.checked = false;

        await loadPopulationSummary();

    } catch (error) {
        console.error("Save opening population error:", error);

        showMessage(
            error.message ||
            "Unable to save the opening population. Please try again.",
            "error"
        );
    } finally {
        saveButton.textContent = "Save Opening Population";

        if (!verifiedOpening) {
            saveButton.disabled = false;
        }
    }
});

initialize();

})();