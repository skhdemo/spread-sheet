import { Family, Activity } from "./types";

// Convert USD to CAD
const convertToCAD = (amount: number, currency: "USD" | "CAD") => {
  if (currency === "USD") {
    return amount * 1.35; // 1 USD = 1.35 CAD
  }
  return amount;
};

// Export data to CSV format compatible with Google Sheets
export const exportToCSV = (families: Family[], activities: Activity[]) => {
  // Create CSV content
  let csvContent = "data:text/csv;charset=utf-8,";

  // Add headers
  const headers = [
    "Activity",
    "Date",
    "Cost",
    "Currency",
    "Paid By",
    ...families.map((f) => f.name),
  ];
  csvContent += headers.join(",") + "\n";

  // Add activities
  activities.forEach((activity) => {
    const paidByFamily = families.find((f) => f.id === activity.paidBy);
    const row = [
      activity.name,
      new Date(activity.date).toLocaleDateString(),
      activity.cost.toString(),
      activity.currency,
      paidByFamily?.name || "",
      ...families.map((family) => {
        const participant = activity.participants.find(
          (p) => p.familyId === family.id
        );
        return participant ? participant.count.toString() : "0";
      }),
    ];
    csvContent += row.join(",") + "\n";
  });

  // Add balance rows
  const results = calculateResults(families, activities);
  results.forEach((result) => {
    const balanceRow = [
      `Balance - ${result.familyName}`,
      "",
      result.netAmount.toFixed(2),
      "CAD",
      "",
      ...families.map((family) => (family.id === result.familyId ? "1" : "0")),
    ];
    csvContent += balanceRow.join(",") + "\n";
  });

  // Create download link
  const encodedUri = encodeURI(csvContent);
  const link = document.createElement("a");
  link.setAttribute("href", encodedUri);
  link.setAttribute("download", "trip_expenses.csv");
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

// Import data from CSV
export const importFromCSV = (
  csvText: string,
  families: Family[]
): { families: Family[]; activities: Activity[] } => {
  const lines = csvText.split("\n").filter((line) => line.trim());
  if (lines.length < 2) {
    throw new Error(
      "CSV file must have at least a header row and one data row"
    );
  }

  const headerLine = lines[0];
  const dataLines = lines.slice(1);

  // Parse header to find family columns
  const headers = headerLine.split(",").map((h) => h.trim());
  console.log("CSV Headers:", headers);

  // Find family columns (skip Activity, Date, Cost, Currency, Paid By)
  const familyColumns = headers.slice(5); // Start from index 5
  console.log("Family columns found:", familyColumns);

  // Create new families from CSV if they don't exist
  const newFamilies = [...families];
  familyColumns.forEach((familyName) => {
    if (familyName && !newFamilies.find((f) => f.name === familyName)) {
      console.log("Adding new family from CSV:", familyName);
      newFamilies.push({
        id: `family-${Date.now()}-${Math.random()}`,
        name: familyName,
      });
    }
  });

  // Parse activities
  const newActivities: Activity[] = [];

  dataLines.forEach((line, index) => {
    const values = line.split(",").map((v) => v.trim());
    console.log(`Processing line ${index + 1}:`, values);

    // Skip balance rows
    if (values[0] && values[0].toLowerCase().includes("balance")) {
      console.log(`Skipping balance row: ${values[0]}`);
      return;
    }

    // Skip empty rows
    if (!values[0] || values[0] === "") {
      console.log(`Skipping empty row`);
      return;
    }

    // Validate we have enough columns
    if (values.length < 5) {
      console.log(`Skipping row with insufficient columns: ${values.length}`);
      return;
    }

    const activityName = values[0];
    const dateStr = values[1];
    const costStr = values[2];
    const currency = (values[3] as "USD" | "CAD") || "CAD";
    const paidByName = values[4];

    // Parse date
    let activityDate: string;
    try {
      if (dateStr) {
        const parsedDate = new Date(dateStr);
        if (isNaN(parsedDate.getTime())) {
          throw new Error("Invalid date");
        }
        activityDate = parsedDate.toISOString();
      } else {
        activityDate = new Date().toISOString();
      }
    } catch (error) {
      console.log(
        `Invalid date format for activity "${activityName}", using current date`
      );
      activityDate = new Date().toISOString();
    }

    // Parse cost
    const cost = parseFloat(costStr);
    if (isNaN(cost) || cost < 0) {
      console.log(`Invalid cost for activity "${activityName}": ${costStr}`);
      return;
    }

    // Find or create paying family
    let paidByFamily = newFamilies.find((f) => f.name === paidByName);
    if (!paidByFamily && paidByName) {
      console.log(`Creating new family for payer: ${paidByName}`);
      paidByFamily = {
        id: `family-${Date.now()}-${Math.random()}`,
        name: paidByName,
      };
      newFamilies.push(paidByFamily);
    }

    if (!paidByFamily) {
      console.log(`No valid payer found for activity "${activityName}"`);
      return;
    }

    // Parse participants
    const participants: { familyId: string; count: number }[] = [];
    const participantValues = values.slice(5); // Start from index 5 for participant counts

    participantValues.forEach((countStr, participantIndex) => {
      const familyName = familyColumns[participantIndex];
      if (!familyName) return;

      const count = parseInt(countStr);
      if (!isNaN(count) && count > 0) {
        const family = newFamilies.find((f) => f.name === familyName);
        if (family) {
          participants.push({
            familyId: family.id,
            count: count,
          });
        }
      }
    });

    // Validate we have participants
    if (participants.length === 0) {
      console.log(`No valid participants found for activity "${activityName}"`);
      return;
    }

    // Create activity
    const activity: Activity = {
      id: `activity-${Date.now()}-${Math.random()}`,
      name: activityName,
      date: activityDate,
      cost: cost,
      currency: currency,
      paidBy: paidByFamily.id,
      participants: participants,
    };

    console.log(`Successfully imported activity: ${activityName}`);
    newActivities.push(activity);
  });

  console.log(`Import complete: ${newActivities.length} activities imported`);
  return { families: newFamilies, activities: newActivities };
};

// Calculate results for CSV export
const calculateResults = (families: Family[], activities: Activity[]) => {
  const results: {
    familyId: string;
    familyName: string;
    totalPaid: number;
    totalOwed: number;
    netAmount: number;
  }[] = [];

  families.forEach((family) => {
    let totalPaid = 0;
    let totalOwed = 0;

    activities.forEach((activity) => {
      // Amount paid by this family
      if (activity.paidBy === family.id) {
        totalPaid += convertToCAD(activity.cost, activity.currency);
      }

      // Amount owed by this family
      const participant = activity.participants.find(
        (p) => p.familyId === family.id
      );
      if (participant && participant.count > 0) {
        const totalParticipants = activity.participants.reduce(
          (sum, p) => sum + p.count,
          0
        );
        const share =
          (convertToCAD(activity.cost, activity.currency) * participant.count) /
          totalParticipants;
        totalOwed += share;
      }
    });

    results.push({
      familyId: family.id,
      familyName: family.name,
      totalPaid,
      totalOwed,
      netAmount: totalPaid - totalOwed,
    });
  });

  return results;
};
