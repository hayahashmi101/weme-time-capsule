// =========================
// SUPABASE CONNECTION
// =========================

const SUPABASE_URL = "https://corwilzvhnpaxxwvtmvt.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_RlZ1neWv7EPv6A8t3uqXcQ_UiDogFNt";

const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Listen for login/logout events
supabaseClient.auth.onAuthStateChange(function (event, session) {

    console.log("Auth event:", event);

    if (event === "SIGNED_IN" && session) {
        checkForCapsule(session.user.email);
    }

});

// Also check immediately in case the user is already logged in
// (e.g. they refresh the page after already clicking the magic link once)
supabaseClient.auth.getSession().then(function (result) {

    const session = result.data.session;

    if (session) {
        checkForCapsule(session.user.email);
    }

});


// =========================
// CHECK FOR THIS STUDENT'S CAPSULE
// =========================

async function checkForCapsule(email) {

    const { data, error } = await supabaseClient
        .from("capsules")
        .select("id, status, letter, department, graduation_year, created_at")
        .eq("student_email", email)
        .maybeSingle();

    if (error) {
        console.error("Error checking capsule:", error);
        return;
    }

    if (!data) {
        console.log("No capsule found for this email.");
        return;
    }

    console.log("Capsule found:", data);

    // Only show the reveal screen for capsules that are actually unlocked
    if (data.status === "unlocked" || data.status === "opened") {
        showRevealScreen(data);
    }

}


// =========================
// SHOW THE REVEAL SCREEN
// =========================

let currentCapsuleId = null;
let currentCapsuleStatus = null;

function showRevealScreen(capsule) {

    currentCapsuleId = capsule.id;
    currentCapsuleStatus = capsule.status;

    // Hide every other screen, in case one was already active
    document.querySelectorAll(".screen").forEach(function (screen) {
        screen.classList.remove("active");
    });

    revealCohort.textContent =
        capsule.department + " • CLASS OF " + capsule.graduation_year;

    revealedLetterText.textContent = capsule.letter;

    revealScreen.classList.add("active");

}

const openButton = document.getElementById("openCapsule");


const welcomeScreen = document.getElementById("welcomeScreen");
const departmentScreen = document.getElementById("departmentScreen");
const yearScreen = document.getElementById("yearScreen");
const diaryScreen = document.getElementById("diaryScreen");
const lockedScreen = document.getElementById("lockedScreen");
const studentScreen = document.getElementById("studentScreen");
const continueStudent = document.getElementById("continueStudent");

const studentName = document.getElementById("studentName");
const studentEmail = document.getElementById("studentEmail");
const formMessage = document.getElementById("formMessage");

let studentNameValue = "";
let studentEmailValue = "";

const sealLetter = document.getElementById("sealLetter");
const graduationNote = document.getElementById("graduationNote");
const departmentCards = document.querySelectorAll(".department-card");
const yearCards = document.querySelectorAll(".year-card");

const selectedMessage = document.getElementById("selectedMessage");
const yearMessage = document.getElementById("yearMessage");

const diaryTitle = document.getElementById("diaryTitle");
const diaryCohort = document.getElementById("diaryCohort");
const diaryIntro = document.getElementById("diaryIntro");
const diaryWritingArea = document.getElementById("diaryWritingArea");
const continueToDiary = document.getElementById("continueToDiary");

continueToDiary.addEventListener("click", function () {

    diaryIntro.classList.add("diary-intro-exiting");

    setTimeout(function () {

        diaryIntro.style.display = "none";
        diaryWritingArea.classList.add("visible");

    }, 500);

});
const diaryDate = document.getElementById("diaryDate");
const letterText = document.getElementById("letterText");
const wordCounter = document.getElementById("wordCounter");

const revealScreen = document.getElementById("revealScreen");
const revealPrompt = document.getElementById("revealPrompt");
const revealLetter = document.getElementById("revealLetter");
const revealCohort = document.getElementById("revealCohort");
const revealedLetterText = document.getElementById("revealedLetterText");
const openMyCapsule = document.getElementById("openMyCapsule");

