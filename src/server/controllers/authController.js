exports.login = (req, res) => {
    const { username, password } = req.body;
    // Dummy authentication for demonstration
    if (username === 'user' && password === 'password') {
      res.json({ success: true, message: 'Login successful' });
    } else {
      res.status(401).json({ success: false, message: 'Invalid credentials' });
    }
  };
  