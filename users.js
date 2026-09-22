/* =========================================================
   MUNKA PIGGERY TECHNOLOGY
   NORMAL FARM USER MANAGEMENT
   SUPABASE AUTH VERSION
   FARM USER V3
   FARM-BRANDED VERSION
========================================================= */


/* =========================================================
   GET LOGGED-IN USER
========================================================= */

function getLoggedInUser() {

    const storedUser =
        localStorage.getItem("loggedInUser");

    if (!storedUser) {

        alert("Please login first.");

        window.location.href =
            "login.html";

        return null;
    }

    try {

        return JSON.parse(storedUser);

    } catch (error) {

        console.error(
            "LOGIN USER ERROR:",
            error
        );

        alert(
            "Invalid login session."
        );

        window.location.href =
            "login.html";

        return null;
    }
}


/* =========================================================
   GET REGISTERED FARM NAME
========================================================= */

async function getRegisteredFarmName() {

    try {

        const {
            data: sessionData,
            error: sessionError
        } =
            await supabaseClient
            .auth
            .getSession();

        if (
            sessionError ||
            !sessionData.session
        ) {

            return "Registered Farm";
        }

        const authUserId =
            sessionData.session.user.id;

        const {
            data: userProfile,
            error: userError
        } =
            await supabaseClient
            .from("users")
            .select("farm_id")
            .eq(
                "auth_user_id",
                authUserId
            )
            .maybeSingle();

        if (
            userError ||
            !userProfile ||
            !userProfile.farm_id
        ) {

            return "Registered Farm";
        }

        const {
            data: farm,
            error: farmError
        } =
            await supabaseClient
            .from("farms")
            .select("farm_name")
            .eq(
                "id",
                userProfile.farm_id
            )
            .maybeSingle();

        if (
            farmError ||
            !farm ||
            !farm.farm_name
        ) {

            return "Registered Farm";
        }

        return farm.farm_name;

    } catch (error) {

        console.error(
            "FARM NAME ERROR:",
            error
        );

        return "Registered Farm";
    }
}


/* =========================================================
   SAFE FARM NAME FOR FILE NAME
========================================================= */

function getSafeFarmName(farmName) {

    return String(farmName)

        .replace(
            /[^a-z0-9]/gi,
            "_"
        )

        .replace(
            /_+/g,
            "_"
        )

        .replace(
            /^_|_$/g,
            ""
        );
}


/* =========================================================
   GENERATE USER ID
   Format:
   U-XXXXXXXX
========================================================= */

function generateUserID() {

    const characters =
        "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";

    let randomPart = "";


    if (
        window.crypto &&
        window.crypto.getRandomValues
    ) {

        const values =
            new Uint32Array(8);

        window.crypto.getRandomValues(
            values
        );

        for (
            let i = 0;
            i < values.length;
            i++
        ) {

            randomPart +=
                characters[
                    values[i] %
                    characters.length
                ];
        }

    } else {

        for (
            let i = 0;
            i < 8;
            i++
        ) {

            randomPart +=
                characters[
                    Math.floor(
                        Math.random() *
                        characters.length
                    )
                ];
        }
    }

    return "U-" + randomPart;
}


/* =========================================================
   LOAD USERS
========================================================= */

async function loadUsers() {

    const loggedUser =
        getLoggedInUser();

    if (!loggedUser) {
        return;
    }

    if (!loggedUser.farm_id) {

        alert(
            "Your account is not linked to a farm."
        );

        return;
    }

    const {
        data,
        error
    } =
        await supabaseClient

        .from("users")

        .select(
            "id, userID, full_name, email, username, role, status"
        )

        .eq(
            "farm_id",
            loggedUser.farm_id
        )

        .order(
            "id",
            {
                ascending: true
            }
        );


    if (error) {

        console.error(
            "LOAD USERS ERROR:",
            error
        );

        alert(
            "Failed to load users: " +
            error.message
        );

        return;
    }


    displayUsers(
        data || []
    );
}


/* =========================================================
   SAVE USER
   CREATE SUPABASE AUTH ACCOUNT
========================================================= */