openMyCapsule.addEventListener("click", async function () {

    openMyCapsule.disabled = true;

    // Step 1: prompt gently fades/shrinks away
    revealPrompt.classList.add("reveal-prompt-exiting");

    // Step 2: fire the golden flash, same one used when sealing
    setTimeout(function () {

        capsuleTransition.classList.add("firing");

    }, 300);

    // Step 3: while the flash covers the screen, swap prompt for the letter
    setTimeout(function () {

        revealPrompt.style.display = "none";
        revealLetter.classList.add("visible");

    }, 600);

    // Step 4: clean up the flash afterward
    setTimeout(function () {

        capsuleTransition.classList.remove("firing");

    }, 1300);

    // Mark this capsule as opened, so admin dashboards/records reflect
    // that the student has genuinely seen their letter now.
    // We only do this if it's not already marked, to avoid overwriting
    // an existing opened_at timestamp on repeat views.
    if (currentCapsuleId && currentCapsuleStatus !== "opened") {

        const { error } = await supabaseClient
            .from("capsules")
            .update({ status: "opened", opened_at: new Date().toISOString() })
            .eq("id", currentCapsuleId)
            .eq("status", "unlocked");

        if (error) {
            console.error("Error marking capsule as opened:", error);
            // Not a big deal if this silently fails - the student still
            // gets to read their letter either way, so we don't block them.
        }

    }

});
// Show today's date on the diary paper, e.g. "SEPTEMBER 2026"
const monthNames = [
    "JANUARY", "FEBRUARY", "MARCH", "APRIL", "MAY", "JUNE",
    "JULY", "AUGUST", "SEPTEMBER", "OCTOBER", "NOVEMBER", "DECEMBER"
];
const today = new Date();
diaryDate.textContent = monthNames[today.getMonth()] + " " + today.getFullYear();

// Track whether we've already greeted the student for this diary entry,
// so the robot doesn't interrupt them every keystroke
let hasReactedToWriting = false;

// Live word counter as the student types
letterText.addEventListener("input", function () {

    const text = letterText.value.trim();

    const wordCount = text === "" ? 0 : text.split(/\s+/).length;

    wordCounter.textContent = wordCount + (wordCount === 1 ? " word" : " words");

    // React only once, the first time they start typing
    if (!hasReactedToWriting && text.length > 0) {

        hasReactedToWriting = true;

        robotReact("curious", "Take your time... ✦");

    }

});



// =========================
// STORE USER'S CHOICES
// =========================

let selectedDepartment = "";
let selectedYear = "";


// =========================
// OPEN TIME CAPSULE
// =========================

const capsuleTransition = document.getElementById("capsuleTransition");
const welcomeContent = document.querySelector(".welcome-content");

openButton.addEventListener("click", function () {

    // Start the welcome text zooming out
    welcomeContent.classList.add("exiting");

    // Trigger the light flash
    capsuleTransition.classList.add("firing");

    // Once the flash has expanded enough to cover the screen,
    // swap to the department screen underneath it
    setTimeout(function () {

        welcomeScreen.classList.remove("active");
        departmentScreen.classList.add("active");

    }, 500);

    // Clean up the transition classes after the animation finishes,
    // so the button can be clicked again later without replaying incorrectly
    setTimeout(function () {

        capsuleTransition.classList.remove("firing");
        welcomeContent.classList.remove("exiting");

    }, 1200);

});


// =========================
// DEPARTMENT SELECTION
// =========================

departmentCards.forEach(function (card) {

    card.addEventListener("click", function () {

        selectedDepartment = card.dataset.department;
        robotReact(
    "happy",
    selectedDepartment + "? Good choice. ✦"
);

        console.log("Selected department:", selectedDepartment);

        selectedMessage.textContent =
            "You are part of " + selectedDepartment + ".";

       setTimeout(function () {
    departmentScreen.classList.remove("active");

    setTimeout(function () {
        studentScreen.classList.add("active");
    }, 300);
}, 500);

    });

});


