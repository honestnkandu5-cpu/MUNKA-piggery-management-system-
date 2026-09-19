// =====================================
// MUNKA PIGGERY
// USER MANAGEMENT SYSTEM (SUPABASE)
// =====================================


// =====================================
// GET LOGGED-IN USER
// =====================================

function getLoggedInUser(){

    const storedUser =
        localStorage.getItem("loggedInUser");

    if(!storedUser){

        alert("Please login first.");

        window.location.href = "login.html";

        return null;
    }

    try{

        return JSON.parse(storedUser);

    }catch(error){

        console.error(
            "LOGIN USER ERROR:",
            error
        );

        alert("Invalid login session.");

        window.location.href = "login.html";

        return null;
    }
}


// =====================================
// LOAD USERS
// =====================================

async function loadUsers(){

    const loggedUser =
        getLoggedInUser();

    if(!loggedUser){
        return;
    }


    if(!loggedUser.farm_id){

        alert(
            "Your account is not linked to a farm."
        );

        return;
    }


    const { data, error } =
        await supabaseClient

        .from("users")

        .select("*")

        .eq(
            "farm_id",
            loggedUser.farm_id
        )

        .order(
            "id",
            {
                ascending:true
            }
        );


    if(error){

        console.log(error);

        alert(
            "Failed to load users: " +
            error.message
        );

        return;
    }


    displayUsers(data);

}



// =====================================
// SAVE USER
// =====================================

