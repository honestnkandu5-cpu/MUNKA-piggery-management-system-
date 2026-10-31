
/* ================================================================
   MUNKA PIGGERY TECHNOLOGY
   VACCINATION & TREATMENT MANAGEMENT SYSTEM
   COMPLETE UPDATED VERSION
   ================================================================

   FEATURES
   --------
   1. Expanded pig disease and health reference database
   2. Automatic possible-cause information
   3. Automatic prevention information
   4. Signs and symptoms guidance
   5. Medicine reference database
   6. Administration guidance
   7. External parasite management
   8. Pig treatment records
   9. Save, edit, update and delete records
   10. Search pig treatment history
   11. Treatment reports
   12. PDF generation
   13. Printing
   14. Farm-specific record management
   15. Activity logging

   IMPORTANT
   ---------
   Medicine information is a reference for farm management.
   Always confirm the active ingredient, concentration, route,
   dosage, interval and withdrawal period on the exact product
   label and with a veterinary professional.

   No dosage or treatment schedule is prescribed by this file.

   EXISTING SUPABASE TABLE:
   treatment_records

   ================================================================ */


/* ================================================================
   1. GLOBAL VARIABLES
   ================================================================ */

let editID = null;

let treatmentRecords = [];

let currentTreatmentReport = null;


/* ================================================================
   2. GENERAL HELPERS
   ================================================================ */

function getLoggedUser() {

    try {

        const storedUser = localStorage.getItem("loggedInUser");

        if (!storedUser) {
            return null;
        }

        return JSON.parse(storedUser);

    } catch (error) {

        console.error("Unable to read logged-in user:", error);

        return null;
    }
}


function getFarmID() {

    const user = getLoggedUser();

    if (!user || !user.farm_id) {
        return null;
    }

    return user.farm_id;
}


function getUserName() {

    const user = getLoggedUser();

    if (!user) {
        return "Unknown User";
    }

    return (
        user.full_name ||
        user.name ||
        user.username ||
        user.email ||
        "System User"
    );
}


function getUserRole() {

    const user = getLoggedUser();

    if (!user) {
        return "Unknown Role";
    }

    return user.role || "Farm User";
}


function escapeHTML(value) {

    if (value === null || value === undefined) {
        return "";
    }

    return String(value)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}


function showMessage(message) {

    alert(message);
}


function getTodayDate() {

    const today = new Date();

    const year = today.getFullYear();

    const month = String(today.getMonth() + 1).padStart(2, "0");

    const day = String(today.getDate()).padStart(2, "0");

    return `${year}-${month}-${day}`;
}


function formatDate(dateValue) {

    if (!dateValue) {
        return "Not scheduled";
    }

    const date = new Date(dateValue + "T00:00:00");

    if (isNaN(date.getTime())) {
        return dateValue;
    }

    return date.toLocaleDateString("en-GB");
}


function getFieldValue(id) {

    const element = document.getElementById(id);

    return element ? element.value.trim() : "";
}


function setFieldValue(id, value) {

    const element = document.getElementById(id);

    if (element) {
        element.value = value ?? "";
    }
}


async function getRegisteredFarmName() {

    const farmID = getFarmID();

    const farmNameElement = document.querySelector("[data-farm-name]");

    if (!farmNameElement) {
        return;
    }

    if (!farmID) {

        farmNameElement.textContent = "Farm Not Assigned";

        return;
    }

    try {

        const { data, error } = await supabaseClient
            .from("farms")
            .select("farm_name")
            .eq("id", farmID)
            .maybeSingle();

        if (error) {
            throw error;
        }

        farmNameElement.textContent =
            data?.farm_name || "Registered Farm";

    } catch (error) {

        console.error("Farm name error:", error);

        farmNameElement.textContent = "Registered Farm";
    }
}


/* ================================================================
   3. EXPANDED DISEASE AND HEALTH DATABASE
   ================================================================ */

