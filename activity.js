// ==========================================
// MUNKA PIGGERY MANAGEMENT SYSTEM
// ACTIVITY LOGS MODULE
// PART 3 - activity.js
// ==========================================



// LOAD ACTIVITY LOGS

document.addEventListener("DOMContentLoaded", function(){

    loadActivityLogs();

});





async function loadActivityLogs(){


const {data,error} = await supabaseClient

.from("activity_logs")

.select("*")

.order("created_at",{ascending:false});



if(error){

console.log(error);

return;

}



let rows = "";



data.forEach(log=>{


rows += `

<tr>

<td>${new Date(new Date(log.created_at).toISOString()).toLocaleString("en-GB", {
    timeZone: "Africa/Lusaka",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false
})}</td>
<td>${log.username || "System"}</td>

<td>${log.action}</td>

<td>${log.module}</td>

<td>${log.description || ""}</td>

</tr>

`;


});



document.getElementById("activityTable").innerHTML = rows;


}





// ==========================================
// FUNCTION USED BY OTHER MODULES
// TO SAVE ACTIVITIES
// ==========================================


async function saveActivity(

username,

action,

module,

description

){



const {error}=await supabaseClient

.from("activity_logs")

.insert([{

username: username,

action: action,

module: module,

description: description

}]);



if(error){

console.log("Activity Error:",error);

}


}