// =====================================
// MUNKA PIGGERY
// USER MANAGEMENT SYSTEM (SUPABASE)
// =====================================


// Load Users

async function loadUsers(){

    const { data, error } = await supabaseClient
        .from("users")
        .select("*")
        .order("id", { ascending: true });


    if(error){

        console.log(error);
        alert("Failed to load users");
        return;

    }


    displayUsers(data);

}



// Save User

async function saveUser(){


    let fullName = document.getElementById("fullName").value.trim();

    let username = document.getElementById("username").value.trim();

    let password = document.getElementById("password").value.trim();

    let role = document.getElementById("role").value;

    let status = document.getElementById("status").value;



    if(fullName === "" || username === "" || password === "" || role === ""){

        alert("Please fill all required fields");

        return;

    }



    const { error } = await supabaseClient
        .from("users")
        .insert([
            {
                full_name: fullName,
                username: username,
                password: password,
                role: role,
                status: status
            }
        ]);



    if(error){

        console.log(error);
        alert(error.message);
        return;

    }
    
    let loggedUser = JSON.parse(localStorage.getItem("loggedInUser"));

if(loggedUser){

    await saveActivity(

        loggedUser.full_name + " (" + loggedUser.role + ")",

        "Added",

        "User Management",

        "Added new user: " + fullName

    );

}


    alert("User saved successfully");


    clearForm();

    loadUsers();


}




// Display Users

function displayUsers(users){


let table = document.getElementById("userTable");


table.innerHTML = "";


users.forEach((user)=>{


table.innerHTML += `

<tr>

<td>${user.id}</td>

<td>${user.full_name}</td>

<td>${user.username}</td>

<td>${user.role}</td>

<td>${user.status}</td>

<td>

<button onclick="deleteUser(${user.id})">
Delete
</button>

</td>


</tr>

`;


});


}





// Delete User

async function deleteUser(id){


if(confirm("Delete this user?")){


const { error } = await supabaseClient
    .from("users")
    .delete()
    .eq("id", id);



if(error){

console.log(error);
alert("Delete failed");

return;

}

let loggedUser = JSON.parse(localStorage.getItem("loggedInUser"));

if(loggedUser){

    await saveActivity(

        loggedUser.full_name + " (" + loggedUser.role + ")",

        "Deleted",

        "User Management",

        "Deleted user ID: " + id

    );

}
alert("User deleted successfully");


loadUsers();


}


}




// Clear Form

function clearForm(){

document.getElementById("userForm").reset();

}




// Load automatically

loadUsers();

