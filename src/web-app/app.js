// Every 5s, ask NodeJS if Python has sent back a report:
setInterval(async () => {
  try {
    const res = await fetch('/api/files/report/latest');
    if (!res.ok) return;
    const { report } = await res.json();
    // Display it (you can tweak this to fit your UI)
    document.getElementById('upload-message').textContent =
      `Read ${report.filename} (${report.sizeBytes} bytes). Preview (hex): ${report.preview}`;
  } catch (e) {
    console.error('Error fetching report:', e);
  }
}, 5000);