const healthDatabase = {

    diarrhoea: {

        name: "Diarrhoea",

        signs:
            "Loose or watery faeces, dehydration, weakness, reduced appetite, sunken eyes and sometimes vomiting.",

        cause:
            "Possible causes include bacterial infections, viral infections, intestinal parasites, contaminated feed or water, poor hygiene, sudden feed changes and stress. In young piglets, infections can cause rapid dehydration.",

        prevention:
            "Keep farrowing pens clean and dry. Provide clean drinking water. Maintain proper feeding hygiene. Avoid sudden feed changes. Clean feeding equipment regularly. Separate sick pigs and seek veterinary advice when diarrhoea is severe or affects several pigs.",

        medicine:
            "Medicine references to discuss with a veterinary professional: Sulfa-333, sulfadimidine sodium, Specto Guard, Introcil pump and other suitable veterinary products. Tylosin products such as Bilocin should only be considered when appropriate for the diagnosed condition and the product label supports their use.",

        route:
            "Oral or injection depending on the exact medicine and product label. Some products have different formulations and administration routes.",

        warning:
            "Severe diarrhoea in newborn piglets can cause life-threatening dehydration. Provide appropriate supportive care and obtain veterinary advice promptly. Do not automatically combine antibiotics."
    },


    coughing: {

        name: "Coughing / Respiratory Problems",

        signs:
            "Persistent coughing, difficult breathing, rapid breathing, nasal discharge, reduced appetite, fever and slow growth.",

        cause:
            "Possible causes include bacterial or viral respiratory infections, poor ventilation, dusty feed, overcrowding, ammonia from manure and sudden temperature changes.",

        prevention:
            "Provide good ventilation without cold draughts. Avoid overcrowding. Keep pens clean and dry. Reduce dust. Quarantine newly introduced pigs. Monitor coughing and isolate animals showing respiratory illness.",

        medicine:
            "Veterinary assessment is required before selecting antibiotics. Products such as Tylosin, Hi-Tech/Moxlin and Penstrep-400LA may have specific veterinary uses depending on their active ingredients and approved indications.",

        route:
            "Depends on the selected product. Confirm whether it is injectable, oral or another formulation from the label.",

        warning:
            "Breathing difficulty, high fever or sudden deaths require urgent veterinary attention."
    },


    fever: {

        name: "Fever",

        signs:
            "Raised body temperature, weakness, reduced appetite, inactivity, rapid breathing, shivering and sometimes skin colour changes.",

        cause:
            "Fever is a sign rather than a disease. It may result from bacterial or viral infections, inflammation, heat stress or other underlying conditions.",

        prevention:
            "Maintain good hygiene, clean water, proper ventilation, appropriate vaccination programmes and good biosecurity. Monitor sick animals and investigate the underlying cause.",

        medicine:
            "Treatment depends on the cause. A veterinary professional should determine whether antimicrobial treatment, supportive care or another intervention is required.",

        route:
            "Depends on the prescribed product.",

        warning:
            "Fever accompanied by skin discoloration, abortions, unusual bleeding or sudden deaths may indicate a serious contagious disease."
    },


    mange: {

        name: "Mange / Skin Disease",

        signs:
            "Intense itching, frequent rubbing, skin redness, thickened skin, scabs, hair loss, wounds and reduced growth.",

        cause:
            "Mange is commonly associated with parasitic mites. Skin problems can also result from lice, bacterial infections, injuries, poor hygiene and other skin conditions.",

        prevention:
            "Inspect pigs regularly. Quarantine newly introduced animals. Clean and disinfect appropriate housing areas. Avoid overcrowding. Seek veterinary guidance on treating affected pigs and managing exposed animals.",

        medicine:
            "Veterinary antiparasitic products may include ivermectin, Icomectin, Avermectin or Intermectin, depending on their active ingredients and approved uses. External skin products may also be required.",

        route:
            "Antiparasitic products may be injectable, oral or topical depending on the formulation. Follow the exact product label.",

        warning:
            "Do not assume every skin problem is mange. Severe wounds, infection or extensive skin damage require veterinary assessment."
    },


    worms: {

        name: "Worm Infestation",

        signs:
            "Poor growth, weight loss, rough coat, pot belly in young pigs, diarrhoea, reduced appetite and poor body condition. Some infestations may show no obvious signs.",

        cause:
            "Internal parasites can spread through contaminated pens, manure, soil, feed and water. Poor sanitation increases exposure.",

        prevention:
            "Maintain a suitable parasite-control programme with veterinary guidance. Remove manure regularly. Keep feed and water clean. Avoid excessive contamination of pens. Monitor body condition and growth.",

        medicine:
            "Veterinary antiparasitic references include ivermectin, Icomectin, Avermectin and Intermectin. Other dewormers may be appropriate depending on the parasite and pig category.",

        route:
            "Product-dependent. Confirm the approved route and pig category on the label.",

        warning:
            "Pregnant sows, lactating sows, piglets and breeding animals may have different product restrictions. Do not use a product solely because it was used successfully on another pig."
    },


    lameness: {

        name: "Lameness",

        signs:
            "Difficulty walking, limping, swollen joints, reluctance to stand, pain when moving and reduced feeding activity.",

        cause:
            "Possible causes include injuries, joint infections, hoof problems, slippery floors, nutritional deficiencies and other musculoskeletal conditions.",

        prevention:
            "Maintain safe flooring. Remove sharp objects. Avoid overcrowding. Inspect hooves regularly. Provide balanced nutrition and appropriate mineral supplementation.",

        medicine:
            "Treatment depends on the cause. Veterinary examination may be needed to determine whether infection, injury or another condition is present. Penstrep-400LA is an antibiotic product in formulations containing penicillin and streptomycin; it should not be treated as a general painkiller.",

        route:
            "Depends on the exact prescribed product.",

        warning:
            "A swollen joint, severe pain or inability to stand requires prompt veterinary examination."
    },


    loss_appetite: {

        name: "Loss of Appetite",

        signs:
            "Reduced feeding, refusal to eat, weight loss, weakness, inactivity and reduced interest in water.",

        cause:
            "Possible causes include fever, digestive disease, respiratory infection, stress, poor-quality feed, contaminated water, dental problems and other underlying illness.",

        prevention:
            "Provide clean water and good-quality feed. Keep feeding equipment clean. Avoid sudden feed changes. Monitor feeding behaviour and investigate unusual changes promptly.",

        medicine:
            "There is no single medicine for loss of appetite. Treatment depends on the underlying cause. Multivitamin products may be used for specific nutritional purposes when appropriate, but they do not replace diagnosis.",

        route:
            "Depends on the selected veterinary product.",

        warning:
            "A pig refusing both feed and water, especially with fever or weakness, needs prompt assessment."
    },


    african_swine_fever: {

        name: "African Swine Fever (ASF)",

        signs:
            "High fever, loss of appetite, weakness, difficulty breathing, skin discoloration, vomiting, diarrhoea, abortions and sudden deaths. Signs can vary.",

        cause:
            "African swine fever is caused by the African swine fever virus. It spreads through infected pigs, contaminated materials, equipment, vehicles, meat products and other routes.",

        prevention:
            "Apply strict farm biosecurity. Restrict visitors. Disinfect equipment and vehicles. Do not feed untreated pork waste. Quarantine incoming pigs. Prevent contact with potentially infected animals. Report suspected cases immediately to veterinary authorities.",

        medicine:
            "There is no specific curative medicine for African swine fever. Do not attempt to treat suspected ASF as an ordinary bacterial infection.",

        route:
            "Not applicable as a routine curative treatment.",

        warning:
            "URGENT: Isolate suspected pigs, stop animal movement and contact the veterinary authorities immediately. Do not transport sick pigs to another farm or market."
    },


    foot_mouth: {

        name: "Foot and Mouth Disease (FMD)",

        signs:
            "Blisters or sores around the mouth, tongue, snout and feet, excessive salivation, lameness, fever and reluctance to eat.",

        cause:
            "Foot and mouth disease is caused by a highly contagious virus affecting cloven-hoofed animals.",

        prevention:
            "Maintain strict biosecurity. Restrict animal movement during suspected outbreaks. Disinfect equipment and vehicles. Obtain vaccination guidance from veterinary authorities and follow local disease-control instructions.",

        medicine:
            "There is no specific medicine that cures the FMD virus. Veterinary professionals may recommend supportive care and management of secondary complications.",

        route:
            "Depends on any supportive treatment prescribed by a veterinary professional.",

        warning:
            "URGENT: Isolate suspected animals and contact veterinary authorities. Follow official movement restrictions and outbreak-control instructions."
    },


    external_parasites: {

        name: "External Parasites",

        signs:
            "Frequent scratching, rubbing against pen walls, skin irritation, hair loss, visible insects, wounds, restlessness, poor growth and sometimes anaemia.",

        cause:
            "External parasites include lice, fleas, ticks, mites and flies. Blood-sucking parasites can contribute to anaemia. Some parasites may transmit infectious diseases.",

        prevention:
            "Inspect pigs regularly. Clean pens and remove manure. Reduce fly breeding sites. Manage standing water and waste. Quarantine new pigs. Maintain suitable parasite-control measures for animals and housing under veterinary guidance.",

        medicine:
            "Antiparasitic references include ivermectin, Icomectin, Avermectin and Intermectin where the exact product is approved for the parasite and pig category. Use suitable environmental fly and tick control products only according to their labels.",

        route:
            "May be injectable, oral, topical or environmental treatment depending on the product. Do not assume all products have the same route.",

        warning:
            "Heavy parasite burdens can cause serious skin damage and anaemia. Weak or pale pigs require veterinary assessment."
    },


    lice: {

        name: "Lice Infestation",

        signs:
            "Visible lice or eggs, itching, rubbing, hair loss, skin irritation, restlessness and possible anaemia in heavy infestations.",

        cause:
            "Lice are external parasites that live on pigs and may spread through direct contact and contaminated housing.",

        prevention:
            "Inspect newly introduced pigs. Clean housing and equipment. Avoid sharing contaminated equipment. Follow an appropriate parasite-control programme.",

        medicine:
            "Veterinary-approved antiparasitic products may be considered, including suitable ivermectin-based products where the exact formulation is approved for pigs and the target parasite.",

        route:
            "Product-dependent. Check the label.",

        warning:
            "Treating only visible insects may not adequately control an infestation. Seek veterinary advice on the correct control programme."
    },


    ticks: {

        name: "Tick Infestation",

        signs:
            "Visible ticks attached to skin, irritation, wounds, restlessness, weakness and possible anaemia where infestation is heavy.",

        cause:
            "Ticks attach to pigs to feed on blood. They may also transmit infectious organisms.",

        prevention:
            "Inspect pigs and housing. Maintain clean surroundings. Reduce suitable tick habitats around animal housing. Use approved tick-control products under veterinary guidance.",

        medicine:
            "Suitable veterinary antiparasitic products may be considered according to the active ingredient and label. Some ivermectin-based products may have specific parasite-control uses.",

        route:
            "Depends on the exact product.",

        warning:
            "Do not use household pesticides or unapproved chemicals on pigs."
    },


    fleas: {

        name: "Flea Infestation",

        signs:
            "Itching, frequent scratching, skin irritation, restlessness and possible anaemia in severe infestations.",

        cause:
            "Fleas are external parasites that may spread through the environment and contact with infested animals.",

        prevention:
            "Clean housing and bedding. Manage manure and waste. Inspect animals regularly. Control environmental breeding sites using approved products.",

        medicine:
            "Use only veterinary-approved flea-control products appropriate for pigs and the identified parasite.",

        route:
            "Product-dependent.",

        warning:
            "Do not apply unapproved household flea treatments to pigs."
    },


    flies: {

        name: "Fly Infestation",

        signs:
            "Frequent irritation, restlessness, clustering away from flies, skin wounds, reduced comfort and possible disease transmission.",

        cause:
            "Flies breed around manure, wet bedding, spoiled feed and other organic waste. Some flies bite and may transmit disease.",

        prevention:
            "Remove manure frequently. Keep bedding dry. Dispose of spoiled feed. Manage standing water and waste. Use appropriate approved fly-control measures around the farm.",

        medicine:
            "Use veterinary-approved external parasite or environmental fly-control products. Products such as Supona aerosol must be checked for their exact formulation, approved use and application instructions.",

        route:
            "Spray or environmental application only where the product label specifically permits it.",

        warning:
            "Never spray a pig with an environmental insecticide unless the label explicitly permits use on pigs."
    },


    swine_pox: {

        name: "Swine Pox",

        signs:
            "Skin spots, raised lesions, scabs, crusting and sometimes irritation or secondary skin infection.",

        cause:
            "Swine pox is a viral disease. It can be associated with infected animals and mechanical transmission by insects.",

        prevention:
            "Maintain good hygiene. Control flies and other insects. Isolate affected animals where appropriate. Avoid sharing contaminated equipment and seek veterinary diagnosis.",

        medicine:
            "There is no routine antibiotic cure for the swine pox virus. Veterinary care may be needed for supportive management and secondary bacterial infections.",

        route:
            "Depends on any supportive or secondary-infection treatment prescribed.",

        warning:
            "Skin lesions can have several causes. Obtain veterinary confirmation rather than assuming every skin lesion is swine pox."
    },


    wounds: {

        name: "External Wounds / Skin Injuries",

        signs:
            "Cuts, scratches, bleeding, swelling, skin damage, discharge, redness and possible infection.",

        cause:
            "Possible causes include fighting, sharp pen equipment, rough flooring, bites, tail injuries and poor housing conditions.",

        prevention:
            "Remove sharp objects. Maintain safe housing. Reduce fighting and overcrowding. Inspect pigs regularly and separate seriously injured animals where appropriate.",

        medicine:
            "External wound-care references include tincture of iodine and approved wound products such as Supona aerosol or healing oil, but only where the exact product is suitable for the wound and approved for pigs. Limoxin-2 Spray must be used according to its specific product label.",

        route:
            "Topical application or spray depending on the product label.",

        warning:
            "Deep wounds, severe bleeding, swelling, pus or spreading infection require veterinary attention."
    },


    tail_docking: {

        name: "Tail Docking Wound Care",

        signs:
            "Fresh tail wound, bleeding, swelling or signs of infection after a procedure.",

        cause:
            "Tail injury or a veterinary-supervised tail procedure.",

        prevention:
            "Follow applicable animal-welfare rules. Use appropriate hygienic procedures and trained personnel. Avoid unnecessary tail docking. Monitor wounds for bleeding and infection.",

        medicine:
            "Suitable veterinary-approved antiseptic wound-care products may include tincture of iodine where appropriate for the intended use.",

        route:
            "Topical application according to the product label and veterinary instructions.",

        warning:
            "This entry is for wound-care records, not instructions for performing tail docking."
    },


    teeth_clipping: {

        name: "Teeth Procedure / Oral Injury",

        signs:
            "Mouth injury, bleeding, swelling, difficulty suckling or reduced feeding after a dental procedure.",

        cause:
            "Possible oral injury associated with handling or a veterinary-supervised procedure.",

        prevention:
            "Follow animal-welfare requirements. Use trained personnel and appropriate hygiene. Avoid unnecessary procedures and monitor piglets closely.",

        medicine:
            "Use only suitable veterinary-approved products for the specific oral or external wound. Tincture of iodine is not automatically appropriate for application inside the mouth.",

        route:
            "As directed by the veterinary professional and product label.",

        warning:
            "Do not apply products intended for external skin wounds inside the mouth."
    },


    iron_deficiency: {

        name: "Iron Deficiency / Anaemia",

        signs:
            "Pale skin, weakness, poor growth, reduced activity and poor body condition. Young piglets may be particularly vulnerable.",

        cause:
            "Piglets may develop iron deficiency because sow's milk alone may not supply sufficient iron for rapid growth. Blood-sucking parasites and other illnesses can also contribute to anaemia.",

        prevention:
            "Follow a suitable piglet iron-management programme. Maintain good nutrition and monitor piglet growth. Investigate parasite burdens and other causes of anaemia.",

        medicine:
            "Intrafer-100 B12 is a product name associated with iron and vitamin supplementation in some formulations. Confirm its exact active ingredients, approved pig category and label instructions before use.",

        route:
            "Product-dependent. Confirm the exact formulation and approved administration route.",

        warning:
            "Pale or weak pigs may have causes other than iron deficiency. Veterinary assessment is important."
    },


    nutritional_deficiency: {

        name: "Nutritional Deficiency",

        signs:
            "Poor growth, rough coat, weakness, reduced appetite, poor body condition and sometimes reproductive problems.",

        cause:
            "Unbalanced feed, insufficient minerals or vitamins, poor feed quality, inadequate feeding or underlying illness.",

        prevention:
            "Provide balanced feed suitable for the pig's growth stage. Store feed properly. Maintain clean water and monitor body condition.",

        medicine:
            "Multivitamin products may be used for specific nutritional support where appropriate. They should not replace balanced feed or diagnosis of disease.",

        route:
            "Depends on the exact product.",

        warning:
            "A multivitamin is not a substitute for correcting an unbalanced feeding programme."
    },


    reproductive_problem: {

        name: "Reproductive / Heat-Related Problem",

        signs:
            "Failure to show heat, irregular heat signs, poor breeding performance, reduced conception rates or unusual reproductive discharge.",

        cause:
            "Possible causes include poor nutrition, stress, reproductive disease, body-condition problems, management factors and hormonal conditions.",

        prevention:
            "Maintain appropriate sow body condition. Provide balanced feed. Keep breeding records. Monitor heat signs and obtain veterinary assessment for repeated reproductive problems.",

        medicine:
            "Farrow Sure is a product name used in some pig-management settings around weaning and heat management. Confirm its exact formulation and intended use. Hormonal products must only be used under veterinary direction.",

        route:
            "Check the exact product label and veterinary instructions.",

        warning:
            "Do not assume failure to show heat can be corrected by administering a product without investigating the cause."
    },


    farrowing_assistance: {

        name: "Farrowing Difficulty",

        signs:
            "Prolonged labour, strong straining without delivery, weakness, distress, abnormal discharge or long intervals between piglets.",

        cause:
            "Possible causes include difficult positioning of piglets, obstruction, uterine problems, fatigue and other reproductive complications.",

        prevention:
            "Monitor sows closely during farrowing. Maintain suitable farrowing conditions. Keep records of farrowing progress and ensure trained assistance is available.",

        medicine:
            "Oxytocin-20 is a hormonal product name. Oxytocin should only be used after veterinary assessment confirms that its use is appropriate. It must not be used to force labour when obstruction may be present.",

        route:
            "Veterinary-directed administration only. Confirm the exact formulation and route.",

        warning:
            "Farrowing difficulty is an emergency. Do not administer oxytocin without veterinary assessment because inappropriate use can seriously harm the sow and piglets."
    },


    other: {

        name: "Other Disease / Condition",

        signs:
            "Record the signs observed in the pig and describe when they started.",

        cause:
            "The possible cause has not yet been identified. Further observation and veterinary examination may be required.",

        prevention:
            "Maintain good hygiene, clean water, balanced feed, suitable ventilation, appropriate biosecurity and regular health monitoring.",

        medicine:
            "Enter only the medicine confirmed by the responsible veterinary professional or selected according to the exact product label.",

        route:
            "Confirm the route from the exact product label.",

        warning:
            "Do not guess the diagnosis or medicine."
    }

};


