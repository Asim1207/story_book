const puppeteer = require('puppeteer');
const ejs = require('ejs');
const path = require('path');
const { Storage } = require('@google-cloud/storage');
const { v4: uuidv4 } = require('uuid');

const storage = new Storage();
const bucketName = process.env.GCS_BUCKET_NAME;

const generatePdfFromStory = async (storyProject) => {
    // 1. Generate Signed URLs for all images
    const signedUrlPromises = [];
    if (storyProject.coverImageFilename) {
        signedUrlPromises.push(
            storage.bucket(bucketName).file(storyProject.coverImageFilename).getSignedUrl({
                action: 'read',
                expires: Date.now() + 60 * 60 * 1000, // 1 hour
            })
        );
    }
    storyProject.pages.forEach(page => {
        signedUrlPromises.push(
            storage.bucket(bucketName).file(page.imageFilename).getSignedUrl({
                action: 'read',
                expires: Date.now() + 60 * 60 * 1000, // 1 hour
            })
        );
    });

    const signedUrlsNested = await Promise.all(signedUrlPromises);
    const signedUrls = signedUrlsNested.flat();

    const storyDataForTemplate = {
        title: storyProject.title,
        authorName: storyProject.authorName,
        coverImageUrl: storyProject.coverImageFilename ? signedUrls.shift() : null,
        pages: storyProject.pages.map(page => ({
            text: page.text,
            imageUrl: signedUrls.shift(),
        })),
    };

    // 2. Render HTML from EJS template
    const templatePath = path.join(__dirname, '..', 'templates', 'storybook-template.ejs');
    const html = await ejs.renderFile(templatePath, { story: storyDataForTemplate });

    // 3. Launch Puppeteer and generate PDF
    const browser = await puppeteer.launch({ args: ['--no-sandbox'] });
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: 'networkidle0' });
    const pdfBuffer = await page.pdf({
        format: 'Letter',
        printBackground: true,
        margin: { top: '0', right: '0', bottom: '0', left: '0' },
    });
    await browser.close();

    // 4. Upload PDF to GCS
    const pdfFilename = `storybook-${storyProject._id}-${uuidv4()}.pdf`;
    const file = storage.bucket(bucketName).file(pdfFilename);
    await file.save(pdfBuffer, {
        metadata: { contentType: 'application/pdf' },
    });

    // 5. Return filename
    return pdfFilename;
};

module.exports = { generatePdfFromStory };