async function saveUser(){

    const loggedUser =
        getLoggedInUser();

    if(!loggedUser){
        return;
    }


    if(!loggedUser.farm_id){

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


    if(
        fullName === "" ||
        username === "" ||
        password === "" ||
        role === ""
    ){

        alert(
            "Please fill all required fields"
        );

        return;
    }


    // Prevent accidental save while editing

    const userID =
        document
        .getElementById("userID")
        .value
        .trim();


    if(userID){

        alert(
            "This form is currently editing a user. " +
            "Please click Update User instead."
        );

        return;
    }


    const { error } =
        await supabaseClient

        .from("users")

        .insert([{

            full_name:
                fullName,

            username:
                username,

            password:
                password,

            role:
                role,

            status:
                status,

            farm_id:
                loggedUser.farm_id

        }]);


    if(error){

        console.log(error);

        alert(
            "Failed to save user: " +
            error.message
        );

        return;
    }


    if(loggedUser){

        await saveActivity(

            loggedUser.full_name +
            " (" +
            loggedUser.role +
            ")",

            "Added",

            "User Management",

            "Added new user: " +
            fullName

        );

    }


    alert(
        "User saved successfully"
    );


    clearForm();

    await loadUsers();

}



// =====================================
// DISPLAY USERS
// =====================================

function displayUsers(users){

    const table =
        document.getElementById(
            "userTable"
        );


    table.innerHTML = "";


    if(
        !users ||
        users.length === 0
    ){

        table.innerHTML = `

            <tr>

                <td
                    colspan="6"
                    style="text-align:center;"
                >

                    No registered users found.

                </td>

            </tr>

        `;

        return;
    }


    users.forEach((user)=>{

        table.innerHTML += `

        <tr>

            <td>
                ${escapeHTML(user.id)}
            </td>

            <td>
                ${escapeHTML(user.full_name)}
            </td>

            <td>
                ${escapeHTML(user.username)}
            </td>

            <td>
                ${escapeHTML(user.role)}
            </td>

            <td>
                ${escapeHTML(user.status)}
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

    });

}



// =====================================
// EDIT USER
// =====================================

async function editUser(id){

    const loggedUser =
        getLoggedInUser();

    if(!loggedUser){
        return;
    }


    if(!loggedUser.farm_id){

        alert(
            "Your account is not linked to a farm."
        );

        return;
    }


    const { data, error } =
        await supabaseClient

        .from("users")

        .select("*")

        .eq(
            "id",
            id
        )

        .eq(
            "farm_id",
            loggedUser.farm_id
        )

        .single();


    if(error){

        console.log(error);

        alert(
            "Unable to load user: " +
            error.message
        );

        return;
    }


    // =====================================
    // PUT USER DATA INTO FORM
    // =====================================

    document
        .getElementById("userID")
        .value = data.id;


    document
        .getElementById("fullName")
        .value =
            data.full_name || "";


    document
        .getElementById("username")
        .value =
            data.username || "";


    document
        .getElementById("password")
        .value =
            data.password || "";


    document
        .getElementById("role")
        .value =
            data.role || "";


    document
        .getElementById("status")
        .value =
            data.status || "";


    // Scroll to form

    document
        .getElementById("userForm")
        .scrollIntoView({
            behavior:"smooth"
        });


    alert(
        "User loaded. Make your changes and click Update User."
    );

}



// =====================================
// UPDATE USER
// =====================================

async function updateUser(){

    const loggedUser =
        getLoggedInUser();

    if(!loggedUser){
        return;
    }


    if(!loggedUser.farm_id){

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


    if(!userID){

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


    if(
        fullName === "" ||
        username === "" ||
        password === "" ||
        role === ""
    ){

        alert(
            "Please fill all required fields."
        );

        return;
    }


    // =====================================
    // PREVENT CHANGING OWN ACCOUNT
    // =====================================

    if(
        Number(userID) ===
        Number(loggedUser.id)
    ){

        alert(
            "You cannot update your own account from User Management."
        );

        return;
    }


    const { error } =
        await supabaseClient

        .from("users")

        .update({

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

        })

        .eq(
            "id",
            userID
        )

        .eq(
            "farm_id",
            loggedUser.farm_id
        );


    if(error){

        console.log(error);

        alert(
            "Update failed: " +
            error.message
        );

        return;
    }


    // =====================================
    // ACTIVITY LOG
    // =====================================

    await saveActivity(

        loggedUser.full_name +
        " (" +
        loggedUser.role +
        ")",

        "Updated",

        "User Management",

        "Updated user: " +
        fullName +
        " | Role: " +
        role +
        " | Status: " +
        status

    );


    alert(
        "User updated successfully."
    );


    clearForm();

    await loadUsers();

}



// =====================================
// DELETE USER
// =====================================

async function deleteUser(id){

    const loggedUser =
        getLoggedInUser();

    if(!loggedUser){
        return;
    }


    if(!loggedUser.farm_id){

        alert(
            "Your account is not linked to a farm."
        );

        return;
    }


    if(
        Number(id) ===
        Number(loggedUser.id)
    ){

        alert(
            "You cannot delete your own account."
        );

        return;
    }


    if(
        !confirm(
            "Delete this user?"
        )
    ){

        return;
    }


    const { error } =
        await supabaseClient

        .from("users")

        .delete()

        .eq(
            "id",
            id
        )

        .eq(
            "farm_id",
            loggedUser.farm_id
        );


    if(error){

        console.log(error);

        alert(
            "Delete failed: " +
            error.message
        );

        return;
    }


    await saveActivity(

        loggedUser.full_name +
        " (" +
        loggedUser.role +
        ")",

        "Deleted",

        "User Management",

        "Deleted user ID: " +
        id

    );


    alert(
        "User deleted successfully"
    );


    await loadUsers();

}



// =====================================
// CLEAR FORM
// =====================================

function clearForm(){

    document
        .getElementById("userForm")
        .reset();


    document
        .getElementById("userID")
        .value = "";

}



// =====================================
// ESCAPE HTML
// =====================================

function escapeHTML(value){

    if(
        value === null ||
        value === undefined
    ){

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



// =====================================
// DOWNLOAD USERS PDF
// =====================================

async function downloadUsersPDF(){

    const loggedUser =
        getLoggedInUser();

    if(!loggedUser){
        return;
    }


    if(!loggedUser.farm_id){

        alert(
            "Your account is not linked to a farm."
        );

        return;
    }


    const { data: users, error } =
        await supabaseClient

        .from("users")

        .select(
            "id, full_name, username, role, status"
        )

        .eq(
            "farm_id",
            loggedUser.farm_id
        )

        .order(
            "id",
            {
                ascending:true
            }
        );


    if(error){

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


    if(
        !users ||
        users.length === 0
    ){

        alert(
            "There are no registered users to download."
        );

        return;
    }


    if(
        !window.jspdf ||
        !window.jspdf.jsPDF
    ){

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


    // =====================================
    // PDF HEADER
    // =====================================

    doc.setFont(
        "helvetica",
        "bold"
    );

    doc.setFontSize(20);

    doc.text(
        "MUNKA PIGGERY",
        148,
        15,
        {
            align:"center"
        }
    );


    doc.setFontSize(14);

    doc.text(
        "REGISTERED USERS REPORT",
        148,
        23,
        {
            align:"center"
        }
    );


    doc.setFont(
        "helvetica",
        "normal"
    );

    doc.setFontSize(9);


    doc.text(
        "Generated: " +
        new Date().toLocaleString(),
        14,
        32
    );


    doc.text(
        "Total Users: " +
        users.length,
        14,
        38
    );


    // =====================================
    // TABLE
    // =====================================

    const tableData =
        users.map(
            (user,index)=>[

                index + 1,

                user.id ?? "",

                user.full_name ?? "",

                user.username ?? "",

                user.role ?? "",

                user.status ?? ""

            ]
        );


    doc.autoTable({

        startY:44,

        head:[[

            "#",
            "User ID",
            "Full Name",
            "Username",
            "Role",
            "Status"

        ]],

        body:tableData,

        theme:"grid",

        headStyles:{

            fontStyle:"bold",

            halign:"center"

        },

        bodyStyles:{

            fontSize:9

        },

        columnStyles:{

            0:{
                halign:"center",
                cellWidth:12
            },

            1:{
                halign:"center",
                cellWidth:25
            },

            2:{
                cellWidth:55
            },

            3:{
                cellWidth:45
            },

            4:{
                cellWidth:45
            },

            5:{
                halign:"center",
                cellWidth:30
            }

        }

    });


    // =====================================
    // FOOTER
    // =====================================

    const pageCount =
        doc.internal
        .getNumberOfPages();


    for(
        let page = 1;
        page <= pageCount;
        page++
    ){

        doc.setPage(page);

        doc.setFontSize(8);

        doc.setFont(
            "helvetica",
            "normal"
        );


        doc.text(

            "MUNKA PIGGERY Management System",

            148,
            200,

            {
                align:"center"
            }

        );


        doc.text(

            "Page " +
            page +
            " of " +
            pageCount,

            280,
            200,

            {
                align:"right"
            }

        );

    }


    // =====================================
    // SAVE
    // =====================================

    const date =
        new Date()
        .toISOString()
        .slice(
            0,
            10
        );


    doc.save(

        "MUNKA_PIGGERY_Users_Report_" +
        date +
        ".pdf"

    );

}



// =====================================
// LOAD AUTOMATICALLY
// =====================================

document.addEventListener(

    "DOMContentLoaded",

    function(){

        loadUsers();

    }

);