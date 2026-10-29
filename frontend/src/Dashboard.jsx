
import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion, useReducedMotion } from "motion/react";
import {
  ArrowRight,
  BriefcaseBusiness,
  Building2,
  CheckCircle2,
  Clock3,
  FileText,
  GraduationCap,
  LogOut,
  MapPin,
  RefreshCw,
  Search,
  ShieldCheck,
  Sparkles,
  UserRound,
  XCircle
} from "lucide-react";
import api from "./api";
import "./Dashboard.css";

function formatMoney(value) {
  if (value == null) return null;

  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0
  }).format(Number(value));
}

function compensation(job) {
  if (job.listingType === "internship") {
    return job.stipendInrMonthly != null
      ? `${formatMoney(job.stipendInrMonthly)} / month`
      : "Stipend not specified";
  }

  const min = job.salaryMinInrAnnual;
  const max = job.salaryMaxInrAnnual;

  if (min != null && max != null) {
    return `${formatMoney(min)} – ${formatMoney(max)} / year`;
  }

  if (min != null) return `${formatMoney(min)}+ / year`;
  if (max != null) return `Up to ${formatMoney(max)} / year`;

  return "Salary not specified";
}

function StatusBadge({ status }) {
  const styles = {
    submitted: "status-blue",
    reviewing: "status-purple",
    shortlisted: "status-green",
    accepted: "status-green",
    rejected: "status-red",
    withdrawn: "status-muted"
  };

  return (
    <span className={`dashboard-status ${styles[status] || "status-muted"}`}>
      {status || "unknown"}
    </span>
  );
}

function Dashboard() {
  const navigate = useNavigate();
  const reduceMotion = useReducedMotion();

  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [applications, setApplications] = useState([]);
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [myJobs, setMyJobs] = useState([]);
const [creatingJob, setCreatingJob] = useState(false);
const [pendingJobs, setPendingJobs] = useState([]);
const [moderatingJobId, setModeratingJobId] = useState(null);
const [moderationNotes, setModerationNotes] = useState({});

const [jobForm, setJobForm] = useState({
  title: "",
  description: "",
  listingType: "internship",
  location: "Remote",
  workMode: "remote",
  experienceLevel: "entry",
  salaryMinInrAnnual: "",
  salaryMaxInrAnnual: "",
  stipendInrMonthly: "",
  skillsRequired: "",
  openings: "1",
  applicationDeadline: ""
});
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busyId, setBusyId] = useState(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [search, setSearch] = useState("");

  const loadDashboard = useCallback(async () => {
    const token = sessionStorage.getItem("accessToken");

    if (!token) {
      navigate("/login", { replace: true });
      return;
    }

    setLoading(true);
    setError("");

    try {
      const profileResponse = await api.get("/auth/me");
      const currentUser = profileResponse.data.user;

      setUser(currentUser);
      setProfile(profileResponse.data.profile);

   const results = await Promise.allSettled([
  api.get("/applications"),

  currentUser.role === "student"
    ? api.get("/jobs", {
        params: { page: 1, limit: 50 }
      })
    : currentUser.role === "recruiter"
      ? api.get("/jobs/mine")
      : Promise.resolve({ data: { jobs: [] } }),

  currentUser.role === "admin"
    ? api.get("/jobs/moderation/pending")
    : Promise.resolve({ data: { jobs: [] } })
]);

      if (results[0].status === "fulfilled") {
        setApplications(
          results[0].value.data.applications || []
        );
      } else {
        setApplications([]);
        setError("Could not load applications. Please try refreshing.");
      }

   if (results[1].status === "fulfilled") {
  const returnedJobs = results[1].value.data.jobs || [];

  if (results[2].status === "fulfilled") {
  if (currentUser.role === "admin") {
    setPendingJobs(results[2].value.data.jobs || []);
  }
} else {
  setPendingJobs([]);
  setError("Could not load pending listings. Please try refreshing.");
}
  if (currentUser.role === "student") {
    setJobs(returnedJobs);
  } else if (currentUser.role === "recruiter") {
    setMyJobs(returnedJobs);
  }
} else {
  setJobs([]);
  setMyJobs([]);
  setError("Could not load job listings. Please try refreshing.");
}
    } catch (requestError) {
      if (requestError.response?.status === 401) {
        sessionStorage.removeItem("accessToken");

        navigate("/login", {
          replace: true,
          state: { message: "Please sign in again to continue." }
        });
        return;
      }

      setError(
        requestError.response?.data?.message ||
          "Could not load your dashboard. Check the backend server."
      );
    } finally {
      setLoading(false);
    }
  }, [navigate]);

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard, refreshKey]);

  function logout() {
    sessionStorage.removeItem("accessToken");
    navigate("/login", { replace: true });
  }

  async function applyToJob(jobId) {
    setBusyId(jobId);
    setError("");
    setNotice("");

    try {
      const response = await api.post(`/jobs/${jobId}/apply`, {});

      setNotice(response.data.message || "Application submitted.");
      setRefreshKey((value) => value + 1);
    } catch (requestError) {
      setError(
        requestError.response?.data?.message ||
          "Could not submit your application."
      );
    } finally {
      setBusyId(null);
    }
  }

  async function updateApplication(applicationId, status) {
    setBusyId(applicationId);
    setError("");
    setNotice("");

    try {
      const response = await api.patch(
        `/applications/${applicationId}/status`,
        { status }
      );

      setNotice(response.data.message || "Application status updated.");
      setRefreshKey((value) => value + 1);
    } catch (requestError) {
      setError(
        requestError.response?.data?.message ||
          "Could not update the application."
      );
    } finally {
      setBusyId(null);
    }
  }


