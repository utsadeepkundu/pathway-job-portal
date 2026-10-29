
import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { motion, useReducedMotion } from "motion/react";
import {
  ArrowRight,
  ArrowUpRight,
  Bookmark,
  Building2,
  CheckCircle2,
  Clock3,
  Code2,
  GraduationCap,
  MapPin,
  Menu,
  Search,
  ShieldCheck,
  Sparkles,
  TrendingUp,
  Users,
  X,
  Zap
} from "lucide-react";
import api from "./api";
import "./App.css";

const FILTERS = [
  { label: "All opportunities", value: "all" },
  { label: "Internships", value: "internship" },
  { label: "Full-time jobs", value: "job" }
];

function formatCurrency(value) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0
  }).format(Number(value));
}

function formatCompensation(job) {
  if (job.listingType === "internship") {
    return job.stipendInrMonthly != null
      ? `${formatCurrency(job.stipendInrMonthly)} / month`
      : "Stipend not specified";
  }

  const minimum =
    job.salaryMinInrAnnual != null
      ? Number(job.salaryMinInrAnnual)
      : null;

  const maximum =
    job.salaryMaxInrAnnual != null
      ? Number(job.salaryMaxInrAnnual)
      : null;

  if (minimum !== null && maximum !== null) {
    return `${formatCurrency(minimum)} – ${formatCurrency(maximum)} / year`;
  }

  if (minimum !== null) {
    return `${formatCurrency(minimum)}+ / year`;
  }

  if (maximum !== null) {
    return `Up to ${formatCurrency(maximum)} / year`;
  }

  return "Salary not specified";
}

function formatPostedDate(value) {
  if (!value) return "Recently posted";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Recently posted";
  }

  const days = Math.max(
    0,
    Math.floor((Date.now() - date.getTime()) / 86400000)
  );

  if (days === 0) return "Today";
  if (days === 1) return "1 day ago";

  return `${days} days ago`;
}

function normalizeJob(job) {
  const company = job.companyName || "Company";

  return {
    ...job,
    company,
    type: job.listingType,
    mode: (job.workMode || "onsite")
      .replace(/^./, (character) => character.toUpperCase()),
    salary: formatCompensation(job),
    posted: formatPostedDate(job.createdAt),
    logo: company.charAt(0).toUpperCase(),
    color: job.listingType === "internship" ? "violet" : "blue",
    tags: (job.skillsRequired || "")
      .split(/[,;\n]/)
      .map((skill) => skill.trim())
      .filter(Boolean)
      .slice(0, 5)
  };
}

function JobCard({ job, index, saved, onSave, reduceMotion }) {
  return (
    <motion.article
      className="job-card"
      initial={reduceMotion ? false : { opacity: 0, y: 18 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.15 }}
      transition={{
        duration: reduceMotion ? 0 : 0.4,
        delay: reduceMotion ? 0 : index * 0.06
      }}
      whileHover={reduceMotion ? {} : { y: -5 }}
    >
      <div className="job-card-top">
        <div className={`company-logo ${job.color}`}>
          {job.logo}
        </div>

        <button
          type="button"
          className={`bookmark-button ${saved ? "is-saved" : ""}`}
          aria-label={saved ? "Remove saved job" : "Save job"}
          aria-pressed={saved}
          onClick={() => onSave(job.id)}
        >
          <Bookmark
            size={19}
            fill={saved ? "currentColor" : "none"}
          />
        </button>
      </div>

      <div className="job-company">{job.company}</div>
      <h3>{job.title}</h3>

      <div className="job-meta">
        <span>
          <MapPin size={14} />
          {job.location || "Location not specified"}
        </span>

        <span>
          <Clock3 size={14} />
          {job.posted}
        </span>
      </div>

      {job.tags.length > 0 && (
        <div className="job-tags">
          {job.tags.map((tag) => (
            <span key={tag}>{tag}</span>
          ))}
        </div>
      )}

      <div className="job-card-bottom">
        <div>
          <div className="job-salary">{job.salary}</div>
          <div className="job-mode">
            {job.mode} · {job.type === "job" ? "Full-time" : "Internship"}
          </div>
        </div>

        <a
          href="#how-it-works"
          className="job-arrow"
          aria-label={`Learn how to apply for ${job.title}`}
        >
          <ArrowUpRight size={20} />
        </a>
      </div>
    </motion.article>
  );
}

