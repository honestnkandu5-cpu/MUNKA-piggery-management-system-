// =====================================
// MUNKA PIGGERY
// SUPER ADMIN - FARM MANAGEMENT
// FARM + OWNER ASSIGNMENT + SUBSCRIPTION
// SECURED WITH MFA / AAL2
// =====================================

let editingFarmID = null;
let allFarms = [];
let allOwners = [];


// =====================================
// SECURITY STATE
// =====================================

let farmManagementSecurityVerified = false;


// =====================================
// SAFE SIGN OUT
// =====================================

async function safeFarmManagementSignOut() {

    try {

        if (
            typeof supabaseClient !== "undefined" &&
            supabaseClient?.auth
        ) {

            await supabaseClient.auth.signOut();

        }

    } catch (error) {

        console.error(
            "SECURE SIGN OUT ERROR:",
            error
        );

    }

}


// =====================================
// REDIRECT TO LOGIN
// =====================================

function redirectToLogin() {

    window.location.replace(
        "login.html"
    );

}


// =====================================
// CHECK SUPER ADMIN + MFA
// =====================================

async function checkSuperAdmin() {

    try {

        if (
            typeof supabaseClient === "undefined" ||
            !supabaseClient?.auth
        ) {

            console.error(
                "Supabase client is not available."
            );

            redirectToLogin();

            return false;
        }


        // =================================
        // CHECK SESSION
        // =================================

        const {
            data: {
                session
            },
            error: sessionError
        } =
            await supabaseClient.auth.getSession();


        if (
            sessionError ||
            !session
        ) {

            console.warn(
                "No active session."
            );

            await safeFarmManagementSignOut();

            redirectToLogin();

            return false;
        }


        // =================================
        // LOAD USER PROFILE
        // =================================

        const {
            data: user,
            error: userError
        } =
            await supabaseClient
                .from("users")
                .select("*")
                .eq(
                    "auth_user_id",
                    session.user.id
                )
                .single();


        if (
            userError ||
            !user
        ) {

            console.error(
                "USER PROFILE ERROR:",
                userError
            );

            alert(
                "Your user profile could not be verified."
            );

            await safeFarmManagementSignOut();

            redirectToLogin();

            return false;
        }


        // =================================
        // CHECK ROLE
        // =================================

        const userRole =
            String(
                user.role || ""
            )
                .trim()
                .toLowerCase();


        if (
            userRole !==
            "super admin"
        ) {

            alert(
                "Access denied. Super Admin access is required."
            );

            await safeFarmManagementSignOut();

            redirectToLogin();

            return false;
        }


        // =================================
        // CHECK STATUS
        // =================================

        const userStatus =
            String(
                user.status || ""
            )
                .trim()
                .toLowerCase();


        if (
            userStatus !==
            "active"
        ) {

            alert(
                "Your Super Admin account is not active."
            );

            await safeFarmManagementSignOut();

            redirectToLogin();

            return false;
        }


        // =================================
        // CHECK MFA / AAL2
        // =================================

        const {
            data: aalData,
            error: aalError
        } =
            await supabaseClient.auth.mfa
                .getAuthenticatorAssuranceLevel();


        if (aalError) {

            console.error(
                "MFA ASSURANCE LEVEL ERROR:",
                aalError
            );

            alert(
                "Multi-Factor Authentication could not be verified."
            );

            await safeFarmManagementSignOut();

            redirectToLogin();

            return false;
        }


        const currentLevel =
            aalData?.currentLevel;


        if (
            currentLevel !==
            "aal2"
        ) {

            alert(
                "Multi-Factor Authentication is required to access Farm Management."
            );

            await safeFarmManagementSignOut();

            redirectToLogin();

            return false;
        }


        // =================================
        // SECURITY VERIFIED
        // =================================

        farmManagementSecurityVerified =
            true;


        console.log(
            "Farm Management security verified: Super Admin + Active + MFA AAL2."
        );


        return true;

    } catch (error) {

        console.error(
            "SUPER ADMIN SECURITY CHECK ERROR:",
            error
        );

        await safeFarmManagementSignOut();

        redirectToLogin();

        return false;
    }

}


// =====================================
// SECURITY GUARD
// =====================================

function ensureFarmManagementSecurity() {

    if (
        !farmManagementSecurityVerified
    ) {

        alert(
            "Security verification required. Please log in again."
        );

        redirectToLogin();

        return false;
    }

    return true;
}


// =====================================
// LOAD FARMS
// =====================================