async function moderateJobListing(jobId, action) {
  const note = moderationNotes[jobId]?.trim() || "";

  setModeratingJobId(jobId);
  setError("");
  setNotice("");

  try {
    const response = await api.patch(
      `/jobs/${jobId}/moderation`,
      {
        action,
        moderationNote: note || undefined
      }
    );

    setNotice(
      response.data.message ||
        `Job listing ${action === "approve" ? "approved" : "rejected"}.`
    );

    // Remove the reviewed listing from the pending queue.
    setPendingJobs((previous) =>
      previous.filter((job) => job.id !== jobId)
    );

    setModerationNotes((previous) => {
      const next = { ...previous };
      delete next[jobId];
      return next;
    });

    // Refresh dashboard data from the backend.
    setRefreshKey((value) => value + 1);
  } catch (requestError) {
    setError(
      requestError.response?.data?.message ||
        "Could not update the listing. Please try again."
    );
  } finally {
    setModeratingJobId(null);
  }
}

function updateJobForm(field, value) {
  setJobForm((previous) => ({
    ...previous,
    [field]: value
  }));
}

async function createJob(event) {
  event.preventDefault();
  setError("");
  setNotice("");
  setCreatingJob(true);

  try {
    const payload = {
      ...jobForm,
      title: jobForm.title.trim(),
      description: jobForm.description.trim(),
      openings: Number(jobForm.openings || 1),

      salaryMinInrAnnual:
        jobForm.salaryMinInrAnnual === ""
          ? undefined
          : Number(jobForm.salaryMinInrAnnual),

      salaryMaxInrAnnual:
        jobForm.salaryMaxInrAnnual === ""
          ? undefined
          : Number(jobForm.salaryMaxInrAnnual),

      stipendInrMonthly:
        jobForm.stipendInrMonthly === ""
          ? undefined
          : Number(jobForm.stipendInrMonthly),

      location: jobForm.location.trim() || undefined,
      skillsRequired: jobForm.skillsRequired.trim() || undefined,
      applicationDeadline: jobForm.applicationDeadline || undefined
    };

    const response = await api.post("/jobs", payload);

    setNotice(
      response.data.message ||
        "Listing created and submitted for admin review."
    );

    setJobForm({
      title: "",
      description: "",
      listingType: "internship",
      location: "Remote",
      workMode: "remote",
      experienceLevel: "entry",
      salaryMinInrAnnual: "",
      salaryMaxInrAnnual: "",
      stipendInrMonthly: "",
      skillsRequired: "",
      openings: "1",
      applicationDeadline: ""
    });

    setRefreshKey((value) => value + 1);
  } catch (requestError) {
    const data = requestError.response?.data;

    const validationMessages = data?.errors
      ?.map((item) => item.message)
      .join(". ");

    setError(
      validationMessages ||
        data?.message ||
        "Could not create the listing. Please try again."
    );
  } finally {
    setCreatingJob(false);
  }
}


  const filteredJobs = jobs.filter((job) => {
    const term = search.trim().toLowerCase();

    if (!term) return true;

    return [
      job.title,
      job.companyName,
      job.location,
      job.listingType,
      job.skillsRequired
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase()
      .includes(term);
  });

  const appliedJobIds = new Set(
    applications.map((application) => Number(application.jobId))
  );

  const firstName = user?.fullName?.trim().split(/\s+/)[0] || "there";
  const role = user?.role;

  return (
    <div className="dashboard-page">
      <header className="dashboard-navbar">
        <Link to="/" className="brand" aria-label="Pathway home">
          <span className="brand-mark">
            <Sparkles size={21} />
          </span>
          <span>pathway<span className="brand-period">.</span></span>
        </Link>

        <div className="dashboard-nav-right">
          <Link to="/contact" className="dashboard-contact-link">
            Contact
          </Link>

          <button
            className="dashboard-logout"
            type="button"
            onClick={logout}
          >
            <LogOut size={16} />
            <span>Sign out</span>
          </button>
        </div>
      </header>

      <main className="dashboard-main">
        {loading && !user ? (
          <div className="dashboard-loading" role="status">
            <span className="loading-indicator" />
            Loading your dashboard...
          </div>
        ) : (
          <>
            <section className="dashboard-welcome">
              <div>
                <span className="section-eyebrow">
                  YOUR PATHWAY WORKSPACE
                </span>

                <h1>
                  Welcome back, <span>{firstName}.</span>
                </h1>

                <p>
                  {role === "student"
                    ? "Keep learning, discover opportunities, and follow your applications."
                    : role === "recruiter"
                      ? "Review your candidates and manage your recruitment workflow."
                      : "Review activity and oversee the Pathway job portal."}
                </p>
              </div>

              <div className="dashboard-user-icon">
                {role === "student" ? (
                  <GraduationCap size={28} />
                ) : role === "recruiter" ? (
                  <Building2 size={28} />
                ) : (
                  <ShieldCheck size={28} />
                )}
              </div>
            </section>

            {error && (
              <div className="dashboard-alert alert-error" role="alert">
                <XCircle size={18} />
                <span>{error}</span>

                <button
                  type="button"
                  aria-label="Retry loading dashboard"
                  onClick={() => setRefreshKey((value) => value + 1)}
                >
                  <RefreshCw size={16} />
                </button>
              </div>
            )}

            {notice && (
              <div className="dashboard-alert alert-success" role="status">
                <CheckCircle2 size={18} />
                <span>{notice}</span>
              </div>
            )}

            {loading && user && (
              <div className="dashboard-refreshing" role="status">
                Refreshing data...
              </div>
            )}

            <section className="dashboard-stats">
              <motion.article
                className="dashboard-stat"
                whileHover={reduceMotion ? {} : { y: -4 }}
              >
                <div className="dashboard-stat-icon stat-violet">
                  <UserRound size={21} />
                </div>
                <div>
                  <span>Account type</span>
                  <strong>
                    {role
                      ? role.charAt(0).toUpperCase() + role.slice(1)
                      : "Account"}
                  </strong>
                </div>
              </motion.article>

              <motion.article
                className="dashboard-stat"
                whileHover={reduceMotion ? {} : { y: -4 }}
              >
                <div className="dashboard-stat-icon stat-blue">
                  <FileText size={21} />
                </div>
                <div>
                  <span>
                    {role === "student" ? "My applications" : "Applications"}
                  </span>
                  <strong>{applications.length}</strong>
                </div>
              </motion.article>

              <motion.article
                className="dashboard-stat"
                whileHover={reduceMotion ? {} : { y: -4 }}
              >
                <div className="dashboard-stat-icon stat-green">
                  <CheckCircle2 size={21} />
                </div>
                <div>
                  <span>Shortlisted</span>
                  <strong>
                    {applications.filter(
                      (application) => application.status === "shortlisted"
                    ).length}
                  </strong>
                </div>
              </motion.article>
            </section>

            <div className="dashboard-content-grid">
              <section className="dashboard-panel profile-panel">
                <div className="dashboard-panel-heading">
                  <div>
                    <span className="section-eyebrow">YOUR ACCOUNT</span>
                    <h2>Profile overview</h2>
                  </div>

                  <div className="profile-round-icon">
                    <UserRound size={20} />
                  </div>
                </div>

                <div className="profile-details">
                  <div>
                    <span>Full name</span>
                    <strong>{user?.fullName || "—"}</strong>
                  </div>

                  <div>
                    <span>Email address</span>
                    <strong className="break-word">{user?.email || "—"}</strong>
                  </div>

                  {role === "student" && (
                    <>
                      <div>
                        <span>University</span>
                        <strong>{profile?.university || "Not added yet"}</strong>
                      </div>

                      <div>
                        <span>Degree</span>
                        <strong>{profile?.degree || "Not added yet"}</strong>
                      </div>

                      <div>
                        <span>Graduation year</span>
                        <strong>{profile?.graduation_year || "—"}</strong>
                      </div>

                      <div>
                        <span>Skills</span>
                        <strong>{profile?.skills || "Add your skills"}</strong>
                      </div>
                    </>
                  )}

                  {role === "recruiter" && (
                    <>
                      <div>
                        <span>Company</span>
                        <strong>{profile?.company_name || "—"}</strong>
                      </div>

                      <div>
                        <span>Company location</span>
                        <strong>{profile?.company_location || "—"}</strong>
                      </div>
                    </>
                  )}

                  {role === "admin" && (
                    <div>
                      <span>Access</span>
                      <strong>Administrator</strong>
                    </div>
                  )}
                </div>

                <Link to="/contact" className="dashboard-profile-link">
                  Need help? Contact us <ArrowRight size={16} />
                </Link>
              </section>

              <section className="dashboard-panel applications-panel">
                <div className="dashboard-panel-heading">
                  <div>
                    <span className="section-eyebrow">
                      {role === "student"
                        ? "YOUR PROGRESS"
                        : role === "recruiter"
                          ? "CANDIDATE ACTIVITY"
                          : "PORTAL ACTIVITY"}
                    </span>
                    <h2>
                      {role === "student"
                        ? "My applications"
                        : "Applications"}
                    </h2>
                  </div>

                  <FileText className="panel-heading-icon" size={21} />
                </div>

                {applications.length === 0 ? (
                  <div className="dashboard-empty">
                    <div className="empty-icon">
                      <BriefcaseBusiness size={22} />
                    </div>
                    <h3>No applications yet</h3>
                    <p>
                      {role === "student"
                        ? "Apply for an opportunity to start tracking your progress here."
                        : "Applications for your listings will appear here."}
                    </p>

                    {role === "student" && (
                      <a href="#opportunities" className="dashboard-text-link">
                        Find opportunities <ArrowRight size={15} />
                      </a>
                    )}
                  </div>
                ) : (
                  <div className="application-list">
                    {applications.map((application) => (
                      <article
                        className="application-row"
                        key={application.id}
                      >
                        <div className="application-row-icon">
                          <BriefcaseBusiness size={18} />
                        </div>

                        <div className="application-row-info">
                          <strong>{application.jobTitle}</strong>
                          <span>
                            {application.companyName || application.studentName || "Pathway"}
                          </span>
                          <span className="application-date">
                            <Clock3 size={12} />
                            {application.appliedAt
                              ? new Date(application.appliedAt).toLocaleDateString()
                              : "Date unavailable"}
                          </span>
                        </div>

                        <div className="application-row-right">
                          <StatusBadge status={application.status} />

                          {(role === "recruiter" || role === "admin") && (
                            <div className="application-actions">
                              <select
                                aria-label={`Update status for ${application.jobTitle}`}
                                value={application.status}
                                disabled={busyId === application.id}
                                onChange={(event) =>
                                  updateApplication(
                                    application.id,
                                    event.target.value
                                  )
                                }
                              >
                                {[
                                  "submitted",
                                  "reviewing",
                                  "shortlisted",
                                  "rejected",
                                  "accepted"
                                ].map((status) => (
                                  <option key={status} value={status}>
                                    {status.charAt(0).toUpperCase() + status.slice(1)}
                                  </option>
                                ))}
                              </select>
                            </div>
                          )}
                        </div>
                      </article>
                    ))}
                  </div>
                )}
              </section>
            </div>

            {role === "student" && (
              <section
                className="dashboard-panel opportunities-panel"
                id="opportunities"
              >
                <div className="dashboard-panel-heading opportunities-heading">
                  <div>
                    <span className="section-eyebrow">
                      YOUR NEXT MOVE
                    </span>
                    <h2>Explore opportunities</h2>
                    <p>
                      Approved listings fetched from the Pathway backend.
                    </p>
                  </div>

                  <div className="opportunities-heading-icon">
                    <Search size={20} />
                  </div>
                </div>

                <div className="dashboard-search">
                  <Search size={18} />
                  <input
                    type="search"
                    placeholder="Search title, company, skill, or location..."
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    aria-label="Search job opportunities"
                  />
                </div>

                {jobs.length === 0 ? (
                  <div className="dashboard-empty">
                    <div className="empty-icon">
                      <BriefcaseBusiness size={22} />
                    </div>
                    <h3>No approved listings available</h3>
                    <p>
                      New opportunities will appear here when they are approved
                      by an administrator.
                    </p>
                    <button
                      className="dashboard-secondary-button"
                      type="button"
                      onClick={() => setRefreshKey((value) => value + 1)}
                    >
                      <RefreshCw size={15} /> Refresh listings
                    </button>
                  </div>
                ) : (
                  <div className="dashboard-job-grid">
                    {filteredJobs.map((job, index) => {
                      const alreadyApplied = appliedJobIds.has(Number(job.id));

                      return (
                        <motion.article
                          className="dashboard-job-card"
                          key={job.id}
                          initial={reduceMotion ? false : { opacity: 0, y: 12 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{
                            duration: reduceMotion ? 0 : 0.3,
                            delay: reduceMotion ? 0 : index * 0.04
                          }}
                          whileHover={reduceMotion ? {} : { y: -4 }}
                        >
                          <div className="dashboard-job-top">
                            <div className="dashboard-job-logo">
                              {(job.companyName || "C").charAt(0).toUpperCase()}
                            </div>

                            <span className="job-type-chip">
                              {job.listingType === "internship"
                                ? "Internship"
                                : "Full-time"}
                            </span>
                          </div>

                          <h3>{job.title}</h3>
                          <p className="dashboard-company">
                            {job.companyName || "Company"}
                          </p>

                          <div className="dashboard-job-meta">
                            <span>
                              <MapPin size={14} />
                              {job.location || "Location not specified"}
                            </span>
                          </div>

                          <div className="dashboard-job-skills">
                            {(job.skillsRequired || "")
                              .split(/[,;\n]/)
                              .map((skill) => skill.trim())
                              .filter(Boolean)
                              .slice(0, 4)
                              .map((skill) => (
                                <span key={skill}>{skill}</span>
                              ))}
                          </div>

                          <div className="dashboard-job-bottom">
                            <strong>{compensation(job)}</strong>

                            <button
                              type="button"
                              className="dashboard-apply-button"
                              disabled={alreadyApplied || busyId === job.id}
                              onClick={() => applyToJob(job.id)}
                            >
                              {alreadyApplied
                                ? "Applied"
                                : busyId === job.id
                                  ? "Applying..."
                                  : "Apply"}
                              {!alreadyApplied && <ArrowRight size={15} />}
                            </button>
                          </div>
                        </motion.article>
                      );
                    })}
                  </div>
                )}

                {jobs.length > 0 && filteredJobs.length === 0 && (
                  <div className="dashboard-no-match">
                    No listings match your search.
                  </div>
                )}
              </section>
            )}

{role === "recruiter" && (
  <>
    <section className="dashboard-panel recruiter-tools-panel">
      <div className="dashboard-panel-heading">
        <div>
          <span className="section-eyebrow">RECRUITER WORKSPACE</span>
          <h2>Create a job or internship</h2>
          <p>
            Submit a new opportunity for administrator review.
          </p>
        </div>
        <BriefcaseBusiness size={23} className="panel-heading-icon" />
      </div>

      <form className="recruiter-job-form" onSubmit={createJob}>
        <div className="recruiter-form-grid">
          <div className="recruiter-field recruiter-field-wide">
            <label htmlFor="jobTitle">Job title</label>
            <input
              id="jobTitle"
              value={jobForm.title}
              onChange={(event) =>
                updateJobForm("title", event.target.value)
              }
              placeholder="e.g. Backend Developer Intern"
              minLength={3}
              maxLength={150}
              required
            />
          </div>

          <div className="recruiter-field">
            <label htmlFor="listingType">Listing type</label>
            <select
              id="listingType"
              value={jobForm.listingType}
              onChange={(event) =>
                updateJobForm("listingType", event.target.value)
              }
            >
              <option value="internship">Internship</option>
              <option value="job">Full-time job</option>
            </select>
          </div>

          <div className="recruiter-field">
            <label htmlFor="workMode">Work mode</label>
            <select
              id="workMode"
              value={jobForm.workMode}
              onChange={(event) =>
                updateJobForm("workMode", event.target.value)
              }
            >
              <option value="remote">Remote</option>
              <option value="hybrid">Hybrid</option>
              <option value="onsite">On-site</option>
            </select>
          </div>

          <div className="recruiter-field">
            <label htmlFor="jobLocation">Location</label>
            <input
              id="jobLocation"
              value={jobForm.location}
              onChange={(event) =>
                updateJobForm("location", event.target.value)
              }
              placeholder="e.g. Kolkata or Remote"
              maxLength={150}
            />
          </div>

          <div className="recruiter-field">
            <label htmlFor="experienceLevel">Experience level</label>
            <select
              id="experienceLevel"
              value={jobForm.experienceLevel}
              onChange={(event) =>
                updateJobForm("experienceLevel", event.target.value)
              }
            >
              <option value="any">Any experience</option>
              <option value="entry">Entry level</option>
              <option value="junior">Junior</option>
              <option value="mid">Mid-level</option>
              <option value="senior">Senior</option>
            </select>
          </div>

          {jobForm.listingType === "internship" ? (
            <div className="recruiter-field">
              <label htmlFor="stipend">Monthly stipend (INR)</label>
              <input
                id="stipend"
                type="number"
                min="0"
                step="1"
                value={jobForm.stipendInrMonthly}
                onChange={(event) =>
                  updateJobForm("stipendInrMonthly", event.target.value)
                }
                placeholder="e.g. 25000"
              />
            </div>
          ) : (
            <>
              <div className="recruiter-field">
                <label htmlFor="salaryMinimum">Minimum annual salary (INR)</label>
                <input
                  id="salaryMinimum"
                  type="number"
                  min="0"
                  step="1"
                  value={jobForm.salaryMinInrAnnual}
                  onChange={(event) =>
                    updateJobForm("salaryMinInrAnnual", event.target.value)
                  }
                  placeholder="e.g. 400000"
                />
              </div>

              <div className="recruiter-field">
                <label htmlFor="salaryMaximum">Maximum annual salary (INR)</label>
                <input
                  id="salaryMaximum"
                  type="number"
                  min="0"
                  step="1"
                  value={jobForm.salaryMaxInrAnnual}
                  onChange={(event) =>
                    updateJobForm("salaryMaxInrAnnual", event.target.value)
                  }
                  placeholder="e.g. 700000"
                />
              </div>
            </>
          )}

          <div className="recruiter-field">
            <label htmlFor="openings">Number of openings</label>
            <input
              id="openings"
              type="number"
              min="1"
              max="65535"
              step="1"
              value={jobForm.openings}
              onChange={(event) =>
                updateJobForm("openings", event.target.value)
              }
              required
            />
          </div>

          <div className="recruiter-field">
            <label htmlFor="applicationDeadline">Application deadline</label>
            <input
              id="applicationDeadline"
              type="date"
              min={new Date().toISOString().slice(0, 10)}
              value={jobForm.applicationDeadline}
              onChange={(event) =>
                updateJobForm("applicationDeadline", event.target.value)
              }
            />
          </div>

          <div className="recruiter-field recruiter-field-wide">
            <label htmlFor="requiredSkills">Required skills</label>
            <input
              id="requiredSkills"
              value={jobForm.skillsRequired}
              onChange={(event) =>
                updateJobForm("skillsRequired", event.target.value)
              }
              placeholder="Node.js, Express, MySQL, Git"
              maxLength={5000}
            />
          </div>

          <div className="recruiter-field recruiter-field-wide">
            <label htmlFor="jobDescription">Job description</label>
            <textarea
              id="jobDescription"
              value={jobForm.description}
              onChange={(event) =>
                updateJobForm("description", event.target.value)
              }
              placeholder="Describe the role, responsibilities and requirements..."
              minLength={20}
              required
              rows={5}
            />
          </div>
        </div>

        <button
          className="button button-purple recruiter-submit"
          type="submit"
          disabled={creatingJob}
        >
          {creatingJob ? "Submitting..." : "Submit for review"}
          <ArrowRight size={17} />
        </button>

        <p className="recruiter-form-note">
          New listings remain pending until an administrator approves them.
        </p>
      </form>
    </section>

    <section className="dashboard-panel recruiter-listings-panel">
      <div className="dashboard-panel-heading">
        <div>
          <span className="section-eyebrow">YOUR POSTINGS</span>
          <h2>My listings ({myJobs.length})</h2>
        </div>
        <Building2 size={22} className="panel-heading-icon" />
      </div>

      {myJobs.length === 0 ? (
        <div className="dashboard-empty">
          <h3>No listings yet</h3>
          <p>Your submitted jobs and internships will appear here.</p>
        </div>
      ) : (
        <div className="recruiter-listings">
          {myJobs.map((job) => (
            <article className="recruiter-listing-row" key={job.id}>
              <div className="application-row-icon">
                <BriefcaseBusiness size={18} />
              </div>

              <div className="recruiter-listing-info">
                <strong>{job.title}</strong>
                <span>
                  {job.listingType === "internship"
                    ? "Internship"
                    : "Full-time job"}
                  {" · "}
                  {job.location || "Location not specified"}
                </span>
                <span>{compensation(job)}</span>

                {job.moderationNote && (
                  <span className="moderation-note">
                    Admin note: {job.moderationNote}
                  </span>
                )}
              </div>

              <StatusBadge status={job.status} />
            </article>
          ))}
        </div>
      )}
    </section>
  </>
)}

            {role !== "student" && (
              <section className="dashboard-footer-panel">

{role === "admin" && (
  <section className="dashboard-panel admin-moderation-panel">
    <div className="dashboard-panel-heading">
      <div>
        <span className="section-eyebrow">ADMIN WORKSPACE</span>
        <h2>Listing moderation</h2>
        <p className="admin-panel-description">
          Review job listings before they become visible to the public.
        </p>
      </div>

      <div className="profile-round-icon">
        <ShieldCheck size={21} />
      </div>
    </div>

    <div className="admin-pending-summary">
      <span>Awaiting review</span>
      <strong>{pendingJobs.length}</strong>
    </div>

    {pendingJobs.length === 0 ? (
      <div className="dashboard-empty">
        <div className="empty-icon">
          <CheckCircle2 size={22} />
        </div>
        <h3>All caught up!</h3>
        <p>There are no job listings waiting for review.</p>

        <button
          type="button"
          className="dashboard-secondary-button"
          onClick={() => setRefreshKey((value) => value + 1)}
        >
          <RefreshCw size={15} />
          Refresh pending listings
        </button>
      </div>
    ) : (
      <div className="admin-review-list">
        {pendingJobs.map((job) => (
          <article className="admin-review-card" key={job.id}>
            <div className="admin-review-top">
              <div className="dashboard-job-logo">
                {(job.companyName || "C").charAt(0).toUpperCase()}
              </div>

              <div className="admin-review-title">
                <h3>{job.title}</h3>
                <span>
                  {job.companyName || "Company"} ·{" "}
                  {job.listingType === "internship"
                    ? "Internship"
                    : "Full-time job"}
                </span>
              </div>

              <StatusBadge status={job.status} />
            </div>

            <div className="admin-review-details">
              <p>{job.description}</p>

              <div>
                <span>
                  <UserRound size={14} />
                  {job.recruiterName || "Recruiter"}
                </span>
                <span>{job.recruiterEmail}</span>
                <span>
                  <MapPin size={14} />
                  {job.location || "Location not specified"}
                </span>
              </div>

              <strong className="admin-review-compensation">
                {compensation(job)}
              </strong>

              {job.skillsRequired && (
                <div className="dashboard-job-skills">
                  {job.skillsRequired
                    .split(/[,;\n]/)
                    .map((skill) => skill.trim())
                    .filter(Boolean)
                    .slice(0, 8)
                    .map((skill) => (
                      <span key={skill}>{skill}</span>
                    ))}
                </div>
              )}
            </div>

            <div className="admin-review-note">
              <label htmlFor={`moderation-note-${job.id}`}>
                Moderation note (optional)
              </label>

              <textarea
                id={`moderation-note-${job.id}`}
                rows={2}
                maxLength={500}
                placeholder="Add feedback for the recruiter..."
                value={moderationNotes[job.id] || ""}
                onChange={(event) =>
                  setModerationNotes((previous) => ({
                    ...previous,
                    [job.id]: event.target.value
                  }))
                }
              />
            </div>

            <div className="admin-review-actions">
              <button
                type="button"
                className="admin-action-button reject"
                disabled={moderatingJobId === job.id}
                onClick={() => moderateJobListing(job.id, "reject")}
              >
                <XCircle size={16} />
                Reject
              </button>

              <button
                type="button"
                className="admin-action-button approve"
                disabled={moderatingJobId === job.id}
                onClick={() => moderateJobListing(job.id, "approve")}
              >
                <CheckCircle2 size={16} />
                {moderatingJobId === job.id
                  ? "Processing..."
                  : "Approve listing"}
              </button>
            </div>
          </article>
        ))}
      </div>
    )}
  </section>
)}

                <ShieldCheck size={21} />
                <div>
                  <strong>
                    {role === "recruiter"
                      ? "Recruiter workspace"
                      : "Administrator workspace"}
                  </strong>
                  <p>
                    {role === "recruiter"
                      ? "Only applications for your own job listings can be managed from this account."
                      : "Administrator permissions are enforced by the backend. Public users cannot approve listings."}
                  </p>
                </div>
              </section>
            )}
          </>
        )}
      </main>

      <footer className="dashboard-footer">
        <Link to="/" className="dashboard-footer-brand">
          pathway.
        </Link>
        <Link to="/contact">Contact</Link>
        <span>Utsadeep Kundu</span>
      </footer>
    </div>
  );
}

export default Dashboard;
