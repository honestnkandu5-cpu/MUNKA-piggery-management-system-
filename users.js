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


    // Farm ID is required

    if(!loggedUser.farm_id){

        alert(
            "Your account is not linked to a farm."
        );

        return;
    }


    const { data, error } = await supabaseClient

        .from("users")

        .select("*")

        // IMPORTANT:
        // Only load users belonging
        // to the logged-in user's farm

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


    // Make sure account has a farm

    if(!loggedUser.farm_id){

        alert(
            "Your account is not linked to a farm."
        );

        return;
    }


    let fullName =
        document
        .getElementById("fullName")
        .value
        .trim();


    let username =
        document
        .getElementById("username")
        .value
        .trim();


    let password =
        document
        .getElementById("password")
        .value
        .trim();


    let role =
        document
        .getElementById("role")
        .value;


    let status =
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


    // =====================================
    // SAVE USER
    // =====================================

    const { error } = await supabaseClient

        .from("users")

        .insert([

            {

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

                // IMPORTANT:
                // Save the new user under
                // the current Admin's farm

                farm_id:
                    loggedUser.farm_id

            }

        ]);



    if(error){

        console.log(error);

        alert(error.message);

        return;

    }


    // =====================================
    // ACTIVITY LOG
    // =====================================

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


    let table =
        document.getElementById(
            "userTable"
        );


    table.innerHTML = "";


    users.forEach((user)=>{


        table.innerHTML += `

        <tr>

            <td>
                ${user.id}
            </td>

            <td>
                ${user.full_name}
            </td>

            <td>
                ${user.username}
            </td>

            <td>
                ${user.role}
            </td>

            <td>
                ${user.status}
            </td>

            <td>

                <button
                    onclick="deleteUser(${user.id})">

                    Delete

                </button>

            </td>

        </tr>

        `;


    });


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


    // Prevent deleting your own account

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
        confirm(
            "Delete this user?"
        )
    ){


        const { error } =
            await supabaseClient

            .from("users")

            .delete()

            // IMPORTANT:
            // Delete only if the user belongs
            // to the current Admin's farm

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


        // =====================================
        // ACTIVITY LOG
        // =====================================

        if(loggedUser){

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

        }


        alert(
            "User deleted successfully"
        );


        await loadUsers();


    }

}



// =====================================
// CLEAR FORM
// =====================================

function clearForm(){

    document
    .getElementById("userForm")
    .reset();

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