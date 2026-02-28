import {
  addJobApplication,
  listenToJobApplications,
  updateJobApplication,
  deleteJobApplication,
} from "./firebase.js";

// DOM elements
const form = document.getElementById("job-form");
const formTitle = document.getElementById("form-title");
const companyInput = document.getElementById("companyName");
const roleInput = document.getElementById("jobRole");
const dateInput = document.getElementById("applicationDate");
const statusInput = document.getElementById("status");
const notesInput = document.getElementById("notes");
const submitBtn = document.getElementById("submit-btn");
const cancelEditBtn = document.getElementById("cancel-edit-btn");

const searchInput = document.getElementById("search-input");
const statusFilter = document.getElementById("status-filter");
const sortOrder = document.getElementById("sort-order");

const messageEl = document.getElementById("message");
const loadingEl = document.getElementById("loading");
const jobsEmptyEl = document.getElementById("jobs-empty");
const jobsListEl = document.getElementById("jobs-list");

let allJobs = [];
let editingJobId = null;
let isInitialLoad = true;
let activeMessageTimeout = null;

function showLoading(isLoading) {
  loadingEl.hidden = !isLoading;
}

function showMessage(text, type = "success") {
  if (!messageEl) return;

  messageEl.textContent = text;
  messageEl.classList.remove("success", "error");
  messageEl.classList.add(type);
  messageEl.hidden = false;

  if (activeMessageTimeout) {
    clearTimeout(activeMessageTimeout);
  }

  activeMessageTimeout = setTimeout(() => {
    messageEl.hidden = true;
  }, 3000);
}

function resetForm() {
  form.reset();
  editingJobId = null;
  formTitle.textContent = "Add Job Application";
  submitBtn.textContent = "Add Application";
  cancelEditBtn.hidden = true;
}

function fillFormForEdit(job) {
  editingJobId = job.id;
  formTitle.textContent = "Edit Job Application";
  submitBtn.textContent = "Save Changes";
  cancelEditBtn.hidden = false;

  companyInput.value = job.companyName || "";
  roleInput.value = job.jobRole || "";
  dateInput.value = job.applicationDate || "";
  statusInput.value = job.status || "Applied";
  notesInput.value = job.notes || "";
}

function getStatusClass(status) {
  switch (status) {
    case "Interview":
      return "job-status-interview";
    case "Rejected":
      return "job-status-rejected";
    default:
      return "job-status-applied";
  }
}

function applySearchFilterSort(jobs) {
  const term = (searchInput.value || "").toLowerCase().trim();
  const statusValue = statusFilter.value;
  const sort = sortOrder.value;

  let filtered = [...jobs];

  if (term) {
    filtered = filtered.filter((job) => {
      const company = (job.companyName || "").toLowerCase();
      const role = (job.jobRole || "").toLowerCase();
      return company.includes(term) || role.includes(term);
    });
  }

  if (statusValue !== "all") {
    filtered = filtered.filter((job) => job.status === statusValue);
  }

  filtered.sort((a, b) => {
    const aDate = a.applicationDate || "";
    const bDate = b.applicationDate || "";
    if (aDate === bDate) return 0;
    if (sort === "asc") {
      return aDate < bDate ? -1 : 1;
    }
    return aDate > bDate ? -1 : 1;
  });

  return filtered;
}

