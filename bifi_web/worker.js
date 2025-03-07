// Web Worker for processing Excel files

// Import the required libraries
importScripts(
  "https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js"
);

// Expected column names in the Excel files
const EXPECTED_COLUMNS = [
  "Property no",
  "Reading date",
  "Device serial no",
  "Reading value",
  "Reading type",
  "Reading medium",
];

// Global variable to store column names from the first file
let originalColumnNames = null;

// Handle messages from the main thread
self.onmessage = function (e) {
  const { action, data } = e.data;
  console.log("Worker received action:", action);

  switch (action) {
    case "processFile":
      console.log("Processing file:", data.filename);
      processExcelFile(data.file, data.index, data.total, data.filename);
      break;
    case "filterData":
      console.log("Filtering data for dates:", data.dates);
      filterData(data.allData, data.dates, data.option, data.combineExcel);
      break;
    default:
      console.error("Unknown action:", action);
      self.postMessage({ error: "Unknown action" });
  }
};

/**
 * Process a single Excel file
 * @param {ArrayBuffer} fileData - The file data as ArrayBuffer
 * @param {number} index - The index of the current file
 * @param {number} total - The total number of files
 * @param {string} filename - The name of the file being processed
 */
function processExcelFile(fileData, index, total, filename) {
  try {
    console.log("Reading Excel file:", filename);
    // Read the Excel file without parsing dates
    const workbook = XLSX.read(fileData, {
      type: "array",
      cellDates: false, // Don't parse dates
      cellNF: false,
      cellText: false,
    });
    const firstSheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[firstSheetName];

    // Get the range of the worksheet
    const range = XLSX.utils.decode_range(worksheet["!ref"]);
    const totalRows = range.e.r - range.s.r + 1;
    console.log("Total rows in file:", totalRows);

    // Extract ada name from filename
    const adaIsmi = filename.includes("_") ? filename.split("_")[0] : "";

    // Store column names from the first row if this is the first file
    if (index === 0) {
      originalColumnNames = [];
      for (let C = range.s.c; C <= range.e.c; C++) {
        const cellAddress = XLSX.utils.encode_cell({ r: range.s.r, c: C });
        const cell = worksheet[cellAddress];
        if (cell && cell.v) {
          originalColumnNames.push(cell.v);
        }
      }
      console.log("Original column names:", originalColumnNames);

      // Verify expected columns
      const missingColumns = EXPECTED_COLUMNS.filter(
        (col) => !originalColumnNames.includes(col)
      );
      if (missingColumns.length > 0) {
        console.warn("Eksik sütunlar:", missingColumns);
        self.postMessage({
          status: "warning",
          message: `Uyarı: Eksik sütunlar bulundu: ${missingColumns.join(
            ", "
          )}`,
        });
      }
    }

    // Create a column index map for faster access
    const columnIndices = {};
    originalColumnNames.forEach((name, index) => {
      columnIndices[name] = index;
    });

    // Process the data in larger chunks
    const chunkSize = 5000;
    let processedRows = [];

    // Process rows in chunks
    for (
      let startRow = range.s.r + 1;
      startRow <= range.e.r;
      startRow += chunkSize
    ) {
      const endRow = Math.min(startRow + chunkSize - 1, range.e.r);
      const chunkData = [];

      for (let R = startRow; R <= endRow; R++) {
        const row = {};
        let hasData = false;

        // Read each column using the column indices
        for (const colName of EXPECTED_COLUMNS) {
          const C = columnIndices[colName];
          if (C !== undefined) {
            const cell = worksheet[XLSX.utils.encode_cell({ r: R, c: C })];
            if (cell) {
              hasData = true;
              // For Reading date, ensure it's in DD.MM.YYYY format
              if (colName === "Reading date" && cell.v) {
                // Excel date serial number to DD.MM.YYYY
                let dateStr = cell.w || cell.v; // Use formatted string if available
                if (typeof dateStr === "number") {
                  // Convert Excel serial date to JS Date
                  const date = new Date((dateStr - 25569) * 86400 * 1000);
                  dateStr = [
                    String(date.getDate()).padStart(2, "0"),
                    String(date.getMonth() + 1).padStart(2, "0"),
                    date.getFullYear(),
                  ].join(".");
                } else if (typeof dateStr === "string") {
                  // Try to parse the date string
                  const parts = dateStr.split(/[-/.]/);
                  if (parts.length === 3) {
                    // Assume the format is either DD.MM.YYYY or YYYY-MM-DD
                    if (parts[0].length === 4) {
                      // YYYY-MM-DD format
                      dateStr = [
                        parts[2].padStart(2, "0"),
                        parts[1].padStart(2, "0"),
                        parts[0],
                      ].join(".");
                    } else {
                      // DD.MM.YYYY format - ensure padding
                      dateStr = [
                        parts[0].padStart(2, "0"),
                        parts[1].padStart(2, "0"),
                        parts[2],
                      ].join(".");
                    }
                  }
                }
                row[colName] = dateStr;
              } else {
                row[colName] = cell.v;
              }
            } else {
              row[colName] = "";
            }
          }
        }

        // Only add rows that have data
        if (hasData) {
          // Set Ada İsmi if it's missing
          if (adaIsmi && (!row["Property no"] || row["Property no"] === "")) {
            row["Property no"] = adaIsmi;
          }

          chunkData.push(row);
        }
      }

      // Add chunk data to processed rows
      processedRows = processedRows.concat(chunkData);

      // Report progress
      const progress = Math.round(((startRow - range.s.r) / totalRows) * 100);
      console.log(
        "Chunk progress:",
        progress,
        "%",
        "Rows processed:",
        chunkData.length
      );
      self.postMessage({
        status: "chunkProcessed",
        progress: progress,
        index: index,
        total: total,
      });
    }

    console.log(
      "File processed:",
      filename,
      "Total processed rows:",
      processedRows.length
    );
    self.postMessage({
      status: "fileProcessed",
      data: processedRows,
      columnNames: originalColumnNames,
      progress: 100,
      index: index,
      total: total,
    });
  } catch (error) {
    console.error("Error processing file:", filename, error);
    self.postMessage({
      status: "error",
      error: error.message,
      index: index,
    });
  }
}

