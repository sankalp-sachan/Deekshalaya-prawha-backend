const mongoose = require('mongoose');

const newsSchema = new mongoose.Schema({
    title: { type: String, required: true },
    slug: { type: String, required: true, unique: true },
    content: { type: String, required: true },
    category: { type: String, required: true },
    tags: [String],
    author: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    image: String,
    views: { type: Number, default: 0 },
    likes: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    summary: String,
    isBreaking: { type: Boolean, default: false },
    createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model('News', newsSchema);
