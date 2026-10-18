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

    if (!user || user.farm_id == null || user.farm_id === "") {
        return null;
    }

    return user.farm_id;
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

// Correct HTML escaping.
// The previous version contained malformed replacement values.
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

function hasPigPermission(permission) {
    const functions = {
        view: "canView",
        add: "canAdd",
        edit: "canEdit",
        delete: "canDelete",
        report: "canReport"
    };

    const functionName = functions[permission];

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
        console.error("Activity log error:", error);
    }
}

function showPigError(message, error) {
    console.error(message, error);

    alert(
        message +
        "\n\n" +
        (error?.message || "Please try again.")
    );
}

// ==========================================================
// REGISTRATION DATE
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
        label.textContent =
            type === "purchase" ? "Purchase Date" : "Arrival Date";
    }
}

// ==========================================================
// SAVE OR UPDATE INDIVIDUAL PIG
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

        if (
            !pigID ||
            !breed ||
            !category ||
            !farrowDate ||
            !source ||
            !weightValue ||
            !healthStatus
        ) {
            alert("Please complete all required fields.");
            return;
        }

        if (!isEditing && registrationType === "purchase" &&
            !registrationDate) {
            alert("Please enter the purchase date.");
            return;
        }

        if (!isEditing && registrationType === "arrival") {
            alert(
                "Transfer/arrival tracking is not yet connected. " +
                "No record was saved."
            );
            return;
        }

        if (!isEditing && registrationType === "birth") {
            alert(
                "Please record farm births through the Farrowing module " +
                "to avoid counting the same pig twice."
            );
            return;
        }

        const weight = Number(weightValue);

        if (!Number.isFinite(weight) || weight < 0) {
            alert("Please select a valid weight.");
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

                await logPigActivity(
                    user,
                    "Updated",
                    `Updated pig ${pigID}`
                );

                setPigStatus("pigStatusMessage", "Pig record updated.");

                clearForm();
                await loadPigs();
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

            // Record purchase movement when required.
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

                    setPigStatus(
                        "pigStatusMessage",
                        "Pig saved, but purchase tracking failed. Do not register it again.",
                        true
                    );

                    await loadPigs();

                    alert(
                        "The pig was saved, but its purchase movement failed.\n\n" +
                        "Pig ID: " + insertedPig.pig_id + "\n" +
                        "Do not register this pig again. Please report this error."
                    );

                    return;
                }
            }

            await logPigActivity(
                user,
                "Added",
                `Registered pig ${pigID}; category ${category}; type ${registrationType}`
            );

            setPigStatus(
                "pigStatusMessage",
                registrationType === "purchase"
                    ? "Pig and purchase details saved successfully."
                    : "Pig record saved successfully."
            );

            clearForm();
            await loadPigs();

        } catch (error) {
            setPigStatus(
                "pigStatusMessage",
                error.message || "Unable to save pig.",
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
            actions +=
                `<button type="button" onclick="editPig(${Number(pig.id)})">Edit</button> `;
        }

        if (hasPigPermission("delete")) {
            actions +=
                `<button type="button" onclick="deletePig(${Number(pig.id)})">Delete</button>`;
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
        document.getElementById("healthStatus").value =
            data.health_status || "";

        document.getElementById("registrationType").value = "existing";
        document.getElementById("registrationDate").value = "";

        updateRegistrationTypeUI();

        editID = id;

        const button = pigForm.querySelector('button[type="submit"]');

        if (button) button.textContent = "💾 Update Pig Record";

        window.scrollTo({ top: 0, behavior: "smooth" });

    } catch (error) {
        showPigError("Unable to open this pig record.", error);
    }
}

// ==========================================================
// DELETE INDIVIDUAL PIG
// ==========================================================

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

        await logPigActivity(
            user,
            "Deleted",
            `Deleted pig ${pig.pig_id || id}`
        );

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
        showPigError("Unable to search pig records.", error);
    }
}

// ==========================================================
// CLEAR INDIVIDUAL FORM
// ==========================================================

