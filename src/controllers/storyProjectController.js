const StoryProject = require('../models/StoryProject');
const StoryVersion = require('../models/StoryVersion');

// @desc    Create a new story project
// @route   POST /api/projects
// @access  Private
const createStoryProject = async (req, res) => {
  const { title, authorName } = req.body;
  if (!title || !authorName) {
    return res.status(400).json({ message: 'Title and Author Name are required.' });
  }

  try {
    const project = new StoryProject({
      title,
      authorName,
      owner: req.user._id,
      pages: [], // Start with an empty story
    });

    const createdProject = await project.save();
    res.status(201).json(createdProject);
  } catch (error) {
    res.status(500).json({ message: 'Server Error: ' + error.message });
  }
};

// @desc    Get a user's story projects
// @route   GET /api/projects
// @access  Private
const getStoryProjects = async (req, res) => {
  try {
    const projects = await StoryProject.find({ owner: req.user._id });
    res.json(projects);
  } catch (error) {
    res.status(500).json({ message: 'Server Error: ' + error.message });
  }
};

// @desc    Update a story project
// @route   PUT /api/projects/:id
// @access  Private
const updateStoryProject = async (req, res) => {
  const { title, authorName, pages, coverImageFilename } = req.body;

  try {
    const project = await StoryProject.findById(req.params.id);

    if (!project) {
      return res.status(404).json({ message: 'Project not found.' });
    }

    // Check ownership
    if (project.owner.toString() !== req.user._id.toString()) {
      return res.status(401).json({ message: 'Not authorized.' });
    }

    // Versioning for premium users ('Author' or 'Admin')
    if (req.user.role === 'Author' || req.user.role === 'Admin') {
      await StoryVersion.create({
        storyProject: project._id,
        title: project.title,
        authorName: project.authorName,
        pages: project.pages,
        coverImageFilename: project.coverImageFilename,
      });
    }

    project.title = title || project.title;
    project.authorName = authorName || project.authorName;
    project.pages = pages || project.pages;
    project.coverImageFilename = coverImageFilename || project.coverImageFilename;

    const updatedProject = await project.save();
    res.json(updatedProject);
  } catch (error) {
    res.status(500).json({ message: 'Server Error: ' + error.message });
  }
};

// @desc    Delete a story project
// @route   DELETE /api/projects/:id
// @access  Private
const deleteStoryProject = async (req, res) => {
    try {
        const project = await StoryProject.findById(req.params.id);

        if (!project) {
            return res.status(404).json({ message: 'Project not found' });
        }

        if (project.owner.toString() !== req.user._id.toString()) {
            return res.status(401).json({ message: 'User not authorized' });
        }

        await project.remove();
        // Also delete version history
        await StoryVersion.deleteMany({ storyProject: req.params.id });

        res.json({ message: 'Project removed' });
    } catch (error) {
        res.status(500).json({ message: 'Server Error: ' + error.message });
    }
};


// @desc    Update a single page's text
// @route   PUT /api/projects/:id/pages/:pageId
// @access  Private
const updatePageText = async (req, res) => {
    const { text } = req.body;
    if (typeof text !== 'string') {
        return res.status(400).json({ message: 'Text content is required.' });
    }

    try {
        const project = await StoryProject.findById(req.params.id);
        if (!project) {
            return res.status(404).json({ message: 'Project not found.' });
        }
        if (project.owner.toString() !== req.user._id.toString()) {
            return res.status(401).json({ message: 'Not authorized.' });
        }

        const page = project.pages.id(req.params.pageId);
        if (!page) {
            return res.status(404).json({ message: 'Page not found.' });
        }

        page.text = text;
        await project.save();
        res.json(project);
    } catch (error) {
        res.status(500).json({ message: 'Server Error: ' + error.message });
    }
};

const aiService = require('../services/aiService');

