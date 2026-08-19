const XLSX = require("xlsx");

/**
 * Convert Excel buffer to JSON
 */
const readExcel = (buffer) => {
  const workbook = XLSX.read(buffer, { type: "buffer" });

  const sheetName = workbook.SheetNames[0];

  const worksheet = workbook.Sheets[sheetName];

  return XLSX.utils.sheet_to_json(worksheet, {
    defval: "",
  });
};

/**
 * Convert JSON data to Excel buffer
 */
const writeExcel = (data, sheetName = "Customers") => {
  const workbook = XLSX.utils.book_new();

  const worksheet = XLSX.utils.json_to_sheet(data);

  XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);

  return XLSX.write(workbook, {
    type: "buffer",
    bookType: "xlsx",
  });
};

module.exports = {
  readExcel,
  writeExcel,
};