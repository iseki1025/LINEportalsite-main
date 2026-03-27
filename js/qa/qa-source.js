window.QA_SOURCE = Object.freeze({
    // Google Sheets "export as CSV" URL for the shared Q&A source.
    // If the sheet is private or restricted, the site will fall back to local CSV / embedded data.
    sheetId: '1H6TlQyKXNCnzUAB7C0YsrJzwWDiPAsNAl2axjYZ-xyE',
    gid: '0'
});

window.QA_SOURCE_URLS = Object.freeze({
    remoteCsvUrl: `https://docs.google.com/spreadsheets/d/1H6TlQyKXNCnzUAB7C0YsrJzwWDiPAsNAl2axjYZ-xyE/export?format=csv&gid=0`,
    localCsvUrl: 'files/data/qa-data.csv'
});
