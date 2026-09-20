// =====================================
// MUNKA PIGGERY
// SUPER ADMIN - FARM MANAGEMENT
// FARM + OWNER ASSIGNMENT + SUBSCRIPTION
// =====================================

let editingFarmID = null;
let allFarms = [];
let allOwners = [];


// =====================================
// CHECK SUPER ADMIN
// =====================================

async function checkSuperAdmin() {

    const {
        data: { session },
        error
    } = await supabaseClient.auth.getSession();

    if (error || !session) {

        window.location.href = "login.html";

        return false;
    }

    const {
        data: user,
        error: userError
    } = await supabaseClient
        .from("users")
        .select("*")
        .eq("auth_user_id", session.user.id)
        .single();

    if (
        userError ||
        !user ||
        user.role !== "Super Admin" ||
        user.status !== "Active"
    ) {

        alert("Access denied.");

        window.location.href = "login.html";

        return false;
    }

    return true;
}


// =====================================
// LOAD FARMS
// =====================================

async function loadFarms() {

    const farmList =
        document.getElementById("farmList");

    if (!farmList) return;

    farmList.innerHTML =
        "<p>Loading farms...</p>";

    const {
        data,
        error
    } = await supabaseClient
        .from("farms")
        .select("*")
        .order("id", {
            ascending: true
        });

    if (error) {

        console.error(
            "LOAD FARMS ERROR:",
            error
        );

        farmList.innerHTML =
            "<p>Unable to load farms.</p>";

        return;
    }

    allFarms = data || [];

    populateFarmDropdown();

    if (allFarms.length === 0) {

        farmList.innerHTML =
            "<p>No farms have been registered.</p>";

        return;
    }

    farmList.innerHTML = "";

    allFarms.forEach(farm => {

        const card =
            document.createElement("div");

        card.className =
            "farm-card";

        const farmStatus =
            farm.status === "Active"
                ? "active"
                : "inactive";

        const statusText =
            farm.status || "N/A";


        // =================================
        // SUBSCRIPTION
        // =================================

        let subscriptionText =
            "No subscription date";

        let subscriptionClass =
            "subscription-warning";

        let daysRemainingText =
            "Not available";

        let formattedStart =
            "N/A";

        let formattedEnd =
            "N/A";

        if (farm.subscription_end) {

            const now = new Date();

            const endDate =
                new Date(
                    farm.subscription_end
                );

            const startDate =
                farm.subscription_start
                    ? new Date(
                        farm.subscription_start
                    )
                    : null;

            const difference =
                endDate.getTime() -
                now.getTime();

            const daysRemaining =
                Math.ceil(
                    difference /
                    (
                        1000 *
                        60 *
                        60 *
                        24
                    )
                );

            if (daysRemaining > 0) {

                subscriptionText =
                    "Active subscription";

                subscriptionClass =
                    "subscription-active";

                daysRemainingText =
                    daysRemaining +
                    (
                        daysRemaining === 1
                            ? " day remaining"
                            : " days remaining"
                    );

            } else {

                subscriptionText =
                    "Expired";

                subscriptionClass =
                    "subscription-expired";

                daysRemainingText =
                    "Subscription expired";
            }

            formattedStart =
                startDate
                    ? startDate.toLocaleDateString(
                        "en-ZM",
                        {
                            day: "2-digit",
                            month: "long",
                            year: "numeric"
                        }
                    )
                    : "N/A";

            formattedEnd =
                endDate.toLocaleDateString(
                    "en-ZM",
                    {
                        day: "2-digit",
                        month: "long",
                        year: "numeric"
                    }
                );
        }


        // =================================
        // FIND ASSIGNED OWNER
        // =================================

        const assignedOwner =
            allOwners.find(
                owner =>
                    Number(owner.farm_id) ===
                    Number(farm.id)
            );


        const assignedOwnerText =
            assignedOwner
                ? `${assignedOwner.full_name || assignedOwner.username} (${assignedOwner.username})`
                : "No Owner/Admin assigned";


        const ownerAssignmentClass =
            assignedOwner
                ? "owner-assigned"
                : "owner-not-assigned";


        // =================================
        // FARM CARD
        // =================================

        card.innerHTML = `

            <h2>

                ${escapeHTML(
                    farm.farm_name ||
                    "Unnamed Farm"
                )}

            </h2>


            <p>

                <strong>Farm ID:</strong>
                ${farm.id}

            </p>


            <p>

                <strong>Farm Owner:</strong>
                ${escapeHTML(
                    farm.owner_name ||
                    "N/A"
                )}

            </p>


            <p>

                <strong>Assigned Owner/Admin:</strong>

                <span class="${ownerAssignmentClass}">

                    ${escapeHTML(
                        assignedOwnerText
                    )}

                </span>

            </p>


            <p>

                <strong>Phone:</strong>

                ${escapeHTML(
                    farm.phone ||
                    "N/A"
                )}

            </p>


            <p>

                <strong>Email:</strong>

                ${escapeHTML(
                    farm.email ||
                    "N/A"
                )}

            </p>


            <p>

                <strong>Location:</strong>

                ${escapeHTML(
                    farm.location ||
                    "N/A"
                )}

            </p>


            <p>

                <strong>Farm Status:</strong>

                <span class="farm-status ${farmStatus}">

                    ${escapeHTML(
                        statusText
                    )}

                </span>

            </p>


            <div class="subscription-box">

                <h3>
                    Subscription
                </h3>


                <p>

                    <strong>Status:</strong>

                    <span class="${subscriptionClass}">

                        ${subscriptionText}

                    </span>

                </p>


                <p>

                    <strong>Start Date:</strong>

                    ${formattedStart}

                </p>


                <p>

                    <strong>Expiry Date:</strong>

                    ${formattedEnd}

                </p>


                <p>

                    <strong>Time Remaining:</strong>

                    ${daysRemainingText}

                </p>

            </div>


            <div class="farm-actions">

                <button
                    class="edit-btn"
                    onclick="editFarm(${farm.id})">

                    Edit

                </button>


                <button
                    class="status-btn"
                    onclick="toggleFarmStatus(
                        ${farm.id},
                        '${escapeJS(farm.status)}'
                    )">

                    ${
                        farm.status === "Active"
                            ? "Deactivate"
                            : "Activate"
                    }

                </button>


                <button
                    class="renew-btn"
                    onclick="renewSubscription(${farm.id})">

                    ${
                        farm.status === "Active"
                            ? "Renew Subscription"
                            : "Start Subscription"
                    }

                </button>

            </div>

        `;

        farmList.appendChild(card);

    });
}