async function saveUser() {

    const loggedUser =
        getLoggedInUser();

    if (!loggedUser) {
        return;
    }

    if (!loggedUser.farm_id) {

        alert(
            "Your account is not linked to a farm."
        );

        return;
    }


    const fullName =
        document
        .getElementById("fullName")
        .value
        .trim();


    const email =
        document
        .getElementById("email")
        .value
        .trim();


    const username =
        document
        .getElementById("username")
        .value
        .trim();


    const password =
        document
        .getElementById("password")
        .value
        .trim();


    const role =
        document
        .getElementById("role")
        .value;


    const status =
        document
        .getElementById("status")
        .value;


    if (
        fullName === "" ||
        email === "" ||
        username === "" ||
        password === "" ||
        role === ""
    ) {

        alert(
            "Please fill all required fields."
        );

        return;
    }


    if (
        password.length < 6
    ) {

        alert(
            "Password must contain at least 6 characters."
        );

        return;
    }


    const existingUserID =
        document
        .getElementById("userID")
        .value
        .trim();


    if (existingUserID) {

        alert(
            "This form is currently editing a user. " +
            "Please click Update User instead."
        );

        return;
    }


    const emailPattern =
        /^[^\s@]+@[^\s@]+\.[^\s@]+$/;


    if (
        !emailPattern.test(email)
    ) {

        alert(
            "Please enter a valid email address."
        );

        return;
    }


    const userID =
        generateUserID();


    const farmName =
        await getRegisteredFarmName();


    const confirmed =
        confirm(

            "Create this farm user?\n\n" +

            "Farm: " +
            farmName +

            "\nUser ID: " +
            userID +

            "\nName: " +
            fullName +

            "\nEmail: " +
            email +

            "\nUsername: " +
            username +

            "\nRole: " +
            role

        );


    if (!confirmed) {
        return;
    }


    const {
        data: sessionData,
        error: sessionError
    } =
        await supabaseClient
        .auth
        .getSession();


    if (
        sessionError ||
        !sessionData.session
    ) {

        alert(
            "Your login session has expired. Please login again."
        );

        window.location.href =
            "login.html";

        return;
    }


    const {
        data,
        error
    } =
        await supabaseClient
        .functions
        .invoke(

            "create-farm-user-v3",

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
                        status

                }
            }

        );


    if (error) {

        console.error(
            "CREATE FARM USER V3 ERROR:",
            error
        );


        let message =
            error.message ||
            "Unable to create user.";


        if (
            error.context
        ) {

            try {

                const responseText =
                    await error.context.text();


                if (responseText) {

                    const responseData =
                        JSON.parse(
                            responseText
                        );


                    if (
                        responseData.error
                    ) {

                        message =
                            responseData.error;
                    }
                }

            } catch (parseError) {

                console.error(
                    "EDGE ERROR PARSE:",
                    parseError
                );
            }
        }


        alert(

            "User creation failed:\n\n" +
            message

        );

        return;
    }


    if (
        !data ||
        data.success !== true
    ) {

        alert(

            "User creation failed:\n\n" +

            (
                data?.error ||
                "Unexpected server response."
            )

        );

        return;
    }


    await saveActivity(

        loggedUser.full_name +
        " (" +
        loggedUser.role +
        ")",

        "Added",

        "User Management",

        "Added new farm user: " +
        fullName +
        " | Email: " +
        email +
        " | Username: " +
        username +
        " | Role: " +
        role +
        " | User ID: " +
        data.user.userID

    );


    alert(

        "USER CREATED SUCCESSFULLY!\n\n" +

        "Farm: " +
        data.user.farm_name +

        "\nUser ID: " +
        data.user.userID +

        "\nName: " +
        data.user.full_name +

        "\nEmail: " +
        data.user.email +

        "\nUsername: " +
        data.user.username +

        "\nRole: " +
        data.user.role

    );


    clearForm();


    await loadUsers();

}


/* =========================================================
   DISPLAY USERS
========================================================= */

function displayUsers(users) {

    const table =
        document.getElementById(
            "userTable"
        );


    if (!table) {
        return;
    }


    table.innerHTML = "";


    if (
        !users ||
        users.length === 0
    ) {

        table.innerHTML = `

            <tr>

                <td
                    colspan="7"
                    style="text-align:center;"
                >

                    No registered users found.

                </td>

            </tr>

        `;

        return;
    }


    users.forEach(
        (user) => {

            const displayUserID =
                user.userID ||
                user.id ||
                "";


            table.innerHTML += `

                <tr>

                    <td>
                        ${escapeHTML(
                            displayUserID
                        )}
                    </td>

                    <td>
                        ${escapeHTML(
                            user.full_name
                        )}
                    </td>

                    <td>
                        ${escapeHTML(
                            user.email
                        )}
                    </td>

                    <td>
                        ${escapeHTML(
                            user.username
                        )}
                    </td>

                    <td>
                        ${escapeHTML(
                            user.role
                        )}
                    </td>

                    <td>
                        ${escapeHTML(
                            user.status
                        )}
                    </td>

                    <td>

                        <button
                            onclick="editUser(${user.id})"
                            style="
                                background:#1565c0;
                                margin-right:5px;
                            "
                        >
                            Edit
                        </button>


                        <button
                            onclick="deleteUser(${user.id})"
                        >
                            Delete
                        </button>

                    </td>

                </tr>

            `;

        }
    );
}


