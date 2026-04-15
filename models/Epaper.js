const mongoose = require('mongoose');

const epaperSchema = new mongoose.Schema({
    title: { type: String, required: true },
    date: { type: Date, default: Date.now },
    fileId: { type: mongoose.Schema.Types.ObjectId, required: true }, // GridFS reference
    filename: String,
    createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model('Epaper', epaperSchema);