// =========================
// GRADUATION YEAR SELECTION
// =========================

yearCards.forEach(function (card) {

    card.addEventListener("click", function () {

        selectedYear = card.dataset.year;
        robotReact(
    "thinking",
    selectedYear + "... your next chapter. ✦"
);

        console.log("Graduation year:", selectedYear);

        // Light up the clicked year, un-light any previous choice
        yearCards.forEach(function (c) {
            c.classList.remove("year-selected");
        });
        card.classList.add("year-selected");

        yearMessage.textContent =
            "The year your next chapter begins.";


        // Set diary heading based on department

        if (selectedDepartment === "BME") {

            diaryTitle.textContent =
                "TO THE ENGINEER I'LL BECOME";

        } else if (selectedDepartment === "RIS") {

            diaryTitle.textContent =
                "TO THE INNOVATOR I'LL BECOME";

        } else if (selectedDepartment === "CNS") {

            diaryTitle.textContent =
                "TO THE WORLD I'LL SHAPE";

        }


        // Set department and graduation year

        diaryCohort.textContent =
            selectedDepartment + " • CLASS OF " + selectedYear;


        // Move to diary

        setTimeout(function () {

            yearScreen.classList.remove("active");

            setTimeout(function () {

                diaryScreen.classList.add("active");

            }, 300);

        }, 500);

    });

});
// =========================
// SEAL THE LETTER
// =========================

const diaryPaper = document.querySelector(".diary-paper");

sealLetter.addEventListener("click", async function () {

    const letterValue = letterText.value.trim();

    // Basic validation before we even try to save
    if (letterValue === "") {
        alert("Please write something before sealing your letter.");
        return;
    }

    // Prevent double-clicking while sealing is in progress
    sealLetter.disabled = true;
    letterText.disabled = true;

    // =========================
    // SAVE TO SUPABASE
    // =========================

    const { data, error } = await supabaseClient
        .from("capsules")
        .insert({
            student_name: studentNameValue,
            student_email: studentEmailValue,
            department: selectedDepartment,
            graduation_year: parseInt(selectedYear),
            letter: letterValue
        });

    if (error) {

        console.error("Error saving capsule:", error);

        alert("Something went wrong saving your letter. Please check your internet connection and try again.");

        // Re-enable the form so they can retry
        sealLetter.disabled = false;
        letterText.disabled = false;

        return;
    }

    // =========================
    // If save succeeded, play the sealing animation
    // =========================

    robotReact(
        "sealing",
        "I'll keep it safe. ✦"
    );

    // Step 1: paper begins folding/dimming/glowing (1.1s animation)
    diaryPaper.classList.add("sealing");

    // Step 2: once the paper has mostly folded and glowed,
    // fire the golden flash that "carries" the capsule into darkness
    setTimeout(function () {

        capsuleTransition.classList.add("firing");

    }, 700);

    // Step 3: while the flash covers the screen, swap to the locked screen underneath
    setTimeout(function () {

        graduationNote.textContent =
            "OPENING ON YOUR GRADUATION DAY • " + selectedYear;

        diaryScreen.classList.remove("active");
        lockedScreen.classList.add("active");

    }, 1000);

    // Step 4: clean up the transition classes afterward
    setTimeout(function () {

        capsuleTransition.classList.remove("firing");

    }, 1700);

});

continueStudent.addEventListener("click", function () {

    const name = studentName.value.trim();
    const email = studentEmail.value.trim();

    if (name === "" || email === "") {

        formMessage.textContent =
            "Please enter your name and email.";

        return;
    }

    if (!email.includes("@")) {

        formMessage.textContent =
            "Please enter a valid email address.";

        return;
    }

    studentNameValue = name;
    studentEmailValue = email;
    robotReact(
    "curious",
    "I'll remember who you are. ✦"
);

    formMessage.textContent = "";

    studentScreen.classList.remove("active");

    setTimeout(function () {
        yearScreen.classList.add("active");
    }, 300);

});
/* =========================
   ROBOT COMPANION
========================= */

