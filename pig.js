// ==========================================================
// MUNKA PIGGERY TECHNOLOGY
// PIG REGISTRATION MODULE
// Individual pigs + piglet/weaner groups
// Multi-farm and permission-controlled
// ==========================================================

let editID = null;
let editingGroupID = null;

// ==========================================================
// BASIC HELPERS
// ==========================================================

function getLoggedUser() {
try {
return JSON.parse(localStorage.getItem("loggedInUser"));
} catch (error) {
console.error("Login details error:", error);
return null;
}
}

function getFarmID() {
const user = getLoggedUser();
return user && user.farm_id != null && user.farm_id !== ""
? user.farm_id
: null;
}

function escapePigHTML(value) {
const replacements = {
"&": "&",
"<": "<",
">": ">",
'"': """,
"'": "'"
};

return String(value ?? "").replace(/[&<>"']/g, c => replacements[c]);

}

function hasPigPermission(permission) {
const names = {
view: "canView",
add: "canAdd",
edit: "canEdit",
delete: "canDelete",
report: "canReport"
};

const fn = window[names[permission]];

if (typeof fn !== "function") {
    console.error("Permission helper unavailable:", names[permission]);
    return false;
}

try {
    return fn("Pig Registration") === true;
} catch (error) {
    console.error("Permission check failed:", error);
    return false;
}

}

function getPigSexFromCategory(category) {
if (category === "Boar") return "Male";

if (["Sow", "Pregnant Sow", "Lactating Sow"].includes(category)) {
    return "Female";
}

return "Unknown";

}

function setPigStatus(id, message, isError = false) {
const element = document.getElementById(id);
if (!element) return;

element.textContent = message;
element.style.color = isError ? "#b00020" : "#176b2c";

}

function showPigError(message, error) {
console.error(message, error);
alert(message + "\n\n" + (error?.message || "Please try again."));
}

async function logPigActivity(user, action, details) {
if (typeof window.saveActivity !== "function") return;

try {
    await window.saveActivity(
        `${user.full_name || "User"} (${user.role || "Unknown role"})`,
        action,
        "Pig Registration",
        details
    );
} catch (error) {
    console.error("Activity log error:", error);
}

}

async function getRegisteredFarmName() {
const farmID = getFarmID();
if (farmID == null) return "REGISTERED FARM";

try {
    const { data, error } = await supabaseClient
        .from("farms")
        .select("farm_name")
        .eq("id", farmID)
        .maybeSingle();

    if (error) throw error;
    return data?.farm_name || "REGISTERED FARM";
} catch (error) {
    console.error("Farm name error:", error);
    return "REGISTERED FARM";
}

}

// ==========================================================
// REGISTRATION DATE UI
// ==========================================================

function updateRegistrationTypeUI() {
const typeInput = document.getElementById("registrationType");
const dateInput = document.getElementById("registrationDate");
const dateGroup = document.getElementById("registrationDateGroup");

if (!typeInput || !dateInput || !dateGroup) return;

const type = typeInput.value;
const needsDate = ["purchase", "arrival"].includes(type);

dateGroup.style.display = needsDate ? "" : "none";
dateInput.required = needsDate;

const label = dateGroup.querySelector("label");
if (label) {
    label.textContent = type === "purchase" ? "Purchase Date" : "Arrival Date";
}

}

document.getElementById("registrationType")
?.addEventListener("change", updateRegistrationTypeUI);

// ==========================================================
// INDIVIDUAL PIG REGISTRATION
// ==========================================================

const pigForm = document.getElementById("pigForm");

if (pigForm) {
pigForm.addEventListener("submit", async event => {
event.preventDefault();

    const isEditing = editID !== null;

    if (!hasPigPermission(isEditing ? "edit" : "add")) {
        alert("You do not have permission for this action.");
        return;
    }

    const user = getLoggedUser();
    const farmID = getFarmID();

    if (!user || farmID == null) {
        alert("Please log in again and check your farm account.");
        return;
    }

    const value = id =>
        document.getElementById(id)?.value?.trim() || "";

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
        alert("Please complete all required fields.");
        return;
    }

    if (!isEditing && registrationType === "purchase" && !registrationDate) {
        alert("Please enter the purchase date.");
        return;
    }

    if (!isEditing && registrationType === "arrival") {
        alert("Transfer/arrival tracking is not connected. No record was saved.");
        return;
    }

    if (!isEditing && registrationType === "birth") {
        alert("Please record farm births through the Farrowing module.");
        return;
    }

    const weight = Number(weightValue);

    if (!Number.isFinite(weight) || weight < 0) {
        alert("Please enter a valid weight.");
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
        if (isEditing) {
            pig.updated_by = user.full_name || null;
            pig.updated_at = new Date().toISOString();

            const { error } = await supabaseClient
                .from("pigs")
                .update(pig)
                .eq("id", editID)
                .eq("farm_id", farmID);

            if (error) throw error;

            await logPigActivity(user, "Updated", `Updated pig ${pigID}`);
            clearForm();
            await loadPigs();
            setPigStatus("pigStatusMessage", "Pig record updated successfully.");
            return;
        }

        pig.created_by = user.full_name || null;
        pig.updated_by = null;
        pig.updated_at = null;
        pig.farm_id = farmID;

        const { data: insertedPig, error } = await supabaseClient
            .from("pigs")
            .insert([pig])
            .select("id,pig_id")
            .single();

        if (error) throw error;

        if (registrationType === "purchase") {
            const { error: movementError } = await supabaseClient.rpc(
                "record_pig_purchase_movement",
                {
                    p_pig_record_id: insertedPig.id,
                    p_purchase_date: registrationDate,
                    p_notes: `Purchased from ${source}`
                }
            );

            if (movementError) {
                console.error("Purchase movement error:", movementError);
                await loadPigs();

                alert(
                    "The pig was saved, but purchase tracking failed.\n" +
                    "Pig ID: " + insertedPig.pig_id +
                    "\nDo not register it again. Please report this error."
                );
                return;
            }
        }

        await logPigActivity(
            user,
            "Added",
            `Registered pig ${pigID}; category ${category}; type ${registrationType}`
        );

        clearForm();
        await loadPigs();
        setPigStatus("pigStatusMessage", "Pig record saved successfully.");

    } catch (error) {
        setPigStatus("pigStatusMessage", error.message || "Unable to save pig.", true);
        showPigError("Unable to save the pig record.", error);
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
// LOAD AND DISPLAY INDIVIDUAL PIGS
// ==========================================================

async function loadPigs() {
const table = document.getElementById("pigTable");
if (!table) return;

if (!hasPigPermission("view")) {
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

try {
    const { data, error } = await supabaseClient
        .from("pigs")
        .select("*")
        .eq("farm_id", farmID)
        .order("id", { ascending: true });

    if (error) throw error;
    displayPigs(data || []);
} catch (error) {
    console.error("Load pigs error:", error);
    table.innerHTML =
        '<tr><td colspan="8">Unable to load records. Please try again.</td></tr>';
}

}

function displayPigs(records) {
const table = document.getElementById("pigTable");
if (!table) return;

table.innerHTML = "";

if (!records.length) {
    table.innerHTML =
        '<tr><td colspan="8">No individual pigs registered yet.</td></tr>';
    return;
}

records.forEach(pig => {
    let actions = "";

    if (hasPigPermission("edit")) {
        actions += `<button type="button" onclick="editPig(${Number(pig.id)})">Edit</button> `;
    }

    if (hasPigPermission("delete")) {
        actions += `<button type="button" onclick="deletePig(${Number(pig.id)})">Delete</button>`;
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
        <td>${actions}</td>`;

    table.appendChild(row);
});

}

// ==========================================================
// EDIT AND DELETE INDIVIDUAL PIGS
// ==========================================================

async function editPig(id) {
if (!hasPigPermission("edit")) {
alert("You do not have permission to edit records.");
return;
}

const farmID = getFarmID();
if (farmID == null) return;

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
    document.getElementById("healthStatus").value = data.health_status || "";

    document.getElementById("registrationType").value = "existing";
    document.getElementById("registrationDate").value = "";
    updateRegistrationTypeUI();

    editID = id;

    const button = pigForm?.querySelector('button[type="submit"]');
    if (button) button.textContent = "💾 Update Pig Record";

    window.scrollTo({ top: 0, behavior: "smooth" });
} catch (error) {
    showPigError("Unable to open this pig record.", error);
}

}

async function deletePig(id) {
if (!hasPigPermission("delete")) {
alert("You do not have permission to delete records.");
return;
}

const farmID = getFarmID();
const user = getLoggedUser();
if (farmID == null || !user) return;

try {
    const { data: pig, error: fetchError } = await supabaseClient
        .from("pigs")
        .select("pig_id")
        .eq("id", id)
        .eq("farm_id", farmID)
        .single();

    if (fetchError) throw fetchError;
    if (!confirm(`Delete pig ${pig.pig_id || id}?`)) return;

    const { error } = await supabaseClient
        .from("pigs")
        .delete()
        .eq("id", id)
        .eq("farm_id", farmID);

    if (error) throw error;

    await logPigActivity(user, "Deleted", `Deleted pig ${pig.pig_id || id}`);
    await loadPigs();
    setPigStatus("pigStatusMessage", "Pig record deleted.");
} catch (error) {
    showPigError("Unable to delete the pig record.", error);
}

}

// ==========================================================
// SEARCH PIGS
// ==========================================================

async function searchPig() {
if (!hasPigPermission("view")) {
alert("You do not have permission to view records.");
return;
}

const farmID = getFarmID();
if (farmID == null) return;

const keyword = document.getElementById("searchPig")?.value?.trim() || "";

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

    const { data, error } = await query.order("id", { ascending: true });
    if (error) throw error;

    displayPigs(data || []);
} catch (error) {
    showPigError("Unable to search pig records.", error);
}

}

// ==========================================================
// CLEAR INDIVIDUAL PIG FORM
// ==========================================================

function clearForm() {
pigForm?.reset();
editID = null;

const button = pigForm?.querySelector('button[type="submit"]');
if (button) button.textContent = "💾 Save Pig Record";

const date = document.getElementById("registrationDate");
if (date) date.value = "";

updateRegistrationTypeUI();
setPigStatus("pigStatusMessage", "");

}

// ==========================================================
// PIGLET / WEANER GROUPS
// ==========================================================

const groupForm = document.getElementById("groupForm");

if (groupForm) {
groupForm.addEventListener("submit", async event => {
event.preventDefault();

    const isEditing = editingGroupID !== null;

    if (!hasPigPermission(isEditing ? "edit" : "add")) {
        alert("You do not have permission to save groups.");
        return;
    }

    const user = getLoggedUser();
    const farmID = getFarmID();

    if (!user || farmID == null) {
        alert("Please log in and check your farm account.");
        return;
    }

    const value = id =>
        document.getElementById(id)?.value?.trim() || "";

    const groupName = value("groupName");
    const category = value("groupCategory");
    const quantity = Number(value("groupQuantity"));
    const weightText = value("groupWeight");
    const averageWeight = weightText === "" ? null : Number(weightText);

    if (!groupName || !["piglet", "weaner"].includes(category)) {
        alert("Enter a group name and select Piglets or Weaners.");
        return;
    }

    if (!Number.isInteger(quantity) || quantity < 1) {
        alert("Enter a whole number of pigs greater than zero.");
        return;
    }

    if (averageWeight !== null &&
        (!Number.isFinite(averageWeight) || averageWeight < 0)) {
        alert("Enter a valid average weight.");
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
        let error;

        if (isEditing) {
            ({ error } = await supabaseClient
                .from("pig_groups")
                .update(group)
                .eq("id", editingGroupID)
                .eq("farm_id", farmID));
        } else {
            group.created_by = user.full_name || null;

            ({ error } = await supabaseClient
                .from("pig_groups")
                .insert([group]));
        }

        if (error) throw error;

        await logPigActivity(
            user,
            isEditing ? "Updated Group" : "Added Group",
            `${isEditing ? "Updated" : "Registered"} group ${groupName}; quantity ${quantity}`
        );

        clearGroupForm();
        await loadPigGroups();

        setPigStatus(
            "groupStatusMessage",
            isEditing ? "Group updated successfully." : "Group registered successfully."
        );
    } catch (error) {
        setPigStatus("groupStatusMessage", error.message || "Unable to save group.", true);
        showPigError("Unable to save the piglet/weaner group.", error);
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
// LOAD GROUPS
// ==========================================================

async function loadPigGroups() {
const table = document.getElementById("groupTable");
if (!table) return;

// Group records use the Pig Registration module permission.
if (!hasPigPermission("view")) {
    table.innerHTML =
        '<tr><td colspan="10">You do not have permission to view groups.</td></tr>';
    return;
}

const farmID = getFarmID();

if (farmID == null) {
    table.innerHTML =
        '<tr><td colspan="10">Please log in and check your farm account.</td></tr>';
    return;
}

try {
    const { data, error } = await supabaseClient
        .from("pig_groups")
        .select("*")
        .eq("farm_id", farmID)
        .order("id", { ascending: true });

    if (error) throw error;

    displayPigGroups(data || []);
} catch (error) {
    console.error("Load pig groups error:", error);
    table.innerHTML =
        '<tr><td colspan="10">Unable to load groups. Check table permissions and try again.</td></tr>';
}

}

function displayPigGroups(records) {
const table = document.getElementById("groupTable");
if (!table) return;

table.innerHTML = "";

if (!records.length) {
    table.innerHTML =
        '<tr><td colspan="10">No piglet or weaner groups registered yet.</td></tr>';
    return;
}

records.forEach(group => {
    let actions = "";

    if (hasPigPermission("edit")) {
        actions += `<button type="button" onclick="editPigGroup(${Number(group.id)})">Edit</button> `;
    }

    if (hasPigPermission("delete")) {
        actions += `<button type="button" onclick="deletePigGroup(${Number(group.id)})">Delete</button>`;
    }

    if (!actions) actions = "No actions";

    const row = document.createElement("tr");

    row.innerHTML = `
        <td>${escapePigHTML(group.group_name)}</td>
        <td>${escapePigHTML(group.category)}</td>
        <td>${escapePigHTML(group.quantity)}</td>
        <td>${escapePigHTML(group.breed || "")}</td>
        <td>${escapePigHTML(group.sex || "")}</td>
        <td>${escapePigHTML(group.farrow_date || "")}</td>
        <td>${group.average_weight == null ? "" : escapePigHTML(group.average_weight) + " Kg"}</td>
        <td>${escapePigHTML(group.health_status || "")}</td>
        <td>${escapePigHTML(group.pen_name || "")}</td>
        <td>${actions}</td>`;

    table.appendChild(row);
});

}

// ==========================================================
// EDIT AND DELETE GROUPS
// ==========================================================

async function editPigGroup(id) {
if (!hasPigPermission("edit")) {
alert("You do not have permission to edit groups.");
return;
}

const farmID = getFarmID();
if (farmID == null) return;

try {
    const { data, error } = await supabaseClient
        .from("pig_groups")
        .select("*")
        .eq("id", id)
        .eq("farm_id", farmID)
        .single();

    if (error) throw error;

    const values = {
        groupName: data.group_name,
        groupCategory: data.category,
        groupQuantity: data.quantity,
        groupBreed: data.breed,
        groupSex: data.sex,
        groupFarrowDate: data.farrow_date,
        groupSource: data.source,
        groupWeight: data.average_weight,
        groupHealth: data.health_status,
        groupPen: data.pen_name,
        groupNotes: data.notes
    };

    Object.entries(values).forEach(([field, value]) => {
        const element = document.getElementById(field);
        if (element) element.value = value ?? "";
    });

    editingGroupID = id;

    const button = groupForm?.querySelector('button[type="submit"]');
    if (button) button.textContent = "💾 Update Group";

    window.scrollTo({ top: 0, behavior: "smooth" });
} catch (error) {
    showPigError("Unable to open this group.", error);
}

}

async function deletePigGroup(id) {
if (!hasPigPermission("delete")) {
alert("You do not have permission to delete groups.");
return;
}

const farmID = getFarmID();
const user = getLoggedUser();

if (farmID == null || !user) return;

try {
    const { data: group, error: fetchError } = await supabaseClient
        .from("pig_groups")
        .select("group_name")
        .eq("id", id)
        .eq("farm_id", farmID)
        .single();

    if (fetchError) throw fetchError;

    if (!confirm(`Delete group ${group.group_name || id}?`)) return;

    const { error } = await supabaseClient
        .from("pig_groups")
        .delete()
        .eq("id", id)
        .eq("farm_id", farmID);

    if (error) throw error;

    await logPigActivity(
        user,
        "Deleted Group",
        `Deleted group ${group.group_name || id}`
    );

    await loadPigGroups();
    setPigStatus("groupStatusMessage", "Group deleted successfully.");
} catch (error) {
    showPigError("Unable to delete this group.", error);
}

}

// ==========================================================
// CLEAR GROUP FORM
// ==========================================================

function clearGroupForm() {
groupForm?.reset();
editingGroupID = null;

const button = groupForm?.querySelector('button[type="submit"]');
if (button) button.textContent = "💾 Save Group";

setPigStatus("groupStatusMessage", "");

}

// ==========================================================
// REPORT, PRINT AND PDF
// ==========================================================

async function generateReport() {
if (!hasPigPermission("report")) {
alert("You do not have permission to generate reports.");
return;
}

const farmID = getFarmID();
if (farmID == null) {
    alert("Please log in and check your farm account.");
    return;
}

try {
    const [{ data: pigs, error: pigError }, { data: groups, error: groupError }] =
        await Promise.all([
            supabaseClient.from("pigs").select("*").eq("farm_id", farmID),
            supabaseClient.from("pig_groups").select("*").eq("farm_id", farmID)
        ]);

    if (pigError) throw pigError;
    if (groupError) throw groupError;

    const totalPigs = (pigs || []).length;
    const totalGroups = (groups || []).length;
    const groupQuantity = (groups || []).reduce(
        (sum, group) => sum + (Number(group.quantity) || 0), 0
    );

    const report = document.getElementById("reportOutput");
    if (!report) {
        alert(
            `Pig Registration Report\n\nIndividual pig records: ${totalPigs}` +
            `\nGroups: ${totalGroups}\nPigs represented in groups: ${groupQuantity}`
        );
        return;
    }

    report.innerHTML = `
        <h2>Pig Registration Report</h2>
        <p>Individual pig records: ${totalPigs}</p>
        <p>Piglet/weaner groups: ${totalGroups}</p>
        <p>Pigs represented in groups: ${groupQuantity}</p>
        <p>Total pigs represented: ${totalPigs + groupQuantity}</p>`;
} catch (error) {
    showPigError("Unable to generate the report.", error);
}

}

function printReport() {
if (!hasPigPermission("report")) {
alert("You do not have permission to print reports.");
return;
}

window.print();

}

async function downloadPDF() {
if (!hasPigPermission("report")) {
alert("You do not have permission to download reports.");
return;
}

if (!window.jspdf || typeof window.jspdf.jsPDF !== "function") {
    alert("The PDF library did not load. Check your internet connection and try again.");
    return;
}

const farmName = await getRegisteredFarmName();
const doc = new window.jspdf.jsPDF();

doc.setFontSize(16);
doc.text("MUNKA PIGGERY TECHNOLOGY", 14, 18);

doc.setFontSize(12);
doc.text(`${farmName} - Pig Registration Report`, 14, 27);

try {
    const farmID = getFarmID();

    const [{ data: pigs, error: pigError }, { data: groups, error: groupError }] =
        await Promise.all([
            supabaseClient.from("pigs").select("*").eq("farm_id", farmID),
            supabaseClient.from("pig_groups").select("*").eq("farm_id", farmID)
        ]);

    if (pigError) throw pigError;
    if (groupError) throw groupError;

    let y = 36;

    doc.text(`Individual pig records: ${(pigs || []).length}`, 14, y);
    y += 8;
    doc.text(`Piglet/weaner groups: ${(groups || []).length}`, 14, y);
    y += 8;

    if (typeof doc.autoTable === "function") {
        doc.autoTable({
            startY: y + 4,
            head: [["Pig ID", "Breed", "Category", "Weight", "Health"]],
            body: (pigs || []).map(pig => [
                pig.pig_id || "",
                pig.breed || "",
                pig.category || "",
                pig.weight == null ? "" : `${pig.weight} Kg`,
                pig.health_status || ""
            ])
        });

        doc.autoTable({
            startY: doc.lastAutoTable.finalY + 10,
            head: [["Group", "Category", "Quantity", "Breed", "Pen"]],
            body: (groups || []).map(group => [
                group.group_name || "",
                group.category || "",
                String(group.quantity ?? ""),
                group.breed || "",
                group.pen_name || ""
            ])
        });
    } else {
        alert("The PDF table library did not load. A simple PDF will be created.");
    }

    doc.save("munka-piggery-registration-report.pdf");
} catch (error) {
    showPigError("Unable to download the PDF report.", error);
}

}

// ==========================================================
// GLOBAL FUNCTIONS USED BY HTML BUTTONS
// ==========================================================

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

// ==========================================================
// INITIALISE MODULE
// ==========================================================

document.addEventListener("DOMContentLoaded", async () => {
updateRegistrationTypeUI();

await Promise.all([
    loadPigs(),
    loadPigGroups()
]);

});