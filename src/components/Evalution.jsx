import React, { useState, useEffect } from "react";
import "../App.css";
import { saveEvaluation } from "../lib/db";

function Evaluation() {
  const [seminars, setSeminars] = useState([]);
  const [selectedSeminar, setSelectedSeminar] = useState(null);
  const [answers, setAnswers] = useState({});
  const [completion, setCompletion] = useState(0);
  const [animatedCompletion, setAnimatedCompletion] = useState(0);
  const [submitted, setSubmitted] = useState(false);
  const [showCheckmark, setShowCheckmark] = useState(false);

  useEffect(() => {
    const storedSeminars = JSON.parse(localStorage.getItem("seminars")) || [];
    setSeminars(storedSeminars);
  }, []);

  useEffect(() => {
    if (selectedSeminar?.questions?.length) {
      const total = selectedSeminar.questions.length;
      // Count only required questions, not feedback/comments
      const requiredQuestions = selectedSeminar.questions.filter(q => q.id !== "feedback");
      const answered = Object.keys(answers)
        .filter(key => key !== "feedback" && answers[key])
        .length;
      const newCompletion = requiredQuestions.length > 0 
        ? Math.round((answered / requiredQuestions.length) * 100) 
        : 0;
      setCompletion(newCompletion);
      setShowCheckmark(newCompletion === 100);
    } else {
      setCompletion(0);
      setShowCheckmark(false);
    }
  }, [answers, selectedSeminar]);

  useEffect(() => {
    const duration = 400;
    const frameRate = 20;
    const diff = completion - animatedCompletion;
    const step = diff / (duration / frameRate);
    const timer = setInterval(() => {
      setAnimatedCompletion((prev) => {
        const next = prev + step;
        if ((step > 0 && next >= completion) || (step < 0 && next <= completion)) {
          clearInterval(timer);
          return completion;
        }
        return next;
      });
    }, frameRate);
    return () => clearInterval(timer);
  }, [completion]);

  const handleSelectSeminar = (seminar) => {
    setSelectedSeminar(seminar);
    // Load previously saved answers for this seminar if they exist
    const allEvaluations = JSON.parse(localStorage.getItem("evaluations") || "{}");
    const previousAnswers = allEvaluations[seminar.title] || {};
    setAnswers(previousAnswers);
    setSubmitted(false);
    setShowCheckmark(false);
  };

  const handleAnswerChange = (qId, value) => {
    setAnswers({ ...answers, [qId]: value });
  };

  const handleSubmit = async () => {
    alert("Evaluation submitted successfully!");
    const allEvaluations = JSON.parse(localStorage.getItem("evaluations") || "{}");
    const completedEvaluations = JSON.parse(localStorage.getItem("completedEvaluations") || "[]");
    
    // Save evaluation answers locally
    allEvaluations[selectedSeminar.title] = answers;
    localStorage.setItem("evaluations", JSON.stringify(allEvaluations));
    
    // Track that evaluation is completed for this seminar locally
    if (!completedEvaluations.includes(selectedSeminar.title)) {
      completedEvaluations.push(selectedSeminar.title);
    }
    localStorage.setItem("completedEvaluations", JSON.stringify(completedEvaluations));

    // Try to persist evaluation to Supabase
    try {
      const participant_email = localStorage.getItem('participantEmail') || 'participant@example.com';
      const seminarId = selectedSeminar.id || null;
      const { data, error } = await saveEvaluation(seminarId, participant_email, answers);
      if (error) {
        console.warn('Failed to save evaluation to Supabase:', error.message || error);
      }
    } catch (err) {
      console.warn('Unexpected error saving evaluation:', err);
    }

    setSelectedSeminar(null);
    setAnswers({});
  };

  const radius = 60;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (animatedCompletion / 100) * circumference;

  return (
    <div className="evaluation-section">
      <h2 className="evaluation-title" style={{ margin: "0 0 0.5rem 0", fontSize: "2rem", color: "#1a3a52" }}>
        Seminar Evaluation Form
      </h2>
      <p className="evaluation-subtitle" style={{ margin: "0 0 2rem 0" }}>
        Please provide your feedback to help us improve future seminars
      </p>

      {!selectedSeminar ? (
        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
          gap: "1.5rem"
        }}>
          {seminars.length === 0 ? (
            <div style={{
              gridColumn: "1 / -1",
              background: "#f8fafc",
              padding: "3rem",
              borderRadius: "16px",
              textAlign: "center",
              border: "2px dashed #e0e0e0"
            }}>
              <div style={{ fontSize: "3rem", marginBottom: "1rem" }}>📭</div>
              <p style={{ fontSize: "1.1rem", color: "#666", margin: 0 }}>No seminars available for evaluation.</p>
            </div>
          ) : (
            seminars.map((s, i) => (
              <div
                key={i}
                onClick={() => handleSelectSeminar(s)}
                style={{
                  background: "#ffffff",
                  borderRadius: "16px",
                  padding: "1.5rem",
                  boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
                  transition: "all 0.3s",
                  border: "2px solid #f0f0f0",
                  cursor: "pointer"
                }}
                onMouseOver={(e) => {
                  e.currentTarget.style.boxShadow = "0 8px 24px rgba(196, 30, 58, 0.15)";
                  e.currentTarget.style.transform = "translateY(-4px)";
                  e.currentTarget.style.borderColor = "#c41e3a";
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.boxShadow = "0 4px 12px rgba(0,0,0,0.08)";
                  e.currentTarget.style.transform = "translateY(0)";
                  e.currentTarget.style.borderColor = "#f0f0f0";
                }}
              >
                <h4 style={{
                  fontSize: "1.25rem",
                  fontWeight: "600",
                  color: "#1a3a52",
                  margin: "0 0 1rem 0"
                }}>
                  {s.title}
                </h4>
                <div style={{ display: "grid", gap: "0.6rem" }}>
                  <p style={{ margin: 0, color: "#666", fontSize: "0.95rem" }}>
                    <strong style={{ color: "#1a3a52" }}>Date:</strong> {new Date(s.date).toLocaleDateString()}
                  </p>
                  <p style={{ margin: 0, color: "#666", fontSize: "0.95rem" }}>
                    <strong style={{ color: "#1a3a52" }}>Speaker:</strong> {s.speaker}
                  </p>
                </div>
                <div style={{
                  marginTop: "1rem",
                  paddingTop: "1rem",
                  borderTop: "1px solid #e0e0e0",
                  textAlign: "center"
                }}>
                  <span style={{
                    color: "#c41e3a",
                    fontWeight: "600",
                    fontSize: "0.9rem"
                  }}>
                    Click to evaluate
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      ) : (
        <div style={{
          background: "#ffffff",
          borderRadius: "16px",
          padding: "2.5rem",
          boxShadow: "0 8px 25px rgba(0,0,0,0.08)"
        }}>
          {/* Header */}
          <div style={{
            marginBottom: "2.5rem",
            paddingBottom: "1.5rem",
            borderBottom: "2px solid #e0e0e0"
          }}>
            <h3 style={{
              fontSize: "1.6rem",
              color: "#1a3a52",
              margin: "0 0 0.5rem 0",
              fontWeight: "600"
            }}>
              {selectedSeminar.title}
            </h3>
            <p style={{
              margin: 0,
              color: "#999",
              fontSize: "0.95rem"
            }}>
              Speaker: {selectedSeminar.speaker} | Date: {new Date(selectedSeminar.date).toLocaleDateString()}
            </p>
          </div>

          {/* Progress Section */}
          <div style={{
            background: "linear-gradient(135deg, #f8fafc 0%, #ffffff 100%)",
            padding: "2rem",
            borderRadius: "12px",
            marginBottom: "2.5rem",
            border: "2px solid #e0e0e0"
          }}>
            <p style={{
              margin: "0 0 1.5rem 0",
              color: "#1a3a52",
              fontWeight: "600",
              fontSize: "1rem"
            }}>
              Completion Status (Required Fields Only)
            </p>

            {/* Progress Bar */}
            <div style={{
              background: "#e0e0e0",
              borderRadius: "20px",
              height: "8px",
              overflow: "hidden",
              marginBottom: "1rem"
            }}>
              <div
                style={{
                  height: "100%",
                  width: `${completion}%`,
                  background: `linear-gradient(90deg, #c41e3a, #a01831)`,
                  transition: "width 0.3s ease",
                  borderRadius: "20px"
                }}
              ></div>
            </div>

            {/* Percentage Text */}
            <div style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center"
            }}>
              <p style={{
                margin: 0,
                color: "#666",
                fontSize: "0.9rem"
              }}>
                {completion}% Complete
              </p>
              {completion === 100 && (
                <span style={{
                  color: "#c41e3a",
                  fontWeight: "600",
                  fontSize: "0.95rem"
                }}>
                  All required fields completed
                </span>
              )}
            </div>
          </div>

          {/* Form */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSubmit();
            }}
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "1.5rem"
            }}
          >
            {/* Questions */}
            {selectedSeminar?.questions?.map((q, idx) => (
              <div
                key={idx}
                style={{
                  background: "#f8fafc",
                  padding: "1.5rem",
                  borderRadius: "12px",
                  border: "1px solid #e0e0e0",
                  transition: "all 0.3s"
                }}
              >
                <label style={{
                  display: "block",
                  fontWeight: "600",
                  color: "#1a3a52",
                  marginBottom: "1rem",
                  fontSize: "1rem"
                }}>
                  {idx + 1}. {q.question}
                </label>

                {q.type === "text" && (
                  <input
                    type="text"
                    value={answers[q.id] || ""}
                    onChange={(e) => handleAnswerChange(q.id, e.target.value)}
                    required
                    placeholder="Enter your response..."
                    style={{
                      width: "100%",
                      padding: "0.95rem",
                      border: "2px solid #e0e0e0",
                      borderRadius: "10px",
                      fontSize: "1rem",
                      transition: "all 0.3s",
                      boxSizing: "border-box"
                    }}
                    onFocus={(e) => e.target.style.borderColor = "#c41e3a"}
                    onBlur={(e) => e.target.style.borderColor = "#e0e0e0"}
                  />
                )}

                {q.type === "select" && (
                  <select
                    value={answers[q.id] || ""}
                    onChange={(e) => handleAnswerChange(q.id, e.target.value)}
                    required
                    style={{
                      width: "100%",
                      padding: "0.95rem",
                      border: "2px solid #e0e0e0",
                      borderRadius: "10px",
                      fontSize: "1rem",
                      transition: "all 0.3s",
                      boxSizing: "border-box",
                      background: "#ffffff",
                      cursor: "pointer"
                    }}
                    onFocus={(e) => e.target.style.borderColor = "#c41e3a"}
                    onBlur={(e) => e.target.style.borderColor = "#e0e0e0"}
                  >
                    <option value="">Select an option</option>
                    {q.options.map((opt, i) => (
                      <option key={i} value={opt}>{opt}</option>
                    ))}
                  </select>
                )}

                {q.type === "rating" && (
                  <div style={{
                    display: "flex",
                    gap: "0.8rem",
                    fontSize: "2rem"
                  }}>
                    {[1, 2, 3, 4, 5].map((star) => (
                      <span
                        key={star}
                        onClick={() => handleAnswerChange(q.id, star)}
                        style={{
                          cursor: "pointer",
                          color: answers[q.id] >= star ? "#c41e3a" : "#d0d0d0",
                          transition: "all 0.2s",
                          transform: answers[q.id] >= star ? "scale(1.1)" : "scale(1)"
                        }}
                      >
                        ★
                      </span>
                    ))}
                  </div>
                )}
              </div>
            ))}

            {/* Comments Section - Separated from completion percentage */}
            <div
              style={{
                background: "#f8fafc",
                padding: "1.5rem",
                borderRadius: "12px",
                border: "1px solid #e0e0e0"
              }}
            >
              <label style={{
                display: "block",
                fontWeight: "600",
                color: "#1a3a52",
                marginBottom: "1rem",
                fontSize: "1rem"
              }}>
                Additional Comments (Optional)
              </label>
              <textarea
                placeholder="Share your thoughts, suggestions, or feedback..."
                value={answers.feedback || ""}
                onChange={(e) => handleAnswerChange("feedback", e.target.value)}
                style={{
                  width: "100%",
                  padding: "0.95rem",
                  border: "2px solid #e0e0e0",
                  borderRadius: "10px",
                  fontSize: "1rem",
                  minHeight: "120px",
                  resize: "vertical",
                  fontFamily: "inherit",
                  transition: "all 0.3s",
                  boxSizing: "border-box"
                }}
                onFocus={(e) => e.target.style.borderColor = "#c41e3a"}
                onBlur={(e) => e.target.style.borderColor = "#e0e0e0"}
              ></textarea>
            </div>

            {/* Buttons */}
            <div style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr 1fr",
              gap: "1rem",
              marginTop: "1.5rem"
            }}>
              <button
                type="button"
                onClick={() => setSelectedSeminar(null)}
                style={{
                  padding: "1rem",
                  background: "#f5f5f5",
                  color: "#666",
                  border: "2px solid #e0e0e0",
                  borderRadius: "10px",
                  fontSize: "1rem",
                  fontWeight: "600",
                  cursor: "pointer",
                  transition: "all 0.3s"
                }}
                onMouseOver={(e) => {
                  e.currentTarget.style.background = "#e0e0e0";
                  e.currentTarget.style.borderColor = "#999";
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.background = "#f5f5f5";
                  e.currentTarget.style.borderColor = "#e0e0e0";
                }}
              >
                Back
              </button>
              <button
                type="button"
                onClick={() => {
                  if (window.confirm("Are you sure you want to clear all your answers?")) {
                    setAnswers({});
                  }
                }}
                style={{
                  padding: "1rem",
                  background: "#fff5f5",
                  color: "#c41e3a",
                  border: "2px solid #c41e3a",
                  borderRadius: "10px",
                  fontSize: "1rem",
                  fontWeight: "600",
                  cursor: "pointer",
                  transition: "all 0.3s"
                }}
                onMouseOver={(e) => {
                  e.currentTarget.style.background = "#ffe0e0";
                  e.currentTarget.style.boxShadow = "0 4px 12px rgba(196, 30, 58, 0.2)";
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.background = "#fff5f5";
                  e.currentTarget.style.boxShadow = "none";
                }}
              >
                Clear Answers
              </button>
              <button
                type="submit"
                disabled={completion < 100}
                style={{
                  padding: "1rem",
                  background: completion < 100 ? "#ccc" : "linear-gradient(135deg, #c41e3a, #a01831)",
                  color: "white",
                  border: "none",
                  borderRadius: "10px",
                  fontSize: "1rem",
                  fontWeight: "600",
                  cursor: completion < 100 ? "not-allowed" : "pointer",
                  transition: "all 0.3s",
                  boxShadow: completion < 100 ? "none" : "0 4px 15px rgba(196, 30, 58, 0.2)"
                }}
                onMouseOver={(e) => {
                  if (completion >= 100) {
                    e.currentTarget.style.boxShadow = "0 6px 20px rgba(196, 30, 58, 0.3)";
                  }
                }}
                onMouseOut={(e) => {
                  if (completion >= 100) {
                    e.currentTarget.style.boxShadow = "0 4px 15px rgba(196, 30, 58, 0.2)";
                  }
                }}
              >
                {completion < 100 ? `Complete ${completion}% to Submit` : "Submit Evaluation"}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}

export default Evaluation;
