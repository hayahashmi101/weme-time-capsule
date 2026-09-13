// =========================
// SUPABASE CONNECTION
// (same project as the student site)
// =========================

const SUPABASE_URL = "https://corwilzvhnpaxxwvtmvt.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_RlZ1neWv7EPv6A8t3uqXcQ_UiDogFNt";

const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);


// =========================
// SCREEN ELEMENTS
// =========================

const adminLoginScreen = document.getElementById("adminLoginScreen");
const adminCheckingScreen = document.getElementById("adminCheckingScreen");
const adminDeniedScreen = document.getElementById("adminDeniedScreen");
const adminDashboardScreen = document.getElementById("adminDashboardScreen");

const adminEmail = document.getElementById("adminEmail");
const sendAdminLink = document.getElementById("sendAdminLink");
const adminMessage = document.getElementById("adminMessage");


function showScreen(screen) {

    document.querySelectorAll(".screen").forEach(function (s) {
        s.classList.remove("active");
    });

    screen.classList.add("active");

}


// =========================
// SEND MAGIC LINK
// =========================

sendAdminLink.addEventListener("click", async function () {

    const email = adminEmail.value.trim();

    if (email === "") {
        adminMessage.textContent = "Please enter your email.";
        return;
    }

    sendAdminLink.disabled = true;
    adminMessage.textContent = "Sending link...";

    const { error } = await supabaseClient.auth.signInWithOtp({
    email: email,
    options: {
        emailRedirectTo: window.location.origin + "/admin.html"
    }
});

    sendAdminLink.disabled = false;

    if (error) {
        console.error("Error sending link:", error);
        adminMessage.textContent = "Something went wrong. Please try again.";
        return;
    }

    adminMessage.textContent = "Check your email for the sign-in link.";

});


// =========================
// CHECK ADMIN STATUS ON LOGIN
// =========================

async function checkAdminAccess(userId) {

    showScreen(adminCheckingScreen);

    const { data, error } = await supabaseClient
        .from("profiles")
        .select("is_admin")
        .eq("id", userId)
        .maybeSingle();

    if (error) {
        console.error("Error checking admin status:", error);
        showScreen(adminDeniedScreen);
        return;
    }

   if (data && data.is_admin === true) {
    showScreen(adminDashboardScreen);
    loadDashboardData();
} else {
    showScreen(adminDeniedScreen);
}

}


// Listen for login events
supabaseClient.auth.onAuthStateChange(function (event, session) {

    if (event === "SIGNED_IN" && session) {
        checkAdminAccess(session.user.id);
    }

});

// Also check immediately in case already logged in (e.g. page refresh)
supabaseClient.auth.getSession().then(function (result) {

    const session = result.data.session;

    if (session) {
        checkAdminAccess(session.user.id);
    }

});
// =========================
// DASHBOARD DATA
// =========================

const cohortSummary = document.getElementById("cohortSummary");

async function loadDashboardData() {

    const { data, error } = await supabaseClient
        .from("capsules")
        .select("department, graduation_year, status");

    if (error) {
        console.error("Error loading capsules:", error);
        cohortSummary.innerHTML = "<p class='instruction'>Failed to load data.</p>";
        return;
    }

    // Group capsules by department + graduation year
    const cohorts = {};

    data.forEach(function (capsule) {

        const key = capsule.department + "-" + capsule.graduation_year;

        if (!cohorts[key]) {
            cohorts[key] = {
                department: capsule.department,
                graduation_year: capsule.graduation_year,
                total: 0,
                sealed: 0,
                unlocked: 0,
                opened: 0
            };
        }

        cohorts[key].total++;
        cohorts[key][capsule.status]++;

    });

    // Build the HTML for each cohort card
    cohortSummary.innerHTML = "";

    Object.values(cohorts).forEach(function (cohort) {

        const card = document.createElement("div");
        card.className = "cohort-card";

            card.innerHTML = `
            <p class="cohort-card-title">${cohort.department} • CLASS OF ${cohort.graduation_year}</p>
            <p class="cohort-card-count">${cohort.total} CAPSULES</p>
            <p class="cohort-card-breakdown">
                ${cohort.sealed} sealed · ${cohort.unlocked} unlocked · ${cohort.opened} opened
            </p>
            <button class="unlock-cohort-btn"
                data-department="${cohort.department}"
                data-year="${cohort.graduation_year}">
                UNLOCK COHORT
            </button>
            <button class="view-cohort-btn"
                data-department="${cohort.department}"
                data-year="${cohort.graduation_year}">
                VIEW STUDENTS
            </button>
        `;

        cohortSummary.appendChild(card);

    });

    if (Object.keys(cohorts).length === 0) {
        cohortSummary.innerHTML = "<p class='instruction'>No capsules submitted yet.</p>";
    }

}
// =========================
// UNLOCK A COHORT
// =========================

// Using event delegation: one listener on the container catches clicks
// on any unlock button inside it, even ones added dynamically later
cohortSummary.addEventListener("click", async function (event) {

    const button = event.target.closest(".unlock-cohort-btn");

    if (!button) return;

    const department = button.dataset.department;
    const year = parseInt(button.dataset.year);

    const confirmed = confirm(
        `Unlock all capsules for ${department} Class of ${year}? This cannot be undone from here.`
    );

    if (!confirmed) return;

    button.disabled = true;
    button.textContent = "UNLOCKING...";

    const { error } = await supabaseClient
        .from("capsules")
        .update({ status: "unlocked" })
        .eq("department", department)
        .eq("graduation_year", year)
        .eq("status", "sealed");

    if (error) {
        console.error("Error unlocking cohort:", error);
        alert("Something went wrong. Please try again.");
        button.disabled = false;
        button.textContent = "UNLOCK COHORT";
        return;
    }

    // Refresh the whole dashboard so counts reflect the change
    loadDashboardData();

});
// =========================
// COHORT DETAIL (VIEW STUDENTS)
// =========================

