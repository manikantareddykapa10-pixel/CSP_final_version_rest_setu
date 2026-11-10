import React, { useState } from "react";
import { Navigate } from "react-router-dom";
import { useSelector } from "react-redux";
import Layout from "../../components/shared/Layout/Layout";

const bloodGroups = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"];

const getDateParts = (value) => {
  if (!value) return null;
  const parts = value.split("-").map(Number);
  if (parts.length !== 3 || parts.some(Number.isNaN)) return null;
  const [year, month, day] = parts;
  const timestamp = Date.UTC(year, month - 1, day);
  const date = new Date(timestamp);
  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) return null;
  return { year, month, day, timestamp };
};

const getAge = (birthDate, today) => {
  let age = today.year - birthDate.year;
  if (
    today.month < birthDate.month ||
    (today.month === birthDate.month && today.day < birthDate.day)
  ) age -= 1;
  return age;
};

const EligibilityScore = () => {
  const { user } = useSelector((state) => state.auth);
  const [details, setDetails] = useState({
    dateOfBirth: "",
    weight: "",
    gender: "",
    bloodGroup: "",
    firstTimeDonor: "",
    lastDonationDate: "",
    collectionVolume: "350",
  });

  if (user?.role !== "donar") return <Navigate to="/" replace />;

  const updateDetail = (field) => (event) => {
    setDetails((current) => ({ ...current, [field]: event.target.value }));
  };

  const today = getDateParts(new Date().toISOString().slice(0, 10));
  const birthDate = getDateParts(details.dateOfBirth);
  const lastDonationDate = getDateParts(details.lastDonationDate);
  const age = birthDate && today ? getAge(birthDate, today) : null;
  const weight = Number(details.weight);
  const collectionVolume = Number(details.collectionVolume);
  const minimumWeight = collectionVolume === 450 ? 55 : 45;
  const detailsComplete = Boolean(
    birthDate &&
    birthDate.timestamp <= today.timestamp &&
    Number.isFinite(weight) &&
    weight > 0 &&
    details.gender &&
    details.bloodGroup &&
    details.firstTimeDonor &&
    (details.firstTimeDonor === "yes" ||
      (lastDonationDate && lastDonationDate.timestamp <= today.timestamp))
  );
  const intervalDays = lastDonationDate && today
    ? Math.floor((today.timestamp - lastDonationDate.timestamp) / 86400000)
    : null;

  const criteria = [];
  if (detailsComplete) {
    criteria.push({
      id: "age",
      label: "Age is within 18–65 years",
      passed: age >= 18 && age <= 65,
      suggestion: age < 18
        ? "The guidelines require donors to be at least 18. Check with a donation centre when you meet the age requirement."
        : "The guidelines shown list an age range of 18–65 years. Contact a donation centre for advice.",
    });

    if (details.firstTimeDonor === "yes") {
      criteria.push({
        id: "first-time-age",
        label: "First-time donor age is not above 60",
        passed: age <= 60,
        suggestion: "The guidelines shown say first-time donors should not be above 60. Contact a donation centre for individual guidance.",
      });
    }

    criteria.push({
      id: "weight",
      label: `Weight meets the ${collectionVolume} ml collection guideline`,
      passed: collectionVolume === 450 ? weight > minimumWeight : weight >= minimumWeight,
      suggestion: collectionVolume === 450
        ? "The guideline shown requires weight above 55 kg for 450 ml collection. Consider asking the donation centre about the 350 ml collection requirement."
        : "The guideline shown requires at least 45 kg for 350 ml collection. Contact a donation centre for advice.",
    });

    if (details.firstTimeDonor === "no") {
      if (details.gender === "other") {
        criteria.push({
          id: "interval",
          label: "Donation interval needs confirmation",
          passed: null,
          suggestion: "The interval information provided covers males and females only. Please confirm the appropriate interval with a donation-centre professional.",
        });
      } else {
        const requiredInterval = details.gender === "male" ? 90 : 120;
        criteria.push({
          id: "interval",
          label: `At least ${requiredInterval} days since the last donation`,
          passed: intervalDays >= requiredInterval,
          suggestion: `The guideline shown requires an interval of ${requiredInterval} days for ${details.gender === "male" ? "males" : "females"}. Please wait until then and confirm with a donation centre.`,
        });
      }
    }
  }

  const score = detailsComplete && criteria.length
    ? Math.round((criteria.filter((criterion) => criterion.passed === true).length / criteria.length) * 100)
    : null;
  const intervalNeedsConfirmation = criteria.some((criterion) => criterion.passed === null);

  return (
    <Layout>
      <main className="container py-4" style={{ maxWidth: 920 }}>
        <div className="mb-4">
          <h1 className="h3 mb-2">My Eligibility Score</h1>
          <p className="text-muted mb-0">
            Enter your details to compare with the donation guidelines shown below.
          </p>
        </div>

        <section
          className="card border-0 shadow-sm mb-4"
          aria-labelledby="eligibility-score-title"
          style={{ borderRadius: 16 }}
        >
          <div className="card-body p-4">
            <div className="d-flex flex-wrap justify-content-between align-items-center gap-3 mb-3">
              <div>
                <h2 id="eligibility-score-title" className="h5 mb-1">Guideline match score</h2>
                <p className="text-muted mb-0">
                  {score === null
                    ? "Complete the required details to calculate your score."
                    : `${criteria.filter((criterion) => criterion.passed === true).length} of ${criteria.length} applicable checks met`}
                </p>
              </div>
              <div className="text-end" aria-live="polite">
                <span className="h2 mb-0" style={{ color: score === 100 ? "#13856b" : "#b7791f" }}>
                  {score === null ? "—" : score}
                </span>
                <span className="text-muted"> / 100</span>
              </div>
            </div>
            <div
              className="progress"
              role="progressbar"
              aria-label="Donation guideline match score"
              aria-valuenow={score ?? 0}
              aria-valuemin="0"
              aria-valuemax="100"
              style={{ height: 12, borderRadius: 999, backgroundColor: "#e8f2ef" }}
            >
              <div
                className="progress-bar"
                style={{
                  width: `${score ?? 0}%`,
                  borderRadius: 999,
                  backgroundColor: score === 100 ? "#13856b" : "#c27a12",
                  transition: "width 250ms ease",
                }}
              />
            </div>
            {score !== null && (
              <p className={`mt-3 mb-0 ${score === 100 && !intervalNeedsConfirmation ? "text-success" : "text-warning"}`}>
                {intervalNeedsConfirmation
                  ? "Some information needs professional confirmation."
                  : score === 100
                    ? "Your details match the selected guidelines."
                    : "One or more selected guidelines are not met."}
              </p>
            )}
            <p className="small text-muted mt-3 mb-0">
              This score is an informational comparison, not medical advice or a donation clearance.
              A qualified donation-centre professional makes the final eligibility decision.
            </p>
          </div>
        </section>

        <section className="card border-0 shadow-sm mb-4" aria-labelledby="donor-details-title" style={{ borderRadius: 16 }}>
          <div className="card-body p-4">
            <h2 id="donor-details-title" className="h5 mb-3">Donor details</h2>
            <div className="row g-3">
              <div className="col-md-6">
                <label htmlFor="donor-date-of-birth" className="form-label">Date of birth</label>
                <input
                  id="donor-date-of-birth"
                  className="form-control"
                  type="date"
                  max={new Date().toISOString().slice(0, 10)}
                  value={details.dateOfBirth}
                  onChange={updateDetail("dateOfBirth")}
                />
              </div>
              <div className="col-md-6">
                <label htmlFor="donor-weight" className="form-label">Weight (kg)</label>
                <input
                  id="donor-weight"
                  className="form-control"
                  type="number"
                  min="1"
                  step="0.1"
                  value={details.weight}
                  onChange={updateDetail("weight")}
                  placeholder="e.g. 58"
                />
              </div>
              <div className="col-md-6">
                <label htmlFor="donor-gender" className="form-label">Gender for interval guideline</label>
                <select id="donor-gender" className="form-select" value={details.gender} onChange={updateDetail("gender")}>
                  <option value="">Select</option>
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                  <option value="other">Another identity / prefer not to say</option>
                </select>
                <div className="form-text">Used only for the male/female donation interval shown below.</div>
              </div>
              <div className="col-md-6">
                <label htmlFor="donor-blood-group" className="form-label">Blood group</label>
                <select id="donor-blood-group" className="form-select" value={details.bloodGroup} onChange={updateDetail("bloodGroup")}>
                  <option value="">Select blood group</option>
                  {bloodGroups.map((group) => <option key={group} value={group}>{group}</option>)}
                </select>
              </div>
              <div className="col-md-6">
                <label htmlFor="first-time-donor" className="form-label">First-time donor?</label>
                <select id="first-time-donor" className="form-select" value={details.firstTimeDonor} onChange={updateDetail("firstTimeDonor")}>
                  <option value="">Select</option>
                  <option value="yes">Yes</option>
                  <option value="no">No</option>
                </select>
              </div>
              {details.firstTimeDonor === "no" && (
                <div className="col-md-6">
                  <label htmlFor="last-donation-date" className="form-label">Last donation date</label>
                  <input
                    id="last-donation-date"
                    className="form-control"
                    type="date"
                    max={new Date().toISOString().slice(0, 10)}
                    value={details.lastDonationDate}
                    onChange={updateDetail("lastDonationDate")}
                  />
                </div>
              )}
              <div className="col-md-6">
                <label htmlFor="collection-volume" className="form-label">Collection volume to check</label>
                <select id="collection-volume" className="form-select" value={details.collectionVolume} onChange={updateDetail("collectionVolume")}>
                  <option value="350">350 ml</option>
                  <option value="450">450 ml</option>
                </select>
              </div>
            </div>
            <p className="small text-muted mt-3 mb-0">
              Your answers are kept only in this page and are not saved or sent to the server.
              Each applicable guideline check contributes equally to the score; blood group is recorded for reference and does not change it.
            </p>
          </div>
        </section>

        {detailsComplete && (
          <section className="card border-0 shadow-sm" aria-labelledby="eligibility-suggestions-title" style={{ borderRadius: 16 }}>
            <div className="card-body p-4">
              <h2 id="eligibility-suggestions-title" className="h5 mb-3">Guideline checks and suggestions</h2>
              <ul className="list-unstyled mb-0">
                {criteria.map((criterion) => (
                  <li className="d-flex align-items-start gap-2 mb-3" key={criterion.id}>
                    <i
                      className={`fa-solid ${criterion.passed === true ? "fa-circle-check text-success" : criterion.passed === false ? "fa-circle-exclamation text-warning" : "fa-circle-info text-primary"} mt-1`}
                      aria-hidden="true"
                    ></i>
                    <div>
                      <strong>{criterion.label}</strong>
                      {criterion.passed !== true && <div className="text-muted">{criterion.suggestion}</div>}
                    </div>
                  </li>
                ))}
              </ul>
              <p className="small text-muted mb-0">
                Based on the 2025 Indian whole-blood donation guidelines provided. Confirm current requirements with your donation centre.
              </p>
            </div>
          </section>
        )}
      </main>
    </Layout>
  );
};

export default EligibilityScore;