function renderJobs() {
  const jobsToRender = applySearchFilterSort(allJobs);

  jobsListEl.innerHTML = "";

  if (!jobsToRender.length) {
    jobsEmptyEl.hidden = false;
    return;
  }

  jobsEmptyEl.hidden = true;

  jobsToRender.forEach((job) => {
    const item = document.createElement("article");
    item.className = "job-item";

    const main = document.createElement("div");
    main.className = "job-main";

    const titleRow = document.createElement("div");
    titleRow.className = "job-title";

    const companyEl = document.createElement("span");
    companyEl.className = "job-company";
    companyEl.textContent = job.companyName || "Unknown company";

    const roleEl = document.createElement("span");
    roleEl.className = "job-role";
    roleEl.textContent = job.jobRole ? `• ${job.jobRole}` : "";

    titleRow.appendChild(companyEl);
    titleRow.appendChild(roleEl);

    const metaRow = document.createElement("div");
    metaRow.className = "job-meta";

    if (job.applicationDate) {
      const dateSpan = document.createElement("span");
      dateSpan.textContent = `Applied: ${job.applicationDate}`;
      metaRow.appendChild(dateSpan);
    }

    const createdSpan = document.createElement("span");
    createdSpan.textContent = job.createdAt
      ? "Synced with Firestore"
      : "Pending timestamp";
    metaRow.appendChild(createdSpan);

    main.appendChild(titleRow);
    main.appendChild(metaRow);

    if (job.notes) {
      const notesEl = document.createElement("div");
      notesEl.className = "job-notes";
      notesEl.textContent = job.notes;
      main.appendChild(notesEl);
    }

    const statusCol = document.createElement("div");
    const pill = document.createElement("span");
    pill.className = `job-status-pill ${getStatusClass(job.status)}`;
    pill.textContent = job.status || "Applied";
    statusCol.appendChild(pill);

    const actions = document.createElement("div");
    actions.className = "job-actions";

    const editBtn = document.createElement("button");
    editBtn.type = "button";
    editBtn.className = "btn ghost icon";
    editBtn.textContent = "Edit";
    editBtn.addEventListener("click", () => {
      fillFormForEdit(job);
      window.scrollTo({ top: 0, behavior: "smooth" });
    });

    const deleteBtn = document.createElement("button");
    deleteBtn.type = "button";
    deleteBtn.className = "btn danger icon";
    deleteBtn.textContent = "Delete";
    deleteBtn.addEventListener("click", async () => {
      const confirmed = window.confirm(
        "Delete this job application? This cannot be undone."
      );
      if (!confirmed) return;

      try {
        await deleteJobApplication(job.id);
        showMessage("Application deleted.", "success");
      } catch (error) {
        console.error(error);
        showMessage("Failed to delete application.", "error");
      }
    });

    actions.appendChild(editBtn);
    actions.appendChild(deleteBtn);

    item.appendChild(main);
    item.appendChild(statusCol);
    item.appendChild(actions);

    jobsListEl.appendChild(item);
  });
}

form.addEventListener("submit", async (event) => {
  event.preventDefault();

  const job = {
    companyName: companyInput.value.trim(),
    jobRole: roleInput.value.trim(),
    applicationDate: dateInput.value,
    status: statusInput.value,
    notes: notesInput.value.trim(),
  };

  if (!job.companyName || !job.jobRole || !job.applicationDate || !job.status) {
    showMessage("Please fill in all required fields.", "error");
    return;
  }

  submitBtn.disabled = true;

  try {
    if (editingJobId) {
      await updateJobApplication(editingJobId, job);
      showMessage("Application updated.", "success");
    } else {
      await addJobApplication(job);
      showMessage("Application added.", "success");
    }
    resetForm();
  } catch (error) {
    console.error(error);
    showMessage("Failed to save application. Please try again.", "error");
  } finally {
    submitBtn.disabled = false;
  }
});

cancelEditBtn.addEventListener("click", () => {
  resetForm();
});

searchInput.addEventListener("input", () => {
  renderJobs();
});

statusFilter.addEventListener("change", () => {
  renderJobs();
});

sortOrder.addEventListener("change", () => {
  renderJobs();
});

document.addEventListener("DOMContentLoaded", () => {
  // Ensure date input defaults to today for convenience
  if (!dateInput.value) {
    const today = new Date().toISOString().slice(0, 10);
    dateInput.value = today;
  }

  showLoading(true);

  listenToJobApplications(
    (jobs) => {
      allJobs = jobs;
      showLoading(false);
      isInitialLoad = false;
      renderJobs();
    },
    (error) => {
      console.error(error);
      showLoading(false);
      if (isInitialLoad) {
        showMessage("Failed to load applications from Firestore.", "error");
      }
    }
  );
});