const adminCohortDetailScreen = document.getElementById("adminCohortDetailScreen");
const cohortDetailTitle = document.getElementById("cohortDetailTitle");
const studentList = document.getElementById("studentList");
const backToDashboard = document.getElementById("backToDashboard");

cohortSummary.addEventListener("click", async function (event) {

    const button = event.target.closest(".view-cohort-btn");

    if (!button) return;

    const department = button.dataset.department;
    const year = parseInt(button.dataset.year);

    cohortDetailTitle.textContent = department + " • CLASS OF " + year;

    showScreen(adminCohortDetailScreen);

    await loadStudentList(department, year);

});

backToDashboard.addEventListener("click", function () {

    showScreen(adminDashboardScreen);
    loadDashboardData();

});


async function loadStudentList(department, year) {

    studentList.innerHTML = "<p class='instruction'>Loading...</p>";

    const { data, error } = await supabaseClient
        .from("capsules")
        .select("id, student_name, student_email, status, created_at")
        .eq("department", department)
        .eq("graduation_year", year)
        .order("student_name");

    if (error) {
        console.error("Error loading students:", error);
        studentList.innerHTML = "<p class='instruction'>Failed to load students.</p>";
        return;
    }

    studentList.innerHTML = "";

    data.forEach(function (capsule) {

        const row = document.createElement("div");
        row.className = "student-row";

        const submittedDate = new Date(capsule.created_at).toLocaleDateString();

                row.innerHTML = `
            <div class="student-row-info">
                <p class="student-row-name">${capsule.student_name}</p>
                <p class="student-row-email">${capsule.student_email}</p>
                <p class="student-row-date">Submitted ${submittedDate}</p>
            </div>
            <div class="student-row-status status-${capsule.status}">
                ${capsule.status.toUpperCase()}
            </div>
            <button class="view-letter-btn" data-id="${capsule.id}">
                VIEW LETTER
            </button>
            ${capsule.status === "sealed" ? `
                <button class="unlock-single-btn" data-id="${capsule.id}">
                    UNLOCK
                </button>
            ` : `
                <button class="relock-single-btn" data-id="${capsule.id}"
                    ${capsule.status === "opened" ? "disabled title='Already opened by the student'" : ""}>
                    RE-LOCK
                </button>
            `}
        `;

        studentList.appendChild(row);

    });

    if (data.length === 0) {
        studentList.innerHTML = "<p class='instruction'>No students in this cohort yet.</p>";
    }

}


// Unlock a single student's capsule
studentList.addEventListener("click", async function (event) {

    const button = event.target.closest(".unlock-single-btn");

    if (!button || button.disabled) return;

    const capsuleId = button.dataset.id;

    button.disabled = true;
    button.textContent = "...";

    const { error } = await supabaseClient
        .from("capsules")
        .update({ status: "unlocked" })
        .eq("id", capsuleId);

    if (error) {
        console.error("Error unlocking capsule:", error);
        alert("Something went wrong.");
        button.disabled = false;
        button.textContent = "UNLOCK";
        return;
    }

    const department = cohortDetailTitle.textContent.split(" • CLASS OF ")[0];
    const year = parseInt(cohortDetailTitle.textContent.split(" • CLASS OF ")[1]);

    loadStudentList(department, year);

});
// Re-lock a single student's capsule
studentList.addEventListener("click", async function (event) {

    const button = event.target.closest(".relock-single-btn");

    if (!button || button.disabled) return;

    const confirmed = confirm("Re-lock this capsule? The student will no longer be able to view it.");

    if (!confirmed) return;

    const capsuleId = button.dataset.id;

    button.disabled = true;
    button.textContent = "...";

    const { error } = await supabaseClient
        .from("capsules")
        .update({ status: "sealed" })
        .eq("id", capsuleId)
        .eq("status", "unlocked");

    if (error) {
        console.error("Error re-locking capsule:", error);
        alert("Something went wrong.");
        button.disabled = false;
        button.textContent = "RE-LOCK";
        return;
    }

    const department = cohortDetailTitle.textContent.split(" • CLASS OF ")[0];
    const year = parseInt(cohortDetailTitle.textContent.split(" • CLASS OF ")[1]);

    loadStudentList(department, year);

});
// =========================
// VIEW LETTER MODAL
// =========================

const letterModal = document.getElementById("letterModal");
const letterModalName = document.getElementById("letterModalName");
const letterModalMeta = document.getElementById("letterModalMeta");
const letterModalText = document.getElementById("letterModalText");
const closeLetterModal = document.getElementById("closeLetterModal");

studentList.addEventListener("click", async function (event) {

    const button = event.target.closest(".view-letter-btn");

    if (!button) return;

    const capsuleId = button.dataset.id;

    const { data, error } = await supabaseClient
        .from("capsules")
        .select("student_name, student_email, letter, department, graduation_year, status")
        .eq("id", capsuleId)
        .single();

    if (error) {
        console.error("Error loading letter:", error);
        alert("Could not load this letter.");
        return;
    }

    letterModalName.textContent = data.student_name;
    letterModalMeta.textContent =
        data.department + " • CLASS OF " + data.graduation_year + " • " + data.status.toUpperCase();
    letterModalText.textContent = data.letter;

    letterModal.classList.add("visible");

});

closeLetterModal.addEventListener("click", function () {
    letterModal.classList.remove("visible");
});

// Also close if clicking the dark background outside the modal card
letterModal.addEventListener("click", function (event) {
    if (event.target === letterModal) {
        letterModal.classList.remove("visible");
    }
});