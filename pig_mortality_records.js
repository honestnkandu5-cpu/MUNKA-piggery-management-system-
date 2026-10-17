// =====================================================
// MUNKA PIGGERY TECHNOLOGY
// PIG MORTALITY RECORDS
//
// Database table:
// public.pig_mortality_records
//
// Population summary:
// public.farm_population_summary
//
// Existing connection:
// supabaseClient
// =====================================================

"use strict";


// =====================================================
// GLOBAL STATE
// =====================================================

let mortalityCurrentUser = null;

let mortalityFarmId = null;

let mortalityFarmName = "";

let mortalitySubmitting = false;


// =====================================================
// DOM HELPERS
// =====================================================

function mortalityElement(id) {
    return document.getElementById(id);
}


function mortalitySetStatus(elementId, message, type = "info") {

    const element = mortalityElement(elementId);

    if (!element) {
        return;
    }

    element.textContent = message;

    element.className = "status-message " + type;
}


function mortalityClearStatus(elementId) {

    const element = mortalityElement(elementId);

    if (!element) {
        return;
    }

    element.textContent = "";

    element.className = "status-message";
}


function mortalitySetText(elementId, value) {

    const element = mortalityElement(elementId);

    if (!element) {
        return;
    }

    element.textContent =
        value === null || value === undefined || value === ""
            ? "—"
            : String(value);
}


function mortalityFormatNumber(value) {

    if (value === null || value === undefined) {
        return "Not verified";
    }

    const number = Number(value);

    if (!Number.isFinite(number)) {
        return "Not available";
    }

    return number.toLocaleString("en-ZM");
}


function mortalityFormatDate(value) {

    if (!value) {
        return "—";
    }

    const match = String(value).match(/^(\d{4})-(\d{2})-(\d{2})$/);

    if (match) {
        return `${match[3]}/${match[2]}/${match[1]}`;
    }

    return String(value);
}


function mortalityErrorMessage(error) {

    if (!error) {
        return "An unexpected error occurred.";
    }

    if (error.code === "42501") {
        return "Access denied. Check your farm account and database permissions.";
    }

    if (error.code === "23503") {
        return "The farm or related record does not exist. Refresh the page and try again.";
    }

    if (error.code === "23514") {
        return "The submitted values do not satisfy a database validation rule.";
    }

    if (error.code === "23502") {
        return "A required database field is missing.";
    }

    if (error.message) {
        return error.message;
    }

    return "An unexpected database error occurred.";
}


// =====================================================
// LOCAL DATE
// Uses the device's local date.
// =====================================================

function mortalityGetLocalDate() {

    const now = new Date();

    const year = now.getFullYear();

    const month = String(now.getMonth() + 1).padStart(2, "0");

    const day = String(now.getDate()).padStart(2, "0");

    return `${year}-${month}-${day}`;
}


// =====================================================
// VERIFY SUPABASE CONNECTION AND AUTHENTICATION
// =====================================================

async function mortalityInitialize() {

    mortalitySetStatus(
        "populationStatus",
        "Verifying your account...",
        "info"
    );

    mortalitySetStatus(
        "historyStatus",
        "Checking your farm records...",
        "info"
    );

    try {

        // Make sure the existing Supabase connection is available.

        if (
            typeof supabaseClient === "undefined" ||
            !supabaseClient ||
            !supabaseClient.auth
        ) {
            throw new Error(
                "The existing Supabase connection was not found. Check supabase.js."
            );
        }


        // Confirm the authenticated Supabase user.

        const {
            data: authData,
            error: authError
        } = await supabaseClient.auth.getUser();


        if (authError) {
            throw authError;
        }


        const authenticatedUser = authData?.user;


        if (!authenticatedUser) {

            throw new Error(
                "Your login session has expired. Please log in again."
            );

        }


        // Retrieve the user's actual database profile.
        // Do not trust localStorage alone for farm access.

        const {
            data: profile,
            error: profileError
        } = await supabaseClient
            .from("users")
            .select(
                "id, full_name, username, role, status, farm_id"
            )
            .eq("auth_user_id", authenticatedUser.id)
            .maybeSingle();


        if (profileError) {
            throw profileError;
        }


        if (!profile) {

            throw new Error(
                "Your authenticated account has no matching profile in the users table."
            );

        }


        if (profile.status !== "Active") {

            throw new Error(
                "Your account is not Active. Contact your farm administrator."
            );

        }


        if (
            profile.farm_id === null ||
            profile.farm_id === undefined
        ) {

            throw new Error(
                "Your account has no farm assigned. Ask your administrator to assign your farm before using mortality records."
            );

        }


        // Store verified account information.

        mortalityCurrentUser = profile;

        mortalityFarmId = Number(profile.farm_id);


        if (!Number.isSafeInteger(mortalityFarmId) || mortalityFarmId <= 0) {

            throw new Error(
                "The farm ID in your user profile is invalid."
            );

        }


        // Display the verified user.

        mortalitySetText(
            "currentUser",
            profile.full_name || profile.username || profile.role
        );


        // Load the registered farm name from the population summary.

        await mortalityLoadPopulation();


        // Load the mortality history for this farm.

        await mortalityLoadHistory();


    } catch (error) {

        console.error(
            "Mortality module initialization error:",
            error
        );


        mortalitySetStatus(
            "populationStatus",
            mortalityErrorMessage(error),
            "error"
        );


        mortalitySetStatus(
            "historyStatus",
            "Mortality history could not be loaded. Verify your login and farm permissions.",
            "error"
        );


        mortalitySetText(
            "farmName",
            "Farm unavailable"
        );


        mortalitySetText(
            "currentUser",
            "Account verification failed"
        );


        const saveButton = mortalityElement(
            "saveMortalityButton"
        );

        if (saveButton) {
            saveButton.disabled = true;
        }

    }

}


