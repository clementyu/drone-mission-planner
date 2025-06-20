const fileInput = document.getElementById('fileInput');
const statusEl = document.getElementById('status');

fileInput.addEventListener('change', async (e) => {
  const file = e.target.files[0];
  if (!file) return;
  statusEl.textContent = 'Uploading...';
  const formData = new FormData();
  formData.append('missionFile', file);

  try {
    const res = await fetch('/api/files/process', {
      method: 'POST',
      body: formData
    });

    if (!res.ok) {
      statusEl.textContent = 'Failed to process file';
      return;
    }

    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'processed.kml';
    a.click();
    URL.revokeObjectURL(url);
    statusEl.textContent = 'Download started';
  } catch (err) {
    statusEl.textContent = 'Error uploading file';
  }
});
