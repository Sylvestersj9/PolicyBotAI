import express, { Request, Response, NextFunction } from "express";
import multer from "multer";
import path from "path";
import fs from "fs";
import { createServer } from "http";
import pdfParse from "pdf-parse";
import mammoth from "mammoth";
import { sendToAI } from "./aiService"; // This is where your AI processing logic will go (replace with actual path)
import { setupVite } from "./vite";
import { registerRoutes } from "./routes";

const app = express();
const port = parseInt(process.env.PORT || '5000', 10); // Use PORT from environment if available

// Trust proxy (needed for Replit deployment)
app.set('trust proxy', 1);

// Middleware for parsing JSON and URL-encoded data
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Set up storage engine for multer
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/'); // Specify the folder to store uploaded files
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + path.extname(file.originalname)); // Give the file a unique name
  }
});

// Initialize multer with the storage configuration
const upload = multer({ storage });

// Create an upload endpoint
app.post('/upload', upload.single('file'), (req: Request, res: Response) => {
  if (req.file) {
    const filePath = req.file.path; // Get the file path from the uploaded file

    // Check file type and process accordingly
    if (req.file.mimetype === "application/pdf") {
      handlePdf(filePath, res); // Process PDF file
    } else if (req.file.mimetype === "application/vnd.openxmlformats-officedocument.wordprocessingml.document") {
      handleDocx(filePath, res); // Process DOCX file
    } else {
      res.status(400).send({ message: 'Unsupported file type' });
    }
  } else {
    res.status(400).send({ message: 'No file uploaded' });
  }
});

// Handle PDF file
const handlePdf = (filePath: string, res: Response) => {
  fs.readFile(filePath, (err, data) => {
    if (err) return res.status(500).send('Error reading PDF file.');

    pdfParse(data).then((doc) => {
      sendToAI(doc.text, res); // Send extracted text to AI
    }).catch((error) => {
      res.status(500).send('Error parsing PDF.');
    });
  });
};

// Handle DOCX file
const handleDocx = (filePath: string, res: Response) => {
  fs.readFile(filePath, (err, data) => {
    if (err) return res.status(500).send('Error reading DOCX file.');

    mammoth.extractRawText({ buffer: data }).then((result) => {
      sendToAI(result.value, res); // Send extracted text to AI
    }).catch((error) => {
      res.status(500).send('Error parsing DOCX.');
    });
  });
};

// Create directories if they don't exist
['uploads', 'public/uploads'].forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

// Create HTTP server
const httpServer = createServer(app);

// Register API routes
registerRoutes(app).then(() => {
  // Setup Vite for frontend
  setupVite(app, httpServer).then(() => {
    // Start the server
    httpServer.listen(port, () => {
      console.log(`Server is running on port ${port}`);
    });
  });
});
