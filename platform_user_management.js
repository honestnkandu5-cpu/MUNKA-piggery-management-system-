/* ==========================================================
   MUNKA PIGGERY
   PLATFORM USER MANAGEMENT
   SUPER ADMIN ONLY
========================================================== */

let currentUser = null;
let allUsers = [];



/* ==========================================================
   CHECK SUPER ADMIN
========================================================== */

async function checkSuperAdmin() {

    const {
        data: {
            session
        },
        error
    } = await supabaseClient.auth.getSession();


    if (error || !session) {

        console.error(
            "SESSION ERROR:",
            error
        );

        window.location.href =
            "login.html";

        return false;
    }


    const {
        data: user,
        error: userError
    } = await supabaseClient
        .from("users")
        .select("*")
        .eq(
            "auth_user_id",
            session.user.id
        )
        .single();


    if (userError) {

        console.error(
            "USER PROFILE ERROR:",
            userError
        );

        alert(
            "Unable to load Super Admin profile."
        );

        return false;
    }


    if (
        !user ||
        user.role !== "Super Admin" ||
        user.status !== "Active"
    ) {

        alert(
            "Access denied."
        );

        window.location.href =
            "login.html";

        return false;
    }


    currentUser = user;

    return true;
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
                <td colspan="6" class="loading">
                    Loading users...
                </td>
            </tr>
        `;
    }


    const {
        data,
        error
    } = await supabaseClient
        .from("users")
        .select("*")
        .order(
            "full_name",
            {
                ascending: true
            }
        );


    if (error) {

        console.error(
            "LOAD USERS ERROR:",
            error
        );

        showMessage(
            "Unable to load platform users.",
            "error"
        );

        return;
    }


    allUsers =
        data || [];


    updateStatistics();

    displayUsers(
        allUsers
    );
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
                <td
                    colspan="6"
                    class="loading">

                    No platform users found.

                </td>
            </tr>
        `;

        return;
    }


    users.forEach(
        user => {

            const row =
                document.createElement(
                    "tr"
                );


            const statusClass =
                user.status === "Active"
                    ? "status-active"
                    : "status-inactive";


            const toggleText =
                user.status === "Active"
                    ? "Deactivate"
                    : "Activate";


            row.innerHTML = `

                <td>
                    ${escapeHTML(
                        user.userID ||
                        user.userid ||
                        user.user_id ||
                        "—"
                    )}
                </td>


                <td>
                    ${escapeHTML(
                        user.full_name ||
                        user.fullName ||
                        "—"
                    )}
                </td>


                <td>
                    ${escapeHTML(
                        user.username ||
                        "—"
                    )}
                </td>


                <td>
                    ${escapeHTML(
                        user.role ||
                        "—"
                    )}
                </td>


                <td>

                    <span
                        class="status-badge ${statusClass}">

                        ${escapeHTML(
                            user.status ||
                            "—"
                        )}

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


                        <button
                            type="button"
                            class="delete-button"
                            onclick="deleteUser('${user.id}')">

                            Delete

                        </button>


                    </div>

                </td>

            `;


            tableBody.appendChild(
                row
            );

        }
    );
}



/* ==========================================================
   UPDATE STATISTICS
========================================================== */

function updateStatistics() {

    const total =
        allUsers.length;


    const active =
        allUsers.filter(
            user =>
                user.status ===
                "Active"
        ).length;


    const inactive =
        allUsers.filter(
            user =>
                user.status ===
                "Inactive"
        ).length;


    const superAdmins =
        allUsers.filter(
            user =>
                user.role ===
                "Super Admin"
        ).length;


    document.getElementById(
        "totalUsers"
    ).textContent =
        total;


    document.getElementById(
        "activeUsers"
    ).textContent =
        active;


    document.getElementById(
        "inactiveUsers"
    ).textContent =
        inactive;


    document.getElementById(
        "superAdmins"
    ).textContent =
        superAdmins;
}



