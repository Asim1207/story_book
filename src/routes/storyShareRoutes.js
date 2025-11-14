const express = require('express');
const router = express.Router();
const { updateShareSettings, getPublicStory } = require('../controllers/storyShareController');
const { protect } = require('../middleware/authMiddleware');

// Note: The public route is separate from the API routes

// API route for updating share settings
router.put('/projects/:id/share', protect, updateShareSettings);


// Public web route for viewing a shared story
const publicRouter = express.Router();
publicRouter.get('/share/:shareId', getPublicStory);

module.exports = {
    api: router,
    public: publicRouter
};
