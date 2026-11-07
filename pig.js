
/* =========================================================
   MUNKA PIGGERY TECHNOLOGY
   PIG REGISTRATION MODULE
   COMPLETE REPLACEMENT: pig.js
   ========================================================= */

"use strict";

let editID = null;
let editingGroupID = null;
let currentPigReport = null;
let pigEventsAttached = false;

const pigById = id => document.getElementById(id);

/* =========================================================
   USER, FARM AND SECURITY HELPERS
   ========================================================= */

function getLoggedUser() {
    try {
        return JSON.parse(localStorage.getItem("loggedInUser"));
    } catch (error) {
        console.error("Unable to read logged-in user:", error);
        return null;
    }
}

function getFarmID() {
    const user = getLoggedUser();

    return user && user.farm_id !== undefined &&
        user.farm_id !== null && user.farm_id !== ""
        ? user.farm_id
        : null;
}

function getPigClient() {
    if (typeof supabaseClient !== "undefined" && supabaseClient) {
        return supabaseClient;
    }

    if (window.supabaseClient) {
        return window.supabaseClient;
    }

    throw new Error(
        "The Supabase client is unavailable. Check supabase.js."
    );
}

function pigPermission(action) {
    const map = {
        view: "canView",
        add: "canAdd",
        edit: "canEdit",
        delete: "canDelete",
        report: "canReport"
    };

    const fn = window[map[action]];

    if (typeof fn !== "function") {
        console.error("Permission helper unavailable:", map[action]);
        return false;
    }

    try {
        const result = fn("Pig Registration");

        if (result && typeof result.then === "function") {
            console.error("Expected synchronous permission helper.");
            return false;
        }

        return result === true;
    } catch (error) {
        console.error("Permission check failed:", error);
        return false;
    }
}

function setPigStatus(id, message, isError = false) {
    const element = pigById(id);
    if (!element) return;

    element.textContent = message;
    element.style.color = isError ? "#b00020" : "#176b2c";
}

function showPigError(message, error) {
    console.error(message, error);

    const details = error?.message || String(error || "Unknown error");

    alert(message + "\n\nDetails: " + details);
}

