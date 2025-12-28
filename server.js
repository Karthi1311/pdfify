const express = require('express');
const multer = require('multer');
const { PDFDocument } = require('pdf-lib');
const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const app = express();
const port = 3000;

// Configure Multer for file uploads
const upload = multer({ dest: 'uploads/' });

// Serve static files from the 'public' directory
app.use(express.static('public'));

// Handle file conversion
app.post('/convert', upload.array('files'), async (req, res) => {
    try {
        if (!req.files || req.files.length === 0) {
            return res.status(400).send('No files uploaded.');
        }

        const pdfDoc = await PDFDocument.create();

        for (const file of req.files) {
            const filePath = file.path;
            const ext = path.extname(file.originalname).toLowerCase();

            if (ext === '.pdf') {
                const existingPdfBytes = fs.readFileSync(filePath);
                const existingPdf = await PDFDocument.load(existingPdfBytes);
                const copiedPages = await pdfDoc.copyPages(existingPdf, existingPdf.getPageIndices());
                copiedPages.forEach((page) => pdfDoc.addPage(page));
            } else if (['.jpg', '.jpeg', '.png'].includes(ext)) {
                let imageBytes = fs.readFileSync(filePath);
                let image;

                // Use sharp to ensure image is in a format pdf-lib likes (png/jpeg) and maybe resize if needed
                // For "perfect fit", we'll just ensure it's a valid buffer for now.
                // pdf-lib supports JPG and PNG.
                
                if (ext === '.png') {
                    image = await pdfDoc.embedPng(imageBytes);
                } else {
                    image = await pdfDoc.embedJpg(imageBytes);
                }

                const page = pdfDoc.addPage([image.width, image.height]);
                page.drawImage(image, {
                    x: 0,
                    y: 0,
                    width: image.width,
                    height: image.height,
                });
            }
            
            // Clean up uploaded file
            fs.unlinkSync(filePath);
        }

        const pdfBytes = await pdfDoc.save();
        
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', 'attachment; filename=converted.pdf');
        res.send(Buffer.from(pdfBytes));

    } catch (error) {
        console.error(error);
        res.status(500).send('Error converting files.');
    }
});

app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
});
