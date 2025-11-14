const express = require('express');
const router = express.Router();
const {
  createStoryProject,
  getStoryProjects,
  updateStoryProject,
  deleteStoryProject,
  updatePageText,
  regeneratePageImage,
  uploadPageImage,
  addPage,
  deletePage,
  upscalePageImage,
  exportStoryAsPdf,
} = require('../controllers/storyProjectController');
const { protect } = require('../middleware/authMiddleware');
const upload = require('../middleware/upload');

// All project routes are protected
router.use(protect);

router.route('/')
  .post(createStoryProject)
  .get(getStoryProjects);

router.route('/:id')
  .put(updateStoryProject)
  .delete(deleteStoryProject);

router.route('/:id/pages/:pageId/text')
    .put(updatePageText);

router.route('/:id/pages/:pageId/image/regenerate')
    .post(regeneratePageImage);

router.route('/:id/pages/:pageId/image')
    .put(upload.single('image'), uploadPageImage);

router.route('/:id/pages')
    .post(addPage);

router.route('/:id/pages/:pageId')
    .delete(deletePage);

router.route('/:id/pages/:pageId/image/upscale')
    .post(upscalePageImage);

router.route('/:id/export/pdf')
    .post(exportStoryAsPdf);

module.exports = router;
