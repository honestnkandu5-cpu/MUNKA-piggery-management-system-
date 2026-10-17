// ==========================================================
// MUNKA PIGGERY TECHNOLOGY
// PIG REGISTRATION MODULE
// INDIVIDUAL PIGS + PIGLET/WEANER GROUPS
// MULTI-FARM + PERMISSION-CONTROLLED
// ==========================================================

let editID = null;
let editingGroupID = null;

// ==========================================================
// USER AND FARM HELPERS
// ==========================================================

function getLoggedUser() {
try {
const user = JSON.parse(localStorage.getItem("loggedInUser"));

    if (!user) {
        alert("No logged-in user found. Please log in again.");
        return null;
    }

    return user;
} catch (error) {
    console.error("GET USER ERROR:", error);
    alert("Unable to read login details. Please log in again.");
    return null;
}

}

function getFarmID() {
const user = getLoggedUser();

if (!user) return null;

if (user.farm_id === null ||
    user.farm_id === undefined ||
    user.farm_id === "") {
    alert("Your account is not connected to a farm.");
    return null;
}

return user.farm_id;

}

async function getRegisteredFarmName() {
const farmID = getFarmID();

if (farmID === null || farmID === undefined) {
    return "REGISTERED FARM";
}

try {
    const { data, error } = await supabaseClient
        .from("farms")
        .select("farm_name")
        .eq("id", farmID)
        .maybeSingle();

    if (error) throw error;

    return data?.farm_name || "REGISTERED FARM";
} catch (error) {
    console.error("GET FARM NAME ERROR:", error);
    return "REGISTERED FARM";
}

}

