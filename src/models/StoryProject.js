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

const storyProjectSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },
    authorName: {
      type: String,
      required: true,
      trim: true,
    },
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      ref: 'User',
    },
    coverImageFilename: {
      type: String,
      default: null,
    },
    pages: [pageSchema],
  },
  {
    timestamps: true,
  }
);

const StoryProject = mongoose.model('StoryProject', storyProjectSchema);

module.exports = StoryProject;
