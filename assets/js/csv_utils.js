(() => {
  const escapeCsvValue = (value) => {
    if (value === null || value === undefined) return "";
    const str = String(value);
    if (/[",\n]/.test(str)) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  };

  const csvRow = (values) => values.map((v) => escapeCsvValue(v)).join(",");

  const addBom = (text) => (text && text.startsWith("\ufeff") ? text : `\ufeff${text || ""}`);

  const sanitizeFilenameSegment = (value) =>
    (value || "")
      .toString()
      .trim()
      .replace(/[^\w.-]+/g, "_");

  const base64ToUint8 = (b64) => {
    const binary = atob(b64);
    const len = binary.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) bytes[i] = binary.charCodeAt(i);
    return bytes;
  };

  const downloadCsv = (filename, csvText) => {
    const blob = new Blob([addBom(csvText)], {
      type: "text/csv;charset=utf-8;",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  window.CSV_UTILS = {
    escapeCsvValue,
    csvRow,
    addBom,
    sanitizeFilenameSegment,
    base64ToUint8,
    downloadCsv,
  };
})();