/**
 * Filter the data based on dates and options
 * @param {Array} allData - All the data from Excel files
 * @param {Array} dates - The dates to filter by
 * @param {string} option - The option to filter by (c, e, a)
 * @param {boolean} combineExcel - Whether to combine all results into a single Excel file
 */
function filterData(allData, dates, option, combineExcel) {
  try {
    console.log("Starting data filtering...");
    console.log("Searching for dates:", dates);

    const results = {
      dateResults: [],
      combinedData: combineExcel ? [] : null,
    };

    // Process each date
    for (let i = 0; i < dates.length; i++) {
      const date = dates[i];
      console.log("Processing date:", date);

      // Direct string comparison with Reading date
      let dateData = allData.filter((row) => row["Reading date"] === date);
      console.log("Date data count:", dateData.length);

      // Apply option filter based on "Reading type" column
      if (option === "c") {
        dateData = dateData.filter((row) => row["Reading type"] === "Current");
      } else if (option === "e") {
        dateData = dateData.filter(
          (row) => row["Reading type"] === "EndOfMonth"
        );
      }
      console.log("Filtered date data count:", dateData.length);

      // Add to results
      results.dateResults.push({
        date: date,
        data: dateData,
        count: dateData.length,
      });

      // Add to combined data if requested
      if (combineExcel && dateData.length > 0) {
        const dataWithDate = dateData.map((row) => ({
          ...row,
          "İşlenen Tarih": date,
        }));
        results.combinedData.push(...dataWithDate);
      }

      // Report progress
      const progress = Math.round(((i + 1) / dates.length) * 100);
      console.log("Date processing progress:", progress, "%");
      self.postMessage({
        status: "dateProcessed",
        date: date,
        count: dateData.length,
        progress: progress,
        index: i,
        total: dates.length,
      });
    }

    console.log(
      "Data filtering complete. Total dates processed:",
      dates.length
    );
    self.postMessage({
      status: "filterComplete",
      results: results,
    });
  } catch (error) {
    console.error("Error during data filtering:", error);
    self.postMessage({
      status: "error",
      error: error.message,
    });
  }
}