// =====================================
// LOAD OWNER / ADMIN USERS
// =====================================

async function loadOwners() {

    const {
        data,
        error
    } = await supabaseClient
        .from("users")
        .select(
            `
            id,
            userID,
            full_name,
            username,
            email,
            role,
            status,
            farm_id
            `
        )
        .in(
            "role",
            [
                "Owner/Admin"
            ]
        )
        .order(
            "full_name",
            {
                ascending: true
            }
        );

    if (error) {

        console.error(
            "LOAD OWNER USERS ERROR:",
            error
        );

        alert(
            "Unable to load registered Owner/Admin users.\n\n" +
            error.message
        );

        return;
    }

    allOwners = data || [];

    populateOwnerDropdown();
}


// =====================================
// POPULATE OWNER DROPDOWN
// =====================================

function populateOwnerDropdown() {

    const dropdown =
        document.getElementById(
            "farmOwnerUser"
        );

    if (!dropdown) return;

    dropdown.innerHTML = `

        <option value="">

            -- Select registered Owner/Admin --

        </option>

    `;


    allOwners.forEach(owner => {

        const option =
            document.createElement("option");

        option.value =
            owner.id;

        let ownerName =
            owner.full_name ||
            owner.username ||
            "Unnamed User";

        let farmText =
            "No farm assigned";

        if (owner.farm_id) {

            const assignedFarm =
                allFarms.find(
                    farm =>
                        Number(farm.id) ===
                        Number(owner.farm_id)
                );

            if (assignedFarm) {

                farmText =
                    "Assigned to: " +
                    assignedFarm.farm_name;

            } else {

                farmText =
                    "Assigned to Farm ID " +
                    owner.farm_id;
            }
        }

        option.textContent =
            ownerName +
            " | @" +
            owner.username +
            " | " +
            farmText;

        dropdown.appendChild(option);

    });
}


