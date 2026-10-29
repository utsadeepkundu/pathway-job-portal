
import { Link } from "react-router-dom";
import { motion, useReducedMotion } from "motion/react";
import {
  ArrowLeft,
  ArrowUpRight,
  Mail,
  MessageCircle,
  Sparkles
} from "lucide-react";
import "./Contact.css";

function Contact() {
  const reduceMotion = useReducedMotion();

  return (
    <div className="contact-page">
      <header className="contact-navbar">
        <Link to="/" className="brand" aria-label="Pathway home">
          <span className="brand-mark">
            <Sparkles size={22} />
          </span>
          <span>pathway<span className="brand-period">.</span></span>
        </Link>

        <Link to="/" className="contact-home-link">
          <ArrowLeft size={16} />
          Back to home
        </Link>
      </header>

      <main className="contact-main">
        <motion.div
          className="contact-decoration contact-decoration-one"
          animate={reduceMotion ? {} : { y: [0, -13, 0], rotate: [0, 8, 0] }}
          transition={{ duration: 7, repeat: Infinity, ease: "easeInOut" }}
        />

        <motion.div
          className="contact-decoration contact-decoration-two"
          animate={reduceMotion ? {} : { y: [0, 12, 0], x: [0, 8, 0] }}
          transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
        />

        <motion.section
          className="contact-card"
          initial={reduceMotion ? false : { opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55 }}
        >
          <div className="contact-icon">
            <MessageCircle size={29} />
          </div>

          <span className="section-eyebrow">LET'S CONNECT</span>

          <h1>
            Have a question?
            <br />
            <span className="gradient-text">Let's talk.</span>
          </h1>

          <p className="contact-description">
            Have feedback, an idea, or a question about Pathway?
            I'd love to hear from you. Send me an email and let's connect.
          </p>

          <motion.a
            className="contact-email-card"
            href="mailto:utsadeepkundu2002@gmail.com"
            whileHover={reduceMotion ? {} : { y: -4, scale: 1.015 }}
            whileTap={reduceMotion ? {} : { scale: 0.99 }}
          >
            <span className="contact-email-icon">
              <Mail size={22} />
            </span>

            <span className="contact-email-copy">
              <span className="contact-email-label">EMAIL ME AT</span>
              <strong>utsadeepkundu2002@gmail.com</strong>
            </span>

            <ArrowUpRight className="contact-email-arrow" size={21} />
          </motion.a>

          <a
            className="button button-purple contact-send-button"
            href="mailto:utsadeepkundu2002@gmail.com?subject=Contact%20from%20Pathway"
          >
            Send me an email
            <ArrowUpRight size={17} />
          </a>

          <div className="contact-divider" />

          <p className="contact-note">
            <Sparkles size={15} />
            Thanks for stopping by Pathway.
          </p>
        </motion.section>
      </main>

      <footer className="contact-footer">
        <Link to="/" className="contact-footer-home">pathway.</Link>
        <span>Utsadeep Kundu</span>
      </footer>
    </div>
  );
}

export default Contact;
