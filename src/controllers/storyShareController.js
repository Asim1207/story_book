const StoryProject = require('../models/StoryProject');
const { v4: uuidv4 } = require('uuid');
const { Storage } = require('@google-cloud/storage');
const ejs = require('ejs');
const path = require('path');

const storage = new Storage();

// @desc    Update the public sharing settings for a story
// @route   PUT /api/projects/:id/share
// @access  Private
const updateShareSettings = async (req, res) => {
    const { isPublic } = req.body;

    try {
        const project = await StoryProject.findById(req.params.id);
        if (!project) {
            return res.status(404).json({ message: 'Project not found.' });
        }
        if (project.owner.toString() !== req.user._id.toString()) {
            return res.status(401).json({ message: 'Not authorized.' });
        }

        if (isPublic) {
            if (!project.shareId) {
                project.shareId = uuidv4();
            }
            project.isPublic = true;
        } else {
            project.isPublic = false;
        }

        await project.save();
        res.json({
            isPublic: project.isPublic,
            shareUrl: project.isPublic ? `/share/${project.shareId}` : null
        });
    } catch (error) {
        res.status(500).json({ message: 'Server Error: ' + error.message });
    }
};

// @desc    Get a publicly shared story and render it as HTML
// @route   GET /share/:shareId
// @access  Public
const getPublicStory = async (req, res) => {
    try {
        const project = await StoryProject.findOne({ shareId: req.params.shareId, isPublic: true });
        if (!project) {
            return res.status(404).send('<h1>Story not found or is not public.</h1>');
        }

        // Generate signed URLs for all images
        const signedUrlPromises = [];
        if (project.coverImageFilename) {
            signedUrlPromises.push(storage.bucket(process.env.GCS_BUCKET_NAME).file(project.coverImageFilename).getSignedUrl({ action: 'read', expires: Date.now() + 15 * 60 * 1000 }));
        }
        project.pages.forEach(page => {
            signedUrlPromises.push(storage.bucket(process.env.GCS_BUCKET_NAME).file(page.imageFilename).getSignedUrl({ action: 'read', expires: Date.now() + 15 * 60 * 1000 }));
        });

        const signedUrlsNested = await Promise.all(signedUrlPromises);
        const signedUrls = signedUrlsNested.flat();

        const storyDataForTemplate = {
            title: project.title,
            authorName: project.authorName,
            coverImageUrl: project.coverImageFilename ? signedUrls.shift() : null,
            pages: project.pages.map(page => ({
                text: page.text,
                imageUrl: signedUrls.shift(),
            })),
        };

        const templatePath = path.join(__dirname, '..', 'templates', 'storybook-template.ejs');
        const html = await ejs.renderFile(templatePath, { story: storyDataForTemplate });

        res.send(html);

    } catch (error) {
        res.status(500).send('<h1>Error loading story.</h1>');
    }
};

module.exports = { updateShareSettings, getPublicStory };