/* ================================================================
   4. MEDICINE REFERENCE DATABASE
   ================================================================ */

const medicineDatabase = {

    "Bilocin / Tylosin": {
        category: "Antibiotic",
        purpose: "Certain bacterial infections where the exact product is approved.",
        route: "Product-dependent; check label.",
        caution: "Requires veterinary diagnosis. Do not use automatically for every case of diarrhoea."
    },

    "Farrow Sure": {
        category: "Reproductive management product",
        purpose: "Product-specific reproductive or heat-management use.",
        route: "Check exact product label.",
        caution: "Confirm the formulation and timing with a veterinary professional."
    },

    "Dewormer": {
        category: "Antiparasitic",
        purpose: "Control of specific internal parasites.",
        route: "Depends on the active ingredient and formulation.",
        caution: "Check pig category, pregnancy restrictions, parasite target and withdrawal period."
    },

    "Litter Guard": {
        category: "Preventive product",
        purpose: "Product-specific preventive use in breeding and farrowing management.",
        route: "Check exact product label.",
        caution: "Confirm its active ingredients and approved use. Do not assume it protects against every disease."
    },

    "Sulfa-333": {
        category: "Antimicrobial product",
        purpose: "May be used for specific susceptible infections where approved.",
        route: "Check exact formulation.",
        caution: "Veterinary diagnosis and label instructions are essential."
    },

    "Introcil Pump": {
        category: "Veterinary medicine",
        purpose: "Product-specific use. Confirm the active ingredient and indication.",
        route: "Check product label.",
        caution: "Do not assume it treats every form of diarrhoea."
    },

    "Hi-Tech / Moxlin": {
        category: "Veterinary medicine",
        purpose: "Product-specific treatment depending on the active ingredient.",
        route: "Check product label.",
        caution: "Confirm the actual active ingredient before selecting it."
    },

    "Penstrep-400LA": {
        category: "Antibiotic",
        purpose: "Certain susceptible bacterial infections, depending on the formulation.",
        route: "Follow the exact veterinary product label.",
        caution: "It is an antibiotic combination in common formulations, not a general painkiller."
    },

    "Specto Guard Liquid": {
        category: "Veterinary medicine",
        purpose: "Product-specific use in piglets, depending on the formulation.",
        route: "Check exact label.",
        caution: "Confirm age restrictions, indication, active ingredient and withdrawal period."
    },

    "Limoxin-2 Spray": {
        category: "Topical veterinary product",
        purpose: "Product-specific external skin or wound use.",
        route: "Spray only if the label approves this application.",
        caution: "Avoid eyes, mouth and other areas not approved on the label."
    },

    "Tincture of Iodine": {
        category: "Antiseptic",
        purpose: "Suitable external skin antiseptic uses depending on concentration and formulation.",
        route: "Topical application according to label.",
        caution: "Not every iodine formulation is suitable for every wound or body area."
    },

    "Ivermectin": {
        category: "Antiparasitic",
        purpose: "Control of certain susceptible internal and external parasites.",
        route: "Depends on the exact formulation.",
        caution: "Check pig category, pregnancy restrictions and withdrawal period."
    },

    "Multivitamin": {
        category: "Nutritional support",
        purpose: "Supplementation where a specific nutritional need exists.",
        route: "Product-dependent.",
        caution: "Does not replace balanced feed or diagnosis."
    },

    "Sulfadimidine Sodium": {
        category: "Antimicrobial",
        purpose: "Certain susceptible infections where the product is approved.",
        route: "Check exact formulation.",
        caution: "Use only under veterinary guidance and follow withdrawal requirements."
    },

    "Glucortin": {
        category: "Veterinary medicine",
        purpose: "Cannot be confirmed from the brand name alone.",
        route: "Check exact formulation.",
        caution: "Confirm active ingredient before use. If it is a corticosteroid, special precautions apply."
    },

    "Intrafer-100 B12": {
        category: "Iron / vitamin product",
        purpose: "Iron supplementation and blood-health support where indicated.",
        route: "Check exact formulation and label.",
        caution: "Confirm piglet age, product concentration and approved use."
    },

    "Oxytocin-20": {
        category: "Hormonal veterinary medicine",
        purpose: "Specific reproductive indications under veterinary supervision.",
        route: "Veterinary-directed only.",
        caution: "Never use routinely to force farrowing. Obstruction must be ruled out first."
    },

    "Supona Aerosol": {
        category: "External product",
        purpose: "Product-specific external application.",
        route: "Spray only where approved by the label.",
        caution: "Confirm whether the formulation is approved for direct use on pigs."
    },

    "Healing Oil": {
        category: "Wound-care product",
        purpose: "Product-specific external wound-care use.",
        route: "Topical, if approved.",
        caution: "Use only on wounds and animals specified on the label."
    },

    "Icomectin": {
        category: "Antiparasitic",
        purpose: "Specific parasite-control uses depending on formulation.",
        route: "Check exact product label.",
        caution: "Confirm active ingredient, concentration and approved pig category."
    },

    "Avermectin": {
        category: "Antiparasitic",
        purpose: "Specific parasite-control uses depending on formulation.",
        route: "Check exact product label.",
        caution: "The name alone does not establish a safe dosage or route."
    },

    "Intermectin": {
        category: "Antiparasitic",
        purpose: "Specific parasite-control uses depending on formulation.",
        route: "Check exact product label.",
        caution: "Confirm active ingredient and approved use."
    }

};


