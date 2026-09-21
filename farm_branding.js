/* =========================================================
   MUNKA PIGGERY TECHNOLOGY
   FARM BRANDING
   Dynamically displays the registered farm name
========================================================= */

async function loadFarmBranding() {

    const farmNameElements =
        document.querySelectorAll("[data-farm-name]");

    if (!farmNameElements.length) {
        return;
    }

    // Initial display
    farmNameElements.forEach(element => {
        element.textContent = "Loading farm...";
    });

    try {

        if (typeof supabaseClient === "undefined") {
            throw new Error("supabaseClient is not available.");
        }

        /* =====================================================
           GET CURRENT AUTHENTICATED USER
        ====================================================== */

        const {
            data: sessionData,
            error: sessionError
        } = await supabaseClient.auth.getSession();

        if (sessionError) {
            throw sessionError;
        }

        const session = sessionData.session;

        if (!session || !session.user) {

            farmNameElements.forEach(element => {
                element.textContent = "Farm";
            });

            return;
        }

        const authUserId = session.user.id;


        /* =====================================================
           GET USER'S FARM ID
        ====================================================== */

        const {
            data: userProfile,
            error: userError
        } = await supabaseClient
            .from("users")
            .select("farm_id")
            .eq("auth_user_id", authUserId)
            .maybeSingle();

        if (userError) {
            throw userError;
        }

        if (!userProfile || !userProfile.farm_id) {

            farmNameElements.forEach(element => {
                element.textContent = "Farm";
            });

            return;
        }


        /* =====================================================
           GET REGISTERED FARM NAME
        ====================================================== */

        const {
            data: farm,
            error: farmError
        } = await supabaseClient
            .from("farms")
            .select("id, farm_name")
            .eq("id", userProfile.farm_id)
            .maybeSingle();

        if (farmError) {
            throw farmError;
        }

        if (!farm || !farm.farm_name) {

            farmNameElements.forEach(element => {
                element.textContent = "Farm";
            });

            return;
        }


        /* =====================================================
           DISPLAY FARM NAME
        ====================================================== */

        farmNameElements.forEach(element => {
            element.textContent = farm.farm_name;
        });


        /* =====================================================
           UPDATE PAGE TITLE
        ====================================================== */

        document.title =
            `${farm.farm_name} - Pig Registration | MUNKA PIGGERY TECHNOLOGY`;

    } catch (error) {

        console.error(
            "FARM BRANDING ERROR:",
            error
        );

        farmNameElements.forEach(element => {
            element.textContent = "Farm";
        });

    }
}


/* =========================================================
   START FARM BRANDING
========================================================= */

document.addEventListener(
    "DOMContentLoaded",
    function () {

        loadFarmBranding();

    }
);