const robotCompanion = document.getElementById("robotCompanion");
const robotImage = document.getElementById("robotImage");
const robotMessage = document.getElementById("robotMessage");

// True while a reaction animation (bounce, shake, etc.) is playing,
// so the cursor-tilt doesn't fight with it
let robotReacting = false;

// Robot subtly leans toward the mouse cursor
document.addEventListener("mousemove", function (event) {

    if (robotReacting) return;

    const rect = robotImage.getBoundingClientRect();
    const robotCenterX = rect.left + rect.width / 2;

    const deltaX = event.clientX - robotCenterX;

    // Clamp the tilt so it stays subtle (max 6 degrees either way)
    const maxTilt = 6;
    const tilt = Math.max(-maxTilt, Math.min(maxTilt, deltaX / 40));

    robotImage.style.transform = "rotate(" + tilt + "deg)";

});


function robotReact(type, message) {

    robotReacting = true;

    robotCompanion.classList.remove(
        "robot-happy",
        "robot-curious",
        "robot-excited",
        "robot-thinking",
        "robot-sealing"
    );

    void robotCompanion.offsetWidth;

    robotCompanion.classList.add("robot-" + type);

    robotMessage.textContent = message;

    setTimeout(function () {

        robotCompanion.classList.remove(
            "robot-happy",
            "robot-curious",
            "robot-excited",
            "robot-thinking",
            "robot-sealing"
        );

        robotReacting = false;

    }, 1500);
}
// =========================
// CUSTOM CURSOR
// =========================

const customCursor = document.getElementById("customCursor");
const customCursorTrail = document.getElementById("customCursorTrail");

let trailX = 0;
let trailY = 0;

document.addEventListener("mousemove", function (event) {

    // The small dot follows instantly
    customCursor.style.left = event.clientX + "px";
    customCursor.style.top = event.clientY + "px";

    // Store the target position for the slower trailing ring
    trailX = event.clientX;
    trailY = event.clientY;

});

// Smoothly animate the trailing ring toward the cursor's position
function animateCursorTrail() {

    const currentLeft = parseFloat(customCursorTrail.style.left) || trailX;
    const currentTop = parseFloat(customCursorTrail.style.top) || trailY;

    // Move 20% closer to the target each frame, creating a smooth "catch-up" delay
    const newLeft = currentLeft + (trailX - currentLeft) * 0.2;
    const newTop = currentTop + (trailY - currentTop) * 0.2;

    customCursorTrail.style.left = newLeft + "px";
    customCursorTrail.style.top = newTop + "px";

    requestAnimationFrame(animateCursorTrail);

}

animateCursorTrail();

// Grow the ring slightly when hovering anything clickable
document.addEventListener("mouseover", function (event) {

    if (event.target.closest("button, a, input, textarea")) {
        customCursorTrail.classList.add("hovering");
    }

});

document.addEventListener("mouseout", function (event) {

    if (event.target.closest("button, a, input, textarea")) {
        customCursorTrail.classList.remove("hovering");
    }

});
// =========================
// SCROLL REVEAL
// =========================

const scrollRevealObserver = new IntersectionObserver(function (entries) {

    entries.forEach(function (entry) {

        if (entry.isIntersecting) {

            // Small staggered delay based on position, so nearby elements
            // don't all pop in at the exact same instant
            entry.target.classList.add("in-view");

            // Once revealed, no need to keep watching this element
            scrollRevealObserver.unobserve(entry.target);

        }

    });

}, {
    threshold: 0.2
});

document.querySelectorAll(".scroll-reveal").forEach(function (el) {

    scrollRevealObserver.observe(el);

});