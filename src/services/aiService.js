const { GoogleGenerativeAI } = require('@google/generative-ai');

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

const generateStoryText = async (theme, ageGroup, length, moral) => {
  const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

  const prompt = `Create a children's story about ${theme}. The story should be appropriate for a ${ageGroup}-year-old, be approximately ${length} pages long, and have a moral about ${moral}.`;

  try {
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();
    return text;
  } catch (error) {
    console.error('Error generating story text:', error);
    throw new Error('Failed to generate story text.');
  }
};

const { PredictionServiceClient } = require('@google-cloud/aiplatform');
const { Storage } = require('@google-cloud/storage');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');

const storage = new Storage();

const generateImageFromText = async (text) => {
  const clientOptions = {
    apiEndpoint: 'us-central1-aiplatform.googleapis.com',
  };

  const predictionServiceClient = new PredictionServiceClient(clientOptions);

  const prompt = {
    prompt: `A whimsical and colorful illustration for a children's story about: ${text}`,
  };
  const instance = {
    structValue: {
      fields: prompt,
    },
  };
  const instances = [instance];
  const parameter = {
    stringValue: 'image/png',
  };
  const parameters = {
    structValue: {
      fields: {
        output_mime_type: parameter,
      },
    },
  };

  const endpoint = `projects/${process.env.GCLOUD_PROJECT_ID}/locations/us-central1/publishers/google/models/imagegeneration@006`;

  const request = {
    endpoint,
    instances,
    parameters,
  };

  try {
    const [response] = await predictionServiceClient.predict(request);
    const predictions = response.predictions;
    if (predictions && predictions.length > 0) {
      const prediction = predictions[0];
      const imageData = prediction.structValue.fields.bytesBase64Encoded.stringValue;
      const imageBuffer = Buffer.from(imageData, 'base64');
      const filename = `${uuidv4()}.png`;

      // Upload to GCS
      await storage.bucket(process.env.GCS_BUCKET_NAME).file(filename).save(imageBuffer);

      // Return the filename, not a public URL
      return filename;
    } else {
      throw new Error('No predictions returned from Vertex AI.');
    }
  } catch (error) {
    console.error('Error in generateImageFromText:', error);
    throw new Error('Failed to generate and upload image.');
  }
};

const upscaleImage = async (filename) => {
  const clientOptions = {
    apiEndpoint: 'us-central1-aiplatform.googleapis.com',
  };

  const predictionServiceClient = new PredictionServiceClient(clientOptions);

  // Get the image from GCS
  const [imageBuffer] = await storage.bucket(process.env.GCS_BUCKET_NAME).file(filename).download();
  const encodedImage = imageBuffer.toString('base64');

  const instance = {
    structValue: {
      fields: {
        image: {
          stringValue: encodedImage,
        },
      },
    },
  };
  const instances = [instance];
  const parameters = {
    structValue: {
      fields: {
        output_mime_type: {
          stringValue: 'image/png',
        },
      },
    },
  };

  const endpoint = `projects/${process.env.GCLOUD_PROJECT_ID}/locations/us-central1/publishers/google/models/image-upscaling@001`;

  const request = {
    endpoint,
    instances,
    parameters,
  };

  try {
    const [response] = await predictionServiceClient.predict(request);
    const predictions = response.predictions;
    if (predictions && predictions.length > 0) {
      const prediction = predictions[0];
      const imageData = prediction.structValue.fields.bytesBase64Encoded.stringValue;
      const newImageBuffer = Buffer.from(imageData, 'base64');
      const newFilename = `upscaled-${uuidv4()}.png`;

      // Upload to GCS
      await storage.bucket(process.env.GCS_BUCKET_NAME).file(newFilename).save(newImageBuffer);

      return newFilename;
    } else {
      throw new Error('No predictions returned from Vertex AI for upscaling.');
    }
  } catch (error) {
    console.error('Error in upscaleImage:', error);
    throw new Error('Failed to upscale image.');
  }
};

module.exports = { generateStoryText, generateImageFromText, upscaleImage };
