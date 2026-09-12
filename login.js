// =====================================
// MUNKA PIGGERY
// SUPABASE AUTH LOGIN SYSTEM
// =====================================


document
.getElementById("loginForm")
.addEventListener("submit", async function(e){

e.preventDefault();


const email =
document.getElementById("email").value.trim();


const password =
document.getElementById("password").value.trim();


const role =
document.getElementById("role").value;


const message =
document.getElementById("message");


message.innerHTML = "Checking login...";



try{


// ================================
// LOGIN USING SUPABASE AUTH
// ================================


const {data: authData, error: authError} =
await supabaseClient.auth.signInWithPassword({

email: email,

password: password

});



if(authError){

message.innerHTML =
"Invalid email or password";

return;

}



const uid =
authData.user.id;



// ================================
// GET USER PROFILE
// ================================


const {data:userData,error:userError}=

await supabaseClient

.from("users")

.select("*")

.eq("auth_user_id",uid)

.single();



if(userError || !userData){

message.innerHTML =
"User profile not found";

return;

}



// ================================
// CHECK STATUS
// ================================


if(userData.status !== "Active"){


message.innerHTML =
"Account is not active";


return;

}




// ================================
// CHECK ROLE
// ================================


if(userData.role !== role){


message.innerHTML =
"Incorrect role selected";


return;

}




// ================================
// SAVE LOGIN SESSION
// ================================


localStorage.setItem(

"loggedInUser",

JSON.stringify(userData)

);




// ================================
// ACTIVITY LOG
// ================================


await saveActivity(

userData.full_name +
" (" +
userData.role +
")",

"Login",

"Authentication",

"User logged into the system"

);





alert(
"Welcome " + userData.full_name
);



window.location.href =
"dashboard.html";



}

catch(error){

console.log(error);


message.innerHTML =
"System error. Try again";


}



});