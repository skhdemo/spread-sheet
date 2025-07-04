import React, { useState, useEffect } from "react";
import { Family, Activity, ExpenseResult } from "./types";
import {
  Users,
  Plus,
  Calculator,
  DollarSign,
  Trash2,
  Download,
  Upload,
} from "lucide-react";

function App() {
  const [families, setFamilies] = useState<Family[]>(() => {
    const stored = localStorage.getItem("trip-families");
    return stored ? JSON.parse(stored) : [];
  });
  const [activities, setActivities] = useState<Activity[]>(() => {
    const stored = localStorage.getItem("trip-activities");
    return stored ? JSON.parse(stored) : [];
  });
  const [results, setResults] = useState<ExpenseResult[]>([]);

  // Family form state
  const [newFamilyName, setNewFamilyName] = useState("");
  const [newFamilyMemberCount, setNewFamilyMemberCount] = useState("");

  // Activity form state
  const [newActivityName, setNewActivityName] = useState("");
  const [newActivityCost, setNewActivityCost] = useState("");
  const [newActivityPaidBy, setNewActivityPaidBy] = useState("");
  const [newActivityParticipants, setNewActivityParticipants] = useState<
    { familyId: string; count: number }[]
  >([]);

  // Save to localStorage on change
  useEffect(() => {
    localStorage.setItem("trip-families", JSON.stringify(families));
  }, [families]);
  useEffect(() => {
    localStorage.setItem("trip-activities", JSON.stringify(activities));
  }, [activities]);

  // Export data
  const exportData = () => {
    const data = {
      families,
      activities,
      exportDate: new Date().toISOString(),
      version: "1.0",
    };

    const blob = new Blob([JSON.stringify(data, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `trip-expense-data-${
      new Date().toISOString().split("T")[0]
    }.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Import data
  const importData = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = JSON.parse(e.target?.result as string);

        // Validate the imported data structure
        if (
          !data.families ||
          !data.activities ||
          !Array.isArray(data.families) ||
          !Array.isArray(data.activities)
        ) {
          alert(
            "Invalid file format. Please select a valid trip expense data file."
          );
          return;
        }

        if (
          window.confirm("This will replace all current data. Are you sure?")
        ) {
          setFamilies(data.families);
          setActivities(data.activities);
          alert("Data imported successfully!");
        }
      } catch (error) {
        alert("Error reading file. Please make sure it's a valid JSON file.");
      }
    };
    reader.readAsText(file);

    // Reset the input so the same file can be selected again
    event.target.value = "";
  };

  // Reset all data
  const resetAllData = () => {
    if (window.confirm("Are you sure you want to clear all data?")) {
      setFamilies([]);
      setActivities([]);
      setResults([]);
      localStorage.removeItem("trip-families");
      localStorage.removeItem("trip-activities");
    }
  };

  // Add a new family
  const addFamily = () => {
    if (
      !newFamilyName.trim() ||
      !newFamilyMemberCount ||
      parseInt(newFamilyMemberCount) <= 0
    )
      return;

    const newFamily: Family = {
      id: Date.now().toString(),
      name: newFamilyName.trim(),
      memberCount: parseInt(newFamilyMemberCount),
    };

    setFamilies([...families, newFamily]);
    setNewFamilyName("");
    setNewFamilyMemberCount("");
  };

  // Remove a family
  const removeFamily = (familyId: string) => {
    setFamilies(families.filter((f) => f.id !== familyId));
    setActivities(activities.filter((a) => a.paidBy !== familyId));
    setNewActivityParticipants(
      newActivityParticipants.filter((p) => p.familyId !== familyId)
    );
  };

  // Handle per-family participant count change in activity form
  const handleParticipantCountChange = (familyId: string, value: string) => {
    const count = Math.max(
      0,
      Math.min(
        Number(value),
        families.find((f) => f.id === familyId)?.memberCount || 0
      )
    );
    setNewActivityParticipants((prev) => {
      const existing = prev.find((p) => p.familyId === familyId);
      if (existing) {
        return prev.map((p) => (p.familyId === familyId ? { ...p, count } : p));
      } else {
        return [...prev, { familyId, count }];
      }
    });
  };

  // Add a new activity
  const addActivity = () => {
    if (
      !newActivityName.trim() ||
      !newActivityCost ||
      !newActivityPaidBy ||
      newActivityParticipants.length === 0
    )
      return;

    const filteredParticipants = newActivityParticipants.filter(
      (p) => p.count > 0
    );
    const totalParticipants = filteredParticipants.reduce(
      (sum, p) => sum + p.count,
      0
    );
    if (filteredParticipants.length === 0 || totalParticipants === 0) return;

    const newActivity: Activity = {
      id: Date.now().toString(),
      name: newActivityName.trim(),
      cost: parseFloat(newActivityCost),
      paidBy: newActivityPaidBy,
      participants: filteredParticipants,
    };

    setActivities([...activities, newActivity]);
    setNewActivityName("");
    setNewActivityCost("");
    setNewActivityPaidBy("");
    setNewActivityParticipants([]);
  };

  // Remove an activity
  const removeActivity = (activityId: string) => {
    setActivities(activities.filter((a) => a.id !== activityId));
  };

  // Calculate expense results
  const calculateResults = () => {
    const results: ExpenseResult[] = families.map((family) => {
      let totalPaid = 0;
      let totalOwed = 0;

      // Calculate what this family paid
      activities.forEach((activity) => {
        if (activity.paidBy === family.id) {
          totalPaid += activity.cost;
        }
      });

      // Calculate what this family owes
      activities.forEach((activity) => {
        const famPart = activity.participants.find(
          (p) => p.familyId === family.id
        );
        const totalParticipants = activity.participants.reduce(
          (sum, p) => sum + p.count,
          0
        );
        if (famPart && famPart.count > 0 && totalParticipants > 0) {
          const costPerParticipant = activity.cost / totalParticipants;
          totalOwed += costPerParticipant * famPart.count;
        }
      });

      return {
        familyId: family.id,
        familyName: family.name,
        totalPaid,
        totalOwed,
        netAmount: totalPaid - totalOwed,
      };
    });

    setResults(results);
  };

  // Calculate results whenever families or activities change
  useEffect(() => {
    if (families.length > 0 && activities.length > 0) {
      calculateResults();
    } else {
      setResults([]);
    }
  }, [families, activities]);

  // Get total members across all families
  const getTotalMembers = () => {
    return families.reduce((sum, family) => sum + family.memberCount, 0);
  };

  return (
    <div className="container">
      <div className="header">
        <h1>🏖️ Trip Expense Splitter</h1>
        <p>Split trip expenses fairly between families and their members</p>
        <div
          style={{
            display: "flex",
            gap: "0.5rem",
            justifyContent: "center",
            marginTop: "1rem",
          }}
        >
          <button className="btn btn-secondary btn-small" onClick={exportData}>
            <Download size={14} /> Export Data
          </button>
          <label
            className="btn btn-secondary btn-small"
            style={{ cursor: "pointer", margin: 0 }}
          >
            <Upload size={14} /> Import Data
            <input
              type="file"
              accept=".json"
              onChange={importData}
              style={{ display: "none" }}
            />
          </label>
          <button className="btn btn-danger btn-small" onClick={resetAllData}>
            <Trash2 size={14} /> Reset All Data
          </button>
        </div>
      </div>

      <div className="grid-2">
        {/* Families Section */}
        <div className="section">
          <h2>
            <Users size={24} />
            Families
          </h2>

          <div className="form-group">
            <label>Family Name:</label>
            <input
              type="text"
              value={newFamilyName}
              onChange={(e) => setNewFamilyName(e.target.value)}
              placeholder="e.g., Smith Family"
            />
          </div>

          <div className="form-group">
            <label>Number of Members:</label>
            <input
              type="number"
              value={newFamilyMemberCount}
              onChange={(e) => setNewFamilyMemberCount(e.target.value)}
              placeholder="e.g., 3"
              min="1"
              max="20"
            />
          </div>

          <button className="btn btn-primary" onClick={addFamily}>
            <Plus size={16} />
            Add Family
          </button>

          {families.map((family) => (
            <div key={family.id} className="family-card">
              <div className="family-header">
                <div className="family-name">{family.name}</div>
                <button
                  className="btn btn-danger btn-small"
                  onClick={() => removeFamily(family.id)}
                >
                  <Trash2 size={14} />
                </button>
              </div>
              <div className="members-list">
                <span className="member-tag">
                  {family.memberCount} member
                  {family.memberCount !== 1 ? "s" : ""}
                </span>
              </div>
            </div>
          ))}

          {families.length > 0 && (
            <div
              style={{
                marginTop: "1rem",
                padding: "0.75rem",
                background: "#edf2f7",
                borderRadius: "8px",
                textAlign: "center",
              }}
            >
              <strong>Total Members: {getTotalMembers()}</strong>
            </div>
          )}
        </div>

        {/* Activities Section */}
        <div className="section">
          <h2>
            <DollarSign size={24} />
            Activities
          </h2>

          <div className="form-group">
            <label>Activity Name:</label>
            <input
              type="text"
              value={newActivityName}
              onChange={(e) => setNewActivityName(e.target.value)}
              placeholder="e.g., Dinner at Restaurant"
            />
          </div>

          <div className="form-group">
            <label>Cost ($):</label>
            <input
              type="number"
              value={newActivityCost}
              onChange={(e) => setNewActivityCost(e.target.value)}
              placeholder="0.00"
              step="0.01"
              min="0"
            />
          </div>

          <div className="form-group">
            <label>Paid By:</label>
            <select
              value={newActivityPaidBy}
              onChange={(e) => setNewActivityPaidBy(e.target.value)}
            >
              <option value="">Select a family</option>
              {families.map((family) => (
                <option key={family.id} value={family.id}>
                  {family.name}
                </option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label>Number of Participants Per Family:</label>
            {families.length === 0 && (
              <div style={{ color: "#718096", fontSize: "0.95rem" }}>
                Add families first.
              </div>
            )}
            {families.map((family) => {
              const value =
                newActivityParticipants.find((p) => p.familyId === family.id)
                  ?.count || "";
              return (
                <div
                  key={family.id}
                  style={{
                    marginBottom: "0.5rem",
                    display: "flex",
                    alignItems: "center",
                    gap: "0.5rem",
                  }}
                >
                  <label style={{ minWidth: 120 }}>{family.name}:</label>
                  <input
                    type="number"
                    min={0}
                    max={family.memberCount}
                    value={value}
                    onChange={(e) =>
                      handleParticipantCountChange(family.id, e.target.value)
                    }
                    placeholder={`0 - ${family.memberCount}`}
                    style={{ width: 80 }}
                  />
                  <span style={{ color: "#718096", fontSize: "0.95rem" }}>
                    (max {family.memberCount})
                  </span>
                </div>
              );
            })}
          </div>

          <button className="btn btn-primary" onClick={addActivity}>
            <Plus size={16} />
            Add Activity
          </button>

          {activities.map((activity) => {
            const totalParticipants = activity.participants.reduce(
              (sum, p) => sum + p.count,
              0
            );
            return (
              <div key={activity.id} className="activity-card">
                <div className="activity-header">
                  <div className="activity-name">{activity.name}</div>
                  <div className="activity-cost">
                    ${activity.cost.toFixed(2)}
                  </div>
                </div>
                <div className="paid-by">
                  Paid by:{" "}
                  {families.find((f) => f.id === activity.paidBy)?.name}
                </div>
                <div className="participants">
                  {activity.participants.map((p) => {
                    const fam = families.find((f) => f.id === p.familyId);
                    if (!fam || p.count === 0) return null;
                    return (
                      <span key={p.familyId} className="participant">
                        {fam.name}: {p.count}
                      </span>
                    );
                  })}
                  <span
                    className="participant"
                    style={{
                      background: "#c6f6d5",
                      color: "#22543d",
                      marginLeft: 8,
                    }}
                  >
                    Total: {totalParticipants}
                  </span>
                </div>
                <button
                  className="btn btn-danger btn-small"
                  onClick={() => removeActivity(activity.id)}
                  style={{ marginTop: "0.5rem" }}
                >
                  <Trash2 size={14} />
                  Remove
                </button>
              </div>
            );
          })}
        </div>
      </div>

      {/* Results Section */}
      {results.length > 0 && (
        <div className="section results-section">
          <h2>
            <Calculator size={24} />
            Expense Summary
          </h2>

          <div className="results-grid">
            {results.map((result) => (
              <div key={result.familyId} className="result-card">
                <div className="family-name-result">{result.familyName}</div>
                <div
                  className={`result-amount ${
                    result.netAmount > 0
                      ? "result-positive"
                      : result.netAmount < 0
                      ? "result-negative"
                      : "result-neutral"
                  }`}
                >
                  {result.netAmount > 0 ? "+" : ""}$
                  {result.netAmount.toFixed(2)}
                </div>
                <div style={{ fontSize: "0.875rem", color: "#718096" }}>
                  Paid: ${result.totalPaid.toFixed(2)} | Owed: $
                  {result.totalOwed.toFixed(2)}
                </div>
                {result.netAmount > 0 && (
                  <div
                    style={{
                      fontSize: "0.75rem",
                      color: "#38a169",
                      marginTop: "0.5rem",
                    }}
                  >
                    Gets money back
                  </div>
                )}
                {result.netAmount < 0 && (
                  <div
                    style={{
                      fontSize: "0.75rem",
                      color: "#e53e3e",
                      marginTop: "0.5rem",
                    }}
                  >
                    Owes money
                  </div>
                )}
                {result.netAmount === 0 && (
                  <div
                    style={{
                      fontSize: "0.75rem",
                      color: "#718096",
                      marginTop: "0.5rem",
                    }}
                  >
                    All settled
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {families.length === 0 && activities.length === 0 && (
        <div
          className="section"
          style={{ textAlign: "center", color: "#718096" }}
        >
          <p>
            Start by adding families and their member counts, then add
            activities to see the expense breakdown!
          </p>
        </div>
      )}
    </div>
  );
}

export default App;
