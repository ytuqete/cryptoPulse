const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const User = require('./models/User');

dotenv.config();
const app = express();
app.use(cors());
app.use(express.json());

mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('DeFi Analytics Backend Connected'))
  .catch(err => console.error(' DB Error:', err));


app.post('/api/auth/register', async (req, res) => {
  try {
    const { email, password } = req.body;
    const existingUser = await User.findOne({ email });
    if (existingUser) return res.status(400).json({ error: "EMAIL ALREADY EXISTS" });
    const newUser = new User({ email, password });
    await newUser.save();
    res.status(201).json({ message: "CREATED" });
  } catch (err) { res.status(500).json({ error: "FAILED" }); }
});

app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });
    if (!user) return res.status(400).json({ error: "USER NOT FOUND" });
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(400).json({ error: "WRONG PASSWORD" });
    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: '1d' });
    res.json({ token, email });
  } catch (err) { res.status(500).json({ error: "SERVER ERROR" }); }
});


app.get('/api/watchlist/:email', async (req, res) => {
  try {
    const user = await User.findOne({ email: req.params.email });
    res.json(user ? user.watchlist : []);
  } catch (err) { res.status(500).send(err); }
});

app.post('/api/watchlist/toggle', async (req, res) => {
  const { email, coinId } = req.body;
  try {
    const user = await User.findOne({ email });
    if (user.watchlist.includes(coinId)) {
      user.watchlist = user.watchlist.filter(id => id !== coinId);
    } else {
      user.watchlist.push(coinId);
    }
    await user.save();
    res.json(user.watchlist);
  } catch (err) { res.status(500).send(err); }
});

app.listen(5000, () => console.log(` Terminal running on port 5000`));