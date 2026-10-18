/* =========================================================
MUNKA PIGGERY TECHNOLOGY
PIG REGISTRATION MODULE
Individual pigs, piglet groups, weaner groups and reports
========================================================= */

let editID = null;
let editingGroupID = null;
let currentPigReport = null;

const pigById = id => document.getElementById(id);

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

return String(value ?? "").replace(/[&<>"']/g, char => replacements[char]);

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
    console.error("Permission helper is unavailable:", map[action]);
    return false;
}

try {
    const result = fn("Pig Registration");

    if (result && typeof result.then === "function") {
        console.error("Asynchronous permission helper detected:", map[action]);
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
alert(message + "\n\n" + (error?.message || "Please try again."));
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

function getPigSexFromCategory(category) {
if (category === "Boar") return "Male";

if (["Sow", "Pregnant Sow", "Lactating Sow"].includes(category)) {
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
    label.textContent =
        type.value === "purchase" ? "Purchase Date" : "Arrival Date";
}

}

/* =========================================================
INDIVIDUAL PIG SAVE / UPDATE
========================================================= */

const pigForm = pigById("pigForm");

pigForm?.addEventListener("submit", async event => {
event.preventDefault();

const editing = editID !== null;

if (!pigPermission(editing ? "edit" : "add")) {
    alert("You do not have permission for this action.");
    return;
}

const user = getLoggedUser();
const farmID = getFarmID();

if (!user || farmID == null) {
    alert("Please log in again and check your farm account.");
    return;
}

const value = id => pigById(id)?.value?.trim() || "";

const pigID = value("pigID");
const breed = value("breed");
const category = value("category");
const farrowDate = value("farrowDate");
const source = value("source");
const weightText = value("weight");
const health = value("healthStatus");
const type = value("registrationType");
const registrationDate = value("registrationDate");

if (!pigID || !breed || !category || !farrowDate ||
    !source || !weightText || !health) {
    alert("Please complete all required fields.");
    return;
}

if (!editing && type === "purchase" && !registrationDate) {
    alert("Please enter the purchase date.");
    return;
}

if (!editing && type === "arrival") {
    alert("Transfer/arrival tracking is not connected. No record was saved.");
    return;
}

if (!editing && type === "birth") {
    alert("Please record farm births through the Farrowing module.");
    return;
}

const weight = Number(weightText);

if (!Number.isFinite(weight) || weight < 0) {
    alert("Please select a valid weight.");
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

const button = pigForm.querySelector('button[type="submit"]');
const originalText = button?.textContent || "💾 Save Pig Record";

if (button) {
    button.disabled = true;
    button.textContent = editing ? "Updating..." : "Saving...";
}

try {
    if (editing) {
        record.updated_by = user.full_name || null;
        record.updated_at = new Date().toISOString();

        const { error } = await supabaseClient
            .from("pigs")
            .update(record)
            .eq("id", editID)
            .eq("farm_id", farmID);

        if (error) throw error;

        await logPigActivity(user, "Updated", `Updated pig ${pigID}`);

        clearForm();
        await loadPigs();
        setPigStatus("pigStatusMessage", "Pig record updated successfully.");
        return;
    }

    record.farm_id = farmID;
    record.created_by = user.full_name || null;
    record.updated_by = null;
    record.updated_at = null;

    const { data: inserted, error } = await supabaseClient
        .from("pigs")
        .insert([record])
        .select("id,pig_id")
        .single();

    if (error) throw error;

    if (type === "purchase") {
        const { error: movementError } = await supabaseClient.rpc(
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
                "The pig was saved, but purchase tracking failed.\n" +
                "Pig ID: " + inserted.pig_id +
                "\nDo not register it again. Please report this error."
            );
            return;
        }
    }

    await logPigActivity(user, "Added", `Registered pig ${pigID}`);

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

/* =========================================================
LOAD / DISPLAY INDIVIDUAL PIGS
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

table.innerHTML = '<tr><td colspan="8">Loading records...</td></tr>';

try {
    const { data, error } = await supabaseClient
        .from("pigs")
        .select("*")
        .eq("farm_id", farmID)
        .order("id", { ascending: true });

    if (error) throw error;

    displayPigs(data || []);
} catch (error) {
    console.error("Load pigs failed:", error);
    table.innerHTML =
        '<tr><td colspan="8">Unable to load records. Check your connection and access policies.</td></tr>';
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
        actions += `<button type="button" onclick="editPig(${Number(pig.id)})">Edit</button> `;
    }

    if (pigPermission("delete")) {
        actions += `<button type="button" onclick="deletePig(${Number(pig.id)})">Delete</button>`;
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
        <td>${actions}</td>`;

    table.appendChild(row);
});

}

async function editPig(id) {
if (!pigPermission("edit")) {
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

    const values = {
        pigID: data.pig_id,
        breed: data.breed,
        category: data.category,
        farrowDate: data.farrow_date,
        source: data.source,
        weight: data.weight,
        healthStatus: data.health_status
    };

    Object.entries(values).forEach(([id, value]) => {
        const element = pigById(id);
        if (element) element.value = value ?? "";
    });

    pigById("registrationType").value = "existing";
    pigById("registrationDate").value = "";
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
if (!pigPermission("delete")) {
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

async function searchPig() {
if (!pigPermission("view")) {
alert("You do not have permission to view records.");
return;
}

const farmID = getFarmID();
if (farmID == null) return;

const keyword = pigById("searchPig")?.value?.trim() || "";

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

function clearForm() {
pigForm?.reset();
editID = null;
updateRegistrationTypeUI();

const button = pigForm?.querySelector('button[type="submit"]');
if (button) button.textContent = "💾 Save Pig Record";

setPigStatus("pigStatusMessage", "");

}

/* =========================================================
PIGLET / WEANER GROUP SAVE / UPDATE
========================================================= */

const groupForm = pigById("groupForm");

groupForm?.addEventListener("submit", async event => {
event.preventDefault();

const editing = editingGroupID !== null;

if (!pigPermission(editing ? "edit" : "add")) {
    alert("You do not have permission to save groups.");
    return;
}

const user = getLoggedUser();
const farmID = getFarmID();

if (!user || farmID == null) {
    alert("Please log in and check your farm account.");
    return;
}

const value = id => pigById(id)?.value?.trim() || "";

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
    alert("Enter a whole number greater than zero.");
    return;
}

if (averageWeight !== null &&
    (!Number.isFinite(averageWeight) || averageWeight < 0)) {
    alert("Enter a valid average weight.");
    return;
}

const record = {
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
    button.textContent = editing ? "Updating..." : "Saving...";
}

try {
    let error;

    if (editing) {
        ({ error } = await supabaseClient
            .from("pig_groups")
            .update(record)
            .eq("id", editingGroupID)
            .eq("farm_id", farmID));
    } else {
        record.created_by = user.full_name || null;

        ({ error } = await supabaseClient
            .from("pig_groups")
            .insert([record]));
    }

    if (error) throw error;

    await logPigActivity(
        user,
        editing ? "Updated Group" : "Added Group",
        `${editing ? "Updated" : "Registered"} group ${groupName}`
    );

    clearGroupForm();
    await loadPigGroups();

    setPigStatus(
        "groupStatusMessage",
        editing ? "Group updated successfully." : "Group saved successfully."
    );
} catch (error) {
    setPigStatus("groupStatusMessage", error.message || "Unable to save group.", true);
    showPigError("Unable to save the group.", error);
} finally {
    if (button) {
        button.disabled = false;
        button.textContent = editingGroupID === null
            ? "💾 Save Group"
            : "💾 Update Group";
    }
}

});

/* =========================================================
LOAD / DISPLAY GROUPS
Matches the actual eight-column HTML group table.
========================================================= */

async function loadPigGroups() {
const table = pigById("groupTable");
if (!table) return;

if (!pigPermission("view")) {
    table.innerHTML =
        '<tr><td colspan="8">You do not have permission to view groups.</td></tr>';
    return;
}

const farmID = getFarmID();

if (farmID == null) {
    table.innerHTML =
        '<tr><td colspan="8">Please log in and check your farm account.</td></tr>';
    return;
}

table.innerHTML = '<tr><td colspan="8">Loading groups...</td></tr>';

try {
    const { data, error } = await supabaseClient
        .from("pig_groups")
        .select("*")
        .eq("farm_id", farmID)
        .order("id", { ascending: true });

    if (error) throw error;

    displayPigGroups(data || []);
} catch (error) {
    console.error("Load pig groups failed:", error);
    table.innerHTML =
        '<tr><td colspan="8">Unable to load groups. Check the pig_groups table access policies.</td></tr>';
}

}

function displayPigGroups(records) {
const table = pigById("groupTable");
if (!table) return;

table.innerHTML = "";

if (!records.length) {
    table.innerHTML =
        '<tr><td colspan="8">No piglet or weaner groups registered yet.</td></tr>';
    return;
}

records.forEach(group => {
    let actions = "";

    if (pigPermission("edit")) {
        actions += `<button type="button" onclick="editPigGroup(${Number(group.id)})">Edit</button> `;
    }

    if (pigPermission("delete")) {
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
        <td>${group.average_weight == null ? "" : escapePigHTML(group.average_weight) + " Kg"}</td>
        <td>${escapePigHTML(group.pen_name || "")}</td>
        <td>${actions}</td>`;

    table.appendChild(row);
});

}

async function editPigGroup(id) {
if (!pigPermission("edit")) {
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

    Object.entries(values).forEach(([id, value]) => {
        const element = pigById(id);
        if (element) element.value = value ?? "";
    });

    editingGroupID = id;

    const button = groupForm?.querySelector('button[type="submit"]');
    if (button) button.textContent = "💾 Update Group";

    window.scrollTo({ top: 0, behavior: "smooth" });
} catch (error) {
    showPigError("Unable to open group.", error);
}

}

async function deletePigGroup(id) {
if (!pigPermission("delete")) {
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

    await logPigActivity(user, "Deleted Group", `Deleted group ${group.group_name || id}`);
    await loadPigGroups();
    setPigStatus("groupStatusMessage", "Group deleted successfully.");
} catch (error) {
    showPigError("Unable to delete group.", error);
}

}

function clearGroupForm() {
groupForm?.reset();
editingGroupID = null;

const button = groupForm?.querySelector('button[type="submit"]');
if (button) button.textContent = "💾 Save Group";

setPigStatus("groupStatusMessage", "");

}

/* =========================================================
REPORT OUTPUT
Adds a report container because the supplied HTML lacked one.
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
throw new Error("You do not have permission to generate reports.");
}

const farmID = getFarmID();
if (farmID == null) throw new Error("Please log in and check your farm account.");

const [
    { data: pigs, error: pigError },
    { data: groups, error: groupError }
] = await Promise.all([
    supabaseClient.from("pigs").select("*").eq("farm_id", farmID),
    supabaseClient.from("pig_groups").select("*").eq("farm_id", farmID)
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

async function generateReport() {
const output = getOrCreateReportOutput();

if (!output) {
    alert("The report display section could not be found.");
    return;
}

output.textContent = "Generating report...";

try {
    currentPigReport = await collectPigReport();

    const report = currentPigReport;
    const groupCount = report.groups.length;
    const groupQuantity = report.groups.reduce(
        (total, group) => total + (Number(group.quantity) || 0),
        0
    );

    output.innerHTML = `
        <div class="generated-pig-report">
            <h2>MUNKA PIGGERY TECHNOLOGY</h2>
            <h3>Pig Registration Report</h3>
            <p><strong>Farm:</strong> ${escapePigHTML(report.farmName)}</p>
            <p><strong>Generated:</strong> ${escapePigHTML(report.generatedAt)}</p>
            <hr>
            <p><strong>Individual pig records:</strong> ${report.pigs.length}</p>
            <p><strong>Piglet/weaner groups:</strong> ${groupCount}</p>
            <p><strong>Animals represented in groups:</strong> ${groupQuantity}</p>
            <h3>Individual Pigs</h3>
            <div class="table-wrapper">
                <table>
                    <thead><tr>
                        <th>Pig ID</th><th>Breed</th><th>Category</th>
                        <th>Farrow Date</th><th>Weight</th><th>Health</th>
                    </tr></thead>
                    <tbody>
                        ${report.pigs.map(pig => `
                            <tr>
                                <td>${escapePigHTML(pig.pig_id)}</td>
                                <td>${escapePigHTML(pig.breed)}</td>
                                <td>${escapePigHTML(pig.category)}</td>
                                <td>${escapePigHTML(pig.farrow_date)}</td>
                                <td>${pig.weight == null ? "" : escapePigHTML(pig.weight) + " Kg"}</td>
                                <td>${escapePigHTML(pig.health_status)}</td>
                            </tr>`).join("")}
                    </tbody>
                </table>
            </div>
            <h3>Piglet and Weaner Groups</h3>
            <div class="table-wrapper">
                <table>
                    <thead><tr>
                        <th>Group</th><th>Category</th><th>Quantity</th>
                        <th>Breed</th><th>Average Weight</th><th>Pen</th>
                    </tr></thead>
                    <tbody>
                        ${report.groups.map(group => `
                            <tr>
                                <td>${escapePigHTML(group.group_name)}</td>
                                <td>${escapePigHTML(group.category)}</td>
                                <td>${escapePigHTML(group.quantity)}</td>
                                <td>${escapePigHTML(group.breed || "")}</td>
                                <td>${group.average_weight == null ? "" : escapePigHTML(group.average_weight) + " Kg"}</td>
                                <td>${escapePigHTML(group.pen_name || "")}</td>
                            </tr>`).join("")}
                    </tbody>
                </table>
            </div>
        </div>`;

    output.scrollIntoView({ behavior: "smooth", block: "start" });
} catch (error) {
    output.textContent = error.message || "Unable to generate report.";
    showPigError("Unable to generate the registration report.", error);
}

}

/* =========================================================
PRINT
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
    showPigError("Unable to prepare the report for printing.", error);
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

    if (!window.jspdf || typeof window.jspdf.jsPDF !== "function") {
        alert("The PDF library did not load. Check your internet connection and try again.");
        return;
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
    doc.text(`Individual pig records: ${report.pigs.length}`, 14, 42);
    doc.text(`Piglet/weaner groups: ${report.groups.length}`, 14, 48);

    let nextY = 54;

    if (typeof doc.autoTable === "function") {
        doc.autoTable({
            startY: nextY,
            head: [["Pig ID", "Breed", "Category", "Farrow Date", "Source", "Weight (Kg)", "Health"]],
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
            head: [["Group", "Category", "Quantity", "Breed", "Sex", "Average Weight (Kg)", "Pen"]],
            body: report.groups.map(group => [
                group.group_name || "",
                group.category || "",
                String(group.quantity ?? ""),
                group.breed || "",
                group.sex || "",
                group.average_weight == null ? "" : String(group.average_weight),
                group.pen_name || ""
            ]),
            styles: { fontSize: 8 }
        });
    } else {
        doc.setFontSize(9);
        doc.text("PDF table extension unavailable; summary only.", 14, nextY + 5);
    }

    doc.save("munka-piggery-registration-report.pdf");
} catch (error) {
    showPigError("Unable to download the PDF report.", error);
}

}

/* =========================================================
EXPOSE FUNCTIONS USED BY HTML BUTTONS
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

/* =========================================================
INITIALISATION
========================================================= */

async function initialisePigRegistration() {
updateRegistrationTypeUI();

const farmName = await getRegisteredFarmName();
document.querySelectorAll("[data-farm-name]").forEach(element => {
    element.textContent = farmName;
});

await Promise.all([loadPigs(), loadPigGroups()]);

}

if (document.readyState === "loading") {
document.addEventListener("DOMContentLoaded", initialisePigRegistration, { once: true });
} else {
initialisePigRegistration();
}