// =====================================================
// LOAD FARM POPULATION
//
// View:
// public.farm_population_summary
//
// Columns used:
// farm_id
// farm_name
// opening_population
// current_population
// deaths_since_opening
// =====================================================

async function mortalityLoadPopulation() {

    if (!mortalityFarmId) {
        return;
    }


    mortalitySetStatus(
        "populationStatus",
        "Loading population information...",
        "info"
    );


    try {

        const {
            data,
            error
        } = await supabaseClient
            .from("farm_population_summary")
            .select(
                "farm_id, farm_name, opening_population, current_population, deaths_since_opening"
            )
            .eq("farm_id", mortalityFarmId)
            .maybeSingle();


        if (error) {
            throw error;
        }


        if (!data) {

            mortalitySetText(
                "farmName",
                mortalityFarmName || "Farm population unavailable"
            );


            mortalitySetText(
                "openingPopulation",
                "Not available"
            );


            mortalitySetText(
                "currentPopulation",
                "Not available"
            );


            mortalitySetText(
                "totalDeaths",
                "Not available"
            );


            mortalitySetStatus(
                "populationStatus",
                "No population summary was returned. Check view permissions and the farm's opening record.",
                "warning"
            );


            return;

        }


        mortalityFarmName = data.farm_name || "";


        mortalitySetText(
            "farmName",
            data.farm_name
        );


        mortalitySetText(
            "openingPopulation",
            mortalityFormatNumber(data.opening_population)
        );


        mortalitySetText(
            "currentPopulation",
            mortalityFormatNumber(data.current_population)
        );


        mortalitySetText(
            "totalDeaths",
            mortalityFormatNumber(data.deaths_since_opening)
        );


        if (data.opening_population === null) {

            mortalitySetStatus(
                "populationStatus",
                "The farm's opening population has not been verified. Record a physical count before relying on the current population figure.",
                "warning"
            );

        } else {

            mortalitySetStatus(
                "populationStatus",
                "Population information loaded successfully.",
                "success"
            );

        }


    } catch (error) {

        console.error(
            "Population loading error:",
            error
        );


        mortalitySetStatus(
            "populationStatus",
            "Could not load population summary: " +
                mortalityErrorMessage(error),
            "error"
        );

    }

}


// =====================================================
// LOAD MORTALITY HISTORY
//
// Table:
// public.pig_mortality_records
//
// Columns used:
// id
// farm_id
// death_date
// quantity
// pig_id
// category
// cause
// notes
// created_at
// =====================================================