function escapePigHTML(value) {
return String(value ?? "").replace(/[&<>"']/g, character => ({
"&": "&",
"<": "<",
">": ">",
'"': """,
"'": "'"
})[character]);
}

function hasPigPermission(permission) {
const permissionFunctions = {
view: "canView",
add: "canAdd",
edit: "canEdit",
delete: "canDelete",
report: "canReport"
};

const functionName = permissionFunctions[permission];

return Boolean(
    functionName &&
    typeof window[functionName] === "function" &&
    window[functionName]("Pig Registration")
);

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

function setPigStatus(elementID, message, isError = false) {
const element = document.getElementById(elementID);

if (!element) return;

element.textContent = message;
element.style.color = isError ? "#b00020" : "#176b2c";

}

async function logPigActivity(user, action, details) {
if (typeof saveActivity !== "function") return;

try {
    await saveActivity(
        `${user.full_name || "User"} (${user.role || "Unknown role"})`,
        action,
        "Pig Registration",
        details
    );
} catch (error) {
    console.error("ACTIVITY LOG ERROR:", error);
}

}

// ==========================================================
// REGISTRATION TYPE
// ==========================================================

function updateRegistrationTypeUI() {
const typeInput = document.getElementById("registrationType");
const dateInput = document.getElementById("registrationDate");
const dateGroup = document.getElementById("registrationDateGroup");

if (!typeInput || !dateInput || !dateGroup) return;

const type = typeInput.value;
const needsDate = ["purchase", "arrival"].includes(type);

dateInput.required = needsDate;
dateGroup.style.display = needsDate ? "" : "none";

const label = dateGroup.querySelector("label");

if (label) {
    label.textContent = type === "purchase"
        ? "Purchase Date"
        : "Arrival Date";
}

}

const registrationTypeInput =
document.getElementById("registrationType");

if (registrationTypeInput) {
registrationTypeInput.addEventListener(
"change",
updateRegistrationTypeUI
);

updateRegistrationTypeUI();

}

// ==========================================================
// SAVE / UPDATE INDIVIDUAL PIG
// ==========================================================

const pigForm = document.getElementById("pigForm");

if (pigForm) {
pigForm.addEventListener("submit", async event => {
event.preventDefault();

    const isEditing = editID !== null;

    if (!hasPigPermission(isEditing ? "edit" : "add")) {
        alert("Access denied. You do not have permission for this action.");
        return;
    }

    const user = getLoggedUser();
    if (!user) return;

    const farmID = getFarmID();
    if (farmID === null || farmID === undefined) return;

    const value = id =>
        document.getElementById(id)?.value?.trim() ?? "";

    const pigID = value("pigID");
    const breed = value("breed");
    const category = value("category");
    const farrowDate = value("farrowDate");
    const source = value("source");
    const weightValue = value("weight");
    const healthStatus = value("healthStatus");
    const registrationType = value("registrationType");
    const registrationDate = value("registrationDate");

    if (!pigID || !breed || !category || !farrowDate ||
        !source || !weightValue || !healthStatus) {
        alert("Please complete all required pig fields.");
        return;
    }

    if (!isEditing && registrationType === "purchase" &&
        !registrationDate) {
        alert("Please enter the purchase date.");
        return;
    }

    if (!isEditing && registrationType === "arrival") {
        alert(
            "Transfer/arrival movements are not yet connected. " +
            "The pig has not been saved. Please wait until arrival " +
            "tracking is implemented."
        );
        return;
    }

    if (!isEditing && registrationType === "birth") {
        alert(
            "Record farm births through the Farrowing module. " +
            "This prevents duplicate population counting."
        );
        return;
    }

    const weight = Number(weightValue);

    if (!Number.isFinite(weight) || weight < 0) {
        alert("Enter a valid non-negative weight.");
        return;
    }

    const pig = {
        pig_id: pigID,
        breed,
        category,
        sex: getPigSexFromCategory(category),
        farrow_date: farrowDate || null,
        source: source || null,
        weight,
        health_status: healthStatus
    };

    const button = pigForm.querySelector('button[type="submit"]');

    if (button) {
        button.disabled = true;
        button.textContent = isEditing ? "Updating..." : "Saving...";
    }

    try {
        // ----------------------------------------------
        // UPDATE EXISTING PIG
        // ----------------------------------------------

        if (isEditing) {
            pig.updated_by = user.full_name;
            pig.updated_at = new Date().toISOString();

            const { error } = await supabaseClient
                .from("pigs")
                .update(pig)
                .eq("id", editID)
                .eq("farm_id", farmID);

            if (error) throw error;

            await logPigActivity(
                user,
                "Updated",
                `Updated Pig ID: ${pigID}; Category: ${category}`
            );

            alert("Pig record updated successfully.");

            clearForm();
            await loadPigs();
            return;
        }

        // ----------------------------------------------
        // INSERT NEW PIG
        // ----------------------------------------------

        pig.created_by = user.full_name;
        pig.updated_by = null;
        pig.updated_at = null;
        pig.farm_id = farmID;

        const { data: insertedPig, error: insertError } =
            await supabaseClient
                .from("pigs")
                .insert([pig])
                .select("id,pig_id")
                .single();

        if (insertError) throw insertError;

        // ----------------------------------------------
        // RECORD PURCHASE MOVEMENT
        // ----------------------------------------------

        if (registrationType === "purchase") {
            const { data: movement, error: movementError } =
                await supabaseClient.rpc(
                    "record_pig_purchase_movement",
                    {
                        p_pig_record_id: insertedPig.id,
                        p_purchase_date: registrationDate,
                        p_notes: `Purchased from ${source}`
                    }
                );

            if (movementError) {
                console.error(
                    "PURCHASE MOVEMENT FAILED:",
                    movementError
                );

                setPigStatus(
                    "pigStatusMessage",
                    "WARNING: The pig was saved, but the purchase " +
                    "movement failed. Do not register it again.",
                    true
                );

                await logPigActivity(
                    user,
                    "Warning",
                    `Pig ${pigID} saved but purchase movement failed. Record ID: ${insertedPig.id}`
                );

                alert(
                    "The pig record was saved, but its purchase " +
                    "movement was not recorded.\n\n" +
                    "Pig ID: " + insertedPig.pig_id + "\n" +
                    "Database ID: " + insertedPig.id + "\n\n" +
                    "Do not register this pig again. Please report " +
                    "this error so the population can be reconciled.\n\n" +
                    movementError.message
                );

                await loadPigs();
                return;
            }

            console.info("PURCHASE MOVEMENT:", movement);
        }

        await logPigActivity(
            user,
            "Added",
            `Registered Pig ID: ${pigID}; Category: ${category}; Type: ${registrationType}`
        );

        setPigStatus(
            "pigStatusMessage",
            registrationType === "purchase"
                ? "Pig and purchase movement recorded successfully."
                : "Pig record saved. Existing stock does not change the opening population."
        );

        alert(
            registrationType === "purchase"
                ? "Pig record and purchase movement recorded successfully."
                : "Pig record saved successfully."
        );

        clearForm();
        await loadPigs();

    } catch (error) {
        console.error("SAVE PIG ERROR:", error);

        setPigStatus(
            "pigStatusMessage",
            error.message || "Unable to save the pig record.",
            true
        );

        alert(
            "Unable to save pig record.\n\n" +
            (error.message || "Unexpected error.")
        );

    } finally {
        if (button) {
            button.disabled = false;
            button.textContent = editID === null
                ? "💾 Save Pig Record"
                : "💾 Update Pig Record";
        }
    }
});

}

// ==========================================================
// LOAD INDIVIDUAL PIGS
// ==========================================================

async function loadPigs() {
const table = document.getElementById("pigTable");
if (!table) return;

if (!hasPigPermission("view")) {
    table.innerHTML =
        '<tr><td colspan="8">You do not have permission to view pig records.</td></tr>';
    return;
}

const farmID = getFarmID();
if (farmID === null || farmID === undefined) return;

try {
    const { data, error } = await supabaseClient
        .from("pigs")
        .select("*")
        .eq("farm_id", farmID)
        .order("id", { ascending: true });

    if (error) throw error;

    displayPigs(data || []);

} catch (error) {
    console.error("LOAD PIGS ERROR:", error);

    table.innerHTML =
        '<tr><td colspan="8">Unable to load pig records.</td></tr>';
}

}

function displayPigs(records) {
const table = document.getElementById("pigTable");
if (!table) return;

table.innerHTML = "";

if (!records.length) {
    table.innerHTML =
        '<tr><td colspan="8">No pig records found.</td></tr>';
    return;
}

records.forEach(pig => {
    let actions = "";

    if (hasPigPermission("edit")) {
        actions +=
            `<button type="button" onclick="editPig(${Number(pig.id)})">✏️ Edit</button>`;
    }

    if (hasPigPermission("delete")) {
        actions +=
            `<button type="button" onclick="deletePig(${Number(pig.id)})">🗑️ Delete</button>`;
    }

    if (!actions) actions = "No actions";

    const row = document.createElement("tr");

    row.innerHTML = `
        <td>${escapePigHTML(pig.pig_id)}</td>
        <td>${escapePigHTML(pig.breed)}</td>
        <td>${escapePigHTML(pig.category || "Not assigned")}</td>
        <td>${escapePigHTML(pig.farrow_date)}</td>
        <td>${escapePigHTML(pig.source)}</td>
        <td>${pig.weight == null ? "" : escapePigHTML(pig.weight) + " Kg"}</td>
        <td>${escapePigHTML(pig.health_status)}</td>
        <td>${actions}</td>
    `;

    table.appendChild(row);
});

}

// ==========================================================
// EDIT INDIVIDUAL PIG
// ==========================================================

async function editPig(id) {
if (!hasPigPermission("edit")) {
alert("You do not have permission to edit pig records.");
return;
}

const farmID = getFarmID();
if (farmID === null || farmID === undefined) return;

try {
    const { data, error } = await supabaseClient
        .from("pigs")
        .select("*")
        .eq("id", id)
        .eq("farm_id", farmID)
        .single();

    if (error) throw error;

    document.getElementById("pigID").value = data.pig_id || "";
    document.getElementById("breed").value = data.breed || "";
    document.getElementById("category").value = data.category || "";
    document.getElementById("farrowDate").value = data.farrow_date || "";
    document.getElementById("source").value = data.source || "";
    document.getElementById("weight").value =
        data.weight == null ? "" : String(data.weight);
    document.getElementById("healthStatus").value =
        data.health_status || "";

    document.getElementById("registrationType").value = "existing";
    document.getElementById("registrationDate").value = "";

    updateRegistrationTypeUI();

    editID = id;

    const button = document.querySelector('#pigForm button[type="submit"]');
    if (button) button.textContent = "💾 Update Pig Record";

    window.scrollTo({ top: 0, behavior: "smooth" });

} catch (error) {
    console.error("EDIT PIG ERROR:", error);
    alert("Unable to open pig record.\n\n" + error.message);
}

}

// ==========================================================
// DELETE INDIVIDUAL PIG
// ==========================================================

async function deletePig(id) {
if (!hasPigPermission("delete")) {
alert("You do not have permission to delete pig records.");
return;
}

const farmID = getFarmID();
const user = getLoggedUser();

if (farmID === null || farmID === undefined || !user) return;

try {
    const { data: pig, error: fetchError } = await supabaseClient
        .from("pigs")
        .select("pig_id")
        .eq("id", id)
        .eq("farm_id", farmID)
        .single();

    if (fetchError) throw fetchError;

    if (!confirm(`Delete Pig ID: ${pig.pig_id || id}?`)) return;

    const { error } = await supabaseClient
        .from("pigs")
        .delete()
        .eq("id", id)
        .eq("farm_id", farmID);

    if (error) throw error;

    await logPigActivity(
        user,
        "Deleted",
        `Deleted Pig ID: ${pig.pig_id || id}`
    );

    alert("Pig record deleted successfully.");
    await loadPigs();

} catch (error) {
    console.error("DELETE PIG ERROR:", error);
    alert("Unable to delete pig record.\n\n" + error.message);
}

}

// ==========================================================
// SEARCH INDIVIDUAL PIGS
// ==========================================================

async function searchPig() {
if (!hasPigPermission("view")) {
alert("You do not have permission to view pig records.");
return;
}

const farmID = getFarmID();
if (farmID === null || farmID === undefined) return;

const keyword =
    document.getElementById("searchPig")?.value?.trim() || "";

try {
    let query = supabaseClient
        .from("pigs")
        .select("*")
        .eq("farm_id", farmID);

    if (keyword) {
        const safeKeyword = keyword.replace(/[%_,().]/g, " ");

        query = query.or(
            `pig_id.ilike.%${safeKeyword}%,breed.ilike.%${safeKeyword}%,category.ilike.%${safeKeyword}%`
        );
    }

    const { data, error } = await query.order("id", {
        ascending: true
    });

    if (error) throw error;

    displayPigs(data || []);

} catch (error) {
    console.error("SEARCH PIG ERROR:", error);
    alert("Unable to search pig records.\n\n" + error.message);
}

}

// ==========================================================
// CLEAR INDIVIDUAL FORM
// ==========================================================

function clearForm() {
document.getElementById("pigForm")?.reset();

editID = null;

const button = document.querySelector('#pigForm button[type="submit"]');
if (button) button.textContent = "💾 Save Pig Record";

const date = document.getElementById("registrationDate");
if (date) date.value = "";

updateRegistrationTypeUI();
setPigStatus("pigStatusMessage", "");

}

// ==========================================================
// REGISTER PIGLET / WEANER GROUP
// Uses existing public.pig_groups table.
// ==========================================================

const groupForm = document.getElementById("groupForm");

if (groupForm) {
groupForm.addEventListener("submit", async event => {
event.preventDefault();

    const isEditing = editingGroupID !== null;

    if (!hasPigPermission(isEditing ? "edit" : "add")) {
        alert("You do not have permission to save pig groups.");
        return;
    }

    const user = getLoggedUser();
    const farmID = getFarmID();

    if (!user || farmID === null || farmID === undefined) return;

    const value = id =>
        document.getElementById(id)?.value?.trim() ?? "";

    const groupName = value("groupName");
    const category = value("groupCategory");
    const quantity = Number(value("groupQuantity"));
    const averageWeightValue = value("groupWeight");

    const averageWeight = averageWeightValue === ""
        ? null
        : Number(averageWeightValue);

    if (!groupName ||
        !["piglet", "weaner"].includes(category)) {
        alert("Enter a group name and select Piglets or Weaners.");
        return;
    }

    if (!Number.isInteger(quantity) || quantity < 1) {
        alert("Quantity must be a whole number greater than zero.");
        return;
    }

    if (averageWeight !== null &&
        (!Number.isFinite(averageWeight) || averageWeight < 0)) {
        alert("Average weight must be a valid non-negative number.");
        return;
    }

    const group = {
        farm_id: farmID,
        group_name: groupName,
        category,
        quantity,
        breed: value("groupBreed") || null,
        sex: value("groupSex") || "Mixed",
        farrow_date: value("groupFarrowDate") || null,
        source: value("groupSource") || null,
        average_weight: averageWeight,
        health_status: value("groupHealth") || "Healthy",
        pen_name: value("groupPen") || null,
        notes: value("groupNotes") || null,
        updated_by: user.full_name || null
    };

    const button = groupForm.querySelector('button[type="submit"]');

    if (button) {
        button.disabled = true;
        button.textContent = isEditing ? "Updating..." : "Saving...";
    }

    try {
        let result;

        if (isEditing) {
            result = await supabaseClient
                .from("pig_groups")
                .update(group)
                .eq("id", editingGroupID)
                .eq("farm_id", farmID);
        } else {
            group.created_by = user.full_name || null;

            result = await supabaseClient
                .from("pig_groups")
                .insert([group]);
        }

        if (result.error) throw result.error;

        await logPigActivity(
            user,
            isEditing ? "Updated" : "Added",
            `${isEditing ? "Updated" : "Registered"} group ${groupName}; category ${category}; quantity ${quantity}`
        );

        alert(
            `Group saved successfully.\n\n` +
            `Group: ${groupName}\n` +
            `Category: ${category}\n` +
            `Number of pigs: ${quantity}`
        );

        clearGroupForm();
        await loadPigGroups();

    } catch (error) {
        console.error("SAVE GROUP ERROR:", error);

        setPigStatus(
            "groupStatusMessage",
            error.message || "Unable to save group.",
            true
        );

        alert("Unable to save group.\n\n" + error.message);

    } finally {
        if (button) {
            button.disabled = false;
            button.textContent = editingGroupID === null
                ? "💾 Save Group"
                : "💾 Update Group";
        }
    }
});

}

// ==========================================================
// LOAD / DISPLAY PIG GROUPS
// ==========================================================

async function loadPigGroups() {
const table = document.getElementById("groupTable");
if (!table) return;

if (!hasPigPermission("view")) {
    table.innerHTML =
        '<tr><td colspan="8">You do not have permission to view groups.</td></tr>';
    return;
}

const farmID = getFarmID();
if (farmID === null || farmID === undefined) return;

try {
    const { data, error } = await supabaseClient
        .from("pig_groups")
        .select("*")
        .eq("farm_id", farmID)
        .order("id", { ascending: true });

    if (error) throw error;

    displayPigGroups(data || []);

} catch (error) {
    console.error("LOAD GROUPS ERROR:", error);

    table.innerHTML =
        '<tr><td colspan="8">Unable to load groups. Check the table and permissions.</td></tr>';
}

}

function displayPigGroups(groups) {
const table = document.getElementById("groupTable");
if (!table) return;

table.innerHTML = "";

if (!groups.length) {
    table.innerHTML =
        '<tr><td colspan="8">No piglet or weaner groups registered.</td></tr>';
    return;
}

groups.forEach(group => {
    let actions = "";

    if (hasPigPermission("edit")) {
        actions +=
            `<button type="button" onclick="editPigGroup(${Number(group.id)})">✏️ Edit</button>`;
    }

    if (hasPigPermission("delete")) {
        actions +=
            `<button type="button" onclick="deletePigGroup(${Number(group.id)})">🗑️ Delete</button>`;
    }

    if (!actions) actions = "No actions";

    const row = document.createElement("tr");

    row.innerHTML = `
        <td>${escapePigHTML(group.group_name)}</td>
        <td>${escapePigHTML(group.category)}</td>
        <td>${escapePigHTML(group.quantity)}</td>
        <td>${escapePigHTML(group.breed || "")}</td>
        <td>${escapePigHTML(group.sex || "Mixed")}</td>
        <td>${group.average_weight == null
            ? ""
            : escapePigHTML(group.average_weight) + " Kg"}</td>
        <td>${escapePigHTML(group.pen_name || "")}</td>
        <td>${actions}</td>
    `;

    table.appendChild(row);
});

}

async function editPigGroup(id) {
if (!hasPigPermission("edit")) {
alert("You do not have permission to edit groups.");
return;
}

const farmID = getFarmID();
if (farmID === null || farmID === undefined) return;

try {
    const { data, error } = await supabaseClient
        .from("pig_groups")
        .select("*")
        .eq("id", id)
        .eq("farm_id", farmID)
        .single();

    if (error) throw error;

    document.getElementById("groupName").value = data.group_name || "";

    const category = String(data.category || "").toLowerCase();

    document.getElementById("groupCategory").value =
        category.startsWith("piglet") ? "piglet" : "weaner";

    document.getElementById("groupQuantity").value = data.quantity;
    document.getElementById("groupBreed").value = data.breed || "";
    document.getElementById("groupSex").value = data.sex || "Mixed";
    document.getElementById("groupFarrowDate").value = data.farrow_date || "";
    document.getElementById("groupSource").value = data.source || "";
    document.getElementById("groupWeight").value =
        data.average_weight == null ? "" : data.average_weight;
    document.getElementById("groupHealth").value =
        data.health_status || "Healthy";
    document.getElementById("groupPen").value = data.pen_name || "";
    document.getElementById("groupNotes").value = data.notes || "";

    editingGroupID = id;

    const button = groupForm.querySelector('button[type="submit"]');
    if (button) button.textContent = "💾 Update Group";

    window.scrollTo({
        top: groupForm.offsetTop,
        behavior: "smooth"
    });

} catch (error) {
    console.error("EDIT GROUP ERROR:", error);
    alert("Unable to open group.\n\n" + error.message);
}

}

async function deletePigGroup(id) {
if (!hasPigPermission("delete")) {
alert("You do not have permission to delete groups.");
return;
}

const farmID = getFarmID();
const user = getLoggedUser();

if (farmID === null || farmID === undefined || !user) return;

try {
    const { data: group, error: fetchError } = await supabaseClient
        .from("pig_groups")
        .select("group_name,quantity,category")
        .eq("id", id)
        .eq("farm_id", farmID)
        .single();

    if (fetchError) throw fetchError;

    const confirmed = confirm(
        `Delete group "${group.group_name}" containing ` +
        `${group.quantity} ${group.category}?`
    );

    if (!confirmed) return;

    const { error } = await supabaseClient
        .from("pig_groups")
        .delete()
        .eq("id", id)
        .eq("farm_id", farmID);

    if (error) throw error;

    await logPigActivity(
        user,
        "Deleted",
        `Deleted group ${group.group_name}; quantity ${group.quantity}`
    );

    alert("Group deleted successfully.");
    await loadPigGroups();

} catch (error) {
    console.error("DELETE GROUP ERROR:", error);
    alert("Unable to delete group.\n\n" + error.message);
}

}

function clearGroupForm() {
groupForm?.reset();
editingGroupID = null;

const button = groupForm?.querySelector('button[type="submit"]');

if (button) button.textContent = "💾 Save Group";

setPigStatus("groupStatusMessage", "");

}

// ==========================================================
// CATEGORY REPORT
// Group counts are shown separately from individual records.
// ==========================================================

async function generateReport() {
if (!hasPigPermission("report")) {
alert("You do not have permission to generate reports.");
return;
}

const farmID = getFarmID();
if (farmID === null || farmID === undefined) return;

try {
    const [pigResult, groupResult] = await Promise.all([
        supabaseClient
            .from("pigs")
            .select("category")
            .eq("farm_id", farmID),

        supabaseClient
            .from("pig_groups")
            .select("category,quantity")
            .eq("farm_id", farmID)
    ]);

    if (pigResult.error) throw pigResult.error;
    if (groupResult.error) throw groupResult.error;

    const counts = {
        "Piglet": 0,
        "Weaner": 0,
        "Grower": 0,
        "Boar": 0,
        "Sow": 0,
        "Pregnant Sow": 0,
        "Lactating Sow": 0,
        "Unassigned": 0
    };

    (pigResult.data || []).forEach(pig => {
        if (Object.prototype.hasOwnProperty.call(counts, pig.category)) {
            counts[pig.category]++;
        } else {
            counts.Unassigned++;
        }
    });

    let groupPiglets = 0;
    let groupWeaners = 0;

    (groupResult.data || []).forEach(group => {
        const category = String(group.category || "").toLowerCase();

        if (category.startsWith("piglet")) {
            groupPiglets += Number(group.quantity) || 0;
        } else if (category.startsWith("weaner")) {
            groupWeaners += Number(group.quantity) || 0;
        }
    });

    const totalSows =
        counts.Sow +
        counts["Pregnant Sow"] +
        counts["Lactating Sow"];

    alert(
        "PIG REGISTRATION REPORT\n\n" +
        "Individual pig records: " + (pigResult.data || []).length + "\n" +
        "Individual piglets: " + counts.Piglet + "\n" +
        "Individual weaners: " + counts.Weaner + "\n" +
        "Piglets in groups: " + groupPiglets + "\n" +
        "Weaners in groups: " + groupWeaners + "\n" +
        "Growers: " + counts.Grower + "\n" +
        "Boars: " + counts.Boar + "\n" +
        "Total sows: " + totalSows + "\n" +
        "Unassigned individual records: " + counts.Unassigned + "\n\n" +
        "Group quantities are shown separately and are not automatically " +
        "added to the verified population total."
    );

} catch (error) {
    console.error("REPORT ERROR:", error);
    alert("Unable to generate report.\n\n" + error.message);
}

}

// ==========================================================
// PRINT REPORT
// ==========================================================

async function printReport() {
if (!hasPigPermission("report")) {
alert("You do not have permission to print reports.");
return;
}

try {
    const farmName = await getRegisteredFarmName();
    const header = document.querySelector(".page-header");

    if (!header) {
        window.print();
        return;
    }

    const brand = header.querySelector(".software-brand");
    const subtitle = header.querySelector("p");
    const label = header.querySelector(".farm-label");
    const nameElement = header.querySelector("[data-farm-name]");
    const icon = header.querySelector(".pig-icon");

    const originalName = nameElement?.textContent || "";

    if (nameElement) nameElement.textContent = farmName;
    if (brand) brand.style.display = "none";
    if (subtitle) subtitle.style.display = "none";
    if (label) label.style.display = "none";
    if (icon) icon.style.display = "none";

    header.classList.add("printing-farm-header");

    const style = document.createElement("style");
    style.id = "temporary-farm-print-style";
    style.textContent = `
        @media print {
            .printing-farm-header {
                display: block !important;
                text-align: center !important;
                box-shadow: none !important;
            }
            .printing-farm-header [data-farm-name] {
                display: block !important;
                font-size: 28px !important;
                font-weight: 800 !important;
                color: #000 !important;
                text-align: center !important;
            }
        }
    `;

    document.head.appendChild(style);

    const restore = () => {
        if (nameElement) nameElement.textContent = originalName;
        if (brand) brand.style.display = "";
        if (subtitle) subtitle.style.display = "";
        if (label) label.style.display = "";
        if (icon) icon.style.display = "";

        header.classList.remove("printing-farm-header");
        document.getElementById("temporary-farm-print-style")?.remove();

        window.removeEventListener("afterprint", restore);
    };

    window.addEventListener("afterprint", restore);
    window.print();

} catch (error) {
    console.error("PRINT ERROR:", error);
    alert("Unable to prepare print report.\n\n" + error.message);
}

}

// ==========================================================
// DOWNLOAD PDF
// ==========================================================

async function downloadPDF() {
if (!hasPigPermission("report")) {
alert("You do not have permission to download reports.");
return;
}

if (!window.jspdf) {
    alert("The PDF library is unavailable. Check your internet connection.");
    return;
}

const farmID = getFarmID();
const user = getLoggedUser();

if (farmID === null || farmID === undefined || !user) return;

try {
    const farmName = await getRegisteredFarmName();

    const { data, error } = await supabaseClient
        .from("pigs")
        .select("*")
        .eq("farm_id", farmID)
        .order("id", { ascending: true });

    if (error) throw error;

    const { jsPDF } = window.jspdf;

    const doc = new jsPDF({
        orientation: "landscape",
        unit: "mm",
        format: "a4"
    });

    doc.setFontSize(22);
    doc.setFont("helvetica", "bold");
    doc.text(farmName, 148, 18, { align: "center" });

    doc.setFontSize(15);
    doc.text("PIG REGISTRATION REPORT", 148, 30, { align: "center" });

    const generatedDate = new Date().toLocaleString("en-ZM", {
        timeZone: "Africa/Lusaka"
    });

    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.text("Generated: " + generatedDate, 14, 40);
    doc.text(
        "Generated By: " + (user.full_name || "System User"),
        14, 46
    );
    doc.text(
        "Individual Pig Records: " + (data || []).length,
        14, 52
    );

    const rows = (data || []).map(pig => [
        pig.pig_id || "",
        pig.breed || "",
        pig.category || "Not assigned",
        pig.farrow_date || "",
        pig.source || "",
        pig.weight == null ? "" : pig.weight + " Kg",
        pig.health_status || ""
    ]);

    doc.autoTable({
        startY: 59,
        head: [[
            "Pig ID",
            "Breed",
            "Category",
            "Farrow Date",
            "Source",
            "Weight",
            "Health Status"
        ]],
        body: rows,
        theme: "grid",
        styles: {
            fontSize: 8,
            cellPadding: 3,
            valign: "middle"
        },
        headStyles: {
            fontSize: 8,
            fontStyle: "bold",
            halign: "center"
        },
        margin: { left: 10, right: 10 }
    });

    const pageCount = doc.internal.getNumberOfPages();

    for (let page = 1; page <= pageCount; page++) {
        doc.setPage(page);

        const pageHeight = doc.internal.pageSize.height;

        doc.setFontSize(8);
        doc.text(farmName, 10, pageHeight - 8);
        doc.text(
            `Page ${page} of ${pageCount}`,
            287,
            pageHeight - 8,
            { align: "right" }
        );
    }

    const date = new Date().toISOString().split("T")[0];

    const fileName =
        farmName.replace(/[^a-z0-9]/gi, "_") +
        "_Pig_Registration_" +
        date +
        ".pdf";

    doc.save(fileName);

} catch (error) {
    console.error("PDF ERROR:", error);
    alert("Unable to generate PDF.\n\n" + error.message);
}

}

// ==========================================================
// INITIALISE PAGE
// ==========================================================

window.addEventListener("load", async () => {
updateRegistrationTypeUI();

const farmNameElement = document.querySelector("[data-farm-name]");

if (farmNameElement) {
    farmNameElement.textContent = await getRegisteredFarmName();
}

await loadPigs();
await loadPigGroups();

});

const searchPigInput = document.getElementById("searchPig");

if (searchPigInput) {
searchPigInput.addEventListener("input", searchPig);
}