function clearForm() {
    pigForm?.reset();

    editID = null;

    const button = pigForm?.querySelector('button[type="submit"]');

    if (button) {
        button.textContent = "💾 Save Pig Record";
    }

    const date = document.getElementById("registrationDate");

    if (date) date.value = "";

    updateRegistrationTypeUI();
    setPigStatus("pigStatusMessage", "");
}

// ==========================================================
// SAVE OR UPDATE PIGLET / WEANER GROUP
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
        const averageWeightValue = value("groupWeight");

        const averageWeight = averageWeightValue === ""
            ? null
            : Number(averageWeightValue);

        if (!groupName || !["piglet", "weaner"].includes(category)) {
            alert("Enter a group name and select Piglets or Weaners.");
            return;
        }

        if (!Number.isInteger(quantity) || quantity < 1) {
            alert("Enter a whole number of pigs greater than zero.");
            return;
        }

        if (
            averageWeight !== null &&
            (!Number.isFinite(averageWeight) || averageWeight < 0)
        ) {
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
                `${isEditing ? "Updated" : "Registered"} group ${groupName}; quantity ${quantity}`
            );

            setPigStatus("groupStatusMessage", "Group saved successfully.");

            clearGroupForm();
            await loadPigGroups();

        } catch (error) {
            setPigStatus(
                "groupStatusMessage",
                error.message || "Unable to save group.",
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
    });
}

// ==========================================================
// LOAD / DISPLAY GROUPS
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

    if (farmID == null) return;

    try {
        const { data, error } = await supabaseClient
            .from("pig_groups")
            .select("*")
            .eq("farm_id", farmID)
            .order("id", { ascending: true });

        if (error) throw error;

        displayPigGroups(data || []);

    } catch (error) {
        console.error("Load groups error:", error);

        table.innerHTML =
            '<tr><td colspan="8">Unable to load groups. Please try again.</td></tr>';
    }
}

function displayPigGroups(groups) {
    const table = document.getElementById("groupTable");

    if (!table) return;

    table.innerHTML = "";

    if (!groups.length) {
        table.innerHTML =
            '<tr><td colspan="8">No groups registered yet.</td></tr>';
        return;
    }

    groups.forEach(group => {
        let actions = "";

        if (hasPigPermission("edit")) {
            actions +=
                `<button type="button" onclick="editPigGroup(${Number(group.id)})">Edit</button> `;
        }

        if (hasPigPermission("delete")) {
            actions +=
                `<button type="button" onclick="deletePigGroup(${Number(group.id)})">Delete</button>`;
        }

        if (!actions) actions = "No actions";

        const row = document.createElement("tr");

        row.innerHTML = `
            <td>${escapePigHTML(group.group_name)}</td>
            <td>${escapePigHTML(group.category)}</td>
            <td>${escapePigHTML(group.quantity)}</td>
            <td>${escapePigHTML(group.breed || "")}</td>
            <td>${escapePigHTML(group.sex || "Mixed")}</td>
            <td>${group.average_weight == null ? "" : escapePigHTML(group.average_weight) + " Kg"}</td>
            <td>${escapePigHTML(group.pen_name || "")}</td>
            <td>${actions}</td>
        `;

        table.appendChild(row);
    });
}

// ==========================================================
// EDIT GROUP
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

        document.getElementById("groupName").value = data.group_name || "";
        document.getElementById("groupCategory").value =
            String(data.category || "").toLowerCase().startsWith("piglet")
                ? "piglet"
                : "weaner";

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

        groupForm.scrollIntoView({ behavior: "smooth", block: "start" });

    } catch (error) {
        showPigError("Unable to open the group.", error);
    }
}