/* ================================================================
   5. AUTOMATIC HEALTH INFORMATION PANEL
   ================================================================ */

function createHealthInformationPanel() {

    const symptomElement = document.getElementById("symptom");

    if (!symptomElement) {
        return;
    }

    if (document.getElementById("munkaHealthInformation")) {
        return;
    }

    const panel = document.createElement("div");

    panel.id = "munkaHealthInformation";

    panel.style.cssText = `
        display:none;
        margin-top:15px;
        padding:18px;
        border-radius:10px;
        background:#f1f8f3;
        border:1px solid #9bc9a5;
        color:#173d25;
        line-height:1.6;
    `;

    panel.innerHTML = `
        <h3 style="margin-top:0;">
            🩺 MUNKA PIG HEALTH INFORMATION
        </h3>

        <div id="healthSigns"></div>

        <div id="healthCause"></div>

        <div id="healthPrevention"></div>

        <div id="healthMedicine"></div>

        <div id="healthRoute"></div>

        <div id="healthWarning"></div>

        <p style="
            margin-bottom:0;
            font-size:12px;
            font-weight:bold;
            color:#8a351b;
        ">
            Veterinary reference only. Confirm diagnosis and medicine
            instructions before administering treatment.
        </p>
    `;

    const formSection = symptomElement.closest(".form-section");

    if (formSection) {

        formSection.appendChild(panel);

    } else {

        symptomElement.parentElement.appendChild(panel);

    }
}


