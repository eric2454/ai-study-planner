"use client";
import Link from "next/link";
import {
  ArrowRight,
  Sparkles,
  CalendarDays,
  CheckCheck,
  Clock3,
  ChartNoAxesCombined,
  Bell,
  GraduationCap,
  Check,
  MoveUpRight,
} from "lucide-react";
import { motion } from "framer-motion";
import { useI18n } from "./providers";
import { LanguageSwitch } from "./language-switch";
import { Button } from "./ui/button";
export function Logo() {
  return (
    <Link href="/" className="logo">
      <span className="logo-mark">
        <GraduationCap size={23} />
      </span>
      <span>
        Study<span className="logo-light">planner</span>
        <small>POWERED BY AI</small>
      </span>
    </Link>
  );
}
export function Landing() {
  const { t } = useI18n();
  const icons = [
    Sparkles,
    CheckCheck,
    CalendarDays,
    Bell,
    ChartNoAxesCombined,
    Clock3,
  ];
  return (
    <div className="landing">
      <header className="landing-nav">
        <Logo />
        <nav>
          <a href="#features">{t("features")}</a>
          <a href="#how">{t("how")}</a>
          <a href="#benefits">{t("benefits")}</a>
        </nav>
        <div className="inline">
          <LanguageSwitch />
          <Link className="login-link" href="/login">
            {t("login")}
          </Link>
          <Button asChild size="sm">
            <Link href="/register">
              {t("getStarted")}
              <ArrowRight size={16} />
            </Link>
          </Button>
        </div>
      </header>
      <main>
        <section className="hero">
          <motion.div
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <span className="eyebrow">
              <span className="live-dot" />
              {t("heroLabel")}
            </span>
            <h1>{t("hero")}</h1>
            <p>{t("heroSub")}</p>
            <div className="hero-actions">
              <Button asChild>
                <Link href="/register">
                  {t("getStarted")}
                  <ArrowRight size={18} />
                </Link>
              </Button>
              <Button asChild variant="outline">
                <a href="#features">{t("seeFeatures")}</a>
              </Button>
            </div>
            <div className="hero-caption">
              <Check size={15} />
              {t("tagline")}
            </div>
          </motion.div>
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.2 }}
            className="hero-visual"
          >
            <div className="preview-window">
              <div className="preview-toolbar">
                <span />
                <span />
                <span />
                <small>{t("preview")}</small>
              </div>
              <div className="preview-content">
                <div className="preview-side">
                  <GraduationCap size={23} />
                  <div />
                  <div />
                  <div />
                  <div />
                </div>
                <div className="preview-main">
                  <span className="eyebrow">{t("workspace")}</span>
                  <h2>{t("welcome")}</h2>
                  <p>{t("previewDay")}</p>
                  <div className="preview-grid">
                    <div className="preview-card">
                      <CalendarDays size={21} />
                      <strong>{t("todayPlan")}</strong>
                      <div className="preview-session">
                        <small>09:00 — 09:50</small>
                        <b>{t("previewSession")}</b>
                      </div>
                      <div className="preview-session pale">
                        <small>10:00 — 10:50</small>
                        <b>{t("previewTask")}</b>
                      </div>
                    </div>
                    <div className="preview-card">
                      <span className="mini-orbit">
                        <Sparkles />
                      </span>
                      <strong>{t("aiRecommendation")}</strong>
                      <p>{t("feature1sub")}</p>
                    </div>
                  </div>
                  <div className="preview-task">
                    <span className="check-preview">
                      <Check size={13} />
                    </span>
                    {t("stepHow1")}
                    <span className="badge low">{t("completed")}</span>
                  </div>
                  <p className="preview-disclaimer">{t("previewNote")}</p>
                </div>
              </div>
            </div>
            <div className="floating-note">
              <span className="icon-tile green">
                <CheckCheck size={20} />
              </span>
              <div>
                <b>{t("feature2")}</b>
                <small>{t("tagline")}</small>
              </div>
            </div>
          </motion.div>
        </section>
        <section id="features" className="landing-section">
          <div className="section-intro">
            <span className="eyebrow">{t("features")}</span>
            <h2>{t("benefitTitle")}</h2>
          </div>
          <div className="features-grid">
            {icons.map((Icon, i) => (
              <article key={i}>
                <span className="feature-icon">
                  <Icon size={23} />
                </span>
                <h3>{t(`feature${i + 1}`)}</h3>
                <p>{t(`feature${i + 1}sub`)}</p>
              </article>
            ))}
          </div>
        </section>
        <section id="how" className="landing-section how-section">
          <span className="eyebrow">{t("how")}</span>
          <div className="steps">
            {[1, 2, 3].map((i) => (
              <div key={i}>
                <span>0{i}</span>
                <h3>{t(`stepHow${i}`)}</h3>
                <ArrowRight size={20} />
              </div>
            ))}
          </div>
        </section>
        <section id="benefits" className="benefits">
          <div>
            <span className="eyebrow">{t("benefits")}</span>
            <h2>{t("benefitTitle")}</h2>
            <p>{t("benefitSub")}</p>
          </div>
          <div className="benefit-art">
            <span />
            <span />
            <span />
            <GraduationCap size={70} />
          </div>
        </section>
        <section className="final-cta">
          <Sparkles size={30} />
          <h2>{t("cta")}</h2>
          <Button asChild>
            <Link href="/register">
              {t("getStarted")}
              <MoveUpRight size={18} />
            </Link>
          </Button>
        </section>
      </main>
      <footer>
        <Logo />
        <div>
          <Link href="/privacy">{t("privacy")}</Link>
          <Link href="/terms">{t("terms")}</Link>
          <span>
            © {new Date().getFullYear()} AI Study Planner. {t("rights")}
          </span>
        </div>
      </footer>
    </div>
  );
}
