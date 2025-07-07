import { Family, Activity } from "./types";

// Convert USD to CAD
const convertToCAD = (amount: number, currency: "USD" | "CAD") => {
  if (currency === "USD") {
    return amount * 1.35; // 1 USD = 1.35 CAD
  }
  return amount;
};

// Parse CSV line properly handling quoted values with commas
const parseCSVLine = (line: string): string[] => {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];

    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === "," && !inQuotes) {
      result.push(current.trim());
      current = "";
    } else {
      current += char;
    }
  }

  // Add the last field
  result.push(current.trim());

  // Remove quotes from all values
  return result.map((value) => value.replace(/^"|"$/g, ""));
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

// Export JSON data to CSV format
export const exportToCSV = (families: Family[], activities: Activity[]) => {
  if (families.length === 0 || activities.length === 0) {
    throw new Error("No data to export. Add families and activities first.");
  }

  // Calculate results for balance row
  const results = calculateResults(families, activities);

  // Create CSV content
  let csvContent = "data:text/csv;charset=utf-8,";

  // Add balance row
  const balanceRow = ["Balance:"];
  families.forEach(() => balanceRow.push("")); // Empty cells for Date, Description, Currency, Amount, Paid By
  families.forEach((family) => {
    const result = results.find((r) => r.familyId === family.id);
    if (result) {
      const sign = result.netAmount >= 0 ? "" : "-";
      const amount = Math.abs(result.netAmount).toFixed(2);
      balanceRow.push(family.name, `${sign}$${amount}`);
    } else {
      balanceRow.push(family.name, "$0.00");
    }
  });
  balanceRow.push("", "", "", "Instructions:");
  csvContent += balanceRow.join(",") + "\n";

  // Add main headers
  const headers = ["Date", "Description", "Currency", "Amount", "Paid By"];
  families.forEach((family) => {
    headers.push(family.name, ""); // Name and empty cell for share
  });
  headers.push("Amount in CAD", "Total Beneficiaries", "", "");
  csvContent += headers.join(",") + "\n";

  // Add sub-headers
  const subHeaders = ["", "", "", "", ""];
  families.forEach(() => {
    subHeaders.push("People", "Share");
  });
  subHeaders.push("", "", "", "");
  csvContent += subHeaders.join(",") + "\n";

  // Add activities
  activities.forEach((activity) => {
    const paidByFamily = families.find((f) => f.id === activity.paidBy);
    const totalParticipants = activity.participants.reduce(
      (sum, p) => sum + p.count,
      0
    );
    const amountInCAD = convertToCAD(activity.cost, activity.currency);

    const row = [
      new Date(activity.date).toISOString().split("T")[0], // Format as YYYY-MM-DD
      activity.name,
      activity.currency,
      activity.cost.toFixed(2),
      paidByFamily?.name || "",
    ];

    // Add participant data for each family
    families.forEach((family) => {
      const participant = activity.participants.find(
        (p) => p.familyId === family.id
      );
      const count = participant ? participant.count : 0;
      const share =
        totalParticipants > 0 ? (amountInCAD * count) / totalParticipants : 0;

      row.push(count.toString(), share.toFixed(2));
    });

    row.push(amountInCAD.toFixed(2), totalParticipants.toString(), "", "");
    csvContent += row.join(",") + "\n";
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

// Import CSV data to JSON format
export const importFromCSV = (
  csvText: string
): { families: Family[]; activities: Activity[] } => {
  const lines = csvText.split("\n").filter((line) => line.trim());
  if (lines.length < 3) {
    throw new Error(
      "CSV file must have at least balance row, header row, and sub-header row"
    );
  }

  // Skip the balance row (row 0) and get headers (row 1) and sub-headers (row 2)
  const headerLine = lines[1];
  const subHeaderLine = lines[2];
  const dataLines = lines.slice(3);

  // Parse headers to find family names
  const headers = parseCSVLine(headerLine);
  const subHeaders = parseCSVLine(subHeaderLine);

  console.log("CSV Headers:", headers);
  console.log("CSV Sub-headers:", subHeaders);

  // Extract family names from headers (skip Date, Description, Currency, Amount, Paid By)
  const familyNames: string[] = [];
  for (let i = 5; i < headers.length - 3; i += 2) {
    // Skip Amount in CAD, Total Beneficiaries, and empty columns
    const familyName = headers[i];
    if (familyName && familyName.trim() !== "") {
      familyNames.push(familyName.trim());
    }
  }

  console.log("Family names found:", familyNames);

  if (familyNames.length === 0) {
    throw new Error("No family names found in CSV headers");
  }

  // Create families
  const families: Family[] = familyNames.map((name, index) => ({
    id: `family-${Date.now()}-${index}`,
    name: name,
  }));

  // Parse activities
  const activities: Activity[] = [];

  dataLines.forEach((line, index) => {
    // Proper CSV parsing that handles quoted values with commas
    const values = parseCSVLine(line);
    console.log(`Processing line ${index + 1}:`, values);

    // Skip empty rows or rows with insufficient data
    if (values.length < 5 || !values[0] || values[0] === "") {
      console.log(`Skipping empty or invalid row`);
      return;
    }

    const dateStr = values[0];
    const description = values[1];
    const currency = (values[2] as "USD" | "CAD") || "CAD";
    const costStr = values[3];
    const paidByName = values[4];

    console.log(
      `Parsing activity: "${description}" - Cost: "${costStr}" - Currency: "${currency}"`
    );

    // Skip if missing essential data
    if (!description || !costStr || !paidByName) {
      console.log(`Skipping row with missing essential data`);
      return;
    }

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
        `Invalid date format for activity "${description}", using current date`
      );
      activityDate = new Date().toISOString();
    }

    // Parse cost - handle commas and dollar signs
    const cleanCostStr = costStr.replace(/[$,]/g, "");
    const cost = parseFloat(cleanCostStr);
    if (isNaN(cost) || cost < 0) {
      console.log(
        `Invalid cost for activity "${description}": ${costStr} (cleaned: ${cleanCostStr})`
      );
      return;
    }

    // Find or create paying family
    let paidByFamily = families.find((f) => f.name === paidByName);
    if (!paidByFamily && paidByName) {
      console.log(`Creating new family for payer: ${paidByName}`);
      paidByFamily = {
        id: `family-${Date.now()}-${Math.random()}`,
        name: paidByName,
      };
      families.push(paidByFamily);
    }

    if (!paidByFamily) {
      console.log(`No valid payer found for activity "${description}"`);
      return;
    }

    // Parse participants from the family columns
    const participants: { familyId: string; count: number }[] = [];

    // Start from index 5 (after Date, Description, Currency, Amount, Paid By)
    // Each family has 2 columns: People, Share
    for (let i = 0; i < familyNames.length; i++) {
      const peopleIndex = 5 + i * 2; // People column for this family

      if (peopleIndex < values.length) {
        const countStr = values[peopleIndex];
        const count = parseInt(countStr);

        if (!isNaN(count) && count > 0) {
          const family = families.find((f) => f.name === familyNames[i]);
          if (family) {
            participants.push({
              familyId: family.id,
              count: count,
            });
          }
        }
      }
    }

    // Validate we have participants
    if (participants.length === 0) {
      console.log(`No valid participants found for activity "${description}"`);
      return;
    }

    // Create activity
    const activity: Activity = {
      id: `activity-${Date.now()}-${Math.random()}`,
      name: description,
      date: activityDate,
      cost: cost,
      currency: currency,
      paidBy: paidByFamily.id,
      participants: participants,
    };

    console.log(`Successfully imported activity: ${description}`);
    activities.push(activity);
  });

  console.log(
    `Import complete: ${families.length} families and ${activities.length} activities imported`
  );
  return { families, activities };
};