function displayHealthInformation(condition) {

    const panel = document.getElementById("munkaHealthInformation");

    if (!panel) {
        return;
    }

    const disease = healthDatabase[condition];

    if (!disease) {

        panel.style.display = "none";

        return;
    }

    document.getElementById("healthSigns").innerHTML = `
        <p><strong>Signs and Symptoms:</strong><br>
        ${escapeHTML(disease.signs)}</p>
    `;

    document.getElementById("healthCause").innerHTML = `
        <p><strong>Possible Causes:</strong><br>
        ${escapeHTML(disease.cause)}</p>
    `;

    document.getElementById("healthPrevention").innerHTML = `
        <p><strong>Prevention Measures:</strong><br>
        ${escapeHTML(disease.prevention)}</p>
    `;

    document.getElementById("healthMedicine").innerHTML = `
        <p><strong>Medicine Reference:</strong><br>
        ${escapeHTML(disease.medicine)}</p>
    `;

    document.getElementById("healthRoute").innerHTML = `
        <p><strong>Administration Guidance:</strong><br>
        ${escapeHTML(disease.route)}</p>
    `;

    document.getElementById("healthWarning").innerHTML = `
        <p style="
            padding:10px;
            background:#fff1e9;
            border-left:4px solid #d66a26;
        ">
        <strong>Important:</strong><br>
        ${escapeHTML(disease.warning)}
        </p>
    `;

    panel.style.display = "block";
}


/* ================================================================
   6. LOAD DISEASE INFORMATION INTO EXISTING FORM FIELDS
   ================================================================ */

function loadDiseaseInformation() {

    const symptomElement = document.getElementById("symptom");

    if (!symptomElement) {
        return;
    }

    const selectedDisease = symptomElement.value;

    const otherGroup = document.getElementById("otherDiseaseGroup");

    const otherInput = document.getElementById("otherDisease");

    if (selectedDisease === "other") {

        if (otherGroup) {
            otherGroup.style.display = "block";
        }

    } else {

        if (otherGroup) {
            otherGroup.style.display = "none";
        }

        if (otherInput) {
            otherInput.value = "";
        }
    }

    const disease = healthDatabase[selectedDisease];

    if (!disease) {

        setFieldValue("possibleCause", "");

        setFieldValue("prevention", "");

        setFieldValue("medicine", "");

        displayHealthInformation("");

        return;
    }

    setFieldValue("possibleCause", disease.cause);

    setFieldValue("prevention", disease.prevention);

    /*
       Medicine is populated as a reference.
       The user must confirm the actual product before saving.
    */

    setFieldValue("medicine", disease.medicine);

    displayHealthInformation(selectedDisease);
}


/* ================================================================
   7. MEDICINE INFORMATION LOOKUP
   ================================================================ */

function getMedicineInformation(medicineName) {

    if (!medicineName) {
        return null;
    }

    const searchName = medicineName.toLowerCase();

    for (const [name, information] of Object.entries(medicineDatabase)) {

        if (searchName.includes(name.toLowerCase())) {

            return {
                name,
                ...information
            };
        }
    }

    return null;
}


/* ================================================================
   8. AUTOMATIC NEXT ADMINISTRATION DATE
   ================================================================ */

function calculateNextDate() {

    const treatmentDate = getFieldValue("treatmentDate");

    const interval = Number(getFieldValue("interval"));

    const nextDateElement = document.getElementById("nextDate");

    if (!nextDateElement) {
        return;
    }

    if (!treatmentDate || !Number.isFinite(interval) || interval < 1) {

        nextDateElement.value = "";

        return;
    }

    const date = new Date(treatmentDate + "T00:00:00");

    date.setDate(date.getDate() + interval);

    const year = date.getFullYear();

    const month = String(date.getMonth() + 1).padStart(2, "0");

    const day = String(date.getDate()).padStart(2, "0");

    nextDateElement.value = `${year}-${month}-${day}`;
}


/* ================================================================
   9. FORM VALIDATION
   ================================================================ */

function validateTreatmentForm() {

    const requiredFields = [
        "pigID",
        "treatmentDate",
        "symptom"
    ];

    for (const field of requiredFields) {

        const value = getFieldValue(field);

        if (!value) {

            showMessage(
                "Please complete all required fields before saving."
            );

            document.getElementById(field)?.focus();

            return false;
        }
    }

    if (
        getFieldValue("symptom") === "other" &&
        !getFieldValue("otherDisease")
    ) {

        showMessage("Please specify the disease or condition.");

        document.getElementById("otherDisease")?.focus();

        return false;
    }

    if (!getFarmID()) {

        showMessage(
            "Your account is not assigned to a farm. Please contact the farm administrator."
        );

        return false;
    }

    return true;
}


/* ================================================================
   10. GET SELECTED CONDITION NAME
   ================================================================ */

function getSelectedConditionName() {

    const symptom = getFieldValue("symptom");

    if (symptom === "other") {

        return getFieldValue("otherDisease") || "Other";
    }

    const disease = healthDatabase[symptom];

    return disease ? disease.name : symptom;
}


/* ================================================================
   11. ACTIVITY LOGGING
   ================================================================ */

async function logTreatmentActivity(action, details) {

    try {

        if (typeof saveActivity !== "function") {
            return;
        }

        const userDetails =
            `${getUserName()} (${getUserRole()})`;

        await saveActivity(
            userDetails,
            action,
            "Vaccination & Treatment",
            details
        );

    } catch (error) {

        console.error("Treatment activity logging error:", error);
    }
}


/* ================================================================
   12. SAVE TREATMENT RECORD
   ================================================================ */

async function saveRecord() {

    if (!validateTreatmentForm()) {
        return;
    }

    const user = getLoggedUser();

    const farmID = getFarmID();

    const saveButton = document.getElementById("saveBtn");

    if (saveButton) {
        saveButton.disabled = true;
        saveButton.textContent = "Saving...";
    }

    try {

        const pigID = getFieldValue("pigID");

        const symptom = getFieldValue("symptom");

        const conditionName = getSelectedConditionName();

        const now = new Date().toISOString();

        const record = {

            farm_id: farmID,

            pig_id: pigID,

            breed: getFieldValue("breed"),

            sex: getFieldValue("sex"),

            age: getFieldValue("age") || null,

            age_unit: getFieldValue("ageUnit"),

            treatment_date: getFieldValue("treatmentDate"),

            symptom: conditionName,

            possible_cause: getFieldValue("possibleCause"),

            prevention: getFieldValue("prevention"),

            medicine: getFieldValue("medicine"),

            route: getFieldValue("route"),

            dosage: getFieldValue("dosage"),

            interval_days: Number(getFieldValue("interval")) || null,

            next_administration_date: getFieldValue("nextDate") || null,

            administered_by: getFieldValue("administeredBy"),

            remarks: getFieldValue("remarks"),

            created_by: user?.id || user?.username || getUserName(),

            created_at: now,

            updated_by: user?.id || user?.username || getUserName(),

            updated_at: now

        };


        const { data, error } = await supabaseClient
            .from("treatment_records")
            .insert([record])
            .select();


        if (error) {
            throw error;
        }


        await logTreatmentActivity(
            "Added",
            `Treatment record added for Pig ID ${pigID}. Condition: ${conditionName}.`
        );


        showMessage("Treatment record saved successfully.");

        clearTreatmentForm();

        await loadRecords();


    } catch (error) {

        console.error("Save treatment error:", error);

        showMessage(
            "Unable to save treatment record: " + error.message
        );

    } finally {

        if (saveButton) {
            saveButton.disabled = false;
            saveButton.textContent = "💾 Save Record";
        }
    }
}


