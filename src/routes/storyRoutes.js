const express = require('express');
const router = express.Router();
const { createStory, getStoryStatus } = require('../controllers/storyController');
const { protect } = require('../middleware/authMiddleware');

// All story routes are protected
router.use(protect);

router.post('/', createStory);
router.get('/status/:jobId', getStoryStatus);

module.exports = router;
