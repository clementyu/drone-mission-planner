let latestReport = null;

exports.receiveReport = (req, res) => {
  latestReport = req.body;
  res.json({ success: true });
};

exports.getLatestReport = (req, res) => {
  if (!latestReport) {
    return res.status(404).json({ success: false, message: 'No report yet' });
  }
  res.json({ success: true, report: latestReport });
};