// =====================================
// SELECT EXISTING FARM
// =====================================

function selectExistingFarm() {

    const dropdown =
        document.getElementById(
            "existingFarm"
        );

    const selectedID =
        Number(dropdown.value);

    if (!selectedID) {

        clearFarmForm();

        return;
    }

    const farm =
        allFarms.find(
            item =>
                Number(item.id) ===
                selectedID
        );

    if (!farm) return;


    document.getElementById(
        "farmName"
    ).value =
        farm.farm_name || "";


    document.getElementById(
        "ownerName"
    ).value =
        farm.owner_name || "";


    document.getElementById(
        "farmPhone"
    ).value =
        farm.phone || "";


    document.getElementById(
        "farmEmail"
    ).value =
        farm.email || "";


    document.getElementById(
        "farmLocation"
    ).value =
        farm.location || "";


    document.getElementById(
        "farmStatus"
    ).value =
        farm.status || "Active";


    // =================================
    // SELECT ASSIGNED OWNER
    // =================================

    const assignedOwner =
        allOwners.find(
            owner =>
                Number(owner.farm_id) ===
                Number(farm.id)
        );

    const ownerDropdown =
        document.getElementById(
            "farmOwnerUser"
        );

    if (ownerDropdown) {

        ownerDropdown.value =
            assignedOwner
                ? assignedOwner.id
                : "";

    }


    editingFarmID =
        farm.id;


    document.getElementById(
        "saveFarmButton"
    ).textContent =
        "Update Farm";


    window.scrollTo({
        top: 0,
        behavior: "smooth"
    });
}


// =====================================
// ADD FARM
// =====================================

async function addFarm() {

    const farmName =
        document
            .getElementById("farmName")
            .value
            .trim();

    const ownerName =
        document
            .getElementById("ownerName")
            .value
            .trim();

    const phone =
        document
            .getElementById("farmPhone")
            .value
            .trim();

    const email =
        document
            .getElementById("farmEmail")
            .value
            .trim();

    const location =
        document
            .getElementById("farmLocation")
            .value
            .trim();

    const status =
        document
            .getElementById("farmStatus")
            .value;


    if (!farmName) {

        alert(
            "Please enter the farm name."
        );

        return;
    }


    // =================================
    // CHECK DUPLICATE FARM NAME
    // =================================

    const {
        data: existingFarm,
        error: duplicateError
    } = await supabaseClient
        .from("farms")
        .select("id, farm_name")
        .ilike(
            "farm_name",
            farmName
        )
        .limit(1);


    if (duplicateError) {

        console.error(
            "DUPLICATE CHECK ERROR:",
            duplicateError
        );
    }


    if (
        existingFarm &&
        existingFarm.length > 0
    ) {

        alert(
            "A farm with this name already exists."
        );

        return;
    }


    // =================================
    // NEW FARM = 30 DAYS
    // =================================

    const subscriptionStart =
        new Date();

    const subscriptionEnd =
        new Date(
            subscriptionStart
        );

    subscriptionEnd.setDate(
        subscriptionEnd.getDate() + 30
    );


    const {
        data: newFarm,
        error
    } = await supabaseClient
        .from("farms")
        .insert({

            farm_name:
                farmName,

            owner_name:
                ownerName ||
                null,

            phone:
                phone ||
                null,

            email:
                email ||
                null,

            location:
                location ||
                null,

            status:
                status,

            subscription_start:
                subscriptionStart.toISOString(),

            subscription_end:
                subscriptionEnd.toISOString()

        })
        .select()
        .single();


    if (error) {

        console.error(
            "ADD FARM ERROR:",
            error
        );

        alert(
            "Unable to add farm.\n\n" +
            error.message
        );

        return;
    }


    // =================================
    // ASSIGN OWNER IF SELECTED
    // =================================

    const ownerDropdown =
        document.getElementById(
            "farmOwnerUser"
        );

    const ownerID =
        ownerDropdown
            ? Number(ownerDropdown.value)
            : 0;


    if (ownerID) {

        const assignmentResult =
            await assignOwnerToFarm(
                ownerID,
                newFarm.id
            );

        if (!assignmentResult) {

            alert(
                "Farm was created successfully, " +
                "but the Owner/Admin could not be assigned.\n\n" +
                "Please select the farm and assign the Owner/Admin again."
            );

        } else {

            alert(
                "Farm added successfully.\n\n" +
                "The selected Owner/Admin has been assigned to this farm.\n\n" +
                "A 30-day subscription has been started."
            );
        }

    } else {

        alert(
            "Farm added successfully.\n\n" +
            "A 30-day subscription has been started.\n\n" +
            "Important: No Owner/Admin has been assigned yet."
        );
    }


    clearFarmForm();

    await loadOwners();

    await loadFarms();
}


