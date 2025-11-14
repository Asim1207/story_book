const mongoose = require('mongoose');

const pageSchema = new mongoose.Schema({
  text: {
    type: String,
    required: true,
  },
  imageFilename: {
    type: String,
    required: true,
  },
});

const storyVersionSchema = new mongoose.Schema(
  {
    storyProject: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      ref: 'StoryProject',
    },
    title: {
      type: String,
      required: true,
    },
    authorName: {
      type: String,
      required: true,
    },
    coverImageFilename: {
      type: String,
    },
    pages: [pageSchema],
  },
  {
    timestamps: true, // This will add createdAt and updatedAt
  }
);

const StoryVersion = mongoose.model('StoryVersion', storyVersionSchema);

module.exports = StoryVersion;