async function mortalityLoadHistory() {

    if (!mortalityFarmId) {
        return;
    }


    mortalitySetStatus(
        "historyStatus",
        "Loading mortality records...",
        "info"
    );


    const tableBody = mortalityElement(
        "mortalityTableBody"
    );


    if (tableBody) {

        tableBody.replaceChildren();

        const row = document.createElement("tr");

        const cell = document.createElement("td");

        cell.colSpan = 6;

        cell.className = "empty-cell";

        cell.textContent = "Loading records...";

        row.appendChild(cell);

        tableBody.appendChild(row);

    }


    try {

        const {
            data,
            error
        } = await supabaseClient
            .from("pig_mortality_records")
            .select(
                "id, death_date, quantity, pig_id, category, cause, notes, created_at"
            )
            .eq("farm_id", mortalityFarmId)
            .order("death_date", {
                ascending: false
            })
            .order("id", {
                ascending: false
            })
            .limit(200);


        if (error) {
            throw error;
        }


        const records = data || [];


        if (!tableBody) {
            return;
        }


        tableBody.replaceChildren();


        if (records.length === 0) {

            const row = document.createElement("tr");

            const cell = document.createElement("td");

            cell.colSpan = 6;

            cell.className = "empty-cell";

            cell.textContent =
                "No mortality records have been recorded for this farm yet.";


            row.appendChild(cell);

            tableBody.appendChild(row);


            mortalitySetStatus(
                "historyStatus",
                "No mortality records found.",
                "info"
            );


            return;

        }


        for (const record of records) {

            const row = document.createElement("tr");


            const values = [
                mortalityFormatDate(record.death_date),
                record.pig_id || "Not specified",
                record.category || "Not specified",
                mortalityFormatNumber(record.quantity),
                record.cause || "Not specified",
                record.notes || "—"
            ];


            for (const value of values) {

                const cell = document.createElement("td");

                // textContent prevents record content from being
                // interpreted as HTML.

                cell.textContent = String(value);

                row.appendChild(cell);

            }


            tableBody.appendChild(row);

        }


        mortalitySetStatus(
            "historyStatus",
            `Showing ${records.length} most recent mortality record(s).`,
            "success"
        );


    } catch (error) {

        console.error(
            "Mortality history loading error:",
            error
        );


        mortalitySetStatus(
            "historyStatus",
            "Could not load mortality history: " +
                mortalityErrorMessage(error),
            "error"
        );


        if (tableBody) {

            tableBody.replaceChildren();

            const row = document.createElement("tr");

            const cell = document.createElement("td");

            cell.colSpan = 6;

            cell.className = "empty-cell";

            cell.textContent =
                "Records could not be loaded. Check database permissions.";

            row.appendChild(cell);

            tableBody.appendChild(row);

        }

    }

}


// =====================================================
// SAVE MORTALITY RECORD
//
// Exact table:
// public.pig_mortality_records
//
// The database trigger automatically creates a death
// event in public.pig_population_events.
//
// Do not insert a second death event from this script.
// =====================================================

