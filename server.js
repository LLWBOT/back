require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const cors = require('cors');
const fetch = require('node-fetch');

const app = express();
const port = process.env.PORT || 3001;

const corsOptions = {
  origin: 'https://exampleofty.netlify.app',
  methods: 'POST',
  allowedHeaders: 'Content-Type',
};
app.use(cors(corsOptions));
app.use(bodyParser.json());

mongoose.connect(process.env.MONGODB_URI, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => console.log('Connected to MongoDB'))
  .catch(err => console.error('Could not connect to MongoDB', err));

const UserSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true }
});

const User = mongoose.model('User', UserSchema);

app.post('/api/signup', async (req, res) => {
  const { email, password, recaptchaResponse } = req.body;

  if (!email || !password || !recaptchaResponse) {
    return res.status(400).json({ message: 'Please provide all information, including the captcha.' });
  }

  try {
    const verificationUrl = `https://www.google.com/recaptcha/api/siteverify?secret=${process.env.RECAPTCHA_SECRET_KEY}&response=${recaptchaResponse}`;
    const verificationResponse = await fetch(verificationUrl, { method: 'POST' });
    const verificationData = await verificationResponse.json();

    if (!verificationData.success) {
      return res.status(400).json({ message: 'Invalid captcha.' });
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(409).json({ message: 'Email already exists.' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = new User({ email, password: hashedPassword });
    await newUser.save();

    res.status(201).json({ message: 'User created successfully!' });
  } catch (error) {
    console.error('Signup error:', error);
    res.status(500).json({ message: 'Error creating user.' });
  }
});

app.listen(port, () => {
  console.log(`Server listening on port ${port}`);
});
