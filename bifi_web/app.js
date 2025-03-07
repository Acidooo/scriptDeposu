/**
 * BIFI Excel Processing Tool
 * JavaScript implementation of okuma_bifi_reading_fast.py
 *
 * This script processes multiple Excel files containing BIFI data,
 * filters records by specified dates and types, and outputs the filtered data
 * to new Excel files for download.
 */

// DOM Elements
const fileInput = document.getElementById("excelFiles");
const fileList = document.getElementById("fileList");
const progressBar = document.getElementById("progressBar");
const progressStatus = document.getElementById("progressStatus");
const progressContainer = document.querySelector(".progress-container");
const uploadStatus = document.getElementById("uploadStatus");
const dateInput = document.getElementById("dateInput");
const processBtn = document.getElementById("processBtn");
const downloadJsonBtn = document.getElementById("downloadJsonBtn");
const processingStatus = document.getElementById("processingStatus");
const resultsInfo = document.getElementById("resultsInfo");
const downloadLinks = document.getElementById("downloadLinks");
const autoJsonDownload = document.getElementById("autoJsonDownload");
const fileCounter = document.getElementById("fileCounter");

// Global variables
let allData = []; // Will hold all the data from Excel files
let jsonData = null; // Will hold the JSON representation of all data
let worker = null; // Will hold the Web Worker

// Initialize the application
document.addEventListener("DOMContentLoaded", () => {
  initializeApp();
});

/**
 * Initialize the application
 */
function initializeApp() {
  // Set up event listeners
  fileInput.addEventListener("change", handleFileSelection);
  processBtn.addEventListener("click", processFiles);
  downloadJsonBtn.addEventListener("click", downloadJson);

  // Create a Web Worker for background processing
  createWorker();
}

/**
 * Create a Web Worker for background processing
 */
function createWorker() {
  // Create the worker using the external file
  worker = new Worker("worker.js");

  // Set up the message handler
  worker.onmessage = handleWorkerMessage;
}

/**
 * Handle file selection
 * @param {Event} event - The change event
 */
function handleFileSelection(event) {
  const files = event.target.files;

  if (files.length === 0) {
    return;
  }

  // Clear previous data
  allData = [];
  fileList.innerHTML = "";

  // Display the selected files
  for (let i = 0; i < files.length; i++) {
    const file = files[i];

    // Check if the file is an Excel file
    if (!file.name.endsWith(".xlsx")) {
      continue;
    }

    // Create a file item
    const fileItem = document.createElement("div");
    fileItem.className = "file-item";
    fileItem.textContent = file.name;
    fileList.appendChild(fileItem);
  }

  // Enable the process button
  processBtn.disabled = files.length === 0;

  // Show a message
  showStatus(uploadStatus, `${files.length} Excel dosyası seçildi.`, "info");
}

/**
 * Process the selected files
 */
function processFiles() {
  const files = fileInput.files;

  if (files.length === 0) {
    showStatus(processingStatus, "Dosya seçilmedi.", "error");
    return;
  }

  // Validate dates
  const datesInput = dateInput.value.trim();
  if (!datesInput) {
    showStatus(processingStatus, "Lütfen en az bir tarih girin.", "error");
    return;
  }

  const dates = datesInput.split(",").map((date) => date.trim());

  // Validate date format
  for (const date of dates) {
    if (!validateDateFormat(date)) {
      showStatus(
        processingStatus,
        `Geçersiz tarih formatı: ${date}. Lütfen GG.AA.YYYY formatını kullanın.`,
        "error"
      );
      return;
    }
  }

  // Get the selected option
  const option = document.querySelector(
    'input[name="readingType"]:checked'
  ).value;

  // Get the combine Excel option
  const combineExcel = document.getElementById("combineExcel").checked;

  // Show the progress container and initialize file counter
  progressContainer.style.display = "block";
  progressBar.style.width = "0%";
  progressStatus.textContent = "0%";
  updateFileCounter(0, files.length);

  // Disable the process button
  processBtn.disabled = true;

  // Show a processing message
  showStatus(
    processingStatus,
    `${files.length} dosya ${dates.length} tarih için işleniyor...`,
    "info"
  );

  // Clear previous results
  resultsInfo.style.display = "none";
  downloadLinks.innerHTML = "";

  // Process each file
  processFilesSequentially(files, 0, dates, option, combineExcel);
}

/**
 * Process files sequentially to avoid memory issues
 * @param {FileList} files - The files to process
 * @param {number} index - The current file index
 * @param {Array} dates - The dates to filter by
 * @param {string} option - The option to filter by
 * @param {boolean} combineExcel - Whether to combine all results
 */