/* ================================================================
   13. CREATE TREATMENT TABLE ROW
   ================================================================ */

function createTreatmentRow(record) {

    const tr = document.createElement("tr");

    tr.innerHTML = `

        <td>${escapeHTML(record.pig_id)}</td>

        <td>${escapeHTML(record.breed || "-")}</td>

        <td>${escapeHTML(record.symptom || "-")}</td>

        <td>${escapeHTML(record.medicine || "-")}</td>

        <td>${escapeHTML(record.route || "-")}</td>

        <td>${escapeHTML(record.dosage || "-")}</td>

        <td>${escapeHTML(formatDate(record.treatment_date))}</td>

        <td>${escapeHTML(formatDate(record.next_administration_date))}</td>

        <td>${escapeHTML(record.administered_by || "-")}</td>

        <td>

            <button
                type="button"
                class="edit-btn"
                data-edit-id="${escapeHTML(record.id)}">
                ✏️ Edit
            </button>

            <button
                type="button"
                class="delete-btn"
                data-delete-id="${escapeHTML(record.id)}">
                🗑️ Delete
            </button>

        </td>

    `;

    return tr;
}


/* ================================================================
   14. LOAD TREATMENT RECORDS
   ================================================================ */

async function loadRecords() {

    const farmID = getFarmID();

    const table = document.getElementById("treatmentTable");

    if (!table) {
        return;
    }

    if (!farmID) {

        table.innerHTML = `
            <tr>
                <td colspan="10">
                    Your account is not assigned to a farm.
                </td>
            </tr>
        `;

        return;
    }

    table.innerHTML = `
        <tr>
            <td colspan="10">Loading treatment records...</td>
        </tr>
    `;

    try {

        const { data, error } = await supabaseClient
            .from("treatment_records")
            .select("*")
            .eq("farm_id", farmID)
            .order("id", { ascending: false });


        if (error) {
            throw error;
        }

        treatmentRecords = data || [];

        table.innerHTML = "";

        if (treatmentRecords.length === 0) {

            table.innerHTML = `
                <tr>
                    <td colspan="10">
                        No treatment records found.
                    </td>
                </tr>
            `;

            return;
        }

        treatmentRecords.forEach(record => {

            table.appendChild(createTreatmentRow(record));

        });


    } catch (error) {

        console.error("Load treatment records error:", error);

        table.innerHTML = `
            <tr>
                <td colspan="10">
                    Unable to load treatment records.
                </td>
            </tr>
        `;
    }
}


/* ================================================================
   15. SEARCH PIG TREATMENT HISTORY
   ================================================================ */

async function searchPig() {

    const farmID = getFarmID();

    const pigID = getFieldValue("searchPig");

    const table = document.getElementById("treatmentTable");

    if (!table) {
        return;
    }

    if (!farmID) {

        showMessage("Your account is not assigned to a farm.");

        return;
    }

    if (!pigID) {

        showMessage("Please enter a Pig ID to search.");

        return;
    }

    table.innerHTML = `
        <tr>
            <td colspan="10">Searching...</td>
        </tr>
    `;

    try {

        const { data, error } = await supabaseClient
            .from("treatment_records")
            .select("*")
            .eq("farm_id", farmID)
            .eq("pig_id", pigID)
            .order("id", { ascending: false });


        if (error) {
            throw error;
        }

        table.innerHTML = "";

        if (!data || data.length === 0) {

            table.innerHTML = `
                <tr>
                    <td colspan="10">
                        No treatment history found for Pig ID:
                        ${escapeHTML(pigID)}
                    </td>
                </tr>
            `;

            return;
        }

        data.forEach(record => {

            table.appendChild(createTreatmentRow(record));

        });


    } catch (error) {

        console.error("Pig treatment search error:", error);

        showMessage(
            "Unable to search treatment records: " + error.message
        );

    }
}


/* ================================================================
   16. SEARCH REGISTERED PIG INFORMATION
   ================================================================ */

async function lookupRegisteredPig() {

    const pigID = getFieldValue("pigID");

    const farmID = getFarmID();

    if (!pigID || !farmID) {
        return;
    }

    try {

        const { data, error } = await supabaseClient
            .from("pigs")
            .select("*")
            .eq("farm_id", farmID)
            .eq("pig_id", pigID)
            .maybeSingle();


        if (error) {

            console.warn("Pig lookup:", error.message);

            return;
        }

        if (!data) {
            return;
        }

        if (data.breed) {
            setFieldValue("breed", data.breed);
        }

        if (data.sex) {
            setFieldValue("sex", data.sex);
        }

        if (data.age !== undefined && data.age !== null) {
            setFieldValue("age", data.age);
        }

        if (data.age_unit) {
            setFieldValue("ageUnit", data.age_unit);
        }

    } catch (error) {

        console.error("Registered pig lookup error:", error);
    }
}


/* ================================================================
   17. EDIT TREATMENT RECORD
   ================================================================ */

async function editTreatment(id) {

    const farmID = getFarmID();

    if (!farmID) {
        showMessage("Your account is not assigned to a farm.");
        return;
    }

    try {

        const { data, error } = await supabaseClient
            .from("treatment_records")
            .select("*")
            .eq("id", id)
            .eq("farm_id", farmID)
            .single();


        if (error) {
            throw error;
        }

        editID = id;

        setFieldValue("pigID", data.pig_id);

        setFieldValue("breed", data.breed);

        setFieldValue("sex", data.sex);

        setFieldValue("age", data.age);

        setFieldValue("ageUnit", data.age_unit);

        setFieldValue("treatmentDate", data.treatment_date);


        const diseaseKey = Object.keys(healthDatabase).find(key => {

            return healthDatabase[key].name === data.symptom;

        });


        if (diseaseKey) {

            setFieldValue("symptom", diseaseKey);

            loadDiseaseInformation();

        } else {

            setFieldValue("symptom", "other");

            loadDiseaseInformation();

            setFieldValue("otherDisease", data.symptom || "");

        }


        setFieldValue("possibleCause", data.possible_cause);

        setFieldValue("prevention", data.prevention);

        setFieldValue("medicine", data.medicine);

        setFieldValue("route", data.route);

        setFieldValue("dosage", data.dosage);

        setFieldValue("interval", data.interval_days || "1");

        setFieldValue(
            "nextDate",
            data.next_administration_date
        );

        setFieldValue("administeredBy", data.administered_by);

        setFieldValue("remarks", data.remarks);


        const saveButton = document.getElementById("saveBtn");

        const updateButton = document.getElementById("updateBtn");

        if (saveButton) {
            saveButton.style.display = "none";
        }

        if (updateButton) {
            updateButton.style.display = "inline-block";
        }


        displayHealthInformation(diseaseKey || "");

        document.getElementById("treatmentForm")?.scrollIntoView({
            behavior: "smooth"
        });


    } catch (error) {

        console.error("Edit treatment error:", error);

        showMessage(
            "Unable to open treatment record: " + error.message
        );
    }
}