// =====================================
// ASSIGN OWNER TO FARM
// =====================================

async function assignOwnerToFarm(
    ownerID,
    farmID
) {

    if (!ownerID || !farmID) {

        return false;
    }


    const owner =
        allOwners.find(
            item =>
                Number(item.id) ===
                Number(ownerID)
        );


    const farm =
        allFarms.find(
            item =>
                Number(item.id) ===
                Number(farmID)
        );


    if (!owner || !farm) {

        console.error(
            "OWNER OR FARM NOT FOUND"
        );

        return false;
    }


    // =================================
    // PREVENT SAME OWNER ON DIFFERENT
    // FARM WITHOUT CONFIRMATION
    // =================================

    if (
        owner.farm_id &&
        Number(owner.farm_id) !==
        Number(farmID)
    ) {

        const oldFarm =
            allFarms.find(
                item =>
                    Number(item.id) ===
                    Number(owner.farm_id)
            );


        const oldFarmName =
            oldFarm
                ? oldFarm.farm_name
                : "another farm";


        const confirmed =
            confirm(

                owner.full_name +
                " (" +
                owner.username +
                ") is currently assigned to " +
                oldFarmName +
                ".\n\n" +

                "Do you want to move this Owner/Admin " +
                "to " +
                farm.farm_name +
                "?"

            );


        if (!confirmed) {

            return false;
        }
    }


    const {
        error
    } = await supabaseClient
        .from("users")
        .update({

            farm_id:
                Number(farmID)

        })
        .eq(
            "id",
            Number(ownerID)
        )
        .eq(
            "role",
            "Owner/Admin"
        );


    if (error) {

        console.error(
            "ASSIGN OWNER ERROR:",
            error
        );

        alert(
            "Unable to assign Owner/Admin.\n\n" +
            error.message
        );

        return false;
    }


    return true;
}


// =====================================
// EDIT FARM
// =====================================

