const jobManager = require('../services/jobManager');
const aiService = require('../services/aiService');

const createStory = async (req, res) => {
  const { theme, ageGroup, length, moral } = req.body;

  if (!theme || !ageGroup || !length || !moral) {
    return res.status(400).json({ message: 'Missing required story parameters.' });
  }

  const jobId = jobManager.createJob();

  // Start the generation process asynchronously
  generateStory(jobId, theme, ageGroup, length, moral);

  res.status(202).json({ jobId });
};

const { Storage } = require('@google-cloud/storage');
const storage = new Storage();

const getStoryStatus = async (req, res) => {
  const { jobId } = req.params;
  const job = jobManager.getJob(jobId);

  if (!job) {
    return res.status(404).json({ message: 'Job not found.' });
  }

  // If the job is complete, generate signed URLs for the images
  if (job.status === 'completed' && job.story && job.story.pages) {
    const signedUrlsPromises = job.story.pages.map(page => {
      const options = {
        version: 'v4',
        action: 'read',
        expires: Date.now() + 15 * 60 * 1000, // 15 minutes
      };
      return storage
        .bucket(process.env.GCS_BUCKET_NAME)
        .file(page.image)
        .getSignedUrl(options);
    });

    try {
      const signedUrls = await Promise.all(signedUrlsPromises);
      const storyWithUrls = {
        ...job.story,
        pages: job.story.pages.map((page, index) => ({
          ...page,
          image: signedUrls[index][0], // getSignedUrl returns an array with the URL
        })),
      };
      return res.status(200).json({ ...job, story: storyWithUrls });
    } catch (error) {
      console.error('Error generating signed URLs:', error);
      return res.status(500).json({ message: 'Error retrieving story images.' });
    }
  }

  // For any other status, just return the job object as is
  res.status(200).json(job);
};

// This function runs in the background
const generateStory = async (jobId, theme, ageGroup, length, moral) => {
  try {
    jobManager.updateJobStatus(jobId, 'in-progress');

    // 1. Generate story text
    const storyText = await aiService.generateStoryText(theme, ageGroup, length, moral);

    // 2. Simple logic to split story into pages (e.g., by paragraph)
    const pages = storyText.split('\n\n').filter(p => p.trim() !== '');
    const storyPages = [];

    // 3. Generate an image for each page and store the filename
    for (const pageText of pages) {
      const imageFilename = await aiService.generateImageFromText(pageText);
      storyPages.push({ text: pageText, image: imageFilename }); // Store filename, not URL
    }

    const finalStory = {
      title: `A story about ${theme}`,
      pages: storyPages,
    };

    jobManager.updateJobStatus(jobId, 'completed', finalStory);
  } catch (error) {
    console.error(`Job ${jobId} failed:`, error);
    jobManager.updateJobStatus(jobId, 'failed', null, error.message);
  }
};


module.exports = { createStory, getStoryStatus };