async function mortalitySaveRecord(event) {

    event.preventDefault();


    if (mortalitySubmitting) {
        return;
    }


    mortalityClearStatus("formMessage");


    if (!mortalityCurrentUser || !mortalityFarmId) {

        mortalitySetStatus(
            "formMessage",
            "Your farm account has not been verified. Please log in again.",
            "error"
        );

        return;

    }


    const deathDate = mortalityElement(
        "deathDate"
    ).value;


    const quantityInput = mortalityElement(
        "quantity"
    ).value;


    const quantity = Number(quantityInput);


    const pigId = mortalityElement(
        "pigId"
    ).value.trim();


    const category = mortalityElement(
        "category"
    ).value;


    const cause = mortalityElement(
        "cause"
    ).value;


    const notes = mortalityElement(
        "notes"
    ).value.trim();


    // Validate the date.

    if (!deathDate) {

        mortalitySetStatus(
            "formMessage",
            "Please select the date of death.",
            "error"
        );

        return;

    }


    if (deathDate > mortalityGetLocalDate()) {

        mortalitySetStatus(
            "formMessage",
            "The death date cannot be in the future.",
            "error"
        );

        return;

    }


    // Validate the quantity.

    if (
        !Number.isSafeInteger(quantity) ||
        quantity < 1 ||
        quantity > 100000
    ) {

        mortalitySetStatus(
            "formMessage",
            "Enter a valid whole number of pigs that died.",
            "error"
        );

        return;

    }


    if (pigId.length > 100) {

        mortalitySetStatus(
            "formMessage",
            "The pig identification number is too long.",
            "error"
        );

        return;

    }


    if (notes.length > 3000) {

        mortalitySetStatus(
            "formMessage",
            "The notes exceed the permitted length.",
            "error"
        );

        return;

    }


    // Confirm the farm still has an active authenticated session.

    mortalitySubmitting = true;


    const saveButton = mortalityElement(
        "saveMortalityButton"
    );


    if (saveButton) {

        saveButton.disabled = true;

        saveButton.textContent = "Saving Record...";

    }


    try {

        const {
            data: authData,
            error: authError
        } = await supabaseClient.auth.getUser();


        if (authError) {
            throw authError;
        }


        if (!authData?.user) {

            throw new Error(
                "Your login session has expired. Log in again."
            );

        }


        // Recheck the profile before writing.

        const {
            data: profile,
            error: profileError
        } = await supabaseClient
            .from("users")
            .select("id, auth_user_id, status, farm_id")
            .eq("auth_user_id", authData.user.id)
            .maybeSingle();


        if (profileError) {
            throw profileError;
        }


        if (
            !profile ||
            profile.status !== "Active" ||
            Number(profile.farm_id) !== mortalityFarmId
        ) {

            throw new Error(
                "Your active farm assignment could not be verified. No record was saved."
            );

        }


        // Match the actual database column names.
        //
        // id and created_at are generated by the database.
        // created_by uses its existing database default.
        // Do not supply a separate population event.

        const mortalityRecord = {

            farm_id: mortalityFarmId,

            death_date: deathDate,

            quantity: quantity,

            pig_id: pigId || null,

            category: category || null,

            cause: cause || null,

            notes: notes || null

        };


        const {
            data: savedRecord,
            error: insertError
        } = await supabaseClient
            .from("pig_mortality_records")
            .insert(mortalityRecord)
            .select(
                "id, farm_id, death_date, quantity, pig_id, category, cause, notes, created_at"
            )
            .single();


        if (insertError) {
            throw insertError;
        }


        if (!savedRecord) {

            throw new Error(
                "The database did not return the saved mortality record."
            );

        }


        mortalitySetStatus(
            "formMessage",
            `Mortality record saved successfully. Record ID: ${savedRecord.id}. The database trigger has been invoked to update population tracking.`,
            "success"
        );


        // Reset the form only after successful insertion.

        mortalityElement(
            "mortalityForm"
        ).reset();


        mortalityElement(
            "deathDate"
        ).value = mortalityGetLocalDate();


        mortalityElement(
            "quantity"
        ).value = "1";


        // Reload the summary and history.

        await Promise.all([

            mortalityLoadPopulation(),

            mortalityLoadHistory()

        ]);


    } catch (error) {

        console.error(
            "Mortality record save error:",
            error
        );


        mortalitySetStatus(
            "formMessage",
            "The record could not be saved: " +
                mortalityErrorMessage(error),
            "error"
        );

    } finally {

        mortalitySubmitting = false;


        if (saveButton) {

            saveButton.disabled = false;

            saveButton.textContent = "Save Mortality Record";

        }

    }

}


// =====================================================
// REFRESH BUTTONS
// =====================================================

async function mortalityRefreshPopulation() {

    if (!mortalityFarmId) {
        return;
    }

    await mortalityLoadPopulation();

}


async function mortalityRefreshHistory() {

    if (!mortalityFarmId) {
        return;
    }

    await mortalityLoadHistory();

}


// =====================================================
// FORM RESET
// =====================================================

function mortalityResetForm() {

    mortalityClearStatus("formMessage");

    const dateInput = mortalityElement(
        "deathDate"
    );

    if (dateInput) {

        dateInput.value = mortalityGetLocalDate();

    }

}


// =====================================================
// INITIALIZE PAGE
// =====================================================

document.addEventListener("DOMContentLoaded", function () {

    const dateInput = mortalityElement(
        "deathDate"
    );


    if (dateInput) {

        dateInput.value = mortalityGetLocalDate();

    }


    const mortalityForm = mortalityElement(
        "mortalityForm"
    );


    if (mortalityForm) {

        mortalityForm.addEventListener(
            "submit",
            mortalitySaveRecord
        );


        mortalityForm.addEventListener(
            "reset",
            function () {

                setTimeout(
                    mortalityResetForm,
                    0
                );

            }
        );

    }


    const refreshPopulationButton = mortalityElement(
        "refreshPopulationButton"
    );


    if (refreshPopulationButton) {

        refreshPopulationButton.addEventListener(
            "click",
            mortalityRefreshPopulation
        );

    }


    const refreshHistoryButton = mortalityElement(
        "refreshHistoryButton"
    );


    if (refreshHistoryButton) {

        refreshHistoryButton.addEventListener(
            "click",
            mortalityRefreshHistory
        );

    }


    mortalityInitialize();

});