/* ================================================================
   18. UPDATE TREATMENT RECORD
   ================================================================ */

async function updateRecord() {

    if (!editID) {

        showMessage("Please select a treatment record to update.");

        return;
    }

    if (!validateTreatmentForm()) {
        return;
    }

    const farmID = getFarmID();

    const user = getLoggedUser();

    const updateButton = document.getElementById("updateBtn");

    if (updateButton) {
        updateButton.disabled = true;
        updateButton.textContent = "Updating...";
    }

    try {

        const pigID = getFieldValue("pigID");

        const conditionName = getSelectedConditionName();

        const updateData = {

            pig_id: pigID,

            breed: getFieldValue("breed"),

            sex: getFieldValue("sex"),

            age: getFieldValue("age") || null,

            age_unit: getFieldValue("ageUnit"),

            treatment_date: getFieldValue("treatmentDate"),

            symptom: conditionName,

            possible_cause: getFieldValue("possibleCause"),

            prevention: getFieldValue("prevention"),

            medicine: getFieldValue("medicine"),

            route: getFieldValue("route"),

            dosage: getFieldValue("dosage"),

            interval_days: Number(getFieldValue("interval")) || null,

            next_administration_date: getFieldValue("nextDate") || null,

            administered_by: getFieldValue("administeredBy"),

            remarks: getFieldValue("remarks"),

            updated_by: user?.id || user?.username || getUserName(),

            updated_at: new Date().toISOString()

        };


        const { error } = await supabaseClient
            .from("treatment_records")
            .update(updateData)
            .eq("id", editID)
            .eq("farm_id", farmID);


        if (error) {
            throw error;
        }


        await logTreatmentActivity(
            "Updated",
            `Treatment record updated for Pig ID ${pigID}. Condition: ${conditionName}.`
        );


        showMessage("Treatment record updated successfully.");

        clearTreatmentForm();

        await loadRecords();


    } catch (error) {

        console.error("Update treatment error:", error);

        showMessage(
            "Unable to update treatment record: " + error.message
        );

    } finally {

        if (updateButton) {
            updateButton.disabled = false;
            updateButton.textContent = "✏️ Update Record";
        }
    }
}


/* ================================================================
   19. DELETE TREATMENT RECORD
   ================================================================ */

async function deleteTreatment(id) {

    const farmID = getFarmID();

    if (!farmID) {
        showMessage("Your account is not assigned to a farm.");
        return;
    }

    const confirmed = confirm(
        "Are you sure you want to delete this treatment record?"
    );

    if (!confirmed) {
        return;
    }

    try {

        const { data, error } = await supabaseClient
            .from("treatment_records")
            .delete()
            .eq("id", id)
            .eq("farm_id", farmID)
            .select("pig_id, symptom");


        if (error) {
            throw error;
        }

        if (!data || data.length === 0) {

            showMessage(
                "The record could not be deleted. Check your permissions."
            );

            return;
        }


        await logTreatmentActivity(
            "Deleted",
            `Treatment record deleted for Pig ID ${data[0].pig_id}.`
        );


        showMessage("Treatment record deleted successfully.");

        await loadRecords();


    } catch (error) {

        console.error("Delete treatment error:", error);

        showMessage(
            "Unable to delete treatment record: " + error.message
        );
    }
}


/* ================================================================
   20. GENERATE TREATMENT REPORT
   ================================================================ */

async function generateTreatmentReport() {

    const farmID = getFarmID();

    if (!farmID) {

        showMessage("Your account is not assigned to a farm.");

        return;
    }

    try {

        const { data, error } = await supabaseClient
            .from("treatment_records")
            .select("*")
            .eq("farm_id", farmID)
            .order("treatment_date", { ascending: false });


        if (error) {
            throw error;
        }

        const records = data || [];

        treatmentRecords = records;

        const total = records.length;

        const successful = records.filter(record => {

            return (record.remarks || "")
                .toLowerCase()
                .includes("success");

        }).length;

        const properlyAdministered = records.filter(record => {

            return (record.remarks || "")
                .toLowerCase()
                .includes("properly administered");

        }).length;

        const notProperlyAdministered = records.filter(record => {

            return (
                (record.remarks || "").toLowerCase().includes("not properly") ||
                (record.remarks || "").toLowerCase().includes("incorrect") ||
                (record.remarks || "").toLowerCase().includes("missed")
            );

        }).length;

        const conditions = {};

        records.forEach(record => {

            const condition = record.symptom || "Unspecified";

            conditions[condition] = (conditions[condition] || 0) + 1;

        });

        currentTreatmentReport = {
            total,
            successful,
            properlyAdministered,
            notProperlyAdministered,
            conditions,
            records
        };


        let conditionSummary = "";

        Object.entries(conditions).forEach(([condition, count]) => {

            conditionSummary +=
                `\n${condition}: ${count} record(s)`;

        });


        showMessage(

            "MUNKA PIGGERY TREATMENT REPORT\n\n" +

            "Total Treatment Records: " + total + "\n" +

            "Records marked successful: " + successful + "\n" +

            "Properly administered records: " + properlyAdministered + "\n" +

            "Records requiring attention: " + notProperlyAdministered +

            "\n\nCONDITION SUMMARY\n" +

            (conditionSummary || "\nNo conditions recorded.")

        );


    } catch (error) {

        console.error("Treatment report error:", error);

        showMessage(
            "Unable to generate report: " + error.message
        );
    }
}


/* ================================================================
   21. DOWNLOAD TREATMENT REPORT AS PDF
   ================================================================ */

async function downloadTreatmentPDF() {

    const farmID = getFarmID();

    if (!farmID) {

        showMessage("Your account is not assigned to a farm.");

        return;
    }

    if (!window.jspdf || !window.jspdf.jsPDF) {

        showMessage(
            "PDF library is not available. Please check your internet connection."
        );

        return;
    }

    try {

        const { data, error } = await supabaseClient
            .from("treatment_records")
            .select("*")
            .eq("farm_id", farmID)
            .order("treatment_date", { ascending: false });


        if (error) {
            throw error;
        }

        const records = data || [];

        const { jsPDF } = window.jspdf;

        const doc = new jsPDF("landscape");

        const farmNameElement = document.querySelector("[data-farm-name]");

        const farmName = farmNameElement
            ? farmNameElement.textContent
            : "Registered Farm";


        doc.setFontSize(18);

        doc.text("MUNKA PIGGERY TECHNOLOGY", 14, 15);

        doc.setFontSize(13);

        doc.text("VACCINATION & TREATMENT REPORT", 14, 23);

        doc.setFontSize(10);

        doc.text("Registered Farm: " + farmName, 14, 31);

        doc.text("Report Date: " + new Date().toLocaleDateString("en-GB"), 14, 37);

        doc.text("Total Records: " + records.length, 14, 43);


        const tableRows = records.map(record => [

            record.pig_id || "",

            record.breed || "",

            record.symptom || "",

            record.medicine || "",

            record.route || "",

            record.dosage || "",

            formatDate(record.treatment_date),

            formatDate(record.next_administration_date),

            record.administered_by || ""

        ]);


        if (typeof doc.autoTable !== "function") {

            showMessage(
                "PDF table extension is unavailable. Please refresh the page."
            );

            return;
        }


        doc.autoTable({

            startY: 49,

            head: [[

                "Pig ID",

                "Breed",

                "Condition",

                "Medicine",

                "Route",

                "Dosage",

                "Treatment Date",

                "Next Date",

                "Administered By"

            ]],

            body: tableRows,

            styles: {
                fontSize: 7,
                cellPadding: 2
            },

            headStyles: {
                fillColor: [28, 95, 55]
            },

            theme: "grid"

        });


        doc.save("MUNKA_Treatment_Report.pdf");


    } catch (error) {

        console.error("PDF generation error:", error);

        showMessage(
            "Unable to generate PDF: " + error.message
        );
    }
}