async function editFarm(id) {

    const farm =
        allFarms.find(
            item =>
                Number(item.id) ===
                Number(id)
        );

    if (!farm) {

        alert(
            "Unable to load farm."
        );

        return;
    }


    document.getElementById(
        "existingFarm"
    ).value =
        farm.id;


    document.getElementById(
        "farmName"
    ).value =
        farm.farm_name || "";


    document.getElementById(
        "ownerName"
    ).value =
        farm.owner_name || "";


    document.getElementById(
        "farmPhone"
    ).value =
        farm.phone || "";


    document.getElementById(
        "farmEmail"
    ).value =
        farm.email || "";


    document.getElementById(
        "farmLocation"
    ).value =
        farm.location || "";


    document.getElementById(
        "farmStatus"
    ).value =
        farm.status || "Active";


    // =================================
    // SELECT ASSIGNED OWNER
    // =================================

    const assignedOwner =
        allOwners.find(
            owner =>
                Number(owner.farm_id) ===
                Number(farm.id)
        );


    const ownerDropdown =
        document.getElementById(
            "farmOwnerUser"
        );


    if (ownerDropdown) {

        ownerDropdown.value =
            assignedOwner
                ? assignedOwner.id
                : "";

    }


    editingFarmID =
        farm.id;


    document.getElementById(
        "saveFarmButton"
    ).textContent =
        "Update Farm";


    window.scrollTo({
        top: 0,
        behavior: "smooth"
    });
}


// =====================================
// UPDATE FARM
// =====================================

async function updateFarm() {

    const farmName =
        document
            .getElementById("farmName")
            .value
            .trim();

    const ownerName =
        document
            .getElementById("ownerName")
            .value
            .trim();

    const phone =
        document
            .getElementById("farmPhone")
            .value
            .trim();

    const email =
        document
            .getElementById("farmEmail")
            .value
            .trim();

    const location =
        document
            .getElementById("farmLocation")
            .value
            .trim();

    const status =
        document
            .getElementById("farmStatus")
            .value;


    if (!farmName) {

        alert(
            "Please enter the farm name."
        );

        return;
    }


    const {
        error
    } = await supabaseClient
        .from("farms")
        .update({

            farm_name:
                farmName,

            owner_name:
                ownerName ||
                null,

            phone:
                phone ||
                null,

            email:
                email ||
                null,

            location:
                location ||
                null,

            status:
                status

        })
        .eq(
            "id",
            editingFarmID
        );


    if (error) {

        console.error(
            "UPDATE FARM ERROR:",
            error
        );

        alert(
            "Unable to update farm.\n\n" +
            error.message
        );

        return;
    }


    // =================================
    // UPDATE OWNER ASSIGNMENT
    // =================================

    const ownerDropdown =
        document.getElementById(
            "farmOwnerUser"
        );

    const selectedOwnerID =
        ownerDropdown
            ? Number(ownerDropdown.value)
            : 0;


    if (selectedOwnerID) {

        const assigned =
            await assignOwnerToFarm(
                selectedOwnerID,
                editingFarmID
            );


        if (!assigned) {

            return;
        }

    }


    alert(
        "Farm updated successfully."
    );


    clearFarmForm();

    await loadOwners();

    await loadFarms();
}


// =====================================
// ACTIVATE / DEACTIVATE
// =====================================

async function toggleFarmStatus(
    id,
    currentStatus
) {

    const newStatus =
        currentStatus === "Active"
            ? "Inactive"
            : "Active";


    const confirmed =
        confirm(
            "Change farm status to " +
            newStatus +
            "?"
        );


    if (!confirmed) return;


    const {
        error
    } = await supabaseClient
        .from("farms")
        .update({

            status:
                newStatus

        })
        .eq(
            "id",
            id
        );


    if (error) {

        console.error(
            "CHANGE FARM STATUS ERROR:",
            error
        );

        alert(
            "Unable to change farm status.\n\n" +
            error.message
        );

        return;
    }


    await loadFarms();
}


// =====================================
// RENEW SUBSCRIPTION
// =====================================