/* ==========================================================
   CREATE / UPDATE USER
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


    const username =
        document.getElementById(
            "username"
        ).value.trim();


    const password =
        document.getElementById(
            "password"
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
        !username ||
        !role ||
        !status
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
            "Please enter a password for the new user.",
            "error"
        );

        return;
    }



    /* ======================================================
       DISABLE BUTTON
    ====================================================== */

    if (saveButton) {

        saveButton.disabled =
            true;

        saveButton.textContent =
            editingUserId
                ? "Updating..."
                : "Creating...";
    }


    try {


        /* ==================================================
           CREATE USER
        ================================================== */

        if (!editingUserId) {

            const {
                data: existingUser,
                error: checkError
            } = await supabaseClient
                .from("users")
                .select("id")
                .eq(
                    "username",
                    username
                )
                .maybeSingle();


            if (checkError) {

                throw checkError;
            }


            if (existingUser) {

                showMessage(
                    "That username already exists.",
                    "error"
                );

                return;
            }


            const {
                error
            } = await supabaseClient
                .from("users")
                .insert([{

                    userID:
                        userID,

                    full_name:
                        fullName,

                    username:
                        username,

                    password:
                        password,

                    role:
                        role,

                    status:
                        status

                }]);


            if (error) {

                throw error;
            }


            showMessage(
                "Platform user created successfully.",
                "success"
            );

        }



        /* ==================================================
           UPDATE USER
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
                    status
            };


            if (password) {

                updateData.password =
                    password;
            }


            const {
                error
            } = await supabaseClient
                .from("users")
                .update(
                    updateData
                )
                .eq(
                    "id",
                    editingUserId
                );


            if (error) {

                throw error;
            }


            showMessage(
                "Platform user updated successfully.",
                "success"
            );

        }


        resetUserForm();

        await loadUsers();


    }
    catch (error) {

        console.error(
            "SAVE USER ERROR:",
            error
        );


        showMessage(
            error.message ||
            "Unable to save user.",
            "error"
        );

    }
    finally {

        if (saveButton) {

            saveButton.disabled =
                false;

            saveButton.textContent =
                "➕ Create User";
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
                String(
                    item.id
                ) ===
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
    ).value =
        user.id;


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
        "username"
    ).value =
        user.username ||
        "";


    document.getElementById(
        "password"
    ).value =
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
    ).value =
        "";


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
}



/* ==========================================================
   TOGGLE USER STATUS
========================================================== */

async function toggleUserStatus(id) {

    const user =
        allUsers.find(
            item =>
                String(
                    item.id
                ) ===
                String(id)
        );


    if (!user) return;


    /* Prevent deactivating yourself */

    if (
        currentUser &&
        String(
            currentUser.id
        ) ===
        String(
            user.id
        )
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

        console.error(
            "STATUS UPDATE ERROR:",
            error
        );

        showMessage(
            "Unable to change user status.",
            "error"
        );

        return;
    }


    showMessage(
        `User ${newStatus.toLowerCase()} successfully.`,
        "success"
    );


    await loadUsers();
}



/* ==========================================================
   DELETE USER
========================================================== */

async function deleteUser(id) {

    const user =
        allUsers.find(
            item =>
                String(
                    item.id
                ) ===
                String(id)
        );


    if (!user) return;


    /* Prevent deleting yourself */

    if (
        currentUser &&
        String(
            currentUser.id
        ) ===
        String(
            user.id
        )
    ) {

        showMessage(
            "You cannot delete your own Super Admin account.",
            "error"
        );

        return;
    }


    const confirmed =
        confirm(
            `Delete user "${user.username}" permanently?\n\nThis action cannot be undone.`
        );


    if (!confirmed) return;


    const {
        error
    } = await supabaseClient
        .from("users")
        .delete()
        .eq(
            "id",
            user.id
        );


    if (error) {

        console.error(
            "DELETE USER ERROR:",
            error
        );

        showMessage(
            "Unable to delete user.",
            "error"
        );

        return;
    }


    showMessage(
        "User deleted successfully.",
        "success"
    );


    await loadUsers();
}



/* ==========================================================
   SEARCH USERS
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

                    user.username,

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
   HTML SECURITY
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
        5000
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

    }
    catch (error) {

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


        await loadUsers();


        console.log(
            "PLATFORM USER MANAGEMENT: Ready."
        );

    }
);

