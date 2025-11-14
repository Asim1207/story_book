const express = require('express');
const mongoose = require('mongoose');
const dotenv = require('dotenv');

dotenv.config();

const app = express();
const port = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static('public'));

mongoose.connect(process.env.MONGODB_URI)
.then(() => {
  console.log('Connected to MongoDB');
})
.catch((error) => {
  console.error('Error connecting to MongoDB:', error);
});

app.get('/', (req, res) => {
  res.send('Hello, World!');
});

const userRoutes = require('./src/routes/userRoutes');
app.use('/api/users', userRoutes);

const storyRoutes = require('./src/routes/storyRoutes');
app.use('/api/stories', storyRoutes);

const storyProjectRoutes = require('./src/routes/storyProjectRoutes');
app.use('/api/projects', storyProjectRoutes);

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
