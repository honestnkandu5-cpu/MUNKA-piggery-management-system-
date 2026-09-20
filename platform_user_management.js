/* ==========================================================
MUNKA PIGGERY
   PLATFORM USER MANAGEMENT
   SUPER ADMIN ONLY

   V3 VERSION
   Username uniqueness is PER FARM
========================================================== */

let currentUser = null;
let allUsers = [];
let allFarms = [];


/* ==========================================================
   CHECK SUPER ADMIN
========================================================== */

async function checkSuperAdmin() {

    try {

        const {
            data: { session },
            error
        } = await supabaseClient.auth.getSession();

        if (error || !session) {

            console.error("SESSION ERROR:", error);

            showMessage(
                "Session error: " +
                (error?.message || "Please log in again."),
                "error"
            );

            setTimeout(() => {
                window.location.href = "login.html";
            }, 2000);

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


        if (userError || !user) {

            console.error(
                "USER PROFILE ERROR:",
                userError
            );

            showMessage(
                "Unable to load Super Admin profile: " +
                (userError?.message || "Profile not found."),
                "error"
            );

            return false;
        }


        if (
            user.role !== "Super Admin" ||
            user.status !== "Active"
        ) {

            showMessage(
                "Access denied. Super Admin privileges required.",
                "error"
            );

            setTimeout(() => {
                window.location.href = "login.html";
            }, 2000);

            return false;
        }


        currentUser = user;

        return true;

    } catch (error) {

        console.error(
            "CHECK SUPER ADMIN ERROR:",
            error
        );

        showMessage(
            "Super Admin check failed: " +
            error.message,
            "error"
        );

        return false;
    }
}


/* ==========================================================
   LOAD FARMS
========================================================== */

async function loadFarms() {

    const farmSelect =
        document.getElementById("farmId");

    if (!farmSelect) return;


    farmSelect.innerHTML = `
        <option value="">
            Loading farms...
        </option>
    `;


    try {

        const {
            data,
            error
        } = await supabaseClient
            .from("farms")
            .select("id, farm_name")
            .order("farm_name", {
                ascending: true
            });


        if (error) {

            console.error(
                "LOAD FARMS ERROR:",
                error
            );

            farmSelect.innerHTML = `
                <option value="">
                    Unable to load farms
                </option>
            `;

            showMessage(
                "Unable to load farms: " +
                error.message,
                "error"
            );

            return;
        }


        allFarms = data || [];


        farmSelect.innerHTML = `
            <option value="">
                Select Farm
            </option>
        `;


        allFarms.forEach(farm => {

            const option =
                document.createElement("option");

            option.value = farm.id;

            option.textContent =
                farm.farm_name;

            farmSelect.appendChild(option);

        });


        if (!allFarms.length) {

            farmSelect.innerHTML = `
                <option value="">
                    No farms available
                </option>
            `;

            showMessage(
                "No farms were found in the farms table.",
                "error"
            );
        }

    } catch (error) {

        console.error(
            "LOAD FARMS EXCEPTION:",
            error
        );

        showMessage(
            "Farm loading error: " +
            error.message,
            "error"
        );
    }
}


/* ==========================================================
   GET FARM NAME
========================================================== */

function getFarmName(farmId) {

    const farm =
        allFarms.find(
            item =>
                String(item.id) ===
                String(farmId)
        );

    return farm
        ? farm.farm_name
        : "—";
}


/* ==========================================================
   LOAD USERS
========================================================== */

async function loadUsers() {

    const tableBody =
        document.getElementById(
            "usersTableBody"
        );


    if (tableBody) {

        tableBody.innerHTML = `
            <tr>
                <td colspan="8" class="loading">
                    Loading users...
                </td>
            </tr>
        `;
    }


    try {

        const {
            data,
            error
        } = await supabaseClient
            .from("users")
            .select("*")
            .order("full_name", {
                ascending: true
            });


        if (error) {

            console.error(
                "LOAD USERS ERROR:",
                error
            );

            showMessage(
                "Unable to load users: " +
                error.message,
                "error"
            );

            return;
        }


        allUsers = data || [];

        updateStatistics();

        displayUsers(allUsers);

    } catch (error) {

        console.error(
            "LOAD USERS EXCEPTION:",
            error
        );

        showMessage(
            "User loading error: " +
            error.message,
            "error"
        );
    }
}


/* ==========================================================
   DISPLAY USERS
========================================================== */

function displayUsers(users) {

    const tableBody =
        document.getElementById(
            "usersTableBody"
        );

    if (!tableBody) return;


    tableBody.innerHTML = "";


    if (!users.length) {

        tableBody.innerHTML = `
            <tr>
                <td colspan="8" class="loading">
                    No platform users found.
                </td>
            </tr>
        `;

        return;
    }


    users.forEach(user => {

        const row =
            document.createElement("tr");


        const statusClass =
            user.status === "Active"
                ? "status-active"
                : "status-inactive";


        const toggleText =
            user.status === "Active"
                ? "Deactivate"
                : "Activate";


        const userID =
            user.userID ||
            user.userid ||
            user.user_id ||
            "—";


        const fullName =
            user.full_name ||
            user.fullName ||
            "—";


        const email =
            user.email ||
            "—";


        const username =
            user.username ||
            "—";


        const farmName =
            getFarmName(user.farm_id);


        row.innerHTML = `
            <td>${escapeHTML(userID)}</td>

            <td>${escapeHTML(fullName)}</td>

            <td>${escapeHTML(email)}</td>

            <td>${escapeHTML(username)}</td>

            <td>${escapeHTML(farmName)}</td>

            <td>${escapeHTML(user.role || "—")}</td>

            <td>
                <span class="status-badge ${statusClass}">
                    ${escapeHTML(user.status || "—")}
                </span>
            </td>

            <td>

                <div class="action-buttons">

                    <button
                        type="button"
                        class="edit-button"
                        onclick="editUser('${user.id}')">
                        Edit
                    </button>

                    <button
                        type="button"
                        class="toggle-button"
                        onclick="toggleUserStatus('${user.id}')">
                        ${toggleText}
                    </button>

                </div>

            </td>
        `;


        tableBody.appendChild(row);

    });
}


/* ==========================================================
   STATISTICS
========================================================== */

function updateStatistics() {

    const total =
        allUsers.length;


    const active =
        allUsers.filter(
            user =>
                user.status === "Active"
        ).length;


    const inactive =
        allUsers.filter(
            user =>
                user.status === "Inactive"
        ).length;


    const superAdmins =
        allUsers.filter(
            user =>
                user.role === "Super Admin"
        ).length;


    document.getElementById(
        "totalUsers"
    ).textContent = total;


    document.getElementById(
        "activeUsers"
    ).textContent = active;


    document.getElementById(
        "inactiveUsers"
    ).textContent = inactive;


    document.getElementById(
        "superAdmins"
    ).textContent = superAdmins;
}


/* ==========================================================
   SAVE / CREATE USER
========================================================== */

async function saveUser(event) {

    event.preventDefault();


    const saveButton =
        document.getElementById(
            "saveUserButton"
        );


    const editingUserId =
        document.getElementById(
            "editingUserId"
        ).value;


    const userID =
        document.getElementById(
            "userID"
        ).value.trim();


    const fullName =
        document.getElementById(
            "fullName"
        ).value.trim();


    const email =
        document.getElementById(
            "email"
        ).value.trim();


    const username =
        document.getElementById(
            "username"
        ).value.trim();


    const password =
        document.getElementById(
            "password"
        ).value;


    const farmId =
        document.getElementById(
            "farmId"
        ).value;


    const role =
        document.getElementById(
            "role"
        ).value;


    const status =
        document.getElementById(
            "status"
        ).value;


    /* ======================================================
       VALIDATION
    ====================================================== */

    if (
        !userID ||
        !fullName ||
        !email ||
        !username ||
        !role ||
        !status ||
        !farmId
    ) {

        showMessage(
            "Please complete all required fields.",
            "error"
        );

        return;
    }


    if (
        !editingUserId &&
        !password
    ) {

        showMessage(
            "Please enter an initial password for the new user.",
            "error"
        );

        return;
    }


    if (
        !editingUserId &&
        password.length < 6
    ) {

        showMessage(
            "Password must contain at least 6 characters.",
            "error"
        );

        return;
    }


    /* ======================================================
       DISABLE BUTTON
    ====================================================== */

    if (saveButton) {

        saveButton.disabled = true;

        saveButton.textContent =
            editingUserId
                ? "Updating..."
                : "Creating...";
    }


    try {

        /* ==================================================
           CREATE NEW USER
        ================================================== */

        if (!editingUserId) {

            console.log(
                "STARTING USER CREATION V3..."
            );


            console.log(
                "USER DATA:",
                {
                    userID,
                    fullName,
                    username,
                    email,
                    role,
                    status,
                    farmId
                }
            );


            /*
               IMPORTANT:
               V3 allows the same username
               in different farms.
            */

            const result =
                await supabaseClient.functions.invoke(
                    "create-platform-user-v3",
                    {
                        body: {

                            userID:
                                userID,

                            fullName:
                                fullName,

                            username:
                                username,

                            email:
                                email,

                            password:
                                password,

                            role:
                                role,

                            status:
                                status,

                            farmId:
                                Number(farmId)
                        }
                    }
                );


            console.log(
                "EDGE FUNCTION V3 RESULT:",
                result
            );


            const {
                data,
                error
            } = result;


            /* ==============================================
               EDGE FUNCTION ERROR
            ============================================== */

            if (error) {

                console.error(
                    "EDGE FUNCTION V3 ERROR:",
                    error
                );


                let detailedError =
                    error.message ||
                    "Edge Function returned an error.";


                try {

                    if (
                        error.context &&
                        typeof error.context.json ===
                        "function"
                    ) {

                        const serverResponse =
                            await error.context.json();

                        console.error(
                            "SERVER RESPONSE:",
                            serverResponse
                        );


                        if (
                            serverResponse &&
                            serverResponse.error
                        ) {

                            detailedError =
                                serverResponse.error;
                        }
                    }

                } catch (
                    responseReadError
                ) {

                    console.error(
                        "RESPONSE READ ERROR:",
                        responseReadError
                    );
                }


                throw new Error(
                    detailedError
                );
            }


            /* ==============================================
               CHECK FUNCTION RESPONSE
            ============================================== */

            console.log(
                "EDGE FUNCTION V3 DATA:",
                data
            );


            if (
                !data ||
                data.success !== true
            ) {

                throw new Error(
                    data?.error ||
                    "The server did not confirm user creation."
                );
            }


            /* ==============================================
               SUCCESS
            ============================================== */

            showMessage(
                "Platform user created successfully.",
                "success"
            );


            alert(
                "SUCCESS!\n\n" +
                "Platform user created successfully."
            );

        }


        /* ==================================================
           EDIT EXISTING USER
        ================================================== */

        else {

            const updateData = {

                userID:
                    userID,

                full_name:
                    fullName,

                username:
                    username,

                role:
                    role,

                status:
                    status,

                farm_id:
                    Number(farmId)
            };


            console.log(
                "UPDATING USER:",
                updateData
            );


            const {
                error
            } = await supabaseClient
                .from("users")
                .update(updateData)
                .eq(
                    "id",
                    editingUserId
                );


            if (error) {

                throw new Error(
                    error.message
                );
            }


            showMessage(
                "Platform user updated successfully.",
                "success"
            );


            alert(
                "SUCCESS!\n\n" +
                "Platform user updated successfully."
            );
        }


        /* ==================================================
           RESET + REFRESH
        ================================================== */

        resetUserForm();

        await loadUsers();


    } catch (error) {

        console.error(
            "SAVE USER ERROR:",
            error
        );


        const errorMessage =
            error?.message ||
            String(error) ||
            "Unknown error occurred.";


        showMessage(
            "ERROR: " + errorMessage,
            "error"
        );


        alert(
            "USER CREATION ERROR\n\n" +
            errorMessage
        );


    } finally {

        if (saveButton) {

            saveButton.disabled =
                false;

            saveButton.textContent =
                editingUserId
                    ? "💾 Update User"
                    : "➕ Create User";
        }
    }
}


/* ==========================================================
   EDIT USER
========================================================== */

function editUser(id) {

    const user =
        allUsers.find(
            item =>
                String(item.id) ===
                String(id)
        );


    if (!user) {

        showMessage(
            "User record not found.",
            "error"
        );

        return;
    }


    document.getElementById(
        "editingUserId"
    ).value = user.id;


    document.getElementById(
        "userID"
    ).value =
        user.userID ||
        user.userid ||
        user.user_id ||
        "";


    document.getElementById(
        "fullName"
    ).value =
        user.full_name ||
        user.fullName ||
        "";


    document.getElementById(
        "email"
    ).value =
        user.email ||
        "";


    document.getElementById(
        "email"
    ).readOnly = true;


    document.getElementById(
        "username"
    ).value =
        user.username ||
        "";


    document.getElementById(
        "password"
    ).value = "";


    document.getElementById(
        "farmId"
    ).value =
        user.farm_id ||
        "";


    document.getElementById(
        "role"
    ).value =
        user.role ||
        "";


    document.getElementById(
        "status"
    ).value =
        user.status ||
        "Active";


    document.getElementById(
        "formTitle"
    ).textContent =
        "Edit Platform User";


    document.getElementById(
        "saveUserButton"
    ).textContent =
        "💾 Update User";


    document.getElementById(
        "cancelEditButton"
    ).style.display =
        "inline-block";


    document.getElementById(
        "passwordHelp"
    ).textContent =
        "Password changes are handled through Change Password.";


    window.scrollTo({
        top: 0,
        behavior: "smooth"
    });
}


/* ==========================================================
   RESET FORM
========================================================== */

function resetUserForm() {

    const form =
        document.getElementById(
            "userForm"
        );


    if (form) {
        form.reset();
    }


    document.getElementById(
        "editingUserId"
    ).value = "";


    document.getElementById(
        "email"
    ).readOnly = false;


    document.getElementById(
        "formTitle"
    ).textContent =
        "Create Platform User";


    document.getElementById(
        "saveUserButton"
    ).textContent =
        "➕ Create User";


    document.getElementById(
        "cancelEditButton"
    ).style.display =
        "none";


    document.getElementById(
        "passwordHelp"
    ).textContent =
        "Required when creating a new user.";
}


/* ==========================================================
   ACTIVATE / DEACTIVATE
========================================================== */

async function toggleUserStatus(id) {

    const user =
        allUsers.find(
            item =>
                String(item.id) ===
                String(id)
        );


    if (!user) return;


    if (
        currentUser &&
        String(currentUser.id) ===
        String(user.id)
    ) {

        showMessage(
            "You cannot deactivate your own Super Admin account.",
            "error"
        );

        return;
    }


    const newStatus =
        user.status === "Active"
            ? "Inactive"
            : "Active";


    const confirmed =
        confirm(
            `Change ${user.username}'s status to ${newStatus}?`
        );


    if (!confirmed) return;


    try {

        const {
            error
        } = await supabaseClient
            .from("users")
            .update({
                status:
                    newStatus
            })
            .eq(
                "id",
                user.id
            );


        if (error) {

            throw new Error(
                error.message
            );
        }


        showMessage(
            `User ${newStatus.toLowerCase()} successfully.`,
            "success"
        );


        await loadUsers();

    } catch (error) {

        console.error(
            "STATUS UPDATE ERROR:",
            error
        );


        showMessage(
            "Unable to change user status: " +
            error.message,
            "error"
        );
    }
}


/* ==========================================================
   SEARCH
========================================================== */

function searchUsers() {

    const search =
        document.getElementById(
            "userSearch"
        ).value
        .trim()
        .toLowerCase();


    if (!search) {

        displayUsers(
            allUsers
        );

        return;
    }


    const filtered =
        allUsers.filter(
            user => {

                const values = [

                    user.userID,

                    user.userid,

                    user.user_id,

                    user.full_name,

                    user.fullName,

                    user.email,

                    user.username,

                    getFarmName(
                        user.farm_id
                    ),

                    user.role,

                    user.status

                ];


                return values.some(
                    value =>
                        String(
                            value || ""
                        )
                        .toLowerCase()
                        .includes(
                            search
                        )
                );
            }
        );


    displayUsers(
        filtered
    );
}


/* ==========================================================
   ESCAPE HTML
========================================================== */

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


/* ==========================================================
   MESSAGE
========================================================== */

function showMessage(
    message,
    type
) {

    const element =
        document.getElementById(
            "message"
        );


    if (!element) return;


    element.textContent =
        message;


    element.className =
        `message ${type}`;


    setTimeout(
        () => {

            element.className =
                "message";

        },
        type === "error"
            ? 15000
            : 5000
    );
}


/* ==========================================================
   LOGOUT
========================================================== */

async function logout() {

    try {

        await supabaseClient
            .auth
            .signOut();

    } catch (error) {

        console.error(
            "LOGOUT ERROR:",
            error
        );
    }


    localStorage.removeItem(
        "loggedInUser"
    );


    window.location.href =
        "login.html";
}


/* ==========================================================
   INITIALIZE
========================================================== */

document.addEventListener(
    "DOMContentLoaded",
    async function () {

        console.log(
            "PLATFORM USER MANAGEMENT: Initializing..."
        );


        const allowed =
            await checkSuperAdmin();


        if (!allowed) return;


        const userForm =
            document.getElementById(
                "userForm"
            );


        if (userForm) {

            userForm.addEventListener(
                "submit",
                saveUser
            );
        }


        const searchInput =
            document.getElementById(
                "userSearch"
            );


        if (searchInput) {

            searchInput.addEventListener(
                "input",
                searchUsers
            );
        }


        await loadFarms();

        await loadUsers();


        console.log(
            "PLATFORM USER MANAGEMENT: Ready."
        );
    }
);