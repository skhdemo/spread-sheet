import React, { useState, useEffect } from "react";
import { Family, Activity, ExpenseResult } from "./types";
import { exportToCSV, importFromCSV } from "./csvUtils";
import {
  Users,
  Plus,
  Calculator,
  DollarSign,
  Trash2,
  Download,
  Upload,
  Edit3,
  Save,
  X,
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

  // Activity form state
  const [newActivityName, setNewActivityName] = useState("");
  const [newActivityCost, setNewActivityCost] = useState("");
  const [newActivityCurrency, setNewActivityCurrency] = useState<"USD" | "CAD">(
    "CAD"
  );
  const [newActivityPaidBy, setNewActivityPaidBy] = useState("");
  const [newActivityDate, setNewActivityDate] = useState("");
  const [newActivityParticipants, setNewActivityParticipants] = useState<
    { familyId: string; count: number }[]
  >([]);

  // Edit state
  const [editingFamilyId, setEditingFamilyId] = useState<string | null>(null);
  const [editingFamilyName, setEditingFamilyName] = useState("");

  const [editingActivityId, setEditingActivityId] = useState<string | null>(
    null
  );
  const [editingActivityName, setEditingActivityName] = useState("");
  const [editingActivityCost, setEditingActivityCost] = useState("");
  const [editingActivityPaidBy, setEditingActivityPaidBy] = useState("");
  const [editingActivityCurrency, setEditingActivityCurrency] = useState<
    "USD" | "CAD"
  >("CAD");
  const [editingActivityDate, setEditingActivityDate] = useState("");
  const [editingActivityParticipants, setEditingActivityParticipants] =
    useState<{ familyId: string; count: number }[]>([]);

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

  const handleExportToCSV = () => {
    if (families.length === 0 || activities.length === 0) {
      alert("No data to export. Add families and activities first.");
      return;
    }
    exportToCSV(families, activities);
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

  const handleImportFromCSV = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const content = e.target?.result as string;
        const result = importFromCSV(content);

        if (
          window.confirm("This will replace all current data. Are you sure?")
        ) {
          setFamilies(result.families);
          setActivities(result.activities);
          alert("CSV data imported successfully!");
        }
      } catch (error) {
        console.error("CSV import error:", error);
        alert("Error reading CSV file. Please check the file format.");
      }
    };
    reader.readAsText(file);
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
    if (!newFamilyName.trim()) return;

    const newFamily: Family = {
      id: Date.now().toString(),
      name: newFamilyName.trim(),
    };

    setFamilies([...families, newFamily]);
    setNewFamilyName("");
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
    const count = Math.max(0, Number(value));
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
      !newActivityDate ||
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
      currency: newActivityCurrency,
      paidBy: newActivityPaidBy,
      date: newActivityDate,
      participants: filteredParticipants,
    };

    setActivities([...activities, newActivity]);
    setNewActivityName("");
    setNewActivityCost("");
    setNewActivityCurrency("CAD");
    setNewActivityPaidBy("");
    setNewActivityDate("");
    setNewActivityParticipants([]);
  };

  // Remove an activity
  const removeActivity = (activityId: string) => {
    setActivities(activities.filter((a) => a.id !== activityId));
  };

  // Edit family functions
  const startEditFamily = (family: Family) => {
    setEditingFamilyId(family.id);
    setEditingFamilyName(family.name);
  };

  const cancelEditFamily = () => {
    setEditingFamilyId(null);
    setEditingFamilyName("");
  };

  const saveEditFamily = () => {
    if (!editingFamilyName.trim()) {
      return;
    }

    // Update the family
    setFamilies(
      families.map((family) =>
        family.id === editingFamilyId
          ? {
              ...family,
              name: editingFamilyName.trim(),
            }
          : family
      )
    );

    cancelEditFamily();
  };

  // Edit activity functions
  const startEditActivity = (activity: Activity) => {
    setEditingActivityId(activity.id);
    setEditingActivityName(activity.name);
    setEditingActivityCost(activity.cost.toString());
    setEditingActivityCurrency(activity.currency);
    setEditingActivityPaidBy(activity.paidBy);
    setEditingActivityDate(activity.date);
    setEditingActivityParticipants([...activity.participants]);
  };

  const cancelEditActivity = () => {
    setEditingActivityId(null);
    setEditingActivityName("");
    setEditingActivityCost("");
    setEditingActivityCurrency("CAD");
    setEditingActivityPaidBy("");
    setEditingActivityDate("");
    setEditingActivityParticipants([]);
  };

  const saveEditActivity = () => {
    if (
      !editingActivityName.trim() ||
      !editingActivityCost ||
      !editingActivityPaidBy ||
      !editingActivityDate ||
      editingActivityParticipants.length === 0
    ) {
      return;
    }

    const filteredParticipants = editingActivityParticipants.filter(
      (p) => p.count > 0
    );
    const totalParticipants = filteredParticipants.reduce(
      (sum, p) => sum + p.count,
      0
    );
    if (filteredParticipants.length === 0 || totalParticipants === 0) return;

    setActivities(
      activities.map((activity) =>
        activity.id === editingActivityId
          ? {
              ...activity,
              name: editingActivityName.trim(),
              cost: parseFloat(editingActivityCost),
              currency: editingActivityCurrency,
              paidBy: editingActivityPaidBy,
              date: editingActivityDate,
              participants: filteredParticipants,
            }
          : activity
      )
    );

    cancelEditActivity();
  };

  // Handle per-family participant count change in edit activity form
  const handleEditParticipantCountChange = (
    familyId: string,
    value: string
  ) => {
    const count = Math.max(0, Number(value));
    setEditingActivityParticipants((prev) => {
      const existing = prev.find((p) => p.familyId === familyId);
      if (existing) {
        return prev.map((p) => (p.familyId === familyId ? { ...p, count } : p));
      } else {
        return [...prev, { familyId, count }];
      }
    });
  };

  // USD to CAD conversion rate (you can update this as needed)
  const USD_TO_CAD_RATE = 1.35;

  // Convert amount to CAD
  const convertToCAD = (amount: number, currency: "USD" | "CAD") => {
    if (currency === "USD") {
      return amount * USD_TO_CAD_RATE;
    }
    return amount; // Already in CAD
  };

  // Calculate expense results
  const calculateResults = () => {
    const results: ExpenseResult[] = families.map((family) => {
      let totalPaid = 0;
      let totalOwed = 0;

      // Calculate what this family paid (converted to CAD)
      activities.forEach((activity) => {
        if (activity.paidBy === family.id) {
          totalPaid += convertToCAD(activity.cost, activity.currency);
        }
      });

      // Calculate what this family owes (converted to CAD)
      activities.forEach((activity) => {
        const famPart = activity.participants.find(
          (p) => p.familyId === family.id
        );
        const totalParticipants = activity.participants.reduce(
          (sum, p) => sum + p.count,
          0
        );
        if (famPart && famPart.count > 0 && totalParticipants > 0) {
          const costPerParticipant =
            convertToCAD(activity.cost, activity.currency) / totalParticipants;
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

  // Get total families
  const getTotalFamilies = () => {
    return families.length;
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
            flexWrap: "wrap",
          }}
        >
          <button className="btn btn-secondary btn-small" onClick={exportData}>
            <Download size={14} /> Export JSON
          </button>
          <button
            className="btn btn-secondary btn-small"
            onClick={handleExportToCSV}
          >
            <Download size={14} /> Export CSV
          </button>
          <label
            className="btn btn-secondary btn-small"
            style={{ cursor: "pointer", margin: 0 }}
          >
            <Upload size={14} /> Import JSON
            <input
              type="file"
              accept=".json"
              onChange={importData}
              style={{ display: "none" }}
            />
          </label>
          <label
            className="btn btn-secondary btn-small"
            style={{ cursor: "pointer", margin: 0 }}
          >
            <Upload size={14} /> Import CSV
            <input
              type="file"
              accept=".csv"
              onChange={handleImportFromCSV}
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

          <button className="btn btn-primary" onClick={addFamily}>
            <Plus size={16} />
            Add Family
          </button>

          {families.map((family) => (
            <div key={family.id} className="family-card">
              {editingFamilyId === family.id ? (
                // Edit mode
                <div>
                  <div className="form-group">
                    <label>Family Name:</label>
                    <input
                      type="text"
                      value={editingFamilyName}
                      onChange={(e) => setEditingFamilyName(e.target.value)}
                      placeholder="e.g., Smith Family"
                    />
                  </div>
                  <div
                    style={{
                      display: "flex",
                      gap: "0.5rem",
                      marginTop: "0.5rem",
                    }}
                  >
                    <button
                      className="btn btn-primary btn-small"
                      onClick={saveEditFamily}
                    >
                      <Save size={14} /> Save
                    </button>
                    <button
                      className="btn btn-secondary btn-small"
                      onClick={cancelEditFamily}
                    >
                      <X size={14} /> Cancel
                    </button>
                  </div>
                </div>
              ) : (
                // View mode
                <>
                  <div className="family-header">
                    <div className="family-name">{family.name}</div>
                    <div style={{ display: "flex", gap: "0.25rem" }}>
                      <button
                        className="btn btn-secondary btn-small"
                        onClick={() => startEditFamily(family)}
                      >
                        <Edit3 size={14} />
                      </button>
                      <button
                        className="btn btn-danger btn-small"
                        onClick={() => removeFamily(family.id)}
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                  <div className="members-list">
                    <span className="member-tag">Family</span>
                  </div>
                </>
              )}
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
              <strong>Total Families: {getTotalFamilies()}</strong>
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
            <label>Cost:</label>
            <div
              style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}
            >
              <input
                type="number"
                value={newActivityCost}
                onChange={(e) => setNewActivityCost(e.target.value)}
                placeholder="0.00"
                step="0.01"
                min="0"
                style={{ flex: 1 }}
              />
              <select
                value={newActivityCurrency}
                onChange={(e) =>
                  setNewActivityCurrency(e.target.value as "USD" | "CAD")
                }
                style={{ width: "auto" }}
              >
                <option value="CAD">CAD</option>
                <option value="USD">USD</option>
              </select>
            </div>
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
            <label>Date:</label>
            <input
              type="date"
              value={newActivityDate}
              onChange={(e) => setNewActivityDate(e.target.value)}
              placeholder="Select date"
            />
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
                    value={value}
                    onChange={(e) =>
                      handleParticipantCountChange(family.id, e.target.value)
                    }
                    placeholder="0"
                    style={{ width: 80 }}
                  />
                </div>
              );
            })}
          </div>

          <button className="btn btn-primary" onClick={addActivity}>
            <Plus size={16} />
            Add Activity
          </button>
        </div>
      </div>

      {/* Activities Display Section */}
      {activities.length > 0 && (
        <div className="section">
          <h2>
            <DollarSign size={24} />
            All Activities ({activities.length})
          </h2>
          <div className="activities-grid">
            {activities.map((activity) => {
              const totalParticipants = activity.participants.reduce(
                (sum, p) => sum + p.count,
                0
              );
              return (
                <div key={activity.id} className="activity-card">
                  {editingActivityId === activity.id ? (
                    // Edit mode
                    <div>
                      <div className="form-group">
                        <label>Activity Name:</label>
                        <input
                          type="text"
                          value={editingActivityName}
                          onChange={(e) =>
                            setEditingActivityName(e.target.value)
                          }
                          placeholder="e.g., Dinner at Restaurant"
                        />
                      </div>
                      <div className="form-group">
                        <label>Cost:</label>
                        <div
                          style={{
                            display: "flex",
                            gap: "0.5rem",
                            alignItems: "center",
                          }}
                        >
                          <input
                            type="number"
                            value={editingActivityCost}
                            onChange={(e) =>
                              setEditingActivityCost(e.target.value)
                            }
                            placeholder="0.00"
                            step="0.01"
                            min="0"
                            style={{ flex: 1 }}
                          />
                          <select
                            value={editingActivityCurrency}
                            onChange={(e) =>
                              setEditingActivityCurrency(
                                e.target.value as "USD" | "CAD"
                              )
                            }
                            style={{ width: "auto" }}
                          >
                            <option value="CAD">CAD</option>
                            <option value="USD">USD</option>
                          </select>
                        </div>
                      </div>
                      <div className="form-group">
                        <label>Paid By:</label>
                        <select
                          value={editingActivityPaidBy}
                          onChange={(e) =>
                            setEditingActivityPaidBy(e.target.value)
                          }
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
                        <label>Date:</label>
                        <input
                          type="date"
                          value={editingActivityDate}
                          onChange={(e) =>
                            setEditingActivityDate(e.target.value)
                          }
                          placeholder="Select date"
                        />
                      </div>
                      <div className="form-group">
                        <label>Number of Participants Per Family:</label>
                        {families.length === 0 && (
                          <div
                            style={{ color: "#718096", fontSize: "0.95rem" }}
                          >
                            Add families first.
                          </div>
                        )}
                        {families.map((family) => {
                          const value =
                            editingActivityParticipants.find(
                              (p) => p.familyId === family.id
                            )?.count || "";
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
                              <label style={{ minWidth: 120 }}>
                                {family.name}:
                              </label>
                              <input
                                type="number"
                                min={0}
                                value={value}
                                onChange={(e) =>
                                  handleEditParticipantCountChange(
                                    family.id,
                                    e.target.value
                                  )
                                }
                                placeholder="0"
                                style={{ width: 80 }}
                              />
                            </div>
                          );
                        })}
                      </div>
                      <div
                        style={{
                          display: "flex",
                          gap: "0.5rem",
                          marginTop: "0.5rem",
                        }}
                      >
                        <button
                          className="btn btn-primary btn-small"
                          onClick={saveEditActivity}
                        >
                          <Save size={14} /> Save
                        </button>
                        <button
                          className="btn btn-secondary btn-small"
                          onClick={cancelEditActivity}
                        >
                          <X size={14} /> Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    // View mode
                    <>
                      <div className="activity-header">
                        <div className="activity-name">{activity.name}</div>
                        <div className="activity-cost">
                          {activity.currency === "USD" ? "$" : "C$"}
                          {activity.cost.toFixed(2)}
                        </div>
                      </div>
                      <div className="paid-by">
                        Paid by:{" "}
                        {families.find((f) => f.id === activity.paidBy)?.name}
                      </div>
                      <div
                        className="activity-date"
                        style={{
                          fontSize: "0.875rem",
                          color: "#718096",
                          marginBottom: "0.5rem",
                        }}
                      >
                        Date: {new Date(activity.date).toLocaleDateString()}
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
                      <div
                        style={{
                          display: "flex",
                          gap: "0.25rem",
                          marginTop: "0.5rem",
                        }}
                      >
                        <button
                          className="btn btn-secondary btn-small"
                          onClick={() => startEditActivity(activity)}
                        >
                          <Edit3 size={14} />
                        </button>
                        <button
                          className="btn btn-danger btn-small"
                          onClick={() => removeActivity(activity.id)}
                        >
                          <Trash2 size={14} />
                          Remove
                        </button>
                      </div>
                    </>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Results Section */}
      {results.length > 0 && (
        <div className="section results-section">
          <h2>
            <Calculator size={24} />
            Expense Summary (All amounts in CAD)
          </h2>
          <div
            style={{
              fontSize: "0.875rem",
              color: "#718096",
              marginBottom: "1rem",
            }}
          >
            USD amounts are converted to CAD at 1 USD = 1.35 CAD
          </div>

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
                  {result.netAmount > 0 ? "+" : ""}C$
                  {result.netAmount.toFixed(2)}
                </div>
                <div style={{ fontSize: "0.875rem", color: "#718096" }}>
                  Paid: C${result.totalPaid.toFixed(2)} | Owed: C$
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