function processFilesSequentially(files, index, dates, option, combineExcel) {
  if (index >= files.length) {
    console.log("All files processed. Starting data filtering...");
    // All files processed, now filter the data
    filterDataWithWorker(allData, dates, option, combineExcel);
    return;
  }

  const file = files[index];
  console.log("Reading file:", file.name);

  // Read the file
  const reader = new FileReader();

  reader.onload = function (e) {
    console.log("File read successfully:", file.name);
    // Process the file with the worker
    worker.postMessage({
      action: "processFile",
      data: {
        file: e.target.result,
        index: index,
        total: files.length,
        filename: file.name, // Pass the filename to extract ada name
      },
    });
  };

  reader.onerror = function () {
    console.error("Error reading file:", file.name);
    showStatus(processingStatus, `Error reading file: ${file.name}`, "error");
    // Continue with the next file
    processFilesSequentially(files, index + 1, dates, option, combineExcel);
  };

  // Read the file as an array buffer
  reader.readAsArrayBuffer(file);
}

/**
 * Filter data using the Web Worker
 * @param {Array} allData - All the data from Excel files
 * @param {Array} dates - The dates to filter by
 * @param {string} option - The option to filter by
 * @param {boolean} combineExcel - Whether to combine all results
 */
function filterDataWithWorker(allData, dates, option, combineExcel) {
  // Update status
  showStatus(processingStatus, "Filtering data...", "info");

  // Reset progress
  progressBar.style.width = "0%";
  progressStatus.textContent = "0%";

  // Send the data to the worker
  worker.postMessage({
    action: "filterData",
    data: {
      allData: allData,
      dates: dates,
      option: option,
      combineExcel: combineExcel,
    },
  });
}

/**
 * Handle messages from the Web Worker
 * @param {MessageEvent} event - The message event
 */
function handleWorkerMessage(event) {
  const message = event.data;
  console.log("Main thread received message:", message.status);

  switch (message.status) {
    case "chunkProcessed":
      // Update progress for chunk processing
      console.log("Chunk processed. Progress:", message.progress, "%");
      updateProgress(message.progress);
      updateFileCounter(message.index + 1, message.total);
      break;

    case "fileProcessed":
      console.log("File processed:", message.index);
      // Add the processed data to the allData array
      allData = allData.concat(message.data);

      // Store column names if this is the first file
      if (message.columnNames && message.index === 0) {
        window.originalColumnNames = message.columnNames;
        console.log(
          "Stored original column names:",
          window.originalColumnNames
        );
      }

      // Update progress and file counter
      updateProgress(message.progress);
      updateFileCounter(message.index + 1, message.total);

      // Continue with the next file
      processFilesSequentially(
        fileInput.files,
        message.index + 1,
        dateInput.value
          .trim()
          .split(",")
          .map((date) => date.trim()),
        document.querySelector('input[name="readingType"]:checked').value,
        document.getElementById("combineExcel").checked
      );
      break;

    case "warning":
      console.warn("Warning received:", message.message);
      // Display warning message
      showStatus(processingStatus, message.message, "info");
      break;

    case "error":
      console.error("Error received:", message.error);
      showStatus(processingStatus, `Error: ${message.error}`, "error");
      break;

    case "dateProcessed":
      console.log("Date processed:", message.date, "Count:", message.count);
      // Update progress for date processing
      updateProgress(message.progress);
      break;

    case "filterComplete":
      console.log("Filter complete. Results:", message.results);
      // Processing complete
      handleFilterComplete(message.results);
      break;
  }
}

/**
 * Handle filter complete
 * @param {Object} results - The filter results
 */
function handleFilterComplete(results) {
  // Update progress to 100%
  updateProgress(100);

  // Enable the process button
  processBtn.disabled = false;

  // Create JSON data
  jsonData = {
    allData: allData,
    filteredResults: results,
  };

  // Enable the download JSON button
  downloadJsonBtn.disabled = false;

  // Auto download JSON if requested
  if (autoJsonDownload.checked) {
    downloadJson();
  }

  // Show results info
  displayResults(results);
}

/**
 * Display the results
 * @param {Object} results - The filter results
 */
function displayResults(results) {
  // Clear previous results
  resultsInfo.innerHTML = "";
  downloadLinks.innerHTML = "";

  // Create a summary
  const summary = document.createElement("div");
  summary.innerHTML = `<h3>Özet</h3>
        <p>Toplam işlenen kayıt: ${allData.length}</p>`;

  // Add date results
  const dateResultsDiv = document.createElement("div");
  dateResultsDiv.innerHTML = "<h3>Tarih Sonuçları</h3>";

  const dateList = document.createElement("ul");

  for (const dateResult of results.dateResults) {
    const listItem = document.createElement("li");
    listItem.textContent = `${dateResult.date}: ${dateResult.count} kayıt`;
    dateList.appendChild(listItem);

    // Create download link for this date if there are records
    if (dateResult.count > 0) {
      createDownloadLink(dateResult.date, dateResult.data);
    }
  }

  dateResultsDiv.appendChild(dateList);

  // Add combined results if available
  if (results.combinedData && results.combinedData.length > 0) {
    const combinedDiv = document.createElement("div");
    combinedDiv.innerHTML = `<h3>Birleştirilmiş Sonuçlar</h3>
            <p>Toplam kayıt: ${results.combinedData.length}</p>`;

    // Create download link for combined data
    createDownloadLink("Combined", results.combinedData, true);

    resultsInfo.appendChild(combinedDiv);
  }

  // Add all elements to the results info
  resultsInfo.appendChild(summary);
  resultsInfo.appendChild(dateResultsDiv);

  // Show the results info
  resultsInfo.style.display = "block";

  // Show success message
  showStatus(
    processingStatus,
    "İşlem tamamlandı. Sonuçları aşağıdan indirebilirsiniz.",
    "success"
  );
}

