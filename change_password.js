// =====================================
// MUNKA PIGGERY
// CHANGE PASSWORD SYSTEM (SUPABASE)
// =====================================


async function changePassword(){


let loggedInUser =
JSON.parse(localStorage.getItem("loggedInUser"));



if(!loggedInUser){


alert("No logged in user found");

window.location.href="login.html";

return;


}



let oldPassword =
document.getElementById("oldPassword").value.trim();



let newPassword =
document.getElementById("newPassword").value.trim();



let confirmPassword =
document.getElementById("confirmPassword").value.trim();



let message =
document.getElementById("message");





if(oldPassword === "" || newPassword === "" || confirmPassword === ""){


message.innerHTML =
"Please fill all fields";

message.style.color="red";

return;


}




if(newPassword !== confirmPassword){


message.innerHTML =
"New passwords do not match";

message.style.color="red";

return;


}





// GET CURRENT USER FROM SUPABASE


const {data:user,error}=await supabaseClient

.from("users")

.select("*")

.eq("username",loggedInUser.username)

.single();





if(error){


console.log(error);


message.innerHTML =
"User not found";


message.style.color="red";


return;


}







// CHECK OLD PASSWORD


if(oldPassword !== user.password){


message.innerHTML =
"Current password is incorrect";


message.style.color="red";


return;


}







// UPDATE PASSWORD IN SUPABASE


const {error:updateError}=await supabaseClient

.from("users")

.update({

password:newPassword

})

.eq("username",loggedInUser.username);






if(updateError){


console.log(updateError);


message.innerHTML =
updateError.message;


message.style.color="red";


return;


}







// UPDATE LOCAL LOGIN SESSION


loggedInUser.password = newPassword;


localStorage.setItem(

"loggedInUser",

JSON.stringify(loggedInUser)

);







message.innerHTML =
"Password changed successfully";


message.style.color="green";



document
.getElementById("passwordForm")
.reset();



}