/* ================================================================
   22. PRINT TREATMENT REPORT
   ================================================================ */

async function printTreatmentReport() {

    const farmID = getFarmID();

    if (!farmID) {

        showMessage("Your account is not assigned to a farm.");

        return;
    }

    try {

        const { data, error } = await supabaseClient
            .from("treatment_records")
            .select("*")
            .eq("farm_id", farmID)
            .order("treatment_date", { ascending: false });


        if (error) {
            throw error;
        }

        const records = data || [];

        const farmName =
            document.querySelector("[data-farm-name]")?.textContent ||
            "Registered Farm";


        const printWindow = window.open("", "_blank");

        if (!printWindow) {

            showMessage(
                "Please allow pop-ups in your browser to print this report."
            );

            return;
        }


        let rows = "";

        records.forEach(record => {

            rows += `

                <tr>

                    <td>${escapeHTML(record.pig_id)}</td>

                    <td>${escapeHTML(record.breed)}</td>

                    <td>${escapeHTML(record.symptom)}</td>

                    <td>${escapeHTML(record.medicine)}</td>

                    <td>${escapeHTML(record.route)}</td>

                    <td>${escapeHTML(record.dosage)}</td>

                    <td>${escapeHTML(formatDate(record.treatment_date))}</td>

                    <td>${escapeHTML(formatDate(record.next_administration_date))}</td>

                    <td>${escapeHTML(record.administered_by)}</td>

                </tr>

            `;

        });


        printWindow.document.write(`

            <!DOCTYPE html>

            <html>

            <head>

                <title>MUNKA Treatment Report</title>

                <style>

                    body {
                        font-family: Arial, sans-serif;
                        padding: 20px;
                    }

                    h2, h3 {
                        text-align: center;
                    }

                    table {
                        width: 100%;
                        border-collapse: collapse;
                        margin-top: 20px;
                    }

                    th, td {
                        border: 1px solid #444;
                        padding: 7px;
                        text-align: left;
                        font-size: 10px;
                    }

                    th {
                        background: #e5eee7;
                    }

                    footer {
                        margin-top: 25px;
                        text-align: center;
                    }

                </style>

            </head>

            <body>

                <h2>MUNKA PIGGERY TECHNOLOGY</h2>

                <h3>VACCINATION & TREATMENT REPORT</h3>

                <p><strong>Registered Farm:</strong>
                ${escapeHTML(farmName)}</p>

                <p><strong>Report Date:</strong>
                ${escapeHTML(new Date().toLocaleDateString("en-GB"))}</p>

                <p><strong>Total Records:</strong>
                ${records.length}</p>

                <table>

                    <thead>

                        <tr>

                            <th>Pig ID</th>
                            <th>Breed</th>
                            <th>Condition</th>
                            <th>Medicine</th>
                            <th>Route</th>
                            <th>Dosage</th>
                            <th>Treated Date</th>
                            <th>Next Date</th>
                            <th>Administered By</th>

                        </tr>

                    </thead>

                    <tbody>

                        ${rows}

                    </tbody>

                </table>

                <footer>
                    <strong>MUNKA PIGGERY TECHNOLOGY</strong><br>
                    Vaccination & Treatment Management System
                </footer>

            </body>

            </html>

        `);


        printWindow.document.close();

        printWindow.focus();

        setTimeout(() => {

            printWindow.print();

        }, 500);


    } catch (error) {

        console.error("Print report error:", error);

        showMessage(
            "Unable to prepare print report: " + error.message
        );
    }
}


/* ================================================================
   23. CLEAR TREATMENT FORM
   ================================================================ */

function clearTreatmentForm() {

    const form = document.getElementById("treatmentForm");

    if (form) {
        form.reset();
    }

    editID = null;

    const otherGroup = document.getElementById("otherDiseaseGroup");

    if (otherGroup) {
        otherGroup.style.display = "none";
    }

    const panel = document.getElementById("munkaHealthInformation");

    if (panel) {
        panel.style.display = "none";
    }

    setFieldValue("possibleCause", "");

    setFieldValue("prevention", "");

    setFieldValue("medicine", "");

    setFieldValue("nextDate", "");


    const saveButton = document.getElementById("saveBtn");

    const updateButton = document.getElementById("updateBtn");

    if (saveButton) {

        saveButton.style.display = "inline-block";

        saveButton.disabled = false;

        saveButton.textContent = "💾 Save Record";
    }

    if (updateButton) {

        updateButton.style.display = "none";

        updateButton.disabled = false;

        updateButton.textContent = "✏️ Update Record";
    }
}


/* ================================================================
   24. EVENT LISTENERS
   ================================================================ */

document.addEventListener("DOMContentLoaded", async function () {

    console.log(
        "MUNKA PIGGERY VACCINATION & TREATMENT MODULE INITIALISED"
    );


    if (typeof supabaseClient === "undefined") {

        console.error(
            "Supabase client not found. Check supabase.js."
        );

        showMessage(
            "Supabase connection is not available. Please check your connection."
        );

        return;
    }


    if (!getLoggedUser()) {

        showMessage(
            "Your login session has expired. Please log in again."
        );

        window.location.href = "login.html";

        return;
    }


    createHealthInformationPanel();


    await getRegisteredFarmName();


    const symptomElement = document.getElementById("symptom");

    if (symptomElement) {

        symptomElement.addEventListener(
            "change",
            loadDiseaseInformation
        );

    }


    const treatmentDateElement =
        document.getElementById("treatmentDate");

    if (treatmentDateElement) {

        treatmentDateElement.addEventListener(
            "change",
            calculateNextDate
        );

    }


    const intervalElement =
        document.getElementById("interval");

    if (intervalElement) {

        intervalElement.addEventListener(
            "change",
            calculateNextDate
        );

    }


    const pigIDElement = document.getElementById("pigID");

    if (pigIDElement) {

        pigIDElement.addEventListener(
            "change",
            lookupRegisteredPig
        );

    }


    const saveButton = document.getElementById("saveBtn");

    if (saveButton) {

        saveButton.addEventListener(
            "click",
            saveRecord
        );

    }


    const updateButton = document.getElementById("updateBtn");

    if (updateButton) {

        updateButton.style.display = "none";

        updateButton.addEventListener(
            "click",
            updateRecord
        );

    }


    const table = document.getElementById("treatmentTable");

    if (table) {

        table.addEventListener("click", function (event) {

            const editButton = event.target.closest("[data-edit-id]");

            const deleteButton = event.target.closest("[data-delete-id]");


            if (editButton) {

                editTreatment(editButton.dataset.editId);

                return;
            }


            if (deleteButton) {

                deleteTreatment(deleteButton.dataset.deleteId);

            }

        });

    }


    await loadRecords();


});


/* ================================================================
   END OF MUNKA PIGGERY VACCINATION & TREATMENT MODULE
   ================================================================ */
