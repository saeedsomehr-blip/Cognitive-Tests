(() => {
  const buildZip = async ({ baseName, humanWb, machineCsv }) => {
    const zip = new JSZip();
    if (humanWb) {
      const humanArray = XLSX.write(humanWb, { bookType: "xlsx", type: "array" });
      zip.file(`${baseName}_human.xlsx`, humanArray);
    }
    if (machineCsv != null) {
      zip.file(`${baseName}_machine.csv`, CSV_UTILS.addBom(machineCsv));
    }
    return zip.generateAsync({ type: "blob" });
  };

  window.ZIP_HELPER = { buildZip };
})();