/**
 * Create a download link for Excel data
 * @param {string} label - The label for the link
 * @param {Array} data - The data to include in the Excel file
 * @param {boolean} isCombined - Whether this is combined data
 */
function createDownloadLink(label, data, isCombined = false) {
  // Create the Excel file
  const processedData = data.map((row) => {
    // No need to format dates as they're already in the correct format
    return row;
  });

  // Create the worksheet with the original column order if available
  let worksheet;
  if (window.originalColumnNames && window.originalColumnNames.length > 0) {
    worksheet = XLSX.utils.json_to_sheet(processedData, {
      header: window.originalColumnNames,
    });
  } else {
    worksheet = XLSX.utils.json_to_sheet(processedData);
  }

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Tüm Adalar Okuma");

  // Generate the Excel file
  const excelBuffer = XLSX.write(workbook, { bookType: "xlsx", type: "array" });

  // Create a Blob from the buffer
  const blob = new Blob([excelBuffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });

  // Create a URL for the blob
  const url = URL.createObjectURL(blob);

  // Get the current date and time for the filename
  const now = new Date();
  const dateString = now.toISOString().replace(/[:.]/g, "-").slice(0, 19);

  // Create the filename
  const option = document.querySelector(
    'input[name="readingType"]:checked'
  ).value;
  const filename = isCombined
    ? `SCRIPT BIFI Combined(${option}) Birleştirilmiş Okuma Raporları_${dateString}.xlsx`
    : `SCRIPT BIFI ${label}(${option}) Tarihli Okuma Raporları_${dateString}.xlsx`;

  // Create the link
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.className = "download-link";
  link.textContent = `${isCombined ? "Birleştirilmiş" : label} Excel'i İndir`;

  // Add the link to the download links
  downloadLinks.appendChild(link);
}

/**
 * Download the JSON data
 */
function downloadJson() {
  if (!jsonData) {
    showStatus(processingStatus, "İndirilecek veri bulunamadı.", "error");
    return;
  }

  // Create a Blob from the JSON data
  const blob = new Blob([JSON.stringify(jsonData)], {
    type: "application/json",
  });

  // Create a URL for the blob
  const url = URL.createObjectURL(blob);

  // Get the current date and time for the filename
  const now = new Date();
  const dateString = now.toISOString().replace(/[:.]/g, "-").slice(0, 19);

  // Create the filename
  const filename = `BIFI_Data_${dateString}.json`;

  // Create the link
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;

  // Add the link to the document, click it, and remove it
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  // Show a success message
  showStatus(processingStatus, "JSON verisi indirildi.", "success");
}

/**
 * Update the progress bar and file counter
 * @param {number} percent - The progress percentage
 */
function updateProgress(percent) {
  progressBar.style.width = `${percent}%`;
  progressStatus.textContent = `${percent}%`;
}

/**
 * Update the file counter display
 * @param {number} current - The current file number
 * @param {number} total - The total number of files
 */
function updateFileCounter(current, total) {
  fileCounter.textContent = `Dosya: ${current}/${total}`;
  fileCounter.style.display = total > 0 ? "block" : "none";
}

/**
 * Show a status message
 * @param {HTMLElement} element - The element to show the status in
 * @param {string} message - The message to show
 * @param {string} type - The type of message (info, success, error)
 */
function showStatus(element, message, type) {
  element.textContent = message;
  element.className = `status ${type}`;
  element.style.display = "block";
}

/**
 * Validate that a date string has the format dd.mm.yyyy and represents a valid date
 * @param {string} dateStr - The date string to validate
 * @returns {boolean} - True if the date is valid, false otherwise
 */
function validateDateFormat(dateStr) {
  // Check if the string matches the pattern dd.mm.yyyy
  const pattern = /^\d{2}\.\d{2}\.\d{4}$/;
  if (!pattern.test(dateStr)) {
    return false;
  }

  // Further validate the date is real (not like 31.02.2024)
  try {
    const [day, month, year] = dateStr.split(".").map(Number);
    const date = new Date(year, month - 1, day);
    return (
      date.getDate() === day &&
      date.getMonth() === month - 1 &&
      date.getFullYear() === year
    );
  } catch (error) {
    return false;
  }
}