// ==========================================================
// DELETE GROUP
// ==========================================================

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
            .select("group_name,quantity,category")
            .eq("id", id)
            .eq("farm_id", farmID)
            .single();

        if (fetchError) throw fetchError;

        if (!confirm(
            `Delete group "${group.group_name}" containing ${group.quantity} pigs?`
        )) return;

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

        await loadPigGroups();

        setPigStatus("groupStatusMessage", "Group deleted.");

    } catch (error) {
        showPigError("Unable to delete the group.", error);
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
// GENERATE REPORT
// ==========================================================

async function generateReport() {
    if (!hasPigPermission("report")) {
        alert("You do not have permission to generate reports.");
        return;
    }

    const farmID = getFarmID();

    if (farmID == null) return;

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
            counts.Sow + counts["Pregnant Sow"] + counts["Lactating Sow"];

        const report = [
            "PIG REGISTRATION REPORT",
            "",
            `Individual pig records: ${(pigResult.data || []).length}`,
            `Individual piglets: ${counts.Piglet}`,
            `Individual weaners: ${counts.Weaner}`,
            `Piglets in groups: ${groupPiglets}`,
            `Weaners in groups: ${groupWeaners}`,
            `Growers: ${counts.Grower}`,
            `Boars: ${counts.Boar}`,
            `Total sows: ${totalSows}`,
            `Unassigned records: ${counts.Unassigned}`,
            "",
            "Group quantities are reported separately from individual records."
        ].join("\n");

        alert(report);

    } catch (error) {
        showPigError("Unable to generate the report.", error);
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

        let restored = false;

        const restore = () => {
            if (restored) return;
            restored = true;

            if (nameElement) nameElement.textContent = originalName;
            if (brand) brand.style.display = "";
            if (subtitle) subtitle.style.display = "";
            if (label) label.style.display = "";
            if (icon) icon.style.display = "";

            header.classList.remove("printing-farm-header");
            style.remove();

            window.removeEventListener("afterprint", restore);
        };

        window.addEventListener("afterprint", restore);
        window.print();

    } catch (error) {
        showPigError("Unable to prepare the print report.", error);
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

    if (farmID == null || !user) return;

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

        doc.setFontSize(20);
        doc.setFont("helvetica", "bold");
        doc.text(farmName, 148, 18, { align: "center" });

        doc.setFontSize(14);
        doc.text("PIG REGISTRATION REPORT", 148, 29, { align: "center" });

        const generatedDate = new Date().toLocaleString("en-ZM", {
            timeZone: "Africa/Lusaka"
        });

        doc.setFontSize(9);
        doc.setFont("helvetica", "normal");

        doc.text("Generated: " + generatedDate, 14, 39);
        doc.text("Generated by: " + (user.full_name || "System User"), 14, 45);
        doc.text("Individual pig records: " + (data || []).length, 14, 51);

        const rows = (data || []).map(pig => [
            pig.pig_id || "",
            pig.breed || "",
            pig.category || "Not assigned",
            pig.farrow_date || "",
            pig.source || "",
            pig.weight == null ? "" : pig.weight + " Kg",
            pig.health_status || ""
        ]);

        // Check that the AutoTable plugin loaded successfully.
        if (typeof doc.autoTable !== "function") {
            throw new Error("The PDF table plugin did not load. Refresh the page and try again.");
        }

        doc.autoTable({
            startY: 57,
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

        const date = new Date().toLocaleDateString("en-CA", {
            timeZone: "Africa/Lusaka"
        });

        const fileName =
            farmName.replace(/[^a-z0-9]/gi, "_") +
            "_Pig_Registration_" +
            date +
            ".pdf";

        doc.save(fileName);

    } catch (error) {
        showPigError("Unable to download the PDF report.", error);
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

// Registration type selector
const registrationTypeInput =
    document.getElementById("registrationType");

if (registrationTypeInput) {
    registrationTypeInput.addEventListener(
        "change",
        updateRegistrationTypeUI
    );
}

// Live search
const searchPigInput = document.getElementById("searchPig");

if (searchPigInput) {
    searchPigInput.addEventListener("input", searchPig);
}

// Make HTML onclick handlers work reliably.
window.clearForm = clearForm;
window.clearGroupForm = clearGroupForm;
window.searchPig = searchPig;
window.editPig = editPig;
window.deletePig = deletePig;
window.editPigGroup = editPigGroup;
window.deletePigGroup = deletePigGroup;
window.generateReport = generateReport;
window.printReport = printReport;
window.downloadPDF = downloadPDF;