function App() {
  const reduceMotion = useReducedMotion();

  const [searchQuery, setSearchQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState("all");
  const [savedJobs, setSavedJobs] = useState([]);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const [jobs, setJobs] = useState([]);
  const [loadingJobs, setLoadingJobs] = useState(true);
  const [jobsError, setJobsError] = useState("");
  const [refreshJobs, setRefreshJobs] = useState(0);

  // Fetch real job listings from the Node.js API.
  useEffect(() => {
    let active = true;

    const timer = setTimeout(async () => {
      setLoadingJobs(true);
      setJobsError("");

      try {
        const params = {
          page: 1,
          limit: 20
        };

        if (searchQuery.trim()) {
          params.q = searchQuery.trim();
        }

        if (activeFilter !== "all") {
          params.type = activeFilter;
        }

        const response = await api.get("/jobs", { params });

        if (active) {
          setJobs(response.data.jobs || []);
        }
      } catch (error) {
        if (active) {
          setJobs([]);
          setJobsError(
            error.response?.data?.message ||
            "Could not load opportunities. Please try again."
          );
        }
      } finally {
        if (active) {
          setLoadingJobs(false);
        }
      }
    }, 250);

    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [searchQuery, activeFilter, refreshJobs]);

  const visibleJobs = useMemo(
    () => jobs.map(normalizeJob),
    [jobs]
  );

  function toggleSavedJob(jobId) {
    setSavedJobs((previous) =>
      previous.includes(jobId)
        ? previous.filter((id) => id !== jobId)
        : [...previous, jobId]
    );
  }

  function closeMobileMenu() {
    setMobileMenuOpen(false);
  }

  function scrollToJobs() {
    document.getElementById("jobs")?.scrollIntoView({
      behavior: reduceMotion ? "auto" : "smooth",
      block: "start"
    });
  }

  function clearFilters() {
    setSearchQuery("");
    setActiveFilter("all");
  }

  return (
    <div className="site-shell">
      {/* Navigation */}
      <header className="navbar">
        <a href="#home" className="brand" aria-label="Pathway home">
          <span className="brand-mark">
            <Sparkles size={22} />
          </span>
          <span>
            pathway<span className="brand-period">.</span>
          </span>
        </a>

        <button
          type="button"
          className="mobile-menu-button"
          aria-label={mobileMenuOpen ? "Close navigation" : "Open navigation"}
          aria-expanded={mobileMenuOpen}
          onClick={() => setMobileMenuOpen((open) => !open)}
        >
          {mobileMenuOpen ? <X size={23} /> : <Menu size={23} />}
        </button>

        <nav className={`nav-links ${mobileMenuOpen ? "nav-open" : ""}`}>
          <a href="#jobs" onClick={closeMobileMenu}>
            Find opportunities
          </a>
          <a href="#how-it-works" onClick={closeMobileMenu}>
            How it works
          </a>
          <a href="#recruiters" onClick={closeMobileMenu}>
            For recruiters
          </a>
          <Link to="/contact" onClick={closeMobileMenu}>
            Contact
          </Link>
        </nav>

        <div className="nav-actions">
          <Link to="/login" className="nav-signin">
  Sign in
</Link>

<Link to="/register" className="button button-dark button-small">
  Get started <ArrowUpRight size={16} />
</Link>
          <a
            href="#jobs"
            className="button button-dark button-small"
          >
            Get started <ArrowUpRight size={16} />
          </a>
        </div>
      </header>

      <main>
        {/* Hero */}
        <section className="hero section-container" id="home">
          <div className="hero-copy">
            <motion.div
              className="eyebrow"
              initial={reduceMotion ? false : { opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.45 }}
            >
              <span className="eyebrow-dot" />
              YOUR NEXT CHAPTER STARTS HERE
            </motion.div>

            <motion.h1
              initial={reduceMotion ? false : { opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.08 }}
            >
              Your potential.
              <br />
              Your path<span className="gradient-text">.</span>
              <br />
              <span className="hero-last-line">Your next big thing.</span>
            </motion.h1>

            <motion.p
              className="hero-description"
              initial={reduceMotion ? false : { opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.16 }}
            >
              Find internships and jobs that move you forward.
              Discover opportunities, build real experience, and take
              the next step in your career.
            </motion.p>

            <motion.form
              className="hero-search"
              onSubmit={(event) => {
                event.preventDefault();
                scrollToJobs();
              }}
              initial={reduceMotion ? false : { opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.23 }}
            >
              <Search size={20} className="search-icon" />
              <input
                type="search"
                placeholder="Role, skill, or company..."
                aria-label="Search jobs and internships"
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
              />
              <button className="button button-purple" type="submit">
                Find opportunities <ArrowRight size={17} />
              </button>
            </motion.form>

            <div className="hero-footnote">
              <div className="avatar-stack" aria-hidden="true">
                <span>A</span>
                <span>R</span>
                <span>S</span>
                <span>+</span>
              </div>
              <p>
                <strong>One step at a time.</strong>
                {" "}A better career starts with a search.
              </p>
            </div>
          </div>

          {/* Animated career dashboard */}
          <div
            className="hero-visual"
            aria-label="Illustration of a career dashboard"
          >
            <motion.div
              className="orb orb-one"
              animate={reduceMotion ? {} : { y: [0, -13, 0], x: [0, 5, 0] }}
              transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
            />

            <motion.div
              className="orb orb-two"
              animate={reduceMotion ? {} : { y: [0, 12, 0], x: [0, -5, 0] }}
              transition={{ duration: 7, repeat: Infinity, ease: "easeInOut" }}
            />

            <motion.div
              className="hero-dashboard"
              initial={reduceMotion ? false : { opacity: 0, scale: 0.94, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.1 }}
            >
              <div className="dashboard-header">
                <div>
                  <span className="dashboard-kicker">YOUR CAREER SPACE</span>
                  <h3>Good things ahead.</h3>
                </div>
                <div className="dashboard-avatar">P</div>
              </div>

              <div className="progress-box">
                <div className="progress-heading">
                  <span>Profile strength</span>
                  <strong>82%</strong>
                </div>
                <div className="progress-track">
                  <motion.div
                    className="progress-fill"
                    initial={{ width: "0%" }}
                    animate={{ width: "82%" }}
                    transition={{
                      duration: reduceMotion ? 0 : 1,
                      delay: 0.3
                    }}
                  />
                </div>
                <div className="progress-foot">
                  <CheckCircle2 size={14} />
                  Looking good — keep going!
                </div>
              </div>

              <div className="dashboard-section-heading">
                <span>Picked for you</span>
                <span className="see-all">A few ideas</span>
              </div>

              <div className="mini-job">
                <div className="mini-job-logo mini-purple">
                  <Code2 size={20} />
                </div>
                <div className="mini-job-copy">
                  <strong>Software Engineering</strong>
                  <span>Technology · Internship</span>
                </div>
                <ArrowUpRight size={17} className="mini-arrow" />
              </div>

              <div className="mini-job">
                <div className="mini-job-logo mini-peach">
                  <TrendingUp size={20} />
                </div>
                <div className="mini-job-copy">
                  <strong>Data & Analytics</strong>
                  <span>Analytics · Entry level</span>
                </div>
                <ArrowUpRight size={17} className="mini-arrow" />
              </div>

              <div className="dashboard-footer">
                <span>
                  <ShieldCheck size={15} />
                  Your journey, your pace
                </span>
                <Sparkles size={17} />
              </div>
            </motion.div>

            <motion.div
              className="floating-card floating-top"
              animate={reduceMotion ? {} : { y: [0, -9, 0] }}
              transition={{ duration: 4.5, repeat: Infinity, ease: "easeInOut" }}
            >
              <div className="floating-icon">
                <CheckCircle2 size={20} />
              </div>
              <div>
                <strong>Application ready</strong>
                <span>Make your next move</span>
              </div>
            </motion.div>

            <motion.div
              className="floating-card floating-bottom"
              animate={reduceMotion ? {} : { y: [0, 10, 0] }}
              transition={{ duration: 5.4, repeat: Infinity, ease: "easeInOut" }}
            >
              <div className="floating-icon purple-icon">
                <Zap size={20} />
              </div>
              <div>
                <strong>Your next opportunity</strong>
                <span>Could be one search away.</span>
              </div>
            </motion.div>
          </div>
        </section>

        {/* Trust strip */}
        <section className="trust-strip">
          <div className="section-container trust-inner">
            <div>
              <Users size={20} />
              <span>
                Built for <strong>students & graduates</strong>
              </span>
            </div>

            <span className="trust-divider" />

            <div>
              <Building2 size={20} />
              <span>
                Designed for <strong>growing teams</strong>
              </span>
            </div>

            <span className="trust-divider" />

            <div>
              <ShieldCheck size={20} />
              <span>
                Focused on <strong>meaningful opportunities</strong>
              </span>
            </div>
          </div>
        </section>

        {/* Live job listings */}
        <section className="jobs-section section-container" id="jobs">
          <div className="section-heading">
            <div>
              <span className="section-eyebrow">MAKE YOUR NEXT MOVE</span>
              <h2>
                Opportunities worth{" "}
                <span className="gradient-text">exploring.</span>
              </h2>
              <p>
                Find a role that matches your skills, your goals,
                and where you want to go.
              </p>
            </div>

            <div className="listing-count">
              <span className="count-number">
                {loadingJobs ? "…" : String(visibleJobs.length).padStart(2, "0")}
              </span>
              <span>
                opportunities
                <br />
                shown
              </span>
            </div>
          </div>

          <div className="job-filters">
            <div className="filter-tabs" aria-label="Filter opportunities">
              {FILTERS.map((filter) => (
                <button
                  key={filter.value}
                  type="button"
                  className={
                    activeFilter === filter.value
                      ? "filter-tab active"
                      : "filter-tab"
                  }
                  aria-pressed={activeFilter === filter.value}
                  onClick={() => setActiveFilter(filter.value)}
                >
                  {filter.label}
                </button>
              ))}
            </div>

            <div className="search-hint">
              <Search size={15} />
              <span>
                {searchQuery
                  ? `Searching: ${searchQuery}`
                  : "Try React, Python, or remote"}
              </span>
            </div>
          </div>

          {loadingJobs && (
            <div className="jobs-status" role="status">
              <span className="loading-indicator" />
              Loading live opportunities...
            </div>
          )}

          {!loadingJobs && jobsError && (
            <div className="empty-state jobs-error" role="alert">
              <Search size={30} />
              <h3>Unable to load opportunities</h3>
              <p>{jobsError}</p>
              <button
                type="button"
                className="button button-dark"
                onClick={() => setRefreshJobs((count) => count + 1)}
              >
                Try again
              </button>
            </div>
          )}

          {!loadingJobs && !jobsError && (
            <>
              {visibleJobs.length > 0 ? (
                <div className="jobs-grid">
                  {visibleJobs.map((job, index) => (
                    <JobCard
                      key={job.id}
                      job={job}
                      index={index}
                      saved={savedJobs.includes(job.id)}
                      onSave={toggleSavedJob}
                      reduceMotion={reduceMotion}
                    />
                  ))}
                </div>
              ) : (
                <div className="empty-state">
                  <Search size={30} />
                  <h3>No approved opportunities yet</h3>
                  <p>
                    Try another keyword or filter, or check back later
                    for newly approved jobs and internships.
                  </p>
                  <button
                    type="button"
                    className="button button-dark"
                    onClick={clearFilters}
                  >
                    Clear filters
                  </button>
                </div>
              )}
            </>
          )}

          <p className="demo-note">
            <Sparkles size={15} />
            Live listings from Pathway, featuring opportunities approved by admins.
          </p>
        </section>

        {/* How it works */}
        <section className="how-section" id="how-it-works">
          <div className="section-container">
            <div className="center-heading">
              <span className="section-eyebrow">SIMPLE BY DESIGN</span>
              <h2>
                A better way to move{" "}
                <span className="gradient-text">forward.</span>
              </h2>
              <p>
                No complicated process. Just a clearer path to your
                next opportunity.
              </p>
            </div>

            <div className="steps-grid">
              <motion.article
                className="step-card"
                whileHover={reduceMotion ? {} : { y: -5 }}
                transition={{ duration: 0.2 }}
              >
                <div className="step-number">01</div>
                <div className="step-icon step-lavender">
                  <GraduationCap size={25} />
                </div>
                <h3>Build your profile</h3>
                <p>
                  Showcase your education, skills, experience,
                  and what makes you different.
                </p>
              </motion.article>

              <motion.article
                className="step-card"
                whileHover={reduceMotion ? {} : { y: -5 }}
                transition={{ duration: 0.2 }}
              >
                <div className="step-number">02</div>
                <div className="step-icon step-peach">
                  <Search size={25} />
                </div>
                <h3>Discover your fit</h3>
                <p>
                  Explore opportunities that align with your interests
                  and career goals.
                </p>
              </motion.article>

              <motion.article
                className="step-card"
                whileHover={reduceMotion ? {} : { y: -5 }}
                transition={{ duration: 0.2 }}
              >
                <div className="step-number">03</div>
                <div className="step-icon step-mint">
                  <TrendingUp size={25} />
                </div>
                <h3>Take the next step</h3>
                <p>
                  Apply to roles, follow your progress,
                  and keep building momentum.
                </p>
              </motion.article>
            </div>
          </div>
        </section>

        {/* Recruiters */}
        <section className="recruiter-section section-container" id="recruiters">
          <div className="recruiter-card">
            <div className="recruiter-copy">
              <span className="recruiter-kicker">
                <Building2 size={15} />
                FOR RECRUITERS
              </span>

              <h2>
                Meet people who are ready to{" "}
                <span>make an impact.</span>
              </h2>

              <p>
                Find emerging talent, share opportunities,
                and build a team ready for what's next.
              </p>

              <Link to="/contact" className="button button-light">
                Get in touch <ArrowRight size={17} />
              </Link>
            </div>

            <div className="recruiter-art" aria-hidden="true">
              <motion.div
                className="recruiter-orbit orbit-one"
                animate={reduceMotion ? {} : { rotate: 360 }}
                transition={{ duration: 28, repeat: Infinity, ease: "linear" }}
              />

              <motion.div
                className="recruiter-orbit orbit-two"
                animate={reduceMotion ? {} : { rotate: -360 }}
                transition={{ duration: 35, repeat: Infinity, ease: "linear" }}
              />

              <div className="recruiter-center">
                <Users size={39} />
              </div>

              <div className="recruiter-bubble bubble-one">
                <Code2 size={20} />
              </div>
              <div className="recruiter-bubble bubble-two">
                <GraduationCap size={20} />
              </div>
              <div className="recruiter-bubble bubble-three">
                <Sparkles size={20} />
              </div>
            </div>
          </div>
        </section>

        {/* Final CTA */}
        <section className="final-cta section-container">
          <div className="cta-sparkle">
            <Sparkles size={22} />
          </div>

          <span className="section-eyebrow">
            YOUR NEXT CHAPTER AWAITS
          </span>

          <h2>
            Small steps.{" "}
            <span className="gradient-text">Big possibilities.</span>
          </h2>

          <p>
            Every great career begins somewhere.
            Make your next move count.
          </p>

          <a href="#jobs" className="button button-purple">
            Explore opportunities <ArrowRight size={17} />
          </a>
        </section>
      </main>

      {/* Footer */}
      <footer className="footer">
        <div className="section-container footer-inner">
          <a href="#home" className="brand" aria-label="Pathway home">
            <span className="brand-mark">
              <Sparkles size={20} />
            </span>
            <span>
              pathway<span className="brand-period">.</span>
            </span>
          </a>

          <Link to="/contact" className="footer-contact-link">
            Contact <ArrowUpRight size={16} />
          </Link>

          <span className="footer-copy">Utsadeep Kundu</span>
        </div>
      </footer>
    </div>
  );
}

export default App;
