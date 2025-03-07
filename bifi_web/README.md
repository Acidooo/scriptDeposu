# BIFI Excel Processing Tool

This is a JavaScript web application that processes BIFI Excel files, filters records by specified dates and types, and outputs the filtered data to new Excel files for download. It's a web-based implementation of the `okuma_bifi_reading_fast.py` Python script.

## Features

- Upload and process multiple Excel files (up to 70 files, total size up to 80MB)
- Filter data by dates and reading types (Current, End of Month, or All)
- Combine results into a single Excel file or generate separate files for each date
- Download processed data as Excel files
- Download all data as a JSON file
- Background processing using Web Workers to keep the UI responsive
- Progress tracking for file processing and data filtering

## How to Use

1. **Upload Excel Files**

   - Click the "Select Excel Files" button to choose Excel files for processing
   - You can select multiple files at once (up to 70 files)
   - Only files with the `.xlsx` extension are supported

2. **Set Filter Options**

   - Enter dates in the format `DD.MM.YYYY` (e.g., `30.01.2024,31.01.2024`)
   - Select a reading type:
     - **Current**: Only include records with reading type "Current"
     - **End of Month**: Only include records with reading type "EndOfMonth"
     - **All**: Include all records regardless of reading type
   - Choose whether to combine all results into a single Excel file
   - Optionally enable automatic JSON download after processing

3. **Process Files**

   - Click the "Process Files" button to start processing
   - The progress bar will show the current progress
   - Processing happens in the background, so the UI remains responsive

4. **Download Results**
   - After processing is complete, download links for Excel files will appear
   - You can also download all data as a JSON file by clicking the "Download JSON Data" button

## Technical Details

- The application uses the [SheetJS](https://sheetjs.com/) library to read and write Excel files
- Web Workers are used for background processing to keep the UI responsive
- The application runs entirely in the browser - no server-side processing is required
- All data processing happens locally on your computer - no data is sent to any server

## Deployment

This application can be deployed on GitHub Pages or any other static web hosting service. Simply upload the HTML, CSS, and JavaScript files to your hosting service.

## Browser Compatibility

This application works best in modern browsers such as:

- Google Chrome (recommended)
- Mozilla Firefox
- Microsoft Edge
- Safari

## Performance Considerations

- Processing large Excel files can be memory-intensive
- For best performance, use a computer with at least 8GB of RAM
- If you experience performance issues, try processing fewer files at once

## License

This project is open source and available under the MIT License.