async function loadFarms() {

    if (
        !ensureFarmManagementSecurity()
    ) return;

    const farmList =
        document.getElementById(
            "farmList"
        );

    if (!farmList) return;

    farmList.innerHTML =
        "<p>Loading farms...</p>";


    const {
        data,
        error
    } =
        await supabaseClient
            .from("farms")
            .select("*")
            .order(
                "id",
                {
                    ascending: true
                }
            );


    if (error) {

        console.error(
            "LOAD FARMS ERROR:",
            error
        );

        farmList.innerHTML =
            "<p>Unable to load farms.</p>";

        return;
    }


    allFarms =
        data || [];


    populateFarmDropdown();


    if (
        allFarms.length === 0
    ) {

        farmList.innerHTML =
            "<p>No farms have been registered.</p>";

        return;
    }


    farmList.innerHTML =
        "";


    allFarms.forEach(
        farm => {

            const card =
                document.createElement(
                    "div"
                );

            card.className =
                "farm-card";


            const farmStatus =
                farm.status === "Active"
                    ? "active"
                    : "inactive";


            const statusText =
                farm.status ||
                "N/A";


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


            if (
                farm.subscription_end
            ) {

                const now =
                    new Date();


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


                if (
                    daysRemaining > 0
                ) {

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
                        Number(
                            owner.farm_id
                        ) ===
                        Number(
                            farm.id
                        )
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


            farmList.appendChild(
                card
            );

        }
    );

}


// =====================================
// POPULATE FARM DROPDOWN
// =====================================

function populateFarmDropdown() {

    const dropdown =
        document.getElementById(
            "existingFarm"
        );


    if (!dropdown) return;


    dropdown.innerHTML = `

        <option value="">

            -- Select Existing Farm --

        </option>

    `;


    allFarms.forEach(
        farm => {

            const option =
                document.createElement(
                    "option"
                );


            option.value =
                farm.id;


            option.textContent =
                farm.farm_name ||
                `Farm ID ${farm.id}`;


            dropdown.appendChild(
                option
            );

        }
    );

}


// =====================================
// LOAD OWNER / ADMIN USERS
// =====================================

async function loadOwners() {

    if (
        !ensureFarmManagementSecurity()
    ) return;


    const {
        data,
        error
    } =
        await supabaseClient
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


    allOwners =
        data || [];


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


    allOwners.forEach(
        owner => {

            const option =
                document.createElement(
                    "option"
                );


            option.value =
                owner.id;


            let ownerName =
                owner.full_name ||
                owner.username ||
                "Unnamed User";


            let farmText =
                "No farm assigned";


            if (
                owner.farm_id
            ) {

                const assignedFarm =
                    allFarms.find(
                        farm =>
                            Number(
                                farm.id
                            ) ===
                            Number(
                                owner.farm_id
                            )
                    );


                if (
                    assignedFarm
                ) {

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


            dropdown.appendChild(
                option
            );

        }
    );

}


// =====================================
// SELECT EXISTING FARM
// =====================================

function selectExistingFarm() {

    if (
        !ensureFarmManagementSecurity()
    ) return;


    const dropdown =
        document.getElementById(
            "existingFarm"
        );


    const selectedID =
        Number(
            dropdown.value
        );


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


    const assignedOwner =
        allOwners.find(
            owner =>
                Number(
                    owner.farm_id
                ) ===
                Number(
                    farm.id
                )
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

    if (
        !ensureFarmManagementSecurity()
    ) return;


    const farmName =
        document
            .getElementById(
                "farmName"
            )
            .value
            .trim();


    const ownerName =
        document
            .getElementById(
                "ownerName"
            )
            .value
            .trim();


    const phone =
        document
            .getElementById(
                "farmPhone"
            )
            .value
            .trim();


    const email =
        document
            .getElementById(
                "farmEmail"
            )
            .value
            .trim();


    const location =
        document
            .getElementById(
                "farmLocation"
            )
            .value
            .trim();


    const status =
        document.getElementById(
            "farmStatus"
        ).value;


    if (!farmName) {

        alert(
            "Please enter the farm name."
        );

        return;
    }


    const {
        data: existingFarm,
        error: duplicateError
    } =
        await supabaseClient
            .from("farms")
            .select(
                "id, farm_name"
            )
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


    const subscriptionStart =
        new Date();


    const subscriptionEnd =
        new Date(
            subscriptionStart
        );


    subscriptionEnd.setDate(
        subscriptionEnd.getDate() +
        30
    );


    const {
        data: newFarm,
        error
    } =
        await supabaseClient
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


    const ownerDropdown =
        document.getElementById(
            "farmOwnerUser"
        );


    const ownerID =
        ownerDropdown
            ? Number(
                ownerDropdown.value
            )
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

    if (
        !ensureFarmManagementSecurity()
    ) return false;


    if (
        !ownerID ||
        !farmID
    ) {

        return false;
    }


    const owner =
        allOwners.find(
            item =>
                Number(
                    item.id
                ) ===
                Number(
                    ownerID
                )
        );


    const farm =
        allFarms.find(
            item =>
                Number(
                    item.id
                ) ===
                Number(
                    farmID
                )
        );


    if (
        !owner ||
        !farm
    ) {

        console.error(
            "OWNER OR FARM NOT FOUND"
        );

        return false;
    }


    if (
        owner.farm_id &&
        Number(
            owner.farm_id
        ) !==
        Number(
            farmID
        )
    ) {

        const oldFarm =
            allFarms.find(
                item =>
                    Number(
                        item.id
                    ) ===
                    Number(
                        owner.farm_id
                    )
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
    } =
        await supabaseClient
            .from("users")
            .update({

                farm_id:
                    Number(
                        farmID
                    )

            })
            .eq(
                "id",
                Number(
                    ownerID
                )
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

async function editFarm(
    id
) {

    if (
        !ensureFarmManagementSecurity()
    ) return;


    const farm =
        allFarms.find(
            item =>
                Number(
                    item.id
                ) ===
                Number(
                    id
                )
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


    const assignedOwner =
        allOwners.find(
            owner =>
                Number(
                    owner.farm_id
                ) ===
                Number(
                    farm.id
                )
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

    if (
        !ensureFarmManagementSecurity()
    ) return;


    const farmName =
        document
            .getElementById(
                "farmName"
            )
            .value
            .trim();


    const ownerName =
        document
            .getElementById(
                "ownerName"
            )
            .value
            .trim();


    const phone =
        document
            .getElementById(
                "farmPhone"
            )
            .value
            .trim();


    const email =
        document
            .getElementById(
                "farmEmail"
            )
            .value
            .trim();


    const location =
        document
            .getElementById(
                "farmLocation"
            )
            .value
            .trim();


    const status =
        document.getElementById(
            "farmStatus"
        ).value;


    if (!farmName) {

        alert(
            "Please enter the farm name."
        );

        return;
    }


    const {
        error
    } =
        await supabaseClient
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


    const ownerDropdown =
        document.getElementById(
            "farmOwnerUser"
        );


    const selectedOwnerID =
        ownerDropdown
            ? Number(
                ownerDropdown.value
            )
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

    if (
        !ensureFarmManagementSecurity()
    ) return;


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
    } =
        await supabaseClient
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

async function renewSubscription(
    id
) {

    if (
        !ensureFarmManagementSecurity()
    ) return;


    const {
        data: farm,
        error: farmError
    } =
        await supabaseClient
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


    if (
        choice === null
    ) return;


    const days =
        Number(
            choice
        );


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
            new Date(
                now
            );


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
    } =
        await supabaseClient
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

    if (
        !ensureFarmManagementSecurity()
    ) return;


    const fields = [

        "farmName",
        "ownerName",
        "farmPhone",
        "farmEmail",
        "farmLocation"

    ];


    fields.forEach(
        id => {

            const element =
                document.getElementById(
                    id
                );


            if (element) {

                element.value = "";

            }

        }
    );


    const farmStatus =
        document.getElementById(
            "farmStatus"
        );


    if (farmStatus) {

        farmStatus.value =
            "Active";

    }


    const existingFarm =
        document.getElementById(
            "existingFarm"
        );


    if (existingFarm) {

        existingFarm.value =
            "";

    }


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


    const saveButton =
        document.getElementById(
            "saveFarmButton"
        );


    if (saveButton) {

        saveButton.textContent =
            "Add Farm";

    }

}


// =====================================
// SAVE FARM
// =====================================

async function saveFarm() {

    if (
        !ensureFarmManagementSecurity()
    ) return;


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

function escapeHTML(
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


// =====================================
// ESCAPE JAVASCRIPT
// =====================================

function escapeJS(
    value
) {

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

        console.log(
            "Initializing Farm Management security..."
        );


        const allowed =
            await checkSuperAdmin();


        if (!allowed) {

            return;
        }


        console.log(
            "Farm Management access verified."
        );


        // =================================
        // LOAD FARMS FIRST
        // =================================

        await loadFarms();


        // =================================
        // LOAD OWNER / ADMIN USERS
        // =================================

        await loadOwners();


        // =================================
        // REFRESH FARM CARDS
        // NOW THAT OWNERS ARE LOADED
        // =================================

        await loadFarms();


        console.log(
            "Farm Management initialized successfully."
        );

    }
);