async function renewSubscription(id) {

    const {
        data: farm,
        error: farmError
    } = await supabaseClient
        .from("farms")
        .select(
            "id, farm_name, status, subscription_start, subscription_end"
        )
        .eq(
            "id",
            id
        )
        .single();


    if (
        farmError ||
        !farm
    ) {

        console.error(
            "LOAD FARM FOR RENEWAL ERROR:",
            farmError
        );

        alert(
            "Unable to load farm subscription."
        );

        return;
    }


    const choice =
        prompt(

            "Renew subscription for " +
            farm.farm_name +
            ".\n\n" +

            "Enter number of days:\n\n" +

            "30 = 1 month\n" +
            "90 = 3 months\n" +
            "180 = 6 months\n" +
            "365 = 1 year"

        );


    if (choice === null) return;


    const days =
        Number(choice);


    if (
        !Number.isInteger(days) ||
        ![
            30,
            90,
            180,
            365
        ].includes(days)
    ) {

        alert(
            "Invalid period.\n\n" +
            "Please enter 30, 90, 180, or 365."
        );

        return;
    }


    const now =
        new Date();

    let newStart =
        now;

    let newEnd;


    if (
        farm.subscription_end &&
        new Date(
            farm.subscription_end
        ) > now
    ) {

        newEnd =
            new Date(
                farm.subscription_end
            );

        newEnd.setDate(
            newEnd.getDate() +
            days
        );

    } else {

        newStart =
            now;

        newEnd =
            new Date(now);

        newEnd.setDate(
            newEnd.getDate() +
            days
        );
    }


    const confirmed =
        confirm(

            "Farm: " +
            farm.farm_name +

            "\n\n" +

            "Subscription period: " +
            days +
            " days" +

            "\n\n" +

            "New expiry date:\n" +

            newEnd.toLocaleDateString(
                "en-ZM",
                {
                    day: "2-digit",
                    month: "long",
                    year: "numeric"
                }
            ) +

            "\n\n" +

            "Continue?"

        );


    if (!confirmed) return;


    const {
        error
    } = await supabaseClient
        .from("farms")
        .update({

            subscription_start:
                newStart.toISOString(),

            subscription_end:
                newEnd.toISOString(),

            status:
                "Active"

        })
        .eq(
            "id",
            id
        );


    if (error) {

        console.error(
            "RENEW SUBSCRIPTION ERROR:",
            error
        );

        alert(
            "Unable to renew subscription.\n\n" +
            error.message
        );

        return;
    }


    alert(
        "Subscription renewed successfully."
    );


    await loadFarms();
}


// =====================================
// CLEAR FORM
// =====================================

function clearFarmForm() {

    const fields = [

        "farmName",
        "ownerName",
        "farmPhone",
        "farmEmail",
        "farmLocation"

    ];


    fields.forEach(id => {

        const element =
            document.getElementById(id);

        if (element) {

            element.value = "";

        }

    });


    document.getElementById(
        "farmStatus"
    ).value =
        "Active";


    document.getElementById(
        "existingFarm"
    ).value =
        "";


    const ownerDropdown =
        document.getElementById(
            "farmOwnerUser"
        );


    if (ownerDropdown) {

        ownerDropdown.value =
            "";

    }


    editingFarmID =
        null;


    document.getElementById(
        "saveFarmButton"
    ).textContent =
        "Add Farm";
}


// =====================================
// SAVE FARM
// =====================================

async function saveFarm() {

    if (
        editingFarmID === null
    ) {

        await addFarm();

    } else {

        await updateFarm();

    }
}


// =====================================
// ESCAPE HTML
// =====================================

function escapeHTML(value) {

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


// =====================================
// ESCAPE JAVASCRIPT
// =====================================

function escapeJS(value) {

    return String(
        value ?? ""
    )
        .replace(
            /\\/g,
            "\\\\"
        )
        .replace(
            /'/g,
            "\\'"
        )
        .replace(
            /"/g,
            '\\"'
        )
        .replace(
            /\n/g,
            "\\n"
        )
        .replace(
            /\r/g,
            "\\r"
        );
}


// =====================================
// INITIALIZE
// =====================================

document.addEventListener(
    "DOMContentLoaded",
    async function() {

        const allowed =
            await checkSuperAdmin();

        if (!allowed) return;


        // Load farms first
        await loadFarms();


        // Then load Owner/Admin users
        await loadOwners();


        // Refresh farm cards after
        // Owner/Admin information is loaded
        await loadFarms();

    }
);