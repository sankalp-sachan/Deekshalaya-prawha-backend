const mongoose = require('mongoose');
const { Readable } = require('stream');

let gridfsBucket;
const conn = mongoose.connection;
conn.once('open', () => {
    gridfsBucket = new mongoose.mongo.GridFSBucket(conn.db, {
        bucketName: 'images'
    });
});

exports.uploadImages = async (req, res) => {
    try {
        if (!req.files || req.files.length === 0) return res.status(400).send('No files uploaded');
        
        const uploadPromises = req.files.map(file => {
            return new Promise((resolve, reject) => {
                const filename = 'img_' + Date.now() + '_' + file.originalname;
                const uploadStream = gridfsBucket.openUploadStream(filename, {
                    contentType: file.mimetype
                });

                const readableStream = Readable.from(file.buffer);
                readableStream.pipe(uploadStream);

                uploadStream.on('error', (err) => {
                    console.error('GridFS Upload Error:', err);
                    reject(err);
                });

                uploadStream.on('finish', () => {
                    // Return the streaming URL
                    resolve(`/api/upload/stream/${uploadStream.id}`);
                });
            });
        });

        const urls = await Promise.all(uploadPromises);
        res.json({ urls });
    } catch (err) {
        console.error(err);
        res.status(500).send('Server Error during image upload');
    }
};

exports.streamImage = async (req, res) => {
    try {
        const fileId = new mongoose.Types.ObjectId(req.params.fileId);
        const downloadStream = gridfsBucket.openDownloadStream(fileId);
        
        // Find metadata for content type
        const files = await gridfsBucket.find({ _id: fileId }).toArray();
        if (!files || files.length === 0) return res.status(404).send('Not found');

        res.set('Content-Type', files[0].contentType || 'image/jpeg');
        downloadStream.pipe(res);

        downloadStream.on('error', (err) => {
            res.status(404).json({ msg: 'Image not found' });
        });
    } catch (err) {
        console.error(err);
        res.status(500).send('Server Error streaming image');
    }
};