function escapePigHTML(value) {
    const replacements = {
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;"
    };

    return String(value ?? "").replace(
        /[&<>"']/g,
        character => replacements[character]
    );
}

async function logPigActivity(user, action, details) {
    if (typeof window.saveActivity !== "function") return;

    try {
        await window.saveActivity(
            `${user?.full_name || "User"} (${user?.role || "Unknown role"})`,
            action,
            "Pig Registration",
            details
        );
    } catch (error) {
        console.error("Activity logging failed:", error);
    }
}

async function getRegisteredFarmName() {
    const farmID = getFarmID();

    if (farmID == null) {
        return "REGISTERED FARM";
    }

    try {
        const client = getPigClient();

        const { data, error } = await client
            .from("farms")
            .select("farm_name")
            .eq("id", farmID)
            .maybeSingle();

        if (error) throw error;

        return data?.farm_name || "REGISTERED FARM";
    } catch (error) {
        console.error("Unable to retrieve farm name:", error);
        return "REGISTERED FARM";
    }
}

function getPigSexFromCategory(category) {
    if (category === "Boar") return "Male";

    if ([
        "Sow",
        "Pregnant Sow",
        "Lactating Sow"
    ].includes(category)) {
        return "Female";
    }

    return "Unknown";
}

function updateRegistrationTypeUI() {
    const type = pigById("registrationType");
    const date = pigById("registrationDate");
    const wrapper = pigById("registrationDateGroup");

    if (!type || !date || !wrapper) return;

    const needsDate = ["purchase", "arrival"].includes(type.value);

    wrapper.style.display = needsDate ? "" : "none";
    date.required = needsDate;

    const label = wrapper.querySelector("label");

    if (label) {
        label.textContent = type.value === "purchase"
            ? "Purchase Date"
            : "Arrival Date";
    }
}

function validateFarmAndUser() {
    const user = getLoggedUser();
    const farmID = getFarmID();

    if (!user || farmID == null) {
        throw new Error(
            "Please log in again and check your registered farm account."
        );
    }

    return { user, farmID };
}

/* =========================================================
   INDIVIDUAL PIG REGISTRATION
   ========================================================= */

async function savePig(event) {
    event.preventDefault();

    const editing = editID !== null;

    if (!pigPermission(editing ? "edit" : "add")) {
        alert("You do not have permission to perform this action.");
        return;
    }

    let user;
    let farmID;

    try {
        ({ user, farmID } = validateFarmAndUser());
    } catch (error) {
        showPigError("Unable to save the pig.", error);
        return;
    }

    const value = id =>
        pigById(id)?.value?.trim() || "";

    const pigID = value("pigID");
    const breed = value("breed");
    const category = value("category");
    const farrowDate = value("farrowDate");
    const source = value("source");
    const weightText = value("weight");
    const health = value("healthStatus");
    const type = value("registrationType");
    const registrationDate = value("registrationDate");

    if (
        !pigID ||
        !breed ||
        !category ||
        !farrowDate ||
        !source ||
        !weightText ||
        !health
    ) {
        alert("Please complete all required fields.");
        return;
    }

    if (!editing && type === "purchase" && !registrationDate) {
        alert("Please enter the purchase date.");
        return;
    }

    if (!editing && type === "arrival") {
        alert(
            "Transfer/arrival tracking is not connected yet. " +
            "No pig record was saved."
        );
        return;
    }

    if (!editing && type === "birth") {
        alert(
            "Please record farm births through the Farrowing module. " +
            "No pig record was saved."
        );
        return;
    }

    const weight = Number(weightText);

    if (!Number.isFinite(weight) || weight < 0) {
        alert("Please select a valid pig weight.");
        return;
    }

    const record = {
        pig_id: pigID,
        breed,
        category,
        sex: getPigSexFromCategory(category),
        farrow_date: farrowDate,
        source,
        weight,
        health_status: health
    };

    const form = pigById("pigForm");
    const button = form?.querySelector('button[type="submit"]');

    if (!form) return;

    if (button) {
        button.disabled = true;
        button.textContent = editing ? "Updating..." : "Saving...";
    }

    setPigStatus("pigStatusMessage", "Saving pig record...");

    try {
        const client = getPigClient();

        if (editing) {
            record.updated_by = user.full_name || null;
            record.updated_at = new Date().toISOString();

            const { data, error } = await client
                .from("pigs")
                .update(record)
                .eq("id", editID)
                .eq("farm_id", farmID)
                .select("id");

            if (error) throw error;

            if (!data || data.length === 0) {
                throw new Error(
                    "No record was updated. Check the record and farm permissions."
                );
            }

            await logPigActivity(
                user,
                "Updated",
                `Updated pig ${pigID}`
            );

            clearForm();
            await loadPigs();

            setPigStatus(
                "pigStatusMessage",
                "Pig record updated successfully."
            );

            return;
        }

        record.farm_id = farmID;
        record.created_by = user.full_name || null;
        record.updated_by = null;
        record.updated_at = null;

        const { data: inserted, error } = await client
            .from("pigs")
            .insert([record])
            .select("id,pig_id")
            .single();

        if (error) throw error;

        if (type === "purchase") {
            const { error: movementError } = await client.rpc(
                "record_pig_purchase_movement",
                {
                    p_pig_record_id: inserted.id,
                    p_purchase_date: registrationDate,
                    p_notes: `Purchased from ${source}`
                }
            );

            if (movementError) {
                await loadPigs();

                setPigStatus(
                    "pigStatusMessage",
                    "Pig saved, but purchase tracking failed. Do not register it again.",
                    true
                );

                alert(
                    "The pig was saved successfully, but purchase tracking failed.\n\n" +
                    movementError.message +
                    "\n\nDo not register the pig again."
                );

                return;
            }
        }

        await logPigActivity(
            user,
            "Added",
            `Registered pig ${pigID}`
        );

        clearForm();
        await loadPigs();

        setPigStatus(
            "pigStatusMessage",
            "Pig record saved successfully."
        );

    } catch (error) {
        setPigStatus(
            "pigStatusMessage",
            error?.message || "Unable to save pig.",
            true
        );

        showPigError("Unable to save the pig record.", error);

    } finally {
        if (button) {
            button.disabled = false;
            button.textContent = editID === null
                ? "💾 Save Pig Record"
                : "💾 Update Pig Record";
        }
    }
}

/* =========================================================
   LOAD AND DISPLAY INDIVIDUAL PIGS
   ========================================================= */

async function loadPigs() {
    const table = pigById("pigTable");

    if (!table) return;

    if (!pigPermission("view")) {
        table.innerHTML =
            '<tr><td colspan="8">You do not have permission to view records.</td></tr>';
        return;
    }

    const farmID = getFarmID();

    if (farmID == null) {
        table.innerHTML =
            '<tr><td colspan="8">Please log in and check your farm account.</td></tr>';
        return;
    }

    table.innerHTML =
        '<tr><td colspan="8">Loading pig records...</td></tr>';

    try {
        const client = getPigClient();

        const { data, error } = await client
            .from("pigs")
            .select("*")
            .eq("farm_id", farmID)
            .order("id", { ascending: true });

        if (error) throw error;

        displayPigs(data || []);

    } catch (error) {
        console.error("Loading pigs failed:", error);

        table.innerHTML =
            '<tr><td colspan="8">Unable to load records. Check your connection, database table and access policies.</td></tr>';
    }
}

function displayPigs(records) {
    const table = pigById("pigTable");

    if (!table) return;

    table.innerHTML = "";

    if (!records.length) {
        table.innerHTML =
            '<tr><td colspan="8">No individual pigs registered yet.</td></tr>';
        return;
    }

    records.forEach(pig => {
        let actions = "";

        if (pigPermission("edit")) {
            actions +=
                `<button type="button" onclick="editPig(${Number(pig.id)})">Edit</button> `;
        }

        if (pigPermission("delete")) {
            actions +=
                `<button type="button" onclick="deletePig(${Number(pig.id)})">Delete</button>`;
        }

        if (!actions) actions = "No actions";

        const row = document.createElement("tr");

        row.innerHTML = `
            <td>${escapePigHTML(pig.pig_id)}</td>
            <td>${escapePigHTML(pig.breed)}</td>
            <td>${escapePigHTML(pig.category)}</td>
            <td>${escapePigHTML(pig.farrow_date)}</td>
            <td>${escapePigHTML(pig.source)}</td>
            <td>${pig.weight == null ? "" : escapePigHTML(pig.weight) + " Kg"}</td>
            <td>${escapePigHTML(pig.health_status)}</td>
            <td>${actions}</td>
        `;

        table.appendChild(row);
    });
}

/* =========================================================
   EDIT INDIVIDUAL PIG
   ========================================================= */

async function editPig(id) {
    if (!pigPermission("edit")) {
        alert("You do not have permission to edit records.");
        return;
    }

    const farmID = getFarmID();

    if (farmID == null) {
        alert("Please log in and check your farm account.");
        return;
    }

    try {
        const client = getPigClient();

        const { data, error } = await client
            .from("pigs")
            .select("*")
            .eq("id", id)
            .eq("farm_id", farmID)
            .single();

        if (error) throw error;

        const values = {
            pigID: data.pig_id,
            breed: data.breed,
            category: data.category,
            farrowDate: data.farrow_date,
            source: data.source,
            weight: data.weight,
            healthStatus: data.health_status
        };

        Object.entries(values).forEach(([fieldID, fieldValue]) => {
            const element = pigById(fieldID);

            if (element) {
                element.value = fieldValue ?? "";
            }
        });

        const type = pigById("registrationType");
        const registrationDate = pigById("registrationDate");

        if (type) type.value = "existing";
        if (registrationDate) registrationDate.value = "";

        updateRegistrationTypeUI();

        editID = id;

        const button = pigById("pigForm")
            ?.querySelector('button[type="submit"]');

        if (button) {
            button.textContent = "💾 Update Pig Record";
        }

        setPigStatus(
            "pigStatusMessage",
            `Editing pig ${data.pig_id}.`
        );

        window.scrollTo({ top: 0, behavior: "smooth" });

    } catch (error) {
        showPigError("Unable to open this pig record.", error);
    }
}

/* =========================================================
   DELETE INDIVIDUAL PIG
   ========================================================= */

async function deletePig(id) {
    if (!pigPermission("delete")) {
        alert("You do not have permission to delete records.");
        return;
    }

    let user;
    let farmID;

    try {
        ({ user, farmID } = validateFarmAndUser());
    } catch (error) {
        showPigError("Unable to delete pig.", error);
        return;
    }

    try {
        const client = getPigClient();

        const { data: pig, error: fetchError } = await client
            .from("pigs")
            .select("pig_id")
            .eq("id", id)
            .eq("farm_id", farmID)
            .single();

        if (fetchError) throw fetchError;

        if (!confirm(`Delete pig ${pig.pig_id || id}?`)) {
            return;
        }

        const { data, error } = await client
            .from("pigs")
            .delete()
            .eq("id", id)
            .eq("farm_id", farmID)
            .select("id");

        if (error) throw error;

        if (!data || data.length === 0) {
            throw new Error(
                "The pig was not deleted. Check your delete permission."
            );
        }

        await logPigActivity(
            user,
            "Deleted",
            `Deleted pig ${pig.pig_id || id}`
        );

        await loadPigs();

        setPigStatus(
            "pigStatusMessage",
            "Pig record deleted successfully."
        );

    } catch (error) {
        showPigError("Unable to delete the pig record.", error);
    }
}

/* =========================================================
   SEARCH INDIVIDUAL PIGS
   ========================================================= */

async function searchPig() {
    if (!pigPermission("view")) {
        alert("You do not have permission to view records.");
        return;
    }

    const farmID = getFarmID();

    if (farmID == null) {
        alert("Please log in and check your farm account.");
        return;
    }

    const keyword =
        pigById("searchPig")?.value?.trim() || "";

    try {
        const client = getPigClient();

        let query = client
            .from("pigs")
            .select("*")
            .eq("farm_id", farmID);

        if (keyword) {
            const safeKeyword = keyword.replace(
                /[%_,().]/g,
                " "
            );

            query = query.or(
                `pig_id.ilike.%${safeKeyword}%,breed.ilike.%${safeKeyword}%,category.ilike.%${safeKeyword}%`
            );
        }

        const { data, error } = await query.order(
            "id",
            { ascending: true }
        );

        if (error) throw error;

        displayPigs(data || []);

        setPigStatus(
            "pigStatusMessage",
            `${(data || []).length} matching record(s) found.`
        );

    } catch (error) {
        showPigError("Unable to search pig records.", error);
    }
}

/* =========================================================
   CLEAR INDIVIDUAL PIG FORM
   ========================================================= */

function clearForm() {
    pigById("pigForm")?.reset();

    editID = null;

    updateRegistrationTypeUI();

    const button = pigById("pigForm")
        ?.querySelector('button[type="submit"]');

    if (button) {
        button.textContent = "💾 Save Pig Record";
    }

    setPigStatus("pigStatusMessage", "");
}

/* =========================================================
   GROUP POPULATION DROPDOWNS
   ========================================================= */

function populateOneGroupDropdown(id) {
    const select = pigById(id);

    if (!select) return;

    const previousValue = select.value;

    select.innerHTML = "";

    for (let number = 0; number <= 10000; number++) {
        const option = document.createElement("option");

        option.value = String(number);
        option.textContent = String(number);

        select.appendChild(option);
    }

    if (
        previousValue !== "" &&
        Number.isInteger(Number(previousValue))
    ) {
        select.value = String(
            Math.max(0, Math.min(10000, Number(previousValue)))
        );
    } else {
        select.value = "0";
    }
}

function populateGroupQuantityDropdowns() {
    populateOneGroupDropdown("groupMaleQuantity");
    populateOneGroupDropdown("groupFemaleQuantity");

    updateGroupTotal();
}

function updateGroupTotal() {
    const maleSelect = pigById("groupMaleQuantity");
    const femaleSelect = pigById("groupFemaleQuantity");

    const male = Number(maleSelect?.value || 0);
    const female = Number(femaleSelect?.value || 0);

    const total = male + female;

    const quantity = pigById("groupQuantity");

    if (quantity) {
        quantity.value = total;
    }

    const totalQuantity = pigById("groupTotalQuantity");

    if (totalQuantity) {
        totalQuantity.value = total;
    }

    const maleDisplay = pigById("malePopulationDisplay");
    const femaleDisplay = pigById("femalePopulationDisplay");
    const totalDisplay = pigById("totalPopulationDisplay");

    if (maleDisplay) maleDisplay.textContent = male;
    if (femaleDisplay) femaleDisplay.textContent = female;
    if (totalDisplay) totalDisplay.textContent = total;
}

function normalizeGroupCategory(value) {
    const category = String(value || "")
        .trim()
        .toLowerCase();

    const categories = {
        piglet: "Piglet",
        piglets: "Piglet",
        weaner: "Weaner",
        weaners: "Weaner",
        grower: "Grower",
        growers: "Grower",
        sow: "Sow",
        sows: "Sow",
        boar: "Boar",
        boars: "Boar"
    };

    return categories[category] || null;
}

/* =========================================================
   GROUP POPULATION HELPERS
   ========================================================= */

function getLegacyGroupQuantities(group) {
    const total = Number(group?.quantity) || 0;
    const sex = String(group?.sex || "").toLowerCase();

    if (sex === "male") {
        return { male: total, female: 0 };
    }

    if (sex === "female") {
        return { male: 0, female: total };
    }

    return { male: 0, female: 0 };
}

function hasGroupPopulationCounts(group) {
    const male = Number(group?.male_quantity) || 0;
    const female = Number(group?.female_quantity) || 0;

    return male + female > 0;
}

function getGroupMaleQuantity(group) {
    if (hasGroupPopulationCounts(group)) {
        return Number(group.male_quantity) || 0;
    }

    return getLegacyGroupQuantities(group).male;
}

function getGroupFemaleQuantity(group) {
    if (hasGroupPopulationCounts(group)) {
        return Number(group.female_quantity) || 0;
    }

    return getLegacyGroupQuantities(group).female;
}

function getGroupTotal(group) {
    const male = Number(group?.male_quantity) || 0;
    const female = Number(group?.female_quantity) || 0;

    if (male + female > 0) {
        return male + female;
    }

    return Number(group?.quantity) || 0;
}

function getGroupSexLabel(male, female) {
    if (male > 0 && female > 0) return "Mixed";
    if (male > 0) return "Male";
    if (female > 0) return "Female";
    return "Unknown";
}

/* =========================================================
   SAVE / UPDATE PIG GROUP
   ========================================================= */

async function savePigGroup(event) {
    event.preventDefault();

    const editing = editingGroupID !== null;

    if (!pigPermission(editing ? "edit" : "add")) {
        alert("You do not have permission to save groups.");
        return;
    }

    let user;
    let farmID;

    try {
        ({ user, farmID } = validateFarmAndUser());
    } catch (error) {
        showPigError("Unable to save group.", error);
        return;
    }

    const value = id =>
        pigById(id)?.value?.trim() || "";

    const groupName = value("groupName");
    const category = normalizeGroupCategory(value("groupCategory"));

    const maleQuantity = Number(value("groupMaleQuantity"));
    const femaleQuantity = Number(value("groupFemaleQuantity"));

    const quantity = maleQuantity + femaleQuantity;

    const weightText = value("groupWeight");

    const averageWeight = weightText === ""
        ? null
        : Number(weightText);

    if (!groupName || !category) {
        alert(
            "Enter a group name and select one of the five pig categories."
        );
        return;
    }

    if (
        !Number.isInteger(maleQuantity) ||
        !Number.isInteger(femaleQuantity) ||
        maleQuantity < 0 ||
        femaleQuantity < 0 ||
        maleQuantity > 10000 ||
        femaleQuantity > 10000
    ) {
        alert(
            "Male and female quantities must be whole numbers from 0 to 10,000."
        );
        return;
    }

    if (quantity < 1) {
        alert("The group must contain at least one pig.");
        return;
    }

    if (
        averageWeight !== null &&
        (!Number.isFinite(averageWeight) || averageWeight < 0)
    ) {
        alert("Enter a valid average weight.");
        return;
    }

    updateGroupTotal();

    const record = {
        farm_id: farmID,
        group_name: groupName,
        category,
        quantity,
        male_quantity: maleQuantity,
        female_quantity: femaleQuantity,
        breed: value("groupBreed") || null,

        /* Retain the old sex column for compatibility. */
        sex: getGroupSexLabel(maleQuantity, femaleQuantity),

        farrow_date: value("groupFarrowDate") || null,
        source: value("groupSource") || null,
        average_weight: averageWeight,
        health_status: value("groupHealth") || "Healthy",
        pen_name: value("groupPen") || null,
        notes: value("groupNotes") || null,
        updated_by: user.full_name || null
    };

    const button = pigById("groupForm")
        ?.querySelector('button[type="submit"]');

    if (button) {
        button.disabled = true;
        button.textContent = editing ? "Updating..." : "Saving...";
    }

    setPigStatus("groupStatusMessage", "Saving group...");

    try {
        const client = getPigClient();

        if (editing) {
            const { data, error } = await client
                .from("pig_groups")
                .update(record)
                .eq("id", editingGroupID)
                .eq("farm_id", farmID)
                .select("id");

            if (error) throw error;

            if (!data || data.length === 0) {
                throw new Error(
                    "No group was updated. Check your permissions."
                );
            }
        } else {
            record.created_by = user.full_name || null;

            const { error } = await client
                .from("pig_groups")
                .insert([record]);

            if (error) throw error;
        }

        await logPigActivity(
            user,
            editing ? "Updated Group" : "Added Group",
            `${editing ? "Updated" : "Registered"} group ${groupName}: ` +
            `${maleQuantity} males, ${femaleQuantity} females, total ${quantity}`
        );

        clearGroupForm();

        await loadPigGroups();

        setPigStatus(
            "groupStatusMessage",
            editing
                ? "Group updated successfully."
                : "Group saved successfully."
        );

    } catch (error) {
        setPigStatus(
            "groupStatusMessage",
            error?.message || "Unable to save group.",
            true
        );

        showPigError("Unable to save the group.", error);

    } finally {
        if (button) {
            button.disabled = false;
            button.textContent = editingGroupID === null
                ? "💾 Save Group"
                : "💾 Update Group";
        }
    }
}

/* =========================================================
   LOAD AND DISPLAY GROUPS
   ========================================================= */

async function loadPigGroups() {
    const table = pigById("groupTable");

    if (!table) return;

    if (!pigPermission("view")) {
        table.innerHTML =
            '<tr><td colspan="9">You do not have permission to view groups.</td></tr>';
        return;
    }

    const farmID = getFarmID();

    if (farmID == null) {
        table.innerHTML =
            '<tr><td colspan="9">Please log in and check your farm account.</td></tr>';
        return;
    }

    table.innerHTML =
        '<tr><td colspan="9">Loading groups...</td></tr>';

    try {
        const client = getPigClient();

        const { data, error } = await client
            .from("pig_groups")
            .select("*")
            .eq("farm_id", farmID)
            .order("id", { ascending: true });

        if (error) throw error;

        displayPigGroups(data || []);

    } catch (error) {
        console.error("Loading pig groups failed:", error);

        table.innerHTML =
            '<tr><td colspan="9">Unable to load groups. Check the pig_groups table and its access policies.</td></tr>';
    }
}

function displayPigGroups(records) {
    const table = pigById("groupTable");

    if (!table) return;

    table.innerHTML = "";

    if (!records.length) {
        table.innerHTML =
            '<tr><td colspan="9">No pig groups registered yet.</td></tr>';
        return;
    }

    records.forEach(group => {
        let actions = "";

        if (pigPermission("edit")) {
            actions +=
                `<button type="button" onclick="editPigGroup(${Number(group.id)})">Edit</button> `;
        }

        if (pigPermission("delete")) {
            actions +=
                `<button type="button" onclick="deletePigGroup(${Number(group.id)})">Delete</button>`;
        }

        if (!actions) actions = "No actions";

        const row = document.createElement("tr");

        row.innerHTML = `
            <td>${escapePigHTML(group.group_name)}</td>
            <td>${escapePigHTML(normalizeGroupCategory(group.category) || group.category)}</td>
            <td>${escapePigHTML(getGroupTotal(group))}</td>
            <td>${escapePigHTML(getGroupMaleQuantity(group))}</td>
            <td>${escapePigHTML(getGroupFemaleQuantity(group))}</td>
            <td>${escapePigHTML(group.breed || "")}</td>
            <td>${group.average_weight == null ? "" : escapePigHTML(group.average_weight) + " Kg"}</td>
            <td>${escapePigHTML(group.pen_name || "")}</td>
            <td>${actions}</td>
        `;

        table.appendChild(row);
    });
}

/* =========================================================
   EDIT GROUP
   ========================================================= */

async function editPigGroup(id) {
    if (!pigPermission("edit")) {
        alert("You do not have permission to edit groups.");
        return;
    }

    const farmID = getFarmID();

    if (farmID == null) {
        alert("Please log in and check your farm account.");
        return;
    }

    try {
        const client = getPigClient();

        const { data, error } = await client
            .from("pig_groups")
            .select("*")
            .eq("id", id)
            .eq("farm_id", farmID)
            .single();

        if (error) throw error;

        const male = getGroupMaleQuantity(data);
        const female = getGroupFemaleQuantity(data);

        const values = {
            groupName: data.group_name,
            groupCategory: normalizeGroupCategory(data.category) || data.category,
            groupBreed: data.breed,
            groupMaleQuantity: male,
            groupFemaleQuantity: female,
            groupFarrowDate: data.farrow_date,
            groupSource: data.source,
            groupWeight: data.average_weight,
            groupHealth: data.health_status,
            groupPen: data.pen_name,
            groupNotes: data.notes
        };

        Object.entries(values).forEach(([fieldID, fieldValue]) => {
            const element = pigById(fieldID);

            if (element) {
                element.value = fieldValue ?? "";
            }
        });

        updateGroupTotal();

        editingGroupID = id;

        const button = pigById("groupForm")
            ?.querySelector('button[type="submit"]');

        if (button) {
            button.textContent = "💾 Update Group";
        }

        setPigStatus(
            "groupStatusMessage",
            `Editing group ${data.group_name}.`
        );

        window.scrollTo({ top: 0, behavior: "smooth" });

    } catch (error) {
        showPigError("Unable to open group.", error);
    }
}

/* =========================================================
   DELETE GROUP
   ========================================================= */

async function deletePigGroup(id) {
    if (!pigPermission("delete")) {
        alert("You do not have permission to delete groups.");
        return;
    }

    let user;
    let farmID;

    try {
        ({ user, farmID } = validateFarmAndUser());
    } catch (error) {
        showPigError("Unable to delete group.", error);
        return;
    }

    try {
        const client = getPigClient();

        const { data: group, error: fetchError } = await client
            .from("pig_groups")
            .select("group_name")
            .eq("id", id)
            .eq("farm_id", farmID)
            .single();

        if (fetchError) throw fetchError;

        if (!confirm(`Delete group ${group.group_name || id}?`)) {
            return;
        }

        const { data, error } = await client
            .from("pig_groups")
            .delete()
            .eq("id", id)
            .eq("farm_id", farmID)
            .select("id");

        if (error) throw error;

        if (!data || data.length === 0) {
            throw new Error(
                "The group was not deleted. Check your permissions."
            );
        }

        await logPigActivity(
            user,
            "Deleted Group",
            `Deleted group ${group.group_name || id}`
        );

        await loadPigGroups();

        setPigStatus(
            "groupStatusMessage",
            "Group deleted successfully."
        );

    } catch (error) {
        showPigError("Unable to delete group.", error);
    }
}

/* =========================================================
   CLEAR GROUP FORM
   ========================================================= */

function clearGroupForm() {
    pigById("groupForm")?.reset();

    editingGroupID = null;

    const male = pigById("groupMaleQuantity");
    const female = pigById("groupFemaleQuantity");

    if (male) male.value = "0";
    if (female) female.value = "0";

    updateGroupTotal();

    const button = pigById("groupForm")
        ?.querySelector('button[type="submit"]');

    if (button) {
        button.textContent = "💾 Save Group";
    }

    setPigStatus("groupStatusMessage", "");
}

/* =========================================================
   REPORT HELPERS
   ========================================================= */

function getOrCreateReportOutput() {
    let output = pigById("reportOutput");

    if (output) return output;

    const section = document.querySelector(".report-section");

    if (!section) return null;

    output = document.createElement("div");
    output.id = "reportOutput";
    output.className = "report-output";
    output.setAttribute("aria-live", "polite");

    section.appendChild(output);

    return output;
}

async function collectPigReport() {
    if (!pigPermission("report")) {
        throw new Error(
            "You do not have permission to generate reports."
        );
    }

    const farmID = getFarmID();

    if (farmID == null) {
        throw new Error(
            "Please log in and check your farm account."
        );
    }

    const client = getPigClient();

    const [
        { data: pigs, error: pigError },
        { data: groups, error: groupError }
    ] = await Promise.all([
        client.from("pigs").select("*").eq("farm_id", farmID),
        client.from("pig_groups").select("*").eq("farm_id", farmID)
    ]);

    if (pigError) throw pigError;
    if (groupError) throw groupError;

    return {
        farmName: await getRegisteredFarmName(),
        pigs: pigs || [],
        groups: groups || [],
        generatedAt: new Date().toLocaleString("en-ZM", {
            timeZone: "Africa/Lusaka"
        })
    };
}

/* =========================================================
   GENERATE REPORT
   ========================================================= */

async function generateReport() {
    const output = getOrCreateReportOutput();

    if (!output) {
        alert("The report display section could not be found.");
        return;
    }

    if (!pigPermission("report")) {
        alert("You do not have permission to generate reports.");
        return;
    }

    output.textContent = "Generating report...";

    try {
        currentPigReport = await collectPigReport();

        const report = currentPigReport;

        const groupQuantity = report.groups.reduce(
            (total, group) =>
                total + getGroupTotal(group),
            0
        );

        const groupMales = report.groups.reduce(
            (total, group) =>
                total + getGroupMaleQuantity(group),
            0
        );

        const groupFemales = report.groups.reduce(
            (total, group) =>
                total + getGroupFemaleQuantity(group),
            0
        );

        output.innerHTML = `
            <div class="generated-pig-report">
                <h2>MUNKA PIGGERY TECHNOLOGY</h2>
                <h3>Pig Registration Report</h3>

                <p><strong>Farm:</strong>
                    ${escapePigHTML(report.farmName)}</p>

                <p><strong>Generated:</strong>
                    ${escapePigHTML(report.generatedAt)}</p>

                <hr>

                <p><strong>Individual pig records:</strong>
                    ${report.pigs.length}</p>

                <p><strong>Registered pig groups:</strong>
                    ${report.groups.length}</p>

                <p><strong>Animals represented in groups:</strong>
                    ${groupQuantity}</p>

                <p><strong>Group males:</strong>
                    ${groupMales}</p>

                <p><strong>Group females:</strong>
                    ${groupFemales}</p>

                <h3>Individual Pigs</h3>

                <div class="table-wrapper">
                    <table>
                        <thead>
                            <tr>
                                <th>Pig ID</th>
                                <th>Breed</th>
                                <th>Category</th>
                                <th>Farrow Date</th>
                                <th>Weight</th>
                                <th>Health</th>
                            </tr>
                        </thead>

                        <tbody>
                            ${report.pigs.map(pig => `
                                <tr>
                                    <td>${escapePigHTML(pig.pig_id)}</td>
                                    <td>${escapePigHTML(pig.breed)}</td>
                                    <td>${escapePigHTML(pig.category)}</td>
                                    <td>${escapePigHTML(pig.farrow_date)}</td>
                                    <td>${pig.weight == null ? "" : escapePigHTML(pig.weight) + " Kg"}</td>
                                    <td>${escapePigHTML(pig.health_status)}</td>
                                </tr>
                            `).join("")}
                        </tbody>
                    </table>
                </div>

                <h3>Registered Pig Groups</h3>

                <div class="table-wrapper">
                    <table>
                        <thead>
                            <tr>
                                <th>Group</th>
                                <th>Category</th>
                                <th>Total Quantity</th>
                                <th>Males</th>
                                <th>Females</th>
                                <th>Breed</th>
                                <th>Average Weight</th>
                                <th>Pen</th>
                            </tr>
                        </thead>

                        <tbody>
                            ${report.groups.map(group => `
                                <tr>
                                    <td>${escapePigHTML(group.group_name)}</td>
                                    <td>${escapePigHTML(normalizeGroupCategory(group.category) || group.category)}</td>
                                    <td>${escapePigHTML(getGroupTotal(group))}</td>
                                    <td>${escapePigHTML(getGroupMaleQuantity(group))}</td>
                                    <td>${escapePigHTML(getGroupFemaleQuantity(group))}</td>
                                    <td>${escapePigHTML(group.breed || "")}</td>
                                    <td>${group.average_weight == null ? "" : escapePigHTML(group.average_weight) + " Kg"}</td>
                                    <td>${escapePigHTML(group.pen_name || "")}</td>
                                </tr>
                            `).join("")}
                        </tbody>
                    </table>
                </div>
            </div>
        `;

        output.scrollIntoView({
            behavior: "smooth",
            block: "start"
        });

    } catch (error) {
        currentPigReport = null;

        output.textContent =
            error?.message || "Unable to generate report.";

        showPigError(
            "Unable to generate the registration report.",
            error
        );
    }
}

/* =========================================================
   PRINT REPORT
   ========================================================= */

async function printReport() {
    if (!pigPermission("report")) {
        alert("You do not have permission to print reports.");
        return;
    }

    try {
        if (!currentPigReport) {
            await generateReport();

            if (!currentPigReport) return;
        }

        const output = getOrCreateReportOutput();

        if (!output || !output.innerHTML.trim()) {
            alert("Generate the report first, then print it.");
            return;
        }

        window.print();

    } catch (error) {
        showPigError(
            "Unable to prepare the report for printing.",
            error
        );
    }
}

/* =========================================================
   DOWNLOAD PDF
   ========================================================= */

async function downloadPDF() {
    if (!pigPermission("report")) {
        alert("You do not have permission to download reports.");
        return;
    }

    try {
        if (!currentPigReport) {
            await generateReport();

            if (!currentPigReport) return;
        }

        if (
            !window.jspdf ||
            typeof window.jspdf.jsPDF !== "function"
        ) {
            throw new Error(
                "The PDF library did not load. Check your internet connection."
            );
        }

        const report = currentPigReport;

        const doc = new window.jspdf.jsPDF({
            orientation: "landscape",
            unit: "mm",
            format: "a4"
        });

        doc.setFontSize(16);
        doc.text("MUNKA PIGGERY TECHNOLOGY", 14, 15);

        doc.setFontSize(12);
        doc.text("Pig Registration Report", 14, 23);

        doc.setFontSize(10);
        doc.text(`Farm: ${report.farmName}`, 14, 30);
        doc.text(`Generated: ${report.generatedAt}`, 14, 36);
        doc.text(
            `Individual pig records: ${report.pigs.length}`,
            14,
            42
        );
        doc.text(
            `Registered pig groups: ${report.groups.length}`,
            14,
            48
        );

        const totalGroups = report.groups.reduce(
            (sum, group) => sum + getGroupTotal(group),
            0
        );

        const totalMales = report.groups.reduce(
            (sum, group) => sum + getGroupMaleQuantity(group),
            0
        );

        const totalFemales = report.groups.reduce(
            (sum, group) => sum + getGroupFemaleQuantity(group),
            0
        );

        doc.text(`Animals in groups: ${totalGroups}`, 14, 54);
        doc.text(`Group males: ${totalMales}`, 14, 60);
        doc.text(`Group females: ${totalFemales}`, 14, 66);

        let nextY = 72;

        if (typeof doc.autoTable === "function") {
            doc.autoTable({
                startY: nextY,
                head: [[
                    "Pig ID",
                    "Breed",
                    "Category",
                    "Farrow Date",
                    "Source",
                    "Weight (Kg)",
                    "Health"
                ]],
                body: report.pigs.map(pig => [
                    pig.pig_id || "",
                    pig.breed || "",
                    pig.category || "",
                    pig.farrow_date || "",
                    pig.source || "",
                    pig.weight == null ? "" : String(pig.weight),
                    pig.health_status || ""
                ]),
                styles: { fontSize: 8 }
            });

            nextY = (doc.lastAutoTable?.finalY || nextY) + 8;

            if (nextY > 170) {
                doc.addPage();
                nextY = 15;
            }

            doc.autoTable({
                startY: nextY,
                head: [[
                    "Group",
                    "Category",
                    "Total",
                    "Males",
                    "Females",
                    "Breed",
                    "Average Weight (Kg)",
                    "Pen"
                ]],
                body: report.groups.map(group => [
                    group.group_name || "",
                    normalizeGroupCategory(group.category) || group.category || "",
                    String(getGroupTotal(group)),
                    String(getGroupMaleQuantity(group)),
                    String(getGroupFemaleQuantity(group)),
                    group.breed || "",
                    group.average_weight == null
                        ? ""
                        : String(group.average_weight),
                    group.pen_name || ""
                ]),
                styles: { fontSize: 8 }
            });

        } else {
            doc.text(
                "PDF table extension unavailable; summary only.",
                14,
                nextY + 5
            );
        }

        doc.save("munka-piggery-registration-report.pdf");

    } catch (error) {
        showPigError(
            "Unable to download the PDF report.",
            error
        );
    }
}

/* =========================================================
   INITIALISATION AND HTML BUTTON FUNCTIONS
   ========================================================= */

function attachPigEvents() {
    if (pigEventsAttached) return;

    const form = pigById("pigForm");
    const groupForm = pigById("groupForm");
    const registrationType = pigById("registrationType");
    const searchInput = pigById("searchPig");

    if (form) {
        form.addEventListener("submit", savePig);
    }

    if (groupForm) {
        groupForm.addEventListener("submit", savePigGroup);
    }

    if (registrationType) {
        registrationType.addEventListener(
            "change",
            updateRegistrationTypeUI
        );
    }

    if (searchInput) {
        searchInput.addEventListener("keydown", event => {
            if (event.key === "Enter") {
                event.preventDefault();
                searchPig();
            }
        });
    }

    populateGroupQuantityDropdowns();

    const maleSelect = pigById("groupMaleQuantity");
    const femaleSelect = pigById("groupFemaleQuantity");

    if (maleSelect) {
        maleSelect.addEventListener("change", updateGroupTotal);
    }

    if (femaleSelect) {
        femaleSelect.addEventListener("change", updateGroupTotal);
    }

    pigEventsAttached = true;
}

async function initialisePigRegistration() {
    attachPigEvents();

    updateRegistrationTypeUI();

    try {
        const farmName = await getRegisteredFarmName();

        document.querySelectorAll("[data-farm-name]").forEach(element => {
            element.textContent = farmName;
        });

        await Promise.all([
            loadPigs(),
            loadPigGroups()
        ]);

    } catch (error) {
        console.error(
            "Pig registration initialisation failed:",
            error
        );
    }
}

/* =========================================================
   MAKE FUNCTIONS AVAILABLE TO HTML
   ========================================================= */

window.clearForm = clearForm;
window.clearGroupForm = clearGroupForm;
window.searchPig = searchPig;
window.editPig = editPig;
window.deletePig = deletePig;
window.editPigGroup = editPigGroup;
window.deletePigGroup = deletePigGroup;
window.loadPigs = loadPigs;
window.loadPigGroups = loadPigGroups;
window.generateReport = generateReport;
window.printReport = printReport;
window.downloadPDF = downloadPDF;
window.updateRegistrationTypeUI = updateRegistrationTypeUI;
window.updateGroupTotal = updateGroupTotal;

/* =========================================================
   START MODULE
   ========================================================= */

if (document.readyState === "loading") {
    document.addEventListener(
        "DOMContentLoaded",
        initialisePigRegistration,
        { once: true }
    );
} else {
    initialisePigRegistration();
}