// @desc    Regenerate an image for a specific page
// @route   POST /api/projects/:id/pages/:pageId/image/regenerate
// @access  Private
const regeneratePageImage = async (req, res) => {
    try {
        const project = await StoryProject.findById(req.params.id);
        if (!project) {
            return res.status(404).json({ message: 'Project not found.' });
        }
        if (project.owner.toString() !== req.user._id.toString()) {
            return res.status(401).json({ message: 'Not authorized.' });
        }

        const page = project.pages.id(req.params.pageId);
        if (!page) {
            return res.status(404).json({ message: 'Page not found.' });
        }

        // Use the page text to generate a new image
        const newImageFilename = await aiService.generateImageFromText(page.text);

        // TODO: Optionally delete the old image from GCS to save space

        page.imageFilename = newImageFilename;
        await project.save();
        res.json(project);
    } catch (error) {
        res.status(500).json({ message: 'Server Error: ' + error.message });
    }
};

// @desc    Upload an image for a specific page
// @route   PUT /api/projects/:id/pages/:pageId/image
// @access  Private
const uploadPageImage = async (req, res) => {
    try {
        const project = await StoryProject.findById(req.params.id);
        if (!project) {
            return res.status(404).json({ message: 'Project not found.' });
        }
        if (project.owner.toString() !== req.user._id.toString()) {
            return res.status(401).json({ message: 'Not authorized.' });
        }

        const page = project.pages.id(req.params.pageId);
        if (!page) {
            return res.status(404).json({ message: 'Page not found.' });
        }

        if (!req.file) {
            return res.status(400).json({ message: 'Please upload a file.' });
        }

        // TODO: Optionally delete the old image from GCS

        page.imageFilename = req.file.filename;
        await project.save();
        res.json(project);
    } catch (error) {
        res.status(500).json({ message: 'Server Error: ' + error.message });
    }
};

// @desc    Add a page to a story project
// @route   POST /api/projects/:id/pages
// @access  Private
const addPage = async (req, res) => {
    const { text, imageFilename } = req.body;
    if (!text || !imageFilename) {
        return res.status(400).json({ message: 'Text and image filename are required.' });
    }

    try {
        const project = await StoryProject.findById(req.params.id);
        if (!project) {
            return res.status(404).json({ message: 'Project not found.' });
        }
        if (project.owner.toString() !== req.user._id.toString()) {
            return res.status(401).json({ message: 'Not authorized.' });
        }

        project.pages.push({ text, imageFilename });
        await project.save();
        res.status(201).json(project);
    } catch (error) {
        res.status(500).json({ message: 'Server Error: ' + error.message });
    }
};

// @desc    Delete a page from a story project
// @route   DELETE /api/projects/:id/pages/:pageId
// @access  Private
const deletePage = async (req, res) => {
    try {
        const project = await StoryProject.findById(req.params.id);
        if (!project) {
            return res.status(404).json({ message: 'Project not found.' });
        }
        if (project.owner.toString() !== req.user._id.toString()) {
            return res.status(401).json({ message: 'Not authorized.' });
        }

        const page = project.pages.id(req.params.pageId);
        if (!page) {
            return res.status(404).json({ message: 'Page not found.' });
        }

        // TODO: Optionally delete the image from GCS

        page.remove();
        await project.save();
        res.json(project);
    } catch (error) {
        res.status(500).json({ message: 'Server Error: ' + error.message });
    }
};

// @desc    Upscale an image for a specific page
// @route   POST /api/projects/:id/pages/:pageId/image/upscale
// @access  Private
const upscalePageImage = async (req, res) => {
    try {
        const project = await StoryProject.findById(req.params.id);
        if (!project) {
            return res.status(404).json({ message: 'Project not found.' });
        }
        if (project.owner.toString() !== req.user._id.toString()) {
            return res.status(401).json({ message: 'Not authorized.' });
        }

        const page = project.pages.id(req.params.pageId);
        if (!page) {
            return res.status(404).json({ message: 'Page not found.' });
        }

        const newImageFilename = await aiService.upscaleImage(page.imageFilename);

        // TODO: Optionally delete the old image from GCS

        page.imageFilename = newImageFilename;
        await project.save();
        res.json(project);
    } catch (error) {
        res.status(500).json({ message: 'Server Error: ' + error.message });
    }
};

module.exports = { createStoryProject, getStoryProjects, updateStoryProject, deleteStoryProject, updatePageText, regeneratePageImage, uploadPageImage, addPage, deletePage, upscalePageImage };