/* =========================================================
   EDIT USER
========================================================= */

async function editUser(id) {

    const loggedUser =
        getLoggedInUser();


    if (!loggedUser) {
        return;
    }


    if (!loggedUser.farm_id) {

        alert(
            "Your account is not linked to a farm."
        );

        return;
    }


    const {
        data,
        error
    } =
        await supabaseClient

        .from("users")

        .select(
            "id, userID, full_name, email, username, role, status"
        )

        .eq(
            "id",
            id
        )

        .eq(
            "farm_id",
            loggedUser.farm_id
        )

        .single();


    if (error) {

        console.error(
            "EDIT USER LOAD ERROR:",
            error
        );

        alert(
            "Unable to load user: " +
            error.message
        );

        return;
    }


    document
        .getElementById("userID")
        .value =
            data.userID ||
            data.id ||
            "";


    document
        .getElementById("fullName")
        .value =
            data.full_name ||
            "";


    document
        .getElementById("email")
        .value =
            data.email ||
            "";


    document
        .getElementById("username")
        .value =
            data.username ||
            "";


    document
        .getElementById("password")
        .value = "";


    document
        .getElementById("password")
        .required = false;


    document
        .getElementById("password")
        .placeholder =
            "Password is managed separately";


    document
        .getElementById("role")
        .value =
            data.role ||
            "";


    document
        .getElementById("status")
        .value =
            data.status ||
            "Active";


    document
        .getElementById("email")
        .readOnly = true;


    document
        .getElementById("userForm")
        .scrollIntoView({

            behavior:
                "smooth"

        });


    alert(

        "User loaded. Password is not displayed because passwords are securely managed by Supabase Auth."

    );
}


/* =========================================================
   UPDATE USER
========================================================= */

async function updateUser() {

    const loggedUser =
        getLoggedInUser();


    if (!loggedUser) {
        return;
    }


    if (!loggedUser.farm_id) {

        alert(
            "Your account is not linked to a farm."
        );

        return;
    }


    const userID =
        document
        .getElementById("userID")
        .value
        .trim();


    if (!userID) {

        alert(
            "Please select a user using the Edit button first."
        );

        return;
    }


    const fullName =
        document
        .getElementById("fullName")
        .value
        .trim();


    const username =
        document
        .getElementById("username")
        .value
        .trim();


    const role =
        document
        .getElementById("role")
        .value;


    const status =
        document
        .getElementById("status")
        .value;


    if (
        fullName === "" ||
        username === "" ||
        role === ""
    ) {

        alert(
            "Please fill all required fields."
        );

        return;
    }


    const numericUserID =
        Number(
            userID.replace(
                "U-",
                ""
            )
        );


    if (
        Number.isNaN(
            numericUserID
        ) === false &&
        numericUserID ===
            Number(loggedUser.id)
    ) {

        alert(
            "You cannot update your own account from User Management."
        );

        return;
    }


    alert(

        "User updating will be enabled after the secure farm-user update function is added. For now, use this page to create new users."

    );
}


/* =========================================================
   DELETE USER
========================================================= */

async function deleteUser(id) {

    const loggedUser =
        getLoggedInUser();


    if (!loggedUser) {
        return;
    }


    if (!loggedUser.farm_id) {

        alert(
            "Your account is not linked to a farm."
        );

        return;
    }


    if (
        Number(id) ===
        Number(loggedUser.id)
    ) {

        alert(
            "You cannot delete your own account."
        );

        return;
    }


    const farmName =
        await getRegisteredFarmName();


    alert(

        "User deletion is temporarily disabled.\n\n" +

        "Farm: " +
        farmName +

        "\n\nThis is because the user now has a Supabase Auth account. " +

        "Deleting only the database record would leave the Auth account behind.\n\n" +

        "A secure farm-user deletion function will be added separately."

    );
}


/* =========================================================
   CLEAR FORM
========================================================= */

function clearForm() {

    document
        .getElementById("userForm")
        .reset();


    document
        .getElementById("userID")
        .value = "";


    document
        .getElementById("email")
        .readOnly = false;


    document
        .getElementById("password")
        .required = true;


    document
        .getElementById("password")
        .placeholder =
            "Create Initial Password";
}


/* =========================================================
   ESCAPE HTML
========================================================= */

