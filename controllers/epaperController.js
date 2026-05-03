const mongoose = require('mongoose');
const Grid = require('gridfs-stream');
const Epaper = require('../models/Epaper');

let gfs, gridfsBucket;
const conn = mongoose.connection;
conn.once('open', () => {
    gridfsBucket = new mongoose.mongo.GridFSBucket(conn.db, {
        bucketName: 'pdfs'
    });
    gfs = Grid(conn.db, mongoose.mongo);
    gfs.collection('pdfs');
});

const { Readable } = require('stream');

exports.uploadEpaper = async (req, res) => {
    try {
        if (!req.file) return res.status(400).send('No file uploaded');
        
        const filename = 'epaper_' + Date.now();
        const uploadStream = gridfsBucket.openUploadStream(filename, {
            contentType: req.file.mimetype
        });

        const readableStream = Readable.from(req.file.buffer);
        readableStream.pipe(uploadStream);

        uploadStream.on('error', (err) => {
            console.error('GridFS Upload Error:', err);
            return res.status(500).send('File Upload Error');
        });

        uploadStream.on('finish', async () => {
            try {
                const epaper = new Epaper({
                    title: req.body.title || 'Today\'s Epaper',
                    date: req.body.date || new Date(),
                    fileId: uploadStream.id,
                    filename: filename
                });
                await epaper.save();
                res.json(epaper);
            } catch (saveErr) {
                console.error('Record Save Error:', saveErr);
                res.status(500).send('Server Error saving record');
            }
        });
    } catch (err) {
        console.error(err);
        res.status(500).send('Server Error');
    }
};

exports.getEpapers = async (req, res) => {
    try {
        const epapers = await Epaper.find().sort({ date: -1 });
        res.json(epapers);
    } catch (err) {
        console.error(err);
        res.status(500).send('Server Error');
    }
};

exports.streamEpaper = async (req, res) => {
    try {
        const fileId = new mongoose.Types.ObjectId(req.params.fileId);
        const downloadStream = gridfsBucket.openDownloadStream(fileId);
        
        downloadStream.on('error', () => {
            res.status(404).json({ msg: 'File not found' });
        });

        res.set('Content-Type', 'application/pdf');
        downloadStream.pipe(res);
    } catch (err) {
        console.error(err);
        res.status(500).send('Server Error');
    }
};
exports.deleteEpaper = async (req, res) => {
    try {
        const epaper = await Epaper.findById(req.params.id);
        if (!epaper) {
            return res.status(404).json({ msg: 'E-paper not found' });
        }

        // Delete from GridFS
        if (epaper.fileId) {
            try {
                await gridfsBucket.delete(new mongoose.Types.ObjectId(epaper.fileId));
            } catch (err) {
                console.error('Error deleting file from GridFS:', err);
                // Continue even if file deletion fails (it might already be gone)
            }
        }

        await Epaper.findByIdAndDelete(req.params.id);
        res.json({ msg: 'E-paper deleted successfully' });
    } catch (err) {
        console.error(err);
        res.status(500).send('Server Error');
    }
};