function escapeHTML(value) {

    if (
        value === null ||
        value === undefined
    ) {

        return "";
    }


    return String(value)

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


/* =========================================================
   DOWNLOAD USERS PDF
========================================================= */

async function downloadUsersPDF() {

    const loggedUser =
        getLoggedInUser();


    if (!loggedUser) {
        return;
    }


    if (!loggedUser.farm_id) {

        alert(
            "Your account is not linked to a farm."
        );

        return;
    }


    const farmName =
        await getRegisteredFarmName();


    const {
        data: users,
        error
    } =
        await supabaseClient

        .from("users")

        .select(
            "id, userID, full_name, email, username, role, status"
        )

        .eq(
            "farm_id",
            loggedUser.farm_id
        )

        .order(
            "id",
            {
                ascending: true
            }
        );


    if (error) {

        console.error(
            "PDF USER LOAD ERROR:",
            error
        );

        alert(
            "Unable to prepare PDF: " +
            error.message
        );

        return;
    }


    if (
        !users ||
        users.length === 0
    ) {

        alert(
            "There are no registered users to download."
        );

        return;
    }


    if (
        !window.jspdf ||
        !window.jspdf.jsPDF
    ) {

        alert(
            "PDF library has not loaded. Please refresh the page."
        );

        return;
    }


    const {
        jsPDF
    } = window.jspdf;


    const doc =
        new jsPDF(
            "landscape",
            "mm",
            "a4"
        );


    /* =====================================================
       PDF HEADER
    ===================================================== */

    doc.setFont(
        "helvetica",
        "bold"
    );


    doc.setFontSize(
        20
    );


    doc.text(
        farmName,
        148,
        15,
        {
            align:
                "center"
        }
    );


    doc.setFontSize(
        14
    );


    doc.text(
        "REGISTERED USERS REPORT",
        148,
        23,
        {
            align:
                "center"
        }
    );


    doc.setFont(
        "helvetica",
        "normal"
    );


    doc.setFontSize(
        9
    );


    doc.text(
        "Farm: " +
        farmName,
        14,
        32
    );


    doc.text(
        "Generated: " +
        new Date().toLocaleString(
            "en-ZM",
            {
                timeZone:
                    "Africa/Lusaka"
            }
        ),
        14,
        38
    );


    doc.text(
        "Total Users: " +
        users.length,
        14,
        44
    );


    /* =====================================================
       PDF TABLE
    ===================================================== */

    const tableData =
        users.map(
            (user, index) => [

                index + 1,

                user.userID ||
                user.id ||
                "",

                user.full_name ||
                "",

                user.email ||
                "",

                user.username ||
                "",

                user.role ||
                "",

                user.status ||
                ""

            ]
        );


    doc.autoTable({

        startY:
            50,

        head: [[

            "#",

            "User ID",

            "Full Name",

            "Email",

            "Username",

            "Role",

            "Status"

        ]],

        body:
            tableData,

        theme:
            "grid",

        headStyles: {

            fontStyle:
                "bold",

            halign:
                "center"

        },

        bodyStyles: {

            fontSize:
                8

        },

        columnStyles: {

            0: {
                halign:
                    "center",
                cellWidth:
                    10
            },

            1: {
                halign:
                    "center",
                cellWidth:
                    28
            },

            2: {
                cellWidth:
                    45
            },

            3: {
                cellWidth:
                    55
            },

            4: {
                cellWidth:
                    38
            },

            5: {
                cellWidth:
                    48
            },

            6: {
                halign:
                    "center",
                cellWidth:
                    25
            }

        }

    });


    /* =====================================================
       PDF FOOTER
    ===================================================== */

    const pageCount =
        doc.internal
        .getNumberOfPages();


    for (
        let page = 1;
        page <= pageCount;
        page++
    ) {

        doc.setPage(
            page
        );


        doc.setFontSize(
            8
        );


        doc.setFont(
            "helvetica",
            "normal"
        );


        doc.text(

            farmName +
            " - User Management",

            148,

            200,

            {
                align:
                    "center"
            }

        );


        doc.text(

            "MUNKA PIGGERY TECHNOLOGY",

            14,

            200

        );


        doc.text(

            "Page " +
            page +
            " of " +
            pageCount,

            280,

            200,

            {
                align:
                    "right"
            }

        );

    }


    /* =====================================================
       SAVE PDF
    ===================================================== */

    const date =
        new Date()
        .toISOString()
        .slice(
            0,
            10
        );


    const safeFarmName =
        getSafeFarmName(
            farmName
        );


    doc.save(

        safeFarmName +
        "_Users_Report_" +
        date +
        ".pdf"

    );
}


/* =========================================================
   LOAD AUTOMATICALLY
========================================================= */

document.addEventListener(

    "DOMContentLoaded",

    function () {

        loadUsers();

    }

);